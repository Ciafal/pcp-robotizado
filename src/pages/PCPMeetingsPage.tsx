import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Sparkles,
  FileText,
  Clock,
  History,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import NextMeetingView from '@/components/meetings/NextMeetingView'
import MeetingMinutesView from '@/components/meetings/MeetingMinutesView'
import MeetingPendenciesView from '@/components/meetings/MeetingPendenciesView'
import MeetingAiAnalyticsView from '@/components/meetings/MeetingAiAnalyticsView'
import CreateMeetingModal from '@/components/meetings/CreateMeetingModal'

export const PCPMeetingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'proxima'
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Corporativo CIAFAL */}
      <div className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>PCP ROBOTIZADO</span>
            <span>&bull;</span>
            <span className="text-[#004C97] font-semibold">CONTROLE DE REUNIÕES PCP</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Gestão Semanal de Reuniões & Atas Digitais
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4 gap-1.5 shadow-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Agendar Reunião PCP
          </Button>
        </div>
      </div>

      {/* Tabs de Navegação da Seção de Reuniões */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger
            value="proxima"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Próxima Reunião
          </TabsTrigger>
          <TabsTrigger
            value="atas"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Atas Digitais
          </TabsTrigger>
          <TabsTrigger
            value="pendencias"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" /> Pendências ({' '}
            <span className="text-amber-600 font-bold">Painel</span>)
          </TabsTrigger>
          <TabsTrigger
            value="ia_analise"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Análise IA das Reuniões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proxima" className="outline-none">
          <NextMeetingView />
        </TabsContent>

        <TabsContent value="atas" className="outline-none">
          <MeetingMinutesView />
        </TabsContent>

        <TabsContent value="pendencias" className="outline-none">
          <MeetingPendenciesView />
        </TabsContent>

        <TabsContent value="ia_analise" className="outline-none">
          <MeetingAiAnalyticsView />
        </TabsContent>
      </Tabs>

      <CreateMeetingModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          handleTabChange('proxima')
        }}
      />
    </div>
  )
}
export default PCPMeetingsPage
