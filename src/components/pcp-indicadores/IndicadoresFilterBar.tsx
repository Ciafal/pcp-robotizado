import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FiltrosMatrizIndicadores } from '@/services/pcp-indicadores-service'

interface IndicadoresFilterBarProps {
  filtros: FiltrosMatrizIndicadores
  onChangeFiltros: (novos: Partial<FiltrosMatrizIndicadores>) => void
  onRecarregar: () => void
  carregando?: boolean
}

export const IndicadoresFilterBar: React.FC<IndicadoresFilterBarProps> = ({
  filtros,
  onChangeFiltros,
  onRecarregar,
  carregando = false,
}) => {
  const empresas = [
    { value: 'TODAS', label: 'Todas as Empresas' },
    { value: 'CIAFAL', label: 'CIAFAL (1000)' },
    { value: 'SIDERMET', label: 'SIDERMET (2000)' },
  ]

  const linhas = [
    { value: 'TODAS', label: 'Todas as Linhas' },
    { value: 'L1', label: 'Linha 1 — Perfis Leves' },
    { value: 'L2', label: 'Linha 2 — Perfis Pesados' },
    { value: 'ENF_L1', label: 'Enfornamento L1' },
    { value: 'CORTE_SDC', label: 'Corte Transversal SDC' },
  ]

  const centros = [
    { value: 'TODOS', label: 'Todos os Centros' },
    { value: 'SEML1', label: 'SEML1 — Centro Laminação 1' },
    { value: 'SEML2', label: 'SEML2 — Centro Laminação 2' },
    { value: 'FORNO1', label: 'FORNO1 — Forno de Reaquecimento' },
    { value: 'SDC01', label: 'SDC01 — Centro de Serviços' },
  ]

  const anos = [2027, 2026, 2025, 2024]

  const tiposIndicador = [
    { value: 'TODOS', label: 'Todos os Tipos' },
    { value: 'PROGRAMACAO', label: 'Programação' },
    { value: 'EFICIENCIA', label: 'Eficiência' },
    { value: 'CARTEIRA', label: 'Carteira' },
    { value: 'CAPACIDADE', label: 'Capacidade' },
    { value: 'MATERIA_PRIMA', label: 'Matéria-Prima' },
    { value: 'QUALIDADE', label: 'Qualidade' },
  ]

  const statusOpcoes = [
    { value: 'TODOS', label: 'Todos os Status' },
    { value: 'ATINGIDO', label: 'Atingido (Dentro da Meta)' },
    { value: 'FORA_DA_META', label: 'Fora da Meta' },
    { value: 'SEM_DADOS', label: 'Sem dados' },
  ]

  return (
    <Card className="border border-slate-200 bg-white shadow-xs">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#004C97]" />
            <span>Filtros Corporativos de Consolidação Anual</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRecarregar}
            disabled={carregando}
            className="h-8 text-xs font-medium text-slate-700 hover:text-[#004C97] hover:border-[#004C97]/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Recalcular Matriz
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Empresa */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Empresa</Label>
            <Select
              value={filtros.empresa || 'TODAS'}
              onValueChange={(val) => onChangeFiltros({ empresa: val === 'TODAS' ? '' : val })}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.value} value={e.value} className="text-xs">
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linha */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Linha</Label>
            <Select
              value={filtros.linha || 'TODAS'}
              onValueChange={(val) => onChangeFiltros({ linha: val === 'TODAS' ? '' : val })}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Centro */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Centro</Label>
            <Select
              value={filtros.centro || 'TODOS'}
              onValueChange={(val) => onChangeFiltros({ centro: val === 'TODOS' ? '' : val })}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                {centros.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ano */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Ano</Label>
            <Select
              value={String(filtros.ano)}
              onValueChange={(val) => onChangeFiltros({ ano: Number(val) })}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white font-semibold text-slate-900">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)} className="text-xs font-semibold">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Indicador */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Tipo de Indicador</Label>
            <Select
              value={filtros.tipoIndicador || 'TODOS'}
              onValueChange={(val) =>
                onChangeFiltros({ tipoIndicador: val === 'TODOS' ? '' : val })
              }
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposIndicador.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-slate-600">Status</Label>
            <Select
              value={filtros.status}
              onValueChange={(val: any) => onChangeFiltros({ status: val })}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOpcoes.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default IndicadoresFilterBar
