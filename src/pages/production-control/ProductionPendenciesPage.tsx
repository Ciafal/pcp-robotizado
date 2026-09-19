import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { pcpProductionService, type MESConnectionStatus } from '@/services/pcp-production-service'
import type { ProductionClosingPendency } from '@/types/pcp-production'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

export const ProductionPendenciesPage: React.FC = () => {
  const [pendencies, setPendencies] = useState<ProductionClosingPendency[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [criticalityFilter, setCriticalityFilter] = useState('TODAS')
  const [searchTerm, setSearchTerm] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listPendencies(),
      ])
      setMesStatus(mes)
      setPendencies(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleResolvePendency = async (pendency: ProductionClosingPendency) => {
    const reason = window.prompt(
      `Justificativa ou ação corretiva para a pendência [${pendency.pendency_code}]:`,
      'Conciliação realizada e validada tecnicamente pelo PCP.',
    )
    if (!reason || !reason.trim()) return

    setResolvingId(pendency.id)
    try {
      await pcpProductionService.logAction({
        action: 'RESOLVE_CLOSING_PENDENCY',
        op_number: pendency.op_number,
        description: `Pendência ${pendency.pendency_code} tratada: ${reason.trim()}`,
        previous_value: pendency.resolution_status,
        new_value: 'CONCILIADO',
        reason: reason.trim(),
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'PENDENCIAS_DE_FECHAMENTO',
      })

      // Cria alerta de conciliação
      await pcpProductionService.createCentralAlert({
        title: `Pendência Tratada: OP ${pendency.op_number}`,
        severity: 'info',
        message: `A pendência de fechamento ${pendency.problem_category} foi conciliada pelo usuário.`,
        category: 'Fechamento de Produção',
        line_code: pendency.linha_code,
      })

      alert(`Pendência ${pendency.pendency_code} conciliada com sucesso! Log auditável registrado.`)
      loadData()
    } finally {
      setResolvingId(null)
    }
  }

  const filteredPendencies = pendencies.filter((p) => {
    if (criticalityFilter !== 'TODAS' && p.criticality !== criticalityFilter) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        p.op_number.toLowerCase().includes(term) ||
        p.pendency_code.toLowerCase().includes(term) ||
        p.problem_description.toLowerCase().includes(term) ||
        p.responsible_role_or_user.toLowerCase().includes(term) ||
        p.centro_code.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Contadores por Criticidade
  const countCritica = pendencies.filter((p) => p.criticality === 'CRITICA').length
  const countAlta = pendencies.filter((p) => p.criticality === 'ALTA').length
  const countMedia = pendencies.filter((p) => p.criticality === 'MEDIA').length
  const countBaixa = pendencies.filter((p) => p.criticality === 'BAIXA').length

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pendências de Fechamento de OP
            </h1>
            <Badge className="bg-rose-700 text-white font-mono text-xs">GESTÃO DE EXCEÇÕES</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Detecção automática de OPs terminadas fisicamente no MES mas não aptas ao encerramento
            técnico no SAP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Pendências
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Cards de Criticidade Filtráveis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() =>
            setCriticalityFilter(criticalityFilter === 'CRITICA' ? 'TODAS' : 'CRITICA')
          }
          className={`border rounded-lg p-3 text-left transition-all ${
            criticalityFilter === 'CRITICA'
              ? 'bg-rose-100 border-rose-500 shadow-sm'
              : 'bg-white hover:bg-rose-50/50'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-bold text-rose-900">
            <span>CRÍTICA</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{countCritica}</div>
          <span className="text-[11px] text-slate-500">Bloqueio SAP ou fiscal</span>
        </button>

        <button
          type="button"
          onClick={() => setCriticalityFilter(criticalityFilter === 'ALTA' ? 'TODAS' : 'ALTA')}
          className={`border rounded-lg p-3 text-left transition-all ${
            criticalityFilter === 'ALTA'
              ? 'bg-amber-100 border-amber-500 shadow-sm'
              : 'bg-white hover:bg-amber-50/50'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-bold text-amber-900">
            <span>ALTA</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{countAlta}</div>
          <span className="text-[11px] text-slate-500">Saldo residual / rendimento</span>
        </button>

        <button
          type="button"
          onClick={() => setCriticalityFilter(criticalityFilter === 'MEDIA' ? 'TODAS' : 'MEDIA')}
          className={`border rounded-lg p-3 text-left transition-all ${
            criticalityFilter === 'MEDIA'
              ? 'bg-blue-100 border-blue-500 shadow-sm'
              : 'bg-white hover:bg-blue-50/50'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-bold text-blue-900">
            <span>MÉDIA</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">{countMedia}</div>
          <span className="text-[11px] text-slate-500">Sobreprodução / sequência</span>
        </button>

        <button
          type="button"
          onClick={() => setCriticalityFilter(criticalityFilter === 'BAIXA' ? 'TODAS' : 'BAIXA')}
          className={`border rounded-lg p-3 text-left transition-all ${
            criticalityFilter === 'BAIXA'
              ? 'bg-slate-200 border-slate-500 shadow-sm'
              : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span>BAIXA</span>
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-700 mt-1">{countBaixa}</div>
          <span className="text-[11px] text-slate-500">Ajustes documentais</span>
        </button>
      </div>

      {/* Regra de Governança do Fechamento */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-950">
        <h4 className="font-bold flex items-center gap-1.5 mb-1">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          Protocolo Estrito de Fechamento Industrial CIAFAL
        </h4>
        <p className="leading-relaxed">
          Nenhuma OP pode ser encerrada tecnicamente (status TECO no SAP) se houver qualquer
          pendência ativa no checklist de 10 etapas (produção concluída, apontamentos completos, MP
          validada, quantidades conciliadas, SAP integrado, sem erro de movimento contábil, paradas
          encerradas, rendimento validado, sem saldo incoerente e sequência operacional atendida).
        </p>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[280px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, problema, responsável, centro..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          <div className="w-[180px]">
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Criticidade: Todas</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Média</SelectItem>
                <SelectItem value="BAIXA">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Pendências Exibidas: <strong>{filteredPendencies.length}</strong>
        </div>
      </div>

      {/* Tabela de Pendências */}
      <div className="bg-white border rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">Problema Identificado</th>
                <th className="py-2.5 px-3">Impacto no Negócio</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3 text-center">Tempo Pendente</th>
                <th className="py-2.5 px-3 text-center">Criticidade</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Ação Requerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPendencies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhuma pendência de fechamento encontrada para os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredPendencies.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold font-mono text-blue-900 whitespace-nowrap">
                      {p.op_number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{p.centro_code}</td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="font-semibold text-slate-900">{p.problem_category}</div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {p.problem_description}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-[200px] text-[11px]">
                      {p.business_impact || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium whitespace-nowrap">
                      {p.responsible_role_or_user}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {p.pending_duration_text}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          p.criticality === 'CRITICA'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : p.criticality === 'ALTA'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}
                      >
                        {p.criticality}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        {p.resolution_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.resolution_status === 'PENDENTE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolvePendency(p)}
                          disabled={resolvingId === p.id}
                          className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Tratar / Conciliar
                        </Button>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-semibold">Tratado</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
