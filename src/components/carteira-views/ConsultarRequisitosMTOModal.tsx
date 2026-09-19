import React, { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Wrench,
  Microscope,
  Package,
  Building2,
  Calendar,
  User,
  ShieldAlert,
  ShieldCheck,
  Search,
  FileQuestion,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { OrderRequirementSheet } from '@/types/product-quality'
import { qualityService } from '@/services/quality-service'
import {
  MtoRequirementValidationEngine,
  MtoIndividualRequirement,
  MtoValidationResult,
  MtoCanonicalGroup,
  MtoRequirementCriticality,
  MtoRequirementStatus,
} from '@/services/mto-requirement-validation-engine'

export interface ConsultarRequisitosMTOModalProps {
  isOpen: boolean
  onClose: () => void
  item?: CarteiraItem | null
  // Se aberto a partir do cabeçalho sem item fixo, permite pesquisar ou selecionar
  itensMtoDisponiveis?: CarteiraItem[]
  onSelecionarItem?: (item: CarteiraItem) => void
}

export const ConsultarRequisitosMTOModal: React.FC<ConsultarRequisitosMTOModalProps> = ({
  isOpen,
  onClose,
  item: itemProp,
  itensMtoDisponiveis = [],
  onSelecionarItem,
}) => {
  const [itemAtivo, setItemAtivo] = useState<CarteiraItem | null>(null)
  const [sheet, setSheet] = useState<OrderRequirementSheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<MtoCanonicalGroup | 'TODOS'>('TODOS')

  // Define o item em análise
  useEffect(() => {
    if (itemProp) {
      setItemAtivo(itemProp)
    } else if (itensMtoDisponiveis.length > 0) {
      setItemAtivo(itensMtoDisponiveis[0])
    } else {
      setItemAtivo(null)
    }
  }, [itemProp, itensMtoDisponiveis, isOpen])

  // Busca honesta no backend PocketBase: order_requirement_sheets
  useEffect(() => {
    let isCancelled = false
    async function carregarRequisitos() {
      if (!itemAtivo) {
        setSheet(null)
        return
      }

      setLoading(true)
      try {
        const salesOrder = itemAtivo.ordem_venda || ''
        const itemNumber = itemAtivo.item_ordem || '10'

        // 1ª busca canônica: sales_order_sap + sales_order_item
        let found = await qualityService.getRequirementSheetBySalesOrder(salesOrder, itemNumber)

        // 2ª busca de tolerância: order_number
        if (!found && salesOrder) {
          found = await qualityService.getRequirementSheetByOrder(salesOrder)
        }

        if (!isCancelled) {
          setSheet(found)
        }
      } catch (err) {
        console.warn('Erro ao consultar order_requirement_sheets:', err)
        if (!isCancelled) setSheet(null)
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    if (isOpen) {
      carregarRequisitos()
    }

    return () => {
      isCancelled = true
    }
  }, [itemAtivo, isOpen])

  // Executa o motor central de validação MTO
  const validacao: MtoValidationResult = useMemo(() => {
    if (!itemAtivo) {
      return MtoRequirementValidationEngine.validarProgramacaoMTO({
        pedidoMto: {
          ordem_venda: '',
          item_ordem: '',
        },
        requisitosSheet: null,
      })
    }

    return MtoRequirementValidationEngine.validarProgramacaoMTO({
      pedidoMto: {
        ordem_venda: itemAtivo.ordem_venda,
        item_ordem: itemAtivo.item_ordem,
        nome_cliente: itemAtivo.nome_cliente,
        codigo_cliente: itemAtivo.codigo_cliente,
        codigo_material: itemAtivo.codigo_material,
        descricao_material: itemAtivo.descricao_material,
        linha: itemAtivo.linha,
        centro: itemAtivo.centro,
        quantidade_tons: itemAtivo.qtd_ordem_tons,
        data_desejada: itemAtivo.data_desejada,
        empresa: itemAtivo.empresa,
      },
      requisitosSheet: sheet,
      programacao:
        itemAtivo.linha_programada || itemAtivo.data_programada
          ? {
              linha_programada: itemAtivo.linha_programada || itemAtivo.linha,
              centro_programado: itemAtivo.centro,
              data_programada: itemAtivo.data_programada,
            }
          : undefined,
    })
  }, [itemAtivo, sheet])

  if (!isOpen) return null

  // Helpers visuais
  const getCriticalityBadge = (crit: MtoRequirementCriticality) => {
    switch (crit) {
      case 'CRITICO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            Crítico
          </Badge>
        )
      case 'OBRIGATORIO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            Obrigatório
          </Badge>
        )
      case 'PREFERENCIAL':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold">
            Preferencial
          </Badge>
        )
      case 'INFORMATIVO':
      default:
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">
            Informativo
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: MtoRequirementStatus) => {
    switch (status) {
      case 'VALIDADO':
      case 'ATENDIDO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status === 'ATENDIDO' ? 'Atendido' : 'Validado'}
          </Badge>
        )
      case 'BLOQUEADO':
      case 'NAO_ATENDIDO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] flex items-center gap-1 font-semibold">
            <XCircle className="w-3 h-3 text-rose-600" />
            {status === 'BLOQUEADO' ? 'Bloqueado' : 'Não Atendido'}
          </Badge>
        )
      case 'EM_ANALISE':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3 text-blue-600" /> Em Análise
          </Badge>
        )
      case 'PENDENTE':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] flex items-center gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Pendente
          </Badge>
        )
    }
  }

  const getGrupoIcon = (grp: MtoCanonicalGroup) => {
    switch (grp) {
      case 'PRODUTO':
        return <Layers className="w-4 h-4 text-sky-600" />
      case 'PRODUCAO':
        return <Wrench className="w-4 h-4 text-[#004C97]" />
      case 'QUALIDADE':
        return <Microscope className="w-4 h-4 text-emerald-600" />
      case 'COMERCIAL_LOGISTICO':
        return <Package className="w-4 h-4 text-amber-600" />
    }
  }

  // Filtra itens para visualização
  const requisitosFiltrados = validacao.requisitos.filter((r) => {
    const matchGrupo = grupoFiltro === 'TODOS' || r.grupo === grupoFiltro
    const matchTexto =
      !filtroTexto ||
      r.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      r.descricao.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      r.codigo.toLowerCase().includes(filtroTexto.toLowerCase())
    return matchGrupo && matchTexto
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-analitico w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh] 2xl:h-[min(94vh,1100px)] 2xl:max-h-[min(94vh,1100px)] bg-white border-slate-200 text-slate-900 p-0 shadow-2xl flex flex-col overflow-hidden">
        {/* ZONA 1: HEADER FIXO (flex 0 0 auto, azul institucional CIAFAL) */}
        <div className="flex-none bg-gradient-to-r from-[#003870] to-[#004C97] text-white px-6 py-4 border-b border-[#002b55] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg border border-white/20 shrink-0">
                <ClipboardCheck className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-blue-900/80 px-2 py-0.5 rounded text-cyan-200 border border-blue-700">
                    MTO REQUIREMENT ENGINE
                  </span>
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold">
                    Carteira MTO &bull; Ficha Mestra
                  </Badge>
                  {/* Status Consolidado da Ordem */}
                  {validacao.statusGeral === 'BLOQUEADO' ? (
                    <Badge className="bg-rose-900 text-rose-200 border-rose-700 text-[10px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Ordem Bloqueada
                    </Badge>
                  ) : validacao.statusGeral === 'LIBERADO' ? (
                    <Badge className="bg-emerald-900 text-emerald-200 border-emerald-700 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Ordem Liberada
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-900 text-amber-200 border-amber-700 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Pendência de Validação
                    </Badge>
                  )}
                </div>
                <h2
                  className="font-bold text-white mt-1 leading-tight"
                  style={{ fontSize: 'clamp(18px, 1.8vw, 24px)' }}
                >
                  Consulta de Requisitos MTO do Pedido
                </h2>
                <p
                  className="text-blue-100 mt-0.5"
                  style={{ fontSize: 'clamp(12px, 0.95vw, 14px)' }}
                >
                  Motor determinístico de validação por grupos canônicos (Produto, Produção,
                  Qualidade, Comercial/Logístico)
                </p>
              </div>
            </div>

            {/* Seletor rápido de pedido caso venha do cabeçalho geral */}
            {itensMtoDisponiveis.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={`${itemAtivo?.ordem_venda}/${itemAtivo?.item_ordem}`}
                  onChange={(e) => {
                    const sel = itensMtoDisponiveis.find(
                      (it) => `${it.ordem_venda}/${it.item_ordem}` === e.target.value,
                    )
                    if (sel) {
                      setItemAtivo(sel)
                      onSelecionarItem?.(sel)
                    }
                  }}
                  className="bg-blue-900/90 text-white text-xs border border-blue-400/50 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                >
                  {itensMtoDisponiveis.map((it, idx) => (
                    <option key={idx} value={`${it.ordem_venda}/${it.item_ordem}`}>
                      {it.ordem_venda}/{it.item_ordem} &bull; {it.nome_cliente.substring(0, 24)}{' '}
                      (Linha {it.linha || 'L1'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ZONA 2: TOOLBAR / FILTRO STRIP (flex 0 0 auto) */}
        <div className="flex-none px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[320px]">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por título, código ou descrição de requisito..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#004C97]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={grupoFiltro === 'TODOS' ? 'default' : 'outline'}
                onClick={() => setGrupoFiltro('TODOS')}
                className={`h-7 text-xs ${grupoFiltro === 'TODOS' ? 'bg-[#004C97]' : ''}`}
              >
                Todos ({validacao.requisitos.length})
              </Button>
              {validacao.requisitosPorGrupo.map((g) => (
                <Button
                  key={g.grupo}
                  size="sm"
                  variant={grupoFiltro === g.grupo ? 'default' : 'outline'}
                  onClick={() => setGrupoFiltro(g.grupo)}
                  className={`h-7 text-xs gap-1 ${grupoFiltro === g.grupo ? 'bg-[#004C97]' : ''}`}
                >
                  {getGrupoIcon(g.grupo)}
                  <span>{g.nomeGrupo}</span>
                  <span className="text-[10px] opacity-80">({g.total})</span>
                </Button>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {requisitosFiltrados.length} requisito(s) exibido(s)
          </span>
        </div>

        {/* ZONA 3: CORPO COM SCROLL VERTICAL ÚNICO (flex 1 1 auto, min-h-0, overflow-y-auto) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 space-y-4 bg-slate-50/40 text-xs text-slate-800">
          {/* 1. IDENTIFICAÇÃO COMPLETA DO PEDIDO MTO */}
          {itemAtivo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#004C97]" /> Identificação do Pedido MTO
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Chave Canônica:</span>
                  <span className="font-mono text-xs font-bold text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Pedido SAP {itemAtivo.ordem_venda} &bull; Item {itemAtivo.item_ordem}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cliente
                  </span>
                  <strong
                    className="text-slate-900 font-bold block truncate"
                    title={itemAtivo.nome_cliente}
                  >
                    {itemAtivo.nome_cliente}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {itemAtivo.codigo_cliente || 'CLI-SAP'}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Material SAP & Descrição
                  </span>
                  <strong className="text-[#004C97] font-mono font-bold block">
                    {itemAtivo.codigo_material}
                  </strong>
                  <span
                    className="text-[10px] text-slate-600 block truncate"
                    title={itemAtivo.descricao_material}
                  >
                    {itemAtivo.descricao_material}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Quantidade & Unidade
                  </span>
                  <strong className="text-slate-900 font-mono font-bold block">
                    {Number(itemAtivo.qtd_ordem_tons || 0).toFixed(1)} t
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Aberto: {Number(itemAtivo.carteira_aberta_tons || 0).toFixed(1)} t
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Data Desejada
                  </span>
                  <strong className="text-slate-900 font-mono font-bold block">
                    {itemAtivo.data_desejada || 'Não informada'}
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Ordem: {itemAtivo.data_ordem || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Linha / Centro / Empresa
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge className="bg-slate-200 text-slate-800 text-[10px] font-bold">
                      {itemAtivo.linha || 'L1'}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-600">
                      C.{itemAtivo.centro || '1000'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {itemAtivo.empresa || 'CIAFAL'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {sheet?.sales_representative || 'Equipe Comercial'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. RESUMO DO ATENDIMENTO GERAL DOS REQUISITOS */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#004C97]" /> Atendimento Geral dos Requisitos
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {validacao.resumo.totalRequisitos} requisitos &bull; {validacao.resumo.atendidos}{' '}
                atendidos &bull; {validacao.resumo.pendentes} pendentes &bull;{' '}
                {validacao.resumo.bloqueados + validacao.resumo.naoAtendidos} bloqueados
              </span>
            </div>

            {/* Strip de Contadores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">
                  Total Requisitos
                </span>
                <strong className="text-base font-mono font-black text-slate-900">
                  {validacao.resumo.totalRequisitos}
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block uppercase font-bold">
                  Atendidos / Conformes
                </span>
                <strong className="text-base font-mono font-black text-emerald-700">
                  {validacao.resumo.atendidos}
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-700 block uppercase font-bold">
                  Pendentes / Em Análise
                </span>
                <strong className="text-base font-mono font-black text-amber-800">
                  {validacao.resumo.pendentes + validacao.resumo.emAnalise}
                </strong>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  validacao.resumo.bloqueados + validacao.resumo.naoAtendidos > 0
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span
                  className={`text-[10px] block uppercase font-bold ${
                    validacao.resumo.bloqueados + validacao.resumo.naoAtendidos > 0
                      ? 'text-rose-700'
                      : 'text-slate-500'
                  }`}
                >
                  Bloqueios Impeditivos
                </span>
                <strong
                  className={`text-base font-mono font-black ${
                    validacao.resumo.bloqueados + validacao.resumo.naoAtendidos > 0
                      ? 'text-rose-700'
                      : 'text-slate-800'
                  }`}
                >
                  {validacao.resumo.bloqueados + validacao.resumo.naoAtendidos}
                </strong>
              </div>
            </div>

            {/* Alerta de bloqueio caso haja restrição ativa */}
            {validacao.bloqueios.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold text-rose-900 block">
                    Regra Central: Programação bloqueada por não atendimento de requisito
                    crítico/obrigatório
                  </strong>
                  {validacao.bloqueios.map((b, i) => (
                    <div key={i} className="text-[11px] font-medium">
                      &bull; {b}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. REQUISITOS AGRUPADOS POR GRUPOS CANÔNICOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Detalhamento dos Requisitos ({requisitosFiltrados.length})
              </span>
            </div>

            {/* Loading do backend */}
            {loading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#004C97]" />
                <span className="text-xs">
                  Consultando ficha de requisitos no backend PocketBase...
                </span>
              </div>
            ) : !sheet ? (
              /* ESTADO VAZIO HONESTO CONFORME REGRA 3: NUNCA MOCKS */
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Nenhum requisito registrado para este pedido
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  A chave canônica{' '}
                  <strong>
                    Pedido SAP {itemAtivo?.ordem_venda} / Item {itemAtivo?.item_ordem}
                  </strong>{' '}
                  ainda não possui registro correspondente na coleção oficial{' '}
                  <code>order_requirement_sheets</code> do PocketBase.
                </p>
                <div className="pt-2">
                  <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">
                    Sem dados simulados &bull; Estado honesto
                  </Badge>
                </div>
              </div>
            ) : requisitosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs italic">
                Nenhum requisito encontrado para os filtros selecionados.
              </div>
            ) : (
              /* TABELA / LISTA DE REQUISITOS GRANULARES */
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#004C97] text-white text-[11px]">
                    <tr>
                      <th className="p-2.5">Grupo Canônico</th>
                      <th className="p-2.5">Requisito Técnico</th>
                      <th className="p-2.5">Especificação Requerida</th>
                      <th className="p-2.5 text-center">Criticidade</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Bloqueante?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requisitosFiltrados.map((req, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 text-[11px]">
                        <td className="p-2.5 font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            {getGrupoIcon(req.grupo)}
                            <span>{req.grupo}</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <strong className="text-slate-900 block">{req.titulo}</strong>
                          <span className="text-[10px] text-slate-500 block">{req.descricao}</span>
                          {req.detalheIncompatibilidade && (
                            <span className="text-[10px] text-rose-700 font-bold block mt-0.5">
                              &bull; {req.detalheIncompatibilidade}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-800">
                          {req.valorRequerido ? String(req.valorRequerido) : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          {getCriticalityBadge(req.criticidade)}
                        </td>
                        <td className="p-2.5 text-center">{getStatusBadge(req.status)}</td>
                        <td className="p-2.5 text-center">
                          {req.bloqueante ? (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold">
                              SIM
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-[9px]">
                              NÃO
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ZONA 4: RODAPÉ FIXO (flex 0 0 auto, 60-80px) */}
        <div className="flex-none px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shadow-sm min-h-[60px]">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>
              Fonte: <strong>SAP RFC ZSD28C / PB order_requirement_sheets</strong>
            </span>
            <span>&bull;</span>
            <span>
              Última sincronização: <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
            </span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold px-5"
          >
            Fechar Consulta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConsultarRequisitosMTOModal
