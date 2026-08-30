import React, { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ChevronRight,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatAbntUnit,
  formatAbntNumber,
  sanitizeDisplay,
  formatUpdateTimestamp,
} from '@/lib/ciafal-standards'

/* =========================================================================================
 * 1. CIAFAL PAGE HEADER & BREADCRUMB
 * ========================================================================================= */

export interface CiafalBreadcrumbItem {
  label: string
  href?: string
}

export interface CiafalPageHeaderProps {
  moduleName?: string
  screenTitle: string
  subtitle?: string
  breadcrumbs?: CiafalBreadcrumbItem[]
  badge?: string
  actions?: ReactNode
  lastUpdated?: string | Date | null
  dataSource?: string
}

export const CiafalPageHeader: React.FC<CiafalPageHeaderProps> = ({
  moduleName = 'PCP Robotizado',
  screenTitle,
  subtitle,
  breadcrumbs,
  badge,
  actions,
  lastUpdated,
  dataSource,
}) => {
  const updateStatus = lastUpdated ? formatUpdateTimestamp(lastUpdated) : null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 mb-4">
      {/* Breadcrumb e Rastreabilidade de Sistema */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"
        >
          <Link to="/pcp/sequenciamento" className="hover:text-[#004C97] transition-colors">
            {moduleName}
          </Link>
          {breadcrumbs &&
            breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {b.href ? (
                  <Link to={b.href} className="hover:text-[#004C97] transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 font-semibold">{b.label}</span>
                )}
              </React.Fragment>
            ))}
        </nav>

        {(dataSource || updateStatus) && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            {dataSource && (
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                <Database className="w-3 h-3 text-[#004C97]" />
                {dataSource}
              </span>
            )}
            {updateStatus && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
                  updateStatus.isStale
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                {updateStatus.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Título Principal e Ações de Topo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {screenTitle}
            </h1>
            {badge && (
              <Badge className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/30 text-xs font-bold">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">{subtitle}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

/* =========================================================================================
 * 2. CIAFAL STATUS (SEMÁFORO SEGURO COM COR + ÍCONE + TEXTO + TOOLTIP)
 * ========================================================================================= */

export type CiafalStatusType =
  | 'NORMAL'
  | 'ATENCAO'
  | 'CRITICO'
  | 'SEM_DADO'
  | 'INFO'
  | 'EM_ANALISE'
  | 'SUCESSO'
  | 'BLOQUEADO'

export interface CiafalStatusProps {
  status: CiafalStatusType | string
  label?: string
  tooltipText?: string
  size?: 'sm' | 'md'
  className?: string
}

export const CiafalStatus: React.FC<CiafalStatusProps> = ({
  status,
  label,
  tooltipText,
  size = 'md',
  className = '',
}) => {
  const norm = String(status || '').toUpperCase()

  let config = {
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    defaultLabel: 'Normal',
    defaultTooltip: 'Operação dentro dos parâmetros e tolerâncias normais.',
  }

  if (
    norm.includes('ATENCAO') ||
    norm.includes('ALERTA') ||
    norm.includes('WARNING') ||
    norm.includes('DESVIO')
  ) {
    config = {
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      defaultLabel: 'Atenção',
      defaultTooltip: 'Tendência de desvio identificada. Monitoramento intensivo recomendado.',
    }
  } else if (
    norm.includes('CRITIC') ||
    norm.includes('RUPTURA') ||
    norm.includes('ERRO') ||
    norm.includes('FALHA') ||
    norm.includes('BLOQUEADO')
  ) {
    config = {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
      defaultLabel: 'Crítico',
      defaultTooltip:
        'Ação imediata necessária para evitar parada de linha ou ruptura de atendimento.',
    }
  } else if (
    norm.includes('SEM_DADO') ||
    norm.includes('PENDENTE') ||
    norm.includes('NAO_INICIADO') ||
    norm.includes('INDISPONIVEL')
  ) {
    config = {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Clock,
      iconColor: 'text-slate-500',
      defaultLabel: 'Sem dado / Pendente',
      defaultTooltip: 'Aguardando integração ou registro de apontamento.',
    }
  } else if (norm.includes('INFO') || norm.includes('ANALISE') || norm.includes('EM_ANDAMENTO')) {
    config = {
      bg: 'bg-blue-50 text-[#004C97] border-blue-200',
      icon: Info,
      iconColor: 'text-[#004C97]',
      defaultLabel: 'Informativo',
      defaultTooltip: 'Registro operacional informativo em análise assistida.',
    }
  }

  const IconComp = config.icon
  const displayLabel = label || config.defaultLabel
  const tip = tooltipText || config.defaultTooltip

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-semibold tracking-tight transition-colors cursor-help ${
              config.bg
            } ${size === 'sm' ? 'text-[10px]' : 'text-xs'} ${className}`}
          >
            <IconComp
              className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.iconColor} shrink-0`}
            />
            <span>{displayLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-900 text-white text-xs border-slate-700">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* =========================================================================================
 * 3. CIAFAL KPI CARD (PADRONIZADO CONFORME REQUISITO 11)
 * [Título] [Valor] [Unidade] [Variação] [Referência / Meta] [Status] [Atualização]
 * ========================================================================================= */

export interface CiafalKPICardProps {
  title: string
  value: number | string | null | undefined
  unit?: string
  decimals?: number
  target?: number | string
  targetLabel?: string
  variationPct?: number
  variationLabel?: string
  status?: CiafalStatusType
  updatedAt?: string | Date | null
  infoTooltip?: string
  icon?: React.ComponentType<{ className?: string }>
}

export const CiafalKPICard: React.FC<CiafalKPICardProps> = ({
  title,
  value,
  unit = '',
  decimals = 1,
  target,
  targetLabel = 'Meta:',
  variationPct,
  variationLabel,
  status = 'NORMAL',
  updatedAt,
  infoTooltip,
  icon: Icon,
}) => {
  const formattedVal =
    typeof value === 'number' ? formatAbntNumber(value, decimals) : sanitizeDisplay(value)
  const isPositive = typeof variationPct === 'number' && variationPct >= 0

  return (
    <Card className="bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-4 flex flex-col justify-between">
      {/* Topo do Card: Título + Tooltip/Ícone + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-4 h-4 text-[#004C97]" />}
          <span className="text-xs font-bold text-slate-700 tracking-tight uppercase">{title}</span>
          {infoTooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white text-xs max-w-xs">
                  {infoTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CiafalStatus status={status} size="sm" />
      </div>

      {/* Meio: Valor de Destaque com Unidade Clara */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {formattedVal}
        </span>
        {unit && <span className="text-xs font-bold text-slate-500 font-mono">{unit}</span>}
      </div>

      {/* Base: Meta + Variação + Atualização */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {target !== undefined && (
            <span>
              {targetLabel}{' '}
              <strong className="text-slate-800">
                {typeof target === 'number' ? formatAbntNumber(target, decimals) : target} {unit}
              </strong>
            </span>
          )}

          {variationPct !== undefined && (
            <span
              className={`flex items-center font-bold font-mono ${
                isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {isPositive ? '+' : ''}
              {formatAbntNumber(variationPct, 1)} %{variationLabel && ` (${variationLabel})`}
            </span>
          )}
        </div>

        {updatedAt && (
          <span className="font-mono text-[10px] text-slate-400">
            {formatUpdateTimestamp(updatedAt).label}
          </span>
        )}
      </div>
    </Card>
  )
}

/* =========================================================================================
 * 4. CIAFAL AI INSIGHT (ESTRUTURAÇÃO OBRIGATÓRIA: FATO / HIPÓTESE / CONCLUSÃO / RECOMENDAÇÃO)
 * ========================================================================================= */

export interface CiafalAIInsightProps {
  title: string
  agentName?: string
  confidenceScore?: number // Ex: 94
  fact?: string
  hypothesis?: string
  conclusion?: string
  recommendation: string
  actionLabel?: string
  onExecuteAction?: () => void
  sources?: string[]
  updatedAt?: string | Date
}

export const CiafalAIInsight: React.FC<CiafalAIInsightProps> = ({
  title,
  agentName = 'Agente Especialista Skip Cloud',
  confidenceScore = 92,
  fact,
  hypothesis,
  conclusion,
  recommendation,
  actionLabel,
  onExecuteAction,
  sources = ['SAP ECC', 'MES', 'PCP'],
  updatedAt = new Date(),
}) => {
  return (
    <Card className="bg-white border-blue-200 shadow-2xs overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-3.5 border-b border-blue-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {title}
            </CardTitle>
            <span className="text-[10px] text-slate-500 font-mono">
              {agentName} &bull; Modelo auditável
            </span>
          </div>
        </div>

        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Confiança: {confidenceScore} %
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5 text-xs">
        {/* Fato Comprovado */}
        {fact && (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 1. Fato Comprovado pelos Dados
            </span>
            <p className="text-slate-800 leading-snug">{fact}</p>
          </div>
        )}

        {/* Hipótese em Análise */}
        {hypothesis && (
          <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/80 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-amber-600" /> 2. Hipótese Técnica (Não é Fato)
            </span>
            <p className="text-slate-800 leading-snug">{hypothesis}</p>
          </div>
        )}

        {/* Conclusão Diagnóstica */}
        {conclusion && (
          <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-200/80 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#004C97]" /> 3. Conclusão Diagnóstica
            </span>
            <p className="text-slate-800 leading-snug">{conclusion}</p>
          </div>
        )}

        {/* Recomendação Proativa com Ação Humana */}
        <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#004C97]" /> 4. Recomendação da IA (Decisão
            Assistida)
          </span>
          <p className="text-slate-900 font-medium leading-relaxed">{recommendation}</p>

          {actionLabel && onExecuteAction && (
            <div className="pt-1 flex justify-end">
              <Button
                size="sm"
                onClick={onExecuteAction}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-7 px-3 gap-1.5 shadow-2xs"
              >
                {actionLabel}
              </Button>
            </div>
          )}
        </div>

        {/* Rodapé de Auditoria e Fontes */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span>Fontes:</span>
            {sources.map((s, idx) => (
              <span
                key={idx}
                className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
              >
                {s}
              </span>
            ))}
          </div>
          <span>Análise gerada em: {formatAbntDate(updatedAt, true)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* =========================================================================================
 * 5. CIAFAL EMPTY STATE & ERROR STATE AMIGÁVEIS
 * ========================================================================================= */

export interface CiafalEmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ComponentType<{ className?: string }>
}

export const CiafalEmptyState: React.FC<CiafalEmptyStateProps> = ({
  title = 'Nenhum registro encontrado',
  description = 'Não foram localizados dados com os filtros atuais ou não há apontamentos pendentes.',
  actionLabel,
  onAction,
  icon: Icon = Layers,
}) => {
  return (
    <div className="p-8 sm:p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl space-y-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAction}
          className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export interface CiafalErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  technicalDetails?: string
}

export const CiafalErrorState: React.FC<CiafalErrorStateProps> = ({
  title = 'Não foi possível carregar os dados neste momento',
  message = 'Houve uma instabilidade temporária na comunicação com os serviços integrados. Os dados em cache continuam seguros.',
  onRetry,
  technicalDetails,
}) => {
  const [showTech, setShowTech] = React.useState(false)

  return (
    <div className="p-6 sm:p-8 bg-rose-50/50 border border-rose-200 rounded-xl space-y-4 text-center max-w-2xl mx-auto my-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-rose-950">{title}</h3>
        <p className="text-xs text-rose-800 leading-relaxed max-w-md mx-auto">{message}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </Button>
        )}
        {technicalDetails && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTech(!showTech)}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            {showTech ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
          </Button>
        )}
      </div>

      {showTech && technicalDetails && (
        <div className="p-3 bg-white border border-rose-200 rounded-lg text-left text-[11px] font-mono text-slate-700 max-h-36 overflow-y-auto">
          {technicalDetails}
        </div>
      )}
    </div>
  )
}
