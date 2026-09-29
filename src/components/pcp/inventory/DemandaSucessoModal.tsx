import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InventoryDemand } from '@/types/pcp-inventory-demands'
import {
  CheckCircle2,
  Eye,
  X,
  Building2,
  Factory,
  Warehouse,
  Calendar,
  Boxes,
  AlertTriangle,
} from 'lucide-react'

interface DemandaSucessoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: InventoryDemand | null
  onClose: () => void
  onViewDetails: (demand: InventoryDemand) => void
}

const formatPtBrDateTime = (dateVal?: string): string => {
  if (!dateVal || dateVal === '—' || dateVal.trim() === '') {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${mins}`
  }
  if (dateVal.includes('/') && dateVal.includes(':')) {
    return dateVal
  }
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return dateVal
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${mins}`
  } catch {
    return dateVal
  }
}

export const DemandaSucessoModal: React.FC<DemandaSucessoModalProps> = ({
  open,
  onOpenChange,
  demand,
  onClose,
  onViewDetails,
}) => {
  if (!demand) return null

  // PROIBIDO exibir "-", null, undefined ou vazio — se o backend não retornou dado obrigatório, é erro, não sucesso
  const isInvalid =
    !demand.control_number ||
    demand.control_number === '-' ||
    demand.control_number.trim() === '' ||
    demand.control_number.includes('PENDENTE') ||
    !demand.company ||
    demand.company === '-' ||
    demand.company.trim() === '' ||
    !demand.line ||
    demand.line === '-' ||
    demand.line.trim() === '' ||
    !demand.center ||
    demand.center === '-' ||
    demand.center.trim() === '' ||
    !demand.storage_deposit ||
    demand.storage_deposit === '-' ||
    demand.storage_deposit.trim() === '' ||
    !demand.production_order ||
    demand.production_order === '-' ||
    demand.production_order.trim() === ''

  const materialCount =
    demand.materials_summary && demand.materials_summary.length > 0
      ? demand.materials_summary.length
      : demand.material_code
        ? 1
        : 0

  const createdDateFormatted = formatPtBrDateTime(
    demand.generation_date_formatted || demand.created,
  )

  const handleClose = () => {
    onClose()
    onOpenChange(false)
  }

  const handleView = () => {
    onOpenChange(false)
    onViewDetails(demand)
  }

  if (isInvalid) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 pb-2 border-b border-rose-100">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-rose-900 tracking-tight">
                  ERRO NO RETORNO DO BACKEND
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-700 mt-0.5">
                  A demanda criada não contém todos os campos obrigatórios persistidos pelo banco de
                  dados.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3 text-xs text-slate-700">
            Dados obrigatórios ausentes ou inválidos no registro retornado pelo PocketBase.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="text-xs h-8">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900 tracking-tight">
                DEMANDA GERADA COM SUCESSO
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5">
                Demanda de Inventário nº{' '}
                <span className="font-mono font-bold text-[#004C97]">{demand.control_number}</span>{' '}
                gerada com sucesso.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo exibido no popup com valores reais retornados pelo backend SOMENTE */}
        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nº da Demanda
              </span>
              <span className="font-mono font-black text-sm text-[#004C97]">
                {demand.control_number}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  Empresa
                </span>
                <span className="font-semibold text-slate-800 text-xs">{demand.company}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Factory className="w-3 h-3 text-slate-500" />
                  Linha
                </span>
                <span className="font-semibold text-slate-800 text-xs">{demand.line}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Warehouse className="w-3 h-3 text-slate-500" />
                  Centro
                </span>
                <span className="font-semibold text-slate-800 text-xs">{demand.center}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Warehouse className="w-3 h-3 text-slate-500" />
                  Depósito
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  {demand.storage_deposit}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Ordem de Produção
                </span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {demand.production_order}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Boxes className="w-3 h-3 text-slate-500" />
                  Qtd. Matérias-Primas
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className="text-[11px] font-bold bg-white text-[#004C97] border-[#004C97]/30"
                  >
                    {materialCount} {materialCount === 1 ? 'matéria-prima' : 'matérias-primas'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Data/Hora da Criação
              </span>
              <span className="font-mono text-[11px] font-semibold text-slate-700">
                {createdDateFormatted}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-xs h-8 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleView}
            className="text-xs h-8 bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            Visualizar Demanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
