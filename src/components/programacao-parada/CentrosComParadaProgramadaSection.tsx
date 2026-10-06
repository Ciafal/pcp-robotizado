import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  Building2,
  GitBranch,
  Factory,
  Calendar,
  Clock,
  Send,
  Filter,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  CentroParadaRegistro,
  CentroParadaInput,
  programacaoParadaService,
} from '@/services/programacao-parada-service'
import { SendCommunicationModal } from './SendCommunicationModal'

interface CentrosComParadaProgramadaSectionProps {
  onRefreshNeeded?: () => void
  refreshTrigger?: number
}

export const CentrosComParadaProgramadaSection: React.FC<
  CentrosComParadaProgramadaSectionProps
> = ({ refreshTrigger = 0 }) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [centros, setCentros] = useState<CentroParadaRegistro[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('TODAS')
  const [filtroLinha, setFiltroLinha] = useState<string>('TODAS')
  const [filtroCentro, setFiltroCentro] = useState<string>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')

  // Modal de Comunicado
  const [modalComunicadoAberto, setModalComunicadoAberto] = useState<boolean>(false)

  // Carregar paradas salvas das collections existentes
  const carregarCentros = async () => {
    setLoading(true)
    try {
      const data = await programacaoParadaService.listarCentrosPorFiltro()
      setCentros(data)
    } catch (e) {
      console.error('Erro ao listar centros de paradas:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCentros()
  }, [refreshTrigger])

  // Opções para os filtros
  const empresasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    centros.forEach((c) => {
      if (c.empresa_code) set.add(c.empresa_code)
    })
    return Array.from(set).sort()
  }, [centros])

  const linhasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    centros.forEach((c) => {
      if (c.linha_code) set.add(c.linha_code)
    })
    return Array.from(set).sort()
  }, [centros])

  const centrosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    centros.forEach((c) => {
      if (c.centro_code) set.add(c.centro_code)
    })
    return Array.from(set).sort()
  }, [centros])

  // Normalização e filtragem
  const centrosFiltrados = useMemo(() => {
    return centros.filter((c) => {
      if (filtroEmpresa !== 'TODAS' && c.empresa_code !== filtroEmpresa) return false
      if (filtroLinha !== 'TODAS' && c.linha_code !== filtroLinha) return false
      if (filtroCentro !== 'TODOS' && c.centro_code !== filtroCentro) return false
      if (filtroStatus !== 'TODOS' && c.status !== filtroStatus) return false

      if (filtroDataInicio) {
        const dIniStr = c.data_hora_inicio || ''
        if (dIniStr && !dIniStr.includes(filtroDataInicio)) {
          // comparar se data inicio é anterior
        }
      }
      if (filtroDataFim) {
        const dFimStr = c.data_hora_fim || ''
        if (dFimStr && !dFimStr.includes(filtroDataFim)) {
          // comparar se data fim
        }
      }
      return true
    })
  }, [
    centros,
    filtroEmpresa,
    filtroLinha,
    filtroCentro,
    filtroStatus,
    filtroDataInicio,
    filtroDataFim,
  ])

  // Seleção múltipla
  const todosFiltradosSelecionados =
    centrosFiltrados.length > 0 && centrosFiltrados.every((c) => c.id && selectedIds.has(c.id))

  const algumFiltradoSelecionado =
    centrosFiltrados.some((c) => c.id && selectedIds.has(c.id)) && !todosFiltradosSelecionados

  const handleToggleSelectAll = () => {
    const novo = new Set(selectedIds)
    if (todosFiltradosSelecionados) {
      centrosFiltrados.forEach((c) => {
        if (c.id) novo.delete(c.id)
      })
    } else {
      centrosFiltrados.forEach((c) => {
        if (c.id) novo.add(c.id)
      })
    }
    setSelectedIds(novo)
  }

  const handleToggleSelectOne = (id: string) => {
    const novo = new Set(selectedIds)
    if (novo.has(id)) {
      novo.delete(id)
    } else {
      novo.add(id)
    }
    setSelectedIds(novo)
  }

  const handleLimparFiltros = () => {
    setFiltroEmpresa('TODAS')
    setFiltroLinha('TODAS')
    setFiltroCentro('TODOS')
    setFiltroStatus('TODOS')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  // Converter itens selecionados para CentroParadaInput[]
  const centrosSelecionadosInputs: CentroParadaInput[] = useMemo(() => {
    return centros
      .filter((c) => c.id && selectedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        empresa_code: c.empresa_code,
        empresa_nome: c.empresa_nome,
        linha_code: c.linha_code,
        linha_nome: c.linha_nome,
        centro_code: c.centro_code,
        centro_nome: c.centro_nome,
        data_hora_inicio: c.data_hora_inicio,
        data_hora_fim: c.data_hora_fim,
        duracao_horas: c.duracao_horas || 0,
        motivo: c.motivo,
        motivo_outro: c.motivo_outro,
        descricao: c.descricao,
        status: (c.status as any) || 'PENDENTE',
      }))
  }, [centros, selectedIds])

  const formatDateTimeDisplay = (dtStr: string) => {
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-semibold py-0"
          >
            Pendente
          </Badge>
        )
      case 'CONFIRMADA':
      case 'ATIVO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold py-0"
          >
            Confirmada
          </Badge>
        )
      case 'EM_ANDAMENTO':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-semibold py-0 animate-pulse"
          >
            Em Andamento
          </Badge>
        )
      case 'CONCLUIDA':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-semibold py-0"
          >
            Concluída
          </Badge>
        )
      case 'CANCELADA':
      case 'CANCELADO':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-semibold py-0"
          >
            Cancelada
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-semibold py-0">
            {status || 'Pendente'}
          </Badge>
        )
    }
  }

  return (
    <Card className="border border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden mt-6">
      {/* Cabeçalho */}
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#004C97] flex items-center justify-center font-bold">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                Centros com Parada Programada
              </CardTitle>
              <p className="text-xs text-slate-500">
                Consulta consolidada das paradas cadastradas para disparo de comunicado oficial por
                seleção
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarCentros}
              disabled={loading}
              className="h-9 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            {/* Botão de Enviar Comunicado por Seleção */}
            <Button
              type="button"
              data-testid="btn-enviar-comunicado-selecao"
              disabled={selectedIds.size === 0}
              onClick={() => setModalComunicadoAberto(true)}
              className={`h-9 text-xs font-semibold gap-2 transition-all shadow-xs ${
                selectedIds.size === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200'
                  : 'bg-[#004C97] hover:bg-[#003d7a] text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>✈ Enviar Comunicado</span>
              {selectedIds.size > 0 && (
                <span
                  data-testid="badge-selecionados"
                  className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-white/20 text-white font-bold"
                >
                  {selectedIds.size}
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Barra de Filtros */}
        <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Filtros de Pesquisa</span>
            </div>
            {(filtroEmpresa !== 'TODAS' ||
              filtroLinha !== 'TODAS' ||
              filtroCentro !== 'TODOS' ||
              filtroStatus !== 'TODOS' ||
              filtroDataInicio ||
              filtroDataFim) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="h-6 text-[11px] text-slate-500 hover:text-slate-800 gap-1 px-2"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Empresa */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Empresa</Label>
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as empresas</SelectItem>
                  {empresasDisponiveis.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Linha</Label>
              <Select value={filtroLinha} onValueChange={setFiltroLinha}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as linhas</SelectItem>
                  {linhasDisponiveis.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Centro</Label>
              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os centros</SelectItem>
                  {centrosDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Inicial */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Data Inicial</Label>
              <Input
                type="text"
                placeholder="dd/mm/aaaa"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Data Final */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Data Final</Label>
              <Input
                type="text"
                placeholder="dd/mm/aaaa"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600 font-medium">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Barra de Status da Seleção */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-2">
            <span>
              Total exibido: <strong>{centrosFiltrados.length}</strong> centros com parada
            </span>
            {selectedIds.size > 0 && (
              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {selectedIds.size} selecionado(s) para o comunicado
              </span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-6 text-[11px] text-slate-500 hover:text-slate-800"
            >
              Desmarcar todos
            </Button>
          )}
        </div>

        {/* Tabela de Centros com Parada Programada */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-xs hover:bg-slate-50">
                  <TableHead className="w-12 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        data-testid="checkbox-mestre-centros"
                        aria-label="Selecionar todos os centros"
                        checked={
                          todosFiltradosSelecionados
                            ? true
                            : algumFiltradoSelecionado
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">Empresa</TableHead>
                  <TableHead className="font-bold text-slate-700">Linha</TableHead>
                  <TableHead className="font-bold text-slate-700">Centro</TableHead>
                  <TableHead className="font-bold text-slate-700">Início</TableHead>
                  <TableHead className="font-bold text-slate-700">Fim</TableHead>
                  <TableHead className="font-bold text-slate-700">Duração</TableHead>
                  <TableHead className="font-bold text-slate-700">Motivo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-slate-500">
                      Nenhum centro com parada programada encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  centrosFiltrados.map((centro) => {
                    const isChecked = Boolean(centro.id && selectedIds.has(centro.id))
                    const durStr = centro.duracao_horas
                      ? `${centro.duracao_horas} h`
                      : programacaoParadaService.formatarDuracao(centro.duracao_horas || 0)

                    return (
                      <TableRow
                        key={centro.id}
                        data-testid={`row-centro-${centro.id}`}
                        className={`text-xs transition-colors cursor-pointer ${
                          isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => centro.id && handleToggleSelectOne(centro.id)}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Checkbox
                              data-testid={`checkbox-centro-${centro.id}`}
                              aria-label={`Selecionar centro ${centro.centro_code}`}
                              checked={isChecked}
                              onCheckedChange={() => centro.id && handleToggleSelectOne(centro.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{centro.empresa_code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                            <span>{centro.linha_code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-bold text-[#004C97]">
                            <Factory className="w-3.5 h-3.5 text-blue-500" />
                            <span>{centro.centro_code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTimeDisplay(centro.data_hora_inicio)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTimeDisplay(centro.data_hora_fim)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{durStr}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 truncate max-w-[180px]">
                            {centro.motivo}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(centro.status)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Modal Popup Corporativo de Comunicado por Seleção */}
      {modalComunicadoAberto && (
        <SendCommunicationModal
          open={modalComunicadoAberto}
          onClose={() => setModalComunicadoAberto(false)}
          parada={
            centrosSelecionadosInputs.length > 0
              ? ({
                  id: 'comunicado_multiplo',
                  codigo: 'PARADAS-PROGRAMADAS',
                  versao: 1,
                  status: 'CONFIRMADA',
                } as any)
              : null
          }
          centros={centrosSelecionadosInputs}
          onSuccess={() => {
            setModalComunicadoAberto(false)
            setSelectedIds(new Set())
            carregarCentros()
          }}
        />
      )}
    </Card>
  )
}
export default CentrosComParadaProgramadaSection
