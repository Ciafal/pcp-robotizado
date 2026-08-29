import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPApplicationAuditHistory } from '@/types/mp-optimization'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { History, Search, ShieldCheck, RefreshCw, Filter, ArrowRight } from 'lucide-react'

export const MPAuditHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<MPApplicationAuditHistory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await mpOptimizationService.getAuditHistory()
      setHistory(data)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = history.filter((h) => {
    return (
      (h.block_number && h.block_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.original_application &&
        h.original_application.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.new_application && h.new_application.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.user_name && h.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  return (
    <MPModuleLayout currentStep={12}>
      {/* Header com Regras de Auditoria ZPPT058 / ZMM029 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-4 h-4 text-[#004C97]" />
              Auditoria de Alterações de Aplicação (ZPPT058 &bull; ZMM029 &bull; Versionamento
              Imutável)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Centro &bull; Bloco &bull; Corrida &bull; Aplicação Original &bull; Nova Aplicação
              &bull; Usuário/Matrícula &bull; Data/Hora &bull; Motivo SAP
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
            Atualizar Auditoria
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Bloco, Aplicação, Matrícula..."
            className="pl-9 h-8 text-xs bg-white border-slate-300"
          />
        </div>
      </div>

      {/* Tabela de Eventos Auditoriais */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {filtered.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Nenhum registro de modificação dimensional ou alteração ZPP86 encontrado no histórico. Todos os eventos gerados no HUB ou no SAP são consolidados aqui de forma inalterável."
            sapTransaction="ZPPT058 / ZMM029"
            onRefresh={loadData}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Data / Hora</th>
                  <th className="p-2.5">Centro</th>
                  <th className="p-2.5">Nº Bloco / Corrida</th>
                  <th className="p-2.5">Aplicação Original</th>
                  <th className="p-2.5">Nova Aplicação</th>
                  <th className="p-2.5">Matrícula / Usuário</th>
                  <th className="p-2.5">Motivo SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(h.event_timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{h.center_code}</td>
                    <td className="p-2.5 font-bold text-[#004C97]">
                      {h.block_number} {h.heat_number ? `(${h.heat_number})` : ''}
                    </td>
                    <td className="p-2.5 font-bold text-slate-600">
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {h.original_application}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-bold text-emerald-800 flex items-center gap-1 font-sans">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                      {h.new_application}
                    </td>
                    <td className="p-2.5 text-slate-700">
                      <span className="font-bold">{h.user_registration_matricula}</span> (
                      {h.user_name})
                    </td>
                    <td
                      className="p-2.5 text-slate-600 max-w-xs truncate"
                      title={h.reason_description}
                    >
                      {h.reason_description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
