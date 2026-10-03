/**
 * LineProductFamiliesPanel.tsx
 *
 * Painel da sub-aba "Famílias" da Ficha Mestra Expandida
 * Integrado à collection line_product_families
 *
 * Recursos:
 * - Colunas: Família | Cilindro | Código do equipamento PM | Diâmetro mínimo MP | Diâmetro máximo MP | Quantidade de bitolas | Status Ativa-Inativa | Ações Visualizar-Editar-Inativar
 * - Botão "+ Adicionar família"
 * - Pesquisa por família
 * - Filtro Ativa/Inativa/Todas
 * - Atualização da lista (botão refresh)
 * - Estado vazio amigável
 * - Loading suave
 * - Tratamento de erro amigável (sem stack trace ou SQL)
 * - Modal de visualização rápida / detalhe
 * - Modal de confirmação de inativação / exclusão lógica
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Power,
  SlidersHorizontal,
  Wrench,
  AlertCircle,
  HelpCircle,
  Disc,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  lineProductFamiliesService,
  LineProductFamily,
  formatMm,
  formatLengthMm,
} from '@/services/line-product-families-service'
import { LineFamilyModal } from '@/components/line-master/LineFamilyModal'

interface LineProductFamiliesPanelProps {
  lineId: string
  centerCode: string
  centerName?: string
  lineMasterId?: string
  onRefreshParent?: () => void
}

export const LineProductFamiliesPanel: React.FC<LineProductFamiliesPanelProps> = ({
  lineId,
  centerCode,
  centerName,
  lineMasterId,
  onRefreshParent,
}) => {
  const { toast } = useToast()

  const [families, setFamilies] = useState<LineProductFamily[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('ATIVAS')

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false)
  const [editingFamily, setEditingFamily] = useState<LineProductFamily | null>(null)
  const [viewingFamily, setViewingFamily] = useState<LineProductFamily | null>(null)

  // Modal de Inativação / Desativação
  const [familyToToggle, setFamilyToToggle] = useState<LineProductFamily | null>(null)
  const [isToggling, setIsToggling] = useState<boolean>(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await lineProductFamiliesService.listByLine(lineId)
      setFamilies(data)
    } catch (err: any) {
      console.warn('Erro técnico ao buscar famílias (apenas console log):', err)
      setErrorMessage(
        'Não foi possível carregar as famílias cadastradas para este centro. Verifique sua conexão e tente novamente.',
      )
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as famílias da linha. Tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [lineId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtragem
  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      // Filtro de status
      if (filterStatus === 'ATIVAS' && !f.active) return false
      if (filterStatus === 'INATIVAS' && f.active) return false

      // Busca textual por nome da família, cilindro ou código PM
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const text = [
          f.family_name,
          f.cylinder_code,
          f.cylinder_name,
          f.pm_equipment_code,
          f.pm_equipment_name,
          f.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!text.includes(term)) return false
      }

      return true
    })
  }, [families, filterStatus, searchTerm])

  // Contadores
  const activeCount = useMemo(() => families.filter((f) => f.active).length, [families])
  const inactiveCount = useMemo(() => families.filter((f) => !f.active).length, [families])

  // Ações
  const handleOpenAdd = () => {
    setEditingFamily(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (family: LineProductFamily) => {
    setEditingFamily(family)
    setIsFormModalOpen(true)
  }

  const handleOpenView = (family: LineProductFamily) => {
    setViewingFamily(family)
  }

  const handleConfirmToggleActive = async () => {
    if (!familyToToggle) return
    setIsToggling(true)
    const newStatus = !familyToToggle.active
    try {
      await lineProductFamiliesService.toggleActive(familyToToggle.id, newStatus)
      toast({
        title: newStatus ? 'Família ativada' : 'Família inativada',
        description: `A família "${familyToToggle.family_name}" foi marcada como ${
          newStatus ? 'Ativa' : 'Inativa'
        } com sucesso.`,
      })
      setFamilyToToggle(null)
      loadData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      console.warn('Erro ao alterar status:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description:
          err?.message || 'Falha ao atualizar o status da família. Tente novamente mais tarde.',
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleModalSuccess = () => {
    loadData()
    if (onRefreshParent) onRefreshParent()
  }

  return (
    <div className="space-y-4" data-testid="panel-line-product-families">
      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Total de Famílias</span>
            <span className="text-base font-mono font-bold text-slate-900">{families.length}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#004C97]">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Famílias Ativas</span>
            <span className="text-base font-mono font-bold text-emerald-700">{activeCount}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Famílias Inativas</span>
            <span className="text-base font-mono font-bold text-slate-500">{inactiveCount}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Power className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium block">Centro / Linha</span>
            <span className="text-base font-mono font-bold text-[#004C97]">{centerCode}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#004C97]">
            <Disc className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Card Principal de Listagem */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Famílias Técnicas de Produtos (Ficha Mestra)
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-[#004C97] border-blue-200 font-bold"
              >
                {centerCode}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 pt-0.5">
              Agrupamento técnico de produtos/bitolas com cilindro de conformação, equipamento SAP
              PM e faixa de MP.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Atualizar lista"
              data-testid="btn-refresh-families"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAdd}
              data-testid="btn-add-family"
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1 font-bold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> + Adicionar família
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3 space-y-3">
          {/* Tratamento amigável de erro */}
          {errorMessage && (
            <div
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between gap-2"
              data-testid="error-message-friendly"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadData}
                className="h-7 text-xs border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Barra de Filtros e Pesquisa */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            {/* Pesquisa por Família */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por família, cilindro, código PM..."
                className="h-8 pl-8 text-xs bg-white border-slate-300"
                data-testid="input-search-families"
              />
            </div>

            {/* Filtro Status Ativa / Inativa */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                Status:
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'TODAS' | 'ATIVAS' | 'INATIVAS')}
                className="h-8 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 outline-none"
                data-testid="select-filter-status"
              >
                <option value="ATIVAS">Ativas ({activeCount})</option>
                <option value="INATIVAS">Inativas ({inactiveCount})</option>
                <option value="TODAS">Todas ({families.length})</option>
              </select>
            </div>

            {(searchTerm || filterStatus !== 'ATIVAS') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('ATIVAS')
                }}
                className="h-8 text-[11px] text-slate-500 hover:text-slate-800"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Visualização em Cards no Celular / Tabela no Desktop */}
          <div className="block md:hidden space-y-3" data-testid="mobile-families-cards">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#004C97] border-t-transparent" />
                  Carregando famílias...
                </div>
              </div>
            ) : filteredFamilies.length === 0 ? (
              <div
                className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200"
                data-testid="mobile-empty-families"
              >
                <Layers className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Nenhuma família cadastrada</p>
              </div>
            ) : (
              filteredFamilies.map((fam) => (
                <div
                  key={`mobile-${fam.id}`}
                  className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs"
                  data-testid={`mobile-family-card-${fam.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{fam.family_name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        fam.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                    >
                      {fam.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Cilindro:</span>
                      <span className="font-semibold text-slate-800">{fam.cylinder_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Equipamento PM:</span>
                      <span className="font-mono text-slate-800">{fam.pm_equipment_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Faixa MP:</span>
                      <span className="font-mono text-[#004C97] font-semibold">
                        {formatMm(fam.min_mp_diameter_mm)} a {formatMm(fam.max_mp_diameter_mm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bitolas:</span>
                      <span className="font-bold text-slate-800">
                        {fam.gauges_count} {fam.gauges_count === 1 ? 'bitola' : 'bitolas'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenView(fam)}
                      className="h-7 px-2 text-xs text-slate-600 gap-1 hover:bg-slate-100"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(fam)}
                      className="h-7 px-2 text-xs text-amber-700 gap-1 hover:bg-amber-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFamilyToToggle(fam)}
                      className={`h-7 px-2 text-xs gap-1 ${
                        fam.active
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" /> {fam.active ? 'Inativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tabela de Famílias no Desktop com rolagem interna */}
          <div className="hidden md:block overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2.5">Família</th>
                  <th className="p-2.5">Cilindro</th>
                  <th className="p-2.5">Código do equipamento PM</th>
                  <th className="p-2.5">Diâmetro mínimo MP</th>
                  <th className="p-2.5">Diâmetro máximo MP</th>
                  <th className="p-2.5 text-center">Quantidade de bitolas</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#004C97] border-t-transparent" />
                        Carregando famílias cadastradas...
                      </div>
                    </td>
                  </tr>
                ) : filteredFamilies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center" data-testid="empty-families-state">
                      <div className="max-w-md mx-auto space-y-2">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700">
                          {searchTerm || filterStatus !== 'TODAS'
                            ? 'Nenhuma família encontrada com os filtros aplicados'
                            : 'Nenhuma família cadastrada para este centro'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {searchTerm || filterStatus !== 'TODAS'
                            ? 'Tente ajustar os termos de pesquisa ou alternar o filtro de status.'
                            : 'Cadastre a primeira família técnica com cilindro, código PM e bitolas associadas.'}
                        </p>
                        {!searchTerm && filterStatus === 'ATIVAS' && (
                          <Button
                            size="sm"
                            onClick={handleOpenAdd}
                            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 gap-1 font-bold shadow-xs mt-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar família agora
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFamilies.map((fam) => (
                    <tr
                      key={fam.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !fam.active ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                      data-testid={`family-row-${fam.id}`}
                    >
                      {/* Família */}
                      <td className="p-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{fam.family_name}</span>
                          {fam.notes && (
                            <span
                              className="text-slate-400 hover:text-slate-600 cursor-help"
                              title={fam.notes}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cilindro */}
                      <td className="p-2.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{fam.cylinder_code}</span>
                          {fam.cylinder_name && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {fam.cylinder_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Código do equipamento PM */}
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] bg-slate-50 text-slate-800 border-slate-300"
                        >
                          {fam.pm_equipment_code}
                        </Badge>
                      </td>

                      {/* Diâmetro mínimo MP */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-800">
                        {formatMm(fam.min_mp_diameter_mm, 2)}
                      </td>

                      {/* Diâmetro máximo MP */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-800">
                        {formatMm(fam.max_mp_diameter_mm, 2)}
                      </td>

                      {/* Quantidade de bitolas */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs font-bold bg-blue-50 text-[#004C97] hover:bg-blue-100"
                        >
                          {fam.gauges_count} {fam.gauges_count === 1 ? 'bitola' : 'bitolas'}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            fam.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {fam.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>

                      {/* Ações Visualizar - Editar - Inativar */}
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Visualizar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenView(fam)}
                            title="Visualizar detalhes da família"
                            data-testid={`btn-view-family-${fam.id}`}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Editar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(fam)}
                            title="Editar família"
                            data-testid={`btn-edit-family-${fam.id}`}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Inativar / Ativar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFamilyToToggle(fam)}
                            title={fam.active ? 'Inativar família' : 'Ativar família'}
                            data-testid={`btn-toggle-family-${fam.id}`}
                            className={`h-7 w-7 p-0 ${
                              fam.active
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Principal de Cadastro / Edição */}
      <LineFamilyModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleModalSuccess}
        lineId={lineId}
        centerCode={centerCode}
        centerName={centerName}
        lineMasterId={lineMasterId}
        familyToEdit={editingFamily}
      />

      {/* Modal de Detalhes / Visualização Completa */}
      <Dialog
        open={Boolean(viewingFamily)}
        onOpenChange={(open) => (!open ? setViewingFamily(null) : null)}
      >
        <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200 shadow-xl p-0 overflow-hidden">
          {viewingFamily && (
            <>
              <DialogHeader className="p-4 px-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#004C97]" />
                    {viewingFamily.family_name}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      viewingFamily.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-300'
                    }`}
                  >
                    {viewingFamily.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Detalhamento técnico da família vinculada ao centro {viewingFamily.center_code}.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4 text-xs">
                {/* Bloco de Informações */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-medium block">Cilindro:</span>
                    <span className="font-bold text-slate-800">{viewingFamily.cylinder_code}</span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {viewingFamily.cylinder_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Equipamento SAP PM:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {viewingFamily.pm_equipment_code}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {viewingFamily.pm_equipment_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">
                      Faixa de MP Admissível:
                    </span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {formatMm(viewingFamily.min_mp_diameter_mm)} a{' '}
                      {formatMm(viewingFamily.max_mp_diameter_mm)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Total de Bitolas:</span>
                    <span className="font-bold text-slate-800">
                      {viewingFamily.gauges_count} cadastradas
                    </span>
                  </div>
                </div>

                {/* Tabela de Bitolas da Família */}
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#004C97]" />
                    Bitolas da Família e Comprimentos
                  </h5>
                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">Bitola</th>
                          <th className="p-2">Comprimento Mínimo</th>
                          <th className="p-2">Comprimento Máximo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingFamily.gauges_json.map((g, i) => (
                          <tr key={g.id || i} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-mono">{i + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{g.bitola}</td>
                            <td className="p-2 font-mono text-slate-700">
                              {formatLengthMm(g.min_length_mm)}
                            </td>
                            <td className="p-2 font-mono text-slate-700">
                              {formatLengthMm(g.max_length_mm)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {viewingFamily.notes && (
                  <div className="p-2.5 bg-blue-50/50 rounded border border-blue-200 text-slate-700">
                    <span className="font-bold block text-[11px] text-[#004C97]">Observações:</span>
                    <span className="text-[11px]">{viewingFamily.notes}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const toEdit = viewingFamily
                    setViewingFamily(null)
                    handleOpenEdit(toEdit)
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar esta família
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setViewingFamily(null)}
                  className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Ativação / Inativação */}
      <Dialog
        open={Boolean(familyToToggle)}
        onOpenChange={(open) => (!open ? setFamilyToToggle(null) : null)}
      >
        <DialogContent className="max-w-md p-5 bg-white text-slate-900 border-slate-200 shadow-xl">
          {familyToToggle && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Power
                    className={`w-4 h-4 ${
                      familyToToggle.active ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  />
                  {familyToToggle.active ? 'Inativar família?' : 'Reativar família?'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {familyToToggle.active
                    ? `A família "${familyToToggle.family_name}" deixará de aparecer como opção ativa no planejamento da linha ${familyToToggle.center_code}.`
                    : `A família "${familyToToggle.family_name}" voltará a ficar disponível para programação.`}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFamilyToToggle(null)}
                  disabled={isToggling}
                  className="h-8 text-xs font-semibold border-slate-300"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmToggleActive}
                  disabled={isToggling}
                  className={`h-8 text-xs font-bold text-white ${
                    familyToToggle.active
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  data-testid="btn-confirm-toggle-active"
                >
                  {isToggling
                    ? 'Atualizando...'
                    : familyToToggle.active
                      ? 'Confirmar Inativação'
                      : 'Confirmar Ativação'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LineProductFamiliesPanel
