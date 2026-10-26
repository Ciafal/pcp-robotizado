import React, { useState, useEffect } from 'react'
import {
  lineSummaryAutomationService,
  type RealProductionLine,
  type HubUser,
  type MonthlySummaryTemplate,
} from '@/services/pcp-line-summary-automation-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sparkles,
  Layers,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  FileText,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react'

interface GenerateLineSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  templates: MonthlySummaryTemplate[]
  onSuccess: () => void
}

export const GenerateLineSummaryModal: React.FC<GenerateLineSummaryModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSuccess,
}) => {
  const [realLines, setRealLines] = useState<RealProductionLine[]>([])
  const [hubUsers, setHubUsers] = useState<HubUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Campos do popup
  const [empresaCode, setEmpresaCode] = useState('CIAFAL')
  const [centroCode, setCentroCode] = useState('SDPL')
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple' | 'all'>('single')
  const [selectedSingleLine, setSelectedSingleLine] = useState('L1')
  const [selectedMultipleLines, setSelectedMultipleLines] = useState<string[]>(['L1', 'L2'])
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [templateId, setTemplateId] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [withAi, setWithAi] = useState(true)
  const [forceRecreate, setForceRecreate] = useState(false)

  // Resultado da execução
  const [generationResults, setGenerationResults] = useState<any[] | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  const loadInitialData = async () => {
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setGenerationResults(null)
    try {
      const [lines, users] = await Promise.all([
        lineSummaryAutomationService.getRealProductionLines(),
        lineSummaryAutomationService.getHubUsers(),
      ])
      setRealLines(lines)
      setHubUsers(users)
      if (users.length > 0 && !responsavelId) {
        setResponsavelId(users[0].id)
      }
      if (lines.length > 0 && !selectedSingleLine) {
        setSelectedSingleLine(lines[0].code)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados iniciais')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMultipleLine = (code: string) => {
    if (selectedMultipleLines.includes(code)) {
      setSelectedMultipleLines(selectedMultipleLines.filter((c) => c !== code))
    } else {
      setSelectedMultipleLines([...selectedMultipleLines, code])
    }
  }

  const handleSelectAllLines = () => {
    setSelectedMultipleLines(realLines.map((l) => l.code))
  }

  const handleClearAllLines = () => {
    setSelectedMultipleLines([])
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')
    setGenerationResults(null)

    try {
      let targetLineCodes: string[] = []
      if (selectionMode === 'single') {
        if (!selectedSingleLine) throw new Error('Selecione uma linha produtiva.')
        targetLineCodes = [selectedSingleLine]
      } else if (selectionMode === 'multiple') {
        if (selectedMultipleLines.length === 0)
          throw new Error('Selecione ao menos uma linha produtiva.')
        targetLineCodes = selectedMultipleLines
      } else {
        // all
        targetLineCodes = realLines.map((l) => l.code)
      }

      const periodo = `${ano}-${mes < 10 ? '0' + mes : mes}`
      const respUser = hubUsers.find((u) => u.id === responsavelId)

      const result = await lineSummaryAutomationService.generateSummariesByLine({
        line_codes: targetLineCodes,
        empresa_code: empresaCode,
        centro_code: centroCode,
        template_id: templateId || undefined,
        periodo,
        with_ai: withAi,
        force_recreate: forceRecreate,
      })

      setGenerationResults(result.results || [])
      setSuccessMsg(
        `Processamento finalizado: ${result.results?.length || 0} relatório(s) independente(s) processado(s) para o período ${periodo}.`,
      )
      onSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar resumos por linha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const monthsList = [
    { num: 1, name: 'Janeiro' },
    { num: 2, name: 'Fevereiro' },
    { num: 3, name: 'Março' },
    { num: 4, name: 'Abril' },
    { num: 5, name: 'Maio' },
    { num: 6, name: 'Junho' },
    { num: 7, name: 'Julho' },
    { num: 8, name: 'Agosto' },
    { num: 9, name: 'Setembro' },
    { num: 10, name: 'Outubro' },
    { num: 11, name: 'Novembro' },
    { num: 12, name: 'Dezembro' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gerar Resumo por Linha Produtiva</span>
            </span>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]"
            >
              Relatórios Independentes por Linha
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-300 text-rose-900 py-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <AlertDescription className="text-xs font-medium ml-2">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="bg-emerald-50 border-emerald-300 text-emerald-900 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-xs font-medium ml-2">{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* Quadro de resultados após execução */}
        {generationResults && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Resultado da Geração por Linha</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {generationResults.length} linha(s)
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {generationResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                    item.success
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#004C97] text-white text-[9px] px-1 py-0">
                      {item.linha}
                    </Badge>
                    <span className="font-bold">
                      {item.resumo_codigo || item.result?.resumo_codigo || 'Resumo'}
                    </span>
                    {item.already_executed && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300 text-[9px]"
                      >
                        Já Existia (Dedup)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.template_code || item.result?.template_code || 'Template Padrão'}
                    </span>
                    <Badge
                      className={
                        item.success
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }
                    >
                      {item.success ? 'Gerado' : 'Falha'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 py-2">
          {/* Seção 1: Contexto e Linhas */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
              1. Seleção de Linhas Reais & Contexto
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Empresa (WERKS)</Label>
                <select
                  value={empresaCode}
                  onChange={(e) => setEmpresaCode(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                >
                  <option value="CIAFAL">CIAFAL (1000)</option>
                  <option value="SIDERCENTRO">SIDERCENTRO (2000)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Centro Fabril</Label>
                <Input
                  type="text"
                  value={centroCode}
                  onChange={(e) => setCentroCode(e.target.value)}
                  placeholder="Ex: SDPL, LAML2"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Modo de Seleção de Linha */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Modo de Seleção de Linha
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode('single')}
                  className={`p-2 rounded border text-xs text-center font-medium transition-all ${
                    selectionMode === 'single'
                      ? 'bg-blue-50 border-[#004C97] text-[#004C97] font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Linha Única
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('multiple')}
                  className={`p-2 rounded border text-xs text-center font-medium transition-all ${
                    selectionMode === 'multiple'
                      ? 'bg-blue-50 border-[#004C97] text-[#004C97] font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Múltiplas Linhas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('all')}
                  className={`p-2 rounded border text-xs text-center font-medium transition-all ${
                    selectionMode === 'all'
                      ? 'bg-blue-50 border-[#004C97] text-[#004C97] font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Todas Autorizadas ({realLines.length})
                </button>
              </div>
            </div>

            {/* Visualização da seleção de linhas */}
            {selectionMode === 'single' && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Linha de Produção Real *
                </Label>
                <select
                  value={selectedSingleLine}
                  onChange={(e) => setSelectedSingleLine(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                  required
                >
                  {realLines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectionMode === 'multiple' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Selecione as Linhas Produtivas ({selectedMultipleLines.length} selecionadas)
                  </Label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllLines}
                      className="text-[10px] text-blue-700 hover:underline font-medium"
                    >
                      Selecionar Todas
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllLines}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-white border border-slate-200 rounded">
                  {realLines.map((l) => {
                    const isChecked = selectedMultipleLines.includes(l.code)
                    return (
                      <div
                        key={l.id}
                        onClick={() => toggleMultipleLine(l.code)}
                        className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer border text-xs transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#004C97]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate">{l.code}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Período e Template */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
              2. Período de Referência & Template
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Ano</Label>
                <Input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="h-8 text-xs bg-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Mês</Label>
                <select
                  value={mes}
                  onChange={(e) => setMes(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                  required
                >
                  {monthsList.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.num < 10 ? '0' + m.num : m.num} — {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Template Específico (Opcional)
                </Label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                >
                  <option value="">
                    Fallback Canônico (Config Linha → Centro → Linha → Empresa → Geral)
                  </option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.nome} ({tpl.template_code} - {tpl.versao_tag || 'V1.0'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Responsável PCP</Label>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                >
                  {hubUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 3: Opções de IA e Governança */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
              3. Opções de Geração & IA
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gerar com IA</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Aplica sugestões do agente nativo CIAFAL
                  </div>
                </div>
                <Switch checked={withAi} onCheckedChange={setWithAi} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Forçar Recriação</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Sobrescreve proteção anti-duplicidade
                  </div>
                </div>
                <Switch checked={forceRecreate} onCheckedChange={setForceRecreate} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando Relatórios...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {selectionMode === 'single'
                      ? 'Gerar Resumo da Linha'
                      : selectionMode === 'multiple'
                        ? `Gerar ${selectedMultipleLines.length} Resumos Independentes`
                        : `Gerar Todas as Linhas (${realLines.length})`}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
