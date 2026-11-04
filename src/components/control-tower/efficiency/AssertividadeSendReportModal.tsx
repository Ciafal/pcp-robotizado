/**
 * Modal "Enviar Relatório" do Previsto x Realizado (Fase 2).
 * Canais: E-mail corporativo (Resend em modo owner via hook backend) e/ou Alerta
 * interno do HUB (pcp_internal_notifications). Histórico persistido em
 * pcp_report_sendings. "Incluir resumo de IA" está indisponível (Dados não disponíveis).
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, BellRing, Search, CheckCircle2, XCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  REPORT_KIND_LABEL,
  buildReportBodyHtml,
  formatDateTimePtBr,
  type AssertividadeReportRow,
  type ReportKind,
} from '@/services/assertiveness-report-service'

type Canal = 'email' | 'hub' | 'ambos'

interface DirectoryUser {
  id: string
  name: string
  email: string
}

interface RecipientStatus {
  name: string
  email: string
  status: string
  detail: string | null
}

interface AssertividadeSendReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: AssertividadeReportRow[]
  filters: UnifiedEfficiencyFilters
}

function periodoLabel(filters: UnifiedEfficiencyFilters): string {
  if (filters.startDate && filters.endDate) {
    return `${filters.startDate.split('-').reverse().join('/')} a ${filters.endDate.split('-').reverse().join('/')}`
  }
  return 'Período completo'
}

export const AssertividadeSendReportModal: React.FC<AssertividadeSendReportModalProps> = ({
  open,
  onOpenChange,
  rows,
  filters,
}) => {
  const { toast } = useToast()
  const [canal, setCanal] = useState<Canal>('ambos')
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [busca, setBusca] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [externos, setExternos] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [reportType, setReportType] = useState<ReportKind>('completo')
  const [anexarPdf, setAnexarPdf] = useState(true)
  const [pedirLeitura, setPedirLeitura] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<RecipientStatus[] | null>(null)

  const periodo = periodoLabel(filters)
  const responsavel = useMemo(() => {
    try {
      const rec = (pb.authStore as unknown as { record?: { name?: string; email?: string } }).record
      return rec?.name || rec?.email || 'Usuário HUB CIAFAL'
    } catch {
      return 'Usuário HUB CIAFAL'
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setResultado(null)
    setAssunto(`PCP Robotizado | Relatório Previsto x Realizado | ${periodo}`)
    setMensagem(
      `Prezado(a),\n\nSegue o relatório Previsto x Realizado (período: ${periodo}) gerado pelo PCP Robotizado — HUB Industrial CIAFAL.\n\nAtenciosamente,\n${responsavel}`,
    )
    let cancelled = false
    setLoadingUsers(true)
    setUsersError(null)
    pb.collection('users')
      .getFullList({ sort: 'name', fields: 'id,name,email' })
      .then((items: unknown[]) => {
        if (cancelled) return
        setUsers(
          items.map((u) => {
            const rec = u as { id: string; name?: string; email?: string }
            return { id: rec.id, name: rec.name || rec.email || rec.id, email: rec.email || '' }
          }),
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[EnviarRelatorio] Diretório corporativo indisponível:', err)
        setUsersError('Não foi possível carregar o diretório corporativo agora.')
        setUsers([])
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, busca])

  const externosList = externos
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))

  const totalDestinatarios = selectedIds.size + externosList.length

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleEnviar = async () => {
    if (totalDestinatarios === 0) {
      toast({
        title: 'Selecione os destinatários',
        description: 'Escolha ao menos um destinatário do diretório ou informe um e-mail externo.',
        variant: 'destructive',
      })
      return
    }
    if (!assunto.trim()) {
      toast({ title: 'Informe o assunto do envio', variant: 'destructive' })
      return
    }
    setEnviando(true)
    setResultado(null)
    try {
      const recipients = users
        .filter((u) => selectedIds.has(u.id) && u.email)
        .map((u) => ({ userId: u.id, name: u.name, email: u.email }))

      const resp = await pb.send('/backend/v1/pcp/previsto-realizado/send-report', {
        method: 'POST',
        body: {
          channel: canal,
          recipients,
          externalEmails: externosList,
          subject: assunto.trim(),
          message: mensagem,
          reportType,
          periodLabel: periodo,
          attachPdf: anexarPdf,
          requestReadReceipt: pedirLeitura,
          reportBodyHtml: anexarPdf
            ? buildReportBodyHtml({
                kind: reportType,
                sections: [
                  'resumoExecutivo',
                  'indicadoresOperacionais',
                  'programadoRealizado',
                  'perdasProdutivas',
                ],
                rows,
                filters,
                responsavel,
                geradoEm: new Date(),
              })
            : null,
          filters: {
            companyCode: filters.companyCode,
            plantCode: filters.plantCode,
            lineCode: filters.lineCode,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        },
      })
      const data = resp as {
        success?: boolean
        message?: string
        statuses?: RecipientStatus[]
      }
      setResultado(data.statuses ?? [])
      if (data.success) {
        toast({
          title: 'Relatório enviado',
          description: data.message || 'Envio registrado com sucesso.',
        })
      } else {
        toast({
          title: 'Envio com falhas',
          description: data.message || 'Parte dos destinatários não recebeu o relatório.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('[EnviarRelatorio] Falha no envio:', err)
      toast({
        title: 'Falha no envio',
        description:
          'Não foi possível concluir o envio. Verifique a conexão e tente novamente — o erro técnico foi registrado no log do servidor.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#004C97]">
            Enviar Relatório — Previsto x Realizado
          </DialogTitle>
          <DialogDescription>
            Revise os destinatários e a mensagem antes de enviar. O período e os filtros atuais da
            tela são aplicados ao relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna esquerda: canal + destinatários */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Canal de envio</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'email', label: 'E-mail corporativo', icon: Mail },
                    { id: 'hub', label: 'Alerta interno do HUB', icon: BellRing },
                    { id: 'ambos', label: 'Ambos', icon: CheckCircle2 },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCanal(c.id)}
                    className={`text-[10.5px] font-medium border rounded-md px-2 py-2 flex flex-col items-center gap-1 ${
                      canal === c.id
                        ? 'border-[#004C97] bg-[#004C97]/5 text-[#004C97]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title={c.label}
                  >
                    <c.icon className="w-4 h-4" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Destinatários ({selectedIds.size} selecionado(s))
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Diretório corporativo
                </Badge>
              </div>
              <div className="relative mt-1.5">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="mt-1.5 border rounded-md max-h-44 overflow-y-auto divide-y divide-slate-100">
                {loadingUsers && (
                  <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando diretório...
                  </div>
                )}
                {!loadingUsers && usersError && (
                  <div className="p-3 text-xs text-amber-700">
                    {usersError} Use destinatários externos abaixo.
                  </div>
                )}
                {!loadingUsers && !usersError && filtrados.length === 0 && (
                  <div className="p-3 text-xs text-slate-500">Nenhum usuário encontrado.</div>
                )}
                {filtrados.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedIds.has(u.id)}
                      onCheckedChange={(c) => toggleUser(u.id, c === true)}
                    />
                    <span className="font-medium text-slate-800 truncate max-w-[45%]">
                      {u.name}
                    </span>
                    <span className="text-slate-500 truncate">{u.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700" htmlFor="pxr-externos">
                Destinatários externos autorizados
              </Label>
              <Input
                id="pxr-externos"
                value={externos}
                onChange={(e) => setExternos(e.target.value)}
                placeholder="nome@empresa.com; outro@parceiro.com"
                className="mt-1.5 h-8 text-xs"
              />
            </div>
          </div>

          {/* Coluna direita: mensagem */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700" htmlFor="pxr-assunto">
                Assunto
              </Label>
              <Input
                id="pxr-assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="mt-1.5 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700" htmlFor="pxr-mensagem">
                Mensagem (editável)
              </Label>
              <Textarea
                id="pxr-mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={5}
                className="mt-1.5 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700" htmlFor="pxr-tipo">
                  Tipo de relatório
                </Label>
                <select
                  id="pxr-tipo"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportKind)}
                  className="mt-1.5 w-full h-8 text-xs border rounded-md px-2 bg-white"
                >
                  {Object.entries(REPORT_KIND_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Período de referência
                </Label>
                <div className="mt-1.5 h-8 flex items-center px-2 border rounded-md bg-slate-50 text-xs font-mono">
                  {periodo}
                </div>
              </div>
            </div>
            <div className="space-y-2 border rounded-md p-2.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={anexarPdf} onCheckedChange={(c) => setAnexarPdf(c === true)} />
                Anexar PDF (conteúdo do relatório incluído no e-mail)
              </label>
              <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-60">
                <Checkbox checked={false} disabled />
                Incluir resumo de IA no corpo
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700">
                  Dados não disponíveis
                </Badge>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={pedirLeitura}
                  onCheckedChange={(c) => setPedirLeitura(c === true)}
                />
                Solicitar confirmação de leitura
              </label>
              <p className="text-[10px] text-slate-500">
                A marcação Visualizado / Leitura confirmada acontece quando o destinatário abrir o
                alerta no HUB — enviar não equivale a leitura.
              </p>
            </div>
          </div>
        </div>

        {resultado && (
          <div className="border rounded-md p-2.5 max-h-40 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Status por destinatário</p>
            <div className="space-y-1">
              {resultado.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {s.status === 'FALHA_ENTREGA' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-medium text-slate-800">{s.name || s.email}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {s.status}
                  </Badge>
                  {s.detail && <span className="text-slate-500 truncate">{s.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#004C97] hover:bg-[#003a75] text-white"
            onClick={handleEnviar}
            disabled={enviando}
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Enviar ({totalDestinatarios})
          </Button>
        </DialogFooter>
        <p className="text-[10px] text-slate-400 -mt-3">
          Gerado em {formatDateTimePtBr(new Date())} &bull; Responsável: {responsavel}
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default AssertividadeSendReportModal
