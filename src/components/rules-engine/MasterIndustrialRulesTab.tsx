import React, { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  PCPIndustrialRule,
  DEFAULT_CIAFAL_RULES,
  PCPUnifiedRulesEngine,
} from '@/services/unified-rules-engine'

export const MasterIndustrialRulesTab: React.FC = () => {
  const { toast } = useToast()
  const engine = PCPUnifiedRulesEngine.getInstance()
  const [rules, setRules] = useState<PCPIndustrialRule[]>(engine.getAllRules())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')

  // Modal de edição / visualização
  const [selectedRule, setSelectedRule] = useState<PCPIndustrialRule | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editMinValue, setEditMinValue] = useState<number>(0)
  const [editMaxValue, setEditMaxValue] = useState<number>(0)
  const [editJustification, setEditJustification] = useState('')
  const [editRole, setEditRole] = useState('')

  const handleOpenEdit = (rule: PCPIndustrialRule) => {
    setSelectedRule(rule)
    setEditMinValue(rule.minValue || 0)
    setEditMaxValue(rule.maxValue || 0)
    setEditRole(rule.requiredApprovalRole || 'GESTOR_PCP')
    setEditJustification('')
    setIsEditModalOpen(true)
  }

  const handleSaveRule = () => {
    if (!selectedRule) return
    if (!editJustification || editJustification.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description:
          'Informe uma justificativa técnica detalhada para alteração de regra de governança.',
      })
      return
    }

    try {
      const updated = engine.updateRule(
        selectedRule.id,
        {
          minValue: editMinValue,
          maxValue: editMaxValue,
          requiredApprovalRole: editRole,
          description: `${selectedRule.description} (Alterado: ${editJustification})`,
        },
        { id: 'USR_PCP_01', name: 'Carlos Alberto (PCP)' },
      )

      setRules(engine.getAllRules())
      setIsEditModalOpen(false)
      toast({
        title: 'Regra Atualizada com Sucesso',
        description: `Regra ${updated.ruleCode} atualizada para a revisão v${updated.revisionNumber}. Histórico de auditoria registrado.`,
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar regra',
        description: e.message || 'Erro inesperado.',
      })
    }
  }

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
            {filteredRules.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/50 transition-colors whitespace-nowrap">
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
                    <Badge className="bg-rose-100 text-rose-800 text-[10px]">SIM (Bloqueia)</Badge>
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
                    onClick={() => handleOpenEdit(row)}
                    className="h-7 text-xs border-slate-300"
                  >
                    Ajustar Parâmetro
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDIÇÃO DE PARÂMETRO COM GOVERNANÇA */}
      {selectedRule && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#004C97]" />
                Governança: {selectedRule.ruleCode}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Alteração governada de parâmetro mestre. Toda modificação gera nova revisão e trilha
                de auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-slate-500 font-medium">Descrição da Regra:</div>
                <div className="text-slate-900 font-semibold mt-0.5">
                  {selectedRule.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-medium">
                    Valor Mínimo ({selectedRule.unit})
                  </label>
                  <Input
                    type="number"
                    value={editMinValue}
                    onChange={(e) => setEditMinValue(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium">Alçada de Aprovação</label>
                  <Input
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-medium">
                  Justificativa Obrigatória da Alteração *
                </label>
                <Textarea
                  placeholder="Explique o motivo técnico/comercial da alteração do parâmetro..."
                  value={editJustification}
                  onChange={(e) => setEditJustification(e.target.value)}
                  className="text-xs mt-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#004C97] text-white" onClick={handleSaveRule}>
                Salvar Revisão v{selectedRule.revisionNumber + 1}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
