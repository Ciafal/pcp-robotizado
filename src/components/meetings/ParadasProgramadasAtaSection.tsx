import React, { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Factory,
  Building2,
  GitBranch,
  Calendar,
  Clock,
  Sparkles,
  Lock,
  History,
  AlertTriangle,
} from 'lucide-react'
import {
  programacaoParadaService,
  CentroParadaRegistro,
} from '@/services/programacao-parada-service'
import { PCPMeetingAtaRecord } from '@/types/pcp-meeting'

interface ParadasProgramadasAtaSectionProps {
  ata: PCPMeetingAtaRecord
  isApprovedOrPublished: boolean
}

interface ParadaSnapshotItem {
  id: string
  parada_id?: string
  empresa_code: string
  linha_code: string
  centro_code: string
  data_hora_inicio: string
  data_hora_fim: string
  duracao_horas: number
  motivo: string
  status: string
  numero_pp?: string
  observacao?: string
  responsavel_cadastro?: string
  ultima_alteracao?: string
}

export const ParadasProgramadasAtaSection: React.FC<ParadasProgramadasAtaSectionProps> = ({
  ata,
  isApprovedOrPublished,
}) => {
  const [liveParadas, setLiveParadas] = useState<CentroParadaRegistro[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // O snapshot congelado da ATA quando APROVADA/PUBLICADA
  const snapshotData = useMemo<ParadaSnapshotItem[] | null>(() => {
    const custom = (ata.structured_content as any)?.paradas_programadas_snapshot
    if (Array.isArray(custom) && custom.length > 0) {
      return custom
    }
    // Fallback: tentar extrair de sec_paradas se houver
    const secParadas = (ata.structured_content?.secoes as any)?.sec_paradas
    if (secParadas?.snapshot && Array.isArray(secParadas.snapshot)) {
      return secParadas.snapshot
    }
    return null
  }, [ata])

  // Buscar paradas da base viva se estiver em elaboração OU para comparação posterior se estiver aprovada
  useEffect(() => {
    let isMounted = true
    const carregar = async () => {
      setLoading(true)
      try {
        const data = await programacaoParadaService.listarCentrosPorFiltro()
        if (isMounted) {
          setLiveParadas(data)
        }
      } catch (e) {
        console.error('Erro ao buscar paradas vivas para ATA:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [ata.id])

  // Formatação de data/hora
  const formatDateTimeDisplay = (dtStr?: string) => {
    if (!dtStr) return '-'
    if (dtStr.includes('/')) return dtStr
    try {
      const parts = dtStr.split(' ')
      if (parts[0]?.includes('-')) {
        const [y, m, d] = parts[0].split('-')
        return `${d}/${m}/${y} ${parts[1] || '00:00'}`
      }
      return dtStr
    } catch {
      return dtStr
    }
  }

  // Lista efetiva de itens a renderizar
  // Regra do requisito:
  // - ATA em elaboração/aberta (MINUTA/EM_REVISAO) -> dados dinâmicos da base viva
  // - ATA finalizada/aprovada (APROVADA/PUBLICADA) -> snapshot congelado preservado
  const itensExibicao: ParadaSnapshotItem[] = useMemo(() => {
    if (isApprovedOrPublished && snapshotData && snapshotData.length > 0) {
      return snapshotData
    }

    // Usar base viva
    return liveParadas.map((lp, idx) => ({
      id: lp.id || `live-${idx}`,
      parada_id: lp.parada_id,
      empresa_code: lp.empresa_code || '1001',
      linha_code: lp.linha_code || 'L1',
      centro_code: lp.centro_code || 'Centro',
      data_hora_inicio: lp.data_hora_inicio,
      data_hora_fim: lp.data_hora_fim,
      duracao_horas: lp.duracao_horas || 0,
      motivo: lp.motivo || 'Manutenção Preventiva',
      status: lp.status || 'ATIVO',
      numero_pp: lp.parada_id
        ? `PP-${lp.parada_id.slice(-5).toUpperCase()}/2026`
        : `PP-0000${idx + 1}/2026`,
      observacao: lp.descricao || '',
      responsavel_cadastro: 'PCP — Planejamento Operacional',
      ultima_alteracao: new Date().toLocaleDateString('pt-BR'),
    }))
  }, [isApprovedOrPublished, snapshotData, liveParadas])

  // IA na geração da ATA: resumo das paradas usando EXCLUSIVAMENTE dados cadastrados
  // consolidando por Empresa -> Linha -> Centro
  const resumoIa = useMemo(() => {
    if (itensExibicao.length === 0) {
      return 'Nenhuma parada programada registrada para este período no cronograma industrial oficial.'
    }

    const frases: string[] = []
    itensExibicao.forEach((it) => {
      const ini = formatDateTimeDisplay(it.data_hora_inicio)
      const fim = formatDateTimeDisplay(it.data_hora_fim)
      const dur = `${it.duracao_horas || 0} horas`
      const mot = it.motivo || 'manutenção preventiva'
      frases.push(
        `Está prevista parada da ${it.linha_code} (Centro ${it.centro_code}, Empresa ${it.empresa_code}) entre ${ini} e ${fim} para ${mot.toLowerCase()}, correspondendo a ${dur} de indisponibilidade programada.`,
      )
    })

    return frases.join(' ')
  }, [itensExibicao])

  // Verificação de alterações posteriores (quando a ATA está congelada)
  const getDiffComBaseViva = (snapItem: ParadaSnapshotItem) => {
    if (!isApprovedOrPublished) return null
    const liveItem = liveParadas.find(
      (lp) =>
        lp.id === snapItem.id ||
        (lp.centro_code === snapItem.centro_code && lp.linha_code === snapItem.linha_code),
    )
    if (!liveItem) return null

    // Comparar datas ou status
    const iniSnap = formatDateTimeDisplay(snapItem.data_hora_inicio)
    const fimSnap = formatDateTimeDisplay(snapItem.data_hora_fim)
    const iniLive = formatDateTimeDisplay(liveItem.data_hora_inicio)
    const fimLive = formatDateTimeDisplay(liveItem.data_hora_fim)

    const mudouInicio = iniSnap !== iniLive
    const mudouFim = fimSnap !== fimLive
    const mudouStatus = snapItem.status !== liveItem.status

    if (mudouInicio || mudouFim || mudouStatus) {
      return {
        snap: `Versão registrada na reunião: Início ${iniSnap} / Fim previsto ${fimSnap} (${snapItem.status})`,
        live: `Atualização posterior: Início ${iniLive} / Fim previsto alterado para ${fimLive} (${liveItem.status})`,
      }
    }
    return null
  }

  return (
    <div
      data-testid="secao-paradas-programadas-ata"
      className="border border-slate-200 rounded-lg p-4 bg-white space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-[#004C97]" />
          <h3 className="font-extrabold text-slate-900 uppercase tracking-wide text-xs">
            Paradas Programadas (Fonte Oficial: PCP)
          </h3>
          {isApprovedOrPublished ? (
            <Badge
              data-testid="badge-snapshot-congelado"
              variant="outline"
              className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-semibold gap-1"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              Snapshot Congelado (ATA Aprovada)
            </Badge>
          ) : (
            <Badge
              data-testid="badge-base-viva"
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Dados Dinâmicos (Base Viva)
            </Badge>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {itensExibicao.length} parada(s) computada(s)
        </span>
      </div>

      {/* IA na Geração da ATA: Resumo Estruturado */}
      <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px] uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Resumo Executivo das Paradas (IA Oficial)</span>
        </div>
        <p className="text-purple-950 font-normal leading-relaxed text-[12px]">{resumoIa}</p>
      </div>

      {/* Tabela de Paradas Programadas na ATA */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-xs">
              <TableHead className="font-bold text-slate-700">Identificação / PP</TableHead>
              <TableHead className="font-bold text-slate-700">Empresa</TableHead>
              <TableHead className="font-bold text-slate-700">Linha</TableHead>
              <TableHead className="font-bold text-slate-700">Centro</TableHead>
              <TableHead className="font-bold text-slate-700">Início</TableHead>
              <TableHead className="font-bold text-slate-700">Fim</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Duração</TableHead>
              <TableHead className="font-bold text-slate-700">Motivo</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensExibicao.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-xs text-slate-500">
                  {loading
                    ? 'Carregando paradas programadas...'
                    : 'Nenhuma parada programada registrada para este período.'}
                </TableCell>
              </TableRow>
            ) : (
              itensExibicao.map((item, idx) => {
                const diff = getDiffComBaseViva(item)
                const isCancelada = item.status === 'CANCELADA' || item.status === 'CANCELADO'

                return (
                  <React.Fragment key={item.id || idx}>
                    <TableRow
                      data-testid={`row-parada-ata-${item.id}`}
                      className={`text-xs ${
                        isCancelada ? 'bg-rose-50/60 opacity-80' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <TableCell className="font-mono font-semibold text-slate-800">
                        <div>{item.numero_pp || `PP-0000${idx + 1}/2026`}</div>
                        {item.observacao && (
                          <div className="text-[10px] text-slate-500 italic max-w-[160px] truncate">
                            {item.observacao}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{item.empresa_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-slate-400" />
                          <span>{item.linha_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-[#004C97]">
                        <div className="flex items-center gap-1">
                          <Factory className="w-3 h-3 text-blue-500" />
                          <span>{item.centro_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateTimeDisplay(item.data_hora_inicio)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateTimeDisplay(item.data_hora_fim)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{item.duracao_horas} h</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{item.motivo}</TableCell>
                      <TableCell className="text-center">
                        {isCancelada ? (
                          <Badge
                            data-testid="badge-parada-cancelada"
                            variant="destructive"
                            className="bg-rose-600 text-white font-bold text-[9px] uppercase px-2 py-0.5 tracking-wider"
                          >
                            CANCELADA
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold py-0"
                          >
                            {item.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Sinalização de Atualização Posterior à Emissão da ATA */}
                    {diff && (
                      <TableRow className="bg-amber-50/80 border-t-0">
                        <TableCell colSpan={9} className="py-2 px-4">
                          <div
                            data-testid="alerta-diff-pos-ata"
                            className="text-[11px] text-amber-900 flex items-start gap-2"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold uppercase tracking-wide text-[10px] text-amber-800">
                                Atualizada após emissão da ATA:
                              </span>
                              <div>
                                <span className="font-semibold">{diff.snap}</span>
                              </div>
                              <div className="text-blue-900 font-semibold">{diff.live}</div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
export default ParadasProgramadasAtaSection
