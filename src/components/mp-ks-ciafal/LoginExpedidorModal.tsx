// Login operacional expedidor (estilo ZPP85/ZPP46A) — centro + matrícula/senha
// Mensagens EXATAS vindas do backend: LIN_PROD ≠ EXP / matrícula inativa
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginExpedidor } from '@/services/mp-ks-ciafal-service'
import type { UsuarioExpedidor } from '@/services/mp-ks-ciafal-service'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (usuario: UsuarioExpedidor) => void
}

export default function LoginExpedidorModal({ open, onOpenChange, onSuccess }: Props) {
  const [centro, setCentro] = useState('P3000')
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (loading) return // duplo clique bloqueado
    setErro('')
    setLoading(true)
    try {
      const u = await loginExpedidor(centro.trim(), matricula.trim(), senha)
      setSenha('')
      onSuccess(u)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-[#004C97]">Login Operacional — Expedidor</DialogTitle>
          <DialogDescription>
            Acesso com centro + matrícula/senha (ZPP_USUARIO). Somente matrículas do tipo Expedidor
            (LIN_PROD = EXP).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-centro">Centro</Label>
            <Input
              id="login-centro"
              value={centro}
              onChange={(e) => setCentro(e.target.value)}
              placeholder="P3000"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-matricula">Matrícula</Label>
            <Input
              id="login-matricula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Número da matrícula"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-senha">Senha</Label>
            <Input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>
          {erro && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
              {erro}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Fechar
            </Button>
            <Button type="submit" className="bg-[#004C97] hover:bg-[#003a75]" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
