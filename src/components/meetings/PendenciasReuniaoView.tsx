import React, { useState, useEffect } from 'react'
import {
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Target,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { PCPMeetingPendencyRecord, PendencyStatus, PendencyPriority } from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getPlantNow } from '@/lib/temporal-utils'

export const PendenciasReuniaoView: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pendencies, setPendencies] = useState<PCPMeetingPendencyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterArea, setFilterArea] = useState<string>('TODAS')

  // Modal: Nova Pendência
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newArea, setNewArea] = useState('PCP')
  const [newAction, setNewAction] = useState('')
  const [newResponsible, setNewResponsible] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<PendencyPriority>('ALTA')

  // Modal: Editar / Atualizar Status
  const [editingTarget, setEditingTarget] = useState<PCPMeetingPendencyRecord | null>(null)
  const [editStatus, setEditStatus] = useState<PendencyStatus>('ABERTA')
  const [editEvidence, setEditEvidence] = useState('')
  const [editNote, setEditNote] = useState('')

  // Modal: Gerar Ação na Gestão de Performance (5W2H) com Confirmação Humana
  const [performanceTarget, setPerformanceTarget] = useState<PCPMeetingPendencyRecord | null>(null)
  const [what, setWhat] = useState('')
  const [why, setWhy] = useState('')
  const [who, setWho] = useState('')
  const [when, setWhen] = useState('')
  const [where, setWhere] = useState('')
  const [how, setHow] = useState('')
  const [generatingPerf, setGeneratingPerf] = useState(false)

  const userContext = {
    id: user?.id,
    name: user?.name || 'Coordenação PCP',
  }

  const loadPendencies = async () => {
    try {
      setLoading(true)
      const list = await pcpMeetingFatia1Service.listPendencies({
        status: filterStatus,
        area: filterArea,
      })
      setPendencies(list)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar pendências',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendencies()
  }, [filterStatus, filterArea])

  // Salvar nova pendência
  const handleCreatePendency = async () => {
    if (!newSubject.trim() || !newAction.trim() || !newResponsible.trim() || !newDeadline) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha assunto, ação, responsável e prazo.',
        variant: 'destructive',
      })
      return
    }

    try {
      await pcpMeetingFatia1Service.createPendency(
        {
          origin_week: 8,
          origin_year: 2025,
          meeting_id: 'REUNIAO_MANUAL',
          area: newArea,
          subject: newSubject.trim(),
          action: newAction.trim(),
          responsible: newResponsible.trim(),
          deadline: newDeadline,
          priority: newPriority,
          status: 'ABERTA',
          origin: 'Painel de Pendências e Ações',
        },
        userContext,
      )

      setIsNewOpen(false)
      setNewSubject('')
      setNewAction('')
      setNewResponsible('')
      await loadPendencies()

      toast({
        title: 'Pendência Registrada com Sucesso!',
        description: 'A pendência será carregada automaticamente na próxima Reunião PCP.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar pendência',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Atualizar pendência
  const handleUpdatePendency = async () => {
    if (!editingTarget) return
    try {
      await pcpMeetingFatia1Service.updatePendency(
        editingTarget.id!,
        {
          status: editStatus,
          evidence: editEvidence,
          last_update_note: editNote,
        },
        userContext,
        `Status atualizado para ${editStatus}`,
      )

      setEditingTarget(null)
      await loadPendencies()

      toast({
        title: 'Pendência Atualizada!',
        description: `Status alterado para ${editStatus}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar pendência',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Gerar ação 5W2H na Gestão de Performance
  const handleCreatePerformanceAction = async () => {
    if (!performanceTarget || !what.trim() || !who.trim() || !when.trim()) {
      toast({
        title: 'Campos obrigatórios do 5W2H',
        description: 'O que, quem e quando são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingPerf(true)
      const res = await pcpMeetingFatia1Service.createPerformanceActionFromDecision(
        performanceTarget.id!,
        {
          what,
          why,
          who,
          when,
          where,
          how,
        },
        userContext,
      )

      setPerformanceTarget(null)
      await loadPendencies()

      toast({
        title: 'Ação 5W2H Registrada na Gestão de Performance!',
        description: `Ação vinculada bidirecionalmente: ${res.actionId} com confirmação humana.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao vincular ação de performance',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingPerf(false)
    }
  }

  const calculateDaysOpen = (createdDate?: string) => {
    if (!createdDate) return 0
    const created = new Date(createdDate)
    const now = getPlantNow()
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  return (
    <div className="space-y-6">
      {/* Topo Executivo */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Pendências e Ações das Reuniões de PCP
            </h2>
            <p className="text-xs text-slate-500">
              Quadro de acompanhamento com ID legível, semana de origem, dias em aberto e vínculo
              bidirecional 5W2H com a Gestão de Performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendencies}
              disabled={loading}
              className="text-xs font-semibold h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewOpen(true)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> + Nova Pendência
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODOS">Todos</option>
              <option value="ABERTA">ABERTA</option>
              <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
              <option value="AGUARDANDO_TERCEIRO">AGUARDANDO TERCEIRO</option>
              <option value="CONCLUIDA">CONCLUÍDA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="VENCIDA">VENCIDA</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Área</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODAS">Todas as Áreas</option>
              <option value="PCP">PCP</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="Preparação L2">Preparação L2</option>
              <option value="Estoque">Estoque</option>
              <option value="Qualidade">Qualidade</option>
              <option value="Comercial">Comercial</option>
              <option value="SDC">SDC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Pendências */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Pendências da Reunião Anterior e Histórico Ativo
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono">
            {pendencies.length} pendência(s) encontrada(s)
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Assunto / Ação</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3 text-center">Dias Aberto</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendencies.map((p) => {
                  const isVencida =
                    (p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO') &&
                    new Date(p.deadline + 'T23:59:59') < getPlantNow()

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.pendency_code}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        S{p.origin_week}/{p.origin_year}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{p.area}</td>
                      <td className="p-3 max-w-sm">
                        <div className="font-semibold text-slate-900">{p.subject}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{p.action}</div>
                        {p.performance_action_id && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-700 font-bold font-mono">
                            <Target className="w-3 h-3" /> Gestão Performance:{' '}
                            {p.performance_action_id}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{p.responsible}</td>
                      <td className="p-3 font-mono">
                        <span
                          className={`font-semibold ${
                            isVencida ? 'text-rose-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {p.deadline}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-600">
                        {calculateDaysOpen(p.created)}d
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            p.status === 'CONCLUIDA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isVencida
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isVencida ? 'VENCIDA' : p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTarget(p)
                              setEditStatus(p.status)
                              setEditEvidence(p.evidence || '')
                              setEditNote(p.last_update_note || '')
                            }}
                            className="h-7 text-xs font-semibold px-2 text-slate-700"
                            title="Editar status e evidência"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                          </Button>

                          {!p.performance_action_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPerformanceTarget(p)
                                setWhat(p.action)
                                setWhy(p.subject)
                                setWho(p.responsible)
                                setWhen(p.deadline)
                                setWhere(p.area)
                                setHow('Execução conforme plano de recuperação acordado no PCP')
                              }}
                              className="h-7 text-[10px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
                              title="Gerar Ação 5W2H na Gestão de Performance com confirmação humana"
                            >
                              5W2H
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Nova Pendência */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Registrar Nova Pendência da Reunião
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A pendência será carregada automaticamente no fluxo da próxima reunião.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assunto *</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ex: Regularização de saldo físico vs sistêmico em pátio"
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ação a Executar *</label>
              <Textarea
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Descreva a ação prática e mensurável a ser realizada..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Área</label>
                <select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="PCP">PCP</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="Preparação L2">Preparação L2</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Qualidade">Qualidade</option>
                  <option value="Comercial">Comercial</option>
                  <option value="SDC">SDC</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prioridade</label>
                <select
                  value={newPriority}
                  onChange={(e: any) => setNewPriority(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="CRITICA">CRÍTICA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="MEDIA">MÉDIA</option>
                  <option value="BAIXA">BAIXA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Responsável *</label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  placeholder="Nome do responsável"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prazo Final *</label>
                <Input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePendency}
              className="bg-[#004C97] text-white font-bold"
            >
              Gravar Pendência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Atualizar Status e Evidência */}
      <Dialog open={!!editingTarget} onOpenChange={() => setEditingTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Atualizar Pendência {editingTarget?.pendency_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Altere o status e anexe notas ou evidências de conclusão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
              >
                <option value="ABERTA">ABERTA</option>
                <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                <option value="AGUARDANDO_TERCEIRO">AGUARDANDO TERCEIRO</option>
                <option value="CONCLUIDA">CONCLUÍDA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nota de Atualização</label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Informe o andamento ou justificativa da alteração..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Evidência de Conclusão / Comprovante
              </label>
              <Input
                value={editEvidence}
                onChange={(e) => setEditEvidence(e.target.value)}
                placeholder="Link, número de documento ou referência SAP"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleUpdatePendency}
              className="bg-[#004C97] text-white font-bold"
            >
              Salvar Atualização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Gerar Ação na Gestão de Performance com Confirmação Humana (5W2H) */}
      <Dialog open={!!performanceTarget} onOpenChange={() => setPerformanceTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" /> Gerar Ação na Gestão de Performance
              (5W2H)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              <strong>Regra SGQ:</strong> Exige confirmação humana expressa. Vincula a pendência
              bidirecionalmente à Gestão de Performance do HUB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                O Que (What) — Ação *
              </label>
              <Input
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                className="text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Por Que (Why) — Causa
              </label>
              <Input value={why} onChange={(e) => setWhy(e.target.value)} className="text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quem (Who) *</label>
                <Input value={who} onChange={(e) => setWho(e.target.value)} className="text-xs" />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quando (When) *</label>
                <Input
                  type="date"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Onde (Where)</label>
                <Input
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Como (How)</label>
                <Input value={how} onChange={(e) => setHow(e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPerformanceTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePerformanceAction}
              disabled={generatingPerf}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {generatingPerf ? 'Gerando...' : 'Confirmar e Vincular 5W2H'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PendenciasReuniaoView
