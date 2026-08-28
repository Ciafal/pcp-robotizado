import React from 'react'
import { History, ShieldCheck, FileSpreadsheet, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const revisions = [
  {
    id: 'rev-001',
    lineCode: 'L1',
    lineName: 'Linha de Laminação / Tubos L1',
    version: 'v2.1',
    author: 'Lucas Ferreira (PCP)',
    reason: 'Ajuste de capacidade nominal após reforma dos mancais de laminação.',
    date: '28/08/2026 14:10',
    status: 'HOMOLOGADA',
    fieldsChanged: ['nominal_hourly_capacity: 12.5 -> 14.0 t/h', 'output_buffer: 180 t'],
  },
  {
    id: 'rev-002',
    lineCode: 'ENF_L1',
    lineName: 'Forno Contínuo de Enfornamento L1',
    version: 'v1.4',
    author: 'Carlos Mendes (Gestor L1)',
    reason: 'Inclusão de nova curva térmica para barras chatas 1020.',
    date: '27/08/2026 18:30',
    status: 'HOMOLOGADA',
    fieldsChanged: ['line_capabilities: BAR_CHATA adicionada'],
  },
  {
    id: 'rev-003',
    lineCode: 'L2',
    lineName: 'Linha de Laminação Pesada L2',
    version: 'v1.2',
    author: 'Marcos Souza (Gestor L2)',
    reason: 'Definição de rota alternativa via Endireitadeira (ENDIR).',
    date: '26/08/2026 11:20',
    status: 'HOMOLOGADA',
    fieldsChanged: ['production_line_relationships: L2 -> ENDIR (P2)'],
  },
]

export const LineHistorySubpage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-slate-100">
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>Gestão de Linhas</span>
            <span>&gt;</span>
            <span className="text-cyan-400 font-bold">Histórico de Revisões</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#004C97]" />
            Trilha de Auditoria & Revisões Estruturais da Malha
          </h1>
          <p className="text-xs text-slate-400">
            Registro imutável de alterações em Fichas Mestres, capacidades, buffers e
            relacionamentos.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {revisions.map((rev) => (
          <Card key={rev.id} className="bg-slate-950 border-slate-800 text-slate-100 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-white">{rev.lineCode}</span>
                <span className="text-xs text-slate-400">({rev.lineName})</span>
                <Badge className="bg-blue-950 text-cyan-300 border-blue-800 font-mono text-[10px]">
                  {rev.version}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{rev.date}</span>
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[9px]">
                  {rev.status}
                </Badge>
              </div>
            </div>

            <div className="py-2.5 space-y-1.5 text-xs">
              <p className="text-slate-300">
                <strong>Motivo da Alteração:</strong> {rev.reason}
              </p>
              <p className="text-slate-400">
                <strong>Autor da Revisão:</strong> {rev.author}
              </p>

              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80 text-[11px] font-mono text-cyan-400">
                {rev.fieldsChanged.map((f, i) => (
                  <div key={i}>&bull; {f}</div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-cyan-400 hover:text-white text-xs h-7 gap-1"
                asChild
              >
                <Link to="/pcp/ficha-mestre">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Ver Ficha Mestre
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default LineHistorySubpage
