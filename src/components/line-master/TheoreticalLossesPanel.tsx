/**
 * Painel de Perdas Teóricas da Ficha Mestra Expandida
 * Integrado à collection line_theoretical_losses
 *
 * Recursos:
 * - Listagem tabular de perdas teóricas por linha (RM %, Carepa %, Apara %, Perda Total %)
 * - Filtros rápidos: busca textual, tipo de matéria-prima, bitola, aplicação
 * - Exibição de valores percentuais formatados no padrão pt-BR (vírgula)
 * - Botão de adicionar nova perda com modal dedicado
 * - Ações por linha: Editar e Exclusão Lógica com confirmação e auditoria
 * - Cards com indicadores consolidados (Média RM %, Média Carepa %, Média Apara %, Perda Média Total)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Percent,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit2,
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  theoreticalLossesService,
  LineTheoreticalLoss,
} from '@/services/theoretical-losses-service'
import { TheoreticalLossModal } from '@/components/line-master/TheoreticalLossModal'
import { formatPtBrNumber } from '@/lib/number-format'
import { OFFICIAL_MP_TYPES_CATALOG } from '@/services/mp-programming-engine'

interface TheoreticalLossesPanelProps {
  lineId: string
  centerCode: string
  centerName?: string
  lineMasterId?: string
  onRefreshParent?: () => void
}

export const TheoreticalLossesPanel: React.FC<TheoreticalLossesPanelProps> = ({
  lineId,
  centerCode,
  centerName,
  lineMasterId,
  onRefreshParent,
}) => {
  const { toast } = useToast()

  const [losses, setLosses] = useState<LineTheoreticalLoss[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('TODOS')
  const [filterBitola, setFilterBitola] = useState<string>('TODAS')
  const [filterApplication, setFilterApplication] = useState<string>('TODAS')

  // Modal de cadastro/edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<LineTheoreticalLoss | null>(null)

  // Modal de confirmação de exclusão lógica
  const [itemToDelete, setItemToDelete] = useState<LineTheoreticalLoss | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await theoreticalLossesService.listByLine(lineId)
      setLosses(data)
    } catch (err) {
      console.warn('Erro ao carregar perdas teóricas:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as perdas teóricas desta linha.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [lineId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Listas distintas para filtros
  const distinctBitolas = useMemo(() => {
    const set = new Set<string>()
    losses.forEach((l) => {
      if (l.bitola) set.add(l.bitola)
    })
    return Array.from(set).sort()
  }, [losses])

  const distinctApplications = useMemo(() => {
    const set = new Set<string>()
    losses.forEach((l) => {
      if (l.application) set.add(l.application)
    })
    return Array.from(set).sort()
  }, [losses])

  // Filtragem
  const filteredLosses = useMemo(() => {
    return losses.filter((item) => {
      if (filterType !== 'TODOS' && item.raw_material_type !== filterType) return false
      if (filterBitola !== 'TODAS' && item.bitola !== filterBitola) return false
      if (filterApplication !== 'TODAS' && item.application !== filterApplication) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const text = [
          item.raw_material_code,
          item.raw_material_description,
          item.bitola,
          item.application,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!text.includes(term)) return false
      }
      return true
    })
  }, [losses, filterType, filterBitola, filterApplication, searchTerm])

  // Métricas agregadas
  const metrics = useMemo(() => {
    if (losses.length === 0) {
      return { avgRm: 0, avgCarepa: 0, avgApara: 0, avgTotal: 0, count: 0 }
    }
    const sumRm = losses.reduce((acc, cur) => acc + (cur.rm_pct || 0), 0)
    const sumCarepa = losses.reduce((acc, cur) => acc + (cur.carepa_pct || 0), 0)
    const sumApara = losses.reduce((acc, cur) => acc + (cur.apara_pct || 0), 0)
    const sumTotal = losses.reduce((acc, cur) => acc + (cur.total_loss_pct || 0), 0)
    const n = losses.length

    return {
      avgRm: Number((sumRm / n).toFixed(2)),
      avgCarepa: Number((sumCarepa / n).toFixed(2)),
      avgApara: Number((sumApara / n).toFixed(2)),
      avgTotal: Number((sumTotal / n).toFixed(2)),
      count: n,
    }
  }, [losses])

  // Ações
  const handleOpenAdd = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: LineTheoreticalLoss) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleConfirmSoftDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      await theoreticalLossesService.softDelete(
        itemToDelete.id,
        'Exclusão lógica realizada pelo programador PCP na Ficha Mestra',
      )
      toast({
        title: 'Perda teórica excluída',
        description: `O registro ${itemToDelete.raw_material_code} (${itemToDelete.application}) foi desativado com sucesso (exclusão lógica).`,
      })
      setItemToDelete(null)
      loadData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir perda teórica',
        description: err?.message || 'Falha ao processar exclusão lógica.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="panel-theoretical-losses">
      {/* Cards de Métricas Consolidadas de Perdas Teóricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Perda Média RM</span>
            <span className="text-base font-mono font-bold text-slate-900">
              {formatPtBrNumber(metrics.avgRm, 2)}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#004C97]">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Perda Média Carepa</span>
            <span className="text-base font-mono font-bold text-amber-700">
              {formatPtBrNumber(metrics.avgCarepa, 2)}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Perda Média Apara</span>
            <span className="text-base font-mono font-bold text-rose-700">
              {formatPtBrNumber(metrics.avgApara, 2)}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-700">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Soma Média de Perdas</span>
            <span className="text-base font-mono font-bold text-[#004C97]">
              {formatPtBrNumber(metrics.avgTotal, 2)}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#004C97]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Card Principal: Listagem e Filtros */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#004C97]" />
              Perdas Teóricas da Linha (Ficha Mestra)
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-[#004C97] border-blue-200"
              >
                {centerCode}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 pt-0.5">
              Taxas nominais de perdas percentuais (RM, Carepa e Apara) para cálculo do consumo
              teórico de matéria-prima.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Recarregar perdas teóricas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              data-testid="btn-add-theoretical-loss"
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 gap-1 font-bold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Perda Teórica
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-3">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            {/* Busca textual */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por código MP, descrição, aplicação..."
                className="h-8 pl-8 text-xs bg-white border-slate-300"
                data-testid="input-search-theoretical-losses"
              />
            </div>

            {/* Filtro Tipo MP */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                Tipo:
              </span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-8 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 outline-none"
                data-testid="select-filter-type"
              >
                <option value="TODOS">Todos os tipos</option>
                {OFFICIAL_MP_TYPES_CATALOG.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Bitola */}
            {distinctBitolas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                  Bitola:
                </span>
                <select
                  value={filterBitola}
                  onChange={(e) => setFilterBitola(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 outline-none"
                  data-testid="select-filter-bitola"
                >
                  <option value="TODAS">Todas</option>
                  {distinctBitolas.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Aplicação */}
            {distinctApplications.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                  Aplicação:
                </span>
                <select
                  value={filterApplication}
                  onChange={(e) => setFilterApplication(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 outline-none"
                  data-testid="select-filter-application"
                >
                  <option value="TODAS">Todas</option>
                  {distinctApplications.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(searchTerm ||
              filterType !== 'TODOS' ||
              filterBitola !== 'TODAS' ||
              filterApplication !== 'TODAS') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('TODOS')
                  setFilterBitola('TODAS')
                  setFilterApplication('TODAS')
                }}
                className="h-8 text-[11px] text-slate-500 hover:text-slate-800"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Tabela de Perdas Teóricas */}
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2.5">Tipo MP</th>
                  <th className="p-2.5">Código MP</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5">Bitola</th>
                  <th className="p-2.5">Aplicação</th>
                  <th className="p-2.5 text-right">RM (%)</th>
                  <th className="p-2.5 text-right">Carepa (%)</th>
                  <th className="p-2.5 text-right">Apara (%)</th>
                  <th className="p-2.5 text-right">Perda Total (%)</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400">
                      Carregando perdas teóricas da linha...
                    </td>
                  </tr>
                ) : filteredLosses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500">
                      {losses.length === 0
                        ? 'Nenhuma perda teórica cadastrada nesta linha ainda.'
                        : 'Nenhum registro encontrado com os filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  filteredLosses.map((item) => {
                    const totalLoss = item.total_loss_pct || 0
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                        data-testid={`row-theoretical-loss-${item.id}`}
                      >
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-medium"
                          >
                            {item.raw_material_type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#004C97]">
                          {item.raw_material_code}
                        </td>
                        <td
                          className="p-2.5 text-slate-800 max-w-xs truncate"
                          title={item.raw_material_description}
                        >
                          {item.raw_material_description}
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">
                          {item.bitola === 'Não há' ? (
                            <span className="text-slate-400 italic">Não há</span>
                          ) : (
                            item.bitola
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-semibold">
                            {item.application}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatPtBrNumber(item.rm_pct, 2)}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-amber-700">
                          {formatPtBrNumber(item.carepa_pct, 2)}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-rose-700">
                          {formatPtBrNumber(item.apara_pct, 2)}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#004C97]">
                          {formatPtBrNumber(totalLoss, 2)}%
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              className="h-6 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50 gap-1"
                              data-testid={`btn-edit-loss-${item.id}`}
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </Button>
                            <span className="text-slate-200">|</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setItemToDelete(item)}
                              className="h-6 px-2 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                              data-testid={`btn-delete-loss-${item.id}`}
                              title="Exclusão lógica do registro"
                            >
                              <Trash2 className="w-3 h-3" /> Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé informativo sobre a exclusão lógica e auditoria */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Exclusão lógica: os registros mantêm rastreabilidade completa e histórico de auditoria
              na coleção pcp_audit_logs.
            </span>
            <span className="font-semibold text-slate-700">
              Total listado: {filteredLosses.length} de {losses.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Cadastro / Edição */}
      <TheoreticalLossModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        lineId={lineId}
        lineMasterId={lineMasterId}
        centerCode={centerCode}
        centerName={centerName}
        editingItem={editingItem}
        onSuccess={() => {
          loadData()
          if (onRefreshParent) onRefreshParent()
        }}
      />

      {/* Modal de Confirmação de Exclusão Lógica */}
      <Dialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Confirmar Exclusão Lógica de Perda Teórica
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 space-y-2">
            <p>
              Tem certeza que deseja desativar a perda teórica do material{' '}
              <strong className="text-slate-900">{itemToDelete?.raw_material_code}</strong>{' '}
              (Aplicação: <strong className="text-slate-900">{itemToDelete?.application}</strong>)?
            </p>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 space-y-1">
              <div>
                <strong>RM:</strong> {formatPtBrNumber(itemToDelete?.rm_pct, 2)}% |{' '}
                <strong>Carepa:</strong> {formatPtBrNumber(itemToDelete?.carepa_pct, 2)}% |{' '}
                <strong>Apara:</strong> {formatPtBrNumber(itemToDelete?.apara_pct, 2)}%
              </div>
              <div>
                <strong>Bitola:</strong> {itemToDelete?.bitola || 'Não há'}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * O registro não será removido fisicamente do banco de dados, sendo marcado como
              inativo e registrado na trilha de auditoria do sistema.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
              className="h-8 text-xs text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSoftDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              data-testid="btn-confirm-soft-delete-loss"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TheoreticalLossesPanel
