import React, { useState } from 'react'
import {
  Database,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  Server,
  Shield,
  Layers,
  Code,
  Tag,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { SapIntegrationDefinition } from '@/types/line-master'
import { sapIntegrationService, BapiTestResult } from '@/services/sap-integration'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface SapIntegrationCatalogModalProps {
  open: boolean
  onClose: () => void
  catalog: SapIntegrationDefinition[]
  onRefresh: () => void
}

export const SapIntegrationCatalogModal: React.FC<SapIntegrationCatalogModalProps> = ({
  open,
  onClose,
  catalog,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<BapiTestResult | null>(null)
  const [isTestResultOpen, setIsTestResultOpen] = useState<boolean>(false)

  // Modal Novo Cadastro
  const [isNewEntryOpen, setIsNewEntryOpen] = useState<boolean>(false)
  const [newCode, setNewCode] = useState<string>('')
  const [newDescription, setNewDescription] = useState<string>('')
  const [newType, setNewType] = useState<string>('RFC_BAPI')
  const [newFunctionName, setNewFunctionName] = useState<string>('')
  const [newStandardOrZ, setNewStandardOrZ] = useState<'STANDARD' | 'Z_CUSTOM'>('STANDARD')
  const [newSourceObject, setNewSourceObject] = useState<string>('')
  const [newResponsible, setNewResponsible] = useState<string>('Equipe ABAP / Basis CIAFAL')

  if (!open) return null

  const filteredCatalog = catalog.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.function_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleTestEntry = async (entry: SapIntegrationDefinition) => {
    setTestingId(entry.id)
    try {
      const res = await sapIntegrationService.testBapi({
        function_name: entry.function_name,
        standard_or_z: entry.standard_or_z,
      })
      setTestResult(res)
      setIsTestResultOpen(true)
      if (res.success) {
        toast({
          title: 'Conexão SAP Validada',
          description: `BAPI ${entry.function_name} respondeu com sucesso no SAP ECC CIAFAL.`,
        })
        onRefresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Validação SAP',
          description: res.message || 'Módulo de função não encontrado.',
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Comunicação RFC',
        description: err.message,
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleCreateEntry = async () => {
    if (!newCode || !newDescription || !newFunctionName) {
      toast({
        variant: 'destructive',
        title: 'Campos Obrigatórios',
        description: 'Código, descrição e nome da função SAP são obrigatórios.',
      })
      return
    }

    try {
      // 1. Validar a BAPI no backend antes de salvar
      const testRes = await sapIntegrationService.testBapi({
        function_name: newFunctionName,
        standard_or_z: newStandardOrZ,
      })

      if (!testRes.success) {
        toast({
          variant: 'destructive',
          title: 'Validação SAP Recusada',
          description: testRes.message,
        })
        return
      }

      await sapIntegrationService.saveCatalogEntry({
        code: newCode.trim().toUpperCase(),
        description: newDescription.trim(),
        integration_type: newType as any,
        function_name: newFunctionName.trim().toUpperCase(),
        standard_or_z: newStandardOrZ,
        source_object: newSourceObject.trim(),
        technical_responsible: newResponsible.trim(),
        active: true,
        last_status: 'CONECTADO',
        last_test: new Date().toISOString(),
        environment: 'PRD (ECC 6.0 EHP8)',
        system_version: newStandardOrZ === 'Z_CUSTOM' ? 'CUSTOM CIAFAL v1.0' : 'SAP ECC 6.08',
      })

      toast({
        title: 'Integração SAP Homologada',
        description: `Definição ${newCode} adicionada ao catálogo central de integrações do PCP.`,
      })

      setIsNewEntryOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar integração',
        description: err.message,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header em Pantone 2945 */}
        <div className="bg-[#004C97] p-5 text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-950/60 rounded-lg border border-blue-400/30">
              <Database className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Catálogo Central de Integrações SAP do PCP (SapIntegrationDefinition)
              </h2>
              <p className="text-xs text-blue-100/80">
                Governança centralizada de RFCs, BAPIs Standard e Funções Z Customizadas CIAFAL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Can permission="pcp.sap.integration.manage">
              <Button
                size="sm"
                onClick={() => setIsNewEntryOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold gap-1.5 h-8 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Integração SAP
              </Button>
            </Can>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-800 h-8 text-xs font-semibold"
            >
              Fechar [ESC]
            </Button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por código, descrição ou função SAP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Total Cadastradas:</span>
            <Badge className="bg-slate-800 text-cyan-300 font-mono text-xs font-bold">
              {catalog.length} integrações
            </Badge>
          </div>
        </div>

        {/* Lista do Catálogo */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {filteredCatalog.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Server className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm">Nenhuma definição de integração SAP encontrada.</p>
            </div>
          ) : (
            filteredCatalog.map((item) => {
              const isZ = item.standard_or_z === 'Z_CUSTOM'
              const isOk = item.last_status === 'CONECTADO'

              return (
                <div
                  key={item.id}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-white text-sm">{item.code}</span>
                      <Badge
                        className={`text-[10px] font-bold ${
                          isZ
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        }`}
                      >
                        {isZ ? 'CUSTOM CIAFAL (Z)' : 'STANDARD SAP'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          isOk
                            ? 'border-emerald-600 text-emerald-400 bg-emerald-950/40'
                            : 'border-rose-600 text-rose-400 bg-rose-950/40'
                        }`}
                      >
                        {item.last_status}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Tipo: {item.integration_type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1 font-mono text-cyan-400">
                        <Code className="w-3.5 h-3.5" />
                        <span>{item.function_name}</span>
                      </div>
                      {item.source_object && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                          <span>Tabelas/Objetos: {item.source_object}</span>
                        </div>
                      )}
                      {item.technical_responsible && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-slate-500" />
                          <span>Resp: {item.technical_responsible}</span>
                        </div>
                      )}
                      {item.last_sync_records_count !== undefined && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Layers className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Registros Sinc.: {item.last_sync_records_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleTestEntry(item)}
                      disabled={testingId === item.id}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 text-xs font-semibold h-8 gap-1.5"
                    >
                      {testingId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Testar BAPI / RFC
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>SAP Gateway ECC 6.08 CIAFAL — Conexão RFC-Enabled Homologada</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Arquitetura de Reutilização Centralizada (Regra 32 e 33)
          </span>
        </div>
      </div>

      {/* Modal Resultado do Teste BAPI */}
      <Dialog open={isTestResultOpen} onOpenChange={setIsTestResultOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              Resultado da Verificação RFC / BAPI SAP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Resposta retornada pelo SAP Connector CIAFAL.
            </DialogDescription>
          </DialogHeader>

          {testResult && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Módulo de Função:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {testResult.function_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classificação:</span>
                  <Badge className="bg-slate-800 text-amber-300 text-[10px]">
                    {testResult.classification}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ambiente SAP:</span>
                  <span className="text-slate-200">{testResult.system}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status de Conectividade:</span>
                  <Badge
                    className={
                      testResult.success
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : 'bg-rose-950 text-rose-300 border-rose-600'
                    }
                  >
                    {testResult.status}
                  </Badge>
                </div>
              </div>

              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                }`}
              >
                {testResult.message || testResult.metadata?.message}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsTestResultOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
            >
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Definição SAP */}
      <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Cadastrar Nova Definição de Integração SAP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Código de Referência Central</Label>
              <Input
                placeholder="Ex: SAP_BAPI_PROD_RATES"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição Funcional</Label>
              <Input
                placeholder="Ex: Leitura de cadência e tempos de roteiro do centro de trabalho"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tipo de Módulo</Label>
                <select
                  value={newStandardOrZ}
                  onChange={(e) => setNewStandardOrZ(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="STANDARD">STANDARD SAP (BAPI_ / RFC_)</option>
                  <option value="Z_CUSTOM">CUSTOM CIAFAL (Z_ / Y_)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Protocolo de Integração</Label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="RFC_BAPI">RFC_BAPI (Chamada Direta)</option>
                  <option value="IDOC">IDOC</option>
                  <option value="ODATA">ODATA Gateway</option>
                  <option value="PI_PO">SAP PI / PO</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Nome do Módulo de Função SAP</Label>
              <Input
                placeholder={
                  newStandardOrZ === 'STANDARD'
                    ? 'Ex: BAPI_ROUTING_GET_DETAIL'
                    : 'Ex: Z_CIAFAL_PCP_RAW_MAT_PRIORITY'
                }
                value={newFunctionName}
                onChange={(e) => setNewFunctionName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-cyan-300 font-mono font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tabelas / Objetos Fonte</Label>
                <Input
                  placeholder="Ex: CRHD / AFVC / MAPL"
                  value={newSourceObject}
                  onChange={(e) => setNewSourceObject(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Responsável Técnico</Label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewEntryOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateEntry}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs"
            >
              Testar no SAP & Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
