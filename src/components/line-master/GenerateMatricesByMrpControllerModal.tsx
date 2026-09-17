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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Zap, Check, ExternalLink, ShieldAlert, Sparkles, Building2 } from 'lucide-react'
import { SapMrpControllerItem } from '@/types/sap-mrp'
import { sapMrpService } from '@/services/sap-mrp-service'
import { bottleneckMatrixService } from '@/services/bottleneck-rules-engine'
import { pcpAuditService, computeDiff } from '@/services/pcp-audit-service'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

interface GenerateMatricesByMrpControllerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineCode: string
  currentCompany: string
  currentWerks: string
  availableControllers: SapMrpControllerItem[]
  existingMatrices: LineBottleneckMatrixRecord[]
  onSuccess: (generatedCount: number) => void
  onOpenMatrix: (matrixId: string) => void
}

export const GenerateMatricesByMrpControllerModal: React.FC<
  GenerateMatricesByMrpControllerModalProps
> = ({
  open,
  onOpenChange,
  lineCode,
  currentCompany,
  currentWerks,
  availableControllers,
  existingMatrices,
  onSuccess,
  onOpenMatrix,
}) => {
  const { toast } = useToast()
  const [selectedDispos, setSelectedDispos] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  // Filtra Planejadores do WERKS corrente
  const controllersForWerks = availableControllers.filter(
    (c) => c.werks === currentWerks || !c.werks || currentWerks === 'ALL',
  )

  // Verifica se já existe matriz para Empresa + WERKS + Linha + Planejador
  const getExistingMatrix = (dispoCode: string): LineBottleneckMatrixRecord | undefined => {
    return existingMatrices.find((m) => {
      const matchComp = (m.company_code || 'CIAFAL') === currentCompany
      const matchWerks = (m.werks || '1001') === currentWerks
      const matchLine = (m.line_code || '') === lineCode
      const matchDispo =
        (m.mrp_controller_code || '') === dispoCode ||
        (Array.isArray(m.mrp_controllers_json) && m.mrp_controllers_json.includes(dispoCode))

      return matchComp && matchWerks && matchLine && matchDispo
    })
  }

  const toggleSelect = (dispoCode: string) => {
    const existing = getExistingMatrix(dispoCode)
    if (existing) {
      // Já existe: não seleciona para geração para evitar duplicidade
      return
    }
    setSelectedDispos((prev) =>
      prev.includes(dispoCode) ? prev.filter((d) => d !== dispoCode) : [...prev, dispoCode],
    )
  }

  const handleSelectAllEligible = () => {
    const eligible = controllersForWerks
      .filter((c) => !getExistingMatrix(c.dispo))
      .map((c) => c.dispo)
    setSelectedDispos(eligible)
  }

  const handleClearSelection = () => {
    setSelectedDispos([])
  }

  // Geração automática em lote (Itens 7 e 8)
  const handleGenerate = async () => {
    if (selectedDispos.length === 0) {
      toast({
        title: 'Nenhum Planejador Selecionado',
        description: 'Selecione pelo menos um Planejador MRP elegível para geração de Matriz.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    let createdCount = 0

    try {
      for (const dispoCode of selectedDispos) {
        // Checagem rigorosa contra duplicidade
        const existing = getExistingMatrix(dispoCode)
        if (existing) {
          continue // Ignora silenciosamente ou não duplica
        }

        const ctrl = controllersForWerks.find((c) => c.dispo === dispoCode)
        const matrixName = `Matriz Planejador ${dispoCode}${
          ctrl?.description ? ` — ${ctrl.description}` : ''
        }`

        const payload: Partial<LineBottleneckMatrixRecord> = {
          matrix_name: matrixName,
          line_code: lineCode,
          company_code: currentCompany,
          werks: currentWerks,
          mrp_controller_code: dispoCode,
          mrp_controller_description: ctrl?.description || '',
          mrp_controllers_json: [dispoCode],
          valid_from: '2026-01-01 00:00:00.000Z',
          valid_until: '2026-12-31 00:00:00.000Z',
          status: 'RASCUNHO', // Nasce como Rascunho conforme Item 7
          version: 1,
          is_homologated: false, // Não homologada conforme Item 7
          gauge_dimension: 'Padrão DISPO ' + dispoCode,
          steel_grade: 'Geral',
          product_family: 'Geral',
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
          reference_doc: `Geração Automática DISPO ${dispoCode}`,
          source_authority: 'Motor de Geração de Matrizes PCP',
          responsible_name: 'PCP Robotizado',
          approver_name: 'Pendente de Homologação',
        }

        const created = await bottleneckMatrixService.createMatrix(payload)
        createdCount++

        // Auditoria
        const afterState = {
          matrix_name: payload.matrix_name,
          company_code: currentCompany,
          werks: currentWerks,
          line: lineCode,
          mrp_controller_code: dispoCode,
          mrp_controller_description: ctrl?.description || '',
          status: 'RASCUNHO',
          is_homologated: 'Inativo',
        }
        await pcpAuditService.recordLog({
          action: 'Geração Automática de Matriz de Gargalos por Planejador MRP',
          event_type: 'CRIAÇÃO',
          status: 'Concluída',
          outcome: 'SUCCESS',
          module: 'Matriz de Gargalos Dinâmica',
          screen: 'Centros & Ficha Mestra',
          company: currentCompany,
          line: lineCode,
          resource: 'line_bottleneck_matrix',
          resource_id: created.id,
          source: 'SAP MARC-DISPO / T024D',
          changes: computeDiff({}, afterState),
          details: {
            matrix_id: created.id,
            mrp_controller_code: dispoCode,
            status: 'RASCUNHO',
            is_homologated: false,
          },
        })
      }

      toast({
        title: 'Matrizes Geradas com Sucesso',
        description: `${createdCount} Matriz(es) de Referência criada(s) como Rascunho / Não Homologada(s).`,
      })

      onSuccess(createdCount)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro na geração de matrizes por planejador:', err)
      toast({
        title: 'Erro na Geração',
        description: err.message || 'Falha ao gravar matrizes no backend.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#004C97]" />
            Gerar Matrizes de Gargalos por Planejador MRP
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Criação assistida de matrizes a partir dos códigos reais MARC-DISPO cadastrados no SAP
            para a planta atual. Matrizes geradas nascem com status{' '}
            <strong>Rascunho / Não Homologada</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {/* Cabeçalho de Contexto: Empresa & WERKS */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              <span className="font-semibold text-slate-800">
                Empresa: <strong>{currentCompany}</strong> &bull; Centro SAP:{' '}
                <strong className="font-mono text-[#004C97]">WERKS {currentWerks}</strong> &bull;
                Linha: <strong>{lineCode}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAllEligible}
                className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50"
              >
                Selecionar Todos Elegíveis
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
                className="h-7 text-[11px] text-slate-500 hover:bg-slate-100"
              >
                Limpar
              </Button>
            </div>
          </div>

          {/* Tabela de Planejadores MRP conforme Item 7 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-12">Sel.</th>
                  <th className="p-2.5 w-20">Código</th>
                  <th className="p-2.5">Descrição do Planejador (SAP T024D)</th>
                  <th className="p-2.5 text-center w-36">Materiais Associados</th>
                  <th className="p-2.5 w-44">Matriz Existente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {controllersForWerks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      Nenhum Planejador MRP disponível para WERKS {currentWerks}. Atualize os dados
                      SAP.
                    </td>
                  </tr>
                ) : (
                  controllersForWerks.map((c) => {
                    const existing = getExistingMatrix(c.dispo)
                    const isSelected = selectedDispos.includes(c.dispo)

                    return (
                      <tr
                        key={c.dispo}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          existing
                            ? 'bg-slate-50/50 text-slate-400'
                            : isSelected
                              ? 'bg-blue-50/60 font-semibold'
                              : ''
                        }`}
                      >
                        {/* Coluna 1: Selecionar */}
                        <td className="p-2.5 text-center">
                          {existing ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(c.dispo)}
                              className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] cursor-pointer"
                            />
                          )}
                        </td>

                        {/* Coluna 2: Código DISPO */}
                        <td className="p-2.5 font-mono font-bold text-slate-900">{c.dispo}</td>

                        {/* Coluna 3: Descrição */}
                        <td className="p-2.5 text-slate-700">
                          {c.description || (
                            <span className="text-slate-400 italic">Sem descrição no SAP</span>
                          )}
                        </td>

                        {/* Coluna 4: Materiais associados */}
                        <td className="p-2.5 text-center">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] bg-white border-slate-300 text-slate-700"
                          >
                            {c.materials_count || 0} materiais
                          </Badge>
                        </td>

                        {/* Coluna 5: Matriz existente / Ação */}
                        <td className="p-2.5">
                          {existing ? (
                            <div className="flex items-center justify-between gap-1">
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-medium truncate max-w-[110px]">
                                Matriz já existente
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  onOpenMatrix(existing.id)
                                  onOpenChange(false)
                                }}
                                className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50"
                                title="Abrir esta matriz na tela principal"
                              >
                                Abrir Matriz &rarr;
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Nenhuma cadastrada</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
            <div>
              <strong>Regra de Ouro Antiduplicidade (Item 8):</strong>
              <p>
                O sistema impede a criação em duplicidade para a mesma combinação de Empresa + WERKS
                + Linha + Planejador MRP. Para Planejadores que já contam com Matriz, use a ação
                "Abrir Matriz".
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
            className="h-8 text-xs text-slate-600"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedDispos.length === 0}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            {generating ? 'Gerando...' : `Gerar ${selectedDispos.length} Matriz(es) Selecionada(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
