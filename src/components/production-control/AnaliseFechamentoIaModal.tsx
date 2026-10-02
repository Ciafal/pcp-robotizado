import React from 'react'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  History,
  FileCheck2,
  ShieldCheck,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChecklistFechamentoExecucao,
  FechamentoAnaliseIaResultado,
} from '@/types/checklist-fechamento'

interface Props {
  open: boolean
  onClose: () => void
  execucao: ChecklistFechamentoExecucao | null
  analiseIa: FechamentoAnaliseIaResultado | null
  carregando: boolean
  onAbrirFormulario: () => void
}

export const AnaliseFechamentoIaModal: React.FC<Props> = ({
  open,
  onClose,
  execucao,
  analiseIa,
  carregando,
  onAbrirFormulario,
}) => {
  if (!analiseIa && !carregando) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Análise do Fechamento com Inteligência Artificial
                <Badge className="bg-amber-400 text-amber-950 text-[10px] font-bold border-0">
                  Suporte à Decisão
                </Badge>
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Diagnóstico cruzado das ordens, histórico das competências e validação de regras SGQ
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* AVISO DE RESTRIÇÃO DA IA (REGRA PERMANENTE DO PROJETO) */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold block text-amber-950">
                Diretriz de Segurança do PCP Robotizado:
              </span>
              A IA atua exclusivamente como suporte analítico. A IA{' '}
              <strong>
                NÃO altera status de atividades, NÃO executa movimentações SAP, NÃO encerra ordens e
                NÃO autoriza fechamentos sem chancela humana
              </strong>
              . Todos os apontamentos foram fundamentados nos dados registrados no sistema e
              procedimentos operacionais da CIAFAL.
            </div>
          </div>

          {carregando ? (
            <div className="p-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-[#004C97] animate-spin mx-auto" />
              <p className="font-semibold text-slate-700">
                Processando dados das ordens e histórico do fechamento...
              </p>
              <p className="text-slate-400 text-xs">
                Cruzando ZPP_04, ZPP_05, COOIS, CO1P e saldo de depósitos da competência{' '}
                {execucao?.competencia}
              </p>
            </div>
          ) : (
            analiseIa && (
              <>
                {/* 1. RESUMO EXECUTIVO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" />
                      1. Resumo Executivo da Competência {execucao?.competencia}
                    </span>
                    <Badge
                      className={`text-[10px] font-bold ${
                        analiseIa.resumo_executivo.risco_prazo === 'BAIXO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : analiseIa.resumo_executivo.risco_prazo === 'MEDIO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Risco para o Prazo: {analiseIa.resumo_executivo.risco_prazo}
                    </Badge>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="font-semibold text-slate-900 text-xs">
                      {analiseIa.resumo_executivo.situacao_geral}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-rose-700 block">
                          Principais Erros Detectados (
                          {analiseIa.resumo_executivo.principais_erros.length})
                        </span>
                        <ul className="space-y-1">
                          {analiseIa.resumo_executivo.principais_erros.map((err, idx) => (
                            <li key={idx} className="text-slate-700 flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">•</span>
                              <span className="leading-snug">{err}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-amber-700 block">
                          Principais Pendências (
                          {analiseIa.resumo_executivo.principais_pendencias.length})
                        </span>
                        <ul className="space-y-1">
                          {analiseIa.resumo_executivo.principais_pendencias.map((pend, idx) => (
                            <li key={idx} className="text-slate-700 flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span className="leading-snug">{pend}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. ANÁLISE DAS ORDENS */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    2. Análise Técnica das Ordens de Produção
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                      <span className="font-bold text-slate-800 text-[11px] block">
                        Ordens Não Encerradas / Fechamento Divergente
                      </span>
                      <p className="text-slate-600 text-[11px]">
                        Ordens em aberto:{' '}
                        <strong>{analiseIa.analise_ordens.ordens_nao_encerradas}</strong>
                      </p>
                      <ul className="space-y-1 text-slate-600 pt-1">
                        {analiseIa.analise_ordens.fechamento_divergente.map((f, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[#004C97] font-bold">-</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                      <span className="font-bold text-slate-800 text-[11px] block">
                        Desvios de Rendimento e Movimentos Inconsistentes
                      </span>
                      <ul className="space-y-1 text-slate-600">
                        {analiseIa.analise_ordens.desvios_rendimento.map((d, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                        {analiseIa.analise_ordens.movimentos_inconsistentes.map((m, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-rose-600 font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 3. ANÁLISE HISTÓRICA & RECORRÊNCIA */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    3. Análise Histórica & Recorrência Frente aos Meses Anteriores
                  </span>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">
                          Depósitos com Mais Divergências
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analiseIa.analise_historica.depositos_mais_divergencias.map((dep, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-slate-700">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">
                          Linhas com Fechamento Mais Demorado
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analiseIa.analise_historica.linhas_fechamento_mais_demorado.map(
                            (l, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] text-slate-700"
                              >
                                {l}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">
                        Padrão de Erros Recorrentes
                      </span>
                      <ul className="space-y-1 text-slate-700 mt-1">
                        {analiseIa.analise_historica.erros_recorrentes.map((err, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#004C97] font-bold">›</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 4. PRÓXIMAS AÇÕES SUGERIDAS */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    4. Próximas Ações Sugeridas pelo Sistema
                  </span>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                    {analiseIa.proximas_acoes_sugeridas.map((acao, i) => (
                      <div key={i} className="flex items-start gap-2 text-emerald-950 font-medium">
                        <span className="bg-emerald-200 text-emerald-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{acao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}
        </div>

        <DialogFooter className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Fechar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onClose()
              onAbrirFormulario()
            }}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-semibold"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Ver no Formulário Final
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AnaliseFechamentoIaModal
