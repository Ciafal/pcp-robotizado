/**
 * Totalizadores Oficiais — Peça 1: Dados IBGE
 * Respondendo fielmente aos filtros:
 * 1. Centros selecionados
 * 2. Materiais (distintos)
 * 3. Quantidade produzida (NUNCA somar UM incompatíveis; discriminar por unidade se houver mais de uma)
 * 4. Registros
 * 5. Status (Pendente / Conferida / Enviada à Contabilidade)
 */

import React, { useState } from 'react'
import { TotalizadoresIbge } from '@/types/dados-ibge'
import { Factory, Package, Scale, FileText, CheckCircle2, Clock, Info } from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  totalizadores: TotalizadoresIbge
  carregando?: boolean
}

export const DadosIbgeTotalizadores: React.FC<Props> = ({ totalizadores, carregando = false }) => {
  const [modalUnidadesAberto, setModalUnidadesAberto] = useState(false)

  // Badge compacto com "Pendente" / "Conferido" / "Enviado"
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enviada à Contabilidade':
      case 'Enviada':
      case 'Enviado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-semibold px-2 py-0.5 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            Enviado
          </Badge>
        )
      case 'Conferida':
      case 'Conferido':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 gap-1 text-[11px] font-semibold px-2 py-0.5 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-[#004C97] shrink-0" />
            Conferido
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-semibold px-2 py-0.5 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            Pendente
          </Badge>
        )
    }
  }

  // Quantidades agrupadas por unidade de medida (NUNCA somar UM incompatíveis)
  const umEntries = Object.entries(totalizadores.quantidades_por_unidade || {})
  const hasMultipleUnits = umEntries.length > 1
  const hasSingleUnit = umEntries.length === 1

  // Formatação do Card 3 (Quantidade Produzida)
  let mainQtdDisplay = '0,00 t'
  let subQtdDisplay = 'Volume total apurado'

  if (carregando) {
    mainQtdDisplay = '—'
    subQtdDisplay = 'Calculando volumes...'
  } else if (hasMultipleUnits) {
    mainQtdDisplay = `${umEntries.length} unidades distintas`
    subQtdDisplay = 'Clique para ver detalhamento'
  } else if (hasSingleUnit) {
    const [um, val] = umEntries[0]
    // Padrão pt-BR com vírgula e milhar
    const dec = um.toLowerCase() === 't' ? 3 : 2
    mainQtdDisplay = `${formatNumberPTBR(val, dec)} ${um}`
    subQtdDisplay = 'Volume total apurado'
  }

  // Contagem de pendências para o subtítulo do Card 5
  const pendenciasCount = totalizadores.contagem_por_status?.pendente ?? 0
  const enviadasCount = totalizadores.contagem_por_status?.enviada ?? 0
  const conferidasCount = totalizadores.contagem_por_status?.conferida ?? 0

  const statusSubtitulo =
    pendenciasCount > 0
      ? `${pendenciasCount} pendência(s)`
      : enviadasCount > 0
        ? 'Fechamento transmitido'
        : conferidasCount > 0
          ? 'Pronto para envio'
          : 'Sem pendências'

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* CARD 1: Centros Selecionados */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#004C97] rounded-lg border border-blue-100 shrink-0">
              <Factory className="w-4 h-4 text-[#004C97]" />
            </div>
            <span className="text-xs font-semibold text-slate-600 line-clamp-2 leading-tight">
              Centros Selecionados
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {carregando
                ? '—'
                : totalizadores.centros_selecionados_count === 0
                  ? 'Todos'
                  : totalizadores.centros_selecionados_count}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
              {totalizadores.centros_selecionados_count === 0
                ? 'Todos os centros da linha'
                : 'centros selecionados'}
            </p>
          </div>
        </div>

        {/* CARD 2: Materiais Distintos */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-50 text-[#004C97] rounded-lg border border-slate-200 shrink-0">
              <Package className="w-4 h-4 text-[#004C97]" />
            </div>
            <span className="text-xs font-semibold text-slate-600 line-clamp-2 leading-tight">
              Materiais Distintos
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {carregando ? '—' : totalizadores.materiais_distintos_count}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
              Itens em consolidação
            </p>
          </div>
        </div>

        {/* CARD 3: Quantidade Produzida */}
        <div
          onClick={() => {
            if (hasMultipleUnits && !carregando) {
              setModalUnidadesAberto(true)
            }
          }}
          className={`bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[112px] ${
            hasMultipleUnits && !carregando ? 'cursor-pointer hover:border-emerald-300' : ''
          }`}
          title={
            hasMultipleUnits
              ? 'Clique para visualizar a quantidade discriminada por unidade de medida'
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shrink-0">
                <Scale className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-slate-600 line-clamp-2 leading-tight">
                Quantidade Produzida
              </span>
            </div>
            {hasMultipleUnits && !carregando && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 shrink-0">
                <Info className="w-3 h-3" />
                Detalhar
              </span>
            )}
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {mainQtdDisplay}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{subQtdDisplay}</p>
          </div>
        </div>

        {/* CARD 4: Registros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 shrink-0">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-600 line-clamp-2 leading-tight">
              Registros
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {carregando ? '—' : totalizadores.total_registros}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
              Apontamentos MES + OPs
            </p>
          </div>
        </div>

        {/* CARD 5: Status do Fechamento */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs font-semibold text-slate-600 line-clamp-2 leading-tight">
              Status do Fechamento
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center min-h-[28px]">
              {carregando ? (
                <span className="text-sm font-semibold text-slate-400">—</span>
              ) : (
                getStatusBadge(totalizadores.status_geral)
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
              {carregando ? 'Avaliando pendências...' : statusSubtitulo}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Detalhamento de Múltiplas Unidades de Medida */}
      <Dialog open={modalUnidadesAberto} onOpenChange={setModalUnidadesAberto}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              Detalhamento de Quantidades por Unidade
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Os itens consolidados possuem grandezas físicas distintas e não podem ser somados
              diretamente como uma única unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 my-2">
            {umEntries.map(([unidade, total]) => {
              const dec = unidade.toLowerCase() === 't' ? 3 : 2
              return (
                <div
                  key={unidade}
                  className="p-3.5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Unidade de Medida
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 border-slate-300 uppercase"
                    >
                      {unidade}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                      Volume Total
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {formatNumberPTBR(total, dec)}{' '}
                      <span className="text-xs text-slate-500 font-normal uppercase">
                        {unidade}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalUnidadesAberto(false)}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DadosIbgeTotalizadores
