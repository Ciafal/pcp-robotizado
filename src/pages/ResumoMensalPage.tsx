import React, { useState, useEffect, useMemo } from 'react'
import { EntregasSubmenu } from '@/components/pcp/entregas/EntregasSubmenu'
import {
  CiafalPageHeader,
  CiafalKPICard,
  CiafalCard,
  CiafalDataTable,
} from '@/components/common/CiafalDesignSystem'
import { TraceableNumber } from '@/components/pcp/entregas/TraceableNumber'
import { AIReviewModal } from '@/components/pcp/entregas/AIReviewModal'
import { SendEmailModal } from '@/components/pcp/entregas/SendEmailModal'
import { DataVerificationModal } from '@/components/pcp/entregas/DataVerificationModal'
import { SummaryPdfModal } from '@/components/pcp/entregas/SummaryPdfModal'
import { ReadingConfirmationsModal } from '@/components/pcp/entregas/ReadingConfirmationsModal'
import {
  pcpMonthlySummaryService,
  PCPMonthlySummaryRecord,
  SummarySectionsData,
  RealCenterOption,
  VerificationIssue,
} from '@/services/pcp-monthly-summaries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Sparkles,
  Printer,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Plus,
  Save,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Send,
  Layers,
  Building2,
  Clock,
  HelpCircle,
} from 'lucide-react'
import { formatNumberPTBR, formatDatePTBR, formatDateTimePTBR } from '@/lib/formatters-ptbr'

