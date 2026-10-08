import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Scale,
  Plus,
  Edit2,
  Power,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  X,
  Save,
  Search,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type {
  MPCuttingWeightStandard,
  MPCuttingType,
  MPToleranceType,
  MPStandardPriority,
} from '@/types/mp-cutting-weight-standards'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'

interface MPCuttingWeightStandardsModalProps {
  isOpen: boolean
  onClose: () => void
  onStandardsChanged?: () => void
}

export const MPCuttingWeightStandardsModal: React.FC<MPCuttingWeightStandardsModalProps> = ({
  isOpen,
  onClose,
  onStandardsChanged,
}) => {
  const [standards, setStandards] = useState<MPCuttingWeightStandard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('TODOS')

  // Estado do formulário de criação/edição
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<MPCuttingWeightStandard>>({
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: ['SEML1'],
    material_codes: ['TARUGO-130-1020'],
    steel_family: 'SAE 1020',
    target_weight_kg: 1250,
    min_weight_kg: 1200,
    max_weight_kg: 1300,
    tolerance_lower_val: 50,
    tolerance_lower_type: 'KG',
    tolerance_upper_val: 50,
    tolerance_upper_type: 'KG',
    priority: 'ALTA',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'ATIVO',
    technical_notes: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Centros e materiais disponíveis no sistema CIAFAL
  const availableCenters = [
    { code: 'SEML1', name: 'SEML1 — Laminação Geral L1' },
    { code: 'PNCL1', name: 'PNCL1 — Prensa e Corte L1' },
    { code: 'PNCL2', name: 'PNCL2 — Prensa e Corte L2' },
    { code: 'OXIFERKS', name: 'OXIFERKS — Oxicorte CIAFAL' },
    { code: 'PNCSDC', name: 'PNCSDC — Corte Sidercentro' },
    { code: 'ACAB_L2', name: 'ACAB_L2 — Acabamento L2' },
  ]

  const availableMaterials = [
    { code: 'TARUGO-130-1020', label: 'Tarugo 130x130 SAE 1020' },
    { code: 'TARUGO-150-1045', label: 'Tarugo 150x150 SAE 1045' },
    { code: 'TARUGO-160-5160', label: 'Tarugo 160x160 SAE 5160' },
    { code: 'PLACA-200-A36', label: 'Placa Laminada 200 mm ASTM A36' },
    { code: 'BARRA-RED-75-1020', label: 'Barra Redonda 75 mm SAE 1020' },
  ]

  const fetchStandards = async () => {
    setLoading(true)
    try {
      const data = await mpCuttingWeightStandardsService.listStandards(true)
      setStandards(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStandards()
      setIsEditing(false)
      setFormError(null)
      setFormSuccess(null)
    }
  }, [isOpen])

  const handleOpenCreate = () => {
    setFormData({
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      steel_family: 'SAE 1020',
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      tolerance_lower_val: 50,
      tolerance_lower_type: 'KG',
      tolerance_upper_val: 50,
      tolerance_upper_type: 'KG',
      priority: 'ALTA',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'ATIVO',
      technical_notes: '',
    })
    setFormError(null)
    setFormSuccess(null)
    setIsEditing(true)
  }

  const handleOpenEdit = (item: MPCuttingWeightStandard) => {
    setFormData({ ...item })
    setFormError(null)
    setFormSuccess(null)
    setIsEditing(true)
  }

  const handleToggleCenter = (centerCode: string) => {
    const current = formData.center_codes || []
    if (current.includes(centerCode)) {
      setFormData({
        ...formData,
        center_codes: current.filter((c) => c !== centerCode),
      })
    } else {
      setFormData({
        ...formData,
        center_codes: [...current, centerCode],
      })
    }
  }

  const handleToggleMaterial = (matCode: string) => {
    const current = formData.material_codes || []
    if (current.includes(matCode)) {
      setFormData({
        ...formData,
        material_codes: current.filter((m) => m !== matCode),
      })
    } else {
      setFormData({
        ...formData,
        material_codes: [...current, matCode],
      })
    }
  }

  // Sincronização automática entre limites e tolerâncias quando usuário altera
  const handleTargetChange = (val: number) => {
    const tolLow = formData.tolerance_lower_val || 0
    const tolUp = formData.tolerance_upper_val || 0
    const lowType = formData.tolerance_lower_type || 'KG'
    const upType = formData.tolerance_upper_type || 'KG'

    const lowKg = lowType === 'KG' ? tolLow : (val * tolLow) / 100
    const upKg = upType === 'KG' ? tolUp : (val * tolUp) / 100

    setFormData({
      ...formData,
      target_weight_kg: val,
      min_weight_kg: Number((val - lowKg).toFixed(2)),
      max_weight_kg: Number((val + upKg).toFixed(2)),
    })
  }

  const handleToleranceLowerChange = (val: number, type: MPToleranceType) => {
    const target = formData.target_weight_kg || 0
    const lowKg = type === 'KG' ? val : (target * val) / 100
    setFormData({
      ...formData,
      tolerance_lower_val: val,
      tolerance_lower_type: type,
      min_weight_kg: Number((target - lowKg).toFixed(2)),
    })
  }

  const handleToleranceUpperChange = (val: number, type: MPToleranceType) => {
    const target = formData.target_weight_kg || 0
    const upKg = type === 'KG' ? val : (target * val) / 100
    setFormData({
      ...formData,
      tolerance_upper_val: val,
      tolerance_upper_type: type,
      max_weight_kg: Number((target + upKg).toFixed(2)),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await mpCuttingWeightStandardsService.saveStandard(formData)
      if (!res.success) {
        setFormError(res.error || 'Erro ao salvar padrão de peso.')
        return
      }

      setFormSuccess('Padrão de peso salvo com sucesso e registrado na auditoria!')
      await fetchStandards()
      onStandardsChanged?.()
      setTimeout(() => {
        setIsEditing(false)
        setFormSuccess(null)
      }, 900)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (item: MPCuttingWeightStandard) => {
    const res = await mpCuttingWeightStandardsService.toggleStatus(item)
    if (res.success) {
      await fetchStandards()
      onStandardsChanged?.()
    } else {
      alert(`Erro ao alterar status: ${res.error}`)
    }
  }

  const filteredStandards = standards.filter((s) => {
    if (filterType !== 'TODOS' && s.cutting_type !== filterType) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      s.code.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.center_codes.some((c) => c.toLowerCase().includes(term)) ||
      s.material_codes.some((m) => m.toLowerCase().includes(term))
    )
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-6">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-600">Erro ao renderizar popup de Padrões de Peso.</div>
          }
        >
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-900 text-white shadow-sm">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-blue-950 flex items-center gap-2">
                    Padrões de Peso para Corte
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      CIAFAL PCP
                    </Badge>
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Cadastro técnico de faixas nominais e tolerâncias industriais para blocos e
                    múltiplos de MP
                  </p>
                </div>
              </div>
              {!isEditing && (
                <Button
                  onClick={handleOpenCreate}
                  className="bg-blue-900 hover:bg-blue-950 text-white gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Novo Padrão de Peso
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5 py-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-blue-900 text-base">
                    {formData.id
                      ? `Editar Padrão: ${formData.code}`
                      : 'Cadastrar Novo Padrão de Peso'}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>

                {formError && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-sm font-medium">{formError}</AlertDescription>
                  </Alert>
                )}

                {formSuccess && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <AlertDescription className="text-sm font-medium">
                      {formSuccess}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Linha 1: Descrição, Tipo de Corte, Empresa, Prioridade */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Descrição do Padrão *
                    </Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Tarugo L1 130x130 Padrão Bloco 1.250 kg"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tipo de Corte *</Label>
                    <select
                      value={formData.cutting_type || 'BLOCOS'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cutting_type: e.target.value as MPCuttingType,
                        })
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="BLOCOS">Blocos</option>
                      <option value="MULTIPLOS">Múltiplos</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Prioridade *</Label>
                    <select
                      value={formData.priority || 'ALTA'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as MPStandardPriority,
                        })
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Média</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                  </div>
                </div>

                {/* Linha 2: Centros de Aplicação (Múltiplos centros permitidos) */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 block mb-1">
                    Centros de Aplicação (PCP) * — Permite múltiplos centros
                  </Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableCenters.map((c) => {
                      const selected = (formData.center_codes || []).includes(c.code)
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleToggleCenter(c.code)}
                          className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                            selected
                              ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Linha 3: Material / MP (Seleção Múltipla) e Família de Aço */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 block mb-1">
                      Material / Matéria-Prima * — Seleção múltipla
                    </Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {availableMaterials.map((m) => {
                        const selected = (formData.material_codes || []).includes(m.code)
                        return (
                          <button
                            key={m.code}
                            type="button"
                            onClick={() => handleToggleMaterial(m.code)}
                            className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-all ${
                              selected
                                ? 'bg-indigo-900 text-white border-indigo-950 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Família / Aço (Opcional)
                    </Label>
                    <Input
                      value={formData.steel_family || ''}
                      onChange={(e) => setFormData({ ...formData, steel_family: e.target.value })}
                      placeholder="Ex: SAE 1020, ASTM A36"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Bloco de Pesos e Tolerâncias Industriais (ABNT / CIAFAL) */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-700" /> Parâmetros de Pesagem e
                      Tolerâncias (kg)
                    </span>
                    <span className="text-xs text-slate-500">Regra: Mínimo ≤ Ideal ≤ Máximo</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Ideal (kg) *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.target_weight_kg ?? ''}
                        onChange={(e) => handleTargetChange(parseFloat(e.target.value) || 0)}
                        className="mt-1 font-bold text-blue-950 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Mínimo Permitido (kg) *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.min_weight_kg ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_weight_kg: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1 font-semibold text-slate-900 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Máximo Permitido (kg) *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.max_weight_kg ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_weight_kg: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="mt-1 font-semibold text-slate-900 bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Tolerâncias Inferior e Superior */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Tolerância Inferior *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.tolerance_lower_val ?? ''}
                          onChange={(e) =>
                            handleToleranceLowerChange(
                              parseFloat(e.target.value) || 0,
                              formData.tolerance_lower_type || 'KG',
                            )
                          }
                          className="mt-1 bg-white"
                          required
                        />
                      </div>
                      <select
                        value={formData.tolerance_lower_type || 'KG'}
                        onChange={(e) =>
                          handleToleranceLowerChange(
                            formData.tolerance_lower_val || 0,
                            e.target.value as MPToleranceType,
                          )
                        }
                        className="h-9 w-20 rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm font-semibold"
                      >
                        <option value="KG">kg</option>
                        <option value="PERCENT">%</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Tolerância Superior *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.tolerance_upper_val ?? ''}
                          onChange={(e) =>
                            handleToleranceUpperChange(
                              parseFloat(e.target.value) || 0,
                              formData.tolerance_upper_type || 'KG',
                            )
                          }
                          className="mt-1 bg-white"
                          required
                        />
                      </div>
                      <select
                        value={formData.tolerance_upper_type || 'KG'}
                        onChange={(e) =>
                          handleToleranceUpperChange(
                            formData.tolerance_upper_val || 0,
                            e.target.value as MPToleranceType,
                          )
                        }
                        className="h-9 w-20 rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm font-semibold"
                      >
                        <option value="KG">kg</option>
                        <option value="PERCENT">%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Vigência, Status e Observações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data de Início da Vigência *
                    </Label>
                    <Input
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data de Fim da Vigência (Opcional)
                    </Label>
                    <Input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                    <select
                      value={formData.status || 'ATIVO'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Observações Técnicas / Restrições
                  </Label>
                  <Input
                    value={formData.technical_notes || ''}
                    onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
                    placeholder="Instruções de corte de cabeceira, alinhamento de guia e tolerâncias de faca"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-900 hover:bg-blue-950 text-white gap-2 shadow-sm font-semibold"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Padrão de Peso'}
                </Button>
              </div>
            </form>
          ) : (
            /* LISTAGEM DE PADRÕES CADASTRADOS */
            <div className="space-y-4 py-3">
              {/* Barra de Filtros da Lista */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por código, descrição, centro ou material..."
                    className="w-full md:w-80 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Tipo:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-8 rounded border border-input bg-white px-2 text-xs"
                  >
                    <option value="TODOS">Todos os Tipos</option>
                    <option value="BLOCOS">Somente Blocos</option>
                    <option value="MULTIPLOS">Somente Múltiplos</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-24 text-xs font-bold text-slate-700">
                        Código
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Descrição</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Tipo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Centros</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Peso Ideal</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">
                        Faixa Permitida
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Prioridade</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                      <TableHead className="w-28 text-right text-xs font-bold text-slate-700">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          Carregando padrões de peso...
                        </TableCell>
                      </TableRow>
                    ) : filteredStandards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          Nenhum padrão de peso cadastrado com os filtros informados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStandards.map((std) => (
                        <TableRow
                          key={std.id || std.code}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <TableCell className="font-mono text-xs font-bold text-blue-900">
                            {std.code}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-slate-900">
                              {std.description}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {(std.material_codes || []).join(', ') || 'Todas as MPs'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                std.cutting_type === 'BLOCOS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }
                            >
                              {std.cutting_type === 'BLOCOS' ? 'Blocos' : 'Múltiplos'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {(std.center_codes || []).join(', ') || 'Geral'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            {std.target_weight_kg.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            kg
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {std.min_weight_kg.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            a{' '}
                            {std.max_weight_kg.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            kg
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                std.priority === 'ALTA'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : std.priority === 'MEDIA'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {std.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                std.status === 'ATIVO'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {std.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(std)}
                                className="h-7 w-7 p-0 text-slate-600 hover:text-blue-900"
                                title="Editar Padrão"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(std)}
                                className={`h-7 w-7 p-0 ${
                                  std.status === 'ATIVO'
                                    ? 'text-amber-600 hover:text-amber-800'
                                    : 'text-emerald-600 hover:text-emerald-800'
                                }`}
                                title={std.status === 'ATIVO' ? 'Inativar Padrão' : 'Ativar Padrão'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-800" /> Padrões inativos não são
                calculados em novas simulações mas são preservados no histórico.
              </span>
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
