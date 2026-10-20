import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { DepositResidualSummary } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import { CheckCircle2, AlertTriangle, AlertCircle, Warehouse, ArrowRight } from 'lucide-react'

interface DepositStatusTableProps {
  summaries: DepositResidualSummary[]
  selectedDeposit?: string
  onSelectDeposit: (depositCode: string) => void
  loading?: boolean
}

export const DepositStatusTable: React.FC<DepositStatusTableProps> = ({
  summaries,
  selectedDeposit,
  onSelectDeposit,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-sm font-bold text-slate-800">Status dos Depósitos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderStatusBadge = (status: DepositResidualSummary['status_deposito']) => {
    switch (status) {
      case 'VERMELHO':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Ação Exigida
          </Badge>
        )
      case 'AMARELO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 font-semibold flex items-center gap-1 text-[11px]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Sob Tolerância
          </Badge>
        )
      case 'VERDE':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold flex items-center gap-1 text-[11px]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sem Crítico
          </Badge>
        )
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-blue-700" />
          <CardTitle className="text-sm font-bold text-slate-800">
            Status dos Depósitos com Residuais ({summaries.length})
          </CardTitle>
        </div>
        <span className="text-xs text-slate-500">
          Clique no depósito para filtrar a tabela detalhada
        </span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200 select-none">
            <tr>
              <th className="py-2 px-3">Depósito</th>
              <th className="py-2 px-3 text-center">Materiais</th>
              <th className="py-2 px-3 text-center">Lotes</th>
              <th className="py-2 px-3 text-right">Volume Residual</th>
              <th className="py-2 px-3 text-center">Ações Necessárias</th>
              <th className="py-2 px-3 text-center">Em Tratamento</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  Nenhum depósito com saldo residual encontrado.
                </td>
              </tr>
            ) : (
              summaries.map((dep) => {
                const isSelected = selectedDeposit?.toUpperCase() === dep.deposito.toUpperCase()
                return (
                  <tr
                    key={dep.deposito}
                    onClick={() => onSelectDeposit(dep.deposito)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/60 ${
                      isSelected ? 'bg-blue-50/80 font-medium' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{dep.deposito}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {dep.deposito_nome}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center font-medium">{dep.total_materiais}</td>
                    <td className="py-2 px-3 text-center font-medium">{dep.total_lotes}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900">
                      {formatNumberPTBR(dep.volume_residual, 0, 2)} {dep.unidade_medida}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {dep.acoes_necessarias > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          {dep.acoes_necessarias}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {dep.em_tratamento > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                          {dep.em_tratamento}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {renderStatusBadge(dep.status_deposito)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold">
                        Filtrar <ArrowRight className="w-3.5 h-3.5" />
                      </span>
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
