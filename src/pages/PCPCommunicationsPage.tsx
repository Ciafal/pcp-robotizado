import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Eye,
  CalendarDays,
  Sparkles,
  Inbox,
  Layers,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PCPCommunication, CommunicationType, CriticalityLevel } from '@/types/pcp-meetings-comms'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import CreateCommunicationModal from '@/components/communications/CreateCommunicationModal'
import CommDetailModal from '@/components/communications/CommDetailModal'
import { useToast } from '@/hooks/use-toast'

export const PCPCommunicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'vigentes'
  const { toast } = useToast()

  const [communications, setCommunications] = useState<PCPCommunication[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL')
  const [lineFilter, setLineFilter] = useState<string>('ALL')

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedComm, setSelectedComm] = useState<PCPCommunication | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadCommunications = async () => {
    setLoading(true)
    try {
      const list = await pcpCommunicationService.listCommunications({
        commType: typeFilter !== 'ALL' ? typeFilter : undefined,
        criticality: criticalityFilter !== 'ALL' ? criticalityFilter : undefined,
        lineCode: lineFilter !== 'ALL' ? lineFilter : undefined,
      })
      setCommunications(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCommunications()
  }, [typeFilter, criticalityFilter, lineFilter])

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  const handleOpenDetail = (c: PCPCommunication) => {
    setSelectedComm(c)
    setDetailModalOpen(true)
  }

  const handleQuickAcknowledge = async (e: React.MouseEvent, comm: PCPCommunication) => {
    e.stopPropagation()
    try {
      await pcpCommunicationService.acknowledgeCommunication(comm.id)
      toast({
        title: 'Ciência Formal Registrada',
        description: `Confirmação de leitura gravada para o comunicado ${comm.code}.`,
      })
      loadCommunications()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar ciência',
        description: err.message,
      })
    }
  }

  // Segmentação por Tab
  const vigentes = communications.filter((c) => c.status === 'VIGENTE')
  const programados = communications.filter((c) => c.status === 'PROGRAMADO')
  const encerrados = communications.filter(
    (c) => c.status === 'ENCERRADO' || c.status === 'CANCELADO',
  )
  const rascunhos = communications.filter((c) => c.status === 'RASCUNHO')

  const getFilteredList = (list: PCPCommunication[]) => {
    return list.filter((c) => {
      const matches =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
      return matches
    })
  }

  // Métricas
  const totalVigentes = vigentes.length
  const totalCriticos = communications.filter(
    (c) => c.criticality === 'CRITICA' || c.criticality === 'BLOQUEANTE',
  ).length
  const totalComCiencia = communications.filter((c) => c.requires_acknowledgement).length

  return (
    <div className="space-y-6 pb-12">
      {/* Header CIAFAL */}
      <div className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>PCP ROBOTIZADO</span>
            <span>&bull;</span>
            <span className="text-[#004C97] font-semibold">CENTRAL DE COMUNICADOS PCP</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Comunicação Formal, Governança & Controle de Leitura
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4 gap-1.5 shadow-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Comunicado PCP
          </Button>
        </div>
      </div>

      {/* Métricas do Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-blue-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Comunicados Vigentes
              </span>
              <div className="text-xl font-bold font-mono text-[#004C97] mt-0.5">
                {totalVigentes}
              </div>
            </div>
            <Megaphone className="w-6 h-6 text-blue-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-rose-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Críticos / Bloqueantes
              </span>
              <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">
                {totalCriticos}
              </div>
            </div>
            <ShieldAlert className="w-6 h-6 text-rose-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Exigem Ciência Formal
              </span>
              <div className="text-xl font-bold font-mono text-amber-600 mt-0.5">
                {totalComCiencia}
              </div>
            </div>
            <FileCheck className="w-6 h-6 text-amber-500/30" />
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Total Registrado
              </span>
              <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                {communications.length}
              </div>
            </div>
            <Inbox className="w-6 h-6 text-slate-400/30" />
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Pesquisar por título, código, texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs border-slate-300"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="OPERACIONAL">Operacional</option>
              <option value="QUALIDADE">Qualidade</option>
              <option value="MATERIA_PRIMA">Matéria-Prima</option>
              <option value="ESTOQUE">Estoque</option>
              <option value="ALTERACAO_PROGRAMACAO">Alteração Programação</option>
              <option value="BLOQUEANTE">Bloqueante</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Criticidade:</span>
            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
            >
              <option value="ALL">Todas</option>
              <option value="NORMAL">Normal</option>
              <option value="ATENCAO">Atenção</option>
              <option value="URGENTE">Urgente</option>
              <option value="CRITICA">Crítica</option>
              <option value="BLOQUEANTE">Bloqueante</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Linha:</span>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
            >
              <option value="ALL">Todas as Linhas</option>
              <option value="L01">L01</option>
              <option value="L02">L02</option>
              <option value="L03">L03</option>
              <option value="L04">L04</option>
              <option value="ENDL1">ENDL1</option>
              <option value="ACABL1">ACABL1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Principais da Central de Comunicados */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger
            value="vigentes"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <Megaphone className="w-3.5 h-3.5" /> Comunicados Vigentes ({vigentes.length})
          </TabsTrigger>
          <TabsTrigger
            value="programados"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Programados ({programados.length})
          </TabsTrigger>
          <TabsTrigger
            value="encerrados"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" /> Encerrados ({encerrados.length})
          </TabsTrigger>
          <TabsTrigger
            value="todos"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold gap-1.5"
          >
            <Inbox className="w-3.5 h-3.5" /> Todos / Caixa Geral ({communications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vigentes" className="outline-none">
          {renderList(getFilteredList(vigentes))}
        </TabsContent>

        <TabsContent value="programados" className="outline-none">
          {renderList(getFilteredList(programados))}
        </TabsContent>

        <TabsContent value="encerrados" className="outline-none">
          {renderList(getFilteredList(encerrados))}
        </TabsContent>

        <TabsContent value="todos" className="outline-none">
          {renderList(getFilteredList(communications))}
        </TabsContent>
      </Tabs>

      {/* Modal de Criação e Detalhe */}
      <CreateCommunicationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          loadCommunications()
          handleTabChange('vigentes')
        }}
      />

      <CommDetailModal
        communication={selectedComm}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onAcknowledgeSuccess={() => loadCommunications()}
        onUnblockSuccess={() => loadCommunications()}
      />
    </div>
  )

  function renderList(list: PCPCommunication[]) {
    if (loading) {
      return (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Carregando comunicados...</span>
        </div>
      )
    }

    if (list.length === 0) {
      return (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-2">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Nenhum comunicado nesta categoria</h3>
          <p className="text-xs text-slate-500">
            Crie novos comunicados para formalizar orientações operacionais.
          </p>
        </Card>
      )
    }

    return (
      <div className="space-y-3">
        {list.map((c) => {
          const isAcked = c.user_read_state?.is_acknowledged
          const isBlocking = c.criticality === 'BLOQUEANTE' || c.is_blocking
          return (
            <Card
              key={c.id}
              onClick={() => handleOpenDetail(c)}
              className={`bg-white border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer ${
                isBlocking
                  ? 'border-l-4 border-l-purple-700 bg-purple-50/20'
                  : c.criticality === 'CRITICA'
                    ? 'border-l-4 border-l-rose-600 bg-rose-50/20'
                    : c.criticality === 'ATENCAO'
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-[#004C97]'
              }`}
            >
              <CardContent className="p-4 space-y-2.5 text-xs">
                {/* Header do Card */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                        {c.code}
                      </Badge>
                      <Badge
                        className={`text-[10px] font-bold ${
                          isBlocking
                            ? 'bg-purple-900 text-white'
                            : c.criticality === 'CRITICA'
                              ? 'bg-rose-600 text-white'
                              : c.criticality === 'ATENCAO'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-700 text-white'
                        }`}
                      >
                        {c.criticality}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-slate-300">
                        {c.comm_type}
                      </Badge>
                      {c.requires_acknowledgement && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold">
                          Exige Ciência
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-mono block">Vigência</span>
                    <span className="text-xs font-mono font-semibold text-slate-700">
                      {c.valid_from} {c.valid_until && `➔ ${c.valid_until}`}
                    </span>
                  </div>
                </div>

                {/* Resumo */}
                <p className="text-slate-700 leading-relaxed text-xs pl-0.5 line-clamp-2">
                  {c.summary || c.content}
                </p>

                {/* Linhas, Responsável e Ações */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      Linhas:{' '}
                      <strong className="text-[#004C97] font-mono">
                        {c.target_line_codes?.join(', ') || 'Geral'}
                      </strong>
                    </span>
                    {c.product_code && (
                      <span>
                        Produto: <strong>{c.product_code}</strong>
                      </span>
                    )}
                    <span>
                      Emitido por: <strong>{c.author_name || 'PCP'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.requires_acknowledgement && !isAcked && (
                      <Button
                        size="sm"
                        onClick={(e) => handleQuickAcknowledge(e, c)}
                        className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> LI E ESTOU CIENTE
                      </Button>
                    )}
                    {isAcked && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                        ✓ Ciente
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(c)}
                      className="h-6 text-[10px] border-slate-300 bg-white hover:bg-slate-50 gap-1 text-slate-700"
                    >
                      <Eye className="w-3 h-3" /> Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }
}
export default PCPCommunicationsPage
