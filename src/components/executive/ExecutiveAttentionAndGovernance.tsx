import React from 'react'
import { ModuleIntegrationStatus } from '@/types/executive-cockpit'
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
  Building,
  ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExecutiveAttentionAndGovernanceProps {
  modulesStatus: ModuleIntegrationStatus[]
  userRole?: string
  sourcesUsed: Array<{
    system: string
    module: string
    tableOrOrigin: string
    period: string
    updatedAt: string
    status: string
  }>
}

export const ExecutiveAttentionAndGovernanceProps: React.FC<
  ExecutiveAttentionAndGovernanceProps
> = ({ modulesStatus, userRole, sourcesUsed }) => {
  return (
    <div className="space-y-4">
      {/* Grid: Bloco 15 ("O que precisa da minha atenção hoje?") + Bloco 16 (Visão Diretoria) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 15 — "O que precisa da minha atenção hoje?" */}
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-gradient-to-r from-blue-50/60 to-white border-b border-blue-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#004C97]" />
                O que precisa da minha atenção hoje?
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Foco personalizado pelo seu perfil (
                <strong>{userRole || 'EXECUTIVE_VIEWER'}</strong>) e escopo de responsabilidade.
              </p>
            </div>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Personalizado</Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 space-y-1">
              <span className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                1. Alerta Crítico: Buffer Térmico L01 &rarr; L02 em 8,5 t
              </span>
              <p className="text-slate-700 text-[11px]">
                A Trefilação 02 corre risco de parada por desabastecimento nas próximas 4 horas se
                não houver transferência de tarugos.
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                2. Decisão Pendente: Reotimização da Grade CP-SAT
              </span>
              <p className="text-slate-700 text-[11px]">
                Cenário alternativo gerou +68,0 t de capacidade recuperada. Aguarda aprovação do
                Programador Master.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. Meta Batida: Atendimento OTIF de Clientes VIP
              </span>
              <p className="text-slate-600 text-[11px]">
                Linhas de Laminação e Corte atingiram 98,4% de pontualidade no despacho de produtos
                certificados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 16 — Visão Diretoria (Foco em Exceções e Decisões) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building className="w-4 h-4 text-[#004C97]" />
                Visão Diretoria (Exceções & Grandes Desvios)
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Foco estrito em grandes desvios de margem, risco de faturamento e decisões
                estratégicas.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700">
              Board Level
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Risco de Faturamento
                </span>
                <span className="text-base font-black text-rose-700">R$ 480.000</span>
                <span className="block text-[9px] text-slate-500">145,0 t em atraso potencial</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Capacidade Líquida
                </span>
                <span className="text-base font-black text-emerald-700">92,4%</span>
                <span className="block text-[9px] text-slate-500">4 de 4 plantas operacionais</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span>Risco de Não Atingimento da Meta Mensal:</span>
                <span className="font-bold text-amber-700">Médio (Prob: 64%)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span>Decisões Críticas Pendentes de Validação:</span>
                <span className="font-bold text-rose-700">2 ações</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloco 18: Rastreabilidade, Governança e Status de Integração dos Módulos do Hub */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#004C97]" />
              Governança de Dados, Fontes & Status dos Módulos do HUB
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Fase 1: Apenas o PCP Robotizado possui dados reais ativos. Os demais módulos estão
              preparados como interfaces futuras (sem dados inventados).
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            LGPD & Compliance
          </Badge>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3 text-xs">
          {/* Tabela de Módulos do HUB */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-2">Módulo do HUB CIAFAL</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Status da Integração</th>
                  <th className="py-2">Registros Reais</th>
                  <th className="py-2">Observação Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modulesStatus.map((m) => {
                  const isActive = m.status === 'ACTIVE_REAL_DATA'
                  return (
                    <tr key={m.moduleId} className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-900 flex items-center gap-2">
                        {isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                        {m.name}
                      </td>

                      <td className="py-2 text-slate-600">{m.category}</td>

                      <td className="py-2">
                        {isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                            Ativo &bull; Dados Reais
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-400 border-slate-300 text-[9px]"
                          >
                            Sem Dados (Preparado)
                          </Badge>
                        )}
                      </td>

                      <td className="py-2 font-mono font-bold text-slate-800">
                        {isActive ? `${m.recordsCount} itens` : '0'}
                      </td>

                      <td className="py-2 text-slate-500 text-[11px]">{m.description}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExecutiveAttentionAndGovernanceProps
