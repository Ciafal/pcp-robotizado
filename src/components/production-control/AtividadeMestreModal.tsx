import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Edit,
  Save,
  Building2,
  GitBranch,
  Factory,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Boxes,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChecklistAtividadeModelo,
  ChecklistFonteDados,
  ChecklistFrequencia,
} from '@/types/checklist-fechamento'
import {
  sapParametersMasterDataService,
  SapCompanyOption,
} from '@/services/sap-parameters-master-data-service'
import { sapWerksService } from '@/services/sap-werks-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { pb } from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onClose: () => void
  modelo: ChecklistAtividadeModelo | null
  onSave: (dados: Partial<ChecklistAtividadeModelo>) => Promise<any>
  onToggleAtivo?: (id: string, ativo: boolean) => Promise<void>
}

interface CenterOption {
  id?: string
  code: string
  name: string
  label: string
}

export const AtividadeMestreModal: React.FC<Props> = ({
  open,
  onClose,
  modelo,
  onSave,
  onToggleAtivo,
}) => {
  const { toast } = useToast()
  const isEditing = Boolean(modelo?.id)

  // Local de Aplicação (Cascata WERKS -> Linha -> Centro)
  const [werks, setWerks] = useState<string>('')
  const [lineId, setLineId] = useState<string>('')
  const [lineCode, setLineCode] = useState<string>('')
  const [lineName, setLineName] = useState<string>('')
  const [centerId, setCenterId] = useState<string>('')
  const [centerCode, setCenterCode] = useState<string>('')
  const [centerName, setCenterName] = useState<string>('')

  // Catálogos
  const [companies, setCompanies] = useState<Array<{ werks: string; name: string; label: string }>>(
    [],
  )
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [allLines, setAllLines] = useState<ProductionLine[]>([])
  const [loadingLines, setLoadingLines] = useState(false)
  const [centerOptions, setCenterOptions] = useState<CenterOption[]>([])
  const [loadingCenters, setLoadingCenters] = useState(false)

  // Identificação da Atividade
  const [codigo, setCodigo] = useState('')
  const [sequencia, setSequencia] = useState<number>(1)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('Processamento SAP')

  // Orientação
  const [descricao, setDescricao] = useState('')

  // Integração / Referência SAP
  const [transacaoSap, setTransacaoSap] = useState('')
  const [depositoSap, setDepositoSap] = useState('')

  // Demais campos existentes
  const [frequencia, setFrequencia] = useState<ChecklistFrequencia>('somente_fechamento')
  const [obrigatoria, setObrigatoria] = useState(true)
  const [responsavelPadrao, setResponsavelPadrao] = useState('Controle de Produção')
  const [areaResponsavel, setAreaResponsavel] = useState('Controle de Produção')
  const [prazoRelativo, setPrazoRelativo] = useState('2º dia útil')
  const [manualDoc, setManualDoc] = useState('CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO')
  const [regraValidacao, setRegraValidacao] = useState('')
  const [fonteDados, setFonteDados] = useState<ChecklistFonteDados>('Manual')
  const [statusRegra, setStatusRegra] = useState('Oficial')
  const [ativa, setAtiva] = useState(true)

  // Estados de Validação e Gravação
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 1. Carrega catálogo de Empresas (WERKS) e Linhas ativas ao abrir
  useEffect(() => {
    if (!open) return

    let isMounted = true

    const loadInitialData = async () => {
      setLoadingCompanies(true)
      setLoadingLines(true)

      try {
        // Fonte 1: sapParametersMasterDataService (tabela T001W) com fallback para sapWerksService
        const resCompanies = await sapParametersMasterDataService.fetchCompanies().catch(() => null)
        let companyItems: Array<{ werks: string; name: string; label: string }> = []

        if (resCompanies && resCompanies.success && resCompanies.data.length > 0) {
          companyItems = resCompanies.data.map((c: SapCompanyOption) => ({
            werks: c.werks,
            name: c.name,
            label: `${c.werks} — ${c.name || 'Empresa'}`,
          }))
        } else {
          const fallbackWerks = await sapWerksService.getWerksList().catch(() => ({ items: [] }))
          companyItems = fallbackWerks.items.map((w) => ({
            werks: w.werks,
            name: w.description,
            label: `${w.werks} — ${w.description || 'Empresa'}`,
          }))
        }

        if (isMounted) {
          setCompanies(companyItems)
        }
      } catch (err) {
        console.warn('[AtividadeMestreModal] Erro ao carregar empresas:', err)
      } finally {
        if (isMounted) setLoadingCompanies(false)
      }

      try {
        const linesData = await lineMasterService.listLines({ activeOnly: true })
        if (isMounted) {
          setAllLines(linesData || [])
        }
      } catch (err) {
        console.warn('[AtividadeMestreModal] Erro ao carregar linhas:', err)
      } finally {
        if (isMounted) setLoadingLines(false)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [open])

  // 2. Carrega centros quando lineId ou lineCode mudar
  const loadCentersForLine = useCallback(
    async (selectedLineId: string, selectedLineCode: string) => {
      if (!selectedLineId && !selectedLineCode) {
        setCenterOptions([])
        return
      }

      setLoadingCenters(true)
      try {
        const foundLine = allLines.find(
          (l) => l.id === selectedLineId || l.code === selectedLineCode,
        )
        const lineRealId = foundLine?.id || selectedLineId
        const derivedOptions: CenterOption[] = []
        const seenCodes = new Set<string>()

        // Fonte A: production_lines.sap_work_center
        if (foundLine && foundLine.sap_work_center && foundLine.sap_work_center.trim()) {
          const swc = foundLine.sap_work_center.trim()
          if (!seenCodes.has(swc)) {
            seenCodes.add(swc)
            derivedOptions.push({
              id: '',
              code: swc,
              name: foundLine.name ? `${foundLine.name} (${swc})` : swc,
              label: `${swc} — ${foundLine.name || 'Centro da Linha'}`,
            })
          }
        }

        // Fonte B: line_masters associadas à linha
        try {
          const lineMasters = await pb.collection('line_masters').getFullList({
            filter: `line_id = '${lineRealId}' || code = '${selectedLineCode}'`,
            sort: '-version',
          })
          for (const lm of lineMasters) {
            const sapCode = ((lm as any).sap_plant_code || lm.code || '').trim()
            if (sapCode && !seenCodes.has(sapCode)) {
              seenCodes.add(sapCode)
              derivedOptions.push({
                id: lm.id,
                code: sapCode,
                name: lm.name || sapCode,
                label: `${sapCode} — ${lm.name || 'Ficha Mestra'}`,
              })
            }
          }
        } catch (lmErr) {
          console.warn('[AtividadeMestreModal] Erro ao consultar line_masters:', lmErr)
        }

        // Fonte C: work_centers vinculados à linha
        try {
          const workCenters = await pb.collection('work_centers').getFullList({
            filter: `line_id = '${lineRealId}'`,
            sort: 'code',
          })
          for (const wc of workCenters) {
            const wcCode = (wc.code || (wc as any).sap_work_center_code || '').trim()
            if (wcCode && !seenCodes.has(wcCode)) {
              seenCodes.add(wcCode)
              derivedOptions.push({
                id: wc.id,
                code: wcCode,
                name: wc.name || wcCode,
                label: `${wcCode} — ${wc.name || 'Centro de Trabalho'}`,
              })
            }
          }
        } catch (wcErr) {
          console.warn('[AtividadeMestreModal] Erro ao consultar work_centers:', wcErr)
        }

        setCenterOptions(derivedOptions)
      } catch (err) {
        console.warn('[AtividadeMestreModal] Erro ao derivar centros para linha:', err)
        setCenterOptions([])
      } finally {
        setLoadingCenters(false)
      }
    },
    [allLines],
  )

  // 3. Inicialização dos campos ao abrir modal (edição vs criação)
  useEffect(() => {
    if (!open) return

    setFieldErrors({})

    if (modelo) {
      // Modo Edição: carregar Empresa / Linha / Centro atuais
      const w = modelo.werks || modelo.empresa || ''
      setWerks(w)
      setLineId(modelo.line_id || '')
      setLineCode(modelo.line_code || '')
      setLineName(modelo.line_name || '')
      setCenterId(modelo.center_id || '')
      setCenterCode(modelo.center_code || '')
      setCenterName(modelo.center_name || '')

      setCodigo(modelo.codigo || '')
      setSequencia(modelo.sequencia || 1)
      setTitulo(modelo.titulo || '')
      setDescricao(modelo.descricao_detalhada || '')
      setCategoria(modelo.categoria || 'Processamento SAP')
      setTransacaoSap(
        modelo.transacao_sap && modelo.transacao_sap !== 'N/A' ? modelo.transacao_sap : '',
      )
      setDepositoSap(
        modelo.deposito_sap && modelo.deposito_sap !== 'N/A' ? modelo.deposito_sap : '',
      )
      setFrequencia(modelo.frequencia || 'somente_fechamento')
      setObrigatoria(Boolean(modelo.obrigatoria))
      setResponsavelPadrao(modelo.responsavel_padrao || 'Controle de Produção')
      setAreaResponsavel(modelo.area_responsavel || 'Controle de Produção')
      setPrazoRelativo(modelo.prazo_relativo_fechamento || '2º dia útil')
      setManualDoc(
        modelo.manual_documento_referencia || 'CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO',
      )
      setRegraValidacao(modelo.regra_validacao || '')
      setFonteDados((modelo.fonte_dados as any) || 'Manual')
      setStatusRegra(modelo.status_regra || 'Oficial')
      setAtiva(modelo.ativa ?? true)

      // Carregar centros para a linha da edição
      if (modelo.line_id || modelo.line_code) {
        loadCentersForLine(modelo.line_id || '', modelo.line_code || '')
      }
    } else {
      // Modo Criação
      setWerks('')
      setLineId('')
      setLineCode('')
      setLineName('')
      setCenterId('')
      setCenterCode('')
      setCenterName('')
      setCenterOptions([])

      setCodigo('')
      setSequencia(27)
      setTitulo('')
      setDescricao('')
      setCategoria('Processamento SAP')
      setTransacaoSap('')
      setDepositoSap('')
      setFrequencia('somente_fechamento')
      setObrigatoria(true)
      setResponsavelPadrao('Controle de Produção')
      setAreaResponsavel('Controle de Produção')
      setPrazoRelativo('2º dia útil')
      setManualDoc('CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO')
      setRegraValidacao('')
      setFonteDados('Manual')
      setStatusRegra('Oficial')
      setAtiva(true)
    }
  }, [modelo, open, loadCentersForLine])

  // Linhas filtradas pela Empresa (WERKS) selecionada
  const filteredLines = useMemo(() => {
    if (!werks) return []

    // Filtragem por sap_plant_code na linha
    const byPlantCode = allLines.filter((l) => (l.sap_plant_code || '').trim() === werks.trim())
    if (byPlantCode.length > 0) return byPlantCode

    // Se o código da empresa for CIAFAL padrão ou 1000/1001/1002 e não houver filtro restritivo
    return allLines
  }, [werks, allLines])

  // Tratar alteração de Empresa: cascata limpa Linha e Centro
  const handleSelectWerks = (novoWerks: string) => {
    setWerks(novoWerks)
    // Limpa Linha e Centro
    setLineId('')
    setLineCode('')
    setLineName('')
    setCenterId('')
    setCenterCode('')
    setCenterName('')
    setCenterOptions([])

    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.werks
      delete next.line
      delete next.center
      return next
    })
  }

  // Tratar alteração de Linha: cascata limpa Centro e carrega centros vinculados
  const handleSelectLine = (selectedLine: ProductionLine | null) => {
    if (!selectedLine) {
      setLineId('')
      setLineCode('')
      setLineName('')
      setCenterId('')
      setCenterCode('')
      setCenterName('')
      setCenterOptions([])
      return
    }

    setLineId(selectedLine.id)
    setLineCode(selectedLine.code)
    setLineName(selectedLine.name || selectedLine.code)

    // Limpa Centro
    setCenterId('')
    setCenterCode('')
    setCenterName('')

    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.line
      delete next.center
      return next
    })

    loadCentersForLine(selectedLine.id, selectedLine.code)
  }

  // Tratar alteração de Centro
  const handleSelectCenter = (centerOpt: CenterOption | null) => {
    if (!centerOpt) {
      setCenterId('')
      setCenterCode('')
      setCenterName('')
      return
    }

    setCenterId(centerOpt.id || '')
    setCenterCode(centerOpt.code)
    setCenterName(centerOpt.name || centerOpt.code)

    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.center
      return next
    })
  }

  // Validação obrigatória dos 5 campos: WERKS + Linha + Centro + Código + Título
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!werks.trim()) {
      errors.werks = 'Selecione a Empresa (WERKS) onde esta atividade será aplicada.'
    }
    if (!lineCode.trim()) {
      errors.line = 'Selecione a Linha onde esta atividade será aplicada.'
    }
    if (!centerCode.trim()) {
      errors.center = 'Selecione o Centro onde esta atividade será aplicada.'
    }
    if (!codigo.trim()) {
      errors.codigo = 'Informe o código identificador da atividade (ex: 1.27).'
    }
    if (!titulo.trim()) {
      errors.titulo = 'Informe o título oficial da atividade.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submissão do Formulário
  const handleSubmit = async () => {
    // Impedir duplo clique durante gravação
    if (saving) return

    if (!validateForm()) {
      toast({
        title: 'Campos obrigatórios pendentes',
        description: 'Por favor, preencha todos os campos obrigatórios destacados em vermelho.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const derivedLinhaCentro = [lineName || lineCode, centerName || centerCode]
        .filter(Boolean)
        .join(' / ')

      const payload: Partial<ChecklistAtividadeModelo> = {
        id: modelo?.id,
        codigo: codigo.trim(),
        sequencia,
        titulo: titulo.trim(),
        descricao_detalhada: descricao.trim(),
        categoria: categoria.trim() || 'Processamento SAP',
        // Preserva o campo legado linha_centro_relacionado para compatibilidade
        linha_centro_relacionado: derivedLinhaCentro || 'Geral',
        empresa: werks.trim(),
        // Novos campos estruturados
        werks: werks.trim(),
        line_id: lineId.trim(),
        line_code: lineCode.trim(),
        line_name: lineName.trim(),
        center_id: centerId.trim(),
        center_code: centerCode.trim(),
        center_name: centerName.trim(),
        transacao_sap: transacaoSap.trim() || 'N/A',
        deposito_sap: depositoSap.trim() || 'N/A',
        frequencia,
        obrigatoria,
        responsavel_padrao: responsavelPadrao.trim() || 'Controle de Produção',
        area_responsavel: areaResponsavel.trim() || 'Controle de Produção',
        prazo_relativo_fechamento: prazoRelativo.trim() || '2º dia útil',
        manual_documento_referencia:
          manualDoc.trim() || 'CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO',
        regra_validacao: regraValidacao.trim(),
        fonte_dados: fonteDados,
        status_regra: statusRegra,
        ativa,
        data_inicio_vigencia:
          modelo?.data_inicio_vigencia || new Date().toISOString().split('T')[0],
      }

      await onSave(payload)

      toast({
        title: isEditing ? 'Atividade atualizada' : 'Atividade cadastrada',
        description: `Atividade ${codigo.trim()} — ${titulo.trim()} ${
          isEditing ? 'atualizada' : 'cadastrada'
        } com sucesso.`,
      })

      onClose()
    } catch (err: any) {
      console.error('[AtividadeMestreModal] Erro ao gravar atividade:', err)
      // Preserva dados no formulário, não fecha o popup
      toast({
        title: 'Erro ao salvar atividade',
        description:
          err.message || 'Ocorreu um erro ao persistir a atividade. Seus dados foram preservados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async () => {
    if (!modelo?.id || !onToggleAtivo || saving) return
    setSaving(true)
    try {
      await onToggleAtivo(modelo.id, !ativa)
      setAtiva(!ativa)
      toast({
        title: !ativa ? 'Atividade reativada' : 'Atividade desativada',
        description: `Status da atividade ${codigo} atualizado com sucesso.`,
      })
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !saving ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-200">
        {/* Header do Modal com identidade CIAFAL (sem a palavra "Mestre") */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#004C97] text-white rounded-xl shadow-xs">
                {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {isEditing ? 'Editar Atividade' : 'Cadastrar Nova Atividade'}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Regras e orientações do manual operacional de fechamento da CIAFAL.
                </p>
              </div>
            </div>

            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleToggleAtivo}
                className={`h-7 text-xs font-medium ${
                  ativa
                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                {ativa ? 'Desativar Atividade' : 'Reativar Atividade'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Corpo do Formulário com Scroll Vertical e Responsivo */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* SEÇÃO 1: Local de Aplicação no topo (Empresa -> Linha -> Centro) */}
          <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
              <span className="font-bold text-[#004C97] flex items-center gap-1.5 text-xs">
                <Building2 className="w-4 h-4 text-[#004C97]" />
                Local de Aplicação
              </span>
              <span className="text-[11px] text-slate-500">
                Cascata hierárquica oficial (Empresa → Linha → Centro)
              </span>
            </div>

            {/* Layout responsivo: 3 colunas em telas médias/grandes, quebra vertical no mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1.1 Empresa (WERKS) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    Empresa (WERKS) <span className="text-rose-500">*</span>
                  </span>
                  {loadingCompanies && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </label>
                <select
                  value={werks}
                  onChange={(e) => handleSelectWerks(e.target.value)}
                  disabled={saving || loadingCompanies}
                  className={`w-full h-8 px-2.5 text-xs rounded-md border bg-white text-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] ${
                    fieldErrors.werks ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200'
                  }`}
                >
                  <option value="">Selecione a Empresa (WERKS)...</option>
                  {companies.map((c) => (
                    <option key={c.werks} value={c.werks}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.werks && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.werks}
                  </p>
                )}
              </div>

              {/* 1.2 Linha (desabilitada sem Empresa) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    Linha <span className="text-rose-500">*</span>
                  </span>
                  {loadingLines && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </label>
                <select
                  value={lineId || lineCode}
                  onChange={(e) => {
                    const selVal = e.target.value
                    const found = filteredLines.find((l) => l.id === selVal || l.code === selVal)
                    handleSelectLine(found || null)
                  }}
                  disabled={!werks || saving || loadingLines}
                  className={`w-full h-8 px-2.5 text-xs rounded-md border bg-white text-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    fieldErrors.line ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200'
                  }`}
                >
                  <option value="">
                    {!werks
                      ? 'Selecione primeiro a Empresa.'
                      : filteredLines.length === 0
                        ? 'Nenhuma linha encontrada para esta empresa'
                        : 'Selecione a Linha...'}
                  </option>
                  {filteredLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} — {l.name || 'Linha Produtiva'}
                    </option>
                  ))}
                </select>
                {fieldErrors.line && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.line}
                  </p>
                )}
              </div>

              {/* 1.3 Centro (desabilitado sem Linha) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    Centro <span className="text-rose-500">*</span>
                  </span>
                  {loadingCenters && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </label>
                <select
                  value={centerCode}
                  onChange={(e) => {
                    const selVal = e.target.value
                    const found = centerOptions.find((c) => c.code === selVal)
                    handleSelectCenter(
                      found || (selVal ? { code: selVal, name: selVal, label: selVal } : null),
                    )
                  }}
                  disabled={!lineCode || saving || loadingCenters}
                  className={`w-full h-8 px-2.5 text-xs rounded-md border bg-white text-slate-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    fieldErrors.center ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200'
                  }`}
                >
                  <option value="">
                    {!lineCode
                      ? 'Selecione primeiro a Linha.'
                      : centerOptions.length === 0
                        ? 'Nenhum centro vinculado encontrado'
                        : 'Selecione o Centro...'}
                  </option>
                  {centerOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.center && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.center}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Identificação da Atividade */}
          <div className="space-y-3">
            <span className="font-bold text-slate-800 block border-b border-slate-100 pb-1">
              Identificação da Atividade
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Código */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Código <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 1.26"
                  value={codigo}
                  disabled={saving}
                  onChange={(e) => {
                    setCodigo(e.target.value)
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.codigo
                      return next
                    })
                  }}
                  className={`h-8 text-xs bg-white font-mono ${
                    fieldErrors.codigo ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {fieldErrors.codigo && (
                  <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.codigo}</p>
                )}
              </div>

              {/* Sequência */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Sequência</label>
                <Input
                  type="number"
                  min={1}
                  value={sequencia}
                  disabled={saving}
                  onChange={(e) => setSequencia(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-slate-700">Categoria</label>
                <Input
                  type="text"
                  placeholder="Ex: Processamento SAP, Ordem de Produção, Apontamentos"
                  value={categoria}
                  disabled={saving}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Título da Atividade <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: ZPP_99 — Validação de Sucata Especial"
                value={titulo}
                disabled={saving}
                onChange={(e) => {
                  setTitulo(e.target.value)
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next.titulo
                    return next
                  })
                }}
                className={`h-8 text-xs bg-white ${
                  fieldErrors.titulo ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200'
                }`}
              />
              {fieldErrors.titulo && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.titulo}</p>
              )}
            </div>
          </div>

          {/* SEÇÃO 3: Orientação (Descrição Detalhada do Manual) */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Orientação (Descrição Detalhada do Manual)
            </label>
            <Textarea
              rows={2}
              placeholder="Instruções operacionais e procedimentos do manual interno do PCP..."
              value={descricao}
              disabled={saving}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs bg-white border-slate-200"
            />
          </div>

          {/* SEÇÃO 4: Integração / Referência SAP */}
          <div className="space-y-3">
            <span className="font-bold text-slate-800 block border-b border-slate-100 pb-1">
              Integração / Referência SAP
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Transação SAP</label>
                <Input
                  type="text"
                  placeholder="Ex: MB52, COGI, CO1P, ZPP_04"
                  value={transacaoSap}
                  disabled={saving}
                  onChange={(e) => setTransacaoSap(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Depósito SAP</label>
                <Input
                  type="text"
                  placeholder="Ex: DP06, DP11, BAL2, DP04"
                  value={depositoSap}
                  disabled={saving}
                  onChange={(e) => setDepositoSap(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: Demais Campos Existentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Frequência</label>
              <select
                value={frequencia}
                disabled={saving}
                onChange={(e) => setFrequencia(e.target.value as ChecklistFrequencia)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="somente_fechamento">Somente Fechamento</option>
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="diaria">Diária</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Fonte de Dados</label>
              <select
                value={fonteDados}
                disabled={saving}
                onChange={(e) => setFonteDados(e.target.value as ChecklistFonteDados)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="Manual">Manual</option>
                <option value="SAP RFC">SAP RFC</option>
                <option value="MES">MES</option>
                <option value="Integração HUB">Integração HUB</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Status da Regra</label>
              <select
                value={statusRegra}
                disabled={saving}
                onChange={(e) => setStatusRegra(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="Oficial">Oficial</option>
                <option value="Regra em validação">Regra em validação</option>
                <option value="Pendente de validação de processo">
                  Pendente de validação de processo
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Regra de Validação Objetiva</label>
            <Textarea
              rows={2}
              placeholder="Critério exato para que a atividade seja aprovada (OK)..."
              value={regraValidacao}
              disabled={saving}
              onChange={(e) => setRegraValidacao(e.target.value)}
              className="text-xs bg-white border-slate-200"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Atividade Obrigatória</span>
              <span className="text-slate-500 text-[11px]">
                Se ativa como obrigatória, o fechamento mensal só poderá ser concluído se esta
                atividade estiver com status OK.
              </span>
            </div>
            <Switch checked={obrigatoria} onCheckedChange={setObrigatoria} disabled={saving} />
          </div>
        </div>

        {/* Rodapé: Botão Salvar Atividade com loading e prevenção de duplo clique */}
        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="h-8 text-xs text-slate-600 hover:text-slate-900"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSubmit}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-medium shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Gravando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Salvar Atividade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AtividadeMestreModal
