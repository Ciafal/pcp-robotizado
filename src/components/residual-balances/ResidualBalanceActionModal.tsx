import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ResidualBalanceItem, ResidualBalanceStatus } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import { ResidualBalancesService } from '../../services/pcp-residual-balances-service'
import { CheckCircle2, AlertTriangle, Send } from 'lucide-react'

interface ResidualBalanceActionModalProps {
  open: boolean
  onClose: () => void
  item: ResidualBalanceItem | null
  mode?: 'TREAT' | 'REGULARIZE'
  onSuccess: (message: string) => void
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

export const ResidualBalanceActionModal: React.FC<ResidualBalanceActionModalProps> = ({
  open,
  onClose,
  item,
  mode = 'TREAT',
  onSuccess,
}) => {
  const isRegularizeMode = mode === 'REGULARIZE'

  const [acaoRealizada, setAcaoRealizada] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [novoStatus, setNovoStatus] = useState<ResidualBalanceStatus>(
    isRegularizeMode ? 'REGULARIZADO' : 'EM_TRATAMENTO',
  )
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Sincronizar estado quando o item mudar
  React.useEffect(() => {
    if (item) {
      setAcaoRealizada(isRegularizeMode ? 'Regularização de estoque' : item.acao_recomendada || '')
      setResponsavel(item.responsavel_acao || '')
      setNovoStatus(isRegularizeMode ? 'REGULARIZADO' : 'EM_TRATAMENTO')
      setObservacao('')
      setErrorMsg('')
    }
  }, [item, isRegularizeMode])

  if (!item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!acaoRealizada.trim()) {
      setErrorMsg('Informe a ação realizada.')
      return
    }

    if (!responsavel.trim()) {
      setErrorMsg('Informe o responsável pela ação.')
      return
    }

    setLoading(true)

    try {
      const res = await ResidualBalancesService.registerAction({
        saldoId: item.id,
        deposito: item.deposito,
        materialCodigo: item.material_codigo,
        materialDescricao: item.material_descricao,
        lote: item.lote,
        quantidadeResidual: item.quantidade_atual,
        unidadeMedida: item.unidade_medida,
        regraAplicada: item.regra_aplicada_descricao,
        acaoPrevista: item.acao_recomendada,
        acaoRealizada: acaoRealizada.trim(),
        responsavel: responsavel.trim(),
        statusNovo: novoStatus,
        observacao: observacao.trim(),
      })

      if (res.success) {
        onSuccess(res.message)
        onClose()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar ação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isRegularizeMode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isRegularizeMode ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isRegularizeMode ? 'Regularizar Saldo Residual' : 'Registrar Tratamento do Saldo'}
              </DialogTitle>
              <div className="text-xs text-slate-500">
                Depósito: <span className="font-semibold text-slate-800">{item.deposito}</span> |
                Lote: <span className="font-mono font-semibold text-slate-800">{item.lote}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Dados de Leitura do Saldo */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-500 block text-[11px]">Material:</span>
              <span className="font-bold text-slate-900">{item.material_codigo}</span>
              <span className="text-[11px] text-slate-500 block truncate">
                {item.material_descricao}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Quantidade Residual:</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatNumberPTBR(item.quantidade_atual, 0, 3)} {item.unidade_medida}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Regra Aplicada:</span>
              <span className="font-medium text-slate-800 truncate block">
                {item.regra_aplicada_descricao || 'Critério padrão'}
              </span>
            </div>
          </div>

          {/* Ação Prevista pelo Parâmetro */}
          {item.acao_recomendada && (
            <div className="bg-blue-50/60 p-2.5 rounded border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-900 block">
                Ação Prevista pelo Parâmetro:
              </span>
              <span className="text-xs text-blue-950 font-medium">{item.acao_recomendada}</span>
            </div>
          )}

          {/* Campo: Ação Realizada */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ação Realizada *</label>
            <div className="space-y-1.5">
              <Input
                type="text"
                value={acaoRealizada}
                onChange={(e) => setAcaoRealizada(e.target.value)}
                placeholder="Descreva a ação adotada para o saldo"
                required
                className="text-xs h-9"
              />
              <div className="flex flex-wrap gap-1">
                {ACTION_SUGGESTIONS.map((sug, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    onClick={() => setAcaoRealizada(sug)}
                    className="cursor-pointer text-[10px] bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                  >
                    + {sug}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Grid: Responsável e Novo Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Responsável *</label>
              <Input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do analista / operador"
                required
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Novo Status *</label>
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value as ResidualBalanceStatus)}
                className="w-full text-xs h-9 border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="EM_TRATAMENTO">Em tratamento</option>
                <option value="ACAO_NECESSARIA">Ação necessária</option>
                <option value="REGULARIZADO">Regularizado (Quitação formal)</option>
              </select>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observações / Justificativa
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais para histórico e auditoria..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className={`text-xs h-9 font-semibold text-white flex items-center gap-1.5 shadow-sm ${
                isRegularizeMode
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {loading
                ? 'Processando...'
                : isRegularizeMode
                  ? 'Confirmar Regularização'
                  : 'Salvar Tratamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
