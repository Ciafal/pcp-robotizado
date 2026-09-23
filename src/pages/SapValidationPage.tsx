import React, { useEffect, useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileText,
  PlusCircle,
  Database,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NovaValidacaoTab } from '@/components/sap-validation/NovaValidacaoTab'
import { CodigosValidadosTab } from '@/components/sap-validation/CodigosValidadosTab'
import { CodigosComDivergenciasTab } from '@/components/sap-validation/CodigosComDivergenciasTab'
import { CodigosSapPendentesTab } from '@/components/sap-validation/CodigosSapPendentesTab'
import { HistoricoAuditoriaTab } from '@/components/sap-validation/HistoricoAuditoriaTab'
import { RelatoriosValidacaoTab } from '@/components/sap-validation/RelatoriosValidacaoTab'
import {
  FcaIntegrationStatus,
  SapMaterialValidationRecord,
  SapValidationAuditLog,
} from '@/types/sap-validation'
import { sapValidationService } from '@/services/sap-validation-service'

export const SapValidationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('nova-validacao')
  const [fcaStatus, setFcaStatus] = useState<FcaIntegrationStatus | null>(null)
  const [validations, setValidations] = useState<SapMaterialValidationRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<SapValidationAuditLog[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar dados de integração e validações salvas
  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [status, valList, logs] = await Promise.all([
        sapValidationService.getFcaStatus(),
        sapValidationService.listValidations(),
        sapValidationService.listAuditLogs(),
      ])
      setFcaStatus(status)
      setValidations(valList)
      setAuditLogs(logs)
    } catch (err) {
      console.error('Erro ao carregar dados da página de validação:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const countValidados = validations.filter(
    (v) => v.overall_status === 'VALIDADO' || v.overall_status === 'APTO_PARA_APROVACAO',
  ).length

  const countDivergentes = validations.filter(
    (v) =>
      v.overall_status === 'DIVERGENTE' ||
      v.overall_status === 'AGUARDANDO_CORRECAO_SAP' ||
      v.divergent_fields_count > 0,
  ).length

  return (
    <div className="flex-1 space-y-5 p-6 max-w-[1600px] mx-auto w-full">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#004C97]/10 rounded-lg text-[#004C97]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Validação de Cadastro SAP
                </h1>
                <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300">
                  PCP Robotizado
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Homologação e governança de cadastros de materiais no SAP ECC com regras funcionais
                e comparação de modelos.
              </p>
            </div>
          </div>
        </div>

        {/* Indicadores Resumidos Rápidos */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              fcaStatus?.fca_configured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-xs py-1'
                : 'bg-amber-50 text-amber-800 border-amber-300 text-xs py-1'
            }
          >
            FCA SAP: {fcaStatus?.fca_configured ? 'CONECTADO' : 'NÃO CONFIGURADO'}
          </Badge>
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-700 border-slate-300 text-xs py-1"
          >
            Matriz ZVALIDA: {fcaStatus?.matrix_loaded ? 'CARREGADA' : 'AGUARDANDO IMPORTAÇÃO'}
          </Badge>
        </div>
      </div>

      {/* ABAS PRINCIPAIS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg w-full justify-start overflow-x-auto h-auto flex-wrap">
          {/* Aba 1: Nova Validação */}
          <TabsTrigger
            value="nova-validacao"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nova Validação
          </TabsTrigger>

          {/* Aba 2: Códigos Validados */}
          <TabsTrigger
            value="codigos-validados"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Códigos Validados
            {countValidados > 0 && (
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 ml-1">
                {countValidados}
              </Badge>
            )}
          </TabsTrigger>

          {/* Aba 3: Códigos com Divergências */}
          <TabsTrigger
            value="codigos-divergencias"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Códigos com Divergências
            {countDivergentes > 0 && (
              <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4 ml-1">
                {countDivergentes}
              </Badge>
            )}
          </TabsTrigger>

          {/* Aba 4: Códigos SAP Pendentes de Validação */}
          <TabsTrigger
            value="codigos-pendentes"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Códigos SAP Pendentes
          </TabsTrigger>

          {/* Aba 5: Histórico / Auditoria */}
          <TabsTrigger
            value="historico-auditoria"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <History className="w-3.5 h-3.5 text-[#004C97]" />
            Histórico / Auditoria
          </TabsTrigger>

          {/* Aba Extra: Relatórios */}
          <TabsTrigger
            value="relatorios"
            className="data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs text-xs py-2 px-3.5 gap-2 font-semibold"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* CONTEÚDO DAS ABAS */}
        <TabsContent value="nova-validacao" className="m-0 focus-visible:outline-hidden">
          <NovaValidacaoTab fcaStatus={fcaStatus} onValidationSaved={loadInitialData} />
        </TabsContent>

        <TabsContent value="codigos-validados" className="m-0 focus-visible:outline-hidden">
          <CodigosValidadosTab
            validations={validations}
            onSelectValidation={(v) => {
              setActiveTab('nova-validacao')
            }}
          />
        </TabsContent>

        <TabsContent value="codigos-divergencias" className="m-0 focus-visible:outline-hidden">
          <CodigosComDivergenciasTab
            validations={validations}
            onSelectValidation={(v) => {
              setActiveTab('nova-validacao')
            }}
          />
        </TabsContent>

        <TabsContent value="codigos-pendentes" className="m-0 focus-visible:outline-hidden">
          <CodigosSapPendentesTab
            fcaStatus={fcaStatus}
            validations={validations}
            onStartValidation={(code) => {
              setActiveTab('nova-validacao')
            }}
          />
        </TabsContent>

        <TabsContent value="historico-auditoria" className="m-0 focus-visible:outline-hidden">
          <HistoricoAuditoriaTab logs={auditLogs} onRefreshLogs={loadInitialData} />
        </TabsContent>

        <TabsContent value="relatorios" className="m-0 focus-visible:outline-hidden">
          <RelatoriosValidacaoTab
            validations={validations}
            onSelectValidation={(v) => {
              setActiveTab('nova-validacao')
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default SapValidationPage
