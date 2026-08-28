import React, { useState } from 'react'
import {
  Calendar,
  Layers,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Sparkles,
  ChevronRight,
  Factory,
} from 'lucide-react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface MasterPlanningProps {
  initialHorizon?: 'ANUAL' | 'MENSAL' | 'SEMANAL' | 'anual' | 'mensal' | 'semanal'
}

export const MasterPlanningPage: React.FC<MasterPlanningProps> = ({
  initialHorizon = 'MENSAL',
}) => {
  const { filters, plantCapacityAnalysis, plants, lines } = useControlTower()
  const normalizedHorizon = initialHorizon.toLowerCase()
  const [horizon, setHorizon] = useState<string>(normalizedHorizon)

  return (
    <div className="space-y-6">
      {/* Header Planejamento Mestre */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/20 border border-[#004C97]/40 flex items-center justify-center text-[#3b82f6]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Planejamento Mestre de Produção (PMP)
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-sky-500/30 text-sky-400 bg-sky-950/20 font-mono"
              >
                Fluxo: Anual &rarr; Mensal &rarr; Semanal &rarr; Sequenciamento
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Planejamento integrado de capacidade, demanda, forecast, carteira e campanhas
              produtivas integradas ao SAP ECC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-xs font-mono">
            SAP ECC Integrado &bull; Base Oficial
          </Badge>
        </div>
      </div>

      {/* Tabs Multihorizonte */}
      <Tabs value={horizon} onValueChange={setHorizon} className="w-full space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <TabsTrigger
            value="anual"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            Plano Anual (Longo Prazo)
          </TabsTrigger>
          <TabsTrigger
            value="mensal"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            Plano Mensal (Médio Prazo)
          </TabsTrigger>
          <TabsTrigger
            value="semanal"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            Plano Semanal (Curto Prazo / Executivo)
          </TabsTrigger>
        </TabsList>

        {/* 1. Plano Anual */}
        <TabsContent value="anual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-slate-800 p-4 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                Capacidade Nominal Anual
              </span>
              <div className="text-3xl font-black text-white font-mono">180.000 t</div>
              <p className="text-[11px] text-slate-400">
                Referência técnica de 15.000 t/mês somadas.
              </p>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                Demanda & Forecast Consolidado
              </span>
              <div className="text-3xl font-black text-sky-400 font-mono">165.600 t</div>
              <p className="text-[11px] text-slate-400">
                Sazonalidade maior no Q2 e Q3 (construção e infraestrutura).
              </p>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                Perdas Estruturais por Mix
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono">-14.400 t</div>
              <p className="text-[11px] text-slate-400">
                Restrição por produtos pesados e campanhas especiais.
              </p>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white">
                Distribuição Mensal: Demanda vs Capacidade Programável Anual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                {[
                  'Jan',
                  'Fev',
                  'Mar',
                  'Abr',
                  'Mai',
                  'Jun',
                  'Jul',
                  'Ago',
                  'Set',
                  'Out',
                  'Nov',
                  'Dez',
                ].map((m, idx) => (
                  <div
                    key={m}
                    className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1"
                  >
                    <div className="text-slate-400 font-bold">{m}/26</div>
                    <div className="text-sky-400 font-bold">13.800 t</div>
                    <div className="text-[10px] text-slate-500">Ocup: 92%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Plano Mensal */}
        <TabsContent value="mensal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-white">
                  Balanço do Mês Vigente (Agosto/2026)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Capacidade Nominal Técnica:</span>
                  <span className="text-slate-200 font-bold">15.000 t</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Capacidade Programável pelo Mix:</span>
                  <span className="text-sky-400 font-bold">13.800 t</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Carteira Firme Alocada:</span>
                  <span className="text-emerald-400 font-bold">12.950 t</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Capacidade Comercial Livre:</span>
                  <span className="text-amber-400 font-bold">850 t</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-white">
                  Grandes Campanhas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-sky-400 font-bold">Campanha A1: Tubos SAE 1020</span>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Linha 1 &bull; 6.200 t alocadas
                    </p>
                  </div>
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                    Ativa
                  </Badge>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-sky-400 font-bold">Campanha B2: Perfis Retangulares</span>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Linha 2 &bull; 4.800 t alocadas
                    </p>
                  </div>
                  <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px]">
                    Programada
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Plano Semanal */}
        <TabsContent value="semanal" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-white">
                  Programação Macro Semanal &bull; Semana 35
                </CardTitle>
                <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px] font-mono">
                  Transição para Central de Sequenciamento
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-sky-400 font-bold">Segunda & Terça &bull; Linha 1</span>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Campanha Tubos Estruturais 50x50 &bull; 1.850 t &bull; Setup 35 min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-[#004C97] hover:bg-[#003d7a] text-white"
                    onClick={() => (window.location.href = '/pcp/sequenciamento/programacao')}
                  >
                    Ver Sequenciamento Fino &rarr;
                  </Button>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-sky-400 font-bold">Quarta & Quinta &bull; Linha 2</span>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Campanha Perfis 80x40 &bull; 1.250 t &bull; Setup 50 min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-[#004C97] hover:bg-[#003d7a] text-white"
                    onClick={() => (window.location.href = '/pcp/sequenciamento/programacao')}
                  >
                    Ver Sequenciamento Fino &rarr;
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
