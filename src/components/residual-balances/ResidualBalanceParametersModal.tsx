import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import {
  ResidualBalanceParameter,
  ResidualBalanceRuleType,
  ResidualBalanceCriticality,
} from '../../types/pcp-residual-balances'
import { ResidualBalancesService } from '../../services/pcp-residual-balances-service'
import { StorageDeposit } from '../../services/pcp-storage-deposits-service'
import { formatNumberPTBR } from '../../lib/number-format'
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react'

interface ResidualBalanceParametersModalProps {
  open: boolean
  onClose: () => void
  deposits: StorageDeposit[]
  onSuccessNotification: (msg: string) => void
}

const ACTION_SUGGESTIONS = [
  'Avaliar consumo em nova ordem',
  'Transferir para outro depósito',
  'Priorizar consumo',
  'Solicitar análise do PCP',
  'Solicitar análise da Qualidade',
  'Regularização de estoque',
  'Outra ação',
]

export const ResidualBalanceParametersModal: React.FC<ResidualBalanceParametersModalProps> = ({
  open,
  onClose,
  deposits,
  onSuccessNotification,
}) => {
  const [parameters, setParameters] = useState<ResidualBalanceParameter[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<ResidualBalanceParameter | null>(null)

  // Campos do formulário
  const [deposito, setDeposito] = useState(deposits[0]?.code || 'DP07')
  const [descricao, setDescricao] = useState('')
  const [tipoRegra, setTipoRegra] = useState<ResidualBalanceRuleType>('MENOR_OU_IGUAL')
  const [quantidade, setQuantidade] = useState<number | ''>(500)
  const [quantidadeMin, setQuantidadeMin] = useState<number | ''>(0)
  const [quantidadeMax, setQuantidadeMax] = useState<number | ''>(500)
  const [unidadeMedida, setUnidadeMedida] = useState('kg')
  const [acaoRecomendada, setAcaoRecomendada] = useState('Priorizar consumo')
  const [acaoDetalhe, setAcaoDetalhe] = useState('')
  const [responsavelAcao, setResponsavelAcao] = useState('PCP / Programação')
  const [prazoValor, setPrazoValor] = useState<number | ''>(24)
  const [prazoUnidade, setPrazoUnidade] = useState<'HORAS' | 'DIAS'>('HORAS')
  const [criticidade, setCriticidade] = useState<ResidualBalanceCriticality>('ALTA')
  const [ativo, setAtivo] = useState(true)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      loadParameters()
    }
  }, [open])

  const loadParameters = async () => {
    setLoading(true)
    try {
      const data = await ResidualBalancesService.getParameters(true) // inclui inativos
      setParameters(data)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingParam(null)
    setDeposito(deposits[0]?.code || 'DP07')
    setDescricao('')
    setTipoRegra('MENOR_OU_IGUAL')
    setQuantidade(500)
    setQuantidadeMin(0)
    setQuantidadeMax(500)
    setUnidadeMedida('kg')
    setAcaoRecomendada('Priorizar consumo')
    setAcaoDetalhe('')
    setResponsavelAcao('PCP / Programação')
    setPrazoValor(24)
    setPrazoUnidade('HORAS')
    setCriticidade('ALTA')
    setAtivo(true)
    setErrorMsg('')
    setFormOpen(true)
  }

  const handleEdit = (param: ResidualBalanceParameter) => {
    setEditingParam(param)
    setDeposito(param.deposito)
    setDescricao(param.descricao)
    setTipoRegra(param.tipo_regra)
    setQuantidade(param.quantidade != null ? param.quantidade : '')
    setQuantidadeMin(param.quantidade_min != null ? param.quantidade_min : '')
    setQuantidadeMax(param.quantidade_max != null ? param.quantidade_max : '')
    setUnidadeMedida(param.unidade_medida || 'kg')
    setAcaoRecomendada(param.acao_recomendada)
    setAcaoDetalhe(param.acao_detalhe || '')
    setResponsavelAcao(param.responsavel_acao || '')
    setPrazoValor(param.prazo_valor != null ? param.prazo_valor : '')
    setPrazoUnidade(param.prazo_unidade || 'HORAS')
    setCriticidade(param.criticidade)
    setAtivo(param.ativo)
    setErrorMsg('')
    setFormOpen(true)
  }

  const handleToggleAtivo = async (param: ResidualBalanceParameter) => {
    try {
      await ResidualBalancesService.saveParameter({
        ...param,
        ativo: !param.ativo,
      })
      onSuccessNotification(
        `Parâmetro "${param.descricao}" ${!param.ativo ? 'ativado' : 'inativado'} com sucesso.`,
      )
      loadParameters()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do parâmetro.')
    }
  }

  const handleDelete = async (param: ResidualBalanceParameter) => {
    const confirmDelete = window.confirm(
      `Excluir o parâmetro "${param.descricao}" do depósito ${param.deposito}?\n(Exclusão lógica preserva o histórico de classificações passadas)`,
    )
    if (!confirmDelete) return

    try {
      const res = await ResidualBalancesService.deleteParameter(param.id)
      if (res.success) {
        onSuccessNotification(res.message)
        loadParameters()
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir parâmetro.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!deposito || !descricao.trim() || !tipoRegra || !acaoRecomendada.trim()) {
      setErrorMsg('Preencha os campos obrigatórios marcados com *.')
      return
    }

    if (tipoRegra === 'FAIXA_QUANTIDADE') {
      if (quantidadeMin === '' || quantidadeMax === '') {
        setErrorMsg('Informe os valores mínimo e máximo da faixa.')
        return
      }
      if (Number(quantidadeMin) > Number(quantidadeMax)) {
        setErrorMsg('O valor mínimo da faixa não pode ser maior que o valor máximo.')
        return
      }
    } else {
      if (quantidade === '' || isNaN(Number(quantidade))) {
        setErrorMsg('Informe o valor numérico da quantidade/volume.')
        return
      }
    }

    setSaving(true)
    try {
      const depMeta = deposits.find((d) => d.code === deposito)
      const res = await ResidualBalancesService.saveParameter({
        id: editingParam?.id,
        deposito: deposito.toUpperCase(),
        deposito_nome: depMeta?.name || '',
        descricao: descricao.trim(),
        tipo_regra: tipoRegra,
        quantidade: tipoRegra !== 'FAIXA_QUANTIDADE' ? Number(quantidade) : undefined,
        quantidade_min: tipoRegra === 'FAIXA_QUANTIDADE' ? Number(quantidadeMin) : undefined,
        quantidade_max: tipoRegra === 'FAIXA_QUANTIDADE' ? Number(quantidadeMax) : undefined,
        unidade_medida: unidadeMedida.trim().toLowerCase(),
        acao_recomendada: acaoRecomendada.trim(),
        acao_detalhe: acaoDetalhe.trim(),
        responsavel_acao: responsavelAcao.trim(),
        prazo_valor: prazoValor !== '' ? Number(prazoValor) : 0,
        prazo_unidade: prazoUnidade,
        criticidade,
        ativo,
      })

      if (res.success) {
        onSuccessNotification(res.message)
        setFormOpen(false)
        loadParameters()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar parâmetro.')
    } finally {
      setSaving(false)
    }
  }

  const renderRuleText = (param: ResidualBalanceParameter) => {
    const unit = param.unidade_medida
    switch (param.tipo_regra) {
      case 'MENOR_OU_IGUAL':
        return `Qtd ≤ ${formatNumberPTBR(param.quantidade, 0, 2)} ${unit}`
      case 'MENOR_QUE':
        return `Qtd < ${formatNumberPTBR(param.quantidade, 0, 2)} ${unit}`
      case 'MAIOR_OU_IGUAL':
        return `Qtd ≥ ${formatNumberPTBR(param.quantidade, 0, 2)} ${unit}`
      case 'MAIOR_QUE':
        return `Qtd > ${formatNumberPTBR(param.quantidade, 0, 2)} ${unit}`
      case 'FAIXA_QUANTIDADE':
        return `${formatNumberPTBR(param.quantidade_min, 0, 2)} a ${formatNumberPTBR(param.quantidade_max, 0, 2)} ${unit}`
      default:
        return '-'
    }
  }

  const renderCriticalityBadge = (crit: ResidualBalanceCriticality) => {
    switch (crit) {
      case 'CRITICA':
        return (
          <Badge className="bg-red-600 text-white border-none text-[10px] uppercase font-bold">
            Crítica
          </Badge>
        )
      case 'ALTA':
        return (
          <Badge className="bg-orange-500 text-white border-none text-[10px] uppercase font-bold">
            Alta
          </Badge>
        )
      case 'MEDIA':
        return (
          <Badge className="bg-amber-500 text-white border-none text-[10px] uppercase font-bold">
            Média
          </Badge>
        )
      case 'BAIXA':
      default:
        return (
          <Badge className="bg-slate-500 text-white border-none text-[10px] uppercase font-bold">
            Baixa
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-white p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Parâmetros de Saldos Residuais
              </DialogTitle>
              <div className="text-xs text-slate-500">
                Configuração de regras por depósito e criticidade de tratamento
              </div>
            </div>
          </div>
          {!formOpen && (
            <Button
              size="sm"
              onClick={handleOpenNew}
              className="text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Parâmetro
            </Button>
          )}
        </DialogHeader>

        <div className="py-2">
          {formOpen ? (
            /* Formulário de Criação / Edição de Parâmetro */
            <form
              onSubmit={handleSave}
              className="space-y-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-sm text-slate-800">
                  {editingParam ? 'Editar Parâmetro Existente' : 'Cadastrar Novo Parâmetro'}
                </span>
                <span className="text-slate-500 text-[11px]">* Campos obrigatórios</span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Depósito */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Depósito *</label>
                  <select
                    value={deposito}
                    onChange={(e) => setDeposito(e.target.value)}
                    required
                    className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                  >
                    {deposits.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descrição do Parâmetro */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descrição do Parâmetro *
                  </label>
                  <Input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Saldo residual mínimo DP07 (Laminação)"
                    required
                    className="text-xs h-9"
                  />
                </div>

                {/* Tipo de Regra */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Regra *</label>
                  <select
                    value={tipoRegra}
                    onChange={(e) => setTipoRegra(e.target.value as ResidualBalanceRuleType)}
                    required
                    className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="MENOR_OU_IGUAL">Quantidade menor ou igual a (≤)</option>
                    <option value="MENOR_QUE">Quantidade menor que (&lt;)</option>
                    <option value="MAIOR_OU_IGUAL">Quantidade maior ou igual a (≥)</option>
                    <option value="MAIOR_QUE">Quantidade maior que (&gt;)</option>
                    <option value="FAIXA_QUANTIDADE">Faixa de quantidade (Mínimo e Máximo)</option>
                  </select>
                </div>

                {/* Volume / Quantidade / Faixa */}
                {tipoRegra === 'FAIXA_QUANTIDADE' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Valor Mínimo *
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={quantidadeMin}
                        onChange={(e) =>
                          setQuantidadeMin(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        required
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Valor Máximo *
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={quantidadeMax}
                        onChange={(e) =>
                          setQuantidadeMax(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        required
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Volume / Quantidade Limite *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={quantidade}
                      onChange={(e) =>
                        setQuantidade(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      required
                      placeholder="Ex: 500"
                      className="text-xs h-9"
                    />
                  </div>
                )}

                {/* Unidade de Medida */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value)}
                    required
                    className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="t">t (Toneladas)</option>
                    <option value="un">un (Unidades / Peças)</option>
                    <option value="m">m (Metros)</option>
                  </select>
                </div>

                {/* Ação Recomendada */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ação para Saldo Residual *
                  </label>
                  <Input
                    type="text"
                    value={acaoRecomendada}
                    onChange={(e) => setAcaoRecomendada(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ACTION_SUGGESTIONS.map((sug, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        onClick={() => setAcaoRecomendada(sug)}
                        className="cursor-pointer text-[10px] bg-white hover:bg-slate-100 text-slate-700"
                      >
                        + {sug}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Responsável pela Ação */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsável pela Ação
                  </label>
                  <Input
                    type="text"
                    value={responsavelAcao}
                    onChange={(e) => setResponsavelAcao(e.target.value)}
                    placeholder="Ex: PCP / Programador Laminação"
                    className="text-xs h-9"
                  />
                </div>

                {/* Prazo */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Prazo Tratamento
                    </label>
                    <Input
                      type="number"
                      value={prazoValor}
                      onChange={(e) =>
                        setPrazoValor(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="Ex: 24"
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unidade Prazo</label>
                    <select
                      value={prazoUnidade}
                      onChange={(e) => setPrazoUnidade(e.target.value as any)}
                      className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                    >
                      <option value="HORAS">Horas</option>
                      <option value="DIAS">Dias</option>
                    </select>
                  </div>
                </div>

                {/* Criticidade */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Criticidade *</label>
                  <select
                    value={criticidade}
                    onChange={(e) => setCriticidade(e.target.value as ResidualBalanceCriticality)}
                    required
                    className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="CRITICA">Crítica (Prioridade Máxima)</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>

                {/* Ativo */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status do Parâmetro
                  </label>
                  <select
                    value={ativo ? 'ATIVO' : 'INATIVO'}
                    onChange={(e) => setAtivo(e.target.value === 'ATIVO')}
                    className="w-full text-xs h-9 border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="ATIVO">Ativo (Entra na classificação automática)</option>
                    <option value="INATIVO">Inativo (Desabilitado)</option>
                  </select>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {saving ? 'Gravando...' : 'Salvar Parâmetro'}
                </Button>
              </div>
            </form>
          ) : (
            /* Tabela de Parâmetros */
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3">Depósito</th>
                    <th className="py-2.5 px-3">Parâmetro</th>
                    <th className="py-2.5 px-3">Regra</th>
                    <th className="py-2.5 px-3">Ação</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Prazo</th>
                    <th className="py-2.5 px-3">Criticidade</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Carregando parâmetros...
                      </td>
                    </tr>
                  ) : parameters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Nenhum parâmetro cadastrado no momento. Clique em "+ Novo Parâmetro".
                      </td>
                    </tr>
                  ) : (
                    parameters.map((param) => (
                      <tr
                        key={param.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          !param.ativo ? 'opacity-60 bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {param.deposito}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 max-w-[180px] truncate">
                          {param.descricao}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {renderRuleText(param)}
                        </td>
                        <td className="py-2 px-3 max-w-[160px] truncate text-slate-700">
                          {param.acao_recomendada}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {param.responsavel_acao || '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {param.prazo_valor != null && param.prazo_valor > 0
                            ? `${param.prazo_valor} ${param.prazo_unidade === 'DIAS' ? 'dias' : 'h'}`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {renderCriticalityBadge(param.criticidade)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {param.ativo ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-semibold"
                            >
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(param)}
                              title="Editar Parâmetro"
                              className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleAtivo(param)}
                              title={param.ativo ? 'Inativar' : 'Ativar'}
                              className={`h-7 px-2 text-xs ${
                                param.ativo
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {param.ativo ? 'Inativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(param)}
                              title="Excluir Parâmetro"
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>
              <strong>Critério de Prioridade:</strong> Maior criticidade prevalece. Em empate, a
              regra mais específica tem precedência.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
