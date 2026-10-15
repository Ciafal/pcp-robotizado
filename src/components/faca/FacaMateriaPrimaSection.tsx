import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { FacaMateriaPrimaDetalhe } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaMateriaPrimaSectionProps {
  materiasPrimas: FacaMateriaPrimaDetalhe[]
}

export const FacaMateriaPrimaSection: React.FC<FacaMateriaPrimaSectionProps> = ({
  materiasPrimas,
}) => {
  return (
    <Card className="border border-slate-200 bg-white shadow-xs">
      <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#004C97]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Seção Exclusiva: Matéria-Prima FACA (Palanquilhas & Blocos Técnicos)
              </CardTitle>
              <div className="text-[10px] text-slate-500">
                Consumo reservado, deduções técnicas sem duplicidade e rendimentos nominais da Ficha
                Mestra
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold"
          >
            Fórmula: MP Necessária = PA a Produzir / Rendimento
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
          <Table className="text-xs">
            <TableHeader className="bg-slate-100/70 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Código MP</TableHead>
                <TableHead className="font-bold text-slate-700 min-w-[200px]">
                  Descrição Técnica
                </TableHead>
                <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                  Aço / Bitola
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-center">
                  Centro / Depósito
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                  Estoque Físico (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap text-[#004C97]">
                  Disponível Livre (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                  CQ (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap text-slate-800">
                  MP Necessária (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                  Rendimento (%)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                  Perdas (%)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap text-emerald-800">
                  Produção Possível (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                  Saldo Futuro (t)
                </TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Suficiência</TableHead>
                <TableHead className="font-bold text-slate-700 min-w-[200px]">
                  Alerta Técnico
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiasPrimas.map((mp) => {
                const isCritico = mp.status_suficiencia === 'CRITICO'
                const isAtencao = mp.status_suficiencia === 'ATENCAO'
                return (
                  <TableRow
                    key={mp.codigo_mp}
                    className="hover:bg-blue-50/30 border-b border-slate-100"
                  >
                    <TableCell className="font-mono font-bold text-[#004C97] whitespace-nowrap">
                      {mp.codigo_mp}
                    </TableCell>
                    <TableCell className="text-slate-800 font-medium">{mp.descricao_mp}</TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {mp.tipo_aco} &bull; {mp.dimensoes}
                    </TableCell>
                    <TableCell className="text-center font-mono text-slate-600 whitespace-nowrap">
                      {mp.centro} / {mp.deposito}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 font-semibold whitespace-nowrap">
                      {formatNumberPtBr(mp.estoque_fisico_t, 1)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-[#004C97] whitespace-nowrap">
                      {formatNumberPtBr(mp.estoque_disponivel_t, 1)}
                    </TableCell>
                    <TableCell className="text-right text-slate-500 whitespace-nowrap">
                      {formatNumberPtBr(mp.estoque_qualidade_t, 1)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-slate-800 whitespace-nowrap">
                      {formatNumberPtBr(mp.mp_necessaria_carteira_t, 1)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">
                      {(mp.rendimento_transformacao * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-700 whitespace-nowrap">
                      {mp.perdas_previstas_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-emerald-800 whitespace-nowrap">
                      {formatNumberPtBr(mp.producao_possivel_estoque_t, 1)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-extrabold whitespace-nowrap ${
                        mp.saldo_apos_atendimento_t < 0 ? 'text-rose-700' : 'text-slate-800'
                      }`}
                    >
                      {formatNumberPtBr(mp.saldo_apos_atendimento_t, 1)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {isCritico ? (
                        <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Déficit
                        </Badge>
                      ) : isAtencao ? (
                        <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-semibold">
                          <Info className="w-3 h-3" /> Atenção
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Suficiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-[11px]">{mp.alerta}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
