/**
 * SEÇÃO HISTÓRICO DE ALTERAÇÕES DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Exibida dentro de DetalheMaterialUnificadoModal para o material inspecionado.
 * Características:
 * - Carregamento resiliente por código de material
 * - Estado carregando: "Carregando histórico..."
 * - Estado erro: Mensagem amigável com botão "Tentar novamente" (sem expor payload técnico cru)
 * - Estado vazio: "Nenhum registro de alteração para este material."
 * - Ordenação decrescente: mais recente primeiro
 * - Formatação em pt-BR (dd/mm/aaaa hh:mm)
 * - Exibição de de/para amigável quando disponível
 * - Rolagem interna limitada (não estoura o modal)
 * - Acessibilidade com aria-labels
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  History,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  buscarHistoricoDoMaterial,
  ItemHistoricoMaterial,
} from '@/services/material-history-service'

interface MaterialHistoricoAlteracoesSectionProps {
  materialCode: string
  materialDescricao?: string
}

export const MaterialHistoricoAlteracoesSection: React.FC<
  MaterialHistoricoAlteracoesSectionProps
> = ({ materialCode, materialDescricao }) => {
  const [itens, setItens] = useState<ItemHistoricoMaterial[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [erro, setErro] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  const carregarHistorico = useCallback(async () => {
    if (!materialCode || !materialCode.trim()) {
      setItens([])
      setLoading(false)
      setErro(null)
      return
    }

    setLoading(true)
    setErro(null)

    try {
      const historico = await buscarHistoricoDoMaterial(materialCode)
      setItens(historico)
    } catch (err: any) {
      console.error('[MaterialHistoricoAlteracoesSection] Erro ao carregar histórico:', err)
      setErro('Não foi possível carregar o histórico de alterações deste material.')
    } finally {
      setLoading(false)
    }
  }, [materialCode])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  return (
    <div
      className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3 mt-1"
      aria-labelledby="material-history-heading"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-lg">
            <History className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h4
              id="material-history-heading"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"
            >
              Histórico de Alterações do Item
              <span className="text-slate-400 font-normal">&bull; {materialCode}</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Trilha auditável de eventos, revisões de programação e movimentações do material
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] font-bold border-slate-300 text-slate-700 bg-slate-50"
          >
            {loading ? 'Consultando...' : `${itens.length} registro(s)`}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Recolher histórico' : 'Expandir histórico'}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {isExpanded && (
        <div className="pt-1">
          {/* ESTADO 1: CARREGANDO */}
          {loading && (
            <div
              className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-col items-center justify-center gap-2.5 min-h-[120px]"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-5 h-5 text-[#004C97] animate-spin" />
              <span className="font-medium">Carregando histórico...</span>
              <span className="text-[10px] text-slate-400">
                Consultando trilha de auditoria e programações do material {materialCode}
              </span>
            </div>
          )}

          {/* ESTADO 2: ERRO */}
          {!loading && erro && (
            <div
              className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex flex-col items-start gap-2.5"
              role="alert"
            >
              <div className="flex items-center gap-2 font-bold text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{erro}</span>
              </div>
              <p className="text-[11px] text-rose-800">
                Ocorreu uma instabilidade momentânea ao recuperar o histórico. Os dados operacionais
                e o restante do modal continuam disponíveis.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarHistorico}
                className="bg-white border-rose-300 text-rose-900 hover:bg-rose-100 text-xs h-7 px-3 gap-1.5"
                aria-label="Tentar novamente carregar histórico de alterações"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* ESTADO 3: VAZIO */}
          {!loading && !erro && itens.length === 0 && (
            <div
              className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 italic flex items-center justify-between gap-3"
              role="status"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="font-medium text-slate-600">
                  Nenhum registro de alteração para este material.
                </span>
              </div>
              <span className="text-[10px] text-slate-400 not-italic">
                Material {materialCode} sem eventos recentes na trilha PCP.
              </span>
            </div>
          )}

          {/* ESTADO 4: LISTA DE HISTÓRICO COM ROLAGEM INTERNA */}
          {!loading && !erro && itens.length > 0 && (
            <div
              className="space-y-2 max-h-[320px] overflow-y-auto pr-1 divide-y divide-slate-100"
              role="feed"
              aria-label="Linha do tempo de alterações do material"
            >
              {itens.map((item, idx) => {
                const badgeColor =
                  item.badgeVariant === 'warning'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : item.badgeVariant === 'info'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-slate-100 text-slate-800 border-slate-200'

                return (
                  <article
                    key={item.id || idx}
                    className="p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors space-y-1.5 text-xs"
                    aria-label={`${item.tipoLabel} em ${item.dataHoraFormatada}`}
                  >
                    {/* Linha superior: Tipo, Badge, Data/Hora */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                          {item.tipoLabel}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeColor}`}
                        >
                          {item.origem === 'weekly_schedules'
                            ? 'Programação Semanal'
                            : item.origem === 'pcp_production_orders'
                              ? 'Ordem de Produção'
                              : 'Auditoria PCP'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.dataHoraFormatada}</span>
                      </div>
                    </div>

                    {/* Resumo da alteração */}
                    <p className="text-slate-800 text-[11px] leading-relaxed">{item.resumo}</p>

                    {/* Detalhe complementar se houver */}
                    {item.detalhe && (
                      <p className="text-[10px] text-slate-500 italic">{item.detalhe}</p>
                    )}

                    {/* Bloco De -> Para estruturado */}
                    {item.dePara && item.dePara.length > 0 && (
                      <div className="mt-1 bg-slate-50 border border-slate-200 rounded p-2 text-[10px] space-y-1">
                        <span className="font-semibold text-slate-700 block">
                          Modificações registradas:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {item.dePara.map((dp, dpIdx) => (
                            <div
                              key={dpIdx}
                              className="flex items-center gap-1.5 text-slate-600 bg-white px-2 py-1 rounded border border-slate-100"
                            >
                              <span className="font-medium text-slate-800">{dp.campo}:</span>
                              <span className="text-rose-700 line-through">{dp.de}</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="text-emerald-700 font-semibold">{dp.para}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rodapé do item: Responsável / Usuário */}
                    {item.usuario && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>
                          Responsável: <strong>{item.usuario}</strong>
                        </span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          {/* Nota de rodapé da seção */}
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>
              * Histórico consolidado a partir da trilha de auditoria e apontamentos operacionais do
              material {materialCode}.
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={carregarHistorico}
              className="text-[10px] h-auto p-0 text-[#004C97] hover:underline"
              aria-label="Atualizar histórico de alterações do material"
            >
              Atualizar lista
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialHistoricoAlteracoesSection
