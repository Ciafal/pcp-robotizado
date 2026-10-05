import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Building2,
  GitBranch,
  Factory,
  Clock,
  Calendar,
  Edit2,
  Copy,
  Trash2,
  Inbox,
  AlertTriangle,
} from 'lucide-react'
import { CentroParadaInput, programacaoParadaService } from '@/services/programacao-parada-service'

interface CentrosTableProps {
  centros: CentroParadaInput[]
  onEdit: (index: number) => void
  onDuplicate: (index: number) => void
  onDelete: (index: number) => void
  disabled?: boolean
}

export const CentrosTable: React.FC<CentrosTableProps> = ({
  centros,
  onEdit,
  onDuplicate,
  onDelete,
  disabled = false,
}) => {
  const formatDateTimeDisplay = (dtStr: string) => {
    if (!dtStr) return '-'
    // Se for formato dd/mm/aaaa HH:mm já está no padrão visual brasileiro
    if (dtStr.includes('/')) return dtStr
    // Se for ISO ou yyyy-mm-dd
    try {
      const parts = dtStr.split(' ')
      if (parts[0]?.includes('-')) {
        const [y, m, d] = parts[0].split('-')
        return `${d}/${m}/${y} ${parts[1] || '00:00'}`
      }
      return dtStr
    } catch {
      return dtStr
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-semibold py-0"
          >
            Pendente
          </Badge>
        )
      case 'CONFIRMADA':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold py-0"
          >
            Confirmada
          </Badge>
        )
      case 'EM_ANDAMENTO':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-semibold py-0 animate-pulse"
          >
            Em Andamento
          </Badge>
        )
      case 'CONCLUIDA':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-semibold py-0"
          >
            Concluída
          </Badge>
        )
      case 'CANCELADA':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-semibold py-0"
          >
            Cancelada
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-semibold py-0">
            {status || 'Pendente'}
          </Badge>
        )
    }
  }

  return (
    <Card className="border border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3 px-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-[#004C97]" />
          <CardTitle className="text-sm font-bold text-slate-800">
            Centros e Linhas Afetadas ({centros.length})
          </CardTitle>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Duração total acumulada:{' '}
          <strong className="text-slate-800 font-bold">
            {programacaoParadaService.formatarDuracao(
              centros.reduce((acc, c) => acc + (c.duracao_horas || 0), 0),
            )}
          </strong>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {centros.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Nenhum centro adicionado ainda</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilize o formulário acima para selecionar a Empresa, Linha e Centro, e clique em
              &quot;+ Adicionar Centro à Parada&quot;. Você pode incluir múltiplos centros na mesma
              programação.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 text-xs hover:bg-slate-50">
                  <TableHead className="font-bold text-slate-700 w-12 text-center">#</TableHead>
                  <TableHead className="font-bold text-slate-700">Empresa</TableHead>
                  <TableHead className="font-bold text-slate-700">Linha</TableHead>
                  <TableHead className="font-bold text-slate-700">Centro</TableHead>
                  <TableHead className="font-bold text-slate-700">Início</TableHead>
                  <TableHead className="font-bold text-slate-700">Fim</TableHead>
                  <TableHead className="font-bold text-slate-700">Duração</TableHead>
                  <TableHead className="font-bold text-slate-700">Motivo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right pr-4">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((centro, index) => {
                  const duracaoStr = programacaoParadaService.formatarDuracao(
                    centro.duracao_horas || 0,
                  )
                  return (
                    <TableRow
                      key={centro.id || `c-${index}`}
                      className="text-xs hover:bg-blue-50/30 transition-colors"
                    >
                      <TableCell className="font-mono text-center text-slate-500 font-medium">
                        {String(index + 1).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{centro.empresa_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <GitBranch className="w-3 h-3 text-slate-400" />
                          <span>{centro.linha_code}</span>
                        </div>
                        {centro.linha_nome && centro.linha_nome !== centro.linha_code && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {centro.linha_nome}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold text-[#004C97]">
                          <Factory className="w-3 h-3 text-blue-500" />
                          <span>{centro.centro_code}</span>
                        </div>
                        {centro.centro_nome && centro.centro_nome !== centro.centro_code && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {centro.centro_nome}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateTimeDisplay(centro.data_hora_inicio)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateTimeDisplay(centro.data_hora_fim)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{duracaoStr}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 truncate max-w-[180px]">
                          {centro.motivo}
                        </div>
                        {centro.motivo === 'Outro' && centro.motivo_outro && (
                          <div className="text-[10px] text-amber-700 flex items-center gap-1 truncate max-w-[180px]">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{centro.motivo_outro}</span>
                          </div>
                        )}
                        {centro.descricao && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px] italic">
                            &quot;{centro.descricao}&quot;
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(centro.status)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(index)}
                            disabled={disabled}
                            title="Editar Centro"
                            className="h-7 w-7 text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDuplicate(index)}
                            disabled={disabled}
                            title="Duplicar Centro"
                            className="h-7 w-7 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(index)}
                            disabled={disabled}
                            title="Excluir Centro"
                            className="h-7 w-7 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default CentrosTable
