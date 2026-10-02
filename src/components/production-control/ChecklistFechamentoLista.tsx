import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Plus,
  FileText,
  Boxes,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Paperclip,
  ExternalLink,
  History,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ChecklistFechamentoItem, ChecklistItemStatus } from '@/types/checklist-fechamento'

interface Props {
  itens: ChecklistFechamentoItem[]
  onOpenDetalhe: (item: ChecklistFechamentoItem) => void
  onAtualizarStatusRapido: (item: ChecklistFechamentoItem, novoStatus: ChecklistItemStatus) => void
  onSolicitarInventario: (item: ChecklistFechamentoItem) => void
  onRastrearDivergencia: (item: ChecklistFechamentoItem) => void
  onAdicionarEvidencia: (item: ChecklistFechamentoItem) => void
  onNovaAtividade: () => void
  onEditarAtividade?: (item: ChecklistFechamentoItem) => void
  onGerarRelatorioPendencias: () => void
  canEdit: boolean
  filtroStatusRapido?: string
}

export const ChecklistFechamentoLista: React.FC<Props> = ({
  itens,
  onOpenDetalhe,
  onAtualizarStatusRapido,
  onSolicitarInventario,
  onRastrearDivergencia,
  onAdicionarEvidencia,
  onNovaAtividade,
  onEditarAtividade,
  onGerarRelatorioPendencias,
  canEdit,
  filtroStatusRapido = 'TODOS',
}) => {
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS')
  const [somenteObrigatorias, setSomenteObrigatorias] = useState(false)

  // Categorias únicas existentes nos itens
  const categorias = React.useMemo(() => {
    const cats = new Set<string>()
    itens.forEach((i) => {
      if (i.categoria) cats.add(i.categoria)
    })
    return ['TODAS', ...Array.from(cats)]
  }, [itens])

  // Filtragem combinada
  const itensFiltrados = React.useMemo(() => {
    return itens.filter((it) => {
      // Filtro status rápido dos cards
      if (filtroStatusRapido !== 'TODOS' && it.status !== filtroStatusRapido) {
        return false
      }

      // Filtro obrigatórias
      if (somenteObrigatorias && !it.obrigatoria) {
        return false
      }

      // Categoria
      if (categoriaFiltro !== 'TODAS' && it.categoria !== categoriaFiltro) {
        return false
      }

      // Busca texto
      if (busca.trim()) {
        const b = busca.toLowerCase()
        const match =
          it.codigo.toLowerCase().includes(b) ||
          it.titulo.toLowerCase().includes(b) ||
          (it.transacao_sap && it.transacao_sap.toLowerCase().includes(b)) ||
          (it.deposito_sap && it.deposito_sap.toLowerCase().includes(b)) ||
          (it.linha_centro_relacionado && it.linha_centro_relacionado.toLowerCase().includes(b)) ||
          (it.descricao_detalhada && it.descricao_detalhada.toLowerCase().includes(b))
        if (!match) return false
      }

      return true
    })
  }, [itens, filtroStatusRapido, somenteObrigatorias, categoriaFiltro, busca])

  // Agrupamento por categoria
  const gruposPorCategoria = React.useMemo(() => {
    const mapa = new Map<string, ChecklistFechamentoItem[]>()
    itensFiltrados.forEach((item) => {
      const cat = item.categoria || 'Outros'
      if (!mapa.has(cat)) mapa.set(cat, [])
      mapa.get(cat)!.push(item)
    })
    return Array.from(mapa.entries())
  }, [itensFiltrados])

  const renderStatusBadge = (status: ChecklistItemStatus) => {
    switch (status) {
      case 'OK':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            OK
          </Badge>
        )
      case 'ERRO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ERRO
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDENTE
          </Badge>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Barra de Ações e Filtros da Tabela */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar atividade, SAP, depósito..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs pl-8 bg-white border-slate-200"
            />
          </div>

          {/* Filtro Categoria */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c === 'TODAS' ? 'Todas Categorias' : c}
              </option>
            ))}
          </select>

          {/* Toggle Obrigatórias */}
          <button
            type="button"
            onClick={() => setSomenteObrigatorias(!somenteObrigatorias)}
            className={`h-8 px-2.5 text-xs rounded-md border font-medium transition-all ${
              somenteObrigatorias
                ? 'bg-[#004C97] text-white border-[#004C97]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Obrigatórias ({itens.filter((i) => i.obrigatoria).length})
          </button>
        </div>

        {/* Botões Funcionais da Etapa 1 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGerarRelatorioPendencias}
            className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Gerar Relatório de Pendências
          </Button>

          {canEdit && (
            <Button
              type="button"
              size="sm"
              onClick={onNovaAtividade}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />+ Nova Atividade
            </Button>
          )}
        </div>
      </div>

      {/* Accordion das Atividades agrupadas */}
      <div className="p-3 sm:p-4">
        {gruposPorCategoria.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Nenhuma atividade encontrada com os filtros selecionados.
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={gruposPorCategoria.map(([cat]) => cat)}
            className="space-y-3"
          >
            {gruposPorCategoria.map(([categoria, listaItens]) => (
              <AccordionItem
                key={categoria}
                value={categoria}
                className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
              >
                <AccordionTrigger className="px-4 py-3 bg-slate-50/70 hover:bg-slate-100/60 hover:no-underline text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-800 text-sm">{categoria}</span>
                    <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                      {listaItens.length} {listaItens.length === 1 ? 'atividade' : 'atividades'}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="p-0 divide-y divide-slate-100">
                  {listaItens.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 hover:bg-blue-50/30 transition-colors space-y-2.5"
                    >
                      {/* Linha Principal da Atividade */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center gap-2.5 flex-1">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {item.codigo}
                          </span>
                          <span className="font-semibold text-sm text-slate-900 leading-snug">
                            {item.titulo}
                          </span>
                          {item.obrigatoria ? (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] shrink-0 font-medium">
                              Obrigatória
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-500 shrink-0"
                            >
                              Informativa
                            </Badge>
                          )}
                          {item.status_regra && item.status_regra !== 'Oficial' && (
                            <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] shrink-0 font-medium">
                              ⚠️ {item.status_regra}
                            </Badge>
                          )}
                        </div>

                        {/* Status e Ações Rápidas */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {renderStatusBadge(item.status)}

                          {canEdit && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onAtualizarStatusRapido(item, 'OK')}
                                title="Marcar como OK"
                                className={`h-7 px-2 text-[11px] font-medium ${
                                  item.status === 'OK'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                OK
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onAtualizarStatusRapido(item, 'ERRO')}
                                title="Marcar com ERRO"
                                className={`h-7 px-2 text-[11px] font-medium ${
                                  item.status === 'ERRO'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                ERRO
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onAtualizarStatusRapido(item, 'PENDENTE')}
                                title="Marcar como PENDENTE"
                                className={`h-7 px-2 text-[11px] font-medium ${
                                  item.status === 'PENDENTE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                PEND
                              </Button>
                            </div>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenDetalhe(item)}
                            className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 font-medium"
                          >
                            Abrir Detalhe
                          </Button>

                          {canEdit && onEditarAtividade && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onEditarAtividade(item)}
                              title="Editar Atividade"
                              className="h-7 px-2 text-xs text-slate-600 hover:text-[#004C97] hover:bg-blue-50 font-medium"
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Descrição Detalhada */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.descricao_detalhada}
                      </p>

                      {/* Regra de Validação / Tags Operacionais */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        {item.transacao_sap && item.transacao_sap !== 'N/A' && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                            SAP: {item.transacao_sap}
                          </span>
                        )}

                        {item.deposito_sap && item.deposito_sap !== 'N/A' && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                            Depósito: {item.deposito_sap}
                          </span>
                        )}

                        {item.linha_centro_relacionado && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            Linha: {item.linha_centro_relacionado}
                          </span>
                        )}

                        {item.fonte_dados && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-[#004C97] px-2 py-0.5 rounded font-medium">
                            Fonte: {item.fonte_dados}
                          </span>
                        )}

                        {item.executado_por && (
                          <span className="text-slate-400 italic">
                            Executado por: {item.executado_por}
                          </span>
                        )}
                      </div>

                      {/* Ações Específicas da Atividade (Inventário / Rastrear Divergência) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                        {(item.codigo === '1.3' ||
                          item.codigo === '1.4' ||
                          item.codigo === '1.13' ||
                          item.codigo === '1.14' ||
                          item.codigo.includes('1.23')) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onSolicitarInventario(item)}
                            className="h-6 text-[11px] text-[#004C97] hover:bg-blue-50 px-2 font-medium"
                          >
                            <Boxes className="w-3 h-3 mr-1" />
                            Solicitar Inventário
                          </Button>
                        )}

                        {(item.codigo === '1.11' ||
                          item.codigo === '1.19' ||
                          item.codigo === '1.8' ||
                          item.quantidade_divergencias! > 0) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onRastrearDivergencia(item)}
                            className="h-6 text-[11px] text-indigo-700 hover:bg-indigo-50 px-2 font-medium"
                          >
                            <History className="w-3 h-3 mr-1" />
                            Rastrear Divergência
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onAdicionarEvidencia(item)}
                          className="h-6 text-[11px] text-slate-600 hover:bg-slate-100 px-2 font-medium"
                        >
                          <Paperclip className="w-3 h-3 mr-1" />
                          Evidências
                        </Button>

                        {item.manual_documento_referencia && (
                          <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {item.manual_documento_referencia}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  )
}
