import React, { useState, useEffect } from 'react'
import {
  X,
  FileText,
  AlertTriangle,
  Sparkles,
  History,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Factory,
  User,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Send,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import type {
  SapCogiPendency,
  SapCo1pPendency,
  SapTreatmentStatus,
  SapPendencyAuditLog,
  SgqProcedureGuidance,
  SimilarOccurrencesResult,
} from '@/types/sap-pendencies'
import { sapPendenciesService } from '@/services/sap-pendencies-service'

interface SapPendencyDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: SapCogiPendency | SapCo1pPendency | null
  type: 'COGI' | 'CO1P'
  onStatusUpdated?: () => void
  onFindSimilar?: (record: SapCogiPendency | SapCo1pPendency) => void
}

export const SapPendencyDetailModal: React.FC<SapPendencyDetailModalProps> = ({
  open,
  onOpenChange,
  record,
  type,
  onStatusUpdated,
  onFindSimilar,
}) => {
  const [activeTab, setActiveTab] = useState('dados-sap')
  const [treatmentStatus, setTreatmentStatus] = useState<SapTreatmentStatus>('Nova')
  const [assignedName, setAssignedName] = useState('')
  const [treatmentComment, setTreatmentComment] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [auditLogs, setAuditLogs] = useState<SapPendencyAuditLog[]>([])
  const [sgqGuidance, setSgqGuidance] = useState<SgqProcedureGuidance | null>(null)
  const [similarResult, setSimilarResult] = useState<SimilarOccurrencesResult | null>(null)

  useEffect(() => {
    if (record && open) {
      setTreatmentStatus(record.treatment_status || 'Nova')
      setAssignedName(record.responsavel_tratamento_nome || '')
      setTreatmentComment('')
      loadAuditAndGuidance(record)
    }
  }, [record, open])

  const loadAuditAndGuidance = async (rec: SapCogiPendency | SapCo1pPendency) => {
    // Carregar orientação SGQ sem invenção de procedimentos
    const guidance = await sapPendenciesService.getSgqGuidance({
      category: rec.categoria_ia,
      sap_msg_code: rec.sap_msg_code,
      movement_type: 'tipo_movimento' in rec ? rec.tipo_movimento : undefined,
    })
    setSgqGuidance(guidance)

    // Carregar auditoria imutável
    const logs = await sapPendenciesService.getAuditLogs(rec.id)
    setAuditLogs(logs)

    // Carregar resumo rápido de ocorrências similares
    const all =
      type === 'COGI'
        ? (await sapPendenciesService.listCogiPendencies()).data
        : (await sapPendenciesService.listCo1pPendencies()).data
    const sim = await sapPendenciesService.findSimilarOccurrences(rec, all)
    setSimilarResult(sim)
  }

  if (!record) return null

  const handleSaveTreatment = async () => {
    setIsSaving(true)
    try {
      const ok = await sapPendenciesService.updateTreatment({
        type,
        id: record.id,
        newStatus: treatmentStatus,
        assignedUserName: assignedName,
        comment: treatmentComment,
      })
      if (ok) {
        onStatusUpdated?.()
        await loadAuditAndGuidance(record)
        setTreatmentComment('')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'CRITICA':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">🔴 Crítica</Badge>
      case 'URGENTE':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">🟠 Urgente</Badge>
      case 'ATENCAO':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">🟡 Atenção</Badge>
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">🟢 Baixa</Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50">
        {/* Header Institucional CIAFAL */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-100 tracking-tight">
                  Pendência {type} — Ordem {record.op_number || 'S/N'}
                </DialogTitle>
                {getCriticalityBadge(record.criticality)}
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-300 font-mono text-[10px]"
                >
                  Cód: {record.sap_msg_code}
                </Badge>
                {record.is_demo && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                    Dados de demonstração
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-2xl font-mono">
                {record.material_code} - {record.material_description} (Centro {record.centro_code})
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mensagem SAP preservada em destaque */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-5 py-2.5 flex items-start gap-2.5 text-xs text-amber-950 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-[11px] uppercase tracking-wide text-amber-900 mr-2">
              Mensagem Original SAP (Ipsis Litteris):
            </span>
            <span className="font-mono text-slate-900 select-all font-semibold">
              {record.sap_message}
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-800 shrink-0">
            Idade: {record.idade_horas}h
          </div>
        </div>

        {/* Corpo com as 6 Abas */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="bg-white border border-slate-200 p-1 w-full justify-start gap-1 h-auto shrink-0 mb-4 rounded-lg flex-wrap">
              <TabsTrigger
                value="dados-sap"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                1 Dados SAP
              </TabsTrigger>
              <TabsTrigger
                value="diagnostico-ia"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                2 Diagnóstico IA
              </TabsTrigger>
              <TabsTrigger
                value="acao-recomendada"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                3 Ação recomendada
              </TabsTrigger>
              <TabsTrigger
                value="documento-sgq"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                4 Documento SGQ
              </TabsTrigger>
              <TabsTrigger
                value="ocorrencias-semelhantes"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                5 Ocorrências semelhantes ({similarResult?.total_encontradas || 0})
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                6 Histórico
              </TabsTrigger>
              <TabsTrigger
                value="auditoria"
                className="text-xs py-1.5 px-2.5 sm:px-3 data-[state=active]:bg-blue-50 data-[state=active]:text-[#004C97] data-[state=active]:font-bold"
              >
                7 Auditoria ({auditLogs.length})
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS SAP */}
            <TabsContent value="dados-sap" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Ordem de Produção
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {record.op_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Material
                  </span>
                  <span className="font-mono font-bold text-slate-800">{record.material_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Centro / Linha
                  </span>
                  <span className="text-slate-800 font-medium">
                    Centro {record.centro_code} {record.linha_code ? `(${record.linha_code})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Centro de Trabalho
                  </span>
                  <span className="font-mono text-slate-800">{record.work_center || '-'}</span>
                </div>

                {type === 'COGI' && 'tipo_movimento' in record && (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Tipo Movimento
                      </span>
                      <span className="font-mono font-bold text-blue-700">
                        {record.tipo_movimento}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Quantidade Afetada
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {record.quantidade} {record.unidade_medida}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Depósito
                      </span>
                      <span className="font-mono text-slate-800">{record.deposito || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Lote
                      </span>
                      <span className="font-mono text-slate-800">{record.lote || 'Sem lote'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Data de Criação
                      </span>
                      <span className="text-slate-800">{record.data_criacao}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Data do Erro
                      </span>
                      <span className="text-slate-800">{record.data_erro}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Contador Técnico
                      </span>
                      <span className="font-mono text-slate-800">
                        {record.contador_tecnico || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Área Funcional
                      </span>
                      <span className="text-slate-800">{record.area_funcional || '-'}</span>
                    </div>
                  </>
                )}

                {type === 'CO1P' && 'confirmation_number' in record && (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Nº Confirmação
                      </span>
                      <span className="font-mono font-bold text-blue-700">
                        {record.confirmation_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Contador
                      </span>
                      <span className="font-mono text-slate-800">
                        {record.confirmation_counter}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Nº Reserva
                      </span>
                      <span className="font-mono text-slate-800">
                        {record.reservation_number || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Processo de Confirmação
                      </span>
                      <span className="text-slate-800 font-semibold">
                        {record.processo_confirmacao}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Operação
                      </span>
                      <span className="font-mono text-slate-800">{record.operacao || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Data/Hora Confirmação
                      </span>
                      <span className="text-slate-800">{record.data_hora_confirmacao}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Geração da Pendência
                      </span>
                      <span className="text-slate-800">{record.data_hora_geracao_pendencia}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Cadeia de Rastreabilidade CO1P */}
              {type === 'CO1P' && 'confirmation_number' in record && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs">
                  <span className="font-bold text-[11px] text-blue-900 uppercase block mb-2">
                    Cadeia Técnica de Rastreabilidade:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-800">
                      Ordem: {record.op_number}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-800">
                      Confirmação: {record.confirmation_number}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-800">
                      Reserva: {record.reservation_number || 'S/N'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-800">
                      Material: {record.material_code}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span className="bg-rose-100 px-2 py-1 rounded border border-rose-200 font-bold text-rose-800">
                      Erro: {record.sap_msg_code}
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA 2: DIAGNÓSTICO IA */}
            <TabsContent
              value="diagnostico-ia"
              className="space-y-4 m-0 focus-visible:outline-none"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">
                    Categoria IA Atribuída
                  </span>
                  <span className="font-bold text-slate-800 text-sm block">
                    {record.categoria_ia}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Classificação paramétrica automatizada a partir da mensagem técnica SAP.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">
                    Área Responsável Sugerida
                  </span>
                  <span className="font-bold text-indigo-700 text-sm block">
                    {record.area_responsavel_sugerida}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sugestão consultiva da IA — não altera o responsável oficial sem validação
                    humana.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">
                    Impactos e Travas
                  </span>
                  <div className="space-y-1 mt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${record.impacta_programacao ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      />
                      <span className="text-slate-700">
                        {record.impacta_programacao
                          ? 'Impacta programação vigente'
                          : 'Sem impacto imediato na programação'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${record.bloqueia_fechamento ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      />
                      <span className="text-slate-700">
                        {record.bloqueia_fechamento
                          ? 'Bloqueia encerramento técnico (TECO)'
                          : 'Não bloqueia encerramento técnico'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fatos Identificados vs Hipóteses da IA (Estrita separação metodológica) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase text-emerald-900 tracking-wide">
                      Fatos Identificados (Confirmados no Sistema)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {record.ai_diagnosis_facts && record.ai_diagnosis_facts.length > 0 ? (
                      record.ai_diagnosis_facts.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{fact}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500">
                        Ocorrência registrada no log de execução SAP ECC.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-xs uppercase text-amber-900 tracking-wide">
                      Hipóteses da IA (Causas Prováveis)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {record.ai_diagnosis_hypotheses && record.ai_diagnosis_hypotheses.length > 0 ? (
                      record.ai_diagnosis_hypotheses.map((hyp, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">?</span>
                          <span>{hyp}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500">
                        Nenhuma hipótese de anomalia profunda inferida para este caso.
                      </li>
                    )}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-amber-100 text-[10px] text-amber-800 italic">
                    * Hipóteses são correlações estatísticas e devem ser checadas pelo responsável
                    antes da ação.
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: AÇÃO RECOMENDADA */}
            <TabsContent
              value="acao-recomendada"
              className="space-y-4 m-0 focus-visible:outline-none"
            >
              <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Roteiro de Tratamento Operacional
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Guia Normativo Integrado
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <span className="font-bold text-slate-700 block">Problema identificado:</span>
                    <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                      {record.ai_recommended_action?.problema_identificado || record.sap_message}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block">Possível impacto:</span>
                    <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
                      {record.ai_recommended_action?.possivel_impacto ||
                        'Bloqueio de ordens e divergência contábil de estoques.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Passos de Verificação Recomendados:
                    </span>
                    <div className="bg-blue-50/60 p-3 rounded border border-blue-100 space-y-1 font-mono text-[11px] text-blue-950">
                      {record.ai_recommended_action?.verificar &&
                      record.ai_recommended_action.verificar.length > 0 ? (
                        record.ai_recommended_action.verificar.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span>{step}</span>
                          </div>
                        ))
                      ) : (
                        <div>
                          1. Consultar procedimento SGQ correspondente; 2. Verificar estoque físico
                          e status do lote.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trava Absoluta: NUNCA executa correções SAP automaticamente */}
                <div className="bg-slate-100 border border-slate-300 rounded p-3 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 uppercase block">
                    Diretriz de Segurança do HUB CIAFAL (Ações Restritas):
                  </span>
                  <p>
                    A inteligência artificial atua exclusivamente como ferramenta consultiva de
                    análise, orientação e correlação.
                    <strong>
                      {' '}
                      É expressamente proibida a execução automática de movimentações, desbloqueios
                      de lote, estornos ou reprocessamentos no SAP.
                    </strong>
                    Todas as correções físicas ou transacionais devem ser efetuadas pelos usuários
                    autorizados no SAP ECC conforme aprovação da área competente.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: DOCUMENTO SGQ (INTEGRAÇÃO OBRIGATÓRIA) */}
            <TabsContent value="documento-sgq" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Associação SGQ Oficial (Fonte da Orientação)
                    </h4>
                  </div>
                  {sgqGuidance?.has_sgq_document ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                      Documento SGQ Vinculado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]"
                    >
                      Sem Vínculo SGQ
                    </Badge>
                  )}
                </div>

                {sgqGuidance?.has_sgq_document ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">
                          Código
                        </span>
                        <span className="font-mono font-bold text-[#004C97] text-sm">
                          {sgqGuidance.sgq_document_code}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">
                          Título
                        </span>
                        <span className="font-semibold text-slate-800">
                          {sgqGuidance.sgq_document_title}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">
                          Revisão / Data
                        </span>
                        <span className="font-mono text-slate-700 text-xs">
                          {sgqGuidance.sgq_document_revision}{' '}
                          {sgqGuidance.sgq_document_date
                            ? `(${sgqGuidance.sgq_document_date})`
                            : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">
                          Status
                        </span>
                        <div className="flex items-center gap-1.5 w-full justify-between">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            {sgqGuidance.sgq_document_status || 'Vigente'}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (onOpenSgqModal) {
                                onOpenSgqModal()
                              } else {
                                toast({
                                  title: 'Documento SGQ',
                                  description: `Consulta ao procedimento ${sgqGuidance.sgq_document_code} - ${sgqGuidance.sgq_document_title}`,
                                })
                              }
                            }}
                            className="h-6 text-[10px] px-2 border-[#004C97] text-[#004C97] hover:bg-blue-50"
                          >
                            Consultar documento
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">
                        Procedimento Aplicável:
                      </span>
                      <p className="bg-white p-3 rounded border border-slate-200 text-slate-800 leading-relaxed font-mono text-[11px]">
                        {sgqGuidance.sgq_applicable_procedure}
                      </p>
                    </div>

                    {sgqGuidance.sgq_recommended_step && (
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">
                          Etapa Recomendada pelo SGQ:
                        </span>
                        <p className="bg-white p-3 rounded border border-slate-200 text-slate-800 leading-relaxed">
                          {sgqGuidance.sgq_recommended_step}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block">
                          Responsável Definido pelo Procedimento:
                        </span>
                        <span className="text-slate-800 font-semibold">
                          {sgqGuidance.sgq_procedure_responsible || 'PCP / Qualidade'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">Restrições SGQ:</span>
                        <span className="text-rose-700 font-medium">
                          {sgqGuidance.sgq_restrictions || 'Nenhuma restrição adicional'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                      Fonte da orientação: [{sgqGuidance.sgq_document_code} /{' '}
                      {sgqGuidance.sgq_document_title} / {sgqGuidance.sgq_document_revision}]
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-900 space-y-2">
                    <p className="font-semibold">
                      Nenhum procedimento SGQ está associado a esta categoria de ocorrência.
                    </p>
                    <p className="text-[11px] text-amber-800">
                      O HUB CIAFAL não inventa procedimentos internos. Consulte o administrador do
                      SGQ ou acesse a Matriz de Procedimentos SGQ para vinculação oficial.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA 5: OCORRÊNCIAS SEMELHANTES */}
            <TabsContent
              value="ocorrencias-semelhantes"
              className="space-y-4 m-0 focus-visible:outline-none"
            >
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Ocorrências Semelhantes no SAP (Mesmo Material / Mensagem / Chave)
                    </h4>
                  </div>
                  {onFindSimilar && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFindSimilar(record)}
                      className="text-xs h-7 gap-1"
                    >
                      Ver no Painel Geral
                    </Button>
                  )}
                </div>

                {similarResult && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Total Encontradas
                        </span>
                        <span className="font-bold text-slate-800 text-sm font-mono">
                          {similarResult.total_encontradas}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Primeira Ocorrência
                        </span>
                        <span className="text-slate-700">{similarResult.primeira_ocorrencia}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Tempo Médio Solução
                        </span>
                        <span className="text-slate-700 font-mono">
                          {similarResult.tempo_medio_solucao_horas}h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Reincidência Pós-Tratamento
                        </span>
                        <span className="text-slate-700 font-mono">
                          {similarResult.reincidencia_apos_correcao_pct}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">
                        Registros Similares Identificados:
                      </span>
                      <div className="space-y-1.5">
                        {similarResult.registros_similares.map((sim) => (
                          <div
                            key={sim.id}
                            className="p-2.5 rounded border border-slate-200 bg-white flex flex-wrap items-center justify-between text-xs gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-700">
                                OP {sim.op_number}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="font-mono text-slate-800">{sim.material_code}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-600 truncate max-w-xs">
                                {sim.sap_message}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {sim.treatment_status}
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {sim.idade_horas}h atrás
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA 6: HISTÓRICO DA PENDÊNCIA */}
            <TabsContent value="historico" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Histórico e Ciclo de Vida da Ocorrência
                    </h4>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ID: {record.id}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">
                      Data/Hora de Criação
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {record.data_criacao || (record as any).data_hora_geracao_pendencia || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">
                      Idade Atual da Pendência
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {record.idade_horas} horas em aberto
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">
                      Status Atual
                    </span>
                    <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-medium mt-0.5">
                      {record.treatment_status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">
                    Linha do Tempo da Ocorrência:
                  </span>
                  <div className="border-l-2 border-blue-200 pl-3 space-y-3">
                    <div className="relative">
                      <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-700" />
                      <div className="font-semibold text-slate-800">
                        Geração da Pendência no SAP
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {record.data_erro ||
                          (record as any).data_hora_confirmacao ||
                          'Registro inicial'}{' '}
                        &bull; Centro {record.centro_code}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                        {record.sap_message}
                      </p>
                    </div>

                    {record.treatment_notes && (
                      <div className="relative">
                        <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <div className="font-semibold text-slate-800">
                          Notas de Tratamento Registradas
                        </div>
                        <p className="text-slate-700 text-[11px] mt-0.5 bg-emerald-50/70 p-2 rounded border border-emerald-200 whitespace-pre-wrap">
                          {record.treatment_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 7: AUDITORIA IMUTÁVEL */}
            <TabsContent value="auditoria" className="space-y-4 m-0 focus-visible:outline-none">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                      Trilha de Auditoria Imutável do HUB CIAFAL
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Registros permanentes
                  </span>
                </div>

                {auditLogs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="font-mono text-slate-500">
                            {log.created ? new Date(log.created).toLocaleString('pt-BR') : '-'}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          {log.comment || 'Ação registrada no sistema.'}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200">
                          <span>Usuário: {log.user_name || 'Sistema'}</span>
                          {log.previous_status && log.new_status && (
                            <span>
                              De: <strong>{log.previous_status}</strong> → Para:{' '}
                              <strong>{log.new_status}</strong>
                            </span>
                          )}
                          {log.assigned_user_name && (
                            <span>Responsável: {log.assigned_user_name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhum registro de auditoria manual ainda. Esta pendência permanece em seu
                    estado inicial.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodapé: Ações de Tratamento e Atribuição */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
            <div className="w-44">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                Status de Tratamento
              </label>
              <Select
                value={treatmentStatus}
                onValueChange={(val) => setTreatmentStatus(val as SapTreatmentStatus)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nova">Nova</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Em tratamento">Em tratamento</SelectItem>
                  <SelectItem value="Aguardando outra área">Aguardando outra área</SelectItem>
                  <SelectItem value="Corrigida">Corrigida</SelectItem>
                  <SelectItem value="Aguardando reprocessamento SAP">
                    Aguardando reprocessamento SAP
                  </SelectItem>
                  <SelectItem value="Reprocessada">Reprocessada</SelectItem>
                  <SelectItem value="Não resolvida">Não resolvida</SelectItem>
                  <SelectItem value="Encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-52">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                Responsável pelo Tratamento
              </label>
              <Input
                value={assignedName}
                onChange={(e) => setAssignedName(e.target.value)}
                placeholder="Nome do usuário HUB"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                Observação / Registro de Ação
              </label>
              <Input
                value={treatmentComment}
                onChange={(e) => setTreatmentComment(e.target.value)}
                placeholder="Ex: Alinhado com almoxarifado transferência depósito 0005..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSaveTreatment}
              className="text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar Tratamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
