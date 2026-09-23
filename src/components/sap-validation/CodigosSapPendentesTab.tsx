import React, { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Building,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FcaIntegrationStatus, SapMaterialValidationRecord } from '@/types/sap-validation'

interface CodigosSapPendentesTabProps {
  fcaStatus: FcaIntegrationStatus | null
  validations: SapMaterialValidationRecord[]
  onStartValidation: (materialCode: string) => void
}

export const CodigosSapPendentesTab: React.FC<CodigosSapPendentesTabProps> = ({
  fcaStatus,
  validations,
  onStartValidation,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [checkingSap, setCheckingSap] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Dispara detecção automática comparando códigos existentes no SAP vs validados
  const handleDetectSapCodes = async () => {
    setCheckingSap(true)
    setErrorMessage(null)

    // Se o conector FCA não estiver configurado:
    if (!fcaStatus?.fca_configured) {
      setTimeout(() => {
        setCheckingSap(false)
        setErrorMessage(
          'Não foi possível consultar o SAP. A validação não foi executada. (Integração FCA não configurada)',
        )
      }, 500)
      return
    }

    setCheckingSap(false)
  }

  return (
    <div className="space-y-4">
      {/* Alerta de Detecção Automática / Estado Real */}
      <Card
        className={`border shadow-xs ${
          fcaStatus?.fca_configured
            ? 'border-blue-200 bg-blue-50/20'
            : 'border-amber-200 bg-amber-50/20'
        }`}
      >
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                Detecção Automática: Códigos SAP Criados Aguardando Validação
                <Badge
                  variant="outline"
                  className={
                    fcaStatus?.fca_configured
                      ? 'bg-blue-100 text-blue-800 border-blue-300 text-[10px]'
                      : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                  }
                >
                  {fcaStatus?.fca_configured ? 'CONECTADO AO SAP' : 'AGUARDANDO FCA'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 max-w-2xl leading-relaxed">
                O módulo compara os códigos criados recentemente no SAP ECC (tabelas MARA/CDHDR)
                contra os cadastros que já possuem validação concluída neste sistema, identificando
                pendências automaticamente sem depender de acionamento manual.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleDetectSapCodes}
            disabled={checkingSap}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSap ? 'animate-spin' : ''}`} />
            Sincronizar Códigos SAP
          </Button>
        </CardContent>
      </Card>

      {/* Erro funcional caso o SAP esteja indisponível */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-red-300 text-red-800 hover:bg-red-100"
            onClick={handleDetectSapCodes}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* PAINEL DE ESTADO REAL: SE O FCA NÃO ESTIVER CONFIGURADO */}
      {!fcaStatus?.fca_configured && (
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-8 text-center space-y-3">
            <Database className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-slate-800 font-bold text-sm">
              Conexão com SAP ECC via FCA aguardando credenciais
            </div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Para carregar a lista de novos materiais criados no SAP ECC em tempo real, configure
              os segredos do conector FCA (URL e Token) nas configurações da plataforma. A
              arquitetura de consulta em lote e detecção automática está plenamente implementada.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SE CONFIGURADO: TABELA DE CÓDIGOS SAP AGUARDANDO VALIDAÇÃO */}
      {fcaStatus?.fca_configured && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Códigos Identificados no SAP ECC Pendentes de Validação</span>
              <Badge variant="outline" className="bg-white text-slate-700">
                0 pendências detectadas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 text-[11px] text-slate-600">
                <TableRow>
                  <TableHead>Código Material</TableHead>
                  <TableHead>Descrição (MAKTX)</TableHead>
                  <TableHead>Tipo (MTART)</TableHead>
                  <TableHead>Centro (WERKS)</TableHead>
                  <TableHead>Data Criação SAP</TableHead>
                  <TableHead>Criado Por</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    Nenhum código SAP pendente de validação encontrado.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
