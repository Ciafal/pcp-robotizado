import React, { useState, useEffect } from 'react'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Info,
  Check,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { HubInternalNotification } from '@/types/pcp-integration-contracts'
import { NotificationAdapter } from '@/services/pcp-adapters-service'

interface InternalNotificationCenterModalProps {
  open: boolean
  onClose: () => void
  targetAudience?: 'DP07' | 'PCP' | 'ALL'
  onSelectOrder?: (orderNumber: string) => void
}

export const InternalNotificationCenterModal: React.FC<InternalNotificationCenterModalProps> = ({
  open,
  onClose,
  targetAudience = 'ALL',
  onSelectOrder,
}) => {
  const [notifications, setNotifications] = useState<HubInternalNotification[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL')

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const list = await NotificationAdapter.listNotifications(targetAudience)
      setNotifications(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open, targetAudience])

  const handleMarkAsRead = async (id?: string) => {
    if (!id) return
    await NotificationAdapter.markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.is_read
    if (activeFilter === 'CRITICAL') return n.severity === 'CRITICAL'
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <div className="bg-[#004C97] text-white p-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wide text-white">
                Central Interna de Notificações — HUB PCP & DP07
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100 mt-0.5">
                Comunicação em tempo real para chão de fábrica e coordenação sem depender de
                e-mail/Teams.
              </DialogDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-rose-500 text-white font-bold text-xs">
              {unreadCount} não lida(s)
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Filtros da Central */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={activeFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('ALL')}
                className={`h-7 text-xs font-semibold ${
                  activeFilter === 'ALL'
                    ? 'bg-[#004C97] text-white'
                    : 'text-slate-600 border-slate-200'
                }`}
              >
                Todas ({notifications.length})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'UNREAD' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('UNREAD')}
                className={`h-7 text-xs font-semibold ${
                  activeFilter === 'UNREAD'
                    ? 'bg-[#004C97] text-white'
                    : 'text-slate-600 border-slate-200'
                }`}
              >
                Não Lidas ({unreadCount})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'CRITICAL' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('CRITICAL')}
                className={`h-7 text-xs font-semibold ${
                  activeFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 border-slate-200'
                }`}
              >
                Críticas
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadNotifications}
              disabled={loading}
              className="h-7 text-xs text-slate-500 hover:text-slate-900"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Lista de Notificações */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Nenhuma notificação encontrada para este filtro.</span>
              </div>
            ) : (
              filtered.map((notif, idx) => {
                const isCritical = notif.severity === 'CRITICAL'
                const isWarning = notif.severity === 'WARNING'

                return (
                  <div
                    key={notif.id || idx}
                    className={`p-3 rounded-lg border transition-all text-xs ${
                      !notif.is_read
                        ? isCritical
                          ? 'bg-rose-50/70 border-rose-300'
                          : isWarning
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-blue-50/70 border-blue-300'
                        : 'bg-white border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-[#004C97] shrink-0" />
                        )}
                        <span className="font-bold text-slate-900">{notif.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className="bg-slate-100 text-slate-600 font-mono text-[9px]">
                          {notif.target_audience}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(notif.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="mt-1.5 text-slate-700 text-[11px] leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Dados estruturados adicionais se disponíveis */}
                    {notif.order_number && (
                      <div className="mt-2 p-2 bg-white/80 rounded border border-slate-200 font-mono text-[10px] text-slate-700 flex flex-wrap gap-3">
                        <span>
                          Ordem: <strong>{notif.order_number}</strong>
                        </span>
                        {notif.material_code && (
                          <span>
                            Material: <strong>{notif.material_code}</strong>
                          </span>
                        )}
                        {notif.expected_time && (
                          <span>
                            Enfornamento: <strong>{notif.expected_time}</strong>
                          </span>
                        )}
                        {notif.missing_pieces !== undefined && notif.missing_pieces > 0 && (
                          <span className="text-rose-700 font-bold">
                            Faltante: {notif.missing_pieces} peças
                          </span>
                        )}
                      </div>
                    )}

                    {/* Ações da notificação */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div className="text-[9px] text-slate-400 font-mono">
                        Canais externos: E-mail (Aguardando) • Teams (Aguardando)
                      </div>
                      <div className="flex items-center gap-1.5">
                        {notif.order_number && onSelectOrder && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              onSelectOrder(notif.order_number!)
                              onClose()
                            }}
                            className="h-6 px-2 text-[10px] font-bold text-[#004C97] hover:bg-blue-100"
                          >
                            Abrir Inventário
                          </Button>
                        )}
                        {!notif.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-800"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Marcar como Lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
