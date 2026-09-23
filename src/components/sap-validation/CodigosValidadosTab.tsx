import React, { useState } from 'react'
import {
  CheckCircle2,
  Search,
  Filter,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Building,
  User,
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
import { SapMaterialValidationRecord } from '@/types/sap-validation'

interface CodigosValidadosTabProps {
  validations: SapMaterialValidationRecord[]
  onSelectValidation: (val: SapMaterialValidationRecord) => void
}

export const CodigosValidadosTab: React.FC<CodigosValidadosTabProps> = ({
  validations,
  onSelectValidation,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [centerFilter, setCenterFilter] = useState('ALL')

  const validados = validations.filter(
    (v) => v.overall_status === 'VALIDADO' || v.overall_status === 'APTO_PARA_APROVACAO',
  )

  const filtered = validados.filter((v) => {
    const matchesSearch =
      v.material_new_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.material_model_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.material_new_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.validation_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCenter = centerFilter === 'ALL' || v.center === centerFilter
    return matchesSearch && matchesCenter
  })

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por código, descrição ou validação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs bg-white border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
              Total Validados: {filtered.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Validados */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Relação de Códigos SAP Homologados e Validados
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              Apenas cadastros com 100% de conformidade ou aprovação formal
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 text-[11px] text-slate-600">
              <TableRow>
                <TableHead>Validação</TableHead>
                <TableHead>Código Novo</TableHead>
                <TableHead>Descrição Material</TableHead>
                <TableHead>Código Modelo</TableHead>
                <TableHead>Centro</TableHead>
                <TableHead>Tipo Mat.</TableHead>
                <TableHead>Conformidade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data Validação</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                    Nenhum código SAP validado registrado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/80 cursor-pointer"
                    onClick={() => onSelectValidation(item)}
                  >
                    <TableCell className="font-mono font-bold text-[#004C97]">
                      {item.validation_code}{' '}
                      <span className="text-[10px] text-slate-400">R{item.revision_number}</span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-slate-900">
                      {item.material_new_code}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 max-w-[200px] truncate">
                      {item.material_new_desc || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {item.material_model_code}
                    </TableCell>
                    <TableCell>{item.center || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {item.material_type || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {item.compliance_percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {item.responsible_user_name || '—'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-[11px]">
                      {item.completed_at
                        ? new Date(item.completed_at).toLocaleDateString('pt-BR')
                        : new Date(item.created).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-[#004C97]">
                        Ver Detalhes
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
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
