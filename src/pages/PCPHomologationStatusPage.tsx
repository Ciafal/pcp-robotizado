import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
  Database,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { usePCPData } from '@/hooks/usePCPData'
import { Link } from 'react-router-dom'

interface HomologationModuleStatus {
  moduleName: string
  category: 'CORE' | 'SUPRIMENTOS' | 'OPERACAO' | 'TELEMETRIA'
  currentStatus: 'HOMOLOGADO_QAS' | 'AGUARDANDO_INTEGRACAO' | 'HOMOLOGADO_PARCIAL'
  currentSource: string
  targetGoLiveSource: string
  notes: string
  readinessPct: number
}

export const PCPHomologationStatusPage: React.FC = () => {
  const { data, loading, refreshData, currentUpload } = usePCPData()

  const modules: HomologationModuleStatus[] = [
    {
      moduleName: 'Carteira Comercial (ZSD28C)',
      category: 'CORE',
      currentStatus: 'HOMOLOGADO_QAS',
      currentSource: 'Carga Controlada Excel / QAS (Transação ZSD28C)',
      targetGoLiveSource: 'SAP ECC Online RFC / BAPI_SALESORDER_GETLIST',
      notes:
        'Fluxo 100% implementado com snapshot, versionamento, idempotência e paridade funcional 1:1.',
      readinessPct: 100,
    },
    {
      moduleName: 'Programação Semanal & Sequenciador',
      category: 'OPERACAO',
      currentStatus: 'HOMOLOGADO_QAS',
      currentSource: 'Motor PCP + Heurística CP-SAT CIAFAL',
      targetGoLiveSource: 'SAP PP (Ordens de Produção / Planejamento)',
      notes:
        'Geração determinística de sequenciamento, 2 fases de aprovação, imutabilidade de versões publicadas.',
      readinessPct: 100,
    },
    {
      moduleName: 'Gestão de Matéria-Prima & Projeções',
      category: 'SUPRIMENTOS',
      currentStatus: 'HOMOLOGADO_QAS',
      currentSource: 'Motor MP Central + Fórmulas Legadas Homologadas',
      targetGoLiveSource: 'SAP MM / WMS / MB52 Online',
      notes:
        'Projeções de ruptura diária, saldo por destino, pools e planos de corte 100% integrados à carteira.',
      readinessPct: 95,
    },
    {
      moduleName: 'Oficina de Cilindros & Matriz de Setup',
      category: 'OPERACAO',
      currentStatus: 'HOMOLOGADO_QAS',
      currentSource: 'Matriz Central de Setup + Ordem Adjacente',
      targetGoLiveSource: 'Módulo de Ferramentaria / MES',
      notes: 'Geração automática de demandas de montagem e prontidão de ferramentas para L1 e L2.',
      readinessPct: 95,
    },
    {
      moduleName: 'Estoque Físico e Depósitos',
      category: 'SUPRIMENTOS',
      currentStatus: 'AGUARDANDO_INTEGRACAO',
      currentSource: 'Carga ZSD28C / Snapshot QAS',
      targetGoLiveSource: 'SAP MB52 / WMS Realtime',
      notes: 'Aguardando liberação de endpoint RFC SAP MB52 na infraestrutura de TI.',
      readinessPct: 40,
    },
    {
      moduleName: 'Apontamento MES (Chão de Fábrica)',
      category: 'TELEMETRIA',
      currentStatus: 'AGUARDANDO_INTEGRACAO',
      currentSource: 'Simulador Determinístico / Fila de Eventos',
      targetGoLiveSource: 'MES Indústria 4.0 / OPC-UA / MQTT',
      notes:
        'Disparo de eventos ativo (PROGRAMACAO_PUBLICADA); aguardando receptor MES no chão de fábrica.',
      readinessPct: 35,
    },
    {
      moduleName: 'AOM (Automação Operacional de Máquinas)',
      category: 'TELEMETRIA',
      currentStatus: 'AGUARDANDO_INTEGRACAO',
      currentSource: 'Aguardando Conexão',
      targetGoLiveSource: 'AOM / Sensores CLP Rockwell/Siemens',
      notes:
        'Cockpit e relatórios exibem explicitamente "Aguardando integração MES/AOM" sem dados fictícios.',
      readinessPct: 20,
    },
    {
      moduleName: 'WMS (Expedição e Armazém de Acabados)',
      category: 'SUPRIMENTOS',
      currentStatus: 'AGUARDANDO_INTEGRACAO',
      currentSource: 'Carteira ZSD28C (Estoque Acabado)',
      targetGoLiveSource: 'WMS SAP / Leitor Código de Barras',
      notes: 'Campos preparados para absorver saldos por endereço físico sem retrabalho no PCP.',
      readinessPct: 30,
    },
  ]

  const getStatusBadge = (status: HomologationModuleStatus['currentStatus']) => {
    switch (status) {
      case 'HOMOLOGADO_QAS':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> HOMOLOGADO QAS
          </Badge>
        )
      case 'HOMOLOGADO_PARCIAL':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" /> EM VALIDAÇÃO
          </Badge>
        )
      case 'AGUARDANDO_INTEGRACAO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> AGUARDANDO INTEGRAÇÃO
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Status de Homologação PCP Robotizado
              </h1>
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                MATRIZ DE GO-LIVE
              </Badge>
              <Badge
                variant="outline"
                className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]"
              >
                AMBIENTE: HOMOLOGAÇÃO
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Painel transparente de prontidão dos módulos para transição de Cargas QAS para
              RFCs/APIs de Produção.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshData(true)}
            disabled={loading}
            className="text-xs h-9 border-slate-300 gap-1.5 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Recarregar Status'}
          </Button>

          <Link to="/pcp/qualidade-dados">
            <Button
              size="sm"
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-9 gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Qualidade dos Dados
            </Button>
          </Link>
        </div>
      </div>

      {/* Diretriz de Transição Transparente */}
      <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-[#004C97]">
          <ShieldCheck className="w-4 h-4 text-[#004C97]" /> Diretriz de Arquitetura para Go-Live
          SAP:
        </div>
        <p className="text-slate-700 leading-relaxed">
          O PCP Robotizado foi desenhado sobre a{' '}
          <strong>Camada de Dados Central (PCP Data Layer)</strong>. Quando os conectores SAP RFC
          (ZSD28C, MB52, BAPI) e MES/AOM forem liberados em produção, basta substituir os
          adaptadores de carga controlada pelos adaptadores RFC/API, sem necessidade de redesenhar a
          lógica de sequenciamento, regras de setup, projeções de matéria-prima ou interfaces
          visuais.
        </p>
      </div>

      {/* Matriz de Módulos */}
      <div className="grid grid-cols-1 gap-3">
        {modules.map((mod, idx) => (
          <Card
            key={idx}
            className="bg-white border-slate-200 shadow-xs hover:border-blue-200 transition-colors"
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1 md:max-w-md">
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-slate-900">{mod.moduleName}</strong>
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-mono text-slate-500"
                  >
                    {mod.category}
                  </Badge>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{mod.notes}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 md:max-w-lg text-[11px]">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">
                    Fonte Atual (QAS)
                  </span>
                  <span className="text-slate-800 font-medium">{mod.currentSource}</span>
                </div>
                <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                  <span className="text-[9px] uppercase text-[#004C97] font-bold block">
                    Destino Go-Live (PRD)
                  </span>
                  <span className="text-slate-800 font-medium">{mod.targetGoLiveSource}</span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                {getStatusBadge(mod.currentStatus)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default PCPHomologationStatusPage
