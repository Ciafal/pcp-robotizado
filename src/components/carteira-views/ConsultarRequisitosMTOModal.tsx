import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  FlaskConical,
  Ruler,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertCircle,
  Layers,
  Tag,
} from 'lucide-react'
import {
  getRequirementsByOrderAndItem,
  classifyMtoRequirement,
} from '@/services/mto-requirements-service'
import type { MtoRequirementRecord, TipoRequisitoMTO } from '@/types/mto-requirements'
import { formatNumberPtBr } from '@/lib/number-format'

interface ConsultarRequisitosMTOModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pedidoNumero?: string
  itemPedido?: string
  clienteNome?: string
  descricaoMaterial?: string
  quantidadeTons?: number
}

/**
 * Formata valores numéricos para exibição no padrão ABNT (vírgula decimal).
 * Caso não haja valor, exibe "—" (traço oficial para campo sem dado).
 */
function formatAbntValue(
  value: number | string | null | undefined,
  suffix?: string,
  options?: { decimals?: number },
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '-' || trimmed === '—') return '—'
    const num = Number(trimmed.replace(',', '.'))
    if (!isNaN(num)) {
      const dec = options?.decimals ?? (Number.isInteger(num) ? 0 : 2)
      const formatted = formatNumberPtBr(num, {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })
      return suffix ? `${formatted} ${suffix}` : formatted
    }
    return suffix ? `${trimmed} ${suffix}` : trimmed
  }
  if (typeof value === 'number') {
    if (isNaN(value)) return '—'
    const dec = options?.decimals ?? (Number.isInteger(value) ? 0 : 2)
    const formatted = formatNumberPtBr(value, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    })
    return suffix ? `${formatted} ${suffix}` : formatted
  }
  return '—'
}

