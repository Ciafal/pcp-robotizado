/**
 * Modal de Configuração de Parâmetros de Saldo Residual
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 *
 * Parâmetro 1: Saldo do Pedido (t) [MENOR, MENOR_IGUAL, MAIOR, MAIOR_IGUAL, ENTRE]
 * Parâmetro 2: Percentual de Saldo (%) [MENOR, MENOR_IGUAL, MAIOR, MAIOR_IGUAL, ENTRE]
 * Parâmetro 3: Relação lógica E / OU
 * Ações: Salvar, Editar, Restaurar padrão, Aplicar filtros, Cancelar
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SlidersHorizontal,
  RotateCcw,
  Save,
  CheckCircle2,
  Info,
  Scale,
  Percent,
  GitBranch,
} from 'lucide-react'
import {
  ParametrosSaldoResidual,
  PARAMETROS_SALDO_RESIDUAL_PADRAO,
  OperadorComparacao,
  RelacaoLogica,
} from '@/types/pcp-pedidos-carteira'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import { toast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  parametrosAtuais: ParametrosSaldoResidual
  onSalvar: (novos: ParametrosSaldoResidual) => void
  onAplicarSemSalvar?: (temporarios: ParametrosSaldoResidual) => void
}

export const ParametrosSaldoResidualModal: React.FC<Props> = ({
  isOpen,
  onClose,
  parametrosAtuais,
  onSalvar,
  onAplicarSemSalvar,
}) => {
  const [salvando, setSalvando] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(true)

  // Form State
  const [operadorSaldo, setOperadorSaldo] = useState<OperadorComparacao>(
    parametrosAtuais.operador_saldo || 'MENOR_IGUAL',
  )
  const [valorSaldo, setValorSaldo] = useState<string>(
    String(parametrosAtuais.valor_saldo_t ?? 2.0),
  )
  const [valorSaldoMax, setValorSaldoMax] = useState<string>(
    parametrosAtuais.valor_saldo_max_t !== undefined
      ? String(parametrosAtuais.valor_saldo_max_t)
      : '',
  )

  const [operadorPercentual, setOperadorPercentual] = useState<OperadorComparacao>(
    parametrosAtuais.operador_percentual || 'MENOR_IGUAL',
  )
  const [valorPercentual, setValorPercentual] = useState<string>(
    String(parametrosAtuais.valor_percentual ?? 5.0),
  )
  const [valorPercentualMax, setValorPercentualMax] = useState<string>(
    parametrosAtuais.valor_percentual_max !== undefined
      ? String(parametrosAtuais.valor_percentual_max)
      : '',
  )

  const [relacaoLogica, setRelacaoLogica] = useState<RelacaoLogica>(
    parametrosAtuais.relacao_logica || 'OU',
  )
  const [justificativa, setJustificativa] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setOperadorSaldo(parametrosAtuais.operador_saldo || 'MENOR_IGUAL')
      setValorSaldo(String(parametrosAtuais.valor_saldo_t ?? 2.0))
      setValorSaldoMax(
        parametrosAtuais.valor_saldo_max_t !== undefined
          ? String(parametrosAtuais.valor_saldo_max_t)
          : '',
      )
      setOperadorPercentual(parametrosAtuais.operador_percentual || 'MENOR_IGUAL')
      setValorPercentual(String(parametrosAtuais.valor_percentual ?? 5.0))
      setValorPercentualMax(
        parametrosAtuais.valor_percentual_max !== undefined
          ? String(parametrosAtuais.valor_percentual_max)
          : '',
      )
      setRelacaoLogica(parametrosAtuais.relacao_logica || 'OU')
      setJustificativa('')
      setModoEdicao(true)
    }
  }, [isOpen, parametrosAtuais])

  const construirObjetoParametros = (): ParametrosSaldoResidual => {
    return {
      operador_saldo: operadorSaldo,
      valor_saldo_t: parseFloat(valorSaldo.replace(',', '.')) || 0,
      valor_saldo_max_t:
        operadorSaldo === 'ENTRE'
          ? parseFloat(valorSaldoMax.replace(',', '.')) || undefined
          : undefined,
      operador_percentual: operadorPercentual,
      valor_percentual: parseFloat(valorPercentual.replace(',', '.')) || 0,
      valor_percentual_max:
        operadorPercentual === 'ENTRE'
          ? parseFloat(valorPercentualMax.replace(',', '.')) || undefined
          : undefined,
      relacao_logica: relacaoLogica,
      ativo: true,
      justificativa: justificativa.trim() || undefined,
    }
  }

  const handleRestaurarPadrao = async () => {
    setSalvando(true)
    try {
      const padrao = await PcpPedidosCarteiraService.restaurarPadroes()
      onSalvar(padrao)
      toast({
        title: 'Parâmetros Restaurados',
        description: 'Os valores padrão da CIAFAL foram aplicados com sucesso.',
      })
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar',
        description: err?.message || 'Falha na persistência dos padrões.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarBanco = async () => {
    const obj = construirObjetoParametros()
    setSalvando(true)
    try {
      const salvo = await PcpPedidosCarteiraService.salvarParametros(obj, justificativa)
      onSalvar(salvo)
      toast({
        title: 'Parâmetros Salvos no Banco',
        description:
          'As novas regras de corte para saldos residuais foram persistidas com auditoria.',
      })
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao persistir parâmetros.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleAplicarFiltrosTemporarios = () => {
    const obj = construirObjetoParametros()
    if (onAplicarSemSalvar) {
      onAplicarSemSalvar(obj)
    } else {
      onSalvar(obj)
    }
    toast({
      title: 'Filtros Aplicados',
      description: 'Critérios aplicados à visualização da tela atual.',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-[#004C97] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <SlidersHorizontal className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                Parâmetros de Corte de Saldo Residual
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-xs mt-1">
                Configure os limites matemáticos e a relação lógica para identificar pequenos saldos
                remanescentes na carteira.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Card explicativo padrão CIAFAL */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#004C97] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#004C97] block mb-1">
                Regra Canônica de Saldo Residual CIAFAL:
              </span>
              <span>
                Por padrão da engenharia de PCP, itens com <strong>Saldo &le; 2,00 t</strong>{' '}
                <strong>OU</strong> <strong>Percentual Residual &le; 5,00%</strong> são
                classificados como saldos residuais. Esses itens geram travas desnecessárias de
                capacidade nas linhas de laminação e devem ser encaminhados ao CRM 360° para análise
                comercial.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PARÂMETRO 1: Saldo do Pedido (t) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
                <Scale className="w-4 h-4 text-[#004C97]" />
                Parâmetro 1 — Saldo do Pedido (t)
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Operador</Label>
                <Select
                  value={operadorSaldo}
                  onValueChange={(v: OperadorComparacao) => setOperadorSaldo(v)}
                  disabled={!modoEdicao}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENOR">Menor que (&lt;)</SelectItem>
                    <SelectItem value="MENOR_IGUAL">Menor ou igual (&le;)</SelectItem>
                    <SelectItem value="MAIOR">Maior que (&gt;)</SelectItem>
                    <SelectItem value="MAIOR_IGUAL">Maior ou igual (&ge;)</SelectItem>
                    <SelectItem value="ENTRE">Entre (faixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">
                    {operadorSaldo === 'ENTRE' ? 'Mínimo (t)' : 'Valor (t)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorSaldo}
                    onChange={(e) => setValorSaldo(e.target.value)}
                    disabled={!modoEdicao}
                    className="h-9 text-xs font-mono font-semibold bg-white"
                  />
                </div>
                {operadorSaldo === 'ENTRE' && (
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Máximo (t)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorSaldoMax}
                      onChange={(e) => setValorSaldoMax(e.target.value)}
                      disabled={!modoEdicao}
                      className="h-9 text-xs font-mono font-semibold bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PARÂMETRO 2: Percentual de Saldo (%) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
                <Percent className="w-4 h-4 text-[#004C97]" />
                Parâmetro 2 — Percentual de Saldo (%)
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Operador</Label>
                <Select
                  value={operadorPercentual}
                  onValueChange={(v: OperadorComparacao) => setOperadorPercentual(v)}
                  disabled={!modoEdicao}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENOR">Menor que (&lt;)</SelectItem>
                    <SelectItem value="MENOR_IGUAL">Menor ou igual (&le;)</SelectItem>
                    <SelectItem value="MAIOR">Maior que (&gt;)</SelectItem>
                    <SelectItem value="MAIOR_IGUAL">Maior ou igual (&ge;)</SelectItem>
                    <SelectItem value="ENTRE">Entre (faixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-600 mb-1 block">
                    {operadorPercentual === 'ENTRE' ? 'Mínimo (%)' : 'Valor (%)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={valorPercentual}
                    onChange={(e) => setValorPercentual(e.target.value)}
                    disabled={!modoEdicao}
                    className="h-9 text-xs font-mono font-semibold bg-white"
                  />
                </div>
                {operadorPercentual === 'ENTRE' && (
                  <div>
                    <Label className="text-xs text-slate-600 mb-1 block">Máximo (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={valorPercentualMax}
                      onChange={(e) => setValorPercentualMax(e.target.value)}
                      disabled={!modoEdicao}
                      className="h-9 text-xs font-mono font-semibold bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PARÂMETRO 3: Relação Lógica E / OU */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs uppercase tracking-wider">
              <GitBranch className="w-4 h-4 text-[#004C97]" />
              Parâmetro 3 — Relação Lógica entre os Critérios
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setRelacaoLogica('OU')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  relacaoLogica === 'OU'
                    ? 'border-[#004C97] bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#004C97]">Relação "OU" (Disjunção)</span>
                  {relacaoLogica === 'OU' && <CheckCircle2 className="w-4 h-4 text-[#004C97]" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Item é residual se atender ao Saldo (t) <strong>OU</strong> ao Percentual (%).
                </p>
              </div>

              <div
                onClick={() => setRelacaoLogica('E')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  relacaoLogica === 'E'
                    ? 'border-[#004C97] bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#004C97]">Relação "E" (Conjunção)</span>
                  {relacaoLogica === 'E' && <CheckCircle2 className="w-4 h-4 text-[#004C97]" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Item é residual SOMENTE se atender concomitantemente a ambos os critérios.
                </p>
              </div>
            </div>
          </div>

          {/* Justificativa para auditoria */}
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">
              Justificativa da Alteração (Opcional para auditoria)
            </Label>
            <Input
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Alinhamento com comitê de vendas e gestão de capacidade L1/L2"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestaurarPadrao}
            disabled={salvando}
            className="text-xs border-slate-300 text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Restaurar Padrão
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAplicarFiltrosTemporarios}
              className="text-xs border-[#004C97] text-[#004C97] hover:bg-blue-50"
            >
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarBanco}
              disabled={salvando}
              className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {salvando ? 'Salvando...' : 'Salvar no Banco'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
