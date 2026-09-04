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
    <div className="space-y-4 max-w-[1600px] mx-auto text-slate-100">
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>Hierarquia das Linhas</span>
            <span>&gt;</span>
            <span className="text-cyan-400 font-bold">Capacidades e Performance</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#004C97]" />
            Hierarquia das Linhas & Capacidades Nominais
          </h1>
          <p className="text-xs text-slate-400">
            Hierarquia, parâmetros nominais de engenharia, OEE e limites operacionais por linha
            produtiva.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
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
            className="bg-slate-950 border-slate-800 text-slate-100 p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-base text-white">{line.code}</span>
                <span className="text-xs text-slate-400 block line-clamp-1">{line.name}</span>
              </div>
              <Badge className="bg-blue-950 text-cyan-300 border-blue-800 font-mono text-[10px]">
                {line.sap_work_center || 'WC-DIV'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">
                  Capacidade Nominal
                </span>
                <span className="font-bold text-white text-sm">
                  {line.target_rate || line.nominal_speed || 120} t/h
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Cadência Real</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {line.current_rate || 118} t/h
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">Eficiência (OEE)</span>
                <div className="font-bold text-cyan-300 text-sm">
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
                <span className="text-white text-sm">3 Turnos</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Status Operacional:</span>
              <Badge
                className={`text-[9px] ${
                  (line.status as string) === 'running' || line.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : (line.status as string) === 'maintenance' || line.status === 'MAINTENANCE'
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : (line.status as string) === 'idle' || line.status === 'CONFIGURING'
                        ? 'bg-blue-950 text-blue-300 border-blue-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
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
