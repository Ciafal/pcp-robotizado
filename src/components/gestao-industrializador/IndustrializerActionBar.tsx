/**
 * Barra padronizada de ações para o menu GESTÃO INDUSTRIALIZADOR:
 * [Enviar Hub] [Enviar e-mail] [Análise IA]
 *
 * Características:
 * - Posicionada no cabeçalho/bloco de filtros superior
 * - Botões com tooltip, hover, focus, disabled, loading
 * - Identidade visual CIAFAL (#004C97, tons suaves, bordas discretas)
 * - Conectada aos modais de ação real
 */

import React, { useState } from 'react'
import { Send, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  IndustrializerScreenKey,
  IndustrializerAiResult,
} from '@/services/gestao-industrializador-actions-service'
import { IndustrializerSendHubModal } from './IndustrializerSendHubModal'
import { IndustrializerSendEmailModal } from './IndustrializerSendEmailModal'
import { IndustrializerAiAnalysisModal } from './IndustrializerAiAnalysisModal'

export interface IndustrializerActionBarProps {
  screenKey: IndustrializerScreenKey
  screenName: string
  filters: Record<string, any>
  metrics?: Record<string, any>
  records: Array<Record<string, any>>
  className?: string
  disabled?: boolean
  onSuccessAction?: (actionType: 'hub' | 'email' | 'ai', message: string) => void
}

export const IndustrializerActionBar: React.FC<IndustrializerActionBarProps> = ({
  screenKey,
  screenName,
  filters,
  metrics = {},
  records,
  className = '',
  disabled = false,
  onSuccessAction,
}) => {
  const [hubModalOpen, setHubModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  // Conteúdo pré-preenchido para repassar entre modais (ex: IA -> Hub ou Email)
  const [prefilledSubject, setPrefilledSubject] = useState<string | undefined>()
  const [prefilledMessage, setPrefilledMessage] = useState<string | undefined>()

  const handleOpenHubWithContent = (subject?: string, message?: string) => {
    setPrefilledSubject(subject)
    setPrefilledMessage(message)
    setHubModalOpen(true)
  }

  const handleOpenEmailWithContent = (subject?: string, body?: string) => {
    setPrefilledSubject(subject)
    setPrefilledMessage(body)
    setEmailModalOpen(true)
  }

  const recordsCount = records?.length || 0

  return (
    <div
      data-testid="industrializer-action-bar"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <TooltipProvider delayDuration={200}>
        {/* Botão 1: Enviar Hub */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setPrefilledSubject(undefined)
                setPrefilledMessage(undefined)
                setHubModalOpen(true)
              }}
              className="border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/10 hover:text-[#004C97] focus:ring-2 focus:ring-[#004C97]/40 font-medium transition-all shadow-xs"
              data-testid="btn-enviar-hub"
              aria-label="Enviar informações para o HUB"
            >
              <Send className="w-4 h-4 mr-1.5 shrink-0 text-[#004C97]" />
              <span>Enviar Hub</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            Enviar as informações e indicadores filtrados desta tela diretamente para usuários do
            HUB Industrial CIAFAL.
          </TooltipContent>
        </Tooltip>

        {/* Botão 2: Enviar e-mail */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setPrefilledSubject(undefined)
                setPrefilledMessage(undefined)
                setEmailModalOpen(true)
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-400 font-medium transition-all shadow-xs"
              data-testid="btn-enviar-email"
              aria-label="Enviar informações por e-mail"
            >
              <Mail className="w-4 h-4 mr-1.5 shrink-0 text-slate-600" />
              <span>Enviar e-mail</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            Disparar relatório com dados filtrados via serviço de e-mail corporativo Resend.
          </TooltipContent>
        </Tooltip>

        {/* Botão 3: Análise IA */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => setAiModalOpen(true)}
              className="bg-gradient-to-r from-[#004C97] to-[#0066cc] text-white hover:from-[#003d7a] hover:to-[#0052a3] focus:ring-2 focus:ring-[#004C97]/50 font-medium shadow-sm transition-all border-none"
              data-testid="btn-analise-ia"
              aria-label="Executar Análise IA dos dados filtrados"
            >
              <Sparkles className="w-4 h-4 mr-1.5 shrink-0 text-amber-300 animate-pulse" />
              <span>Análise IA</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            Gerar análise executiva e técnica com IA sobre os {recordsCount} registro(s) e
            indicadores atualmente filtrados.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modais Funcionais */}
      <IndustrializerSendHubModal
        isOpen={hubModalOpen}
        onClose={() => setHubModalOpen(false)}
        screenKey={screenKey}
        screenName={screenName}
        filters={filters}
        metrics={metrics}
        records={records}
        initialSubject={prefilledSubject}
        initialMessage={prefilledMessage}
        onSuccess={(msg) => {
          onSuccessAction?.('hub', msg)
        }}
      />

      <IndustrializerSendEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        screenKey={screenKey}
        screenName={screenName}
        filters={filters}
        metrics={metrics}
        records={records}
        initialSubject={prefilledSubject}
        initialBody={prefilledMessage}
        onSuccess={(msg) => {
          onSuccessAction?.('email', msg)
        }}
      />

      <IndustrializerAiAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        screenKey={screenKey}
        screenName={screenName}
        filters={filters}
        metrics={metrics}
        records={records}
        onSendHub={(subject, message) => {
          handleOpenHubWithContent(subject, message)
        }}
        onSendEmail={(subject, body) => {
          handleOpenEmailWithContent(subject, body)
        }}
      />
    </div>
  )
}
