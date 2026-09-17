import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Check, Search, AlertCircle, Building2, Sliders, ShieldCheck } from 'lucide-react'
import { SapMrpControllerItem } from '@/types/sap-mrp'
import { sapMrpService } from '@/services/sap-mrp-service'
import { bottleneckMatrixService } from '@/services/bottleneck-rules-engine'
import { pcpAuditService, computeDiff } from '@/services/pcp-audit-service'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

interface CreateReferenceMatrixModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineCode: string
  lineName?: string
  currentWerks: string
  currentCompany: string
  availableControllers: SapMrpControllerItem[]
  existingMatrices: LineBottleneckMatrixRecord[]
  onSuccess: (newMatrix: LineBottleneckMatrixRecord) => void
}

export const CreateReferenceMatrixModal: React.FC<CreateReferenceMatrixModalProps> = ({
  open,
  onOpenChange,
  lineCode,
  lineName,
  currentWerks,
  currentCompany,
  availableControllers,
  existingMatrices,
  onSuccess,
}) => {
  const { toast } = useToast()

  // Campos do Formulário conforme Item 6
  const [matrixName, setMatrixName] = useState('')
  const [company, setCompany] = useState(currentCompany || 'CIAFAL')
  const [werks, setWerks] = useState(currentWerks || '1001')
  const [productiveLine, setProductiveLine] = useState(lineCode || 'L1')
  const [centerName, setCenterName] = useState(lineName || 'Linha 1 — Laminação')
  const [selectedDispos, setSelectedDispos] = useState<string[]>([])
  const [validFrom, setValidFrom] = useState('2026-01-01')
  const [validUntil, setValidUntil] = useState('2026-12-31')
  const [status, setStatus] = useState<'VIGENTE' | 'RASCUNHO' | 'EM_REVISAO'>('VIGENTE')
  const [version, setVersion] = useState<number>(1)
  const [isHomologated, setIsHomologated] = useState<boolean>(true)

  // Filtro de pesquisa no seletor de Planejadores MRP
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // Ao mudar a empresa, recalcula o WERKS
  const handleCompanyChange = (newComp: string) => {
    setCompany(newComp)
    const newW = sapMrpService.mapCompanyToWerks(newComp)
    setWerks(newW)
  }

  const toggleDispo = (dispoCode: string) => {
    setSelectedDispos((prev) =>
      prev.includes(dispoCode) ? prev.filter((d) => d !== dispoCode) : [...prev, dispoCode],
    )
    setDuplicateWarning(null)
  }

  // Filtragem dos Planejadores pelo WERKS atual
  const controllersForWerks = availableControllers.filter(
    (c) => c.werks === werks || !c.werks || werks === 'ALL',
  )

  const filteredControllers = controllersForWerks.filter((c) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const display = sapMrpService.formatMrpControllerDisplay(c).toLowerCase()
    return display.includes(term) || c.dispo.toLowerCase().includes(term)
  })

  // Verificação de duplicidade conforme Item 8:
  // Empresa + WERKS + Linha + Planejador MRP
  const checkDuplicate = (targetDispo: string): LineBottleneckMatrixRecord | undefined => {
    return existingMatrices.find((m) => {
      const matchComp = (m.company_code || 'CIAFAL') === company
      const matchWerks = (m.werks || '1001') === werks
      const matchLine = (m.line_code || '') === productiveLine
      const matchDispo =
        (m.mrp_controller_code || '') === targetDispo ||
        (Array.isArray(m.mrp_controllers_json) && m.mrp_controllers_json.includes(targetDispo))

      return matchComp && matchWerks && matchLine && matchDispo
    })
  }

  const handleSave = async () => {
    if (!matrixName.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'Por favor, informe o Nome da Matriz de Referência.',
        variant: 'destructive',
      })
      return
    }
    if (selectedDispos.length === 0) {
      toast({
        title: 'Planejador MRP Obrigatório',
        description: 'Selecione pelo menos um Planejador MRP (MARC-DISPO).',
        variant: 'destructive',
      })
      return
    }
    if (!validFrom) {
      toast({
        title: 'Vigência Obrigatória',
        description: 'Informe a data de Vigência Inicial.',
        variant: 'destructive',
      })
      return
    }

    // Validação estrita de Duplicidade (Item 8)
    for (const d of selectedDispos) {
      const existing = checkDuplicate(d)
      if (existing) {
        const msg = `Matriz já existente para Empresa ${company}, WERKS ${werks}, Linha ${productiveLine} e Planejador MRP ${d} ("${existing.matrix_name || existing.gauge_dimension}"). NÃO é permitido gerar duplicidade.`
        setDuplicateWarning(msg)
        toast({
          title: 'Matriz já existente',
          description: msg,
          variant: 'destructive',
        })
        return
      }
    }

    setSaving(true)
    try {
      const primaryDispo = selectedDispos[0]
      const primaryCtrl = availableControllers.find(
        (c) => c.dispo === primaryDispo && c.werks === werks,
      )

      const payload: Partial<LineBottleneckMatrixRecord> = {
        matrix_name: matrixName.trim(),
        line_code: productiveLine,
        company_code: company,
        werks: werks,
        mrp_controller_code: primaryDispo,
        mrp_controller_description: primaryCtrl?.description || '',
        mrp_controllers_json: selectedDispos,
        valid_from: `${validFrom} 00:00:00.000Z`,
        valid_until: validUntil ? `${validUntil} 00:00:00.000Z` : undefined,
        status: status,
        version: version,
        is_homologated: isHomologated,
        // Valores default seguros de capacidades
        furnace_capacity_th: 32,
        roughing_capacity_th: 29.5,
        continuous_mill_capacity_th: 24.8,
        shear_tr2_capacity_th: 27.5,
        cooling_bed_tcc_capacity_th: 26.1,
        straightener_capacity_th: 30,
        packaging_capacity_th: 34,
        primary_bottleneck_stage: 'TREM_CONTINUO',
        primary_bottleneck_rate_th: 24.8,
        secondary_bottleneck_stage: 'TCC_RESFRIAMENTO',
        secondary_bottleneck_rate_th: 26.1,
        bottleneck_gap_th: 1.3,
        max_tcc_bar_length_m: 72,
        max_tcc_bars_per_rack: 14,
        min_bar_interval_seconds: 3.2,
        max_crop_end_weight_kg: 15,
        reference_doc: `Cadastro Matriz ${matrixName.trim()}`,
        source_authority: 'PCP Robotizado CIAFAL',
        responsible_name: 'PCP Robotizado',
        approver_name: 'Engenharia de Processos',
      }

      const created = await bottleneckMatrixService.createMatrix(payload)

      // Auditoria oficial
      const afterState = {
        matrix_name: payload.matrix_name,
        company_code: payload.company_code,
        werks: payload.werks,
        line: payload.line_code,
        mrp_controller_code: payload.mrp_controller_code,
        mrp_controller_description: payload.mrp_controller_description,
        mrp_controllers_json: selectedDispos.join(', '),
        valid_from: validFrom,
        valid_until: validUntil,
        status: status,
        revision: `Rev.${version}`,
      }
      const changes = computeDiff({}, afterState)

      await pcpAuditService.recordLog({
        action: 'Cadastro de Nova Matriz de Referência',
        event_type: 'CRIAÇÃO',
        status: 'Concluída',
        outcome: 'SUCCESS',
        module: 'Matriz de Gargalos Dinâmica',
        screen: 'Centros & Ficha Mestra',
        company: company,
        line: productiveLine,
        center: centerName,
        resource: 'line_bottleneck_matrix',
        resource_id: created.id,
        source: 'PCP Robotizado / SAP MARC-DISPO',
        changes,
        details: {
          matrix_id: created.id,
          matrix_name: payload.matrix_name,
          planejadores: selectedDispos,
          werks: werks,
        },
      })

      toast({
        title: 'Matriz Criada com Sucesso',
        description: `Matriz "${created.matrix_name}" persistida e associada a ${selectedDispos.length} Planejador(es) MRP.`,
      })

      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao criar matriz de referência:', err)
      toast({
        title: 'Erro ao Criar Matriz',
        description: err.message || 'Falha ao salvar no backend PocketBase.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#004C97]" />
            Nova Matriz de Referência Técnica
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Cadastre os parâmetros operacionais vinculados ao Planejador MRP (MARC-DISPO / T024D) e
            WERKS correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Nome da Matriz */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">
              Nome da Matriz *{' '}
              <span className="text-slate-400 font-normal">
                (ex: Matriz ENDIR — 130x130 SAE 1020)
              </span>
            </Label>
            <Input
              value={matrixName}
              onChange={(e) => setMatrixName(e.target.value)}
              placeholder="Ex: Matriz L1 — Laminação Quadrados Pesados"
              className="text-xs h-8 bg-slate-50 border-slate-300"
            />
          </div>

          {/* Empresa, WERKS, Linha, Centro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Empresa *</Label>
              <select
                value={company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="CIAFAL">CIAFAL (1001 — CFPL)</option>
                <option value="KS-FERRADURA">KS - Ferradura (2001)</option>
                <option value="KS-CIAFAL">KS - Ciafal (2101)</option>
                <option value="SIDERCENTRO">Sidercentro (3001)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Centro SAP (WERKS) *</Label>
              <Input
                value={werks}
                disabled
                className="text-xs h-8 bg-slate-100 border-slate-300 font-mono text-[#004C97] font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Linha Produtiva *</Label>
              <Input
                value={productiveLine}
                onChange={(e) => setProductiveLine(e.target.value)}
                className="text-xs h-8 bg-slate-50 border-slate-300 font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Centro Operacional</Label>
              <Input
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="Centro / Unidade Fabril"
                className="text-xs h-8 bg-slate-50 border-slate-300"
              />
            </div>
          </div>

          {/* Multisseleção de Planejador MRP (MARC-DISPO) */}
          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#004C97]" />
                Planejador MRP (MARC-DISPO) * — Multisseleção
              </Label>
              <Badge variant="outline" className="font-mono text-[10px] text-[#004C97]">
                {selectedDispos.length} selecionado(s)
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Uma Matriz de Referência pode atender múltiplos Planejadores MRP da mesma planta SAP
              (WERKS {werks}).
            </p>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por código DISPO ou descrição..."
                className="pl-8 h-7 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded border border-slate-200">
              {filteredControllers.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">
                  Nenhum Planejador MRP no cache para WERKS {werks}. Clique em 'Atualizar SAP' na
                  tela principal.
                </div>
              ) : (
                filteredControllers.map((c) => {
                  const isChecked = selectedDispos.includes(c.dispo)
                  return (
                    <div
                      key={c.dispo}
                      onClick={() => toggleDispo(c.dispo)}
                      className={`p-2 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors ${
                        isChecked ? 'bg-blue-50 font-semibold text-[#004C97]' : 'text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? 'bg-[#004C97] border-[#004C97] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-mono text-xs">
                          {sapMrpService.formatMrpControllerDisplay(c)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                        {c.materials_count || 0} mat.
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Vigência, Status e Revisão */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Vigência Inicial *</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="text-xs h-8 bg-slate-50 border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Vigência Final</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="text-xs h-8 bg-slate-50 border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="VIGENTE">VIGENTE</option>
                <option value="RASCUNHO">RASCUNHO</option>
                <option value="EM_REVISAO">EM REVISÃO</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Revisão</Label>
              <Input
                type="number"
                min={1}
                value={version}
                onChange={(e) => setVersion(Number(e.target.value) || 1)}
                className="text-xs h-8 bg-slate-50 border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Alerta de Duplicidade */}
          {duplicateWarning && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Bloqueio de Duplicidade</strong>
                <span>{duplicateWarning}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-8 text-xs text-slate-600"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {saving ? 'Gravando...' : 'Salvar Matriz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
