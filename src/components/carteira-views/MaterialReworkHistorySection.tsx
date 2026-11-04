/**
 * SEÇÃO HISTÓRICO DE RETRABALHO DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Exibida dentro de DetalheMaterialUnificadoModal para o material inspecionado.
 * Características:
 * - Carregamento resiliente por código de material (coleção pcp_rework_items)
 * - Estado carregando: "Carregando histórico de retrabalho..."
 * - Estado erro: Mensagem amigável com botão "Tentar novamente" (detalhe técnico só no console)
 * - Estado vazio: "Nenhum retrabalho registrado para este material."
 * - Ordenação decrescente: mais recente primeiro
 * - Formatação em pt-BR (dd/mm/aaaa hh:mm e quantidade com vírgula decimal)
 * - Rolagem interna limitada (não estoura o modal, sem rolagem horizontal)
 * - Acessibilidade com aria-labels
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  Repeat,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Calendar,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  buscarHistoricoReworkDoMaterial,
  ItemHistoricoRetrabalho,
} from '@/services/material-rework-history-service'

interface MaterialReworkHistorySectionProps {
  materialCode: string
  materialDescricao?: string
}

export const MaterialReworkHistorySection: React.FC<MaterialReworkHistorySectionProps> = ({
  materialCode,
}) => {
  const [itens, setItens] = useState<ItemHistoricoRetrabalho[]>([])
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
      const historico = await buscarHistoricoReworkDoMaterial(materialCode)
      setItens(historico)
    } catch (err: any) {
      console.error('[MaterialReworkHistorySection] Erro ao carregar histórico de retrabalho:', err)
      setErro('Não foi possível carregar o histórico de retrabalho. Tente novamente.')
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
      aria-labelledby="material-rework-history-heading"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-lg">
            <Repeat className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h4
              id="material-rework-history-heading"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"
            >
              Histórico de Retrabalho
              <span className="text-slate-400 font-normal">&bull; {materialCode}</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Rastreabilidade completa dos retrabalhos registrados para este material
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
            aria-label={
              isExpanded ? 'Recolher histórico de retrabalho' : 'Expandir histórico de retrabalho'
            }
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
              <span className="font-medium">Carregando histórico de retrabalho...</span>
              <span className="text-[10px] text-slate-400">
                Consultando registros de retrabalho do material {materialCode}
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
                Ocorreu uma instabilidade momentânea ao recuperar o histórico de retrabalho. O
                restante do modal continua disponível.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarHistorico}
                className="bg-white border-rose-300 text-rose-900 hover:bg-rose-100 text-xs h-7 px-3 gap-1.5"
                aria-label="Tentar novamente carregar histórico de retrabalho"
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
                  Nenhum retrabalho registrado para este material.
                </span>
              </div>
              <span className="text-[10px] text-slate-400 not-italic">
                Material {materialCode} sem eventos de retrabalho.
              </span>
            </div>
          )}

          {/* ESTADO 4: LISTA DE RETRABALHOS COM ROLAGEM INTERNA */}
          {!loading && !erro && itens.length > 0 && (
            <div
              className="space-y-2 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 divide-y divide-slate-100"
              role="feed"
              aria-label="Linha do tempo de retrabalhos do material"
            >
              {itens.map((item, idx) => {
                const origemColor =
                  item.origemTipo?.toUpperCase() === 'ACABADO'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'

                return (
                  <article
                    key={item.id || idx}
                    className="p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors space-y-1.5 text-xs"
                    aria-label={`Retrabalho do lote ${item.lote} em ${item.dataHoraFormatada}`}
                  >
                    {/* Linha superior: Operação, Origem, Data/Hora */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                          <Package className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                          <span className="truncate">{item.operacao}</span>
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${origemColor}`}
                        >
                          {item.origemLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.dataHoraFormatada}</span>
                      </div>
                    </div>

                    {/* Lote / Corrida / Quantidade */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="font-semibold text-slate-800">
                        Lote: <span className="font-normal">{item.lote}</span>
                      </span>
                      {item.corrida && (
                        <span className="font-semibold text-slate-800">
                          Corrida: <span className="font-normal">{item.corrida}</span>
                        </span>
                      )}
                      <span className="font-semibold text-slate-800">
                        Qtd. a retrabalhar:{' '}
                        <span className="font-bold text-[#004C97]">{item.quantidadeFormatada}</span>
                      </span>
                      {item.quantidadeDisponivelFormatada && (
                        <span className="text-slate-500">
                          (disponível no momento: {item.quantidadeDisponivelFormatada})
                        </span>
                      )}
                    </div>

                    {/* Motivo e Operação */}
                    <p className="text-slate-800 text-[11px] leading-relaxed">
                      <span className="font-semibold">Motivo:</span> {item.motivo}
                      {item.motivoCodigo && item.motivoCodigo !== item.motivo && (
                        <span className="text-slate-400"> ({item.motivoCodigo})</span>
                      )}
                    </p>

                    {/* Observação quando existir */}
                    {item.observacao && (
                      <p className="text-[10px] text-slate-600 italic">
                        Observação: {item.observacao}
                      </p>
                    )}

                    {/* Localização: Centro, Depósito, Localização, Programação */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-600">
                      <span>
                        Centro: <strong>{item.centro}</strong>
                      </span>
                      {item.deposito && (
                        <span>
                          Depósito: <strong>{item.deposito}</strong>
                        </span>
                      )}
                      {item.localizacao && (
                        <span>
                          Localização: <strong>{item.localizacao}</strong>
                        </span>
                      )}
                      {item.programacao && (
                        <span>
                          Programação: <strong>{item.programacao}</strong>
                          {item.versao ? ` (v${item.versao})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Rodapé do item: Responsável / Usuário */}
                    {item.usuario && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>
                          Registrado por: <strong>{item.usuario}</strong>
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
              * Histórico consolidado a partir dos registros de rastreabilidade de retrabalho do
              material {materialCode}.
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={carregarHistorico}
              className="text-[10px] h-auto p-0 text-[#004C97] hover:underline"
              aria-label="Atualizar histórico de retrabalho do material"
            >
              Atualizar lista
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialReworkHistorySection
