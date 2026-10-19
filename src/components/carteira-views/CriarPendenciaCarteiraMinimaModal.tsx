import React, { useState, useEffect } from 'react'
import {
  X,
  ClipboardList,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Calendar,
  ExternalLink,
  Tag,
  Clock,
  User,
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
import { pb } from '@/lib/pocketbase/client'

interface CriarPendenciaCarteiraMinimaModalProps {
  isOpen: boolean
  onClose: () => void
  itens: CarteiraMinimaItem[]
  filtros: CarteiraMinimaFilterParams
  totalizadores: CarteiraMinimaTotalizadores
  nomeArquivoPdf?: string
  onVisualizarRelatorioOriginal?: () => void
  onSuccess?: () => void
}

function getDataAtualPtBr(): string {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function getPrazoPadraoIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3) // +3 dias de prazo padrão
  return d.toISOString().split('T')[0]
}

export const CriarPendenciaCarteiraMinimaModal: React.FC<
  CriarPendenciaCarteiraMinimaModalProps
> = ({
  isOpen,
  onClose,
  itens,
  filtros,
  totalizadores,
  nomeArquivoPdf,
  onVisualizarRelatorioOriginal,
  onSuccess,
}) => {
  const [usuarios, setUsuarios] = useState<DestinatarioHub[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('TODOS')

  // Campos preenchidos automaticamente e editáveis
  const [titulo, setTitulo] = useState('Analisar Carteira Mínima Não Atingida')
  const [descricao, setDescricao] = useState(
    'Foi identificada pelo PCP Robotizado uma situação de carteira mínima não atingida. Avaliar os materiais relacionados, estoque disponível, saldo a produzir e necessidade de programação.',
  )
  const [prioridade, setPrioridade] = useState<'Baixa' | 'Normal' | 'Alta' | 'Crítica'>('Alta')
  const [prazo, setPrazo] = useState(getPrazoPadraoIso())

  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro'
    texto: string
  } | null>(null)

  const currentUser = pb.authStore.record || pb.authStore.model
  const currentUserName =
    (currentUser as any)?.name || (currentUser as any)?.email || 'Administrador Geral CIAFAL'
  const dataHoraGeracao = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  useEffect(() => {
    if (!isOpen) return

    setTitulo('Analisar Carteira Mínima Não Atingida')
    setDescricao(
      'Foi identificada pelo PCP Robotizado uma situação de carteira mínima não atingida. Avaliar os materiais relacionados, estoque disponível, saldo a produzir e necessidade de programação.',
    )
    setPrioridade('Alta')
    setPrazo(getPrazoPadraoIso())
    setFeedback(null)
    setSearchTerm('')
    setSectorFilter('TODOS')

    setLoadingUsuarios(true)
    carteiraMinimaAcoesService
      .listarUsuariosHub()
      .then((users) => {
        setUsuarios(users)
        if (users.length > 0) {
          // Selecionar primeiro por padrão
          setSelectedIds([users[0].id])
        }
      })
      .catch((err) => {
        console.warn('Erro ao listar usuários:', err)
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

  const handleSalvarPendencia = async () => {
    if (salvando) return
    setFeedback(null)

    if (selectedIds.length === 0) {
      setFeedback({
        tipo: 'erro',
        texto:
          'O campo "Responsáveis pela análise *" é obrigatório. Selecione ao menos um responsável.',
      })
      return
    }

    if (!titulo.trim()) {
      setFeedback({
        tipo: 'erro',
        texto: 'O título da pendência é obrigatório.',
      })
      return
    }

    setSalvando(true)

    try {
      const resultado = await carteiraMinimaAcoesService.criarPendenciaNoMeuDia({
        responsaveis: selectedUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          sector: u.sector,
        })),
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        prazo,
        origem: 'PCP Robotizado',
        modulo: 'Análise de Carteira',
        tipo: 'Carteira Mínima Não Atingida',
        origemRelatorio: 'PCP Robotizado → Análise de Carteira → Carteira mínima não atingida',
        filtersSnapshot: filtros,
        itemsCount: itens.length,
        totalizersSnapshot: totalizadores,
        pdfFileName: nomeArquivoPdf,
        itens,
      })

      // Mensagem oficial exigida
      setFeedback({
        tipo: 'sucesso',
        texto: `Pendência PCP criada com sucesso e enviada para ${selectedUsers.length} usuários no Meu Dia.`,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err?.message || 'Falha ao registrar pendência no Meu Dia.',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !salvando && onClose()}>
      {/* Modal Amplo: ~70-85% desktop, quase total mobile */}
      <DialogContent className="w-[95vw] sm:w-[85vw] md:max-w-4xl max-h-[92vh] bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004C97] text-white flex items-center justify-center shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                Criar Pendência PCP &bull; Meu Dia
              </DialogTitle>
              <p className="text-xs text-slate-500">
                PCP Robotizado &bull; Análise de Carteira &bull; Carteira Mínima Não Atingida
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">
                {feedback.tipo === 'sucesso' ? 'Sucesso' : 'Atenção'}
              </span>
              <span>{feedback.texto}</span>
            </div>
          </div>
        )}

        {/* Formulário com rolagem interna */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          {/* Seção 1: Metadados Fixos de Rastreabilidade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Origem
              </span>
              <span className="font-medium text-slate-900 text-xs">PCP Robotizado</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Módulo
              </span>
              <span className="font-medium text-slate-900 text-xs">Análise de Carteira</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Gerado por
              </span>
              <span className="font-medium text-slate-900 text-xs truncate block">
                {currentUserName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Data/Hora Geração
              </span>
              <span className="font-medium text-slate-900 text-xs font-mono">
                {dataHoraGeracao}
              </span>
            </div>
          </div>

          {/* Seção 2: Responsáveis pela Análise * (Obrigatório) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#004C97]" />
                Responsáveis pela análise * ({selectedIds.length} selecionados)
              </label>
              <span className="text-[11px] text-slate-500">
                Múltipla seleção &bull; Usuários reais
              </span>
            </div>

            {/* Tags de selecionados */}
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

            {/* Filtros de busca */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Buscar responsáveis por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white border-slate-200"
                />
              </div>
              <div className="w-full sm:w-44">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  aria-label="Filtrar por função ou setor"
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

            {/* Lista com rolagem interna */}
            <div className="border border-slate-200 rounded-xl p-2 max-h-36 overflow-y-auto bg-slate-50/50 space-y-1">
              {loadingUsuarios ? (
                <div className="py-4 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                  <span>Carregando usuários ativos...</span>
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="py-3 text-center text-slate-500 text-xs">
                  Nenhum usuário localizado.
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
                        {isSelected ? 'Responsável' : user.sector || 'HUB'}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Seção 3: Dados Editáveis da Tarefa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-800 text-xs">Título da Pendência *</label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="text-xs h-8 bg-white border-slate-200 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                aria-label="Prioridade da pendência"
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 font-semibold"
              >
                <option value="Baixa">Baixa</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta (Padrão)</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 text-xs">
                Prazo para Análise (Data) *
              </label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="text-xs h-8 bg-white border-slate-200"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-800 text-xs">Origem do Relatório</label>
              <Input
                disabled
                value="PCP Robotizado → Análise de Carteira → Carteira mínima não atingida"
                className="text-xs h-8 bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-800 text-xs">
              Descrição da Pendência (sugerida e editável)
            </label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs bg-white border-slate-200 resize-none leading-relaxed"
            />
          </div>

          {/* Vínculo de Rastreabilidade com o Relatório */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#004C97] shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Vínculo com o Relatório de Origem
                </span>
                <span className="text-[11px] text-slate-600">
                  {itens.length} material(is) analisado(s) &bull; Snapshot de filtros preservado
                </span>
              </div>
            </div>
            {onVisualizarRelatorioOriginal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onVisualizarRelatorioOriginal}
                className="text-xs h-7 gap-1 text-[#004C97] border-[#004C97]/30 hover:bg-blue-100"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Visualizar relatório</span>
              </Button>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={salvando}
            className="text-xs h-8 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSalvarPendencia}
            disabled={salvando || selectedIds.length === 0}
            className="text-xs h-8 px-5 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
          >
            {salvando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registrando no Meu Dia...</span>
              </>
            ) : (
              <>
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Criar Pendência ({selectedIds.length})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
