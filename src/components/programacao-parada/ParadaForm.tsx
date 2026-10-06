import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  Building2,
  GitBranch,
  Factory,
  Plus,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import {
  MOTIVOS_PARADA_OPTIONS,
  MotivoParadaTipo,
  CentroParadaInput,
  programacaoParadaService,
} from '@/services/programacao-parada-service'
import { lineMasterService } from '@/services/line-master'
import { pb } from '@/lib/pocketbase/client'

interface ParadaFormProps {
  onAddCentro: (centro: CentroParadaInput) => void
  editingCentro?: CentroParadaInput | null
  onUpdateCentro?: (centro: CentroParadaInput) => void
  onCancelEditCentro?: () => void
  disabled?: boolean
}

export const ParadaForm: React.FC<ParadaFormProps> = ({
  onAddCentro,
  editingCentro,
  onUpdateCentro,
  onCancelEditCentro,
  disabled = false,
}) => {
  // Cascata Empresa -> Linha -> Centro
  const [empresas, setEmpresas] = useState<Array<{ code: string; name: string }>>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('')

  const [allLinhas, setAllLinhas] = useState<any[]>([])
  const [selectedLinha, setSelectedLinha] = useState<string>('')

  const [availableCentros, setAvailableCentros] = useState<
    Array<{ code: string; name: string; label: string }>
  >([])
  const [selectedCentro, setSelectedCentro] = useState<string>('')

  // Datas e Horários
  const [dataInicio, setDataInicio] = useState<string>('')
  const [horaInicio, setHoraInicio] = useState<string>('06:00')
  const [dataFim, setDataFim] = useState<string>('')
  const [horaFim, setHoraFim] = useState<string>('18:00')

  // Motivo e Observações
  const [motivo, setMotivo] = useState<MotivoParadaTipo>('Manutenção preventiva')
  const [motivoOutro, setMotivoOutro] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')

  // Validação em tempo real
  const [validationError, setValidationError] = useState<string | null>(null)

  // Carregar Cadastros Oficiais Existentes (Empresas e Linhas)
  useEffect(() => {
    let mounted = true
    const loadCadastros = async () => {
      try {
        const [lines, plants] = await Promise.all([
          lineMasterService.listLines({ activeOnly: true }),
          pb
            .collection('plants')
            .getFullList({ sort: 'name' })
            .catch(() => []),
        ])

        if (!mounted) return
        setAllLinhas(lines || [])

        // Empresas a partir de plantas cadastradas ou das próprias linhas
        const empMap = new Map<string, string>()
        if (plants && plants.length > 0) {
          plants.forEach((p: any) => {
            const code = p.sap_plant_code || p.code || '1001'
            const name = p.name || 'Planta CIAFAL'
            empMap.set(code, name)
          })
        }
        if (empMap.size === 0) {
          empMap.set('1001', 'CIAFAL MATRIZ')
          empMap.set('1002', 'CIAFAL FILIAL 1')
          empMap.set('2001', 'CIAFAL SIDERÚRGICA')
        }

        const empList = Array.from(empMap.entries()).map(([code, name]) => ({
          code,
          name: `${code} — ${name}`,
        }))
        setEmpresas(empList)

        // Inicializa com a primeira empresa se vazia
        if (empList.length > 0 && !selectedEmpresa) {
          setSelectedEmpresa(empList[0].code)
        }
      } catch (e) {
        console.warn('Erro ao carregar dados mestres para parada:', e)
      }
    }

    loadCadastros()
    return () => {
      mounted = false
    }
  }, [])

  // Linhas filtradas pela Empresa selecionada
  const linhasFiltradas = useMemo(() => {
    if (!selectedEmpresa) return allLinhas
    return allLinhas.filter((l) => {
      const plantCode = l.sap_plant_code || l.plant_code || ''
      return !plantCode || plantCode === selectedEmpresa || l.plant_id?.includes(selectedEmpresa)
    })
  }, [allLinhas, selectedEmpresa])

  // Se trocar de Linha, busca Centros oficiais (sap_work_center, line_masters, work_centers)
  useEffect(() => {
    let mounted = true
    const loadCentrosDaLinha = async () => {
      if (!selectedLinha) {
        setAvailableCentros([])
        setSelectedCentro('')
        return
      }

      const foundLine = allLinhas.find(
        (l) => l.code === selectedLinha || l.id === selectedLinha || l.name === selectedLinha,
      )
      const lineId = foundLine?.id || selectedLinha
      const derived: Array<{ code: string; name: string; label: string }> = []
      const seen = new Set<string>()

      // 1. sap_work_center da linha
      if (foundLine?.sap_work_center?.trim()) {
        const swc = foundLine.sap_work_center.trim()
        if (!seen.has(swc)) {
          seen.add(swc)
          derived.push({
            code: swc,
            name: foundLine.name ? `${foundLine.name} (${swc})` : swc,
            label: `${swc} — ${foundLine.name || 'Centro Principal'}`,
          })
        }
      }

      // 2. Ficha Mestra (line_masters)
      try {
        const masters = await pb.collection('line_masters').getFullList({
          filter: `line_id = '${lineId}' || code = '${selectedLinha}'`,
          sort: '-version',
        })
        for (const m of masters) {
          const cCode = (m.sap_plant_code || m.code || '').trim()
          if (cCode && !seen.has(cCode)) {
            seen.add(cCode)
            derived.push({
              code: cCode,
              name: m.name || cCode,
              label: `${cCode} — ${m.name || 'Ficha Mestra'}`,
            })
          }
        }
      } catch {
        /* intentionally ignored */
      }

      // 3. Centros de trabalho dedicados (work_centers)
      try {
        const wcs = await pb.collection('work_centers').getFullList({
          filter: `line_id = '${lineId}'`,
          sort: 'code',
        })
        for (const w of wcs) {
          const code = (w.code || w.sap_work_center_code || '').trim()
          if (code && !seen.has(code)) {
            seen.add(code)
            derived.push({
              code,
              name: w.name || code,
              label: `${code} — ${w.name || 'Posto de Trabalho'}`,
            })
          }
        }
      } catch {
        /* intentionally ignored */
      }

      // Fallback: se nenhum centro cadastrado, gera pelo menos o código da linha
      if (derived.length === 0 && foundLine?.code) {
        derived.push({
          code: foundLine.code,
          name: foundLine.name || foundLine.code,
          label: `${foundLine.code} — ${foundLine.name || 'Centro de Produção'}`,
        })
      }

      if (mounted) {
        setAvailableCentros(derived)
        if (derived.length > 0 && !derived.some((c) => c.code === selectedCentro)) {
          setSelectedCentro(derived[0].code)
        }
      }
    }

    loadCentrosDaLinha()
    return () => {
      mounted = false
    }
  }, [selectedLinha, allLinhas])

  // Se houver edição de um centro existente, popula os campos
  useEffect(() => {
    if (editingCentro) {
      setSelectedEmpresa(editingCentro.empresa_code || '')
      setSelectedLinha(editingCentro.linha_code || '')
      setSelectedCentro(editingCentro.centro_code || '')
      setMotivo(editingCentro.motivo)
      setMotivoOutro(editingCentro.motivo_outro || '')
      setDescricao(editingCentro.descricao || '')

      if (editingCentro.data_hora_inicio) {
        const [d, h] = editingCentro.data_hora_inicio.split(' ')
        if (d) setDataInicio(d)
        if (h) setHoraInicio(h)
      }
      if (editingCentro.data_hora_fim) {
        const [d, h] = editingCentro.data_hora_fim.split(' ')
        if (d) setDataFim(d)
        if (h) setHoraFim(h)
      }
    }
  }, [editingCentro])

  // Duração calculada automaticamente
  const duracaoFormatada = useMemo(() => {
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) return 'Aguardando datas...'
    const startStr = `${dataInicio} ${horaInicio}`
    const endStr = `${dataFim} ${horaFim}`
    const horas = programacaoParadaService.calcularDuracaoHoras(startStr, endStr)
    if (horas <= 0) return 'Período inválido (fim anterior ou igual ao início)'
    return programacaoParadaService.formatarDuracao(horas)
  }, [dataInicio, horaInicio, dataFim, horaFim])

  // Validação local antes de adicionar
  const handleSubmitCentro = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!selectedEmpresa) {
      setValidationError('Selecione uma Empresa.')
      return
    }
    if (!selectedLinha) {
      setValidationError('Selecione uma Linha de produção.')
      return
    }
    if (!selectedCentro) {
      setValidationError('Selecione um Centro de trabalho.')
      return
    }
    if (!dataInicio || !horaInicio) {
      setValidationError('Informe a Data e o Horário de Início.')
      return
    }
    if (!dataFim || !horaFim) {
      setValidationError('Informe a Data e o Horário de Fim.')
      return
    }

    const startStr = `${dataInicio} ${horaInicio}`
    const endStr = `${dataFim} ${horaFim}`
    const horas = programacaoParadaService.calcularDuracaoHoras(startStr, endStr)
    if (horas <= 0) {
      setValidationError(
        'A data e hora de término deve ser estritamente posterior ao início da parada.',
      )
      return
    }

    if (motivo === 'Outro' && !motivoOutro.trim()) {
      setValidationError('Para o motivo "Outro", o detalhamento da justificativa é obrigatório.')
      return
    }

    const foundLine = allLinhas.find(
      (l) => l.code === selectedLinha || l.id === selectedLinha || l.name === selectedLinha,
    )
    const foundCentro = availableCentros.find((c) => c.code === selectedCentro)

    const payload: CentroParadaInput = {
      empresa_code: selectedEmpresa,
      linha_code: selectedLinha,
      linha_nome: foundLine?.name || selectedLinha,
      centro_code: selectedCentro,
      centro_nome: foundCentro?.name || selectedCentro,
      data_hora_inicio: startStr,
      data_hora_fim: endStr,
      duracao_horas: horas,
      motivo,
      motivo_outro: motivo === 'Outro' ? motivoOutro.trim() : undefined,
      descricao: descricao.trim() || undefined,
      status: 'PENDENTE',
    }

    if (editingCentro && onUpdateCentro) {
      onUpdateCentro(payload)
    } else {
      onAddCentro(payload)
      // Reset de campos específicos preservando contexto de linha/empresa para agilizar lote
      setMotivo('Manutenção preventiva')
      setMotivoOutro('')
      setDescricao('')
    }
  }

  return (
    <Card className="border border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-[#004C97]" />
            <span>
              {editingCentro
                ? 'Editar Centro da Parada Programada'
                : 'Adicionar Centro / Linha à Programação'}
            </span>
          </div>
          <span className="text-xs font-normal text-slate-500">
            Cascata: Empresa → Linha → Centro
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <form onSubmit={handleSubmitCentro} className="space-y-4">
          {/* Linha 1: Cascata Empresa -> Linha -> Centro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Empresa */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Empresa / Planta
              </Label>
              <Select
                value={selectedEmpresa}
                onValueChange={(val) => {
                  setSelectedEmpresa(val)
                  setSelectedLinha('')
                  setSelectedCentro('')
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.code} value={emp.code} className="text-xs">
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha de Produção */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                Linha Produtiva
              </Label>
              <Select
                value={selectedLinha}
                onValueChange={(val) => {
                  setSelectedLinha(val)
                  setSelectedCentro('')
                }}
                disabled={disabled || !selectedEmpresa}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue
                    placeholder={
                      !selectedEmpresa ? 'Selecione a empresa primeiro' : 'Selecione a linha...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {linhasFiltradas.map((l) => (
                    <SelectItem key={l.id || l.code} value={l.code} className="text-xs">
                      {l.code} — {l.name || 'Linha'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro de Trabalho */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-slate-500" />
                Centro de Trabalho (SAP)
              </Label>
              <Select
                value={selectedCentro}
                onValueChange={setSelectedCentro}
                disabled={disabled || !selectedLinha}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue
                    placeholder={
                      !selectedLinha ? 'Selecione a linha primeiro' : 'Selecione o centro...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCentros.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Datas, Horários e Duração Prevista — Grid unificado e alinhado */}
          <div
            data-testid="periodo-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-lg"
          >
            {/* Data Início */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 h-5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Data Início</span>
              </Label>
              <Input
                type="text"
                placeholder="Ex: 01/11/2026"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                disabled={disabled}
                className="h-10 text-sm bg-white border-slate-300 focus:border-[#004C97]"
              />
            </div>

            {/* Hora Início */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 h-5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Horário Início (24h)</span>
              </Label>
              <Input
                type="text"
                placeholder="06:00"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                disabled={disabled}
                className="h-10 text-sm bg-white border-slate-300 focus:border-[#004C97]"
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 h-5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Data Fim</span>
              </Label>
              <Input
                type="text"
                placeholder="Ex: 06/11/2026"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                disabled={disabled}
                className="h-10 text-sm bg-white border-slate-300 focus:border-[#004C97]"
              />
            </div>

            {/* Hora Fim */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 h-5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Horário Fim (24h)</span>
              </Label>
              <Input
                type="text"
                placeholder="18:00"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                disabled={disabled}
                className="h-10 text-sm bg-white border-slate-300 focus:border-[#004C97]"
              />
            </div>

            {/* Duração Prevista — readonly estilizado */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 h-5">
                <Clock className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                <span>Duração Prevista</span>
              </Label>
              <div
                data-testid="duracao-prevista-display"
                className="h-10 px-3 rounded-md bg-slate-50 border border-slate-300 text-sm font-semibold text-slate-800 flex items-center truncate cursor-not-allowed select-none shadow-2xs"
                title={duracaoFormatada}
              >
                {duracaoFormatada}
              </div>
            </div>
          </div>

          {/* Linha 3: Motivo da Parada e Observação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Motivo da Parada
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </Label>
              <Select
                value={motivo}
                onValueChange={(val: any) => setMotivo(val)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_PARADA_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {motivo === 'Outro' && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-amber-700">
                  Detalhamento Obrigatório (Motivo: Outro) *
                </Label>
                <Input
                  type="text"
                  placeholder="Especifique detalhadamente a razão da parada operacional..."
                  value={motivoOutro}
                  onChange={(e) => setMotivoOutro(e.target.value)}
                  disabled={disabled}
                  className="h-9 text-xs bg-white border-amber-300 focus:border-amber-500"
                />
              </div>
            )}

            <div
              className={`space-y-1.5 ${motivo === 'Outro' ? 'md:col-span-3' : 'md:col-span-2'}`}
            >
              <Label className="text-xs font-semibold text-slate-700">
                Descrição Técnica / Observações do Planejamento
              </Label>
              <Textarea
                rows={2}
                placeholder="Descreva o escopo da intervenção, equipamentos sob manutenção, recomendações de segurança e alinhamento com a equipe..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={disabled}
                className="text-xs bg-white border-slate-200 resize-none"
              />
            </div>
          </div>

          {/* Mensagem de Erro de Validação Local */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Botão de Ação — alinhamento limpo sem botões fantasmas */}
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
            <div>
              {editingCentro && (
                <div className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>
                    Editando centro:{' '}
                    <strong>{editingCentro.centro_code || editingCentro.centro_id}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingCentro && onCancelEditCentro && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelEditCentro}
                  className="text-xs h-9 px-3"
                >
                  Cancelar Edição
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={disabled}
                className="text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white h-9 px-4 gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingCentro ? 'Atualizar Centro' : '+ Adicionar Centro à Parada'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
export default ParadaForm
