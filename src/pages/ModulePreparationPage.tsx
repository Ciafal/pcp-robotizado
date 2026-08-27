import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Can } from '@/components/auth/Can'
import {
  FileSpreadsheet,
  Sliders,
  CalendarDays,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PlaceholderProps {
  title: string
  subtitle: string
  targetPrompt: string
  requiredPerm: string
  features: string[]
}

export const ModulePreparationPage: React.FC<PlaceholderProps> = ({
  title,
  subtitle,
  targetPrompt,
  requiredPerm,
  features,
}) => {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
            <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-xs">
              {targetPrompt}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>

      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="p-6">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Fundação RBAC & Escopos Já Integrada</span>
          </div>
          <CardTitle className="text-lg font-bold text-white">
            Módulo Estruturado com Autorização Granular Ativa
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            A estrutura de segurança e governança de acessos (PROMPT 02) já está 100% pronta para
            conectar a lógica de negócio deste módulo na próxima etapa.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4 text-xs">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
              Controles de Autorização Preparados:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-900/60 border border-cyan-700 flex items-center justify-center text-cyan-300">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white block text-xs">
                  Permissão Principal Vinculada:
                </span>
                <code className="text-cyan-400 font-mono text-xs">{requiredPerm}</code>
              </div>
            </div>

            <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-300">
              Segurança Validada
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
