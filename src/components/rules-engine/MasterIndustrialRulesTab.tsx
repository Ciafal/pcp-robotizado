import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus,
  ArrowRight,
  Filter,
  Sparkles,
  Lock,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PCPIndustrialRule, PCPUnifiedRulesEngine } from '@/services/unified-rules-engine'

export const MasterIndustrialRulesTab: React.FC = () => {
  const navigate = useNavigate()
  const engine = PCPUnifiedRulesEngine.getInstance()
  const [rules] = useState<PCPIndustrialRule[]>(engine.getAllRules())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')

  const filteredRules = rules.filter((r) => {
    if (selectedCategory !== 'ALL' && r.ruleCategory !== selectedCategory) return false
    if (selectedLine !== 'ALL' && r.line !== 'GLOBAL' && r.line !== selectedLine) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        r.ruleCode.toLowerCase().includes(q) ||
        r.ruleName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.line.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Biblioteca Central de Regras Parametrizáveis PCP
            <Badge className="bg-blue-100 text-[#004C97] text-[10px] font-mono">
              Camada Única &bull; Multi-módulo
            </Badge>
          </h3>
          <p className="text-xs text-slate-500">
            Regras industriais consumidas simultaneamente por Programação Semanal/Mensal, Carteira,
            Gestão de MP, Torre de Controle e IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrar por código, nome ou linha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs w-64 bg-white"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 w-44 text-xs bg-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Categorias</SelectItem>
              <SelectItem value="LOTE_MINIMO">Lote Mínimo</SelectItem>
              <SelectItem value="ABC_PRIORIDADE">Curva ABC & Prioridade</SelectItem>
              <SelectItem value="EQUILIBRIO_ESTOQUE">Equilíbrio de Estoque</SelectItem>
              <SelectItem value="DESBASTE">Desbaste L1</SelectItem>
              <SelectItem value="ENFORNAMENTO">Enfornamento & Dependência</SelectItem>
              <SelectItem value="REVENDA_IMPORTADO">Revenda e Importados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
              <th className="p-2.5">Código da Regra</th>
              <th className="p-2.5">Nome / Escopo</th>
              <th className="p-2.5">Linha</th>
              <th className="p-2.5">Categoria</th>
              <th className="p-2.5 text-right">Parâmetro Mínimo / Alvo</th>
              <th className="p-2.5 text-center">Bloqueante?</th>
              <th className="p-2.5 text-center">Permite Exceção?</th>
              <th className="p-2.5">Alçada Aprovação</th>
              <th className="p-2.5 text-center">Rev</th>
              <th className="p-2.5 text-center">Status</th>
              <th className="p-2.5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRules.map((row) => {
              const targetLineId = row.line && row.line !== 'GLOBAL' ? row.line : ''
              return (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/50 transition-colors whitespace-nowrap"
                >
                  <td className="p-2.5 font-mono font-bold text-[#004C97]">{row.ruleCode}</td>
                  <td
                    className="p-2.5 font-medium text-slate-900 max-w-xs truncate"
                    title={row.description}
                  >
                    {row.ruleName}
                  </td>
                  <td className="p-2.5">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {row.line}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                      {row.ruleCategory}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {row.minValue !== undefined
                      ? `${row.minValue} ${row.unit}`
                      : row.targetValue
                        ? `${row.targetValue} ${row.unit}`
                        : '-'}
                  </td>
                  <td className="p-2.5 text-center">
                    {row.isBlocking ? (
                      <Badge className="bg-rose-100 text-rose-800 text-[10px]">
                        SIM (Bloqueia)
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">
                        NÃO (Informativo)
                      </Badge>
                    )}
                  </td>
                  <td className="p-2.5 text-center">
                    {row.allowException ? (
                      <span className="text-emerald-700 font-bold text-[11px]">Sim</span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Não</span>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-700">
                    {row.requiredApprovalRole}
                  </td>
                  <td className="p-2.5 text-center font-mono text-slate-500">
                    v{row.revisionNumber}
                  </td>
                  <td className="p-2.5 text-center">
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="p-2.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(
                          targetLineId
                            ? `/pcp/ficha-mestre?lineId=${targetLineId}#section-sequencing-process`
                            : '/pcp/ficha-mestre',
                        )
                      }
                      className="h-7 text-xs border-slate-300 gap-1 text-[#004C97] hover:bg-blue-50"
                      title="Abrir parâmetros oficiais na Ficha Mestra"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir na Ficha Mestra</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
