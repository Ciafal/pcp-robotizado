import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, Power } from 'lucide-react'
import type { TarugoPlanRecord } from '@/services/tarugo-plans-service'

export type ConfirmAction =
  | { kind: 'delete'; plan: TarugoPlanRecord }
  | { kind: 'toggle'; plan: TarugoPlanRecord }
  | null

export interface TarugoPlanConfirmModalProps {
  action: ConfirmAction
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export function TarugoPlanConfirmModal({
  action,
  busy,
  onClose,
  onConfirm,
}: TarugoPlanConfirmModalProps) {
  if (!action) return null

  const isDelete = action.kind === 'delete'
  const plan = action.plan
  const nextStatus = plan.status === 'Ativo' ? 'Inativo' : 'Ativo'

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>
              {isDelete
                ? 'Exclusão Lógica do Plano'
                : `${nextStatus === 'Ativo' ? 'Ativar' : 'Inativar'} Plano`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2 space-y-2 text-xs text-slate-600">
            {isDelete ? (
              <>
                <p>
                  Tem certeza de que deseja excluir o plano de tarugos{' '}
                  <strong className="text-slate-900 font-mono">{plan.cutting_plan}</strong> (
                  {plan.company} · {plan.center} · {plan.line})?
                </p>
                <p className="rounded bg-amber-50 p-2 text-amber-800 border border-amber-200">
                  A exclusão é <strong>lógica</strong> para manter total rastreabilidade e histórico
                  de auditoria. O plano será marcado como inativo e não será removido fisicamente da
                  base.
                </p>
              </>
            ) : (
              <p>
                Deseja alterar o status do plano{' '}
                <strong className="text-slate-900 font-mono">{plan.cutting_plan}</strong> para{' '}
                <strong className={nextStatus === 'Ativo' ? 'text-emerald-700' : 'text-slate-700'}>
                  {nextStatus}
                </strong>
                ?
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={isDelete ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy}
            className="gap-1.5"
          >
            {isDelete ? (
              <>
                <Trash2 className="h-4 w-4" />
                {busy ? 'Inativando...' : 'Confirmar Exclusão'}
              </>
            ) : (
              <>
                <Power className="h-4 w-4" />
                {busy ? 'Salvando...' : `Confirmar (${nextStatus})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
