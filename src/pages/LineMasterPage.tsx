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

  // Filtros de Linhas
  const [searchTerm, setSearchTerm] = useState<string>('')
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
    return matchesSearch && matchesStatus && matchesPlant
  })

  return (
    <div className="space-y-6">
      {/* 1. Header da Página em Fundo Preto + Destaque Pantone 2945 (#004C97) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] rounded-md text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Gestão de Linhas & Fichas Mestre (Prompt 03.1)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arquitetura central de recursos industriais, hierarquia organizacional, sequenciamento
            de processo, matriz de aprovação e governança SAP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsSapCatalogModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-semibold h-8 gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            Catálogo SAP ({sapCatalog.length})
          </Button>

          <Can permission="pcp.masterdata.edit">
            <Button
              size="sm"
              onClick={() => setIsAddLineModalOpen(true)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-lg shadow-blue-950"
            >
              <Plus className="w-3.5 h-3.5" /> + Adicionar Linha
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. Se houver linha selecionada: Modo Detalhe 360 / Senão: Grid Principal de Linhas */}
      {selectedLineOverview && selectedLineId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLineId(null)
                setSelectedLineOverview(null)
              }}
              className="text-cyan-300 hover:text-white hover:bg-slate-900 text-xs font-semibold h-7"
            >
              &larr; Voltar para Todas as Linhas Cadastradas
            </Button>
            <span className="text-xs text-slate-400 font-mono">
              Visualizando Linha:{' '}
              <strong className="text-white">{selectedLineOverview.line.code}</strong>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Filtrar por código, nome da linha ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-700 text-xs text-white h-8"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-2 h-8"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">ACTIVE (Ativas)</option>
              <option value="CONFIGURING">CONFIGURING (Em Implantação)</option>
              <option value="MAINTENANCE">MAINTENANCE (Manutenção)</option>
            </select>

            <div className="flex items-center justify-end text-xs text-slate-400 font-mono">
              Total: <strong className="text-cyan-300 ml-1">{filteredLines.length} Linhas</strong>
            </div>
          </div>

          {/* Cards das Linhas Cadastradas (Regra 3) */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Carregando cadastro de linhas...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-400">
                Nenhuma linha produtiva encontrada.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clique no botão destacado "+ Adicionar Linha" para iniciar o cadastro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLines.map((l) => {
                const isSelected = selectedLineId === l.id

                return (
                  <Card
                    key={l.id}
                    onClick={() => loadLineOverview(l.id)}
                    className="bg-slate-950 border-slate-800 hover:border-[#004C97] text-slate-100 transition-all cursor-pointer shadow-lg hover:shadow-blue-950/40 group relative overflow-hidden"
                  >
                    {/* Barra de destaque no topo em Pantone 2945 */}
                    <div className="h-1 bg-gradient-to-r from-[#004C97] to-cyan-500 w-full" />

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-black text-xl text-white group-hover:text-cyan-300 transition-colors">
                            {l.code}
                          </span>
                          <span className="text-xs text-slate-400 block line-clamp-1">
                            {l.name}
                          </span>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold ${
                            l.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-amber-950 text-amber-300 border-amber-700'
                          }`}
                        >
                          {l.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3 text-xs">
                      <p className="text-slate-400 text-[11px] line-clamp-2 min-h-[32px]">
                        {l.description ||
                          'Recurso industrial dedicado para conformação e laminação.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/60 rounded border border-slate-800/80 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Processo
                          </span>
                          <span className="text-white truncate block">
                            {l.process || 'Conformação'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Centro SAP
                          </span>
                          <span className="text-cyan-300">{l.sap_plant_code || '1000'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Cadência Nominal
                          </span>
                          <span className="text-white font-bold">{l.current_rate || 12} t/h</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">
                            Eficiência
                          </span>
                          <span className="text-emerald-400 font-bold">{l.efficiency || 90}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          Ficha Mestre Ativa
                        </span>
                        <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
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
