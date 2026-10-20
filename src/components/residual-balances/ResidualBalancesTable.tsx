import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ResidualBalanceItem } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import {
  Eye,
  PlayCircle,
  FileEdit,
  CheckCircle2,
  History,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react'

interface ResidualBalancesTableProps {
  items: ResidualBalanceItem[]
  loading?: boolean
  onViewDetail: (item: ResidualBalanceItem) => void
  onStartTreatment: (item: ResidualBalanceItem) => void
  onRegisterAction: (item: ResidualBalanceItem) => void
  onRegularize: (item: ResidualBalanceItem) => void
  onViewHistory: (item: ResidualBalanceItem) => void
}

export const ResidualBalancesTable: React.FC<ResidualBalancesTableProps> = ({
  items,
  loading = false,
  onViewDetail,
  onStartTreatment,
  onRegisterAction,
  onRegularize,
  onViewHistory,
}) => {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderStatusBadge = (status: ResidualBalanceItem['status']) => {
    switch (status) {
      case 'ACAO_NECESSARIA':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Ação Necessária
          </Badge>
        )
      case 'SALDO_RESIDUAL_IDENTIFICADO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Residual Identificado
          </Badge>
        )
      case 'EM_TRATAMENTO':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 border-sky-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Em Tratamento
          </Badge>
        )
      case 'REGULARIZADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Regularizado
          </Badge>
        )
      case 'REGULARIZADO_AUTOMATICO':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 font-semibold flex items-center gap-1 text-[11px]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            Regul. Automático
          </Badge>
        )
      case 'DENTRO_PARAMETRO':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
          >
            Dentro do Parâmetro
          </Badge>
        )
    }
  }

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '-'
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return '-'
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-800">
          Relação Detalhada dos Saldos ({items.length})
        </CardTitle>
        <span className="text-xs text-slate-500">Monitoramento contínuo por lote e depósito</span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 select-none whitespace-nowrap">
            <tr>
              <th className="py-2.5 px-3">Depósito</th>
              <th className="py-2.5 px-3">Material</th>
              <th className="py-2.5 px-3">Lote</th>
              <th className="py-2.5 px-3 text-right">Qtd Atual</th>
              <th className="py-2.5 px-3 text-right">Limite</th>
              <th className="py-2.5 px-3 text-right">Diferença</th>
              <th className="py-2.5 px-3">Identificação</th>
              <th className="py-2.5 px-3">Tempo Residual</th>
              <th className="py-2.5 px-3">Regra Aplicada</th>
              <th className="py-2.5 px-3">Ação Recomendada</th>
              <th className="py-2.5 px-3">Responsável</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Última Atualização</th>
              <th className="py-2.5 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-400">
                  Nenhum saldo residual encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const isRegularized =
                  it.status === 'REGULARIZADO' || it.status === 'REGULARIZADO_AUTOMATICO'
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      it.status === 'ACAO_NECESSARIA' ? 'bg-red-50/20' : ''
                    }`}
                  >
                    {/* Depósito */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{it.deposito}</span>
                      {it.deposito_nome && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {it.deposito_nome}
                        </div>
                      )}
                    </td>

                    {/* Material */}
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{it.material_codigo}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {it.material_descricao}
                      </div>
                    </td>

                    {/* Lote */}
                    <td className="py-2 px-3 font-mono font-medium whitespace-nowrap text-slate-800">
                      {it.lote}
                    </td>

                    {/* Quantidade Atual */}
                    <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberPTBR(it.quantidade_atual, 0, 3)} {it.unidade_medida}
                    </td>

                    {/* Limite Parametrizado */}
                    <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                      {it.limite_parametrizado != null
                        ? `${formatNumberPTBR(it.limite_parametrizado, 0, 2)} ${it.unidade_medida}`
                        : '-'}
                    </td>

                    {/* Diferença */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {it.diferenca != null ? (
                        <span
                          className={`font-semibold ${
                            it.diferenca > 0 ? 'text-red-700' : 'text-slate-700'
                          }`}
                        >
                          {it.diferenca > 0 ? '-' : '+'}
                          {formatNumberPTBR(Math.abs(it.diferenca), 0, 2)} {it.unidade_medida}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Data Identificação */}
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTimeBR(it.data_identificacao)}
                    </td>

                    {/* Tempo como Saldo Residual */}
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700">
                      {it.tempo_como_residual_display || '-'}
                    </td>

                    {/* Regra Aplicada */}
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-700">
                      {it.regra_aplicada_descricao ? (
                        <span title={it.regra_aplicada_descricao}>
                          {it.regra_aplicada_descricao}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Ação Recomendada */}
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-800 font-medium">
                      {it.acao_recomendada ? (
                        <span title={it.acao_recomendada}>{it.acao_recomendada}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                      {it.responsavel_acao || '-'}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 whitespace-nowrap">{renderStatusBadge(it.status)}</td>

                    {/* Última Atualização */}
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDateTimeBR(it.ultima_atualizacao)}
                    </td>

                    {/* Coluna Ações (TODAS FUNCIONAIS) */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetail(it)}
                          title="Visualizar Detalhes"
                          className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Iniciar Tratamento */}
                        {!isRegularized && it.status !== 'EM_TRATAMENTO' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartTreatment(it)}
                            title="Iniciar Tratamento"
                            className="h-7 w-7 p-0 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Registrar Ação */}
                        {!isRegularized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegisterAction(it)}
                            title="Registrar Ação"
                            className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Regularizar */}
                        {!isRegularized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegularize(it)}
                            title="Regularizar Saldo Residual"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Histórico */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewHistory(it)}
                          title="Histórico de Ações"
                          className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
