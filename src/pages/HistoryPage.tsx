import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, Clock, FileCheck, User, ShieldCheck, CheckCircle2 } from 'lucide-react'

export const HistoryPage: React.FC = () => {
  const { versionHistory, filters, setIsVersionModalOpen } = useControlTower()

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      <ControlTowerHeader
        title="Histórico & Versionamento de Programação"
        subtitle="Trilha de auditoria das publicações e esteira de homologação humana em 2 fases (PCP e Gestão da Linha)."
        breadcrumbSubmodule="Histórico e Versões"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">
            Versão Oficial Ativa
          </span>
          <div className="text-2xl font-black text-cyan-300 font-mono mt-1">v2.8 (Homologada)</div>
          <p className="text-xs text-slate-400 mt-1">Publicada e em execução no SAP ECC ZPP003.</p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Esteira de 2 Fases</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            Ativa & Auditável
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fase 1 (PCP) &rarr; Fase 2 (Gestor da Linha).
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase">
            Total de Versões Registradas
          </span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {versionHistory.length} Versões
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Histórico imutável de reprogramações e simulações.
          </p>
        </Card>
      </div>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader className="p-4 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Linha do Tempo de Publicações de Sequenciamento
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Registros ordenados cronologicamente com justificativas técnicas e assinaturas
              digitais.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsVersionModalOpen(true)}
            className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200"
          >
            Abrir Comparador de Versões
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {versionHistory.map((item) => {
            const isCurrent = item.status === 'CURRENT'
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  isCurrent
                    ? 'bg-purple-950/20 border-purple-800/80'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-cyan-300">
                      {item.version}
                    </span>
                    <Badge
                      className={
                        isCurrent
                          ? 'bg-[#004C97] text-white text-[10px]'
                          : 'bg-slate-800 text-slate-400 border-slate-700 text-[10px]'
                      }
                    >
                      {item.status === 'CURRENT' ? '● Em Execução' : 'Arquivada'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-300"
                    >
                      Planta: {item.plantCode} &bull; Linha: {item.lineCode}
                    </Badge>
                  </div>
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Publicado às {item.publishedAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800/60 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Autoria e Liberação Técnica (PCP):
                    </span>
                    <strong className="text-slate-200">{item.author}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Homologação Operacional (Gestão):
                    </span>
                    <strong className="text-emerald-400">{item.approver}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-400 font-semibold shrink-0">Justificativa:</span>
                    <span className="italic text-slate-300">&quot;{item.reason}&quot;</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Impacto:{' '}
                    <strong className="text-white">{item.changesCount} ordens reprogramadas</strong>{' '}
                    ({item.deltaTons > 0 ? `+${item.deltaTons}` : item.deltaTons} t)
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
export default HistoryPage
