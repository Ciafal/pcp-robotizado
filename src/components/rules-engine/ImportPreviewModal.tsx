import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileSpreadsheet,
  Layers,
} from 'lucide-react'
import { ImportPreviewItem } from '@/services/pcp-rules-service'

interface ImportPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  templateType: 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING'
  onConfirmSendToWorkflow: (items: ImportPreviewItem[]) => void
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  templateType,
  onConfirmSendToWorkflow,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL')

  // Itens simulados da prévia da importação (Requisito 10)
  const normalizedType: 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING' =
    templateType === 'SETUP'
      ? 'SETUP'
      : templateType === 'COOLING'
        ? 'COOLING'
        : templateType === 'SEQUENCING'
          ? 'SEQUENCING'
          : 'STOP'

  const mockItems: ImportPreviewItem[] = [
    {
      id: 'prev-1',
      status: 'UNCHANGED',
      entityType: normalizedType,
      code: 'STP_L1_TQ_TQ_DIM',
      lineCode: 'L1',
      description: 'Ajuste de Bitola Quadrada (20x20 -> 50x50)',
      diffFields: [],
    },
    {
      id: 'prev-2',
      status: 'NEW',
      entityType: normalizedType,
      code: 'STP_L1_TQ_PERF_Z',
      lineCode: 'L1',
      description: 'Nova Regra: Tubo Quadrado -> Perfil Z Leve',
      diffFields: [
        { fieldName: 'Tempo Setup', currentVal: 'Não cadastrado', importVal: '105 min' },
        { fieldName: 'Tempo Acerto', currentVal: 'Não cadastrado', importVal: '25 min' },
        { fieldName: 'Origem', currentVal: '-', importVal: 'ENGENHARIA' },
      ],
      aiClassification: '🟢 COERENTE — Estimativa por analogia com Perfil U.',
    },
    {
      id: 'prev-3',
      status: 'MODIFIED',
      entityType: normalizedType,
      code: 'STP_L1_TQ_TR',
      lineCode: 'L1',
      description: 'Transição Tubo Quadrado -> Tubo Retangular',
      diffFields: [
        { fieldName: 'Tempo Setup', currentVal: '90 min', importVal: '75 min' },
        { fieldName: 'Tempo Acerto', currentVal: '23 min', importVal: '15 min' },
        { fieldName: 'Origem', currentVal: 'MANUAL', importVal: 'SAP' },
      ],
      aiClassification:
        '🟡 REVISAR — Redução de 90 min para 75 min (Mediana MES: 88 min). Exige justificativa técnica.',
    },
    {
      id: 'prev-4',
      status: 'INVALID',
      entityType: normalizedType,
      code: 'STP_INVALID_UNKNOWN_LINE',
      lineCode: 'L99',
      description: 'Registro com Linha Inexistente ou Sintaxe Incorreta',
      validationErrors: [
        'Linha de produção "L99" não encontrada na Malha Industrial.',
        'Tempo de setup negativo (-15 min) rejeitado pelo validador.',
      ],
    },
  ]

  const countUnchanged = mockItems.filter((i) => i.status === 'UNCHANGED').length
  const countNew = mockItems.filter((i) => i.status === 'NEW').length
  const countModified = mockItems.filter((i) => i.status === 'MODIFIED').length
  const countInvalid = mockItems.filter((i) => i.status === 'INVALID').length

  const filteredItems = mockItems.filter((item) => {
    if (selectedFilter === 'ALL') return true
    return item.status === selectedFilter
  })

  const handleConfirm = () => {
    onConfirmSendToWorkflow(mockItems.filter((i) => i.status !== 'INVALID'))
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-6 bg-white text-slate-900 border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Prévia da Importação Oficial & Validação Estrutural
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-blue-50 text-[#004C97] border-blue-200"
                >
                  {templateType}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A importação NÃO substitui dados oficiais diretamente. Os registros serão validados
                contra a malha SAP/MES e enviados à esteira de revisão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 4 CARDS DE STATUS DA IMPORTAÇÃO (REQUISITO 10) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'UNCHANGED' ? 'ALL' : 'UNCHANGED')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedFilter === 'UNCHANGED'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Sem Alteração
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                {countUnchanged}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Registros idênticos aos vigentes</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'NEW' ? 'ALL' : 'NEW')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedFilter === 'NEW'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Novo Registro
              </span>
              <Badge className="bg-amber-100 text-amber-800 text-[10px]">{countNew}</Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Parâmetros inexistentes no cadastro</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'MODIFIED' ? 'ALL' : 'MODIFIED')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedFilter === 'MODIFIED'
                ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-orange-800">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                Alteração
              </span>
              <Badge className="bg-orange-100 text-orange-800 text-[10px]">{countModified}</Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Diverge do valor vigente publicado</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'INVALID' ? 'ALL' : 'INVALID')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              selectedFilter === 'INVALID'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
              <span className="flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                Inválido
              </span>
              <Badge className="bg-rose-100 text-rose-800 text-[10px]">{countInvalid}</Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Erros de validação ou chaves nulas</p>
          </button>
        </div>

        {/* LISTA / TABELA COMPARATIVA DOS ITENS */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                item.status === 'UNCHANGED'
                  ? 'bg-slate-50/70 border-slate-200'
                  : item.status === 'NEW'
                    ? 'bg-amber-50/40 border-amber-200'
                    : item.status === 'MODIFIED'
                      ? 'bg-orange-50/40 border-orange-200'
                      : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.status === 'UNCHANGED' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                      🟢 Sem Alteração
                    </Badge>
                  )}
                  {item.status === 'NEW' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                      🟡 Novo Registro
                    </Badge>
                  )}
                  {item.status === 'MODIFIED' && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">
                      🟠 Alteração de Registro Existente
                    </Badge>
                  )}
                  {item.status === 'INVALID' && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                      🔴 Registro Inválido
                    </Badge>
                  )}
                  <span className="font-bold text-slate-800 font-mono">{item.code}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-semibold text-blue-700">Linha {item.lineCode}</span>
                </div>
                <span className="text-slate-500 text-[11px]">{item.description}</span>
              </div>

              {/* Tabela Comparativa Campo | Atual | Importado (Para MODIFIED e NEW) */}
              {item.diffFields && item.diffFields.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-md overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                        <th className="p-1.5 px-2.5">Campo Paramétrico</th>
                        <th className="p-1.5 px-2.5">Valor Atual Cadastrado</th>
                        <th className="p-1.5 px-2.5">Valor Importado</th>
                        <th className="p-1.5 px-2.5 text-center">Ação Proposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.diffFields.map((diff, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="p-1.5 px-2.5 font-medium text-slate-700">
                            {diff.fieldName}
                          </td>
                          <td className="p-1.5 px-2.5 font-mono text-slate-500 line-through">
                            {diff.currentVal}
                          </td>
                          <td className="p-1.5 px-2.5 font-mono font-bold text-[#004C97]">
                            {diff.importVal}
                          </td>
                          <td className="p-1.5 px-2.5 text-center">
                            <span className="text-[10px] font-semibold text-amber-700">
                              Requer Validação MES/IA
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Erros de validação (Para INVALID) */}
              {item.validationErrors && (
                <div className="p-2 bg-rose-100/60 border border-rose-200 rounded text-rose-800 text-[11px] space-y-0.5">
                  <span className="font-bold block">Inconsistências detectadas:</span>
                  {item.validationErrors.map((err, idx) => (
                    <div key={idx}>&bull; {err}</div>
                  ))}
                </div>
              )}

              {/* Classificação IA */}
              {item.aiClassification && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-slate-200 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{item.aiClassification}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-slate-500">
            {mockItems.filter((i) => i.status !== 'INVALID').length} registro(s) elegíveis para
            esteira de revisão.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs h-8 gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Enviar para Esteira de Revisão</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
