import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertCircle, Edit, Flame, Loader2, Plus, Trash2 } from 'lucide-react'
import { LineFurnaceChargingType, normalizeStatusEnfornamento } from '@/types/furnace-charging'
import { furnaceChargingService } from '@/services/furnace-charging-service'
import { FurnaceChargingTypeModal, formatProporcaoDisplay } from './FurnaceChargingTypeModal'
import { useToast } from '@/hooks/use-toast'

interface FurnaceChargingTypesSectionProps {
  centerCode: string
  lineId?: string
  lineMasterId?: string
}

export const FurnaceChargingTypesSection: React.FC<FurnaceChargingTypesSectionProps> = ({
  centerCode,
  lineId,
  lineMasterId,
}) => {
  const { toast } = useToast()
  const [items, setItems] = useState<LineFurnaceChargingType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de Adicionar / Editar
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<LineFurnaceChargingType | null>(null)

  // Diálogo de confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<LineFurnaceChargingType | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    if (!centerCode) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await furnaceChargingService.listChargingTypes(centerCode)
      setItems(data)
    } catch (err: any) {
      console.error('Erro ao carregar tipos de enfornamento:', err)
      setError('Não foi possível carregar os tipos de enfornamento cadastrados para este centro.')
    } finally {
      setLoading(false)
    }
  }, [centerCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LineFurnaceChargingType) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleOpenDelete = (item: LineFurnaceChargingType) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      const ok = await furnaceChargingService.deleteChargingType(itemToDelete.id, centerCode)
      if (ok) {
        toast({
          title: 'Regra excluída com sucesso',
          description: `O tipo de enfornamento "${itemToDelete.charging_type}" foi removido do centro ${centerCode}.`,
        })
        await loadData()
      } else {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o registro. Tente novamente.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Falha durante o processo de exclusão.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const handleModalSuccess = (savedChargingType?: string) => {
    const tipoLabel = savedChargingType || editingItem?.charging_type || ''
    toast({
      title: 'Regra cadastrada com sucesso',
      description: `Tipo de enfornamento '${tipoLabel}' salvo com sucesso. Centro ${centerCode}.`,
    })
    loadData()
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#002F6C] flex items-center justify-center font-bold">
            <Flame className="w-5 h-5 text-[#002F6C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Tipos de Enfornamento</h3>
              <Badge
                variant="outline"
                className="text-xs bg-blue-50/50 text-[#002F6C] border-blue-200"
              >
                Centro: {centerCode || 'Não selecionado'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {items.length} {items.length === 1 ? 'regra' : 'regras'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matérias-primas, proporções e status do enfornamento vinculados ao centro
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenAdd}
          disabled={!centerCode}
          className="bg-[#002F6C] hover:bg-[#002555] text-white gap-2 font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />+ Adicionar tipo de enfornamento
        </Button>
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="ml-auto text-xs border-red-300 text-red-700 hover:bg-red-100"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Conteúdo / Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#002F6C]" />
            <p className="text-sm">Carregando tipos de enfornamento do centro {centerCode}...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
            <Flame className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <div className="max-w-md">
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma regra de tipo de enfornamento cadastrada para este centro.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clique no botão "+ Adicionar tipo de enfornamento" acima para definir as
                matérias-primas, a proporção e o status do enfornamento.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              disabled={!centerCode}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-[#002F6C] text-[#002F6C] hover:bg-blue-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar primeira regra
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tipo de enfornamento
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tipo MP
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Descrição MP
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Matéria-prima principal
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Matéria-prima secundária
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Proporção
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 w-[120px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/70 text-xs">
                    <TableCell className="font-semibold text-slate-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[#002F6C] border border-blue-200">
                        {row.charging_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-800">
                      {row.raw_material_code}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {row.raw_material_description || '—'}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {row.mp_principal_code
                        ? `${row.mp_principal_code}${row.mp_principal_description ? ` — ${row.mp_principal_description}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {row.mp_secundaria_code
                        ? `${row.mp_secundaria_code}${row.mp_secundaria_description ? ` — ${row.mp_secundaria_description}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {formatProporcaoDisplay(row.proporcao) || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {normalizeStatusEnfornamento(row.status) === 'Inativo' ? (
                        <Badge className="bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-200">
                          Inativo
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(row)}
                          title="Editar regra"
                          className="h-7 w-7 text-slate-600 hover:text-[#002F6C] hover:bg-blue-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(row)}
                          title="Excluir regra"
                          className="h-7 w-7 text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal de inclusão / edição */}
      <FurnaceChargingTypeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        centerCode={centerCode}
        lineId={lineId}
        lineMasterId={lineMasterId}
        initialData={editingItem}
        onSuccess={handleModalSuccess}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Tem certeza de que deseja excluir a regra de tipo de enfornamento{' '}
              <strong className="text-slate-900">
                "{itemToDelete?.charging_type} — {itemToDelete?.raw_material_code}"
              </strong>{' '}
              do Centro <strong className="text-slate-900">{centerCode}</strong>? Esta ação
              realizará a exclusão lógica com registro de auditoria no HUB.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default FurnaceChargingTypesSection
