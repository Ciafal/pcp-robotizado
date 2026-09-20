import React, { useState, useEffect } from 'react'
import {
  Activity,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
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
import type { ProductionPosting } from '@/types/pcp-production'
import { formatQuantity, formatDateTimePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'

export const ProductionPostingsPage: React.FC = () => {
  const [postings, setPostings] = useState<ProductionPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusSapFilter, setStatusSapFilter] = useState('TODOS')
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listPostings(),
      ])
      setMesStatus(mes)
      setPostings(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReprocessPosting = async (posting: ProductionPosting) => {
    setReprocessingId(posting.id)
    try {
      await pcpProductionService.logAction({
        action: 'REPROCESS_SAP_POSTING',
        op_number: posting.op_number,
        description: `Reprocessamento manual de apontamento ZPPT010 (${posting.posting_code}) acionado pelo usuário.`,
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'CONTROLE_DE_APONTAMENTOS',
      })
      alert(
        `Apontamento ${posting.posting_code} encaminhado para fila de reprocessamento ZPPT010 do SAP ECC.`,
      )
      loadData()
    } finally {
      setReprocessingId(null)
    }
  }

  const filteredPostings = postings.filter((p) => {
    if (statusSapFilter !== 'TODOS' && p.status_sap !== statusSapFilter) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        p.op_number.toLowerCase().includes(term) ||
        p.posting_code.toLowerCase().includes(term) ||
        p.operator_name.toLowerCase().includes(term) ||
        (p.sap_document_number && p.sap_document_number.toLowerCase().includes(term)) ||
        (p.sap_message && p.sap_message.toLowerCase().includes(term))
      )
    }
    return true
  })

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Controle de Apontamentos (ZPPT010)
            </h1>
            <Badge className="bg-blue-700 text-white font-mono text-xs">INTEGRAÇÃO MES → SAP</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Status MES e Status SAP estritamente separados. Fila de integração e rastreabilidade
            ZPPT010.
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
            Atualizar Apontamentos
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Barra de Filtros Rápida */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, código de apontamento, operador, doc SAP..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          <div className="w-[200px]">
            <Select value={statusSapFilter} onValueChange={setStatusSapFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status Integração SAP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Status SAP: Todos</SelectItem>
                <SelectItem value="PROCESSADO_SAP">Processado SAP</SelectItem>
                <SelectItem value="REJEITADO_SAP">Rejeitado SAP</SelectItem>
                <SelectItem value="ENVIADO_SAP">Enviado SAP</SelectItem>
                <SelectItem value="AGUARDANDO_CORRECAO">Aguardando Correção</SelectItem>
                <SelectItem value="REPROCESSANDO">Reprocessando</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Total de Apontamentos: <strong>{filteredPostings.length}</strong>
        </div>
      </div>

      {/* Tabela de Apontamentos */}
      <div className="bg-white border rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Cód. Apontamento</th>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3">Centro / Linha</th>
                <th className="py-2.5 px-3">Operação</th>
                <th className="py-2.5 px-3 text-right">Qtd Apontada (t)</th>
                <th className="py-2.5 px-3">Operador</th>
                <th className="py-2.5 px-3 text-center">Origem Dado</th>
                <th className="py-2.5 px-3 text-center">Status MES</th>
                <th className="py-2.5 px-3 text-center">Status Integração SAP</th>
                <th className="py-2.5 px-3">Doc / Retorno SAP</th>
                <th className="py-2.5 px-3 text-center">Tentativas</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPostings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    Nenhum apontamento localizado para os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredPostings.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700">
                      {formatDatePTBR(p.posting_date)} {p.posting_time}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-900 whitespace-nowrap">
                      {p.posting_code}
                    </td>
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900 whitespace-nowrap">
                      {p.op_number}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                      {p.centro_code} / {p.linha_code}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {p.operation_code}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatQuantity(p.quantity_tons, 't')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                      {p.operator_name}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        {p.data_origin}
                      </Badge>
                    </td>
                    {/* Status MES e Status SAP estritamente separados */}
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          p.status_mes === 'VALIDADO_MES'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {p.status_mes}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          p.status_sap === 'PROCESSADO_SAP'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : p.status_sap === 'REJEITADO_SAP'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}
                      >
                        {p.status_sap}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      {p.sap_document_number && (
                        <div className="font-mono text-[11px] font-bold text-emerald-800">
                          Doc: {p.sap_document_number}
                        </div>
                      )}
                      <p
                        className="text-[11px] text-slate-600 truncate"
                        title={p.sap_message || ''}
                      >
                        {p.sap_message || '-'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700">
                      {p.retry_attempts}x
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.status_sap === 'REJEITADO_SAP' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprocessPosting(p)}
                          disabled={reprocessingId === p.id}
                          className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <RotateCcw
                            className={`w-3 h-3 mr-1 ${reprocessingId === p.id ? 'animate-spin' : ''}`}
                          />
                          Reprocessar
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Integrado</span>
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

export default ProductionPostingsPage