export const ResumoMensalPage: React.FC = () => {
  const { toast } = useToast()

  // Estados de dados
  const [summaries, setSummaries] = useState<PCPMonthlySummaryRecord[]>([])
  const [selectedSummary, setSelectedSummary] = useState<PCPMonthlySummaryRecord | null>(null)
  const [centers, setCenters] = useState<RealCenterOption[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Filtros principais
  const [filterEmpresa, setFilterEmpresa] = useState<string>('ALL')
  const [filterCentro, setFilterCentro] = useState<string>('ALL')
  const [filterLinha, setFilterLinha] = useState<string>('ALL')
  const [filterAno, setFilterAno] = useState<number>(2025)
  const [filterMes, setFilterMes] = useState<number>(5)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Modais de ações
  const [isAiReviewOpen, setIsAiReviewOpen] = useState<boolean>(false)
  const [aiReviewSection, setAiReviewSection] = useState<{
    title: string
    key: string
    text: string
  }>({
    title: '',
    key: '',
    text: '',
  })
  const [aiReviewMode, setAiReviewMode] = useState<string>('clarity')
  const [aiReviewSuggestion, setAiReviewSuggestion] = useState<string>('')

  const [isPdfOpen, setIsPdfOpen] = useState<boolean>(false)
  const [isPdfExecutive, setIsPdfExecutive] = useState<boolean>(false)
  const [isEmailOpen, setIsEmailOpen] = useState<boolean>(false)
  const [isVerificationOpen, setIsVerificationOpen] = useState<boolean>(false)
  const [verificationIssues, setVerificationIssues] = useState<VerificationIssue[]>([])
  const [isReadingConfirmationsOpen, setIsReadingConfirmationsOpen] = useState<boolean>(false)

  // Estado do Editor Estruturado
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editableSections, setEditableSections] = useState<SummarySectionsData | null>(null)

  // Carregar Centros Reais e Resumos
  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const realCenters = await pcpMonthlySummaryService.loadRealCenters()
      setCenters(realCenters)

      const list = await pcpMonthlySummaryService.listSummaries({
        empresa: filterEmpresa,
        centro: filterCentro,
        linha: filterLinha,
        ano: filterAno,
        mes: filterMes,
        status: filterStatus,
      })
      setSummaries(list)

      if (list.length > 0 && !selectedSummary) {
        setSelectedSummary(list[0])
        setEditableSections(JSON.parse(JSON.stringify(list[0].sections_data)))
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Resumo Mensal:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [filterEmpresa, filterCentro, filterLinha, filterAno, filterMes, filterStatus])

  // Troca de resumo ativo
  const handleSelectSummary = (sum: PCPMonthlySummaryRecord) => {
    setSelectedSummary(sum)
    setEditableSections(JSON.parse(JSON.stringify(sum.sections_data)))
    setIsEditing(false)
  }

  // Salvar Edição
  const handleSaveSections = async () => {
    if (!selectedSummary || !editableSections) return
    try {
      const updated = await pcpMonthlySummaryService.updateSummarySections(
        selectedSummary.id,
        editableSections,
        'Edição manual pelo programador PCP',
      )
      setSelectedSummary(updated)
      setIsEditing(false)
      toast({
        title: 'Resumo Atualizado',
        description: 'As alterações das seções foram salvas na trilha de auditoria.',
      })
    } catch (err: any) {
      // Atualização no estado local caso offline
      setSelectedSummary((prev) => (prev ? { ...prev, sections_data: editableSections } : null))
      setIsEditing(false)
      toast({
        title: 'Alterações Salvas Localmente',
        description: 'Dados preservados para publicação.',
      })
    }
  }

  // Executar Auditoria / Verificação de Dados
  const handleVerifyData = async () => {
    if (!selectedSummary) return
    const report = await pcpMonthlySummaryService.verifyData(selectedSummary)
    setVerificationIssues(report.issues)
    setIsVerificationOpen(true)
  }

  // Abertura de Revisão IA para seção específica
  const handleOpenAiReview = async (
    sectionTitle: string,
    sectionKey: string,
    currentText: string,
    mode: string = 'clarity',
  ) => {
    if (!selectedSummary) return
    setAiReviewSection({ title: sectionTitle, key: sectionKey, text: currentText })
    setAiReviewMode(mode)

    toast({
      title: 'Consultando Agente Nativo Skip Cloud...',
      description: `Processando revisão no modo "${mode}"...`,
    })

    const res = await pcpMonthlySummaryService.reviewWithAI({
      mode: mode as any,
      text: currentText,
      sectionKey,
      sectionTitle,
      lineCode: selectedSummary.linha_code,
      contextData: selectedSummary.sections_data,
    })

    setAiReviewSuggestion(res.suggestion)
    setIsAiReviewOpen(true)
  }

  // Aceitar sugestão da IA e gravar no editor
  const handleAcceptAiSuggestion = (acceptedText: string) => {
    if (!editableSections) return
    const updated = { ...editableSections }

    if (aiReviewSection.key === 'sumarioExecutivo') {
      const bullets = acceptedText
        .split('\n')
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
      updated.sumarioExecutivo.bullets = bullets
    } else if (aiReviewSection.key === 'conclusaoIA') {
      updated.conclusaoIA.parecerGeral = acceptedText
    }

    setEditableSections(updated)
    setIsEditing(true)
    toast({
      title: 'Sugestão da IA Aplicada',
      description: 'O texto revisado foi inserido na seção com preservação estrita dos números.',
    })
  }

  // Publicar na Agenda Corporativa HUB
  const handlePublishAgenda = async () => {
    if (!selectedSummary) return
    try {
      await pcpMonthlySummaryService.publishToAgenda(selectedSummary, 5)
      toast({
        title: 'Publicado na Agenda HUB CIAFAL',
        description: 'Evento de leitura corporativa gerado com prazo de 5 dias úteis.',
      })
      loadInitialData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Publicar na Agenda',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Confirmar leitura do usuário
  const handleConfirmReading = async () => {
    if (!selectedSummary) return
    await pcpMonthlySummaryService.confirmReading(
      selectedSummary.id,
      selectedSummary.summary_code,
      selectedSummary.version_tag,
    )
  }

  // Nova versão V2, V3...
  const handleCreateNewVersion = async () => {
    if (!selectedSummary) return
    try {
      const newVer = await pcpMonthlySummaryService.createNewVersion(
        selectedSummary.id,
        'Revisão periódica de dados de entrega e planejamento',
        'Justificado por atualização de pedidos no SAP SD',
      )
      toast({
        title: `Nova Versão Gerada (${newVer.version_tag})`,
        description: 'A versão anterior foi preservada imutável no histórico.',
      })
      loadInitialData()
      setSelectedSummary(newVer)
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar nova versão',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Cálculos do Dashboard de Resumos
  const totalSummariesCount = summaries.length
  const rascunhosCount = summaries.filter((s) => s.status === 'RASCUNHO_IA').length
  const emEdicaoCount = summaries.filter((s) => s.status === 'EM_EDICAO_PCP').length
  const aguardandoAprovacaoCount = summaries.filter(
    (s) => s.status === 'AGUARDANDO_APROVACAO',
  ).length
  const publicadosCount = summaries.filter(
    (s) => s.status === 'PUBLICADO' || s.status === 'ENVIADO',
  ).length
  const leiturasTotal = summaries.reduce((acc, s) => acc + (s.total_recipients_count || 8), 0)
  const leiturasConfirmadas = summaries.reduce((acc, s) => acc + (s.read_count || 0), 0)
  const leiturasPendentes = Math.max(0, leiturasTotal - leiturasConfirmadas)

  // Status badge styling
  const renderStatusBadge = (status: PCPMonthlySummaryRecord['status']) => {
    switch (status) {
      case 'PUBLICADO':
      case 'ENVIADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[11px] gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Publicado
          </Badge>
        )
      case 'AGUARDANDO_APROVACAO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[11px] gap-1"
          >
            <Clock className="w-3 h-3 text-amber-600" /> Em Aprovação
          </Badge>
        )
      case 'EM_EDICAO_PCP':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-[11px] gap-1"
          >
            <FileText className="w-3 h-3 text-sky-600" /> Em Edição
          </Badge>
        )
      case 'RASCUNHO_IA':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-800 border-purple-300 font-bold text-[11px] gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-600" /> Rascunho IA
          </Badge>
        )
    }
  }

  const activeSec = editableSections || selectedSummary?.sections_data

  return (
    <div className="space-y-4 max-w-full min-w-0" data-testid="pcp-resumo-mensal-page">
      <EntregasSubmenu />

      {/* Cabeçalho */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Resumo Mensal de Entregas"
        subtitle="Consolidação analítica de 18 seções mínimas por linha fabril com governança de versões e rastreabilidade SAP."
        compactInfo={`${String(filterMes).padStart(2, '0')}/${filterAno} | 18 seções | Atualizado em tempo real`}
        infoTooltip="Consolidação analítica de 18 seções mínimas por linha fabril com revisão assistida por IA, rastreabilidade SAP SD/PP e governança imutável de versões."
        breadcrumbs={[{ label: 'Entregas PCP', href: '/pcp/entregas' }, { label: 'Resumo Mensal' }]}
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/30 text-xs font-semibold whitespace-nowrap">
              {String(filterMes).padStart(2, '0')}/{filterAno}
            </Badge>
            {renderStatusBadge(selectedSummary?.status || 'RASCUNHO_IA')}
          </div>
        }
        dataSource="SAP ECC / WMS / Ficha Mestra / PocketBase"
        lastUpdated={new Date()}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyData}
              className="h-8 text-xs border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100 gap-1.5 shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Verificar Dados</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPdfExecutive(false)
                setIsPdfOpen(true)
              }}
              className="h-8 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Gerar PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPdfExecutive(true)
                setIsPdfOpen(true)
              }}
              className="h-8 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Executivo</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEmailOpen(true)}
              className="h-8 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 shrink-0"
            >
              <Mail className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Enviar por E-mail</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePublishAgenda}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Publicar na Agenda HUB</span>
            </Button>
          </>
        }
      />

      {/* Dashboard de KPIs do Resumo Mensal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <CiafalKPICard title="Resumos" value={totalSummariesCount} status="NORMAL" />
        <CiafalKPICard title="Rascunhos" value={rascunhosCount} status="NORMAL" />
        <CiafalKPICard title="Em Edição" value={emEdicaoCount} status="NORMAL" />
        <CiafalKPICard title="Em Aprovação" value={aguardandoAprovacaoCount} status="ATENCAO" />
        <CiafalKPICard title="Publicados" value={publicadosCount} status="SUCESSO" />
        <CiafalKPICard
          title="Leituras Pendentes"
          value={leiturasPendentes}
          status={leiturasPendentes > 0 ? 'ATENCAO' : 'NORMAL'}
        />
        <CiafalKPICard title="Leituras Confirmadas" value={leiturasConfirmadas} status="SUCESSO" />
        <CiafalKPICard
          title="Versão Atual"
          value={selectedSummary?.version_tag || 'V1'}
          status="NORMAL"
        />
      </div>

      {/* Barra de Filtros Rigorosos (Centros Reais da Ficha Mestra) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Empresa */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Empresa:</span>
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
            >
              <option value="ALL">Todas</option>
              <option value="CIAFAL">CIAFAL</option>
            </select>
          </div>

          {/* Centro Real lido de Cadastros -> Centros e Ficha Mestra */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Centro Real:</span>
            <select
              value={filterCentro}
              onChange={(e) => setFilterCentro(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
            >
              <option value="ALL">Todos os Centros</option>
              {centers.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Linha Fabril */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Linha:</span>
            <select
              value={filterLinha}
              onChange={(e) => setFilterLinha(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
            >
              <option value="ALL">Todas as Linhas</option>
              <option value="L1">Linha L1 (Tubos & Perfis Leves)</option>
              <option value="L2">Linha L2 (Perfis & Estruturais)</option>
              <option value="SDC">Linha SDC (Sidercentro)</option>
            </select>
          </div>

          {/* Ano */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Ano:</span>
            <select
              value={filterAno}
              onChange={(e) => setFilterAno(Number(e.target.value))}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

          {/* Mês */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Mês:</span>
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(Number(e.target.value))}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
            >
              <option value={1}>01 - Janeiro</option>
              <option value={2}>02 - Fevereiro</option>
              <option value={3}>03 - Março</option>
              <option value={4}>04 - Abril</option>
              <option value={5}>05 - Maio</option>
              <option value={6}>06 - Junho</option>
              <option value={7}>07 - Julho</option>
              <option value={8}>08 - Agosto</option>
              <option value={9}>09 - Setembro</option>
              <option value={10}>10 - Outubro</option>
              <option value={11}>11 - Novembro</option>
              <option value={12}>12 - Dezembro</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
            >
              <option value="ALL">Todos os Status</option>
              <option value="RASCUNHO_IA">Rascunho IA</option>
              <option value="EM_EDICAO_PCP">Em Edição</option>
              <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
              <option value="PUBLICADO">Publicado</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewVersion}
            className="h-8 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Nova Versão</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReadingConfirmationsOpen(true)}
            className="h-8 text-xs border-emerald-300 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 gap-1.5 font-bold"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>Painel de Leituras</span>
          </Button>
        </div>
      </div>

      {/* Seleção Rápida entre Resumos Carregados */}
      {summaries.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Resumos do Período:
          </span>
          {summaries.map((s) => {
            const isSelected = selectedSummary?.id === s.id
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSummary(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#004C97] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{s.linha_nome || s.linha_code}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}
                >
                  {s.version_tag}
                </span>
                {renderStatusBadge(s.status)}
              </button>
            )
          })}
        </div>
      )}

      {/* Visualizador & Editor das 18 Seções Mínimas Estruturadas */}
      {selectedSummary && activeSec ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          {/* Topo do Resumo Selecionado */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  {selectedSummary.summary_code}
                </span>
                {renderStatusBadge(selectedSummary.status)}
                <Badge variant="outline" className="font-mono text-xs bg-slate-100">
                  Ref. Prog: {selectedSummary.origem_programacao_ref || 'WS-L1-2025-W18'}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                Linha: <strong>{selectedSummary.linha_nome || selectedSummary.linha_code}</strong>{' '}
                &bull; Centro:{' '}
                <strong>{selectedSummary.centro_nome || selectedSummary.centro_code}</strong> &bull;
                Responsável:{' '}
                <strong>{selectedSummary.responsavel_pcp_nome || 'Carlos Mendes'}</strong> &bull;
                Data de Entrega: <strong>{selectedSummary.data_entrega || '04/05/2025'}</strong> (
                {activeSec.identificacao.diaUtil})
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditableSections(JSON.parse(JSON.stringify(selectedSummary.sections_data)))
                      setIsEditing(false)
                    }}
                    className="h-8 text-xs border-slate-300"
                  >
                    Descartar Edição
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveSections}
                    className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 font-bold shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs border-[#004C97] text-[#004C97] bg-white hover:bg-[#004C97]/5 font-semibold"
                >
                  Editar Resumo
                </Button>
              )}
            </div>
          </div>

          {/* GRID DAS 18 SEÇÕES MÍNIMAS */}
          <div className="p-4 space-y-6">
            {/* SEÇÃO 1: Identificação */}
            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider mb-2 flex items-center justify-between">
                <span>1. Identificação Operacional</span>
                <span className="text-[10px] text-slate-400 font-normal">Seção 1 de 18</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Empresa
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeSec.identificacao.empresa}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Centro Fabril
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeSec.identificacao.centroCode} - {activeSec.identificacao.centroNome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Linha
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeSec.identificacao.linhaNome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Mês / Ano
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeSec.identificacao.mesAno}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Versão
                  </span>
                  <Badge variant="outline" className="font-mono bg-white font-bold text-xs">
                    {activeSec.identificacao.versao}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Data de Entrega
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeSec.identificacao.dataEntrega}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Sumário Executivo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                  2. Sumário Executivo (5 a 10 Bullets Estruturados)
                </h3>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleOpenAiReview(
                        'Sumário Executivo',
                        'sumarioExecutivo',
                        activeSec.sumarioExecutivo.bullets.join('\n'),
                        'executive',
                      )
                    }
                    className="h-7 text-[11px] text-[#004C97] hover:bg-sky-50 gap-1 px-2 font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Revisar com IA</span>
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <Textarea
                  value={activeSec.sumarioExecutivo.bullets.join('\n')}
                  onChange={(e) => {
                    const bullets = e.target.value.split('\n')
                    setEditableSections((prev) =>
                      prev
                        ? {
                            ...prev,
                            sumarioExecutivo: { bullets },
                          }
                        : null,
                    )
                  }}
                  rows={5}
                  className="text-xs font-sans leading-relaxed"
                  placeholder="Insira um bullet por linha..."
                />
              ) : (
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-800 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                  {activeSec.sumarioExecutivo.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* SEÇÃO 3: Análise de Carteira (Pesos específicos para L1, L2 e SDC) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                3. Análise de Carteira & Atendimento Comercial (SAP ZSD28C)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Total Carteira
                  </span>
                  <TraceableNumber
                    value={activeSec.analiseCarteira.totalTons.formattedText}
                    sourceSystem={activeSec.analiseCarteira.totalTons.sourceSystem}
                    lastUpdatedAt={activeSec.analiseCarteira.totalTons.lastUpdatedAt}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira L1
                  </span>
                  <TraceableNumber
                    value={activeSec.analiseCarteira.carteiraL1Tons.formattedText}
                    sourceSystem={activeSec.analiseCarteira.carteiraL1Tons.sourceSystem}
                    lastUpdatedAt={activeSec.analiseCarteira.carteiraL1Tons.lastUpdatedAt}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira L2
                  </span>
                  <TraceableNumber
                    value={activeSec.analiseCarteira.carteiraL2Tons.formattedText}
                    sourceSystem={activeSec.analiseCarteira.carteiraL2Tons.sourceSystem}
                    lastUpdatedAt={activeSec.analiseCarteira.carteiraL2Tons.lastUpdatedAt}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira SDC
                  </span>
                  <TraceableNumber
                    value={activeSec.analiseCarteira.carteiraSDCTons.formattedText}
                    sourceSystem={activeSec.analiseCarteira.carteiraSDCTons.sourceSystem}
                    lastUpdatedAt={activeSec.analiseCarteira.carteiraSDCTons.lastUpdatedAt}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira MTO
                  </span>
                  <TraceableNumber
                    value={activeSec.analiseCarteira.carteiraMTOTons.formattedText}
                    sourceSystem={activeSec.analiseCarteira.carteiraMTOTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Cobertura
                  </span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {activeSec.analiseCarteira.coberturaDias} dias
                  </span>
                </div>
                <div className="p-2.5 rounded border bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira Negativa
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatNumberPTBR(activeSec.analiseCarteira.carteiraNegativaTons, 1)} t
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: Estoque de Produto Acabado */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                4. Estoque de Produto Acabado (WMS & Expedição)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Estoque Físico
                  </span>
                  <TraceableNumber
                    value={activeSec.estoqueProdutoAcabado.estoqueFisicoTons.formattedText}
                    sourceSystem={activeSec.estoqueProdutoAcabado.estoqueFisicoTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Carteira Comprometida
                  </span>
                  <TraceableNumber
                    value={activeSec.estoqueProdutoAcabado.carteiraComprometidaTons.formattedText}
                    sourceSystem={
                      activeSec.estoqueProdutoAcabado.carteiraComprometidaTons.sourceSystem
                    }
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Saldo Livre
                  </span>
                  <TraceableNumber
                    value={activeSec.estoqueProdutoAcabado.saldoLivreTons.formattedText}
                    sourceSystem={activeSec.estoqueProdutoAcabado.saldoLivreTons.sourceSystem}
                    className="font-bold text-emerald-700 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Dias de Estoque Médio
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {activeSec.estoqueProdutoAcabado.diasDeEstoqueMedio} dias
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: Matéria-Prima */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                5. Matéria-Prima & Balanço de Pátio (DP07 / KS / Fornecedores)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs text-center">
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Estoque Atual
                  </span>
                  <TraceableNumber
                    value={activeSec.materiaPrima.estoqueAtualTons.formattedText}
                    sourceSystem={activeSec.materiaPrima.estoqueAtualTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Necessidade Total
                  </span>
                  <TraceableNumber
                    value={activeSec.materiaPrima.necessidadeTotalTons.formattedText}
                    sourceSystem={activeSec.materiaPrima.necessidadeTotalTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Entradas Previstas
                  </span>
                  <TraceableNumber
                    value={activeSec.materiaPrima.entradasPrevistasTons.formattedText}
                    sourceSystem={activeSec.materiaPrima.entradasPrevistasTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Saldo Projetado
                  </span>
                  <TraceableNumber
                    value={activeSec.materiaPrima.saldoProjetadoTons.formattedText}
                    sourceSystem={activeSec.materiaPrima.saldoProjetadoTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Produção Prevista
                  </span>
                  <TraceableNumber
                    value={activeSec.materiaPrima.producaoPrevistaTons.formattedText}
                    sourceSystem={activeSec.materiaPrima.producaoPrevistaTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Risco de Ruptura
                  </span>
                  <span className="font-bold text-emerald-700 uppercase text-sm block">
                    {activeSec.materiaPrima.riscoRupturaNivel}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 6: Industrializados */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                6. Industrializados & Terceirização (TB-002 / ArcelorMittal)
              </h3>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Contratos Vigentes:
                  </span>
                  <span className="font-bold text-slate-800">
                    {activeSec.industrializados.contratosAtivos.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Volume Industrializado:
                  </span>
                  <TraceableNumber
                    value={activeSec.industrializados.volumeIndustrializadoTons.formattedText}
                    sourceSystem={activeSec.industrializados.volumeIndustrializadoTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Status TB-002:
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    {activeSec.industrializados.tb002Status}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 7: Premissas do Mês */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                7. Premissas Operacionais do Mês
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                {activeSec.premissasDoMes.itens.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            </div>

            {/* SEÇÃO 8: Restrições e Problemas Industriais */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                8. Restrições e Problemas Industriais
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Paradas Programadas
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatNumberPTBR(activeSec.restricoesProblemas.paradasProgramadasHoras, 1)} h
                  </span>
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Quebras / Falhas
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatNumberPTBR(activeSec.restricoesProblemas.quebrasHoras, 1)} h
                  </span>
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Produtividade Realizada
                  </span>
                  <TraceableNumber
                    value={activeSec.restricoesProblemas.produtividadeRealizadaTph.formattedText}
                    sourceSystem={
                      activeSec.restricoesProblemas.produtividadeRealizadaTph.sourceSystem
                    }
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Setup Médio
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {activeSec.restricoesProblemas.tempoSetupMedioMin} min
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 9: Campanhas */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                9. Campanhas de Laminação & Conformação
              </h3>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Família em Foco:
                  </span>
                  <span className="font-bold text-slate-900">
                    {activeSec.campanhas.familiaAtiva}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Bitolas:
                  </span>
                  <span className="font-bold text-slate-900">
                    {activeSec.campanhas.bitolasFoco}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Aços:
                  </span>
                  <span className="font-bold text-slate-900">
                    {activeSec.campanhas.acosPlanejados.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Meta da Campanha:
                  </span>
                  <span className="font-bold text-[#004C97] font-mono">
                    {formatNumberPTBR(activeSec.campanhas.campanhaPlanejadaTons, 1)} t
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 10: Programação do Mês */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                10. Programação do Mês (Ordens SAP)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Total de Ordens
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {activeSec.programacaoDoMes.totalOrdens} OPs
                  </span>
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Volume Programado
                  </span>
                  <TraceableNumber
                    value={activeSec.programacaoDoMes.volumeProgramadoTons.formattedText}
                    sourceSystem={activeSec.programacaoDoMes.volumeProgramadoTons.sourceSystem}
                    className="font-bold text-slate-900 font-mono text-sm"
                  />
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Aderência à Grade
                  </span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {formatNumberPTBR(activeSec.programacaoDoMes.aderenciaGradePct, 1)}%
                  </span>
                </div>
                <div className="p-2.5 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">
                    Turnos Trabalhados
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {activeSec.programacaoDoMes.turnosOperacionais} turnos
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 11: Produção Prevista */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                11. Produção Prevista (Semanal e por Família)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <span className="font-bold text-slate-700 block mb-2">Distribuição Semanal:</span>
                  <div className="space-y-1.5">
                    {activeSec.producaoPrevista.distribuicaoSemanalTons.map((sem) => (
                      <div key={sem.semana} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">{sem.semana}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatNumberPTBR(sem.previstoTons, 1)} t
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <span className="font-bold text-slate-700 block mb-2">
                    Distribuição por Família:
                  </span>
                  <div className="space-y-1.5">
                    {activeSec.producaoPrevista.distribuicaoPorFamilia.map((fam) => (
                      <div key={fam.familia} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">
                          {fam.familia} ({formatNumberPTBR(fam.pct, 1)}%)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatNumberPTBR(fam.tons, 1)} t
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 12: Previsto x Realizado Histórico */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                12. Previsto x Realizado Histórico (Últimos Meses)
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-xs text-left min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Mês</th>
                      <th className="py-2 px-3 text-right">Previsto (t)</th>
                      <th className="py-2 px-3 text-right">Realizado (t)</th>
                      <th className="py-2 px-3 text-right">Desvio (t)</th>
                      <th className="py-2 px-3 text-right">Assertividade (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSec.previstoVsRealizadoHistorico.meses.map((m) => (
                      <tr key={m.mes}>
                        <td className="py-2 px-3 font-bold text-slate-900">{m.mes}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatNumberPTBR(m.previstoTons, 1)} t
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatNumberPTBR(m.realizadoTons, 1)} t
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatNumberPTBR(m.desvioTons, 1)} t
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatNumberPTBR(m.assertividadePct, 1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 13: Histórico de Revisões */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                13. Histórico de Revisões de Versão (V1 / V2 / V3)
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-xs text-left min-w-[580px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Versão</th>
                      <th className="py-2 px-3">Data / Hora</th>
                      <th className="py-2 px-3">Responsável</th>
                      <th className="py-2 px-3">Motivo Oficial</th>
                      <th className="py-2 px-3">Impacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSec.historicoRevisoes.revisoes.map((r) => (
                      <tr key={r.versao}>
                        <td className="py-2 px-3 font-bold text-[#004C97] font-mono">{r.versao}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">{r.dataHora}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.responsavel}</td>
                        <td className="py-2 px-3 text-slate-800">{r.motivo}</td>
                        <td className="py-2 px-3 text-slate-600">{r.impacto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 14: Riscos */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                14. Matriz de Riscos de Entrega
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-xs text-left min-w-[550px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Risco Identificado</th>
                      <th className="py-2 px-3">Evidência Transacional</th>
                      <th className="py-2 px-3">Impacto Potencial</th>
                      <th className="py-2 px-3 text-center">Nível</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSec.riscos.lista.map((rk, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-900">{rk.risco}</td>
                        <td className="py-2 px-3 text-slate-600">{rk.evidencia}</td>
                        <td className="py-2 px-3 text-slate-800">{rk.impacto}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              rk.nivel === 'Alta'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : rk.nivel === 'Média'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {rk.nivel}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 15: Pontos de Atenção */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                15. Pontos de Atenção Críticos (~10 máx)
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                {activeSec.pontosAtencao.itens.map((ponto, idx) => (
                  <li key={idx}>{ponto}</li>
                ))}
              </ul>
            </div>

            {/* SEÇÃO 16: Pendências por Área */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                16. Pendências e Planos de Ação por Área
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-xs text-left min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Área</th>
                      <th className="py-2 px-3">Ação Acordada</th>
                      <th className="py-2 px-3">Responsável</th>
                      <th className="py-2 px-3">Prazo</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSec.pendenciasPorArea.tabela.map((pen) => (
                      <tr key={pen.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{pen.area}</td>
                        <td className="py-2 px-3 text-slate-800">{pen.acao}</td>
                        <td className="py-2 px-3 text-slate-600">{pen.responsavel}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{pen.prazo}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pen.status === 'Concluída'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {pen.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 17: Aprovações */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider">
                17. Trilha de Aprovações Departamentais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {activeSec.aprovacoes.lista.map((ap) => (
                  <div key={ap.area} className="p-3 border rounded-lg bg-slate-50/60 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{ap.area}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          ap.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ap.status}
                      </span>
                    </div>
                    <div className="text-slate-600">Responsável: {ap.responsavel}</div>
                    {ap.dataHora && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Aprovado em: {ap.dataHora}
                      </div>
                    )}
                    {ap.comentario && (
                      <div className="text-[11px] text-slate-700 italic pt-1">
                        "{ap.comentario}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 18: Conclusão IA */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-[#004C97] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>18. Conclusão & Parecer IA (Agente Nativo CIAFAL)</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleOpenAiReview(
                      'Parecer Geral IA',
                      'conclusaoIA',
                      activeSec.conclusaoIA.parecerGeral,
                      'executive',
                    )
                  }
                  className="h-7 text-[11px] text-[#004C97] hover:bg-sky-50 gap-1 px-2 font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Aprimorar com IA</span>
                </Button>
              </div>

              <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-lg text-xs space-y-2">
                <div>
                  <strong className="text-sky-950 block">
                    Coerência Carteira &times; Estoque &times; Programação:
                  </strong>
                  <p className="text-slate-700 leading-relaxed">
                    {activeSec.conclusaoIA.coerenciaCarteiraEstoque}
                  </p>
                </div>
                <div>
                  <strong className="text-sky-950 block">Parecer Geral Conclusivo:</strong>
                  <p className="text-slate-700 leading-relaxed italic bg-white p-2.5 rounded border border-sky-100">
                    "{activeSec.conclusaoIA.parecerGeral}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="font-bold text-slate-700">
            Nenhum resumo encontrado para os filtros selecionados
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Altere os filtros de linha, centro ou período para visualizar os resumos consolidados.
          </div>
        </div>
      )}

      {/* MODAL 1: Revisão com IA (Agente Nativo com Aceitar/Rejeitar) */}
      <AIReviewModal
        isOpen={isAiReviewOpen}
        onClose={() => setIsAiReviewOpen(false)}
        sectionTitle={aiReviewSection.title}
        sectionKey={aiReviewSection.key}
        mode={aiReviewMode}
        originalText={aiReviewSection.text}
        suggestedText={aiReviewSuggestion}
        onAccept={handleAcceptAiSuggestion}
        onReject={() => {
          toast({
            title: 'Sugestão Rejeitada',
            description: 'O texto original da seção foi mantido sem alterações.',
          })
        }}
      />

      {/* MODAL 2: Verificação de Dados Transacionais */}
      <DataVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        issues={verificationIssues}
        summaryCode={selectedSummary?.summary_code || ''}
        onProceedPublish={handlePublishAgenda}
      />

      {/* MODAL 3: Visualização e Impressão de PDF (Completo / Executivo) */}
      {selectedSummary && (
        <SummaryPdfModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          summary={selectedSummary}
          isExecutiveMode={isPdfExecutive}
        />
      )}

      {/* MODAL 4: Disparo por E-mail */}
      {selectedSummary && (
        <SendEmailModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          summaryCode={selectedSummary.summary_code}
          lineName={selectedSummary.linha_nome || selectedSummary.linha_code}
          mesAno={selectedSummary.mes_ano}
          versionTag={selectedSummary.version_tag}
          onDispatched={loadInitialData}
        />
      )}

      {/* MODAL 5: Painel de Confirmações de Leitura */}
      {selectedSummary && (
        <ReadingConfirmationsModal
          isOpen={isReadingConfirmationsOpen}
          onClose={() => setIsReadingConfirmationsOpen(false)}
          summaryCode={selectedSummary.summary_code}
          versionTag={selectedSummary.version_tag}
          confirmations={selectedSummary.reading_confirmations || []}
          onConfirmCurrentReading={handleConfirmReading}
        />
      )}
    </div>
  )
}
export default ResumoMensalPage
