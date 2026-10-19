import React, { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Info,
  Calendar,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { carteiraMinimaAcoesService } from '@/services/carteira-minima-acoes-service'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { DestinatarioHub } from '@/types/comercial-comunicado'
import { formatNumberPTBR } from '@/lib/number-format'

interface EnviarEmailCarteiraMinimaModalProps {
  isOpen: boolean
  onClose: () => void
  itens: CarteiraMinimaItem[]
  filtros: CarteiraMinimaFilterParams
  totalizadores: CarteiraMinimaTotalizadores
  imagemResumoBase64?: string
  nomeArquivoPdf: string
  onSuccess?: () => void
}

function getDataAtualPtBr(): string {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

export const EnviarEmailCarteiraMinimaModal: React.FC<EnviarEmailCarteiraMinimaModalProps> = ({
  isOpen,
  onClose,
  itens,
  filtros,
  totalizadores,
  imagemResumoBase64,
  nomeArquivoPdf,
  onSuccess,
}) => {
  const [usuarios, setUsuarios] = useState<DestinatarioHub[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('TODOS')

  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [showConfirmacao, setShowConfirmacao] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'info' | 'erro'
    texto: string
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const dataHoje = getDataAtualPtBr()
    setAssunto(`PCP Robotizado | Carteira Mínima Não Atingida | ${dataHoje}`)
    setMensagem(
      `Prezados,\n\nSegue análise de Carteira Mínima Não Atingida identificada pelo PCP Robotizado.\n\nO resumo da análise está apresentado abaixo e o relatório completo encontra-se anexado em PDF.\n\nFavor avaliar os itens sinalizados e as necessidades de programação.\n\nPCP Robotizado\nHUB Industrial CIAFAL`,
    )
    setShowConfirmacao(false)
    setFeedback(null)
    setSearchTerm('')
    setSectorFilter('TODOS')

    // Carregar usuários reais
    setLoadingUsuarios(true)
    carteiraMinimaAcoesService
      .listarUsuariosHub()
      .then((users) => {
        setUsuarios(users)
        if (users.length > 0) {
          // Selecionar os primeiros como sugestão inicial
          setSelectedIds([users[0].id])
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar usuários:', err)
      })
      .finally(() => {
        setLoadingUsuarios(false)
      })
  }, [isOpen])

  if (!isOpen) return null

  const setoresDisponiveis = [
    'TODOS',
    ...Array.from(new Set(usuarios.map((u) => u.sector || 'Geral'))),
  ]

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSector = sectorFilter === 'TODOS' || (u.sector || 'Geral') === sectorFilter
    return matchesSearch && matchesSector
  })

  const selectedUsers = usuarios.filter((u) => selectedIds.includes(u.id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleRemoverIndividual = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  const handleValidarAberturaConfirmacao = () => {
    setFeedback(null)
    if (selectedIds.length === 0) {
      setFeedback({
        tipo: 'erro',
        texto: 'Selecione pelo menos um destinatário corporativo para o envio.',
      })
      return
    }
    if (!assunto.trim()) {
      setFeedback({
        tipo: 'erro',
        texto: 'O assunto do e-mail é obrigatório.',
      })
      return
    }
    setShowConfirmacao(true)
  }

  const handleExecutarEnvio = async () => {
    if (enviando) return
    setEnviando(true)
    setFeedback(null)

    try {
      const resultado = await carteiraMinimaAcoesService.enviarRelatorioPorEmail({
        recipients: selectedUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          sector: u.sector,
        })),
        subject: assunto.trim(),
        message: mensagem.trim(),
        summaryImageBase64: imagemResumoBase64,
        pdfFileName: nomeArquivoPdf,
        filtersSnapshot: filtros,
        itemsCount: itens.length,
        totalizersSnapshot: totalizadores,
        itens,
      })

      setShowConfirmacao(false)

      if (resultado.smtpConfigured) {
        setFeedback({
          tipo: 'sucesso',
          texto: resultado.message,
        })
      } else {
        // Status honesto exigido pela especificação técnica
        setFeedback({
          tipo: 'info',
          texto: resultado.message,
        })
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setShowConfirmacao(false)
      setFeedback({
        tipo: 'erro',
        texto: err?.message || 'Falha ao processar o envio do relatório por e-mail.',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004C97] text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                Enviar Relatório por E-mail
              </DialogTitle>
              <p className="text-xs text-slate-500">
                HUB Industrial CIAFAL &bull; PCP Robotizado &bull; Carteira Mínima
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback visual de processamento/status */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.tipo === 'info'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.tipo === 'info' ? (
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">
                {feedback.tipo === 'sucesso'
                  ? 'Envio concluído'
                  : feedback.tipo === 'info'
                    ? 'Agendado para despacho — SMTP não configurado'
                    : 'Atenção'}
              </span>
              <span>{feedback.texto}</span>
            </div>
          </div>
        )}

        {/* Modal de Confirmação Pré-Envio */}
        {showConfirmacao ? (
          <div className="p-6 space-y-5 text-xs text-slate-700">
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#004C97]" /> Confirmar Envio do Relatório
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">
                    Destinatários ({selectedUsers.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUsers.map((u) => (
                      <Badge
                        key={u.id}
                        variant="secondary"
                        className="text-[10px] bg-white border border-slate-300"
                      >
                        {u.name} ({u.email})
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Assunto:</span>
                  <p className="text-slate-800 font-mono mt-0.5">{assunto}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Anexo:</span>
                  <p className="text-slate-800 font-mono mt-0.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#004C97]" /> {nomeArquivoPdf}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Corpo do E-mail:</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Inclui mensagem sugerida +{' '}
                    <strong>Imagem estruturada do resumo do relatório</strong> (cards, cabeçalho e
                    tabela).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmacao(false)}
                disabled={enviando}
                className="text-xs h-9 px-4"
              >
                Voltar e Editar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecutarEnvio}
                disabled={enviando}
                className="text-xs h-9 px-4 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando envio...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Confirmar e Enviar e-mail</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Formulário Principal */
          <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs text-slate-700">
            {/* Bloco de Destinatários Reais */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários do HUB CIAFAL * ({selectedIds.length} selecionados)
                </label>
                <span className="text-[11px] text-slate-500">Cadastro real `users`</span>
              </div>

              {/* Tags dos selecionados com remoção individual */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#004C97]/30 text-[#004C97] font-medium text-[11px]"
                    >
                      {u.name}
                      <button
                        type="button"
                        onClick={() => handleRemoverIndividual(u.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Barra de busca e filtro de setor */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou e-mail corporativo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-8 bg-white border-slate-200"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    aria-label="Filtrar destinatários por setor"
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700"
                  >
                    {setoresDisponiveis.map((sec) => (
                      <option key={sec} value={sec}>
                        Setor: {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista com rolagem interna de usuários */}
              <div className="border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto bg-slate-50/50 space-y-1">
                {loadingUsuarios ? (
                  <div className="py-5 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#004C97]" />
                    <span>Carregando cadastro de usuários...</span>
                  </div>
                ) : usuariosFiltrados.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    Nenhum usuário localizado para o filtro.
                  </div>
                ) : (
                  usuariosFiltrados.map((user) => {
                    const isSelected = selectedIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleSelect(user.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#004C97]/10 border border-[#004C97]/40 text-[#004C97] font-semibold'
                            : 'bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-slate-900 block truncate">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {user.email}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 ${
                            isSelected
                              ? 'bg-[#004C97] text-white border-[#004C97]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : user.sector || 'HUB'}
                        </Badge>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Campo Assunto */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs">Assunto *</label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="text-xs h-8 bg-white border-slate-200 font-medium"
                placeholder="PCP Robotizado | Carteira Mínima Não Atingida | DD/MM/AAAA"
              />
            </div>

            {/* Campo Mensagem */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs">
                Mensagem do E-mail (editável)
              </label>
              <Textarea
                rows={5}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="text-xs bg-white border-slate-200 resize-none font-sans leading-relaxed"
                placeholder="Prezados, segue análise..."
              />
            </div>

            {/* Detalhes do Anexo e Imagem do Resumo */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#004C97]" />
                <span className="font-semibold text-slate-900">PDF Anexado Automaticamente</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                {nomeArquivoPdf} &bull; Gerado dos mesmos {itens.length} materiais em exibição
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                O corpo da mensagem carregará a imagem do resumo consolidado do relatório (cards de
                saldo {formatNumberPTBR(totalizadores.saldo_total_produzir_tons, 3)} t e tabela).
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={enviando}
                className="text-xs h-8 px-3.5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleValidarAberturaConfirmacao}
                disabled={enviando || selectedIds.length === 0}
                className="text-xs h-8 px-4 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Revisar e Enviar</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
