import React, { useEffect, useState } from 'react'
import { Share2, Network, Plus, RefreshCw, Search, Filter, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  productionNetworkService,
  ProductionLineRelationshipRecord,
} from '@/services/production-network'
import { useToast } from '@/hooks/use-toast'

export const LineDependenciesSubpage: React.FC = () => {
  const { toast } = useToast()
  const [relationships, setRelationships] = useState<ProductionLineRelationshipRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await productionNetworkService.listRelationships()
      setRelationships(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = relationships.filter(
    (r) =>
      r.origin_line_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.target_line_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.routing_condition && r.routing_condition.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-slate-100">
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>Gestão de Linhas</span>
            <span>&gt;</span>
            <span className="text-cyan-400 font-bold">Dependências e Rotas N:N</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#004C97]" />
            Catálogo Estrutural de Dependências & Regras de Roteamento
          </h1>
          <p className="text-xs text-slate-400">
            Predecessores, sucessores, pulmões intermediários, prioridades e rotas condicionais.
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

      {/* Tabela de Dependências */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <input
            type="text"
            placeholder="Filtrar por linha de origem, destino ou condição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-3 py-1.5 w-80 max-w-full"
          />
          <span className="text-xs font-mono text-slate-400">
            Total: <strong>{filtered.length} relações</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">Origem &rarr; Destino</th>
                <th className="p-3">Tipo Relação</th>
                <th className="p-3">Família / Produto</th>
                <th className="p-3">Regra de Roteamento</th>
                <th className="p-3">Buffer (Min/Max)</th>
                <th className="p-3">Lead Time</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-mono font-bold text-white">
                    <span className="text-cyan-300">{r.origin_line_code}</span> &rarr;{' '}
                    <span className="text-emerald-400">{r.target_line_code}</span>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-700 bg-slate-900 text-slate-300"
                    >
                      {r.relation_type} (P{r.priority_order})
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    {r.product_code || r.family_code || 'Geral'}
                  </td>
                  <td className="p-3 text-[11px] text-slate-300 max-w-xs truncate">
                    {r.routing_condition || 'Fluxo contínuo'}
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    {r.buffer_min_tons || 0} – {r.buffer_max_tons || 100} t
                  </td>
                  <td className="p-3 font-mono text-[11px] text-cyan-400">
                    {r.standard_lead_time_minutes || 30} min
                  </td>
                  <td className="p-3">
                    <Badge className="text-[9px] bg-emerald-950 text-emerald-300 border-emerald-700 font-mono">
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default LineDependenciesSubpage
