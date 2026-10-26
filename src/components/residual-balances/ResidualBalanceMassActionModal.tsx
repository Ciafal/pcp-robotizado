import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ResidualBalanceItem, MassRegularizeResponse } from '../../types/pcp-residual-balances'
import { ResidualBalancesService } from '../../services/pcp-residual-balances-service'
import { formatNumberPTBR } from '../../lib/number-format'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  FileCheck,
  ShieldAlert,
} from 'lucide-react'

// As opções permitidas vêm EXATAMENTE das regras já existentes no tratamento individual e parâmetros:
export const ALLOWED_MASS_ACTIONS = [
  'Regularização de estoque',
  'Priorizar consumo',
  'Avaliar consumo em nova ordem',
  'Transferir para outro depósito',
  'Solicitar análise do PCP',
  'Solicitar análise da Qualidade',
] as const

interface ResidualBalanceMassActionModalProps {
  open: boolean
  onClose: () => void
  selectedItems: ResidualBalanceItem[]
  onSuccess: (result: MassRegularizeResponse) => void
}

export const ResidualBalanceMassActionModal: React.FC<ResidualBalanceMassActionModalProps> = ({
  open,
  onClose,
  selectedItems,
  onSuccess,
}) => {
  // Estados do formulário
  const [acaoRealizada, setAcaoRealizada] = useState<string>('Regularização de estoque')
  const [motivo, setMotivo] = useState<string>(
    'Regularização dos saldos residuais identificados após fechamento das ordens de produção.',
  )
  const [observacao, setObservacao] = useState<string>('')
  const [responsavel, setResponsavel] = useState<string>('PCP / Programação')

  // Estado do fluxo: 'FORM' | 'CONFIRM' | 'PROCESSING' | 'RESULT'
  const [step, setStep] = useState<'FORM' | 'CONFIRM' | 'PROCESSING' | 'RESULT'>('FORM')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<MassRegularizeResponse | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Resumo dos selecionados
  const summary = useMemo(() => {
    const totalCount = selectedItems.length
    const totalVolume = selectedItems.reduce((acc, it) => acc + (it.quantidade_atual || 0), 0)
    const unit = selectedItems[0]?.unidade_medida || 'kg'
    const uniqueDeposits = Array.from(new Set(selectedItems.map((it) => it.deposito))).filter(
      Boolean,
    )
    const uniqueMaterials = Array.from(
      new Set(selectedItems.map((it) => it.material_codigo)),
    ).filter(Boolean)

    // Validação de elegibilidade individual de cada registro
    const alreadyRegularized = selectedItems.filter(
      (it) => it.status === 'REGULARIZADO' || it.status === 'REGULARIZADO_AUTOMATICO',
    )

    return {
      totalCount,
      totalVolume,
      unit,
      uniqueDeposits,
      uniqueMaterials,
      alreadyRegularized,
    }
  }, [selectedItems])

  // Resetar estado quando abrir modal
  React.useEffect(() => {
    if (open) {
      setAcaoRealizada('Regularização de estoque')
      setMotivo(
        'Regularização dos saldos residuais identificados após fechamento das ordens de produção.',
      )
      setObservacao('')
      setResponsavel('PCP / Programação')
      setStep('FORM')
      setIsSubmitting(false)
      setExecutionResult(null)
      setValidationError(null)
    }
  }, [open])

  // Validar antes de avançar para tela de confirmação
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (selectedItems.length === 0) {
      setValidationError('Nenhum saldo residual selecionado.')
      return
    }

    if (!acaoRealizada.trim()) {
      setValidationError('Selecione uma Ação obrigatória.')
      return
    }

    if (!motivo.trim()) {
      setValidationError('Preencha o Motivo / Justificativa obrigatório.')
      return
    }

    // Validação estrita: se há itens já regularizados
    if (summary.alreadyRegularized.length > 0) {
      const lotes = summary.alreadyRegularized.map((it) => `${it.deposito}/${it.lote}`).join(', ')
      setValidationError(
        `Os seguintes registros já se encontram Regularizados e não podem ser processados novamente: ${lotes}.`,
      )
      return
    }

    setStep('CONFIRM')
  }

  // Executar regularização definitiva
  const handleExecute = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setStep('PROCESSING')
    setValidationError(null)

    try {
      const res = await ResidualBalancesService.executeMassRegularization({
        items: selectedItems,
        acaoRealizada: acaoRealizada.trim(),
        motivo: motivo.trim(),
        observacao: observacao.trim() || undefined,
        responsavel: responsavel.trim() || undefined,
      })

      setExecutionResult(res)
      setStep('RESULT')
      onSuccess(res)
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao executar regularização em massa.')
      setStep('FORM')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] bg-white p-6 max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Regularização de Saldos Residuais
              </DialogTitle>
              <div className="text-xs text-slate-500">
                HUB CIAFAL / PCP Robotizado — Operação em lote auditada e idempotente
              </div>
            </div>
          </div>
        </DialogHeader>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium flex items-center gap-2 my-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. ETAPA FORMULÁRIO PRINCIPAL */}
        {step === 'FORM' && (
          <form onSubmit={handleProceedToConfirm} className="space-y-4 pt-2 text-xs">
            {/* Bloco de Indicadores dos Selecionados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Registros Selecionados:</span>
                <span className="text-sm font-bold text-slate-900">
                  {summary.totalCount} {summary.totalCount === 1 ? 'saldo' : 'saldos'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Volume Total:</span>
                <span className="text-sm font-bold text-blue-900">
                  {formatNumberPTBR(summary.totalVolume, 0, 2)} {summary.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Depósitos Envolvidos:</span>
                <span className="text-sm font-bold text-slate-800">
                  {summary.uniqueDeposits.length} ({summary.uniqueDeposits.join(', ') || '-'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Materiais Envolvidos:</span>
                <span className="text-sm font-bold text-slate-800">
                  {summary.uniqueMaterials.length} distintos
                </span>
              </div>
            </div>

            {/* Tabela Resumo dos Selecionados */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-800 text-xs">
                  Resumo dos Saldos Selecionados ({selectedItems.length}):
                </span>
                <span className="text-[11px] text-slate-500">
                  Revise os itens que receberão a ação
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Depósito</th>
                      <th className="py-2 px-2.5">Material</th>
                      <th className="py-2 px-2.5">Descrição</th>
                      <th className="py-2 px-2.5">Lote</th>
                      <th className="py-2 px-2.5 text-right">Quantidade</th>
                      <th className="py-2 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {it.deposito}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {it.material_codigo}
                        </td>
                        <td className="py-1.5 px-2.5 max-w-[200px] truncate text-slate-600">
                          {it.material_descricao || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                          {it.lote}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatNumberPTBR(it.quantidade_atual, 0, 3)} {it.unidade_medida}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
                          >
                            {it.status === 'REGULARIZADO'
                              ? 'Regularizado'
                              : it.status === 'EM_TRATAMENTO'
                                ? 'Em tratamento'
                                : it.status === 'ACAO_NECESSARIA'
                                  ? 'Ação necessária'
                                  : 'Identificado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campo Obrigatório: Ação */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Ação de Regularização *
              </label>
              <select
                value={acaoRealizada}
                onChange={(e) => setAcaoRealizada(e.target.value)}
                required
                className="w-full text-xs h-9 border border-slate-300 rounded-md px-3 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-blue-600"
              >
                {ALLOWED_MASS_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Ação institucional padronizada do módulo de saldos residuais.
              </span>
            </div>

            {/* Campo Obrigatório: Motivo / Justificativa */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Motivo / Justificativa *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                rows={3}
                placeholder="Informe a justificativa técnica para regularização dos saldos em lote..."
                className="w-full text-xs border border-slate-300 rounded-md p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                A mesma justificativa é registrada individualmente no histórico e auditoria de cada
                saldo.
              </span>
            </div>

            {/* Campos Opcionais: Responsável e Observação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsável</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do analista ou equipe"
                  className="w-full text-xs h-9 border border-slate-300 rounded-md px-3 bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observação Complementar (Opcional)
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Alinhado com supervisão do turno 1"
                  className="w-full text-xs h-9 border border-slate-300 rounded-md px-3 bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Rodapé Form */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Avançar para Confirmação
              </Button>
            </div>
          </form>
        )}

        {/* 2. ETAPA DIÁLOGO DE CONFIRMAÇÃO */}
        {step === 'CONFIRM' && (
          <div className="space-y-4 pt-3 text-xs">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <HelpCircle className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-blue-950">
                  Confirmar regularização em massa?
                </h3>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Você está prestes a regularizar{' '}
                  <strong>
                    {summary.totalCount}{' '}
                    {summary.totalCount === 1 ? 'saldo residual' : 'saldos residuais'}
                  </strong>
                  , totalizando{' '}
                  <strong>
                    {formatNumberPTBR(summary.totalVolume, 0, 2)} {summary.unit}
                  </strong>
                  . Esta ação será registrada no histórico e nos logs de auditoria.
                </p>
              </div>
            </div>

            {/* Detalhes da Execução Planejada */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Ação a Aplicar:</span>
                  <span className="font-bold text-slate-900">{acaoRealizada}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Novo Status:</span>
                  <Badge className="bg-emerald-600 text-white border-none text-[10px] font-semibold">
                    REGULARIZADO
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Responsável:</span>
                  <span className="font-medium text-slate-800">{responsavel}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px]">Justificativa Técnica:</span>
                <span className="text-slate-800 italic block mt-0.5">{motivo}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('FORM')}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecute}
                disabled={isSubmitting}
                className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmar regularização
              </Button>
            </div>
          </div>
        )}

        {/* 3. ETAPA PROCESSANDO REGULARIZAÇÃO */}
        {step === 'PROCESSING' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RotateCw className="w-8 h-8 text-blue-700 animate-spin" />
            <h3 className="text-sm font-bold text-slate-900">Processando regularização...</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Validando atomicidade de cada saldo, gerando histórico e gravando trilha de auditoria
              oficial...
            </p>
          </div>
        )}

        {/* 4. ETAPA RESULTADO APÓS EXECUÇÃO */}
        {step === 'RESULT' && executionResult && (
          <div className="space-y-4 pt-2 text-xs">
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                executionResult.summary.nao_processados === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : executionResult.summary.regularizados > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              {executionResult.summary.nao_processados === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : executionResult.summary.regularizados > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h3 className="text-sm font-bold">
                  Regularização concluída (Lote: {executionResult.batch_id})
                </h3>
                <p className="text-xs leading-relaxed">
                  Total de registros:{' '}
                  <strong>{executionResult.summary.total_processados} processados</strong> (
                  <strong>{executionResult.summary.regularizados} regularizados</strong>,{' '}
                  <strong>{executionResult.summary.nao_processados} não processados</strong>).
                </p>
              </div>
            </div>

            {/* Tabela do Resultado */}
            <div>
              <span className="font-semibold text-slate-800 text-xs mb-1.5 block">
                Detalhamento dos Resultados por Registro:
              </span>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Depósito</th>
                      <th className="py-2 px-2.5">Material</th>
                      <th className="py-2 px-2.5">Lote</th>
                      <th className="py-2 px-2.5">Resultado</th>
                      <th className="py-2 px-2.5">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {executionResult.results.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {res.deposito}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                          {res.material_codigo}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                          {res.lote}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          {res.success ? (
                            <Badge className="bg-emerald-600 text-white border-none text-[10px] font-semibold">
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white border-none text-[10px] font-semibold">
                              Não processado
                            </Badge>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600">{res.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botão de Fechar */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
