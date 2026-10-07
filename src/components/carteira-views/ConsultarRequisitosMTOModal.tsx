import React, { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Layers,
  Calendar,
  User,
  FlaskConical,
  Ruler,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import type { MtoRequirementRecord } from '@/types/mto-requirements'
import { getRequirementsByOrderAndItem } from '@/services/mto-requirements-service'
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
 * Utilitário para formatar valores numéricos com unidade conforme norma ABNT/SI:
 * - vírgula decimal pt-BR
 * - espaço entre número e unidade (ex.: "4,80 m", "400 MPa", "20 %", "25 °C")
 * - campos sem informação exibem "—" sem inventar valores
 */
export function formatAbntValue(
  value: number | string | null | undefined,
  unit?: string,
  options?: { decimals?: number },
): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'number') {
    if (isNaN(value)) return '—'
    const formattedNum = formatNumberPtBr(value, {
      minimumFractionDigits: options?.decimals !== undefined ? options.decimals : 2,
      maximumFractionDigits: options?.decimals !== undefined ? options.decimals : 2,
    })
    return unit ? `${formattedNum} ${unit}` : formattedNum
  }

  // Se já for string (ex: "4,80", "NÃO INFORMADA")
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '—'
  return unit ? `${trimmed} ${unit}` : trimmed
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

  // Fallback de dados do cabeçalho caso o requisito ainda esteja carregando
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] max-w-[1550px] h-[92vh] max-h-[95vh] p-0 flex flex-col bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-2xl"
        aria-describedby="dialog-mto-description"
      >
        {/* CABEÇALHO FIXO DURANTE A ROLAGEM */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <FileText className="h-4 w-4" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  Requisitos MTO
                </DialogTitle>
                {requirements.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5"
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
                className="text-xs md:text-sm text-slate-600 truncate max-w-5xl"
              >
                Pedido <span className="font-semibold text-slate-900">{displayPedido}</span> • Item{' '}
                <span className="font-semibold text-slate-900">{displayItem}</span> •{' '}
                <span className="text-blue-900 font-medium">{displayMaterial}</span>
              </DialogDescription>
            </div>

            {/* SELETOR RESPONSIVO DE REQUISITOS (QUANDO HOUVER MÚLTIPLOS) */}
            {requirements.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200 flex-shrink-0 overflow-x-auto max-w-full">
                {requirements.map((req, idx) => {
                  const isSelected = idx === selectedReqIndex
                  const label = `Requisito ${String(req.requisito_numero || idx + 1).padStart(2, '0')}`
                  return (
                    <Button
                      key={req.id || idx}
                      size="sm"
                      variant={isSelected ? 'default' : 'ghost'}
                      className={`text-xs h-8 px-3 transition-all ${
                        isSelected
                          ? 'bg-blue-700 text-white font-semibold shadow-sm hover:bg-blue-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      onClick={() => setSelectedReqIndex(idx)}
                    >
                      <Layers className="h-3 w-3 mr-1.5" />
                      {label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* BARRA DE RESUMO EXECUTIVO FIXA (RESUMO METADADOS) */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Pedido
              </span>
              <span className="font-semibold text-slate-900 font-mono text-xs">
                {displayPedido}
              </span>
            </div>
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Item
              </span>
              <span className="font-semibold text-slate-900 font-mono text-xs">{displayItem}</span>
            </div>
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100 col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Cliente
              </span>
              <span className="font-medium text-slate-800 truncate block" title={displayCliente}>
                {displayCliente}
              </span>
            </div>
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Classe do Aço
              </span>
              <span className="font-semibold text-slate-800">{displayClasseAco}</span>
            </div>
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Quantidade
              </span>
              <span className="font-semibold text-blue-900">{displayQtd}</span>
            </div>
            <div className="bg-slate-50/70 p-2 rounded border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Condição
              </span>
              <span className="font-semibold text-slate-800 truncate block" title={displayCondicao}>
                {displayCondicao}
              </span>
            </div>
          </div>
        </div>

        {/* CORPO COM SCROLL INTERNO: AS 9 SEÇÕES ESTRUTURADAS */}
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-64 w-full" />
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
            <div className="space-y-5 pb-6">
              {/* 1. IDENTIFICAÇÃO DO REQUISITO */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      1. Identificação do Requisito
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Código do Documento:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {currentReq.codigo_documento || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Cliente:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.cliente_nome || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Produto:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.produto || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Aplicação:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.aplicacao || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Classe do Aço:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.classe_aco || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">
                        Responsável pela Consulta:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.responsavel_consulta || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Norma Aplicável:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.norma_aplicavel || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Nº de Peças:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.numero_pecas !== null &&
                        currentReq.numero_pecas !== undefined &&
                        currentReq.numero_pecas > 0
                          ? formatNumberPtBr(currentReq.numero_pecas, { maximumFractionDigits: 0 })
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Nº do Pedido:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {currentReq.pedido_numero || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Item do Pedido:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {currentReq.item_pedido || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Quantidade:</span>
                      <span className="font-bold text-blue-900">
                        {currentReq.quantidade !== null && currentReq.quantidade !== undefined
                          ? `${formatNumberPtBr(currentReq.quantidade, { maximumFractionDigits: 2 })} peças`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Data da Consulta:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.data_consulta || '—'}
                      </span>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium block">
                        Descrição do Material:
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {currentReq.descricao_material || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. REQUISITOS DO PRODUTO (CONDIÇÃO LIVRE) */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      2. Requisitos do Produto
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-slate-500 font-medium block mb-1">
                        Condição (Texto livre / Especificação de Fornecimento):
                      </span>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900 text-sm font-mono">
                          {currentReq.condicao || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. COMPOSIÇÃO QUÍMICA (%) */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-blue-700" />
                      <CardTitle className="text-sm font-bold text-slate-800">
                        3. Composição Química (%)
                      </CardTitle>
                    </div>
                    <span className="text-[11px] text-slate-500">Valores em % peso</span>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {/* Grid de 12 elementos obrigatórios */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-2 px-3 border-r border-slate-200 w-28">Elemento</th>
                          {['C', 'Mn', 'Si', 'P', 'S', 'Cr', 'Ni', 'Mo', 'Al', 'B', 'Cu', 'H'].map(
                            (el) => (
                              <th
                                key={el}
                                className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 min-w-[58px]"
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
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      4. Dimensões e Tolerâncias
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Raio de Canto:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.raio_canto, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Romboidade:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.romboidade, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Altura:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.altura, 'mm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Largura:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatAbntValue(currentReq.dimensoes_tolerancias?.largura, 'mm')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5. COMPRIMENTO */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      5. Comprimento
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs">
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <span className="text-blue-900/70 font-semibold block">
                        Comprimento Principal:
                      </span>
                      <span className="font-extrabold text-blue-950 text-base">
                        {formatAbntValue(currentReq.comprimento?.comprimento_principal, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Tolerância +:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.tolerancia_mais, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Tolerância −:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.tolerancia_menos, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Múltiplo 1º:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.multiplo_1, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Múltiplo 2º:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.multiplo_2, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Múltiplo 3º:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.multiplo_3, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Curtos Mín.:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.curtos_min, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Curtos Máx.:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.curtos_max, 'm')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 font-medium block">Curtos %:</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {formatAbntValue(currentReq.comprimento?.curtos_pct, '%')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6. CONDIÇÕES E GARANTIAS PARA SUPERFÍCIE */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      6. Condições e Garantias para Superfície
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Aplicação:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.garantias_superficie?.aplicacao || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">
                        Padrão de Qualidade Superficial:
                      </span>
                      <span className="font-bold text-blue-900 text-sm font-mono">
                        {currentReq.garantias_superficie?.padrao_qualidade_superficial || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">
                        Observações / Condições de Superfície:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.garantias_superficie?.observacoes || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 7. CONDIÇÕES DE GARANTIA INTERNA */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      7. Condições de Garantia Interna
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Garantia Interna:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.garantias_internas?.garantia_interna || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Método:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.garantias_internas?.metodo || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Valor Máximo:</span>
                      <span className="font-semibold text-slate-800">
                        {formatAbntValue(currentReq.garantias_internas?.valor_maximo)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Queda Eco Fundo:</span>
                      <span className="font-semibold text-slate-800">
                        {currentReq.garantias_internas?.queda_eco_fundo || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 8. GARANTIAS ESPECÍFICAS (COM BLOCOS INTERNOS) */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-700" />
                    <CardTitle className="text-sm font-bold text-slate-800">
                      8. Garantias Específicas
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Bloco 8.1: Ensaio de Tração */}
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Ensaio de Tração
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <span className="text-slate-500 font-medium block">
                          LR — Limite de Resistência:
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_tracao?.lr_mpa,
                            'MPa',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <span className="text-slate-500 font-medium block">
                          LE — Limite de Escoamento:
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_tracao?.le_mpa,
                            'MPa',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <span className="text-slate-500 font-medium block">Alongamento:</span>
                        <span className="font-extrabold text-slate-900 text-sm">
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
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Dureza
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">Tipo de Dureza:</span>
                        <span className="font-semibold text-slate-800">
                          {currentReq.garantias_especificas?.dureza?.tipo_dureza || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Máximo:</span>
                        <span className="font-semibold text-slate-800">
                          {formatAbntValue(currentReq.garantias_especificas?.dureza?.maximo)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Mínimo:</span>
                        <span className="font-semibold text-slate-800">
                          {formatAbntValue(currentReq.garantias_especificas?.dureza?.minimo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.3: Ensaio Charpy */}
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Ensaio Charpy
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">
                          Orientação do Corpo de Prova:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {currentReq.garantias_especificas?.ensaio_charpy?.orientacao || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Temperatura (°C):</span>
                        <span className="font-semibold text-slate-800">
                          {formatAbntValue(
                            currentReq.garantias_especificas?.ensaio_charpy?.temperatura_c,
                            '°C',
                            { decimals: 0 },
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Valor Mínimo (J):</span>
                        <span className="font-semibold text-slate-800">
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
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Caracterização Metalúrgica
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
                      <div>
                        <span className="text-slate-500 font-medium block">
                          Tamanho de Grão Austenítico:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {currentReq.garantias_especificas?.caracterizacao_metalurgica
                            ?.tamanho_grao_austenitico || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Descarbonetação:</span>
                        <span className="font-semibold text-slate-800">
                          {currentReq.garantias_especificas?.caracterizacao_metalurgica
                            ?.descarbonetacao || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Sub-card Microinclusões ASTM E45 Método A */}
                    <div className="bg-white p-3.5 rounded border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Microinclusões — ASTM E45 Método A
                        </span>
                        <span className="text-[10px] text-slate-400">
                          AF, BF, CF, DF / AG, BG, CG, DG
                        </span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
                        {['af', 'bf', 'cf', 'df', 'ag', 'bg', 'cg', 'dg'].map((key) => {
                          const val = (
                            currentReq.garantias_especificas?.caracterizacao_metalurgica
                              ?.microinclusoes_astm_e45_a as any
                          )?.[key]
                          return (
                            <div
                              key={key}
                              className="bg-slate-50 p-1.5 rounded border border-slate-200"
                            >
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {key}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {formatAbntValue(val)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 8.5: Temperabilidade */}
                  <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      Temperabilidade (Pontos mm & Escala 1/16")
                    </h4>

                    {/* Tabela com scroll interno */}
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
                                  className="p-1.5 border-r border-slate-200 last:border-r-0 min-w-[50px]"
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
                                  className="p-1 border-r border-slate-200 last:border-r-0 min-w-[38px] text-[10px]"
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

              {/* 9. POLÍTICA DA QUALIDADE (SEÇÃO DISCRETA AO FINAL) */}
              <div className="bg-slate-100/80 rounded-lg p-4 border border-slate-200 text-slate-600 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                  9. Política da Qualidade
                </span>
                <p className="italic text-slate-700 leading-relaxed">
                  "
                  {currentReq.politica_qualidade ||
                    'Buscar sempre o atendimento dos requisitos para satisfazer os clientes, produzir e comercializar laminados a quente, utilizando recursos de forma otimizada, satisfazendo as partes interessadas, melhorando continuamente.'}
                  "
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* RODAPÉ FIXO COM APENAS "FECHAR" */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {currentReq?.origem_dados && (
              <span>
                Origem:{' '}
                <span className="font-medium text-slate-700">{currentReq.origem_dados}</span>
              </span>
            )}
          </div>
          <Button
            variant="default"
            className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-5 h-9"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
