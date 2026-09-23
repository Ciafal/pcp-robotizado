import React, { useState } from 'react'
import {
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Layers,
  ArrowRight,
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

interface CodigosComDivergenciasTabProps {
  validations: SapMaterialValidationRecord[]
  onSelectValidation: (val: SapMaterialValidationRecord) => void
  onRevalidate?: (val: SapMaterialValidationRecord) => void
}

export const CodigosComDivergenciasTab: React.FC<CodigosComDivergenciasTabProps> = ({
  validations,
  onSelectValidation,
  onRevalidate,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const divergentes = validations.filter(
    (v) =>
      v.overall_status === 'DIVERGENTE' ||
      v.overall_status === 'AGUARDANDO_CORRECAO_SAP' ||
      v.divergent_fields_count > 0,
  )

  const filtered = divergentes.filter((v) => {
    return (
      v.material_new_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.material_model_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.material_new_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.validation_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-4">
      {/* Topo Informativo */}
      <Card className="border-red-200 bg-red-50/20 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <div className="font-bold text-xs text-red-950 uppercase tracking-wider">
                Cadastros SAP com Divergências Identificadas
              </div>
              <p className="text-[11px] text-slate-600">
                Itens que não atendem integralmente à matriz ou ao modelo de referência. É proibido
                marcar VALIDADO com campos divergentes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 text-white text-xs">
              {filtered.length} Materiais com Pendência
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Busca */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar divergências por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs bg-white border-slate-300"
          />
        </div>
      </div>

      {/* Tabela de Divergências */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800">
            Fila de Materiais com Divergências para Correção no SAP
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
                <TableHead>Status Geral</TableHead>
                <TableHead>Divergências</TableHead>
                <TableHead>Conformidade</TableHead>
                <TableHead>Última Consulta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                    Nenhum código SAP com divergência registrado no momento.
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
                    <TableCell className="font-medium text-slate-700 max-w-[180px] truncate">
                      {item.material_new_desc || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {item.material_model_code}
                    </TableCell>
                    <TableCell>{item.center || '—'}</TableCell>
                    <TableCell>
                      <Badge className="bg-red-600 text-white text-[10px]">
                        {item.overall_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-red-300 text-red-700 bg-red-50 text-[10px] font-bold"
                      >
                        {item.divergent_fields_count} campos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-800">
                        {item.compliance_percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500">
                      {item.sap_last_queried_at
                        ? new Date(item.sap_last_queried_at).toLocaleDateString('pt-BR')
                        : new Date(item.updated).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-slate-300 text-[#004C97]"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectValidation(item)
                        }}
                      >
                        Ver Divergências
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
