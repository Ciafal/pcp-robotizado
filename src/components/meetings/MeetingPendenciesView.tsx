import React, { useState, useEffect } from 'react'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Filter,
  Search,
  Building,
  CalendarDays,
  User,
  Plus,
  ArrowUpDown,
  History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PCPMinuteItem, ItemStatus } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { useToast } from '@/hooks/use-toast'

export const MeetingPendenciesView: React.FC = () => {
  const { toast } = useToast()
  const [items, setItems] = useState<PCPMinuteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [lineFilter, setLineFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const loadPendencies = async () => {
    setLoading(true)
    try {
      const list = await pcpMeetingService.listMinuteItems({
        classification: 'PENDENCIA',
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        lineCode: lineFilter !== 'ALL' ? lineFilter : undefined,
      })
      setItems(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendencies()
  }, [statusFilter, lineFilter])

  const handleUpdateStatus = async (item: PCPMinuteItem, newStatus: ItemStatus) => {
    try {
      const updated = await pcpMeetingService.updateMinuteItemStatus(
        item.id,
        newStatus,
        `Status alterado pelo painel de pendências de PCP.`,
      )
      setItems(items.map((it) => (it.id === item.id ? updated : it)))
      toast({
        title: 'Status da Pendência Atualizado',
        description: `Item ${item.item_code} alterado para ${newStatus} (refletido em todas as telas).`,
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pendência',
        description: e.message,
      })
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Métricas do Dashboard
  const openCount = items.filter((i) => i.status === 'ABERTA' || i.status === 'EM_ANDAMENTO').length
  const vencidasCount = items.filter((i) => i.status === 'VENCIDA').length
  const concluidasCount = items.filter((i) => i.status === 'CONCLUIDA').length
  const semAtualizacaoCount = items.filter((i) => i.status === 'SEM_ATUALIZACAO').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#004C97]" />
            Painel de Pendências das Reuniões PCP
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de ponta a ponta: as pendências abertas retornam automaticamente na pauta
            da próxima reunião.
          </p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-blue-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Em Aberto / Andamento
              </span>
              <div className="text-xl font-bold font-mono text-[#004C97] mt-0.5">{openCount}</div>
            </div>
            <Clock className="w-6 h-6 text-blue-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-rose-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Vencidas</span>
              <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">
                {vencidasCount}
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Concluídas</span>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
                {concluidasCount}
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Sem Atualização
              </span>
              <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                {semAtualizacaoCount}
              </div>
            </div>
            <HelpCircle className="w-6 h-6 text-slate-400/30" />
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Buscar por título, código, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs border-slate-300"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="VENCIDA">Vencida</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="SEM_ATUALIZACAO">Sem Atualização</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Linha:</span>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
            >
              <option value="ALL">Todas as Linhas</option>
              <option value="L01">L01</option>
              <option value="L02">L02</option>
              <option value="L03">L03</option>
              <option value="L04">L04</option>
              <option value="ENDL1">ENDL1</option>
              <option value="ACABL1">ACABL1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Pendências */}
      {filteredItems.length === 0 ? (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Nenhuma pendência encontrada</h3>
          <p className="text-xs text-slate-500">
            Ajuste os filtros ou registre novas pendências nas reuniões semanais de PCP.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isVencida = item.status === 'VENCIDA'
            const isConcluida = item.status === 'CONCLUIDA'
            return (
              <Card
                key={item.id}
                className={`bg-white border-slate-200 shadow-2xs hover:border-blue-300 transition-all ${
                  isVencida
                    ? 'border-l-4 border-l-rose-500'
                    : isConcluida
                      ? 'border-l-4 border-l-emerald-500 opacity-80'
                      : 'border-l-4 border-l-[#004C97]'
                }`}
              >
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          {item.item_code}
                        </Badge>
                        <Badge
                          className={
                            item.status === 'CONCLUIDA'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : item.status === 'VENCIDA'
                                ? 'bg-rose-600 text-white text-[10px]'
                                : item.status === 'EM_ANDAMENTO'
                                  ? 'bg-blue-600 text-white text-[10px]'
                                  : 'bg-amber-500 text-white text-[10px]'
                          }
                        >
                          ● {item.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Setor: {item.sector || 'PCP'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Prazo Limite:
                      </span>
                      <strong
                        className={`text-xs font-mono ${
                          isVencida ? 'text-rose-600 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {item.deadline || 'Sem prazo'}
                      </strong>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-xs pl-0.5">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>
                        Linhas Vinculadas:{' '}
                        <strong className="text-[#004C97] font-mono">
                          {item.line_codes?.join(', ') || 'Todas'}
                        </strong>
                      </span>
                      <span>
                        Responsável:{' '}
                        <strong className="text-slate-800">{item.responsible_name}</strong>
                      </span>
                    </div>

                    {/* Ações de Transição de Status */}
                    <div className="flex items-center gap-1.5">
                      {item.status !== 'EM_ANDAMENTO' && item.status !== 'CONCLUIDA' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(item, 'EM_ANDAMENTO')}
                          className="h-6 text-[10px] border-slate-300 text-blue-700 hover:bg-blue-50"
                        >
                          Iniciar Andamento
                        </Button>
                      )}
                      {item.status !== 'CONCLUIDA' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(item, 'CONCLUIDA')}
                          className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          ✓ Marcar Concluída
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default MeetingPendenciesView
