import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ResidualBalanceItem } from '../../types/pcp-residual-balances'
import { formatNumberPTBR } from '../../lib/number-format'
import { Layers, Scale, Calendar, AlertTriangle, History, Info } from 'lucide-react'

interface ResidualBalanceDetailModalProps {
  open: boolean
  onClose: () => void
  item: ResidualBalanceItem | null
  onOpenActionModal?: (item: ResidualBalanceItem) => void
  onOpenHistoryModal?: (item: ResidualBalanceItem) => void
}

export const ResidualBalanceDetailModal: React.FC<ResidualBalanceDetailModalProps> = ({
  open,
  onClose,
  item,
  onOpenActionModal,
  onOpenHistoryModal,
}) => {
  if (!item) return null

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return '-'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Detalhamento do Saldo Residual
                </DialogTitle>
                <div className="text-xs text-slate-500">
                  Lote: <span className="font-mono font-semibold text-slate-800">{item.lote}</span>{' '}
                  | Depósito: <span className="font-semibold text-slate-800">{item.deposito}</span>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-semibold uppercase px-2.5 py-1 bg-slate-50"
            >
              {item.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Seção 1: Identificação do Material e Estoque */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Identificação do Material e Depósito
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Depósito:</span>
                <span className="font-bold text-slate-800 text-sm">{item.deposito}</span>
                {item.deposito_nome && (
                  <span className="text-[11px] text-slate-500 block">{item.deposito_nome}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Código Material:</span>
                <span className="font-semibold text-slate-800">{item.material_codigo}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Descrição:</span>
                <span className="font-medium text-slate-800">{item.material_descricao}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Lote:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{item.lote}</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Situação Atual */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-blue-600" />
              Situação Atual e Métricas de Saldo
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Quantidade Atual:</span>
                <span className="text-base font-bold text-slate-900">
                  {formatNumberPTBR(item.quantidade_atual, 0, 3)} {item.unidade_medida}
                </span>
                {item.quantidade_anterior != null && (
                  <span className="text-[11px] text-slate-500 block">
                    Anterior: {formatNumberPTBR(item.quantidade_anterior, 0, 3)}{' '}
                    {item.unidade_medida}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Limite Parametrizado:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {item.limite_parametrizado != null
                    ? `${formatNumberPTBR(item.limite_parametrizado, 0, 2)} ${item.unidade_medida}`
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Diferença do Limite:</span>
                <span className="font-bold text-sm text-red-700">
                  {item.diferenca != null
                    ? `${formatNumberPTBR(item.diferenca, 0, 2)} ${item.unidade_medida}`
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tempo como Residual:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {item.tempo_como_residual_display || '-'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Identificado: {formatDateTimeBR(item.data_identificacao)}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 3: Regra Aplicada e Todas as Regras Atingidas */}
          <div className="border border-blue-100 bg-blue-50/40 p-4 rounded-lg">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-blue-700" />
              Regra Aplicada (Classificação Automática)
            </h4>
            <div className="text-xs text-blue-950 font-medium">
              {item.regra_aplicada_descricao ? (
                <div>
                  <div className="font-bold text-sm text-blue-900 mb-1">
                    {item.regra_aplicada_descricao}
                  </div>
                  <div className="text-xs text-slate-600">
                    Depósito <span className="font-semibold">{item.deposito}</span> — saldo de{' '}
                    <span className="font-semibold">
                      {formatNumberPTBR(item.quantidade_atual, 0, 2)} {item.unidade_medida}
                    </span>{' '}
                    atingiu o critério parametrizado.
                  </div>
                </div>
              ) : (
                <div className="text-slate-500">Nenhuma regra específica registrada.</div>
              )}
            </div>

            {/* Lista de todas as regras atingidas */}
            {item.regras_atingidas && item.regras_atingidas.length > 1 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <span className="text-[11px] font-bold text-blue-900 block mb-1">
                  Outras regras atingidas pelo mesmo saldo ({item.regras_atingidas.length}):
                </span>
                <div className="space-y-1">
                  {item.regras_atingidas.map((r, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-slate-700 flex items-center justify-between bg-white px-2.5 py-1 rounded border border-blue-100"
                    >
                      <span className="font-medium">{r.descricao}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        Criticidade: {r.criticidade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Ação Definida e Responsável */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Ação Recomendada e Governança
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Ação Definida pelo Parâmetro:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {item.acao_recomendada || 'Avaliar consumo / análise PCP'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Responsável Designado:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {item.responsavel_acao || 'PCP / Gestão de Estoques'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Prazo Parametrizado:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {item.prazo_display || 'Conforme criticidade'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé e Ações do Modal */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenHistoryModal && onOpenHistoryModal(item)}
            className="text-xs h-9 flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            <History className="w-4 h-4" />
            Ver Histórico Completo
          </Button>

          <div className="flex items-center gap-2">
            {item.status !== 'REGULARIZADO' && item.status !== 'REGULARIZADO_AUTOMATICO' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenActionModal && onOpenActionModal(item)}
                className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Registrar Ação / Regularizar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
