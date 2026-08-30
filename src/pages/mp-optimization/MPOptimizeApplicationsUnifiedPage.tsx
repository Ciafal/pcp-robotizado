import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPDimensionalItem,
  MPApplicationRequirement,
  MPReapplicationOpportunity,
  MPWorkflowApproval,
  MPApplicationAuditHistory,
} from '@/types/mp-optimization'
import { ClassificationBadge } from '@/components/mp-optimization/ClassificationBadge'
import { MP3DCanvasViewer } from '@/components/mp-optimization/MP3DCanvasViewer'
import { ZPP86ModifyApplicationModal } from '@/components/mp-optimization/ZPP86ModifyApplicationModal'
import { ZPP88OutOfIdealModal } from '@/components/mp-optimization/ZPP88OutOfIdealModal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  RefreshCw,
  Sparkles,
  Sliders,
  ShieldCheck,
  Microscope,
  CheckCircle2,
  History,
  Maximize2,
  ArrowRight,
  AlertTriangle,
  Send,
  Boxes,
  Lock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const MPOptimizeApplicationsUnifiedPage: React.FC = () => {
  const { toast } = useToast()

  const [activeSubTab, setActiveSubTab] = useState<
    | 'CORTES_EXISTENTES'
    | 'OPORTUNIDADES'
    | 'PECA_FORA_PADRAO'
    | 'MATRIZ_REAPLICACAO'
    | 'ANALISE_3D'
    | 'APROVACOES'
    | 'HISTORICO'
  >('OPORTUNIDADES')

  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [opportunities, setOpportunities] = useState<MPReapplicationOpportunity[]>([])
  const [approvals, setApprovals] = useState<MPWorkflowApproval[]>([])
  const [history, setHistory] = useState<MPApplicationAuditHistory[]>([])

  const [selectedItem, setSelectedItem] = useState<MPDimensionalItem | null>(null)
  const [isZPP86Open, setIsZPP86Open] = useState(false)
  const [isZPP88Open, setIsZPP88Open] = useState(false)

  const loadData = async () => {
    try {
      const [inv, reqs, opps, apps, hist] = await Promise.all([
        mpOptimizationService.getDimensionalInventory(),
        mpOptimizationService.getApplicationRequirements(),
        mpOptimizationService.getReapplicationOpportunities(),
        mpOptimizationService.getWorkflowApprovals(),
        mpOptimizationService.getAuditHistory(),
      ])
      setItems(inv)
      setRequirements(reqs)
      setOpportunities(opps)
      setApprovals(apps)
      setHistory(hist)
      if (inv.length > 0 && !selectedItem) {
        setSelectedItem(inv[0])
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de otimização de aplicações:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <MPModuleLayout
      activeTopic="otimizar-aplicacoes"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (selectedItem) setIsZPP86Open(true)
              else toast({ title: 'Selecione um bloco na lista primeiro.' })
            }}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            MODIFICAR APLICAÇÃO (ZPP86)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (selectedItem) setIsZPP88Open(true)
              else toast({ title: 'Selecione um bloco na lista primeiro.' })
            }}
            className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />[ AVALIAR PEÇA FORA DO PADRÃO
            (ZPP88) ]
          </Button>
        </div>
      }
    >
      {/* Régua das 7 Abas Secundárias de Otimizar Aplicações */}
      <Tabs
        value={activeSubTab}
        onValueChange={(v: any) => setActiveSubTab(v)}
        className="w-full space-y-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger
              value="OPORTUNIDADES"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              OPORTUNIDADES ({opportunities.length})
            </TabsTrigger>
            <TabsTrigger
              value="CORTES_EXISTENTES"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Boxes className="w-3.5 h-3.5 mr-1.5" />
              CORTES EXISTENTES (ZPP86)
            </TabsTrigger>
            <TabsTrigger
              value="PECA_FORA_PADRAO"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              PEÇAS FORA DO PADRÃO (ZPP88)
            </TabsTrigger>
            <TabsTrigger
              value="MATRIZ_REAPLICACAO"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Microscope className="w-3.5 h-3.5 mr-1.5" />
              MATRIZ DE REAPLICAÇÃO
            </TabsTrigger>
            <TabsTrigger
              value="ANALISE_3D"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
              PROJEÇÃO & NUVEM 3D
            </TabsTrigger>
            <TabsTrigger
              value="APROVACOES"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              APROVAÇÕES ({approvals.length})
            </TabsTrigger>
            <TabsTrigger
              value="HISTORICO"
              className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              HISTÓRICO ZPPT058 ({history.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA 1: OPORTUNIDADES DE REAPLICAÇÃO */}
        <TabsContent value="OPORTUNIDADES" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Ranking de Oportunidades de Reaplicação Dimensional
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Identifica blocos cortados que podem migrar de aplicação com economia de compra,
              sucata evitada e garantia de produto final conforme.
            </p>

            {opportunities.length === 0 ? (
              <SapEmptyState
                title="AGUARDANDO INTEGRAÇÃO SAP"
                description="Sem oportunidades de reaplicação no momento. O motor avalia continuamente os lotes e a carteira."
                sapTransaction="ZPP86 / ZPPT058"
                onRefresh={loadData}
              />
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 text-sm">
                          Bloco {opp.block_number} ({opp.heat_number || 'S/C'})
                        </span>
                        <Badge className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]">
                          Score IA: {opp.ai_score || 94}/100
                        </Badge>
                      </div>
                      <ClassificationBadge
                        classification={opp.dimensional_classification}
                        size="sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-lg font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Aplicação Atual</span>
                        <span className="font-bold text-slate-700">{opp.current_application}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Nova Aplicação</span>
                        <span className="font-bold text-emerald-800 flex items-center gap-1 font-sans">
                          <ArrowRight className="w-3 h-3 text-emerald-600" />
                          {opp.recommended_application}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dimensões Reais</span>
                        <span className="font-bold text-slate-900">
                          {opp.thickness_mm}×{opp.width_mm}×{opp.length_mm} mm ({opp.weight_kg} kg)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Economia Estimada</span>
                        <span className="font-bold text-emerald-700">
                          R$ {(opp.potential_savings_brl || 1450).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px]">
                      <p className="text-slate-600 max-w-xl">
                        <strong>Evidência IA:</strong>{' '}
                        {opp.ai_reasoning ||
                          'Material atende perfeitamente os limites do envelope ZPPMP da nova aplicação com 92% de casos históricos conformes.'}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          const matched = items.find((i) => i.block_number === opp.block_number)
                          if (matched) setSelectedItem(matched)
                          setIsZPP86Open(true)
                        }}
                        className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs"
                      >
                        Simular Modificação (ZPP86)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 2: CORTES EXISTENTES (REGRAS ZPP86) */}
        <TabsContent value="CORTES_EXISTENTES" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Avaliação de Cortes Existentes e Regras SAP ZPP86
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Preservação de status SAP: 01 disponível, 02 selecionado, 03 trânsito, 04 MP Ciafal,
              05 forno, 06 devolvido, 07 laminado. Blocos já enfornados ou laminados não podem ser
              alterados.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Bloco</th>
                    <th className="p-2.5">Corrida / Letra</th>
                    <th className="p-2.5">Aplicação Original</th>
                    <th className="p-2.5">Aplicação Atual</th>
                    <th className="p-2.5">Dimensão Real (E×L×C)</th>
                    <th className="p-2.5">Status ZPP86</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const isLocked =
                      it.sap_block_status === '05_FORNO' || it.sap_block_status === '07_LAMINADO'
                    return (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{it.block_number}</td>
                        <td className="p-2.5">
                          {it.heat_number} / {it.letter_code || 'A'}
                        </td>
                        <td className="p-2.5 text-slate-600">{it.original_application}</td>
                        <td className="p-2.5 font-bold text-[#004C97]">{it.current_application}</td>
                        <td className="p-2.5">
                          {it.thickness_mm}×{it.width_mm}×{it.length_mm} mm
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              isLocked
                                ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {it.sap_block_status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-sans">
                          {isLocked ? (
                            <span className="text-[10px] text-rose-600 font-bold flex items-center justify-end gap-1">
                              <Lock className="w-3 h-3" /> Bloqueado SAP
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(it)
                                setIsZPP86Open(true)
                              }}
                              className="h-6 text-[10px] text-[#004C97] font-bold"
                            >
                              Modificar KS
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ABA 3: PEÇAS FORA DO PADRÃO IDEAL (ZPP88) */}
        <TabsContent value="PECA_FORA_PADRAO" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Validação de 2ª Etapa: Cálculo de Peças Fora do Padrão Ideal (ZPP88)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              "Fora do padrão ideal" <strong>NÃO é automaticamente reprovado</strong>. A regra
              avalia a transformação dimensional na laminação, perdas por carepa/refile e garante
              que o produto final projetado atende rigorosamente a especificação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                <strong className="block">1. IDEAL</strong>
                <span className="text-[10px]">Dentro dos limites nominais ZPPMP</span>
              </div>
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 text-xs">
                <strong className="block">2. ADMISSÍVEL</strong>
                <span className="text-[10px]">Pequeno desvio, produto perfeito</span>
              </div>
              <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs">
                <strong className="block">3. FORA DO IDEAL CONFORME</strong>
                <span className="text-[10px]">ZPP88 valida produto final OK</span>
              </div>
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                <strong className="block">4. EXCEÇÃO TÉCNICA</strong>
                <span className="text-[10px]">Exige aprovação Eng/Qualidade</span>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-xs">
                <strong className="block">5. PROIBIDO</strong>
                <span className="text-[10px]">Inviável metalurgicamente</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA 4: MATRIZ DE REAPLICAÇÃO */}
        <TabsContent value="MATRIZ_REAPLICACAO" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Matriz de Reaplicação Cruzada (Aplicação Atual × Aplicação Alternativa)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Verde = compatível &bull; Azul = Fora do ideal produto conforme &bull; Amarelo =
              Requer análise &bull; Laranja = Exige aprovação &bull; Vermelho = Proibido.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
              <div className="font-bold text-slate-800 mb-2">Cruzamento de Famílias:</div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-emerald-100 text-emerald-900 font-bold">
                  APL_ESTRUTURAL &rarr; APL_PERFIS (Verde)
                </div>
                <div className="p-2 rounded bg-blue-100 text-blue-900 font-bold">
                  APL_TREFILA &rarr; APL_ESTRUTURAL (Azul - ZPP88)
                </div>
                <div className="p-2 rounded bg-amber-100 text-amber-900 font-bold">
                  APL_PESADA &rarr; APL_TREFILA (Amarelo)
                </div>
                <div className="p-2 rounded bg-rose-100 text-rose-900 font-bold">
                  APL_1045 &rarr; APL_1020 (Vermelho - Aço Dif.)
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA 5: ANÁLISE & PROJEÇÃO 3D */}
        <TabsContent value="ANALISE_3D" className="space-y-3">
          <MP3DCanvasViewer
            title={`Projeção 3D — Bloco ${selectedItem?.block_number || 'SAP'} com Envelopes Ideais`}
            plate={
              selectedItem
                ? {
                    thickness: selectedItem.thickness_mm,
                    width: selectedItem.width_mm,
                    length: selectedItem.length_mm,
                    weight: selectedItem.weight_kg,
                    label: `Bloco ${selectedItem.block_number} &bull; ${selectedItem.current_application}`,
                  }
                : undefined
            }
          />
        </TabsContent>

        {/* ABA 6: APROVAÇÕES GOVERNANÇA */}
        <TabsContent value="APROVACOES" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Fila de Aprovações em 2 Fases (PCP + Produção + Qualidade)
            </h3>
            {approvals.length === 0 ? (
              <SapEmptyState
                title="SEM APROVAÇÕES PENDENTES"
                description="Todas as solicitações de alteração de aplicação e cortes foram processadas."
                sapTransaction="ZPP86_APPR"
                onRefresh={loadData}
              />
            ) : (
              <div className="space-y-2">
                {approvals.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{a.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Tipo: {a.approval_type} &bull; Bloco: {a.block_number || 'N/A'}
                      </div>
                    </div>
                    <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]">
                      {a.overall_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 7: HISTÓRICO ZPPT058 / ZMM029 */}
        <TabsContent value="HISTORICO" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Auditoria de Alterações de Aplicação (ZPPT058 / ZMM029)
            </h3>
            {history.length === 0 ? (
              <SapEmptyState
                title="SEM REGISTROS HISTÓRICOS"
                description="Aguardando apontamentos de alteração de aplicação para alimentar a trilha imutável."
                sapTransaction="ZPPT058 / ZMM029"
                onRefresh={loadData}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Evento</th>
                      <th className="p-2.5">Bloco</th>
                      <th className="p-2.5">Aplicação Original</th>
                      <th className="p-2.5">Nova Aplicação</th>
                      <th className="p-2.5">Usuário / Matrícula</th>
                      <th className="p-2.5">Motivo</th>
                      <th className="p-2.5">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{h.event_code}</td>
                        <td className="p-2.5">{h.block_number}</td>
                        <td className="p-2.5 text-slate-500">{h.original_application}</td>
                        <td className="p-2.5 font-bold text-[#004C97]">{h.new_application}</td>
                        <td className="p-2.5 font-sans">
                          {h.user_name} ({h.user_registration_matricula})
                        </td>
                        <td className="p-2.5 font-sans">{h.reason_description}</td>
                        <td className="p-2.5 text-slate-500">
                          {new Date(h.event_timestamp).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modais ZPP86 e ZPP88 */}
      <ZPP86ModifyApplicationModal
        isOpen={isZPP86Open}
        onClose={() => setIsZPP86Open(false)}
        item={selectedItem}
        availableRequirements={requirements}
        onSuccess={loadData}
      />

      <ZPP88OutOfIdealModal
        isOpen={isZPP88Open}
        onClose={() => setIsZPP88Open(false)}
        item={selectedItem}
        targetRequirement={requirements[0] || null}
        onApprovedAsConforming={loadData}
      />
    </MPModuleLayout>
  )
}
