import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { lineMasterService } from '@/services/line-master'
import { authService } from '@/services/pcp-auth'
import { FullLineMasterBundle, LineMaster, ResourceType } from '@/types/line-master'
import { ProductionLine, UserProfile } from '@/types/pcp-auth'
import {
  Sliders,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Gauge,
  Factory,
  ChevronRight,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LineMasterDetailView } from '@/components/line-master/LineMasterDetailView'
import { SecurityTestSuiteModal } from '@/components/auth/SecurityTestSuiteModal'
import { useToast } from '@/hooks/use-toast'

export const LineMasterPage: React.FC = () => {
  const { user, can, hasLineScope } = useAuth()
  const { toast } = useToast()

  const [lines, setLines] = useState<ProductionLine[]>([])
  const [activeMasters, setActiveMasters] = useState<LineMaster[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL')
  const [selectedReadyStatus, setSelectedReadyStatus] = useState<string>('ALL')
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL')

  // Detalhe
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [bundle, setBundle] = useState<FullLineMasterBundle | null>(null)
  const [loadingBundle, setLoadingBundle] = useState<boolean>(false)

  // Modal de Testes
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [linesData, mastersData, usersData] = await Promise.all([
        authService.listProductionLines(),
        lineMasterService.listAllActiveMasters(),
        authService.listUsers(),
      ])
      setLines(linesData)
      setActiveMasters(mastersData)
      setUsers(usersData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar Fichas Mestres',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectLine = async (lineId: string) => {
    try {
      setLoadingBundle(true)
      setSelectedLineId(lineId)
      const fullBundle = await lineMasterService.getFullBundle(lineId)
      setBundle(fullBundle)
    } catch (err: any) {
      toast({
        title: 'Falha ao carregar detalhes',
        description: err.message,
        variant: 'destructive',
      })
      setSelectedLineId(null)
    } finally {
      setLoadingBundle(false)
    }
  }

  const handleBackToList = () => {
    setSelectedLineId(null)
    setBundle(null)
    loadData()
  }

  // Filtragem
  const filteredLines = lines.filter((line) => {
    const master = activeMasters.find((m) => m.line_id === line.id)
    const matchesSearch =
      line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (master?.sector && master.sector.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType =
      selectedResourceType === 'ALL' || master?.resource_type === selectedResourceType

    const matchesReady =
      selectedReadyStatus === 'ALL' ||
      (selectedReadyStatus === 'READY' && master?.ready_for_scheduling === true) ||
      (selectedReadyStatus === 'NOT_READY' && master?.ready_for_scheduling === false)

    const matchesUnit = selectedUnit === 'ALL' || master?.unit === selectedUnit

    return matchesSearch && matchesType && matchesReady && matchesUnit
  })

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#004C97] flex items-center justify-center text-white shadow-md border border-blue-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Ficha Mestre das Linhas
              </h1>
              <p className="text-xs text-slate-400">
                Cadastro técnico estrutural e versionado dos recursos utilizados no planejamento e
                programação da produção.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs gap-1.5 shadow"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Suíte de Segurança
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-300 text-xs gap-1.5 shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {selectedLineId && bundle ? (
        <LineMasterDetailView
          bundle={bundle}
          users={users}
          onRefresh={() => handleSelectLine(selectedLineId)}
          onBack={handleBackToList}
        />
      ) : (
        <>
          {/* Filtros e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-lg">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Buscar Recurso / Linha
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Nome, código ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-950 border-slate-800 text-white h-8 text-xs placeholder:text-slate-600 focus-visible:ring-[#004C97]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Tipo de Recurso
              </label>
              <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-8 text-xs">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  <SelectItem value="PRODUCTION_LINE">Linha de Produção</SelectItem>
                  <SelectItem value="FURNACE">Forno Industrial</SelectItem>
                  <SelectItem value="FINISHING">Acabamento</SelectItem>
                  <SelectItem value="STRAIGHTENER">Endireitadeira</SelectItem>
                  <SelectItem value="REWORK">Retrabalho</SelectItem>
                  <SelectItem value="AUXILIARY_PROCESS">Processo Auxiliar</SelectItem>
                  <SelectItem value="STORAGE">Armazenamento / Buffer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Prontidão de Sequenciamento
              </label>
              <Select value={selectedReadyStatus} onValueChange={setSelectedReadyStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-8 text-xs">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="READY">✓ Pronta para Programação</SelectItem>
                  <SelectItem value="NOT_READY">✕ Configuração Incompleta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Unidade Operacional
              </label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-8 text-xs">
                  <SelectValue placeholder="Todas as Unidades" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="ALL">Todas as Unidades</SelectItem>
                  <SelectItem value="Planta Principal CIAFAL">Planta Principal CIAFAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid de Cards das Linhas / Recursos */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004C97]" />
              <p className="text-xs">Carregando Fichas Mestres...</p>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 space-y-2">
              <Factory className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Nenhum recurso encontrado.</p>
              <p className="text-xs">Ajuste os filtros de busca ou permissões de escopo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLines.map((line) => {
                const master = activeMasters.find((m) => m.line_id === line.id)
                const inScope = hasLineScope(line.id)
                const primaryResp = users.find((u) => u.id === master?.primary_responsible_id)

                return (
                  <Card
                    key={line.id}
                    className="bg-slate-900 border-slate-800 text-slate-100 hover:border-[#004C97] transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg group relative"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#004C97] to-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#004C97] text-white font-mono text-[11px] border border-blue-400/40">
                            {line.code}
                          </Badge>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {master?.resource_type || 'PRODUCTION_LINE'}
                          </span>
                        </div>

                        {master?.ready_for_scheduling ? (
                          <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            PRONTA
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            INCOMPLETA
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-base font-bold text-white mt-2 group-hover:text-blue-300 transition-colors">
                        {master?.name || line.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400 line-clamp-2">
                        {master?.sector || 'Setor Fabril'} &bull;{' '}
                        {master?.process_step || 'Processo Contínuo'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3 text-xs flex-1">
                      {/* Parametros Principais */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Capacidade Nominal
                          </span>
                          <span className="font-bold text-white font-mono">
                            {master?.nominal_hourly_capacity || line.target_rate || 0}{' '}
                            {master?.capacity_unit || 't/h'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Versão da Ficha</span>
                          <span className="font-bold text-cyan-300">
                            V{master?.version || 1} ({master?.status || 'ACTIVE'})
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Completude</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#004C97] h-full"
                                style={{ width: `${master?.completeness_score || 80}%` }}
                              />
                            </div>
                            <span className="font-bold text-[10px] text-slate-300">
                              {master?.completeness_score || 80}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Responsável</span>
                          <span className="text-slate-300 truncate block text-[11px]">
                            {primaryResp ? primaryResp.name.split(' ')[0] : 'PCP Central'}
                          </span>
                        </div>
                      </div>

                      {!inScope && (
                        <div className="p-2 rounded bg-amber-950/30 border border-amber-900/50 text-[10px] text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Fora do escopo de escrita do seu usuário. Modo somente leitura.
                          </span>
                        </div>
                      )}
                    </CardContent>

                    <div className="p-4 pt-0 border-t border-slate-800/60 mt-auto flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        SAP Plant: {master?.sap_plant_code || '1000'}
                      </span>

                      <Button
                        size="sm"
                        onClick={() => handleSelectLine(line.id)}
                        className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold gap-1 shadow h-8"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Abrir Ficha Técnica
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de Segurança */}
      <SecurityTestSuiteModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />
    </div>
  )
}
export default LineMasterPage
