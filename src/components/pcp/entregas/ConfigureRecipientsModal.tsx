import React, { useState, useEffect } from 'react'
import {
  lineSummaryAutomationService,
  type SummaryRecipientsConfig,
  type HubUser,
} from '@/services/pcp-line-summary-automation-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Mail,
  Send,
  Users,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'

interface ConfigureRecipientsModalProps {
  isOpen: boolean
  onClose: () => void
  linhaCode: string
  templateCode?: string
  configId?: string
  canManage: boolean
  onSuccess?: () => void
}

export const ConfigureRecipientsModal: React.FC<ConfigureRecipientsModalProps> = ({
  isOpen,
  onClose,
  linhaCode,
  templateCode,
  configId,
  canManage,
  onSuccess,
}) => {
  const [recipientConfig, setRecipientConfig] = useState<SummaryRecipientsConfig | null>(null)
  const [hubUsers, setHubUsers] = useState<HubUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form states
  const [emailsList, setEmailsList] = useState<string[]>([])
  const [newEmailInput, setNewEmailInput] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    'Diretoria',
    'Gerência PCP',
    'Supervisão Fabril',
  ])
  const [assuntoTemplate, setAssuntoTemplate] = useState(
    'Resumo Mensal de Entregas PCP - {empresa} {linha} ({mes}/{ano})',
  )
  const [corpoTemplate, setCorpoTemplate] = useState(
    'Prezados,\n\nSegue o Resumo de Entregas PCP consolidado da Linha {linha} referente a {mes}/{ano}.\n\nVersão: {versao}\nResponsável: {responsavel}\n\nFavor acusar recebimento e confirmar a leitura conforme governança corporativa CIAFAL.',
  )
  const [anexarPdf, setAnexarPdf] = useState(true)
  const [anexarPdfExecutivo, setAnexarPdfExecutivo] = useState(false)
  const [exigirConfirmacao, setExigirConfirmacao] = useState(true)
  const [enviarLembrete, setEnviarLembrete] = useState(true)
  const [prazoLeituraDias, setPrazoLeituraDias] = useState(3)
  const [exigirAprovacaoPrevia, setExigirAprovacaoPrevia] = useState(true)

  // Teste de Envio com confirmação explícita
  const [isTestingSend, setIsTestingSend] = useState(false)
  const [showTestConfirmation, setShowTestConfirmation] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, linhaCode, configId])

  const loadData = async () => {
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setShowTestConfirmation(false)
    setTestResult(null)

    try {
      const [rec, users] = await Promise.all([
        lineSummaryAutomationService.getRecipients(linhaCode, configId),
        lineSummaryAutomationService.getHubUsers(),
      ])

      setHubUsers(users)

      if (rec) {
        setRecipientConfig(rec)
        setEmailsList(rec.emails_autorizados || [])
        setSelectedUserIds(rec.usuarios_ids || [])
        setSelectedGroups(rec.grupos || ['Diretoria', 'Gerência PCP'])
        setAssuntoTemplate(
          rec.assunto_template || 'Resumo Mensal de Entregas PCP - {empresa} {linha} ({mes}/{ano})',
        )
        setCorpoTemplate(rec.corpo_template || '')
        setAnexarPdf(rec.anexar_pdf ?? true)
        setAnexarPdfExecutivo(rec.anexar_pdf_executivo ?? false)
        setExigirConfirmacao(rec.exigir_confirmacao_leitura ?? true)
        setEnviarLembrete(rec.enviar_lembrete ?? true)
        setPrazoLeituraDias(rec.prazo_leitura_dias || 3)
        setExigirAprovacaoPrevia(rec.exigir_aprovacao_previa ?? true)
      } else {
        // Padrão inicial
        setEmailsList(['diretoria.industrial@ciafal.com.br', 'gerencia.pcp@ciafal.com.br'])
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados de destinatários')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmail = () => {
    const trimmed = newEmailInput.trim().toLowerCase()
    if (!trimmed) return
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setErrorMsg('Informe um endereço de e-mail corporativo válido.')
      return
    }
    if (emailsList.includes(trimmed)) {
      setErrorMsg('Este e-mail já está na lista.')
      return
    }
    setEmailsList([...emailsList, trimmed])
    setNewEmailInput('')
    setErrorMsg('')
  }

  const handleRemoveEmail = (email: string) => {
    setEmailsList(emailsList.filter((e) => e !== email))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const payload: Partial<SummaryRecipientsConfig> = {
        id: recipientConfig?.id,
        config_id: configId,
        linha_code: linhaCode,
        template_code: templateCode,
        emails_autorizados: emailsList,
        usuarios_ids: selectedUserIds,
        grupos: selectedGroups,
        assunto_template: assuntoTemplate,
        corpo_template: corpoTemplate,
        anexar_pdf: anexarPdf,
        anexar_pdf_executivo: anexarPdfExecutivo,
        exigir_confirmacao_leitura: exigirConfirmacao,
        enviar_lembrete: enviarLembrete,
        prazo_leitura_dias: prazoLeituraDias,
        exigir_aprovacao_previa: exigirAprovacaoPrevia,
        status: 'ATIVO',
      }

      await lineSummaryAutomationService.saveRecipients(payload)
      setSuccessMsg('Parametrização de destinatários salva com sucesso.')
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar destinatários')
    } finally {
      setIsSaving(false)
    }
  }

  // Teste de Envio com Confirmação Explícita Obrigatória
  const handleExecuteSendTest = async () => {
    setIsTestingSend(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      // Dispara tentativa de envio de teste via endpoint real
      const res = await lineSummaryAutomationService.sendSummary('', `PMS-TEST-${linhaCode}`)
      setTestResult(res)
      if (res.success) {
        setSuccessMsg('Teste concluído com sucesso.')
      } else {
        setErrorMsg(`Resultado do teste: ${res.message || res.status}`)
      }
    } catch (err: any) {
      const msg = err.response?.error || err.response?.message || err.message || 'Falha no teste'
      setErrorMsg(`Resultado real do teste: ${msg}`)
      setTestResult({ success: false, status: 'FALHA', message: msg })
    } finally {
      setIsTestingSend(false)
      setShowTestConfirmation(false)
    }
  }

  // Pré-visualização do assunto interpolado
  const sampleSubject = lineSummaryAutomationService.interpolateEmailVariables(assuntoTemplate, {
    empresa: 'CIAFAL',
    linha: linhaCode || 'L1',
    centro: 'SDPL',
    mes: '10',
    ano: '2026',
    periodo: '2026-10',
    versao: 'V01',
    responsavel: 'Lucas Ferreira',
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#004C97]" />
              <span>Parametrização de Destinatários & Canais ({linhaCode})</span>
            </span>
            <Badge variant="outline" className="bg-slate-100 text-slate-800 text-[10px]">
              Governança de Disparo
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-300 text-rose-900 py-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <AlertDescription className="text-xs font-medium ml-2">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="bg-emerald-50 border-emerald-300 text-emerald-900 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-xs font-medium ml-2">{successMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Bloco 1: E-mails autorizados */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider flex items-center justify-between">
              <span>1. E-mails e Usuários Autorizados</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {emailsList.length} endereço(s)
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="novo.destinatario@ciafal.com.br"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
                className="h-8 text-xs bg-white flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddEmail}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white rounded border border-slate-200">
              {emailsList.length === 0 ? (
                <span className="text-slate-400 text-[11px] italic">
                  Nenhum e-mail adicionado ainda.
                </span>
              ) : (
                emailsList.map((email) => (
                  <Badge
                    key={email}
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-300 text-xs py-1 px-2 flex items-center gap-1.5"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                    >
                      &times;
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Bloco 2: Template do Assunto e Mensagem com Variáveis Dinâmicas */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
              2. Modelo de Assunto e Corpo (Variáveis Dinâmicas)
            </div>

            <div className="text-[10px] text-slate-500 bg-blue-50/70 p-2 rounded border border-blue-200 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Variáveis disponíveis: <code>{'{empresa}'}</code>, <code>{'{linha}'}</code>,{' '}
                <code>{'{centro}'}</code>, <code>{'{mes}'}</code>, <code>{'{ano}'}</code>,{' '}
                <code>{'{periodo}'}</code>, <code>{'{versao}'}</code>,{' '}
                <code>{'{responsavel}'}</code>.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Modelo do Assunto *</Label>
              <Input
                type="text"
                value={assuntoTemplate}
                onChange={(e) => setAssuntoTemplate(e.target.value)}
                className="h-8 text-xs bg-white font-medium"
                required
              />
              <div className="text-[10px] text-slate-500 italic">
                Exemplo gerado: <strong className="text-slate-700">{sampleSubject}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Modelo do Corpo / Mensagem
              </Label>
              <textarea
                rows={4}
                value={corpoTemplate}
                onChange={(e) => setCorpoTemplate(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bloco 3: Anexos e Regras de Governança */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
              3. Governança, Anexos & Prazos
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">Anexar Relatório PDF</div>
                  <div className="text-[10px] text-slate-500">Gera PDF operacional completo</div>
                </div>
                <Switch checked={anexarPdf} onCheckedChange={setAnexarPdf} />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">PDF Executivo Sintético</div>
                  <div className="text-[10px] text-slate-500">Versão 1-page para diretoria</div>
                </div>
                <Switch checked={anexarPdfExecutivo} onCheckedChange={setAnexarPdfExecutivo} />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">
                    Aprovação Prévia Obrigatória
                  </div>
                  <div className="text-[10px] text-slate-500">Bloqueia disparo sem aprovação</div>
                </div>
                <Switch
                  checked={exigirAprovacaoPrevia}
                  onCheckedChange={setExigirAprovacaoPrevia}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">Confirmação de Leitura</div>
                  <div className="text-[10px] text-slate-500">Rastreabilidade no HUB</div>
                </div>
                <Switch checked={exigirConfirmacao} onCheckedChange={setExigirConfirmacao} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Prazo de Leitura / Ciência (Dias úteis)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={prazoLeituraDias}
                  onChange={(e) => setPrazoLeituraDias(parseInt(e.target.value, 10) || 3)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 mt-5">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">Enviar Lembrete Automático</div>
                  <div className="text-[10px] text-slate-500">24h antes do prazo expirar</div>
                </div>
                <Switch checked={enviarLembrete} onCheckedChange={setEnviarLembrete} />
              </div>
            </div>
          </div>

          {/* Seção de Teste de Disparo COM CONFIRMAÇÃO EXPLÍCITA */}
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-300 space-y-2">
            <div className="font-bold text-xs uppercase text-amber-900 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-700" />
                <span>Teste de Envio Operacional</span>
              </span>
              <Badge
                variant="outline"
                className="bg-white text-amber-800 border-amber-400 text-[9px]"
              >
                Exige Confirmação Explícita
              </Badge>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              O teste executa a validação real das credenciais de envio e regras de bloqueio no
              backend Skip Cloud. Nenhuma mensagem é disparada sem autorização explícita e aprovação
              do PCP.
            </p>

            {showTestConfirmation ? (
              <div className="p-2.5 bg-white border border-amber-400 rounded space-y-2">
                <div className="font-bold text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Confirmação Explícita de Teste</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  Deseja disparar a rotina de teste de envio para a Linha{' '}
                  <strong>{linhaCode}</strong>? O resultado e auditoria serão registrados no banco.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTestConfirmation(false)}
                    className="h-7 text-xs text-slate-600"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isTestingSend}
                    onClick={handleExecuteSendTest}
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    {isTestingSend ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <span>Sim, Executar Teste de Envio</span>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTestConfirmation(true)}
                className="h-7 text-xs border-amber-400 text-amber-900 hover:bg-amber-100 font-bold"
              >
                Testar Envio com Confirmação
              </Button>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !canManage}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Destinatários</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