export function ConsultarRequisitosMTOModal({
  open,
  onOpenChange,
  pedidoNumero = '',
  itemPedido = '',
  clienteNome = '',
  descricaoMaterial = '',
  quantidadeTons,
}: ConsultarRequisitosMTOModalProps) {
  const [loading, setLoading] = useState(false)
  const [requirements, setRequirements] = useState<MtoRequirementRecord[]>([])
  const [selectedReqIndex, setSelectedReqIndex] = useState(0)

  useEffect(() => {
    if (!open || !pedidoNumero) {
      setRequirements([])
      setSelectedReqIndex(0)
      return
    }

    let isMounted = true
    setLoading(true)

    getRequirementsByOrderAndItem(pedidoNumero, itemPedido)
      .then((data) => {
        if (!isMounted) return
        setRequirements(data)
        setSelectedReqIndex(0)
      })
      .catch((err) => {
        console.error('Erro ao carregar requisitos MTO:', err)
        if (isMounted) setRequirements([])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, pedidoNumero, itemPedido])

  // Requisito selecionado atualmente
  const currentReq: MtoRequirementRecord | undefined = useMemo(() => {
    return requirements[selectedReqIndex] || requirements[0]
  }, [requirements, selectedReqIndex])

  // Classificação do requisito atual (Seções 4, 5 e 6)
  const currentClassification = useMemo(() => {
    if (!currentReq) return null
    return classifyMtoRequirement(currentReq)
  }, [currentReq])

  // Dados do cabeçalho / resumo visual desduplicados (Seção 4)
  const displayPedido = currentReq?.pedido_numero || pedidoNumero || '—'
  const displayItem = currentReq?.item_pedido || itemPedido || '—'
  const displayCliente = currentReq?.cliente_nome || clienteNome || '—'
  const displayMaterial = currentReq?.descricao_material || descricaoMaterial || '—'
  const displayClasseAco = currentReq?.classe_aco || '—'
  const displayQtd =
    currentReq?.quantidade !== undefined && currentReq.quantidade !== null
      ? `${formatNumberPtBr(currentReq.quantidade, { maximumFractionDigits: 2 })} peças`
      : quantidadeTons !== undefined && quantidadeTons !== null
        ? `${formatNumberPtBr(quantidadeTons, { maximumFractionDigits: 2 })} t`
        : '—'
  const displayCondicao = currentReq?.condicao || '—'
  const displayTipoPrincipal =
    currentClassification?.tipo_principal || currentReq?.tipo_requisito || 'Comprimento'
  const secondaryTags: TipoRequisitoMTO[] =
    currentClassification?.tags_secundarias || currentReq?.tags_secundarias || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[94vw] max-w-[94vw] md:w-[92vw] md:max-w-[92vw] lg:w-[94vw] lg:max-w-[94vw] h-[90vh] max-h-[90vh] p-0 flex flex-col bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-2xl focus:outline-hidden"
        aria-describedby="dialog-mto-description"
      >
        {/* CABEÇALHO FIXO (SEÇÃO 1 e 4): título, qtd de requisitos, pedido, item, material */}
        <DialogHeader className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex-shrink-0 text-left">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
                  <FileText className="h-4 w-4 text-[#004C97]" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Requisitos MTO
                </DialogTitle>
                {requirements.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-[#004C97] border-blue-200 font-semibold px-2 py-0.5 text-xs"
                  >
                    {requirements.length}{' '}
                    {requirements.length === 1 ? 'requisito cadastrado' : 'requisitos cadastrados'}
                  </Badge>
                )}
                {currentReq?.codigo_documento && (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-700 font-mono text-xs"
                  >
                    {currentReq.codigo_documento}
                  </Badge>
                )}
              </div>
              <DialogDescription
                id="dialog-mto-description"
                className="text-xs sm:text-sm text-slate-600 break-words line-clamp-2"
              >
                Pedido <span className="font-semibold text-slate-900">{displayPedido}</span> • Item{' '}
                <span className="font-semibold text-slate-900">{displayItem}</span> •{' '}
                <span className="text-[#004C97] font-medium break-words">{displayMaterial}</span>
              </DialogDescription>
            </div>

            {/* SELETOR / ABAS DE REQUISITOS (SEÇÃO 5 e 6: Requisito 01 — [Tipo]) */}
            {requirements.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 flex-shrink-0 flex-wrap max-w-full">
                {requirements.map((req, idx) => {
                  const isSelected = idx === selectedReqIndex
                  const reqClassif = classifyMtoRequirement(req)
                  const reqTipo = req.tipo_requisito || reqClassif.tipo_principal
                  const reqNum = String(req.requisito_numero || idx + 1).padStart(2, '0')
                  const label = `Requisito ${reqNum} — ${reqTipo}`
                  return (
                    <Button
                      key={req.id || idx}
                      size="sm"
                      variant={isSelected ? 'default' : 'ghost'}
                      className={`text-xs h-7 px-2.5 transition-all whitespace-normal text-left ${
                        isSelected
                          ? 'bg-[#004C97] text-white font-semibold shadow-xs hover:bg-[#003870]'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
                      }`}
                      onClick={() => setSelectedReqIndex(idx)}
                      title={`Alternar para Requisito ${reqNum} (${reqTipo})`}
                    >
                      <Layers className="h-3 w-3 mr-1 shrink-0" />
                      <span>{label}</span>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* RESUMO RÁPIDO ABAIXO DO CABEÇALHO (SEÇÃO 4: pedido, item, cliente, classe aço, quantidade, condição, tipo/título) */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Pedido
              </span>
              <span className="font-semibold text-slate-900 font-mono text-xs break-all">
                {displayPedido}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Item
              </span>
              <span className="font-semibold text-slate-900 font-mono text-xs break-all">
                {displayItem}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0 col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Cliente
              </span>
              <span
                className="font-medium text-slate-800 break-words line-clamp-1"
                title={displayCliente}
              >
                {displayCliente}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Classe do Aço
              </span>
              <span className="font-semibold text-slate-800 break-words">{displayClasseAco}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Quantidade
              </span>
              <span className="font-bold text-[#004C97] break-words">{displayQtd}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                Condição
              </span>
              <span
                className="font-semibold text-slate-800 break-words line-clamp-1"
                title={displayCondicao}
              >
                {displayCondicao}
              </span>
            </div>
          </div>

          {/* TÍTULO / TIPO DO REQUISITO DESTACADO NO RESUMO (SEÇÃO 5 e 6) */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs bg-blue-50/60 p-2 rounded-md border border-blue-100">
            <span className="font-bold text-slate-700 flex items-center gap-1 shrink-0">
              <Tag className="h-3 w-3 text-[#004C97]" /> Tipo Principal:
            </span>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold text-[11px] px-2 py-0.5">
              {displayTipoPrincipal}
            </Badge>
            {secondaryTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium text-[11px]">Tags secundárias:</span>
                {secondaryTags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="bg-white text-slate-700 border-slate-300 font-medium text-[10.5px] px-1.5 py-0.2"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* CORPO COM ROLAGEM VERTICAL INTERNA (SEÇÃO 1 e 2: sem corte lateral, sem rolagem horizontal na página) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !currentReq ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                Nenhum requisito cadastrado
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Não foram encontrados requisitos Make-to-Order para o pedido {pedidoNumero} item{' '}
                {itemPedido}.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* 1. IDENTIFICAÇÃO DO REQUISITO (SEÇÃO 4: sem triplicação redundante, campos responsivos com break-words) */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#004C97]" />
                      <CardTitle className="text-sm font-bold text-slate-800">
                        1. Identificação do Requisito ({displayTipoPrincipal})
                      </CardTitle>
                    </div>
                    {currentReq.requisito_id && (
                      <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {currentReq.requisito_id}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Grid responsiva com quebra de linha: 4 colunas desktop, 2 colunas tablet, 1 coluna mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Código do Documento:</span>
                      <span className="font-semibold text-slate-800 font-mono break-all">
                        {currentReq.codigo_documento || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Cliente:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.cliente_nome || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Produto:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.produto || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Aplicação:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.aplicacao || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">
                        Responsável pela Consulta:
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.responsavel_consulta || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Norma Aplicável:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.norma_aplicavel || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Nº de Peças:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.numero_pecas !== null &&
                        currentReq.numero_pecas !== undefined &&
                        currentReq.numero_pecas > 0
                          ? formatNumberPtBr(currentReq.numero_pecas, { maximumFractionDigits: 0 })
                          : '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Data da Consulta:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.data_consulta || '—'}
                      </span>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100 min-w-0">
                      <span className="text-slate-500 font-medium block">
                        Descrição do Material:
                      </span>
                      <span className="font-bold text-slate-900 text-sm break-words">
                        {currentReq.descricao_material || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. REQUISITOS DO PRODUTO (CONDIÇÃO LIVRE) */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      2. Requisitos do Produto
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-xs min-w-0">
                    <span className="text-slate-500 font-medium block mb-1">
                      Condição (Texto livre / Especificação de Fornecimento):
                    </span>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 break-words">
                      <span className="font-bold text-slate-900 text-sm font-mono break-words">
                        {currentReq.condicao || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. COMPOSIÇÃO QUÍMICA (%) — TABELA TÉCNICA COM SCROLL HORIZONTAL LOCAL */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-[#004C97]" />
                      <CardTitle className="text-sm font-bold text-slate-800">
                        3. Composição Química (%)
                      </CardTitle>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Valores em % peso (scroll local se necessário)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-xs text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-2 px-3 border-r border-slate-200 w-28 shrink-0">
                            Elemento
                          </th>
                          {['C', 'Mn', 'Si', 'P', 'S', 'Cr', 'Ni', 'Mo', 'Al', 'B', 'Cu', 'H'].map(
                            (el) => (
                              <th
                                key={el}
                                className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 min-w-[54px]"
                              >
                                {el}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-2 px-3 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200">
                            Mínimo (%)
                          </td>
                          {['C', 'Mn', 'Si', 'P', 'S', 'Cr', 'Ni', 'Mo', 'Al', 'B', 'Cu', 'H'].map(
                            (el) => {
                              const found = currentReq.composicao_quimica?.elementos?.find(
                                (e) => e.elemento.toUpperCase() === el,
                              )
                              const val =
                                found?.min !== undefined && found?.min !== null
                                  ? formatNumberPtBr(found.min, {
                                      minimumFractionDigits: 3,
                                      maximumFractionDigits: 3,
                                    })
                                  : '—'
                              return (
                                <td
                                  key={`min-${el}`}
                                  className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 text-slate-800 font-mono"
                                >
                                  {val}
                                </td>
                              )
                            },
                          )}
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-600 bg-slate-50 border-r border-slate-200">
                            Máximo (%)
                          </td>
                          {['C', 'Mn', 'Si', 'P', 'S', 'Cr', 'Ni', 'Mo', 'Al', 'B', 'Cu', 'H'].map(
                            (el) => {
                              const found = currentReq.composicao_quimica?.elementos?.find(
                                (e) => e.elemento.toUpperCase() === el,
                              )
                              const val =
                                found?.max !== undefined && found?.max !== null
                                  ? formatNumberPtBr(found.max, {
                                      minimumFractionDigits: 3,
                                      maximumFractionDigits: 3,
                                    })
                                  : '—'
                              return (
                                <td
                                  key={`max-${el}`}
                                  className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 text-slate-800 font-mono"
                                >
                                  {val}
                                </td>
                              )
                            },
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 4. DIMENSÕES E TOLERÂNCIAS */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      4. Dimensões e Tolerâncias
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Raio de Canto:
                      </span>
                      <span className="font-bold text-slate-900 text-sm break-words">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.raio_canto, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">Romboidade:</span>
                      <span className="font-bold text-slate-900 text-sm break-words">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.romboidade, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">Altura:</span>
                      <span className="font-bold text-slate-900 text-sm break-words">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.altura, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">Largura:</span>
                      <span className="font-bold text-slate-900 text-sm break-words">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.largura, 'mm')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5. COMPRIMENTO */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      5. Comprimento
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 min-w-0 col-span-2 sm:col-span-1">
                      <span className="text-blue-900/80 font-semibold block truncate">
                        Comprimento Principal:
                      </span>
                      <span className="font-extrabold text-[#004C97] text-base break-words">
                        {formatAbntValue(currentReq.comprimento?.comprimento_principal, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Tolerância +:
                      </span>
                      <span className="font-bold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.tolerancia_mais, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Tolerância −:
                      </span>
                      <span className="font-bold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.tolerancia_menos, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Múltiplo 1º:
                      </span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.multiplo_1, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Múltiplo 2º:
                      </span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.multiplo_2, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Múltiplo 3º:
                      </span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.multiplo_3, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Curtos Mín.:
                      </span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.curtos_min, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Curtos Máx.:
                      </span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.curtos_max, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 min-w-0">
                      <span className="text-slate-500 font-medium block truncate">Curtos %:</span>
                      <span className="font-semibold text-slate-800 text-sm break-words">
                        {formatAbntValue(currentReq.comprimento?.curtos_pct, '%')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6. CONDIÇÕES E GARANTIAS PARA SUPERFÍCIE */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      6. Condições e Garantias para Superfície
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">Aplicação:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.garantias_superficie?.aplicacao || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">
                        Padrão de Qualidade Superficial:
                      </span>
                      <span className="font-bold text-[#004C97] text-sm font-mono break-words">
                        {currentReq.garantias_superficie?.padrao_qualidade_superficial || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block">
                        Observações / Condições de Superfície:
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.garantias_superficie?.observacoes || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 7. CONDIÇÕES DE GARANTIA INTERNA */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      7. Condições de Garantia Interna
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Garantia Interna:
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.garantias_internas?.garantia_interna || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block truncate">Método:</span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.garantias_internas?.metodo || '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Valor Máximo:
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {formatAbntValue(currentReq.garantias_internas?.valor_maximo)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 font-medium block truncate">
                        Queda Eco Fundo:
                      </span>
                      <span className="font-semibold text-slate-800 break-words">
                        {currentReq.garantias_internas?.queda_eco_fundo || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 8. GARANTIAS ESPECÍFICAS (COM BLOCOS INTERNOS E TABELAS COM SCROLL LOCAL) */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      8. Garantias Específicas
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Bloco 8.1: Ensaio de Tração */}
                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block"></span>
                      Ensaio de Tração
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded border border-slate-200 min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          LR — Limite de Resistência:
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm break-words">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_tracao?.lr_mpa,
                            'MPa',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-slate-200 min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          LE — Limite de Escoamento:
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm break-words">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_tracao?.le_mpa,
                            'MPa',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-slate-200 min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          Alongamento:
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm break-words">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_tracao?.alongamento_pct,
                            '%',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.2: Dureza */}
                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block"></span>
                      Dureza
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block">Tipo de Dureza:</span>
                        <span className="font-semibold text-slate-800 break-words">
                          {currentReq.garantias_especificas?.dureza?.tipo_dureza || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block">Máximo:</span>
                        <span className="font-semibold text-slate-800 break-words">
                          {formatAbntValue(currentReq.garantias_especificas?.dureza?.maximo)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block">Mínimo:</span>
                        <span className="font-semibold text-slate-800 break-words">
                          {formatAbntValue(currentReq.garantias_especificas?.dureza?.minimo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.3: Ensaio Charpy */}
                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block"></span>
                      Ensaio Charpy
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          Orientação do Corpo de Prova:
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {currentReq.garantias_especificas?.ensaio_charpy?.orientacao || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          Temperatura (°C):
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_charpy?.temperatura_c,
                            '°C',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block truncate">
                          Valor Mínimo (J):
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_charpy?.valor_minimo_j,
                            'J',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.4: Caracterização Metalúrgica e Microinclusões */}
                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block"></span>
                      Caracterização Metalúrgica
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block">
                          Tamanho de Grão Austenítico:
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {currentReq.garantias_especificas?.caracterizacao_metalurgica
                            ?.tamanho_grao_austenitico || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 font-medium block">Descarbonetação:</span>
                        <span className="font-semibold text-slate-800 break-words">
                          {currentReq.garantias_especificas?.caracterizacao_metalurgica
                            ?.descarbonetacao || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Sub-card Microinclusões ASTM E45 Método A */}
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Microinclusões — ASTM E45 Método A
                        </span>
                        <span className="text-[10px] text-slate-400">
                          AF, BF, CF, DF / AG, BG, CG, DG
                        </span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-xs">
                        {['af', 'bf', 'cf', 'df', 'ag', 'bg', 'cg', 'dg'].map((key) => {
                          const val = (
                            currentReq.garantias_especificas?.caracterizacao_metalurgica
                              ?.microinclusoes_astm_e45_a as any
                          )?.[key]
                          return (
                            <div
                              key={key}
                              className="bg-slate-50 p-1 rounded border border-slate-200"
                            >
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {key}
                              </span>
                              <span className="font-semibold text-slate-800 text-[11px]">
                                {formatAbntValue(val)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.5: Temperabilidade (Scroll horizontal estritamente local dentro da seção) */}
                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block"></span>
                      Temperabilidade (Pontos mm & Escala 1/16")
                    </h4>

                    {/* Tabela mm com scroll interno */}
                    <div className="bg-white rounded border border-slate-200 overflow-hidden">
                      <div className="p-2 bg-slate-100 text-[11px] font-semibold text-slate-700 border-b border-slate-200">
                        Pontos em Milímetros (mm)
                      </div>
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                              {[
                                '1,5',
                                '3',
                                '5',
                                '7',
                                '9',
                                '11',
                                '13',
                                '15',
                                '20',
                                '25',
                                '30',
                                '35',
                                '40',
                              ].map((p) => (
                                <th
                                  key={p}
                                  className="p-1.5 border-r border-slate-200 last:border-r-0 min-w-[46px]"
                                >
                                  {p} mm
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {[
                                '1,5',
                                '3',
                                '5',
                                '7',
                                '9',
                                '11',
                                '13',
                                '15',
                                '20',
                                '25',
                                '30',
                                '35',
                                '40',
                              ].map((p) => {
                                const found =
                                  currentReq.garantias_especificas?.temperabilidade?.pontos_mm?.find(
                                    (item) => String(item.pos_mm) === p,
                                  )
                                return (
                                  <td
                                    key={p}
                                    className="p-1.5 border-r border-slate-200 last:border-r-0 font-mono text-slate-800"
                                  >
                                    {formatAbntValue(found?.valor)}
                                  </td>
                                )
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tabela polegada com scroll interno */}
                    <div className="bg-white rounded border border-slate-200 overflow-hidden mt-3">
                      <div className="p-2 bg-slate-100 text-[11px] font-semibold text-slate-700 border-b border-slate-200">
                        Escala em 1/16 de Polegada (Posições 1 a 32)
                      </div>
                      <div className="overflow-x-auto max-w-full max-h-36 overflow-y-auto">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                              {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
                                <th
                                  key={n}
                                  className="p-1 border-r border-slate-200 last:border-r-0 min-w-[36px] text-[10px]"
                                >
                                  {n}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => {
                                const found =
                                  currentReq.garantias_especificas?.temperabilidade?.escala_polegada_16?.find(
                                    (item) => item.pos === n,
                                  )
                                return (
                                  <td
                                    key={n}
                                    className="p-1 border-r border-slate-200 last:border-r-0 font-mono text-[11px] text-slate-800"
                                  >
                                    {formatAbntValue(found?.valor)}
                                  </td>
                                )
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 9. POLÍTICA DA QUALIDADE */}
              <div className="bg-slate-100/80 rounded-lg p-3.5 border border-slate-200 text-slate-600 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                  9. Política da Qualidade
                </span>
                <p className="italic text-slate-700 leading-relaxed break-words">
                  "
                  {currentReq.politica_qualidade ||
                    'Buscar sempre o atendimento dos requisitos para satisfazer os clientes, produzir e comercializar laminados a quente, utilizando recursos de forma otimizada, satisfazendo as partes interessadas, melhorando continuamente.'}
                  "
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ FIXO (SEÇÃO 1) */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 truncate mr-2">
            {currentReq?.origem_dados && (
              <span>
                Origem:{' '}
                <span className="font-medium text-slate-700">{currentReq.origem_dados}</span>
              </span>
            )}
          </div>
          <Button
            variant="default"
            className="bg-[#004C97] hover:bg-[#003870] text-white font-medium px-5 h-8 text-xs shrink-0"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
