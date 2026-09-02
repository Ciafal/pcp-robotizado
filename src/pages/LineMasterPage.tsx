import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { sapIntegrationService } from '@/services/sap-integration'
import { authService } from '@/services/pcp-auth'
import {
  LineOverviewData,
  ProductFamily,
  ProductionLine,
  SapIntegrationDefinition,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { Can } from '@/components/auth/Can'
import { AddLineWizardModal } from '@/components/line-master/AddLineWizardModal'
import { SapIntegrationCatalogModal } from '@/components/line-master/SapIntegrationCatalogModal'
import { LineMasterDetailView } from '@/components/line-master/LineMasterDetailView'

export default function LineMasterPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState<boolean>(true)
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([])
  const [sapCatalog, setSapCatalog] = useState<SapIntegrationDefinition[]>([])

  // Linha Selecionada para Visão 360 Detalhada
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [selectedLineOverview, setSelectedLineOverview] = useState<LineOverviewData | null>(null)
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false)

  // Filtros de Linhas (Ativas / Inativas / Todas)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeCadastralFilter, setActiveCadastralFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>(
    'ACTIVE',
  )
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [plantFilter, setPlantFilter] = useState<string>('ALL')

  // Modais
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState<boolean>(false)
  const [isSapCatalogModalOpen, setIsSapCatalogModalOpen] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesData, usersData, famsData, sapData] = await Promise.all([
        lineMasterService.listLines(),
        authService.listUsers(),
        lineMasterService.listProductFamilies(),
        sapIntegrationService.listCatalog(),
      ])

      setLines(linesData)
      setUsers(usersData)
      setProductFamilies(famsData)
      setSapCatalog(sapData)

      // Se houver uma linha já selecionada, recarrega o overview dela
      if (selectedLineId) {
        await loadLineOverview(selectedLineId)
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Gestão de Linhas',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLineOverview = async (lineId: string) => {
    setLoadingOverview(true)
    try {
      const data = await lineMasterService.getLineOverview(lineId)
      setSelectedLineOverview(data)
      setSelectedLineId(lineId)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar detalhes da linha',
        description: err.message,
      })
    } finally {
      setLoadingOverview(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLines = lines.filter((line) => {
    const matchesSearch =
      line.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (line.process && line.process.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || line.status === statusFilter
    const matchesPlant = plantFilter === 'ALL' || line.plant === plantFilter
    const isLineActive = line.is_active !== false // default true
    const matchesCadastral =
      activeCadastralFilter === 'ALL' ||
      (activeCadastralFilter === 'ACTIVE' && isLineActive) ||
      (activeCadastralFilter === 'INACTIVE' && !isLineActive)

    return matchesSearch && matchesStatus && matchesPlant && matchesCadastral
  })

  return (
    <div className="space-y-6">
      {/* 1. Header da Página em Fundo Claro Corporativo CIAFAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] rounded-md text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestão de Linhas & Fichas Mestre
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-blue-200 text-[#004C97] bg-blue-50 font-bold"
            >
              CIAFAL &bull; Homologado
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Arquitetura central de recursos industriais, hierarquia organizacional, sequenciamento
            de processo, matriz de aprovação e governança SAP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsSapCatalogModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold h-8 gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-[#004C97]" />
            Catálogo SAP ({sapCatalog.length})
          </Button>

          <Can permission="pcp.masterdata.edit">
            <Button
              size="sm"
              onClick={() => setIsAddLineModalOpen(true)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> + Adicionar Linha
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. Se houver linha selecionada: Modo Detalhe 360 / Senão: Grid Principal de Linhas */}
      {selectedLineOverview && selectedLineId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLineId(null)
                setSelectedLineOverview(null)
              }}
              className="text-[#004C97] hover:bg-blue-50 text-xs font-semibold h-7"
            >
              &larr; Voltar para Todas as Linhas Cadastradas
            </Button>
            <span className="text-xs text-slate-600 font-mono">
              Visualizando Linha:{' '}
              <strong className="text-slate-900 font-bold">{selectedLineOverview.line.code}</strong>
            </span>
          </div>

          <LineMasterDetailView
            overview={selectedLineOverview}
            users={users}
            productFamilies={productFamilies}
            allLines={lines}
            sapCatalog={sapCatalog}
            onRefresh={() => loadLineOverview(selectedLineId)}
            onOpenSapCatalog={() => setIsSapCatalogModalOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Barra de Filtros & Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Filtrar por código, nome da linha ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 placeholder:text-slate-400"
              />
            </div>

            {/* Filtro Cadastral: Ativas / Inativas / Todas (Padrão: Ativas) */}
            <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('ACTIVE')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'ACTIVE'
                    ? 'bg-[#004C97] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ● Ativas
              </button>
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('INACTIVE')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'INACTIVE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ○ Inativas
              </button>
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('ALL')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="ALL">Status Operacional: Todos</option>
              <option value="ACTIVE">ACTIVE (Em Produção)</option>
              <option value="CONFIGURING">CONFIGURING (Em Implantação)</option>
              <option value="MAINTENANCE">MAINTENANCE (Manutenção)</option>
            </select>

            <div className="flex items-center justify-end text-xs text-slate-500 font-mono">
              Exibindo:{' '}
              <strong className="text-[#004C97] ml-1">{filteredLines.length} Linhas</strong>
            </div>
          </div>

          {/* Cards das Linhas Cadastradas (Regra 3) */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
              <span>Carregando cadastro de linhas...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Nenhuma linha produtiva cadastrada.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Clique no botão "+ Adicionar Linha" para iniciar o cadastro da primeira linha
                industrial.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsAddLineModalOpen(true)}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
                >
                  + Adicionar Linha
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLines.map((l) => {
                const isSelected = selectedLineId === l.id

                return (
                  <Card
                    key={l.id}
                    onClick={() => loadLineOverview(l.id)}
                    className="bg-white border-slate-200 hover:border-[#004C97] text-slate-900 transition-all cursor-pointer shadow-sm hover:shadow-md group relative overflow-hidden"
                  >
                    {/* Barra de destaque no topo em Pantone 2945 */}
                    <div className="h-1.5 bg-[#004C97] w-full" />

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xl text-slate-900 group-hover:text-[#004C97] transition-colors">
                              {l.code}
                            </span>
                            {l.is_active === false ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-slate-100 text-slate-600 border-slate-300 font-bold"
                              >
                                ○ Inativa
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                              >
                                ● Ativa
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 block line-clamp-1">
                            {l.name}
                          </span>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold ${
                            l.status === 'running' || l.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : l.status === 'maintenance'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : l.status === 'idle'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {l.status === 'running' || l.status === 'ACTIVE'
                            ? 'Em produção'
                            : l.status === 'maintenance'
                              ? 'Manutenção'
                              : l.status === 'idle'
                                ? 'Disponível'
                                : l.status === 'stopped'
                                  ? 'Parada'
                                  : l.status || 'Disponível'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3 text-xs">
                      <p className="text-slate-600 text-[11px] line-clamp-2 min-h-[32px]">
                        {l.description ||
                          'Recurso industrial dedicado para conformação e laminação.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Processo
                          </span>
                          <span className="text-slate-900 font-medium truncate block">
                            {l.process || 'Conformação'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Centro SAP
                          </span>
                          <span className="text-[#004C97] font-bold">
                            {l.sap_plant_code || '1000'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Cadência Nominal
                          </span>
                          <span className="text-slate-900 font-bold">
                            {l.current_rate || 12} t/h
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Eficiência OEE
                          </span>
                          <span className="text-emerald-600 font-bold">
                            <OeeInteractiveValue
                              value={l.efficiency || 90}
                              target={85}
                              unit="%"
                              drilldownContext={{
                                lineCode: l.code || `L${l.id}`,
                                equipmentCode: `${l.code || `L${l.id}`}_LAM`,
                              }}
                            />
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" />
                          Ficha Mestre Ativa
                        </span>
                        <span className="text-[#004C97] font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Abrir Gestão <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL WIZARD: Adicionar Nova Linha (7 Etapas Estruturadas - Regra 4) */}
      <AddLineWizardModal
        open={isAddLineModalOpen}
        onClose={() => setIsAddLineModalOpen(false)}
        onSuccess={(newLine) => {
          loadData()
          loadLineOverview(newLine.id)
        }}
        users={users}
        existingLines={lines}
        productFamilies={productFamilies}
      />

      {/* MODAL CATÁLOGO SAP: Governança Centralizada de BAPIs/Funções Z (Regras 27, 28, 31, 32) */}
      <SapIntegrationCatalogModal
        open={isSapCatalogModalOpen}
        onClose={() => setIsSapCatalogModalOpen(false)}
        catalog={sapCatalog}
        onRefresh={loadData}
      />
    </div>
  )
}
