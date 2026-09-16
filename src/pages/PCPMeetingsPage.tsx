import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  LayoutDashboard,
  Sparkles,
  Clock,
  Activity,
  FileText,
  History,
  Sliders,
  Plus,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VisaoGeralView } from '@/components/meetings/VisaoGeralView'
import { PreparacaoReuniaoView } from '@/components/meetings/PreparacaoReuniaoView'
import { AgendaReunioesView } from '@/components/meetings/AgendaReunioesView'
import { PendenciasReuniaoView } from '@/components/meetings/PendenciasReuniaoView'
import { ConfiguracoesReuniaoView } from '@/components/meetings/ConfiguracoesReuniaoView'
import { CreatePcpMeetingModal } from '@/components/meetings/CreatePcpMeetingModal'
import { PCPMeetingRecord } from '@/types/pcp-meeting'

export const PCPMeetingsPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Mapear rota ativa para o subtópico oficial
  const getTabFromPath = () => {
    const path = location.pathname
    if (path.includes('/preparacao')) return 'preparacao'
    if (path.includes('/agenda')) return 'agenda'
    if (path.includes('/andamento')) return 'andamento'
    if (path.includes('/atas')) return 'atas'
    if (path.includes('/pendencias')) return 'pendencias'
    if (path.includes('/historico')) return 'historico'
    if (path.includes('/configuracoes')) return 'configuracoes'
    return 'visao-geral'
  }

  const [activeTab, setActiveTab] = useState<string>(getTabFromPath())
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    setActiveTab(getTabFromPath())
  }, [location.pathname])

  const handleTabChange = (val: string, meetingId?: string) => {
    setActiveTab(val)
    if (meetingId) setSelectedMeetingId(meetingId)
    navigate(`/pcp/reunioes/${val}`)
  }

  const handleMeetingCreated = (meeting: PCPMeetingRecord) => {
    setSelectedMeetingId(meeting.id)
    handleTabChange('preparacao', meeting.id)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial do Módulo REUNIÃO PCP (Sem sticky/fixed interno) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#004C97] uppercase">
                Módulo Oficial CIAFAL &bull; PCP Robotizado
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-[#004C97]" />
              REUNIÃO PCP
            </h1>
            <p className="text-xs text-slate-500">
              Gestão de ponta a ponta da reunião semanal de PCP: organização via IA executiva,
              minuta SGQ 8.1.001-R002, trava de governança para agendamento e rastreabilidade 5W2H.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-9 px-4 gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> + NOVA REUNIÃO PCP
            </Button>
          </div>
        </div>

        {/* 8 Subtópicos Oficiais da Reunião PCP */}
        <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val)}>
            <TabsList className="bg-slate-100/80 p-1 h-auto flex flex-nowrap min-w-max gap-1">
              <TabsTrigger
                value="visao-geral"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="preparacao"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <Sparkles className="w-3.5 h-3.5" /> Preparação da Reunião
              </TabsTrigger>
              <TabsTrigger
                value="agenda"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <CalendarDays className="w-3.5 h-3.5" /> Agenda de Reuniões
              </TabsTrigger>
              <TabsTrigger
                value="andamento"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <Activity className="w-3.5 h-3.5" /> Reunião em Andamento
              </TabsTrigger>
              <TabsTrigger
                value="atas"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <FileText className="w-3.5 h-3.5" /> ATAs
              </TabsTrigger>
              <TabsTrigger
                value="pendencias"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <Clock className="w-3.5 h-3.5" /> Pendências e Ações
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <History className="w-3.5 h-3.5" /> Histórico
              </TabsTrigger>
              <TabsTrigger
                value="configuracoes"
                className="text-xs font-bold data-[state=active]:bg-[#004C97] data-[state=active]:text-white gap-1.5 py-1.5 px-3"
              >
                <Sliders className="w-3.5 h-3.5" /> Configurações
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Conteúdo Dinâmico por Subtópico */}
      <div className="min-h-[500px]">
        {activeTab === 'visao-geral' && (
          <VisaoGeralView
            onNavigateTab={handleTabChange}
            onOpenNewMeetingModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'preparacao' && (
          <PreparacaoReuniaoView meetingId={selectedMeetingId} onMeetingUpdated={() => {}} />
        )}

        {activeTab === 'agenda' && (
          <AgendaReunioesView
            onNavigateTab={handleTabChange}
            onOpenNewMeetingModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeTab === 'pendencias' && <PendenciasReuniaoView />}

        {activeTab === 'configuracoes' && <ConfiguracoesReuniaoView />}

        {/* Subtópicos Planejados para a Próxima Fatia (Honestos, sem botões falsos) */}
        {activeTab === 'andamento' && (
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-12 text-center space-y-3">
              <Activity className="w-12 h-12 text-[#004C97] mx-auto opacity-60" />
              <h3 className="text-base font-black text-slate-900">
                Reunião em Andamento (Sala ao Vivo & Gravação)
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Disponível na <strong>FATIA 2</strong> da Reunião PCP: Painel de condução ao vivo,
                presença em tempo real, cronômetro de pauta, gravação/transcrição de áudio e
                registro dinâmico de deliberações.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('preparacao')}
                  className="text-xs font-semibold"
                >
                  &larr; Voltar para a Preparação da Reunião
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'atas' && (
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-[#004C97] mx-auto opacity-60" />
              <h3 className="text-base font-black text-slate-900">
                Central de ATAs Oficiais (Publicação & Assinaturas)
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Disponível na <strong>FATIA 2</strong> da Reunião PCP: Fluxo de aprovação formal,
                revisão de minutas, assinatura eletrônica e publicação da ATA oficial (8.1.001-R002)
                no repositório SGQ.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('preparacao')}
                  className="text-xs font-semibold"
                >
                  Ver Minuta na Preparação da Reunião &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'historico' && (
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-12 text-center space-y-3">
              <History className="w-12 h-12 text-[#004C97] mx-auto opacity-60" />
              <h3 className="text-base font-black text-slate-900">
                Histórico & Inteligência de Decisões PCP
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Disponível na <strong>FATIA 2</strong> da Reunião PCP: Consulta histórica com IA,
                rastreamento temporal de deliberações passadas e indicadores comparativos de
                resolução de pendências por área fabril.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange('agenda')}
                  className="text-xs font-semibold"
                >
                  Consultar Reuniões na Agenda &rarr;
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Criação de Reunião */}
      <CreatePcpMeetingModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleMeetingCreated}
      />
    </div>
  )
}
export default PCPMeetingsPage
