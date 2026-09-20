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
import { ReuniaoEmAndamentoView } from '@/components/meetings/ReuniaoEmAndamentoView'
import { CentralAtasFatia2View } from '@/components/meetings/CentralAtasFatia2View'
import { HistoricoReunioesView } from '@/components/meetings/HistoricoReunioesView'
import { CiafalPageHeader } from '@/components/common/CiafalDesignSystem'
import { CreatePcpMeetingModal } from '@/components/meetings/CreatePcpMeetingModal'
import { PCPMeetingRecord } from '@/types/pcp-meeting'
import { useAuth } from '@/contexts/AuthContext'

export const PCPMeetingsPage: React.FC = () => {
  const { user } = useAuth()
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
      {/* Cabeçalho Oficial do Módulo REUNIÃO PCP */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Reunião PCP"
        subtitle="Gestão ponta a ponta da reunião semanal de PCP: organização via IA executiva e minuta SGQ."
        compactInfo="SGQ 8.1.001-R002 | Rastreabilidade 5W2H"
        infoTooltip="Gestão de ponta a ponta da reunião semanal de PCP: organização via IA executiva, minuta SGQ 8.1.001-R002, trava de governança para agendamento e rastreabilidade 5W2H."
        breadcrumbs={[{ label: 'PCP' }, { label: 'Reunião PCP' }]}
        badge="SGQ 8.1.001-R002"
        actions={
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 px-4 gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Reunião PCP</span>
          </Button>
        }
      />

      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        {/* 8 Subtópicos Oficiais da Reunião PCP */}
        <div className="overflow-x-auto">
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

        {/* Subtópicos Operacionais da Fatia 2 */}
        {activeTab === 'andamento' &&
          (selectedMeetingId ? (
            <ReuniaoEmAndamentoView
              meetingId={selectedMeetingId}
              onNavigateTab={handleTabChange}
              currentUser={{ id: user?.id, name: user?.name || 'Coordenação PCP' }}
            />
          ) : (
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="p-12 text-center space-y-3">
                <Activity className="w-12 h-12 text-[#004C97] mx-auto opacity-60" />
                <h3 className="text-base font-black text-slate-900">Nenhuma Reunião Selecionada</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Para conduzir a Reunião em Andamento, selecione uma reunião com status{' '}
                  <strong>AGENDADA</strong> na Agenda de Reuniões e clique em{' '}
                  <strong>"Iniciar Reunião"</strong>.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleTabChange('agenda')}
                    className="bg-[#004C97] text-white text-xs font-bold"
                  >
                    Ver Agenda de Reuniões &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

        {activeTab === 'atas' && (
          <CentralAtasFatia2View
            initialMeetingId={selectedMeetingId}
            currentUser={{ id: user?.id, name: user?.name || 'Coordenação PCP' }}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === 'historico' && (
          <HistoricoReunioesView
            onNavigateTab={handleTabChange}
            currentUser={{ id: user?.id, name: user?.name || 'Coordenação PCP' }}
          />
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
