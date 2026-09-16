import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Send,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  Video,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { OverviewMetrics, PCPMeetingRecord } from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'

interface VisaoGeralViewProps {
  onNavigateTab: (tab: string, meetingId?: string) => void
  onOpenNewMeetingModal: () => void
}

export const VisaoGeralView: React.FC<VisaoGeralViewProps> = ({
  onNavigateTab,
  onOpenNewMeetingModal,
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await pcpMeetingFatia1Service.getOverviewMetrics()
      setMetrics(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar indicadores reais',
        description: err.message || 'Falha na conexão com a base de dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const nextMeeting = metrics?.proximaReuniao

  return (
    <div className="space-y-6">
      {/* Barra Superior Executiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#004C97] text-white hover:bg-[#003870] text-xs font-mono">
              SEMANA {metrics?.semanaPCP || '--'} / {metrics?.anoPCP || '--'}
            </Badge>
            <span className="text-xs text-slate-500 font-mono">
              Painel Integrado de Governança Semanal PCP
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1">
            Visão Geral das Reuniões & Deliberações PCP
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-semibold h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button
            size="sm"
            onClick={onOpenNewMeetingModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 px-4 gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + NOVA REUNIÃO PCP
          </Button>
        </div>
      </div>

      {/* Grid de Cards de Indicadores REAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Próxima Reunião */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Próxima Reunião
            </span>
            <CalendarDays className="w-4 h-4 text-[#004C97]" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-sm font-extrabold text-slate-900 truncate">
              {nextMeeting ? nextMeeting.meeting_code : 'Nenhuma'}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {nextMeeting
                ? `${nextMeeting.meeting_date} às ${nextMeeting.start_time}`
                : 'Aguardando agendamento'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Status da Preparação */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Status Preparação
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xs font-bold text-slate-800 truncate">
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  nextMeeting?.status === 'AGENDADA'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : nextMeeting?.status === 'PREVIA_ENVIADA'
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : nextMeeting?.status === 'CANCELADA'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {nextMeeting ? nextMeeting.status : 'SEM REUNIÃO'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {nextMeeting?.briefing_gerado ? 'Briefing IA gerado' : 'Briefing pendente'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Completude da ATA (%) */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Completude ATA
            </span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-black text-slate-900">
              {metrics?.completudeAtaPercent || 0}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-[#004C97] h-1.5 rounded-full transition-all"
                style={{ width: `${metrics?.completudeAtaPercent || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Prévia Enviada */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Prévia Enviada
            </span>
            <Send className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-sm font-black">
              {metrics?.previaEnviada ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SIM (Grupo PCP)
                </span>
              ) : (
                <span className="text-amber-700 font-bold">NÃO ENVIADA</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {metrics?.previaEnviada ? 'Bloqueio liberado' : 'Trava de agendamento ativa'}
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Participantes */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Participantes
            </span>
            <Users className="w-4 h-4 text-slate-700" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-black text-slate-900">
              {metrics?.confirmacoes || 0}
              <span className="text-xs text-slate-400 font-normal">
                {' '}
                / {metrics?.participantesConvocados || 0}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Confirmados convocados</p>
          </CardContent>
        </Card>

        {/* Card 6: Pendências Abertas / Vencidas */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Pendências
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
              <span>{metrics?.pendenciasAbertas || 0}</span>
              {metrics && metrics.pendenciasVencidas > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                  {metrics.pendenciasVencidas} VENCIDAS
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Ações anteriores abertas</p>
          </CardContent>
        </Card>
      </div>

      {/* Destaque da Reunião Selecionada / Próxima */}
      {nextMeeting ? (
        <Card className="border-[#004C97]/30 bg-gradient-to-r from-blue-50/40 via-white to-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#004C97] text-white font-mono text-xs">
                    {nextMeeting.meeting_code}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-600">
                    Semana {nextMeeting.week}/{nextMeeting.year} &bull; {nextMeeting.company}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    MODALIDADE: {nextMeeting.modality}
                  </Badge>
                </div>
                <h3 className="text-base font-black text-slate-900">{nextMeeting.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-mono">
                    <CalendarDays className="w-3.5 h-3.5 text-[#004C97]" />
                    {nextMeeting.meeting_date} ({nextMeeting.start_time} às{' '}
                    {nextMeeting.expected_end_time})
                  </span>
                  {nextMeeting.modality !== 'ONLINE' && nextMeeting.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {nextMeeting.location} {nextMeeting.room ? `(${nextMeeting.room})` : ''}
                    </span>
                  )}
                  {nextMeeting.modality !== 'PRESENCIAL' && nextMeeting.online_link && (
                    <span className="flex items-center gap-1 text-blue-700">
                      <Video className="w-3.5 h-3.5" />
                      Link configurado
                    </span>
                  )}
                  <span>
                    Condutor: <strong>{nextMeeting.conductor}</strong>
                  </span>
                  <span>
                    Organizador: <strong>{nextMeeting.organizer}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  onClick={() => onNavigateTab('preparacao', nextMeeting.id)}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-9"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Preparar com IA / Validar Prévia
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigateTab('agenda')}
                  className="text-xs font-semibold h-9"
                >
                  Ver na Agenda
                </Button>
              </div>
            </div>

            {/* Aviso da Regra Crítica de Agendamento */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#004C97]" />
                <span className="text-slate-600">
                  <strong>Regra de Governança SGQ:</strong> O agendamento só é confirmado após a
                  geração, validação e envio registrado da prévia da ATA ao Grupo PCP.
                </span>
              </div>
              <div>
                {nextMeeting.agendamento_confirmado ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    AGENDAMENTO CONFIRMADO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-700 border-rose-300 text-[10px]">
                    AGENDAMENTO PENDENTE DE PRÉVIA
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardContent className="p-8 text-center space-y-3">
            <CalendarDays className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              Nenhuma Reunião PCP cadastrada no sistema
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Inicie criando a reunião da semana. O sistema auto-detectará a semana ISO,
              parametrizará os participantes e permitirá organizar com os motores de IA.
            </p>
            <Button
              onClick={onOpenNewMeetingModal}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> + NOVA REUNIÃO PCP
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seção Informativa: Template Vigente SGQ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004C97]" /> Template de ATA SGQ Cadastrado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Código Oficial:</span>
              <span className="font-mono font-bold text-slate-800">8.1.001-R002</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Revisão SGQ:</span>
              <span className="font-mono font-bold text-slate-800">Revisão 8 (Vigente)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Seções Configuradas:</span>
              <span className="text-slate-800 font-medium">
                17 seções (PCP, Comercial, MP, Qualidade, SDC, Estoque, KS, L1, L2, Teste Prog...)
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Customização:</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => onNavigateTab('configuracoes')}
                className="text-xs text-[#004C97] p-0 h-auto font-semibold"
              >
                Gerenciar em Configurações &rarr;
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Itens Críticos para Discussão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-slate-600">O motor de preparação IA consolida automaticamente:</p>
            <ul className="space-y-1 list-disc list-inside text-slate-700 font-medium">
              <li>Pendências vencidas de reuniões anteriores sem evidência registrada</li>
              <li>Testes com parada total cadastrados em Programação de Testes</li>
              <li>Itens de carteira com ruptura identificada pelo motor de cobertura temporal</li>
              <li>Desvios e ordens sem montagem semanal consolidada</li>
            </ul>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('pendencias')}
                className="text-xs font-semibold h-7 text-slate-700"
              >
                Ver Painel de Pendências ({metrics?.pendenciasAbertas || 0} abertas)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default VisaoGeralView
