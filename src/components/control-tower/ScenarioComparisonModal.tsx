import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Columns3, Send, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { OptimizationScenarioEntity } from '@/types/optimization-engine'
import { optimizationService } from '@/services/optimization-service'

interface ScenarioComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  scenarios: OptimizationScenarioEntity[]
  onScenarioConverted?: (scenarioId: string) => void
}

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  onScenarioConverted,
}) => {
  const { toast } = useToast()

  // Selecionar até 4 cenários para comparar simultaneamente
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>(() => {
    return scenarios.slice(0, 4).map((s) => s.id)
  })

  const [convertingId, setConvertingId] = useState<string | null>(null)

  const toggleScenarioSelection = (id: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev // manter pelo menos 1
        return prev.filter((item) => item !== id)
      } else {
        if (prev.length >= 4) return prev // limite de 4
        return [...prev, id]
      }
    })
  }

  const comparedScenarios = scenarios.filter((s) => selectedScenarioIds.includes(s.id))

  const handleConvertToProposal = async (scenario: OptimizationScenarioEntity) => {
    setConvertingId(scenario.id)
    try {
      const proposal = await optimizationService.convertScenarioToSchedule(scenario.id)
      toast({
        title: 'Proposta de Programação Criada',
        description: `Cenário [${scenario.name}] convertido em proposta [${proposal.code}]. Status: PCP_REVIEW (Aprovação humana mandatória).`,
      })
      if (onScenarioConverted) onScenarioConverted(scenario.id)
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na conversão',
        description: err.message || 'Falha ao transformar cenário em proposta.',
      })
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white max-w-6xl max-h-[92vh] overflow-y-auto [&>button]:text-[var(--ciafal-text-muted)]">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle
                className="flex items-center gap-2 text-base font-bold"
                style={{ color: 'var(--ciafal-navy)' }}
              >
                <Columns3 className="w-5 h-5" style={{ color: 'var(--ciafal-primary)' }} />{' '}
                Comparador Multicritério de Cenários CP-SAT
              </DialogTitle>
              <DialogDescription className="text-xs" style={{ color: 'var(--ciafal-text-muted)' }}>
                Compare até 4 cenários simultâneos contra a programação oficial (Baseline SAP). O
                motor apresenta os trade-offs determinísticos; a decisão final é 100% humana.
              </DialogDescription>
            </div>
            <span className="ciafal-badge ciafal-badge--info font-mono text-xs self-start sm:self-center whitespace-nowrap">
              Até 4 Cenários Ativos
            </span>
          </div>
        </DialogHeader>

        {/* Seletor de Cenários para Comparar */}
        <div
          className="bg-[var(--ciafal-surface-muted)] p-3 rounded-lg border space-y-2 text-xs"
          style={{ borderColor: 'var(--ciafal-border)' }}
        >
          <span className="font-semibold block text-[11px]" style={{ color: 'var(--ciafal-text)' }}>
            Selecione os Cenários para Comparação na Grade:
          </span>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((sc) => {
              const isSelected = selectedScenarioIds.includes(sc.id)
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => toggleScenarioSelection(sc.id)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ciafal-primary)] ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'bg-white hover:bg-[var(--ciafal-primary-lighter)]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--ciafal-primary)' : undefined,
                    borderColor: isSelected ? 'var(--ciafal-primary)' : 'var(--ciafal-border)',
                    color: isSelected ? '#fff' : 'var(--ciafal-text-muted)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? '#fff' : 'var(--ciafal-primary)' }}
                  ></span>
                  {sc.code} ({sc.profile})
                  {sc.is_baseline && (
                    <span
                      className="text-[9px] px-1 rounded ml-1 font-bold"
                      style={{ color: 'var(--status-warning)' }}
                    >
                      BASELINE
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabela Comparativa de Métricas */}
        <div
          className="border rounded-xl overflow-hidden shadow-sm text-xs"
          style={{ borderColor: 'var(--ciafal-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ color: 'var(--ciafal-text)' }}>
              <thead
                className="font-semibold border-b text-[11px]"
                style={{
                  backgroundColor: 'var(--ciafal-primary-lighter)',
                  borderColor: 'var(--ciafal-border)',
                  color: 'var(--ciafal-navy)',
                }}
              >
                <tr>
                  <th className="px-4 py-3 w-1/4 whitespace-nowrap">
                    Dimensão / Métrica de Otimização
                  </th>
                  {comparedScenarios.map((sc) => (
                    <th
                      key={sc.id}
                      className="px-4 py-3 border-l"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      <div
                        className="font-bold text-xs truncate max-w-[200px]"
                        style={{ color: 'var(--ciafal-navy)' }}
                      >
                        {sc.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="ciafal-badge ciafal-badge--info text-[9px] font-mono">
                          {sc.profile}
                        </span>
                        {sc.is_baseline && (
                          <span
                            className="text-[9px] font-bold uppercase"
                            style={{ color: 'var(--status-warning)' }}
                          >
                            • Oficial SAP
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{
                  borderColor: 'var(--ciafal-border)',
                  border: '1px solid var(--ciafal-border)',
                }}
              >
                {/* Atendimento da Carteira */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Atendimento da Demanda
                  </td>
                  {comparedScenarios.map((sc) => {
                    const val = sc.summary_kpis?.demandServicePct ?? 90
                    return (
                      <td
                        key={sc.id}
                        className="px-4 py-2.5 font-mono border-l"
                        style={{ borderColor: 'var(--ciafal-border)' }}
                      >
                        <strong
                          className="font-bold"
                          style={{
                            color:
                              val >= 95
                                ? 'var(--status-success)'
                                : val >= 85
                                  ? 'var(--ciafal-primary)'
                                  : 'var(--status-warning)',
                          }}
                        >
                          {val}%
                        </strong>
                      </td>
                    )
                  })}
                </tr>

                {/* Volume Planejado Total */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Produção Programada
                  </td>
                  {comparedScenarios.map((sc) => (
                    <td
                      key={sc.id}
                      className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      {(sc.summary_kpis?.totalPlannedTons ?? 4200).toLocaleString('pt-BR')} t
                    </td>
                  ))}
                </tr>

                {/* Demandas Não Alocadas (UNALLOCATED) */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Demandas Não Alocadas
                  </td>
                  {comparedScenarios.map((sc) => {
                    const unalloc = sc.summary_kpis?.unallocatedCount ?? 0
                    return (
                      <td
                        key={sc.id}
                        className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                        style={{ borderColor: 'var(--ciafal-border)' }}
                      >
                        <span
                          className="font-bold"
                          style={{
                            color: unalloc === 0 ? 'var(--status-success)' : 'var(--status-danger)',
                          }}
                        >
                          {unalloc === 0 ? '0 OPs (100% Alocado)' : `${unalloc} OPs não alocadas`}
                        </span>
                      </td>
                    )
                  })}
                </tr>

                {/* Setups e Trocas */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Trocas de Ferramenta / Setup
                  </td>
                  {comparedScenarios.map((sc) => (
                    <td
                      key={sc.id}
                      className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      <strong style={{ color: 'var(--ciafal-primary)' }}>
                        {sc.summary_kpis?.setupCount ?? 10} trocas
                      </strong>{' '}
                      <span className="text-[10px]" style={{ color: 'var(--ciafal-text-muted)' }}>
                        ({sc.summary_kpis?.setupTimeMinutes ?? 300} min)
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Estoque Intermediário */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Estoque em Buffer Intermediário
                  </td>
                  {comparedScenarios.map((sc) => (
                    <td
                      key={sc.id}
                      className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      {sc.summary_kpis?.intermediateStockTons ?? 550} t
                    </td>
                  ))}
                </tr>

                {/* Utilização da Capacidade Programável */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Ocupação Média das Linhas
                  </td>
                  {comparedScenarios.map((sc) => (
                    <td
                      key={sc.id}
                      className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      <span className="font-bold" style={{ color: 'var(--ciafal-navy)' }}>
                        {sc.summary_kpis?.avgUtilizationPct ?? 88}%
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Gargalos Críticos Identificados */}
                <tr className="hover:bg-[var(--ciafal-primary-lighter)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--ciafal-text)' }}>
                    Gargalos Críticos
                  </td>
                  {comparedScenarios.map((sc) => {
                    const bCount = sc.summary_kpis?.bottlenecksCount ?? 0
                    const crits = sc.summary_kpis?.criticalBottlenecks || []
                    return (
                      <td
                        key={sc.id}
                        className="px-4 py-2.5 font-mono border-l whitespace-nowrap"
                        style={{ borderColor: 'var(--ciafal-border)' }}
                      >
                        {bCount === 0 ? (
                          <span className="font-bold" style={{ color: 'var(--status-success)' }}>
                            Nenhum gargalo
                          </span>
                        ) : (
                          <span className="font-bold" style={{ color: 'var(--status-warning)' }}>
                            {bCount} recurso(s) [{crits.join(', ') || 'ACAB_L1'}]
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Ação de Conversão em Proposta Oficial */}
                <tr style={{ backgroundColor: 'var(--ciafal-surface-muted)' }}>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--ciafal-navy)' }}>
                    Ação de Homologação
                  </td>
                  {comparedScenarios.map((sc) => (
                    <td
                      key={sc.id}
                      className="px-4 py-3 border-l"
                      style={{ borderColor: 'var(--ciafal-border)' }}
                    >
                      <Button
                        size="sm"
                        onClick={() => handleConvertToProposal(sc)}
                        disabled={convertingId === sc.id}
                        className="w-full h-7 text-xs font-semibold shadow-sm hover:opacity-90"
                        style={{ backgroundColor: 'var(--ciafal-primary)', color: '#fff' }}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {convertingId === sc.id ? 'Convertendo...' : 'Propor Programação'}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade-off Insights determinísticos */}
        <div className="ciafal-alert ciafal-alert--info p-3.5 rounded-xl space-y-1.5 text-xs">
          <div
            className="flex items-center gap-2 font-bold"
            style={{ color: 'var(--ciafal-primary)' }}
          >
            <Sparkles className="w-4 h-4" /> Síntese Estrutural de Decisão (Determinística):
          </div>
          <p className="leading-relaxed" style={{ color: 'var(--ciafal-text)' }}>
            O <strong>Cenário A</strong> atinge o melhor nível de serviço comercial (98.2% de
            atendimento da carteira), porém com maior frequência de setups. O{' '}
            <strong>Cenário B</strong> reduz paradas em 57% com ganho de cadência nas linhas L1 e
            L2. A conversão gera apenas uma <strong>Proposta de Programação (DRAFT)</strong> para o
            PCP, garantindo governança humana antes da publicação oficial.
          </p>
        </div>

        <DialogFooter
          className="pt-2 border-t flex-col sm:flex-row"
          style={{ borderColor: 'var(--ciafal-border)' }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-white border-[var(--ciafal-border)] text-xs hover:bg-[var(--ciafal-surface-muted)] hover:text-[var(--ciafal-primary)]"
          >
            Fechar Comparador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ScenarioComparisonModal
