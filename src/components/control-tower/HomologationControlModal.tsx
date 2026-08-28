// Modal e Seletor do Modo de Homologação Funcional (Item 21)

import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  HOMOLOGATION_SCENARIOS,
  HOMOLOGATION_USER_PROFILES,
  HomologationScenario,
  HomologationUserProfile,
} from '@/data/homologation-scenarios'
import {
  TestTube,
  Play,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const HomologationControlModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const {
    activeScenarioId,
    setActiveScenarioId,
    setPerspective,
    setFilters,
    simulateOrderMove,
    applySimulationToScenario,
  } = useControlTower()

  const [selectedScenario, setSelectedScenario] = useState<HomologationScenario>(
    HOMOLOGATION_SCENARIOS[0],
  )
  const [selectedProfile, setSelectedProfile] = useState<HomologationUserProfile>(
    HOMOLOGATION_USER_PROFILES[0],
  )
  const [activeTab, setActiveTab] = useState<'SCENARIOS' | 'PROFILES' | 'SAP_ZPP003'>('SCENARIOS')

  if (!isOpen) return null

  const handleApplyScenario = (scenario: HomologationScenario) => {
    setSelectedScenario(scenario)
    if (scenario.targetLine !== 'ALL') {
      setFilters((prev) => ({ ...prev, lineCode: scenario.targetLine }))
    } else {
      setFilters((prev) => ({ ...prev, lineCode: 'ALL' }))
    }

    if (scenario.id === 'scen-2-parada-l1') {
      simulateOrderMove('ord-101', 'L1', '18:00')
    } else if (scenario.id === 'scen-4-mpl-insuficiente') {
      simulateOrderMove('ord-104', 'L2', '18:00')
    }

    onClose()
  }

  const handleApplyProfile = (profile: HomologationUserProfile) => {
    setSelectedProfile(profile)
    if (profile.roleKey === 'PRODUCTION_VIEWER') {
      setPerspective('CHAO_FABRICA')
    } else if (profile.roleKey === 'DIRECTOR' || profile.roleKey === 'AUDITOR') {
      setPerspective('GERAL')
    } else {
      setPerspective('PROGRAMADOR')
    }

    if (profile.accessibleLines[0] !== 'ALL') {
      setFilters((prev) => ({ ...prev, lineCode: profile.accessibleLines[0] }))
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-amber-500/80 text-slate-100 max-w-4xl max-h-[92vh] flex flex-col shadow-2xl p-0 overflow-hidden">
        {/* Banner do Ambiente de Homologação */}
        <div className="bg-gradient-to-r from-amber-600 via-[#004C97] to-amber-700 px-6 py-3 flex items-center justify-between text-white font-black text-xs uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-white animate-bounce" />
            <span>AMBIENTE CONTROLADO DE HOMOLOGAÇÃO FUNCIONAL CIAFAL (v0.0.5)</span>
          </div>
          <Badge className="bg-black text-amber-300 border border-amber-400 font-mono text-[10px]">
            DEMONSTRAÇÃO / SEM IMPACTO PRODUTIVO
          </Badge>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Painel de Configuração de Cenários & Perfis de Homologação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Alterne rapidamente entre os 8 cenários industriais pré-construídos e perfis de teste
              para verificar a propagação de impacto, alertas, Gantt e esteira de aprovação.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 p-1">
              <TabsTrigger
                value="SCENARIOS"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
              >
                8 Cenários de Teste ({HOMOLOGATION_SCENARIOS.length})
              </TabsTrigger>
              <TabsTrigger
                value="PROFILES"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
              >
                Perfis de Usuário ({HOMOLOGATION_USER_PROFILES.length})
              </TabsTrigger>
              <TabsTrigger
                value="SAP_ZPP003"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
              >
                Contratos SAP & ZPP003
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: 8 CENÁRIOS */}
            <TabsContent value="SCENARIOS" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HOMOLOGATION_SCENARIOS.map((scen) => {
                  const isSelected = selectedScenario.id === scen.id
                  return (
                    <div
                      key={scen.id}
                      onClick={() => setSelectedScenario(scen)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-blue-950/40 border-[#004C97] shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">
                            {scen.code}
                          </span>
                          <span className="font-bold text-white text-xs">{scen.title}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-700 text-slate-400"
                        >
                          Linha: {scen.targetLine}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">{scen.shortDesc}</p>

                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800 text-[10px] text-slate-400 space-y-1">
                        <div>
                          <strong>Resultado Esperado:</strong> {scen.expectedOutcome}
                        </div>
                        <div className="flex items-center gap-3 pt-1 text-cyan-300 font-mono">
                          <span>Aderência: {scen.kpis.adherencePct}%</span>
                          <span>Atrasos: {scen.kpis.delaysCount}</span>
                          <span>Gargalos: {scen.kpis.activeBottlenecks}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApplyScenario(scen)
                          }}
                          className="h-7 text-xs bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1"
                        >
                          <Play className="w-3 h-3 fill-white" /> Carregar Cenário
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* ABA 2: PERFIS DE USUÁRIO */}
            <TabsContent value="PROFILES" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HOMOLOGATION_USER_PROFILES.map((prof) => {
                  const isSelected = selectedProfile.id === prof.id
                  return (
                    <div
                      key={prof.id}
                      onClick={() => setSelectedProfile(prof)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-blue-950/40 border-[#004C97] shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-xs block">{prof.name}</span>
                          <span className="text-[11px] text-cyan-300 font-medium">
                            {prof.roleName} ({prof.roleKey})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-700 text-slate-400 font-mono"
                        >
                          {prof.accessibleLines.join(', ')}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-300">{prof.description}</p>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950/60 p-2 rounded border border-slate-800">
                        <div className={prof.canSimulate ? 'text-emerald-400' : 'text-slate-500'}>
                          &bull; Simulação:{' '}
                          <strong>{prof.canSimulate ? 'PERMITIDO' : 'NEGADO'}</strong>
                        </div>
                        <div className={prof.canApprovePCP ? 'text-emerald-400' : 'text-slate-500'}>
                          &bull; Fase 1 PCP:{' '}
                          <strong>{prof.canApprovePCP ? 'PERMITIDO' : 'NEGADO'}</strong>
                        </div>
                        <div
                          className={prof.canApproveManager ? 'text-emerald-400' : 'text-slate-500'}
                        >
                          &bull; Fase 2 Gestor:{' '}
                          <strong>{prof.canApproveManager ? 'PERMITIDO' : 'NEGADO'}</strong>
                        </div>
                        <div className={prof.canEditMaster ? 'text-emerald-400' : 'text-slate-500'}>
                          &bull; Ficha Mestre:{' '}
                          <strong>{prof.canEditMaster ? 'PERMITIDO' : 'NEGADO'}</strong>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApplyProfile(prof)
                          }}
                          className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold gap-1"
                        >
                          <UserCheck className="w-3 h-3 text-cyan-400" /> Simular Papel
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* ABA 3: CONTRATOS SAP & ZPP003 */}
            <TabsContent value="SAP_ZPP003" className="space-y-3 pt-3">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Camada Adaptadora SAP ZPP003
                  (Preparada)
                </h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Conforme a regra estrutural da Central CIAFAL:{' '}
                  <strong>PARADAS EXTRAORDINÁRIAS</strong> não são cadastradas manualmente pela
                  Ficha Mestre. A fonte autoritativa é o módulo de apontamentos de manutenção e chão
                  de fábrica <strong>SAP ZPP003</strong>.
                </p>

                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                      <tr>
                        <th className="p-2">Campo SAP</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Origem</th>
                        <th className="p-2">Uso na Central</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      <tr>
                        <td className="p-2 font-mono text-cyan-300">ZID_PARADA</td>
                        <td className="p-2 font-mono">CHAR(20)</td>
                        <td className="p-2">ZPP003</td>
                        <td className="p-2">ID único do evento de parada</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-cyan-300">ARBPL</td>
                        <td className="p-2 font-mono">CHAR(8)</td>
                        <td className="p-2">CRHD</td>
                        <td className="p-2">Centro de trabalho / Linha parada</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-cyan-300">CATEGORIA</td>
                        <td className="p-2 font-mono">CHAR(15)</td>
                        <td className="p-2">ZPP003</td>
                        <td className="p-2">MECANICA, ELETRICA, FALTA_MP, SETUP</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-cyan-300">DURACAO_MIN</td>
                        <td className="p-2 font-mono">INT4</td>
                        <td className="p-2">ZPP003</td>
                        <td className="p-2">Cálculo de delta de atraso e recálculo do Gantt</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-200">
                    Tratamento de Exceções Ativo:
                  </span>
                  <p>
                    Dados inválidos do SAP (capacidade zero, data de término anterior à de início,
                    linha desconhecida) geram alerta técnico com isolamento de falha sem quebrar a
                    interface.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Modo Homologação Ativo &bull; Dados em memória isolados
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-bold"
          >
            Concluir & Visualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
