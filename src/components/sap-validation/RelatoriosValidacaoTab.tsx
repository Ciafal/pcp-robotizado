import React, { useState } from 'react'
import {
  FileText,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SapMaterialValidationRecord } from '@/types/sap-validation'

interface RelatoriosValidacaoTabProps {
  validations: SapMaterialValidationRecord[]
  onSelectValidation: (val: SapMaterialValidationRecord) => void
}

export const RelatoriosValidacaoTab: React.FC<RelatoriosValidacaoTabProps> = ({
  validations,
  onSelectValidation,
}) => {
  const [reportType, setReportType] = useState<
    'GERAL' | 'VALIDADOS' | 'DIVERGENTES' | 'PENDENTES_CORRECAO'
  >('GERAL')
  const [searchNewCode, setSearchNewCode] = useState('')
  const [searchModelCode, setSearchModelCode] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [centerFilter, setCenterFilter] = useState('ALL')

  // Filtros aplicados
  const filtered = validations.filter((v) => {
    const matchNew =
      !searchNewCode || v.material_new_code.toLowerCase().includes(searchNewCode.toLowerCase())
    const matchModel =
      !searchModelCode ||
      v.material_model_code.toLowerCase().includes(searchModelCode.toLowerCase())
    const matchCenter = centerFilter === 'ALL' || v.center === centerFilter
    const matchStatus = statusFilter === 'ALL' || v.overall_status === statusFilter

    if (reportType === 'VALIDADOS') {
      return (
        matchNew &&
        matchModel &&
        matchCenter &&
        (v.overall_status === 'VALIDADO' || v.overall_status === 'APTO_PARA_APROVACAO')
      )
    }
    if (reportType === 'DIVERGENTES') {
      return (
        matchNew &&
        matchModel &&
        matchCenter &&
        (v.overall_status === 'DIVERGENTE' || v.divergent_fields_count > 0)
      )
    }
    if (reportType === 'PENDENTES_CORRECAO') {
      return matchNew && matchModel && matchCenter && v.overall_status === 'AGUARDANDO_CORRECAO_SAP'
    }

    return matchNew && matchModel && matchCenter && matchStatus
  })

  // Exportar dados como CSV estruturado
  const handleExportCsv = () => {
    if (filtered.length === 0) return

    const headers = [
      'Código Validação',
      'Revisão',
      'Código Novo',
      'Descrição Novo',
      'Código Modelo',
      'Descrição Modelo',
      'Centro',
      'Tipo Material',
      'Criado SAP Em',
      'Data Validação',
      'Responsável',
      'Status Geral',
      '% Conformidade',
      'Qtd Divergências',
    ]

    const rows = filtered.map((v) => [
      v.validation_code,
      v.revision_number,
      v.material_new_code,
      `"${(v.material_new_desc || '').replace(/"/g, '""')}"`,
      v.material_model_code,
      `"${(v.material_model_desc || '').replace(/"/g, '""')}"`,
      v.center || '',
      v.material_type || '',
      v.created_at_sap || '',
      v.completed_at || v.created,
      `"${(v.responsible_user_name || '').replace(/"/g, '""')}"`,
      v.overall_status,
      v.compliance_percentage,
      v.divergent_fields_count,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Relatorio_Validacao_Cadastro_SAP_${reportType}_${Date.now()}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Barra Superior com Seleção de Relatório e Exportação */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#004C97]" />
              Relatórios Executivos de Validação de Materiais SAP
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
                className="border-slate-300 text-xs text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Seletor de Tipo de Relatório */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={reportType === 'GERAL' ? 'default' : 'outline'}
              className={
                reportType === 'GERAL'
                  ? 'bg-[#004C97] text-white text-xs'
                  : 'text-xs border-slate-300'
              }
              onClick={() => setReportType('GERAL')}
            >
              Relatório Geral Consolidado
            </Button>
            <Button
              size="sm"
              variant={reportType === 'VALIDADOS' ? 'default' : 'outline'}
              className={
                reportType === 'VALIDADOS'
                  ? 'bg-emerald-600 text-white text-xs'
                  : 'text-xs border-slate-300'
              }
              onClick={() => setReportType('VALIDADOS')}
            >
              Códigos Validados
            </Button>
            <Button
              size="sm"
              variant={reportType === 'DIVERGENTES' ? 'default' : 'outline'}
              className={
                reportType === 'DIVERGENTES'
                  ? 'bg-red-600 text-white text-xs'
                  : 'text-xs border-slate-300'
              }
              onClick={() => setReportType('DIVERGENTES')}
            >
              Códigos com Divergências
            </Button>
            <Button
              size="sm"
              variant={reportType === 'PENDENTES_CORRECAO' ? 'default' : 'outline'}
              className={
                reportType === 'PENDENTES_CORRECAO'
                  ? 'bg-amber-600 text-white text-xs'
                  : 'text-xs border-slate-300'
              }
              onClick={() => setReportType('PENDENTES_CORRECAO')}
            >
              Pendentes de Correção no SAP
            </Button>
          </div>

          {/* Filtros em Linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Código Novo
              </label>
              <Input
                placeholder="Ex: 10002941"
                value={searchNewCode}
                onChange={(e) => setSearchNewCode(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Código Modelo
              </label>
              <Input
                placeholder="Ex: 10001872"
                value={searchModelCode}
                onChange={(e) => setSearchModelCode(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Status Geral
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="AGUARDANDO_VALIDACAO">Aguardando Validação</SelectItem>
                  <SelectItem value="EM_VALIDACAO">Em Validação</SelectItem>
                  <SelectItem value="DIVERGENTE">Divergente</SelectItem>
                  <SelectItem value="AGUARDANDO_CORRECAO_SAP">Aguardando Correção SAP</SelectItem>
                  <SelectItem value="APTO_PARA_APROVACAO">Apto para Aprovação</SelectItem>
                  <SelectItem value="VALIDADO">Validado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Centro (WERKS)
              </label>
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Todos os Centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Centros</SelectItem>
                  <SelectItem value="1100">1100 (Matriz)</SelectItem>
                  <SelectItem value="1200">1200 (Filial)</SelectItem>
                  <SelectItem value="2100">2100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela do Relatório */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 text-[11px] text-slate-600">
              <TableRow>
                <TableHead>Código Novo</TableHead>
                <TableHead>Descrição Material Novo</TableHead>
                <TableHead>Código Modelo</TableHead>
                <TableHead>Descrição Modelo</TableHead>
                <TableHead>Centro</TableHead>
                <TableHead>Tipo Mat.</TableHead>
                <TableHead>Criado no SAP em</TableHead>
                <TableHead>Data Validação</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status Geral</TableHead>
                <TableHead>% Conf.</TableHead>
                <TableHead>Qtd Diverg.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-slate-500">
                    Nenhum registro encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => onSelectValidation(item)}
                  >
                    <TableCell className="font-mono font-bold text-slate-900">
                      {item.material_new_code}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 max-w-[150px] truncate">
                      {item.material_new_desc || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {item.material_model_code}
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-[150px] truncate">
                      {item.material_model_desc || '—'}
                    </TableCell>
                    <TableCell>{item.center || '—'}</TableCell>
                    <TableCell>{item.material_type || '—'}</TableCell>
                    <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">
                      {item.created_at_sap || '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">
                      {item.completed_at
                        ? new Date(item.completed_at).toLocaleDateString('pt-BR')
                        : new Date(item.created).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {item.responsible_user_name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.overall_status === 'VALIDADO'
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : item.overall_status === 'DIVERGENTE'
                              ? 'bg-red-600 text-white text-[10px]'
                              : 'bg-amber-500 text-white text-[10px]'
                        }
                      >
                        {item.overall_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      {item.compliance_percentage}%
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          item.divergent_fields_count > 0
                            ? 'text-red-600 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {item.divergent_fields_count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
