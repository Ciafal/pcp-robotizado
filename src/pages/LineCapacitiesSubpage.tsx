import React, { useEffect, useState } from 'react'
import {
  Gauge,
  Activity,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'

export const LineCapacitiesSubpage: React.FC = () => {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await lineMasterService.listLines()
      setLines(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLines = lines.filter(
    (l) =>
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-slate-900">
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
            <span>Hierarquia das Linhas</span>
            <span>&gt;</span>
            <span className="text-[#004C97] font-bold">Capacidades e Performance</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#004C97]" />
            Hierarquia das Linhas & Capacidades Nominais
          </h1>
          <p className="text-xs text-slate-600">
            Hierarquia, parâmetros nominais de engenharia, OEE e limites operacionais por linha
            produtiva.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs h-8 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Grid de Capacidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLines.map((line) => (
          <Card
            key={line.id}
            className="bg-white border-slate-200 text-slate-900 p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-base text-slate-900">{line.code}</span>
                <span className="text-xs text-slate-600 block line-clamp-1">{line.name}</span>
              </div>
              <Badge className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]">
                {line.sap_work_center || 'WC-DIV'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">
                  Capacidade Nominal
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {line.target_rate || line.nominal_speed || 120} t/h
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Cadência Real</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {line.current_rate || 118} t/h
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Eficiência (OEE)</span>
                <div className="font-bold text-[#004C97] text-sm">
                  <OeeInteractiveValue
                    value={line.efficiency || 96.8}
                    target={85.0}
                    unit="%"
                    drilldownContext={{
                      lineCode: line.code || `L${line.id}`,
                      equipmentCode: `${line.code || `L${line.id}`}_LAM`,
                    }}
                  />
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Turnos Ativos</span>
                <span className="text-slate-900 text-sm">3 Turnos</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              <span>Status Operacional:</span>
              <Badge
                className={`text-[9px] ${
                  (line.status as string) === 'running' || line.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : (line.status as string) === 'maintenance' || line.status === 'MAINTENANCE'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : (line.status as string) === 'idle' || line.status === 'CONFIGURING'
                        ? 'bg-blue-100 text-[#004C97] border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {(line.status as string) === 'running' || line.status === 'ACTIVE'
                  ? 'Em produção'
                  : (line.status as string) === 'maintenance' || line.status === 'MAINTENANCE'
                    ? 'Manutenção'
                    : (line.status as string) === 'idle' || line.status === 'CONFIGURING'
                      ? 'Disponível'
                      : (line.status as string) === 'stopped' || line.status === 'INACTIVE'
                        ? 'Parada'
                        : line.status || 'Disponível'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default LineCapacitiesSubpage
