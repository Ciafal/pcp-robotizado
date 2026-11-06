/**
 * Drill-down analítico único para TODOS os cards da Análise de Carteira (HUB CIAFAL).
 *
 * • Modal grande (~92% da área útil), rolagem interna, cabeçalho/filtros fixos.
 * • Nível 1: card consolidado → Nível 2: resumo por material → Nível 3: origem/detalhe.
 * • Breadcrumb "Análise de Carteira > [Visão] > [Card] > [Material]".
 * • "Ver composição do cálculo" mostra a fórmula exata que gerou o valor do card.
 * • Filtros herdados do painel principal + filtros locais + pesquisa rápida.
 * • Indisponibilidade de fonte = estado controlado ("Dados SAP indisponíveis"),
 *   nunca 0,00 silencioso.
 */
import React, { useMemo, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Calculator,
  Database,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { LinhaDrillMaterial } from '@/lib/carteira-drill-engine'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface ComposicaoCalculo {
  rotulo: string
  valor: number | string
  operador?: '+' | '-' | '=' | ''
  destaque?: boolean
}

export interface ColunaDrill<T> {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  render?: (l: T) => React.ReactNode
}

export interface DrilldownCardConfig<T = LinhaDrillMaterial> {
  /** Nome do card (ex.: "Saldo Semiacabado"). */
  tituloCard: string
  /** Nome da visão (ex.: "Carteira L1") — usado no breadcrumb e no log. */
  nomeVisao: string
  /** Valor consolidado exibido no card (Nível 1). */
  valorConsolidado: string
  /** Fórmula legível da composição do cálculo. */
  composicao: ComposicaoCalculo[]
  /** Fonte dos dados (ex.: "SAP RFC ZSD28C via carteira-engine"). */
  fonteDados: string
  /** Centro/linha de produção associada. */
  centroLinha?: string
  /** Carteira selecionada no painel principal. */
  carteiraSelecionada?: string
  /** Filtros ativos herdados do painel principal (chave → valor). */
  filtrosHerdados?: Record<string, string>
  /** Data/hora da última atualização da fonte (ISO ou já formatada). */
  ultimaAtualizacao?: string
  /** Indisponibilidade controlada da fonte (nunca 0,00 silencioso). */
  indisponivel?: boolean
  /** Mensagem do estado de erro controlado. */
  mensagemIndisponivel?: string
  /** Linhas do Nível 2 (resumo por material). A soma deve fechar com o card. */
  linhas: T[]
  /** Colunas do Nível 2. */
  colunas: ColunaDrill<T>[]
  /** Colunas do Nível 3 (detalhe por material). */
  colunasNivel3?: ColunaDrill<Record<string, any>>[]
  /** Constrói as linhas do Nível 3 para um material clicado. */
  buildNivel3?: (linha: T) => Record<string, any>[]
  /** Chaves usadas nos filtros locais (ex.: ['familia','origem']). */
  filtrosLocais?: string[]
  /** Valor numérico consolidado (para soma de verificação). */
  valorNumerico?: number
  /** Como somar uma linha (verificação valor do card = soma do drill). */
  extrairValorLinha?: (l: T) => number
}

interface DrilldownCardModalProps {
  isOpen: boolean
  onClose: () => void
  config: DrilldownCardConfig<any> | null
}

const ROTULOS_FILTRO: Record<string, string> = {
  familia: 'Família',
  origem: 'Origem',
  linha: 'Linha',
  curva: 'Curva ABC',
  centro: 'Centro',
  cliente: 'Cliente',
  tipo_estoque: 'Tipo de estoque',
  status: 'Status',
}

export const DrilldownCardModal: React.FC<DrilldownCardModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [nivel, setNivel] = useState<1 | 2 | 3>(1)
  const [materialSelecionado, setMaterialSelecionado] = useState<any>(null)
  const [pesquisa, setPesquisa] = useState('')
  const [filtros, setFiltros] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setNivel(1)
      setMaterialSelecionado(null)
      setPesquisa('')
      setFiltros({})
      if (config) {
        pcpAuditService
          .recordLog({
            module: 'Análise de Carteira',
            screen: config.nomeVisao,
            event_type: 'CARD_DRILLDOWN',
            action: `Drill-down do card ${config.tituloCard}`,
            resource: `card:${config.tituloCard}`,
            details: {
              visao: config.nomeVisao,
              card: config.tituloCard,
              filtros_herdados: config.filtrosHerdados || {},
              fonte_dados: config.fonteDados,
            } as any,
          })
          .catch(() => {
            /* auditoria do drill é best-effort: não bloqueia a análise */
          })
      }
    }
  }, [isOpen, config])

  const linhasFiltradas = useMemo(() => {
    if (!config) return []
    let out = config.linhas
    const locais = config.filtrosLocais || []
    locais.forEach((k) => {
      const v = filtros[k]
      if (v && v !== 'TODOS') {
        out = out.filter((l: any) => String(l[k] ?? '') === v)
      }
    })
    if (pesquisa.trim()) {
      const q = pesquisa.trim().toLowerCase()
      out = out.filter(
        (l: any) =>
          String(l.material ?? '')
            .toLowerCase()
            .includes(q) ||
          String(l.descricao ?? '')
            .toLowerCase()
            .includes(q),
      )
    }
    return out
  }, [config, filtros, pesquisa])

  const somaLinhas = useMemo(() => {
    if (!config || !config.extrairValorLinha) return null
    return linhasFiltradas.reduce((s, l) => s + (config.extrairValorLinha!(l) || 0), 0)
  }, [linhasFiltradas, config])

  if (!config) return null

  const abrirNivel3 = (linha: any) => {
    setMaterialSelecionado(linha)
    setNivel(3)
  }

  const voltarNivel = () => {
    if (nivel === 3) {
      setNivel(2)
      setMaterialSelecionado(null)
    } else if (nivel === 2) {
      setNivel(1)
    }
  }

  const formatar = (v: any) => (typeof v === 'number' ? formatNumberPTBR(v, 2) : String(v ?? ''))

  const linhasNivel3 =
    nivel === 3 && materialSelecionado && config.buildNivel3
      ? config.buildNivel3(materialSelecionado)
      : []

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col overflow-hidden rounded-2xl border-slate-200 shadow-2xl"
        data-testid="drilldown-card-modal"
      >
        {/* ===== Cabeçalho fixo ===== */}
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#004C97] to-[#003870] text-white px-5 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-200 flex-wrap">
                <span>Análise de Carteira</span>
                <ChevronRight className="w-3 h-3" />
                <span>{config.nomeVisao}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{config.tituloCard}</span>
                {nivel === 3 && materialSelecionado && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-mono">{materialSelecionado.material}</span>
                  </>
                )}
              </div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 mt-0.5">
                Drill-down — {config.tituloCard}
                {nivel === 2 && (
                  <Badge className="bg-white/20 text-white text-[9px] font-bold">
                    Resumo por material
                  </Badge>
                )}
                {nivel === 3 && (
                  <Badge className="bg-white/20 text-white text-[9px] font-bold">
                    Detalhe por origem
                  </Badge>
                )}
              </DialogTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 text-white hover:bg-white/20 shrink-0"
              aria-label="Fechar drill-down"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Metadados: valor, fórmula, atualização, fonte, centro, carteira, filtros */}
          <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold">Valor consolidado</span>
              <span className="font-mono font-bold text-sm">{config.valorConsolidado}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Última atualização
              </span>
              <span className="font-mono">{config.ultimaAtualizacao || '—'}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold flex items-center gap-1">
                <Database className="w-3 h-3" /> Fonte dos dados
              </span>
              <span className="truncate block" title={config.fonteDados}>
                {config.fonteDados}
              </span>
            </div>
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold">Centro / Linha</span>
              <span>{config.centroLinha || 'Todas'}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold">Carteira</span>
              <span>{config.carteiraSelecionada || 'Todas'}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-2.5 py-1.5">
              <span className="block text-blue-200 font-semibold">Filtros herdados</span>
              <span
                className="truncate block"
                title={
                  Object.entries(config.filtrosHerdados || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ') || 'Nenhum'
                }
              >
                {Object.keys(config.filtrosHerdados || {}).length > 0
                  ? `${Object.keys(config.filtrosHerdados).length} ativo(s)`
                  : 'Nenhum'}
              </span>
            </div>
          </div>
        </div>

        {/* ===== Barra de ações (fixa) ===== */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-2.5 flex flex-wrap items-center gap-2">
          {nivel > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={voltarNivel}
              className="h-7 text-[11px] gap-1 border-slate-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-composicao-drill'))}
            className="h-7 text-[11px] gap-1 border-[#004C97] text-[#004C97] hover:bg-blue-50 font-bold"
          >
            <Calculator className="w-3.5 h-3.5" /> Ver composição do cálculo
          </Button>
          {nivel === 2 && (
            <>
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Pesquisar código ou descrição..."
                  className="h-7 pl-7 text-[11px]"
                  data-testid="drill-pesquisa-material"
                />
              </div>
              {(config.filtrosLocais || []).map((k) => (
                <select
                  key={k}
                  value={filtros[k] || 'TODOS'}
                  onChange={(e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))}
                  className="h-7 text-[11px] border border-slate-300 rounded-md px-1.5 bg-white"
                  data-testid={`drill-filtro-${k}`}
                >
                  <option value="TODOS">{ROTULOS_FILTRO[k] || k}: Todos</option>
                  {opcoesUnicas(config.linhas, k).map((v) => (
                    <option key={v} value={v}>
                      {ROTULOS_FILTRO[k] || k}: {v}
                    </option>
                  ))}
                </select>
              ))}
            </>
          )}
        </div>

        {/* ===== Corpo com rolagem interna ===== */}
        <div className="flex-1 overflow-y-auto p-5 pt-3">
          {config.indisponivel ? (
            <div
              className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm font-semibold"
              data-testid="drill-indisponivel"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              {config.mensagemIndisponivel ||
                'Dados SAP indisponíveis — não foi possível detalhar este card.'}
            </div>
          ) : (
            <>
              {/* Painel da composição do cálculo */}
              <ComposicaoPanel composicao={config.composicao} />

              {/* Verificação valor do card = soma do drill */}
              {somaLinhas !== null && nivel >= 2 && (
                <div
                  className="mb-3 text-[11px] text-slate-600 font-semibold flex items-center gap-1.5"
                  data-testid="drill-soma-verificacao"
                >
                  <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                  Soma dos {linhasFiltradas.length} registro(s):{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {formatNumberPTBR(somaLinhas, 2)}
                  </span>
                  {config.valorNumerico !== undefined && (
                    <Badge
                      className={`text-[9px] font-bold ${Math.abs(somaLinhas - config.valorNumerico) < 0.005 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                    >
                      {Math.abs(somaLinhas - config.valorNumerico) < 0.005
                        ? 'Confere com o card'
                        : 'Divergência — verifique filtros'}
                    </Badge>
                  )}
                </div>
              )}

              {nivel === 2 && (
                <TabelaGenerica
                  colunas={config.colunas}
                  linhas={linhasFiltradas}
                  onRowClick={config.buildNivel3 ? abrirNivel3 : undefined}
                  vazio="Nenhum material compõe este card com os filtros atuais."
                />
              )}

              {nivel === 3 && materialSelecionado && (
                <>
                  <div className="mb-3 p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-xs text-slate-700">
                    <span className="font-bold font-mono text-[#004C97]">
                      {materialSelecionado.material}
                    </span>{' '}
                    — {materialSelecionado.descricao || 'Detalhamento por origem'}
                  </div>
                  <TabelaGenerica
                    colunas={config.colunasNivel3 || []}
                    linhas={linhasNivel3}
                    vazio="Nenhuma origem relacionada para este material."
                  />
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Painel "Ver composição do cálculo" — como o número foi formado. */
const ComposicaoPanel: React.FC<{ composicao: ComposicaoCalculo[] }> = ({ composicao }) => {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const h = () => setAberto((a) => !a)
    document.addEventListener('toggle-composicao-drill', h)
    return () => document.removeEventListener('toggle-composicao-drill', h)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aberto])

  if (!aberto) return null

  return (
    <div
      className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
      data-testid="composicao-calculo-panel"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-[#004C97]" /> Composição do cálculo
        </h4>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={() => setAberto(false)}
        >
          Ocultar
        </Button>
      </div>
      <div className="font-mono text-xs space-y-1">
        {composicao.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 ${c.destaque ? 'font-bold text-[#004C97] border-t border-slate-300 pt-1 mt-1' : 'text-slate-700'}`}
          >
            {c.operador && (
              <span
                className={`w-4 text-center font-bold ${c.destaque ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {c.operador}
              </span>
            )}
            <span className="flex-1">{c.rotulo}</span>
            <span className={c.destaque ? '' : 'font-semibold'}>{c.valor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tabela genérica com cabeçalho fixo e pt-BR. */
const TabelaGenerica = <T extends Record<string, any>>({
  colunas,
  linhas,
  onRowClick,
  vazio,
}: {
  colunas: ColunaDrill<T>[]
  linhas: T[]
  onRowClick?: (l: T) => void
  vazio: string
}) => {
  if (linhas.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
        {vazio}
      </div>
    )
  }
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="overflow-auto max-h-[52vh]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#004C97] text-white text-[11px] sticky top-0 z-10">
            <tr>
              {colunas.map((c) => (
                <th
                  key={c.key}
                  className={`p-2.5 whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map((l, idx) => (
              <tr
                key={idx}
                onClick={onRowClick ? () => onRowClick(l) : undefined}
                className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : ''} text-[11px]`}
              >
                {colunas.map((c) => (
                  <td
                    key={c.key}
                    className={`p-2.5 ${c.align === 'right' ? 'text-right font-mono' : c.align === 'center' ? 'text-center' : ''}`}
                  >
                    {c.render ? c.render(l) : formatNumberPTBR(l[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function opcoesUnicas(linhas: any[], chave: string): string[] {
  const set = new Set<string>()
  linhas.forEach((l) => {
    const v = l[chave]
    if (v !== undefined && v !== null && String(v).trim() !== '') set.add(String(v))
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default DrilldownCardModal
