import React, { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  History,
  AlertTriangle,
  PlayCircle,
  Layers,
  Wrench,
  Package,
  Calendar,
  User,
  Filter,
} from 'lucide-react'
import {
  TestProgrammingRecord,
  TestProgrammingStatus,
  TestCategory,
  ScheduleImpactType,
} from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { TestProgrammingFormModal } from '@/components/test-programming/TestProgrammingFormModal'
import { IndustrialApprovalModal } from '@/components/test-programming/IndustrialApprovalModal'
import { TestHistoryModal } from '@/components/test-programming/TestHistoryModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { CiafalPageHeader } from '@/components/common/CiafalDesignSystem'

export const TestProgrammingPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [items, setItems] = useState<TestProgrammingRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null)

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<TestProgrammingRecord | null>(null)
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [selectedForApproval, setSelectedForApproval] = useState<TestProgrammingRecord | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedForHistory, setSelectedForHistory] = useState<TestProgrammingRecord | null>(null)

  // Carrega lista
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await testProgrammingService.list()
      setItems(data)
    } catch (err: any) {
      console.error('Erro ao carregar testes:', err)
      toast({
        title: 'Falha ao carregar programações de testes',
        description: err?.message || 'Erro de conexão com o banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas para cards superiores
  const metrics = useMemo(() => {
    return testProgrammingService.calculateMetrics(items)
  }, [items])

  // Filtragem
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de pesquisa de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.title?.toLowerCase().includes(q)
        const matchId = item.test_id?.toLowerCase().includes(q)
        const matchSector = item.requesting_sector?.toLowerCase().includes(q)
        const matchRequester = item.requester_name?.toLowerCase().includes(q)
        const matchTech = item.technical_lead?.toLowerCase().includes(q)
        if (!matchTitle && !matchId && !matchSector && !matchRequester && !matchTech) {
          return false
        }
      }

      // Filtro Empresa
      if (selectedCompany !== 'ALL' && item.company !== selectedCompany) {
        return false
      }

      // Filtro Linha
      if (selectedLine !== 'ALL' && item.production_line !== selectedLine) {
        return false
      }

      // Filtro Categoria
      if (selectedCategory !== 'ALL' && item.test_category !== selectedCategory) {
        return false
      }

      // Filtro Status Geral
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false
      }

      // Filtro via Card Clicável
      if (activeCardFilter) {
        const today = new Date().toISOString().split('T')[0]
        const curr = new Date()
        const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1))
          .toISOString()
          .split('T')[0]
        const lastDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + 7))
          .toISOString()
          .split('T')[0]

        switch (activeCardFilter) {
          case 'programados':
            return item.status === 'Programado' || item.status === 'Próximo da Execução'
          case 'estaSemana':
            return item.expected_date >= firstDay && item.expected_date <= lastDay
          case 'aguardandoIndustria':
            return (
              item.status === 'Enviado para Aprovação Industrial' ||
              item.status === 'Em Aprovação Industrial'
            )
          case 'aguardandoPcp':
            return item.status === 'Aguardando Aprovação PCP' || item.status === 'Em Análise PCP'
          case 'emExecucao':
            return item.status === 'Em Execução'
          case 'aguardandoResultado':
            return item.status === 'Aguardando Resultado' || item.status === 'Executado'
          case 'aguardandoEficacia':
            return (
              item.status === 'Aguardando Avaliação de Eficácia' ||
              item.status === 'Em Avaliação de Eficácia'
            )
          case 'eficazes':
            return item.efficacy_evaluation?.outcome === 'EFICAZ'
          case 'ineficazes':
            return item.efficacy_evaluation?.outcome === 'INEFICAZ'
          case 'necessitamNovoTeste':
            return item.efficacy_evaluation?.outcome === 'NOVO_TESTE_NECESSARIO'
          case 'comAcaoAberta':
            return item.status === 'Ação Necessária' || item.status === 'Em Tratamento'
          case 'acoesVencidas':
            return (
              (item.status === 'Ação Necessária' || item.status === 'Em Tratamento') &&
              item.revision_details?.deadline &&
              item.revision_details.deadline < today
            )
          default:
            return true
        }
      }

      return true
    })
  }, [
    items,
    searchQuery,
    selectedCompany,
    selectedLine,
    selectedCategory,
    selectedStatus,
    activeCardFilter,
  ])

  // Badge de Status com cores corporativas
  const getStatusBadge = (status: TestProgrammingStatus) => {
    switch (status) {
      case 'Rascunho':
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
            Rascunho
          </Badge>
        )
      case 'Enviado para Aprovação Industrial':
      case 'Em Aprovação Industrial':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200">
            Aprovação Industrial
          </Badge>
        )
      case 'Solicitação de Ajustes':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200">
            Ajustes Solicitados
          </Badge>
        )
      case 'Aprovado pela Indústria':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200">
            Aprovado Indústria
          </Badge>
        )
      case 'Reprovado pela Indústria':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">
            Reprovado Indústria
          </Badge>
        )
      case 'Aguardando Aprovação PCP':
      case 'Em Análise PCP':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 hover:bg-blue-200">
            Aprovação PCP
          </Badge>
        )
      case 'Aprovado PCP':
      case 'Programado':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200">
            Programado
          </Badge>
        )
      case 'Próximo da Execução':
      case 'Em Execução':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 animate-pulse">
            Em Execução
          </Badge>
        )
      case 'Executado':
      case 'Aguardando Resultado':
        return (
          <Badge className="bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200">
            Aguardando Resultado
          </Badge>
        )
      case 'Resultado Registrado':
      case 'Aguardando Avaliação de Eficácia':
      case 'Em Avaliação de Eficácia':
        return (
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200">
            Avaliação Eficácia
          </Badge>
        )
      case 'Ação Necessária':
      case 'Em Tratamento':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200">
            Plano de Ação
          </Badge>
        )
      case 'Concluído':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Concluído</Badge>
      case 'Cancelado':
        return <Badge className="bg-slate-200 text-slate-500">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryIcon = (category: TestCategory) => {
    switch (category) {
      case 'EQUIPAMENTO':
        return <Wrench className="w-3.5 h-3.5 text-amber-600" />
      case 'MATERIA_PRIMA':
        return <Package className="w-3.5 h-3.5 text-blue-600" />
      case 'RECEITA_LAMINACAO':
        return <Layers className="w-3.5 h-3.5 text-purple-600" />
    }
  }

  const getImpactBadge = (type: ScheduleImpactType) => {
    switch (type) {
      case 'PARADA_TOTAL':
        return (
          <Badge variant="outline" className="text-[10px] text-red-700 bg-red-50 border-red-200">
            Parada Total
          </Badge>
        )
      case 'REDUCAO_RITMO':
        return (
          <Badge
            variant="outline"
            className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
          >
            Redução Ritmo
          </Badge>
        )
      case 'SEM_IMPACTO':
        return (
          <Badge
            variant="outline"
            className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200"
          >
            Sem Impacto
          </Badge>
        )
    }
  }

  // Toggle do filtro de card
  const handleCardClick = (cardKey: string) => {
    if (activeCardFilter === cardKey) {
      setActiveCardFilter(null)
    } else {
      setActiveCardFilter(cardKey)
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 md:p-6 space-y-4">
      {/* Cabeçalho da Página */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Programação de Testes"
        subtitle="Gestão ponta a ponta do teste industrial: engenharia, PCP, impacto fabril e eficácia."
        compactInfo={`${items.length} solicitações | Ciclo Integrado`}
        infoTooltip="Gestão ponta a ponta do teste industrial: solicitação, aprovação de engenharia e PCP, impacto produtivo e eficácia."
        breadcrumbs={[{ label: 'PCP' }, { label: 'Programação de Testes' }]}
        badge="Ciclo Corporativo Integrado"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs h-8 gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setSelectedForEdit(null)
                setIsFormOpen(true)
              }}
              className="text-xs h-8 gap-1.5 bg-[#004C97] hover:bg-[#003974] text-white shadow-xs font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Programação de Teste</span>
            </Button>
          </>
        }
      />

      {/* Cards Compactos e Clicáveis com Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
        {[
          {
            key: 'programados',
            label: 'Programados',
            count: metrics.programados,
            color: 'text-indigo-700',
            bg: 'hover:bg-indigo-50/70',
          },
          {
            key: 'estaSemana',
            label: 'Esta Semana',
            count: metrics.estaSemana,
            color: 'text-blue-700',
            bg: 'hover:bg-blue-50/70',
          },
          {
            key: 'aguardandoIndustria',
            label: 'Aguard. Indústria',
            count: metrics.aguardandoIndustria,
            color: 'text-amber-700',
            bg: 'hover:bg-amber-50/70',
          },
          {
            key: 'aguardandoPcp',
            label: 'Aguard. PCP',
            count: metrics.aguardandoPcp,
            color: 'text-[#004C97]',
            bg: 'hover:bg-sky-50/70',
          },
          {
            key: 'emExecucao',
            label: 'Em Execução',
            count: metrics.emExecucao,
            color: 'text-purple-700',
            bg: 'hover:bg-purple-50/70',
          },
          {
            key: 'aguardandoResultado',
            label: 'Aguard. Resultado',
            count: metrics.aguardandoResultado,
            color: 'text-teal-700',
            bg: 'hover:bg-teal-50/70',
          },
          {
            key: 'aguardandoEficacia',
            label: 'Aguard. Eficácia',
            count: metrics.aguardandoEficacia,
            color: 'text-cyan-700',
            bg: 'hover:bg-cyan-50/70',
          },
          {
            key: 'eficazes',
            label: 'Eficazes',
            count: metrics.eficazes,
            color: 'text-emerald-700',
            bg: 'hover:bg-emerald-50/70',
          },
          {
            key: 'ineficazes',
            label: 'Ineficazes',
            count: metrics.ineficazes,
            color: 'text-red-700',
            bg: 'hover:bg-red-50/70',
          },
          {
            key: 'necessitamNovoTeste',
            label: 'Novo Teste Nec.',
            count: metrics.necessitamNovoTeste,
            color: 'text-orange-700',
            bg: 'hover:bg-orange-50/70',
          },
          {
            key: 'comAcaoAberta',
            label: 'Com Ação Aberta',
            count: metrics.comAcaoAberta,
            color: 'text-rose-700',
            bg: 'hover:bg-rose-50/70',
          },
          {
            key: 'acoesVencidas',
            label: 'Ações Vencidas',
            count: metrics.acoesVencidas,
            color: 'text-red-800',
            bg: 'hover:bg-red-50/70',
          },
        ].map((c) => {
          const isSelected = activeCardFilter === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => handleCardClick(c.key)}
              className={`p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50 border-[#004C97] ring-2 ring-[#004C97]/30 shadow-sm'
                  : `bg-white border-slate-200 ${c.bg} shadow-xs`
              }`}
            >
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate block">
                {c.label}
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-lg font-bold ${c.color}`}>{c.count}</span>
                {isSelected && (
                  <span className="text-[9px] font-bold text-[#004C97] bg-white px-1 rounded border border-[#004C97]/20">
                    Ativo
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
        <div className="flex-1 relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por ID, título, solicitante, responsável..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Empresa */}
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="text-xs h-9 w-[130px]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todas Empresas
              </SelectItem>
              <SelectItem value="CIAFAL" className="text-xs">
                CIAFAL
              </SelectItem>
              <SelectItem value="SIDER" className="text-xs">
                SIDER
              </SelectItem>
              <SelectItem value="STEEL" className="text-xs">
                STEEL
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Linha */}
          <Select value={selectedLine} onValueChange={setSelectedLine}>
            <SelectTrigger className="text-xs h-9 w-[110px]">
              <SelectValue placeholder="Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todas Linhas
              </SelectItem>
              <SelectItem value="L1" className="text-xs">
                Linha L1
              </SelectItem>
              <SelectItem value="L2" className="text-xs">
                Linha L2
              </SelectItem>
              <SelectItem value="L3" className="text-xs">
                Linha L3
              </SelectItem>
              <SelectItem value="L4" className="text-xs">
                Linha L4
              </SelectItem>
              <SelectItem value="L5" className="text-xs">
                Linha L5
              </SelectItem>
              <SelectItem value="L6" className="text-xs">
                Linha L6
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Categoria */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-xs h-9 w-[150px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todas Categorias
              </SelectItem>
              <SelectItem value="EQUIPAMENTO" className="text-xs">
                Equipamento
              </SelectItem>
              <SelectItem value="MATERIA_PRIMA" className="text-xs">
                Matéria-Prima
              </SelectItem>
              <SelectItem value="RECEITA_LAMINACAO" className="text-xs">
                Receita Laminação
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Status */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="text-xs h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todos os Status
              </SelectItem>
              <SelectItem value="Rascunho" className="text-xs">
                Rascunho
              </SelectItem>
              <SelectItem value="Enviado para Aprovação Industrial" className="text-xs">
                Enviado Ap. Industrial
              </SelectItem>
              <SelectItem value="Aguardando Aprovação PCP" className="text-xs">
                Aguardando PCP
              </SelectItem>
              <SelectItem value="Programado" className="text-xs">
                Programado
              </SelectItem>
              <SelectItem value="Em Execução" className="text-xs">
                Em Execução
              </SelectItem>
              <SelectItem value="Executado" className="text-xs">
                Executado
              </SelectItem>
              <SelectItem value="Concluído" className="text-xs">
                Concluído
              </SelectItem>
            </SelectContent>
          </Select>

          {activeCardFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveCardFilter(null)}
              className="text-xs h-9 text-slate-500 hover:text-slate-800"
            >
              Limpar Filtro Card
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Programações de Testes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">
              Registros Encontrados: {filteredItems.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Ficha Mestra & SAP Integrados</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Carregando programações de testes do servidor...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">Nenhum teste encontrado.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Utilize o botão "+ Nova Programação de Teste" para registrar uma nova solicitação
              técnica para a linha fabril.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">ID / Título</th>
                  <th className="py-2.5 px-3">Linha / Empresa</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Impacto Linha</th>
                  <th className="py-2.5 px-3">Data Prevista</th>
                  <th className="py-2.5 px-3">Responsáveis</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const canIndustrialApprove =
                    item.status === 'Enviado para Aprovação Industrial' ||
                    item.status === 'Em Aprovação Industrial'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID e Título */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#004C97]">{item.test_id}</span>
                        </div>
                        <p className="font-semibold text-slate-800 line-clamp-1 max-w-[260px] mt-0.5">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.objective}</p>
                      </td>

                      {/* Linha / Empresa */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="font-semibold text-[11px]">
                          {item.production_line}
                        </Badge>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {item.company}
                        </span>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          {getCategoryIcon(item.test_category)}
                          <span className="text-[11px]">{item.test_category}</span>
                        </div>
                      </td>

                      {/* Impacto */}
                      <td className="py-3 px-3">
                        {getImpactBadge(item.schedule_impact_type)}
                        {item.schedule_impact_type === 'PARADA_TOTAL' && item.impact_data?.data && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                            {(item.impact_data.data as any).startTime} -{' '}
                            {(item.impact_data.data as any).calculatedEndTime} (
                            {(item.impact_data.data as any).expectedDurationMinutes}m)
                          </span>
                        )}
                        {item.schedule_impact_type === 'REDUCAO_RITMO' &&
                          item.impact_data?.data && (
                            <span className="text-[10px] text-amber-700 font-bold block mt-0.5 font-mono">
                              -{(item.impact_data.data as any).calculatedReductionPercent}% (
                              {(item.impact_data.data as any).expectedProductivity} t/h)
                            </span>
                          )}
                      </td>

                      {/* Data Prevista */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.expected_date}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Req: {item.request_date}
                        </span>
                      </td>

                      {/* Responsáveis */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-700 text-[11px]">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium truncate max-w-[120px]">
                            {item.technical_lead}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[120px]">
                          Por: {item.requester_name}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">{getStatusBadge(item.status)}</td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Aprovação Industrial */}
                          {canIndustrialApprove && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedForApproval(item)
                                setIsApprovalOpen(true)
                              }}
                              className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Avaliar Indústria
                            </Button>
                          )}

                          {/* Botão Editar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedForEdit(item)
                              setIsFormOpen(true)
                            }}
                            className="text-xs h-7 px-2 text-slate-600 hover:text-slate-900"
                          >
                            Editar
                          </Button>

                          {/* Botão Histórico / Log */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedForHistory(item)
                              setIsHistoryOpen(true)
                            }}
                            className="text-xs h-7 px-2 text-slate-500 hover:text-[#004C97]"
                            title="Ver histórico de auditoria"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <TestProgrammingFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
        initialItem={selectedForEdit}
      />

      <IndustrialApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        testItem={selectedForApproval}
        onSuccess={loadData}
      />

      {selectedForHistory && (
        <TestHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          testProgrammingId={selectedForHistory.id}
          testId={selectedForHistory.test_id}
          title={selectedForHistory.title}
        />
      )}
    </div>
  )
}
export default TestProgrammingPage
