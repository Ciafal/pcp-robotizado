import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Shield,
  Building,
  Mail,
  User,
  AlertCircle,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DestinatarioGrupo, FechamentoDestinatario } from '@/types/checklist-fechamento'
import { fechamentoDestinatariosService } from '@/services/fechamento-destinatarios-service'

interface Props {
  open: boolean
  onClose: () => void
  podeAdministrar: boolean // Administrador ou Gerente
}

export const GestaoDestinatariosModal: React.FC<Props> = ({ open, onClose, podeAdministrar }) => {
  const [destinatarios, setDestinatarios] = useState<FechamentoDestinatario[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS')

  // Estado do formulário de novo/edição
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [email, setEmail] = useState('')
  const [grupo, setGrupo] = useState<DestinatarioGrupo>('Contabilidade')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [exibirForm, setExibirForm] = useState(false)

  const carregarDestinatarios = async () => {
    setCarregando(true)
    try {
      const lista = await fechamentoDestinatariosService.listarDestinatarios()
      setDestinatarios(lista)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (open) {
      carregarDestinatarios()
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setEditandoId(null)
    setNome('')
    setUsuario('')
    setEmail('')
    setGrupo('Contabilidade')
    setAtivo(true)
    setErroForm(null)
    setExibirForm(false)
  }

  const handleIniciarCriacao = () => {
    resetForm()
    setExibirForm(true)
  }

  const handleIniciarEdicao = (d: FechamentoDestinatario) => {
    setEditandoId(d.id)
    setNome(d.nome)
    setUsuario(d.usuario || '')
    setEmail(d.email)
    setGrupo(d.grupo)
    setAtivo(d.ativo)
    setErroForm(null)
    setExibirForm(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !email.trim()) {
      setErroForm('Nome e E-mail são obrigatórios.')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErroForm('Informe um endereço de e-mail válido.')
      return
    }

    setSalvando(true)
    setErroForm(null)
    try {
      if (editandoId) {
        await fechamentoDestinatariosService.atualizarDestinatario(editandoId, {
          nome,
          usuario,
          email,
          grupo,
          ativo,
        })
      } else {
        await fechamentoDestinatariosService.criarDestinatario({
          nome,
          usuario,
          email,
          grupo,
          ativo,
        })
      }
      await carregarDestinatarios()
      resetForm()
    } catch (err: any) {
      setErroForm(err.message || 'Erro ao salvar destinatário.')
    } finally {
      setSalvando(false)
    }
  }

  const handleAlternarAtivo = async (d: FechamentoDestinatario) => {
    if (!podeAdministrar) return
    try {
      await fechamentoDestinatariosService.alternarStatus(d.id, !d.ativo)
      await carregarDestinatarios()
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message)
    }
  }

  const listaFiltrada = destinatarios.filter((d) => {
    const matchBusca =
      !busca.trim() ||
      d.nome.toLowerCase().includes(busca.toLowerCase()) ||
      d.email.toLowerCase().includes(busca.toLowerCase()) ||
      (d.usuario && d.usuario.toLowerCase().includes(busca.toLowerCase()))

    const matchGrupo = filtroGrupo === 'TODOS' || d.grupo === filtroGrupo

    return matchBusca && matchGrupo
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Cadastro de Destinatários do Fechamento
                  <Badge className="bg-white/20 text-white text-[10px] font-normal border-0">
                    fechamento_destinatarios
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  Gestão dos grupos Contabilidade e Produção para notificações oficiais
                </p>
              </div>
            </div>

            {podeAdministrar && !exibirForm && (
              <Button
                type="button"
                size="sm"
                onClick={handleIniciarCriacao}
                className="h-8 text-xs bg-white text-[#004C97] hover:bg-blue-50 font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Destinatário
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-800 flex-1">
          {!podeAdministrar && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Modo consulta: Somente Administradores e Gerentes podem incluir ou alterar
                destinatários.
              </span>
            </div>
          )}

          {/* Formulário de Criação/Edição */}
          {exibirForm && (
            <form
              onSubmit={handleSalvar}
              className="p-4 bg-slate-50 border border-[#004C97]/30 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-[#004C97]" />
                  {editandoId ? 'Editar Destinatário' : 'Novo Destinatário'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-6 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </Button>
              </div>

              {erroForm && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{erroForm}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Grupo *</label>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value as DestinatarioGrupo)}
                    className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-300 bg-white"
                  >
                    <option value="Contabilidade">Contabilidade (Grupo 1)</option>
                    <option value="Produção">Produção (Grupo 2)</option>
                    <option value="PCP">PCP</option>
                    <option value="Diretoria">Diretoria</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nome Completo *</label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Ana Paula - Custos"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    E-mail Corporativo *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome.sobrenome@ciafal.com.br"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Usuário do Sistema</label>
                  <Input
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ex: ana.custos"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="rounded text-[#004C97]"
                  />
                  <span className="font-medium text-slate-800">Destinatário Ativo para Envios</span>
                </label>

                <Button
                  type="submit"
                  size="sm"
                  disabled={salvando}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar Destinatário' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          )}

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, usuário ou e-mail..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Grupo:</span>
              <select
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value)}
                className="h-8 px-2 text-xs rounded border border-slate-300 bg-white"
              >
                <option value="TODOS">Todos os Grupos</option>
                <option value="Contabilidade">Contabilidade</option>
                <option value="Produção">Produção</option>
                <option value="PCP">PCP</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </div>
          </div>

          {/* Tabela de Destinatários */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-32">Grupo</th>
                    <th className="p-2.5">Nome</th>
                    <th className="p-2.5">E-mail</th>
                    <th className="p-2.5 w-24">Usuário</th>
                    <th className="p-2.5 w-20 text-center">Status</th>
                    {podeAdministrar && <th className="p-2.5 w-20 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregando ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Carregando registros...
                      </td>
                    </tr>
                  ) : listaFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Nenhum destinatário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    listaFiltrada.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70">
                        <td className="p-2.5">
                          <Badge
                            className={`text-[10px] font-medium ${
                              d.grupo === 'Contabilidade'
                                ? 'bg-blue-100 text-[#004C97] border-blue-200'
                                : d.grupo === 'Produção'
                                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {d.grupo}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900">{d.nome}</td>
                        <td className="p-2.5 font-mono text-slate-600">{d.email}</td>
                        <td className="p-2.5 font-mono text-slate-500">{d.usuario || '-'}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleAlternarAtivo(d)}
                            disabled={!podeAdministrar}
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              d.ativo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {d.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        {podeAdministrar && (
                          <td className="p-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIniciarEdicao(d)}
                              className="h-6 w-6 p-0 text-slate-500 hover:text-[#004C97]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GestaoDestinatariosModal
