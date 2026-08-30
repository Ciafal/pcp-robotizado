import React, { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, TestTube2, Server, Check, ChevronDown } from 'lucide-react'
import { IntegrationEnvironment } from '@/types/pcp-integration'
import { integrationEventService } from '@/services/pcp-integration-service'
import { toast } from '@/hooks/use-toast'

export const EnvironmentSelectorBadge: React.FC = () => {
  const [currentEnv, setCurrentEnv] = useState<IntegrationEnvironment>(
    integrationEventService.getActiveEnvironment(),
  )

  useEffect(() => {
    const handleEnvChanged = (e: any) => {
      if (e.detail?.env) {
        setCurrentEnv(e.detail.env)
      }
    }
    window.addEventListener('ciafal_environment_changed', handleEnvChanged)
    return () => {
      window.removeEventListener('ciafal_environment_changed', handleEnvChanged)
    }
  }, [])

  const switchEnvironment = (env: IntegrationEnvironment) => {
    integrationEventService.setActiveEnvironment(env)
    setCurrentEnv(env)
    toast({
      title: `Ambiente PCP Alterado: ${env}`,
      description:
        env === 'MOCK'
          ? 'Modo de testes rápidos isolados ativo.'
          : env === 'HOMOLOGACAO'
            ? 'Modo de homologação ativo (cenários ponta a ponta sem risco à produção).'
            : 'ATENÇÃO: Modo de Produção Ativo (propagação oficial aos sistemas CIAFAL).',
      variant: env === 'PRODUCAO' ? 'destructive' : 'default',
    })
  }

  const getEnvConfig = () => {
    switch (currentEnv) {
      case 'MOCK':
        return {
          label: 'AMBIENTE: MOCK',
          color: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
          dot: 'bg-amber-500',
          icon: TestTube2,
        }
      case 'HOMOLOGACAO':
        return {
          label: 'AMBIENTE: HOMOLOGAÇÃO',
          color: 'bg-blue-50 text-[#004C97] border-blue-300 hover:bg-blue-100 font-bold',
          dot: 'bg-[#004C97]',
          icon: ShieldCheck,
        }
      case 'PRODUCAO':
        return {
          label: 'AMBIENTE: PRODUÇÃO',
          color:
            'bg-emerald-50 text-emerald-900 border-emerald-400 hover:bg-emerald-100 font-black',
          dot: 'bg-emerald-600',
          icon: Server,
        }
    }
  }

  const cfg = getEnvConfig()
  const Icon = cfg.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-3 gap-2 border text-xs shadow-xs transition-all ${cfg.color}`}
        >
          <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
          <Icon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-white border-slate-200 shadow-lg text-slate-800"
      >
        <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Modo de Execução de Integrações
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => switchEnvironment('MOCK')}
          className="flex items-center justify-between cursor-pointer py-2 hover:bg-amber-50"
        >
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-amber-900 flex items-center gap-1.5">
              <TestTube2 className="w-3.5 h-3.5 text-amber-600" /> Modo MOCK
            </span>
            <span className="text-[10px] text-slate-500">Respostas locais instantâneas</span>
          </div>
          {currentEnv === 'MOCK' && <Check className="w-4 h-4 text-amber-600 font-bold" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => switchEnvironment('HOMOLOGACAO')}
          className="flex items-center justify-between cursor-pointer py-2 hover:bg-blue-50"
        >
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[#004C97] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" /> Modo HOMOLOGAÇÃO
            </span>
            <span className="text-[10px] text-slate-500">Validação ponta a ponta sem risco</span>
          </div>
          {currentEnv === 'HOMOLOGACAO' && <Check className="w-4 h-4 text-[#004C97] font-bold" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => switchEnvironment('PRODUCAO')}
          className="flex items-center justify-between cursor-pointer py-2 hover:bg-emerald-50"
        >
          <div className="flex flex-col">
            <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-600" /> Modo PRODUÇÃO
            </span>
            <span className="text-[10px] text-slate-500">Comunicação real com fábricas e SAP</span>
          </div>
          {currentEnv === 'PRODUCAO' && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
