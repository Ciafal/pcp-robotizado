import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Copy,
  History,
  Mail,
  XCircle,
  Calendar,
  Building2,
  GitBranch,
  Factory,
  RefreshCw,
  Clock,
} from 'lucide-react'
import {
  ProgramacaoParadaRegistro,
  CentroParadaRegistro,
  ParadaStatus,
  MotivoParadaTipo,
  MOTIVOS_PARADA_OPTIONS,
  programacaoParadaService,
} from '@/services/programacao-parada-service'
import { lineMasterService } from '@/services/line-master'

interface ConsultaProgramacoesViewProps {
  onNovaProgramacao: () => void
  onVisualizar: (id: string) => void
  onEditar: (id: string) => void
  onDuplicar: (id: string) => void
  onHistorico: (id: string, codigo: string) => void
  onComunicado: (parada: ProgramacaoParadaRegistro) => void
  onCancelar: (id: string, codigo: string) => void
  canEdit?: boolean
}

export const ConsultaProgramacoesView: React.FC<ConsultaProgramacoesViewProps> = ({
  onNovaProgramacao,
  onVisualizar,
  onEditar,
  onDuplicar,
  onHistorico,
  onComunicado,
  onCancelar,
  canEdit = true,
}) => {
  const [programacoes, setProgramacoes] = useState<ProgramacaoParadaRegistro[]>([])
  const [allCentros, setAllCentros] = useState<CentroParadaRegistro[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('ALL')
  const [filtroLinha, setFiltroLinha] = useState<string>('ALL')
  const [filtroCentro, setFiltroCentro] = useState<string>('ALL')
  const [filtroStatus, setFiltroStatus] = useState<string>('ALL')
  const [filtroMotivo, setFiltroMotivo] = useState<string>('ALL')
  const [filtroCriadoPor, setFiltroCriadoPor] = useState<string>('')
  const [filtroTexto, setFiltroTexto] = useState<string>('')

  // Listas para comboboxes de filtros
  const [empresasOptions, setEmpresasOptions] = useState<string[]>([])
  const [linhasOptions, setLinhasOptions] = useState<string[]>([])
  const [centrosOptions, setCentrosOptions] = useState<string[]>([])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [listagem, centrosList] = await Promise.all([
        programacaoParadaService.listarProgramacoes(),
        programacaoParadaService.listarCentrosPorFiltro(),
      ])

      setProgramacoes(listagem)
      setAllCentros(centrosList)

      // Extrair opções únicas para os filtros
      const empSet = new Set<string>()
      const linSet = new Set<string>()
      const cenSet = new Set<string>()

      centrosList.forEach((c) => {
        if (c.empresa_code) empSet.add(c.empresa_code)
        if (c.linha_code) linSet.add(c.linha_code)
        if (c.centro_code) cenSet.add(c.centro_code)
      })

      // Adiciona também linhas cadastradas
      const lines = await lineMasterService.listLines({ activeOnly: true }).catch(() => [])
      lines.forEach((l) => linSet.add(l.code))

      setEmpresasOptions(Array.from(empSet).sort())
      setLinhasOptions(Array.from(linSet).sort())
      setCentrosOptions(Array.from(cenSet).sort())
    } catch (e) {
      console.warn('Erro ao carregar lista de programações:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Agrupar centros por parada_id para renderização e filtragem rápida
  const centrosPorParada = useMemo(() => {
    const map = new Map<string, CentroParadaRegistro[]>()
    allCentros.forEach((c) => {
      const arr = map.get(c.parada_id) || []
      arr.push(c)
      map.set(c.parada_id, arr)
    })
    return map
  }, [allCentros])

  // Filtragem dos registros
  const programacoesFiltradas = useMemo(() => {
    return programacoes.filter((p) => {
      const centros = centrosPorParada.get(p.id) || []

      // Filtro Status
      if (filtroStatus !== 'ALL' && p.status !== filtroStatus) return false

      // Filtro Motivo
      if (filtroMotivo !== 'ALL' && p.motivo_geral !== filtroMotivo) {
        // Se algum centro tiver o motivo, aceita
        const hasMotivoInCentros = centros.some((c) => c.motivo === filtroMotivo)
        if (!hasMotivoInCentros) return false
      }

      // Filtro Criado Por
      if (
        filtroCriadoPor.trim() &&
        !p.criado_por_nome.toLowerCase().includes(filtroCriadoPor.toLowerCase().trim())
      ) {
        return false
      }

      // Filtro Empresa
      if (filtroEmpresa !== 'ALL') {
        const hasEmp = centros.some((c) => c.empresa_code === filtroEmpresa)
        if (!hasEmp) return false
      }

      // Filtro Linha
      if (filtroLinha !== 'ALL') {
        const hasLin = centros.some((c) => c.linha_code === filtroLinha)
        if (!hasLin) return false
      }

      // Filtro Centro
      if (filtroCentro !== 'ALL') {
        const hasCen = centros.some((c) => c.centro_code === filtroCentro)
        if (!hasCen) return false
      }

      // Filtro Texto Livre (código ou descrição)
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase().trim()
        const matchCod = p.codigo.toLowerCase().includes(q)
        const matchMot = (p.motivo_geral || '').toLowerCase().includes(q)
        const matchDesc = (p.observacao || '').toLowerCase().includes(q)
        const matchCen = centros.some(
          (c) =>
            c.centro_code.toLowerCase().includes(q) ||
            c.linha_code.toLowerCase().includes(q) ||
            (c.motivo || '').toLowerCase().includes(q),
        )
        if (!matchCod && !matchMot && !matchDesc && !matchCen) return false
      }

      return true
    })
  }, [
    programacoes,
    centrosPorParada,
    filtroStatus,
    filtroMotivo,
    filtroCriadoPor,
    filtroEmpresa,
    filtroLinha,
    filtroCentro,
    filtroTexto,
  ])

  const getStatusBadge = (st: ParadaStatus) => {
    switch (st) {
      case 'RASCUNHO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2 py-0 text-[10px]"
          >
            Rascunho
          </Badge>
        )
      case 'VALIDADA':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-[#004C97] border-blue-300 font-semibold px-2 py-0 text-[10px]"
          >
            Validada
          </Badge>
        )
      case 'COMUNICADA':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-2 py-0 text-[10px]"
          >
            Comunicada
          </Badge>
        )
      case 'CANCELADA':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 font-semibold px-2 py-0 text-[10px]"
          >
            Cancelada
          </Badge>
        )
      case 'CONCLUIDA':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 font-semibold px-2 py-0 text-[10px]"
          >
            Concluída
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {st}
          </Badge>
        )
    }
  }

  const formatDateTimeDisplay = (dtStr?: string) => {
    if (!dtStr) return '-'
    if (dtStr.includes('/')) return dtStr
    try {
      const parts = dtStr.split(' ')
      if (parts[0]?.includes('-')) {
        const [y, m, d] = parts[0].split('-')
        return `${d}/${m}/${y} ${parts[1] || ''}`
      }
      return dtStr
    } catch {
      return dtStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <Card className="border border-slate-200 shadow-xs bg-white rounded-xl">
        <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#004C97]" />
            <CardTitle className="text-sm font-bold text-slate-800">
              Filtros de Consulta de Programações
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarDados}
              className="h-8 text-xs text-slate-600 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onNovaProgramacao}
                className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Programação de Parada
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Empresa */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Empresa</Label>
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todas as Empresas
                  </SelectItem>
                  {empresasOptions.map((e) => (
                    <SelectItem key={e} value={e} className="text-xs">
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Linha</Label>
              <Select value={filtroLinha} onValueChange={setFiltroLinha}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todas as Linhas
                  </SelectItem>
                  {linhasOptions.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Centro</Label>
              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todos os Centros
                  </SelectItem>
                  {centrosOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="RASCUNHO" className="text-xs">
                    Rascunho
                  </SelectItem>
                  <SelectItem value="VALIDADA" className="text-xs">
                    Validada
                  </SelectItem>
                  <SelectItem value="COMUNICADA" className="text-xs">
                    Comunicada
                  </SelectItem>
                  <SelectItem value="CONCLUIDA" className="text-xs">
                    Concluída
                  </SelectItem>
                  <SelectItem value="CANCELADA" className="text-xs">
                    Cancelada
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Motivo</Label>
              <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Todos os Motivos
                  </SelectItem>
                  {MOTIVOS_PARADA_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criado Por */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">Criado por</Label>
              <Input
                type="text"
                placeholder="Nome do usuário..."
                value={filtroCriadoPor}
                onChange={(e) => setFiltroCriadoPor(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Busca por Texto Livre */}
          <div className="pt-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por código (ex: PP-00001/2026), centro, linha ou justificativa..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="h-8 pl-9 text-xs bg-white"
              />
            </div>
            {(filtroEmpresa !== 'ALL' ||
              filtroLinha !== 'ALL' ||
              filtroCentro !== 'ALL' ||
              filtroStatus !== 'ALL' ||
              filtroMotivo !== 'ALL' ||
              filtroCriadoPor ||
              filtroTexto) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroEmpresa('ALL')
                  setFiltroLinha('ALL')
                  setFiltroCentro('ALL')
                  setFiltroStatus('ALL')
                  setFiltroMotivo('ALL')
                  setFiltroCriadoPor('')
                  setFiltroTexto('')
                }}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Programações */}
      <Card className="border border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
        <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Programações Cadastradas ({programacoesFiltradas.length})
          </CardTitle>
          <span className="text-xs text-slate-500">
            Total de {programacoes.length} programações no banco
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-200 border-t-[#004C97] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Carregando programações de parada...</p>
            </div>
          ) : programacoesFiltradas.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhuma programação encontrada</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há registros com os filtros selecionados ou nenhuma parada foi criada ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 text-xs hover:bg-slate-50">
                    <TableHead className="font-bold text-slate-700">Nº / Versão</TableHead>
                    <TableHead className="font-bold text-slate-700">Empresa</TableHead>
                    <TableHead className="font-bold text-slate-700">Linhas / Centros</TableHead>
                    <TableHead className="font-bold text-slate-700">Início</TableHead>
                    <TableHead className="font-bold text-slate-700">Fim</TableHead>
                    <TableHead className="font-bold text-slate-700">Duração Total</TableHead>
                    <TableHead className="font-bold text-slate-700">Motivo Geral</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">
                      Comunicado
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right pr-4">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programacoesFiltradas.map((p) => {
                    const centros = centrosPorParada.get(p.id) || []
                    const duracaoTotal = programacaoParadaService.formatarDuracao(
                      p.duracao_total_horas || 0,
                    )
                    const linhasStr = Array.from(new Set(centros.map((c) => c.linha_code))).join(
                      ', ',
                    )
                    const centrosStr = Array.from(new Set(centros.map((c) => c.centro_code))).join(
                      ', ',
                    )
                    const empresasStr = Array.from(
                      new Set(centros.map((c) => c.empresa_code)),
                    ).join(', ')

                    return (
                      <TableRow
                        key={p.id}
                        className="text-xs hover:bg-blue-50/20 transition-colors"
                      >
                        <TableCell className="font-bold text-[#004C97] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.codigo}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-100 font-semibold px-1 py-0 text-slate-600"
                            >
                              V{String(p.versao).padStart(2, '0')}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {p.criado_por_nome || 'PCP'}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium text-slate-700">
                          {empresasStr || '1001'}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-800">
                            {linhasStr || 'Linha Principal'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {centrosStr ? `Centros: ${centrosStr}` : `${centros.length} centros`}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                          {formatDateTimeDisplay(p.data_hora_inicio)}
                        </TableCell>

                        <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                          {formatDateTimeDisplay(p.data_hora_fim)}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{duracaoTotal}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-slate-800 truncate max-w-[170px]">
                            {p.motivo_geral}
                          </div>
                          {p.observacao && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[170px] italic">
                              {p.observacao}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">{getStatusBadge(p.status)}</TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          {p.comunicado_disparado ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold"
                            >
                              Disparado
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400">Pendente</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onVisualizar(p.id)}
                              title="Visualizar Detalhes"
                              className="h-7 w-7 text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {canEdit && p.status !== 'CANCELADA' && p.status !== 'CONCLUIDA' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditar(p.id)}
                                title="Editar Programação"
                                className="h-7 w-7 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onDuplicar(p.id)}
                              title="Duplicar Programação"
                              className="h-7 w-7 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onHistorico(p.id, p.codigo)}
                              title="Ver Histórico de Versões"
                              className="h-7 w-7 text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onComunicado(p)}
                              title="Enviar Comunicado"
                              className="h-7 w-7 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </Button>

                            {canEdit && p.status !== 'CANCELADA' && p.status !== 'CONCLUIDA' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onCancelar(p.id, p.codigo)}
                                title="Cancelar Programação"
                                className="h-7 w-7 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default ConsultaProgramacoesView
