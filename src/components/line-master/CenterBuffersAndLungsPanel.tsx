import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Box,
  Plus,
  Edit2,
  Trash2,
  Power,
  Eye,
  AlertTriangle,
  Shield,
  Wrench,
  Hammer,
  Clock,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  CenterBufferRecord,
  CenterBufferType,
  CenterLungStockRecord,
  calculateLungStockBand,
} from '@/types/center-buffers-and-lungs'
import { CenterBuffersAndLungsService } from '@/services/center-buffers-and-lungs-service'
import { CenterBufferModal } from '@/components/line-master/CenterBufferModal'
import { CenterLungStockModal } from '@/components/line-master/CenterLungStockModal'
import { formatPtBrNumber } from '@/lib/number-format'

interface CenterBuffersAndLungsPanelProps {
  centerCode: string
  centerName?: string
  lineId?: string
  defaultActiveTab?: 'BUFFERS' | 'PULMOES'
}

export const CenterBuffersAndLungsPanel: React.FC<CenterBuffersAndLungsPanelProps> = ({
  centerCode,
  centerName,
  lineId,
  defaultActiveTab = 'BUFFERS',
}) => {
  const { toast } = useToast()

  // Aba ativa interna do painel: Buffers vs Estoque Pulmão
  const [activeTab, setActiveTab] = useState<'BUFFERS' | 'PULMOES'>(defaultActiveTab)

  // Estados de dados
  const [buffers, setBuffers] = useState<CenterBufferRecord[]>([])
  const [lungs, setLungs] = useState<CenterLungStockRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Modais de Criação / Edição
  const [bufferModalOpen, setBufferModalOpen] = useState<boolean>(false)
  const [bufferToEdit, setBufferToEdit] = useState<CenterBufferRecord | null>(null)

  const [lungModalOpen, setLungModalOpen] = useState<boolean>(false)
  const [lungToEdit, setLungToEdit] = useState<CenterLungStockRecord | null>(null)

  // Modais de Detalhe / Visualização Rápida
  const [viewBuffer, setViewBuffer] = useState<CenterBufferRecord | null>(null)
  const [viewLung, setViewLung] = useState<CenterLungStockRecord | null>(null)

  // Modais de Confirmação de Exclusão
  const [bufferToDelete, setBufferToDelete] = useState<CenterBufferRecord | null>(null)
  const [lungToDelete, setLungToDelete] = useState<CenterLungStockRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Carregar dados vinculados ao Centro
  const loadData = async () => {
    if (!centerCode) return
    setIsLoading(true)
    try {
      const [bufList, lungList] = await Promise.all([
        CenterBuffersAndLungsService.listBuffersByCenter(centerCode, true),
        CenterBuffersAndLungsService.listLungsByCenter(centerCode, true),
      ])
      setBuffers(bufList)
      setLungs(lungList)
    } catch (err) {
      console.error('Erro ao carregar Buffers e Pulmões:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a lista de buffers e pulmões do Centro.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [centerCode])

  // Ações de Buffer
  const handleToggleBufferStatus = async (item: CenterBufferRecord) => {
    const nextStatus = item.status === 'Ativo' ? 'Inativo' : 'Ativo'
    try {
      await CenterBuffersAndLungsService.toggleBufferStatus(item.id, nextStatus)
      toast({
        title: 'Status atualizado',
        description: `Buffer ${item.code} alterado para ${nextStatus}.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err.message,
      })
    }
  }

  const handleConfirmDeleteBuffer = async () => {
    if (!bufferToDelete) return
    setIsDeleting(true)
    try {
      await CenterBuffersAndLungsService.deleteBuffer(bufferToDelete.id)
      toast({
        title: 'Buffer excluído',
        description: `O Buffer ${bufferToDelete.code} foi excluído com sucesso.`,
      })
      setBufferToDelete(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir buffer',
        description: err.message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Ações de Estoque Pulmão
  const handleToggleLungStatus = async (item: CenterLungStockRecord) => {
    const nextStatus = item.status === 'Ativo' ? 'Inativo' : 'Ativo'
    try {
      await CenterBuffersAndLungsService.toggleLungStatus(item.id, nextStatus)
      toast({
        title: 'Status atualizado',
        description: `Estoque Pulmão ${item.code} alterado para ${nextStatus}.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err.message,
      })
    }
  }

  const handleConfirmDeleteLung = async () => {
    if (!lungToDelete) return
    setIsDeleting(true)
    try {
      await CenterBuffersAndLungsService.deleteLungStock(lungToDelete.id)
      toast({
        title: 'Estoque Pulmão excluído',
        description: `O Estoque Pulmão ${lungToDelete.code} foi excluído com sucesso.`,
      })
      setLungToDelete(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir estoque pulmão',
        description: err.message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Renderizadores de badge de tipo de buffer
  const renderBufferTypeBadge = (type: CenterBufferType) => {
    switch (type) {
      case 'Espaço físico':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium flex items-center gap-1">
            <Box className="w-3 h-3" /> Espaço físico
          </Badge>
        )
      case 'Capacidade máxima da baia':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium flex items-center gap-1">
            <Layers className="w-3 h-3" /> Capacidade baia
          </Badge>
        )
      case 'Área bloqueada por segurança':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium flex items-center gap-1">
            <Shield className="w-3 h-3 text-rose-600" /> Bloqueio Segurança
          </Badge>
        )
      case 'Bloqueio temporário — Segurança':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-600" /> Bloq. Temp. Segurança
          </Badge>
        )
      case 'Bloqueio temporário — Manutenção':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-medium flex items-center gap-1">
            <Wrench className="w-3 h-3 text-sky-600" /> Bloq. Temp. Manutenção
          </Badge>
        )
      case 'Bloqueio temporário — Obra':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium flex items-center gap-1">
            <Hammer className="w-3 h-3 text-amber-600" /> Bloq. Temp. Obra
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Sub-seções com Design Ciafal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('BUFFERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BUFFERS'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Box className="w-4 h-4" />
            Buffers do Centro
            <Badge
              className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${
                activeTab === 'BUFFERS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {buffers.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PULMOES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PULMOES'
                ? 'bg-[#004C97] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Estoque Pulmão
            <Badge
              className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${
                activeTab === 'PULMOES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {lungs.length}
            </Badge>
          </button>
        </div>

        {/* Botão de Ação Primária */}
        <div>
          {activeTab === 'BUFFERS' ? (
            <Button
              size="sm"
              onClick={() => {
                setBufferToEdit(null)
                setBufferModalOpen(true)
              }}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Cadastrar Buffer
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setLungToEdit(null)
                setLungModalOpen(true)
              }}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Cadastrar Estoque Pulmão
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO 1: TABELA DE BUFFERS
         ========================================================================= */}
      {activeTab === 'BUFFERS' && (
        <Card className="border border-slate-200 shadow-2xs overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#004C97]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Buffers Parametrizados — Centro {centerCode}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Fonte mestre para Sequenciamento & Orquestração → Buffers & Pulmões
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Carregando buffers do Centro {centerCode}...
              </div>
            ) : buffers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Box className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">
                  Nenhum Buffer cadastrado para o Centro {centerCode}.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Cadastre baias, espaços físicos ou bloqueios para alimentar o motor de capacidade
                  e a tela operacional.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setBufferToEdit(null)
                    setBufferModalOpen(true)
                  }}
                  className="bg-[#004C97] text-white text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Primeiro Buffer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <TableRow>
                      <TableHead className="py-2.5 px-3">Tipo</TableHead>
                      <TableHead className="py-2.5 px-3">Identificação</TableHead>
                      <TableHead className="py-2.5 px-3">Capacidade / Restrição</TableHead>
                      <TableHead className="py-2.5 px-3">Vigência</TableHead>
                      <TableHead className="py-2.5 px-3">Impacto Capacidade</TableHead>
                      <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                      <TableHead className="py-2.5 px-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buffers.map((buf) => {
                      // Formatar capacidade / restrição
                      let capText = '—'
                      if (buf.buffer_type === 'Espaço físico') {
                        capText = `${buf.available_area != null ? formatPtBrNumber(buf.available_area) : '—'} ${buf.unit_of_measure || 'm²'}`
                        if (buf.location_physical) capText += ` (${buf.location_physical})`
                      } else if (buf.buffer_type === 'Capacidade máxima da baia') {
                        capText = `Máx: ${buf.max_capacity != null ? formatPtBrNumber(buf.max_capacity) : '—'} ${buf.unit_of_measure || 't'}`
                        if (buf.recommended_capacity != null) {
                          capText += ` / Rec: ${formatPtBrNumber(buf.recommended_capacity)} ${buf.unit_of_measure || 't'}`
                        }
                      } else if (buf.buffer_type === 'Área bloqueada por segurança') {
                        capText = buf.block_reason || buf.location_physical || 'Área interditada'
                      } else {
                        capText =
                          buf.block_reason ||
                          buf.location_physical ||
                          buf.related_equipment ||
                          'Bloqueio'
                      }

                      // Vigência
                      let vigenciaText = 'Permanente'
                      if (buf.start_date || buf.expected_release_date) {
                        vigenciaText = `${buf.start_date || 'Início'} → ${buf.expected_release_date || 'A definir'}`
                      }

                      return (
                        <TableRow
                          key={buf.id}
                          className={`hover:bg-slate-50/70 border-b border-slate-100 ${
                            buf.status === 'Inativo' ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          <TableCell className="py-2.5 px-3 whitespace-nowrap">
                            {renderBufferTypeBadge(buf.buffer_type)}
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-[#004C97] font-bold">
                                {buf.code}
                              </span>
                              <span>{buf.name}</span>
                            </div>
                            {buf.description && (
                              <p className="text-[10px] text-slate-500 truncate max-w-xs">
                                {buf.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            {capText}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-[11px] text-slate-600 font-mono whitespace-nowrap">
                            {vigenciaText}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 whitespace-nowrap">
                            {buf.impacts_capacity ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-mono">
                                Redução:{' '}
                                {buf.capacity_reduction != null
                                  ? formatPtBrNumber(buf.capacity_reduction)
                                  : '—'}
                                {buf.capacity_reduction_unit || '%'}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-slate-400">Sem redução</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-center">
                            {buf.status === 'Ativo' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-200 text-slate-600 border-slate-300 text-[10px]">
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Visualizar detalhes"
                                onClick={() => setViewBuffer(buf)}
                                className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar buffer"
                                onClick={() => {
                                  setBufferToEdit(buf)
                                  setBufferModalOpen(true)
                                }}
                                className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title={buf.status === 'Ativo' ? 'Inativar buffer' : 'Ativar buffer'}
                                onClick={() => handleToggleBufferStatus(buf)}
                                className={`h-7 w-7 ${
                                  buf.status === 'Ativo'
                                    ? 'text-amber-600 hover:text-amber-700'
                                    : 'text-emerald-600 hover:text-emerald-700'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir buffer"
                                onClick={() => setBufferToDelete(buf)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
      )}

      {/* =========================================================================
          SEÇÃO 2: TABELA DE ESTOQUE PULMÃO
         ========================================================================= */}
      {activeTab === 'PULMOES' && (
        <Card className="border border-slate-200 shadow-2xs overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Estoques Pulmão Parametrizados — Centro {centerCode}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Proteção de fluxo e limites de segurança operacional
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Carregando estoques pulmão do Centro {centerCode}...
              </div>
            ) : lungs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">
                  Nenhum Estoque Pulmão cadastrado para o Centro {centerCode}.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Parametrize os estoques mínimo, ideal e máximo para proteger o Centro contra
                  desabastecimento ou gargalos a montante.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setLungToEdit(null)
                    setLungModalOpen(true)
                  }}
                  className="bg-[#004C97] text-white text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Primeiro Estoque Pulmão
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <TableRow>
                      <TableHead className="py-2.5 px-3">Estoque Pulmão</TableHead>
                      <TableHead className="py-2.5 px-3">Local</TableHead>
                      <TableHead className="py-2.5 px-3">Material / Grupo</TableHead>
                      <TableHead className="py-2.5 px-3 text-right">Mínimo</TableHead>
                      <TableHead className="py-2.5 px-3 text-right">Ideal</TableHead>
                      <TableHead className="py-2.5 px-3 text-right">Máximo</TableHead>
                      <TableHead className="py-2.5 px-3 text-center">Faixa / Cobertura</TableHead>
                      <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                      <TableHead className="py-2.5 px-3 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lungs.map((lung) => {
                      const curVal =
                        lung.current_real_stock != null ? lung.current_real_stock : lung.ideal_stock
                      const band = calculateLungStockBand(
                        curVal,
                        lung.min_stock,
                        lung.ideal_stock,
                        lung.max_stock,
                      )

                      return (
                        <TableRow
                          key={lung.id}
                          className={`hover:bg-slate-50/70 border-b border-slate-100 ${
                            lung.status === 'Inativo' ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          <TableCell className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-[#004C97] font-bold">
                                {lung.code}
                              </span>
                              <span>{lung.name}</span>
                            </div>
                            {lung.description && (
                              <p className="text-[10px] text-slate-500 truncate max-w-xs">
                                {lung.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-slate-600 font-medium">
                            {lung.location_deposit || '—'}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 font-semibold text-slate-800">
                            {lung.material_or_group}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {formatPtBrNumber(lung.min_stock)} {lung.unit_of_measure}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatPtBrNumber(lung.ideal_stock)} {lung.unit_of_measure}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                            {formatPtBrNumber(lung.max_stock)} {lung.unit_of_measure}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge className={`text-[9px] px-1.5 py-0 border ${band.badgeClass}`}>
                                {band.label}
                              </Badge>
                              {(lung.min_coverage_hours || lung.ideal_coverage_hours) && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  {lung.min_coverage_hours || 0}h / {lung.ideal_coverage_hours || 0}
                                  h
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-center">
                            {lung.status === 'Ativo' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-200 text-slate-600 border-slate-300 text-[10px]">
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Visualizar detalhes"
                                onClick={() => setViewLung(lung)}
                                className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar estoque pulmão"
                                onClick={() => {
                                  setLungToEdit(lung)
                                  setLungModalOpen(true)
                                }}
                                className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title={lung.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                onClick={() => handleToggleLungStatus(lung)}
                                className={`h-7 w-7 ${
                                  lung.status === 'Ativo'
                                    ? 'text-amber-600 hover:text-amber-700'
                                    : 'text-emerald-600 hover:text-emerald-700'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir estoque pulmão"
                                onClick={() => setLungToDelete(lung)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
      )}

      {/* Modal de Cadastro / Edição de Buffer */}
      <CenterBufferModal
        open={bufferModalOpen}
        onOpenChange={setBufferModalOpen}
        centerCode={centerCode}
        centerName={centerName}
        lineId={lineId}
        bufferToEdit={bufferToEdit}
        onSuccess={() => loadData()}
      />

      {/* Modal de Cadastro / Edição de Estoque Pulmão */}
      <CenterLungStockModal
        open={lungModalOpen}
        onOpenChange={setLungModalOpen}
        centerCode={centerCode}
        centerName={centerName}
        lineId={lineId}
        lungToEdit={lungToEdit}
        onSuccess={() => loadData()}
      />

      {/* Modal de Visualização Detalhada do Buffer */}
      <Dialog open={Boolean(viewBuffer)} onOpenChange={(o) => !o && setViewBuffer(null)}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="w-4 h-4 text-[#004C97]" />
                Ficha Técnica do Buffer
              </span>
              <Badge className="font-mono text-xs bg-[#004C97] text-white">
                {viewBuffer?.code}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewBuffer && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium block">Nome:</span>
                  <span className="font-semibold text-slate-800">{viewBuffer.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Centro Produtivo:</span>
                  <span className="font-semibold text-slate-800">{viewBuffer.center_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Tipo:</span>
                  <span className="font-semibold text-[#004C97]">{viewBuffer.buffer_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Status:</span>
                  <Badge
                    className={
                      viewBuffer.status === 'Ativo'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }
                  >
                    {viewBuffer.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block">Detalhes Operacionais:</span>
                {viewBuffer.location_physical && (
                  <p>
                    <strong>Localização física:</strong> {viewBuffer.location_physical}
                  </p>
                )}
                {viewBuffer.available_area != null && (
                  <p>
                    <strong>Área disponível:</strong> {formatPtBrNumber(viewBuffer.available_area)}{' '}
                    {viewBuffer.unit_of_measure}
                  </p>
                )}
                {viewBuffer.max_capacity != null && (
                  <p>
                    <strong>Capacidade máxima:</strong> {formatPtBrNumber(viewBuffer.max_capacity)}{' '}
                    {viewBuffer.unit_of_measure}
                  </p>
                )}
                {viewBuffer.recommended_capacity != null && (
                  <p>
                    <strong>Capacidade recomendada:</strong>{' '}
                    {formatPtBrNumber(viewBuffer.recommended_capacity)} {viewBuffer.unit_of_measure}
                  </p>
                )}
                {viewBuffer.block_reason && (
                  <p>
                    <strong>Motivo do Bloqueio:</strong> {viewBuffer.block_reason}
                  </p>
                )}
                {viewBuffer.responsible_name && (
                  <p>
                    <strong>Responsável:</strong> {viewBuffer.responsible_name}
                  </p>
                )}
                {viewBuffer.start_date && (
                  <p>
                    <strong>Vigência:</strong> {viewBuffer.start_date} até{' '}
                    {viewBuffer.expected_release_date || 'indeterminado'}
                  </p>
                )}
                {viewBuffer.observation && (
                  <p>
                    <strong>Observação:</strong> {viewBuffer.observation}
                  </p>
                )}
              </div>

              {viewBuffer.impacts_capacity && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1 text-rose-900">
                  <span className="font-bold block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Impacto na Capacidade
                    Produtiva
                  </span>
                  <p>
                    Redução de capacidade:{' '}
                    <strong>
                      {formatPtBrNumber(viewBuffer.capacity_reduction ?? 0)}{' '}
                      {viewBuffer.capacity_reduction_unit}
                    </strong>
                  </p>
                  {(viewBuffer.capacity_impact_start || viewBuffer.capacity_impact_end) && (
                    <p>
                      Período de impacto: {viewBuffer.capacity_impact_start || '—'} até{' '}
                      {viewBuffer.capacity_impact_end || '—'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewBuffer(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização Detalhada de Estoque Pulmão */}
      <Dialog open={Boolean(viewLung)} onOpenChange={(o) => !o && setViewLung(null)}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004C97]" />
                Ficha do Estoque Pulmão
              </span>
              <Badge className="font-mono text-xs bg-[#004C97] text-white">{viewLung?.code}</Badge>
            </DialogTitle>
          </DialogHeader>
          {viewLung && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium block">Nome:</span>
                  <span className="font-semibold text-slate-800">{viewLung.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Centro:</span>
                  <span className="font-semibold text-slate-800">{viewLung.center_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Material / Grupo:</span>
                  <span className="font-semibold text-slate-800">{viewLung.material_or_group}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Local / Depósito:</span>
                  <span className="font-semibold text-slate-800">
                    {viewLung.location_deposit || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                  <span className="text-[10px] text-rose-700 font-sans block">Mínimo</span>
                  <span className="font-bold text-rose-800 text-sm">
                    {formatPtBrNumber(viewLung.min_stock)} {viewLung.unit_of_measure}
                  </span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="text-[10px] text-emerald-700 font-sans block">Ideal</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {formatPtBrNumber(viewLung.ideal_stock)} {viewLung.unit_of_measure}
                  </span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <span className="text-[10px] text-blue-700 font-sans block">Máximo</span>
                  <span className="font-bold text-blue-800 text-sm">
                    {formatPtBrNumber(viewLung.max_stock)} {viewLung.unit_of_measure}
                  </span>
                </div>
              </div>

              {(viewLung.min_coverage_hours || viewLung.ideal_coverage_hours) && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-600">
                    Cobertura de Proteção Operacional:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    Mínima: {viewLung.min_coverage_hours || 0}h | Ideal:{' '}
                    {viewLung.ideal_coverage_hours || 0}h
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewLung(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Buffer */}
      <Dialog open={Boolean(bufferToDelete)} onOpenChange={(o) => !o && setBufferToDelete(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Excluir Buffer?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600 py-2">
            Deseja excluir o Buffer{' '}
            <strong className="text-slate-900">{bufferToDelete?.code}</strong> (
            {bufferToDelete?.name})?
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBufferToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDeleteBuffer}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Estoque Pulmão */}
      <Dialog open={Boolean(lungToDelete)} onOpenChange={(o) => !o && setLungToDelete(null)}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Excluir Estoque Pulmão?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600 py-2">
            Deseja excluir o Estoque Pulmão{' '}
            <strong className="text-slate-900">{lungToDelete?.code}</strong> ({lungToDelete?.name}
            )?
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLungToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDeleteLung}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
