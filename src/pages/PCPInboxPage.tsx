import React, { useState, useEffect } from 'react'
import {
  Inbox,
  CalendarDays,
  Megaphone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PCPInboxItem } from '@/types/pcp-meetings-comms'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const PCPInboxPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState<PCPInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('ALL')

  const loadInbox = async () => {
    setLoading(true)
    try {
      const inboxList = await pcpCommunicationService.getInboxItems()
      setItems(inboxList)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  const handleAction = async (item: PCPInboxItem) => {
    if (item.action_type === 'ACKNOWLEDGE') {
      try {
        await pcpCommunicationService.acknowledgeCommunication(item.item_payload.id)
        toast({
          title: 'Ciência Registrada',
          description: 'Confirmação de leitura gravada no HUB.',
        })
        loadInbox()
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar ciência',
          description: err.message,
        })
      }
    } else {
      navigate(item.link)
    }
  }

  const filteredItems = items.filter((i) => {
    if (filterType === 'ALL') return true
    return i.type === filterType
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header CIAFAL */}
      <div className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>PCP ROBOTIZADO</span>
            <span>&bull;</span>
            <span className="text-[#004C97] font-semibold">MINHA CAIXA PCP</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Inbox Unificada: Reuniões, Comunicados, Alertas & Pendências
          </h1>
        </div>
      </div>

      {/* Filtros da Caixa */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-xs">
        <span className="text-slate-500 font-semibold flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar por:
        </span>
        <Button
          size="sm"
          variant={filterType === 'ALL' ? 'default' : 'outline'}
          onClick={() => setFilterType('ALL')}
          className={`h-7 text-xs ${filterType === 'ALL' ? 'bg-[#004C97] text-white' : 'bg-white'}`}
        >
          Todos ({items.length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'COMUNICADO' ? 'default' : 'outline'}
          onClick={() => setFilterType('COMUNICADO')}
          className={`h-7 text-xs ${filterType === 'COMUNICADO' ? 'bg-[#004C97] text-white' : 'bg-white'}`}
        >
          Comunicados ({items.filter((i) => i.type === 'COMUNICADO').length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'REUNIAO' ? 'default' : 'outline'}
          onClick={() => setFilterType('REUNIAO')}
          className={`h-7 text-xs ${filterType === 'REUNIAO' ? 'bg-[#004C97] text-white' : 'bg-white'}`}
        >
          Reuniões ({items.filter((i) => i.type === 'REUNIAO').length})
        </Button>
        <Button
          size="sm"
          variant={filterType === 'PENDENCIA' ? 'default' : 'outline'}
          onClick={() => setFilterType('PENDENCIA')}
          className={`h-7 text-xs ${filterType === 'PENDENCIA' ? 'bg-[#004C97] text-white' : 'bg-white'}`}
        >
          Pendências ({items.filter((i) => i.type === 'PENDENCIA').length})
        </Button>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Consolidando sua caixa PCP...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-2">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Sua caixa PCP está em dia</h3>
          <p className="text-xs text-slate-500">
            Nenhuma pendência, comunicado não lido ou convocação aguardando ação.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            return (
              <Card
                key={item.id}
                className={`bg-white border-slate-200 shadow-2xs hover:border-blue-300 transition-all ${
                  item.priority === 'CRITICA'
                    ? 'border-l-4 border-l-rose-600 bg-rose-50/20'
                    : item.priority === 'ATENCAO'
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-[#004C97]'
                }`}
              >
                <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[9px] font-bold ${
                          item.priority === 'CRITICA'
                            ? 'bg-rose-600 text-white'
                            : item.priority === 'ATENCAO'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-white'
                        }`}
                      >
                        {item.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-slate-300 font-mono">
                        {item.source_label}
                      </Badge>
                      {item.deadline && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Prazo: {item.deadline}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.requires_action && item.action_type === 'ACKNOWLEDGE' && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(item)}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> LI E ESTOU CIENTE
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(item.link)}
                      className="h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1 font-semibold"
                    >
                      Acessar <ArrowRight className="w-3 h-3" />
                    </Button>
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
export default PCPInboxPage
