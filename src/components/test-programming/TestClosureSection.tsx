import React, { useState, useEffect } from 'react'
import {
  FileCheck2,
  AlertTriangle,
  Save,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TestProgrammingRecord } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { sgqDocumentProvider, SgqDocument } from '@/services/sgq-document-provider'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface TestClosureSectionProps {
  test: TestProgrammingRecord
  onSaved?: (updatedTest: TestProgrammingRecord) => void
}

export const TestClosureSection: React.FC<TestClosureSectionProps> = ({ test, onSaved }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [conclusion, setConclusion] = useState<string>(test.conclusion || '')
  const [needsRevision, setNeedsRevision] = useState<boolean>(test.needs_revision ?? false)
  const [revisionTypes, setRevisionTypes] = useState<string>(test.revision_types || '')
  const [revisionReason, setRevisionReason] = useState<string>(test.revision_reason || '')
  const [revisionDocCode, setRevisionDocCode] = useState<string>(test.revision_document_code || '')
  const [revisionDocTitle, setRevisionDocTitle] = useState<string>(
    test.revision_document_title || '',
  )
  const [revisionDocVersion, setRevisionDocVersion] = useState<string>(
    test.revision_document_version || '',
  )
  const [revisionStatus, setRevisionStatus] = useState<string>(
    test.revision_status || (test.needs_revision ? 'Pendente' : 'Não aplicável'),
  )

  const [sgqDocuments, setSgqDocuments] = useState<SgqDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Carrega documentos do SGQ oficial existente
  useEffect(() => {
    let mounted = true
    const loadDocs = async () => {
      setLoadingDocs(true)
      try {
        const docs = await sgqDocumentProvider.searchDocuments({ status: 'VIGENTE' })
        if (mounted) {
          setSgqDocuments(docs)
        }
      } catch (err) {
        console.error('Falha ao carregar documentos SGQ:', err)
      } finally {
        if (mounted) setLoadingDocs(false)
      }
    }
    loadDocs()
    return () => {
      mounted = false
    }
  }, [])

  // Sincroniza quando o test prop muda
  useEffect(() => {
    setConclusion(test.conclusion || '')
    setNeedsRevision(test.needs_revision ?? false)
    setRevisionTypes(test.revision_types || '')
    setRevisionReason(test.revision_reason || '')
    setRevisionDocCode(test.revision_document_code || '')
    setRevisionDocTitle(test.revision_document_title || '')
    setRevisionDocVersion(test.revision_document_version || '')
    setRevisionStatus(
      test.revision_status || (test.needs_revision ? 'Pendente' : 'Não aplicável'),
    )
    setValidationError(null)
  }, [test])

  const handleSelectSgqDoc = (docCode: string) => {
    setRevisionDocCode(docCode)
    const found = sgqDocuments.find((d) => d.code === docCode)
    if (found) {
      setRevisionDocTitle(found.title)
      setRevisionDocVersion(found.version)
    }
  }

  const handleSave = async () => {
    setValidationError(null)

    if (!conclusion.trim()) {
      setValidationError('O campo de Conclusão é obrigatório para o fechamento do teste.')
      return
    }

    if (needsRevision) {
      if (!revisionTypes) {
        setValidationError('Selecione o Tipo de Revisão obrigatório.')
        return
      }
      if (!revisionReason.trim()) {
        setValidationError('O Motivo da Revisão é obrigatório quando há necessidade de revisão.')
        return
      }
    }

    setIsSaving(true)
    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const payload: Partial<TestProgrammingRecord> = {
        conclusion: conclusion.trim(),
        conclusion_user_id: user?.id || test.conclusion_user_id || 'system',
        conclusion_user_name: user?.name || user?.email || test.conclusion_user_name || 'Usuário PCP',
        conclusion_date: test.conclusion_date || dateStr,
        conclusion_time: test.conclusion_time || timeStr,
        needs_revision: needsRevision,
        revision_types: needsRevision ? (revisionTypes as any) : undefined,
        revision_reason: needsRevision ? revisionReason.trim() : undefined,
        revision_document_code: needsRevision ? revisionDocCode : undefined,
        revision_document_title: needsRevision ? revisionDocTitle : undefined,
        revision_document_version: needsRevision ? revisionDocVersion : undefined,
        revision_status: needsRevision
          ? (revisionStatus as any || 'Pendente')
          : 'Não aplicável',
      }

      const updated = await testProgrammingService.update(
        test.id,
        payload,
        { id: user?.id, name: user?.name || 'Programador PCP', role: user?.role },
        'Fechamento do teste e governança de revisão',
        'Previsto x Realizado',
      )

      toast({
        title: 'Fechamento do teste gravado com sucesso',
        description: needsRevision
          ? 'Revisão registrada com status Pendente de governança.'
          : 'Conclusão registrada sem necessidade de revisão.',
      })

      onSaved?.(updated)
    } catch (err: any) {
      toast({
        title: 'Erro ao gravar fechamento',
        description: err?.message || 'Falha ao persistir conclusão.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="p-3 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5 text-[#004C97]" />
          <span>Fechamento do Teste & Governança de Revisão</span>
        </CardTitle>
        {test.conclusion_date && (
          <span className="text-[11px] text-slate-500 font-mono">
            Concluído em: {formatDatePTBR(test.conclusion_date)} às {test.conclusion_time || '--:--'} por{' '}
            <strong className="text-slate-700">{test.conclusion_user_name}</strong>
          </span>
        )}
      </CardHeader>

      <CardContent className="p-3.5 space-y-3.5">
        {/* ALERTA VISUAL SE REVISÃO NECESSÁRIA */}
        {needsRevision && (
          <div
            data-testid="closure-revision-alert"
            className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg flex items-start gap-2.5 text-amber-950 animate-in fade-in"
          >
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-900 tracking-wide flex items-center gap-1.5">
                  ⚠ REVISÃO NECESSÁRIA
                </span>
                <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                  Status: {revisionStatus || 'Pendente'}
                </Badge>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Este teste gerou impacto nos padrões industriais. É mandatório revisar os
                documentos ou metas antes de novas campanhas operacionais na linha.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 text-[11px] font-medium border-t border-amber-200">
                <div>
                  <span className="text-amber-700 block text-[10px]">Teste:</span>
                  <span className="font-bold font-mono">{test.test_id || test.title}</span>
                </div>
                <div>
                  <span className="text-amber-700 block text-[10px]">Linha / Centro:</span>
                  <span className="font-bold">
                    {test.production_line} • {test.work_center || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700 block text-[10px]">Responsável Técnico:</span>
                  <span className="font-bold">{test.technical_lead}</span>
                </div>
                <div>
                  <span className="text-amber-700 block text-[10px]">Tipo de Revisão:</span>
                  <span className="font-bold text-amber-900">{revisionTypes || 'Pendente'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CAMPO CONCLUSÃO */}
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Conclusão Técnica do Teste *</span>
            <span className="text-[10px] font-normal text-slate-400">
              Descreva os achados industriais, estabilidade, qualidade e resultado
            </span>
          </Label>
          <Textarea
            data-testid="test-conclusion-textarea"
            rows={3}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Descreva o parecer técnico detalhado após a execução do teste na linha..."
            className="text-xs resize-y"
          />
        </div>

        {/* PERGUNTA: NECESSITA REVISÃO? */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-bold text-slate-800 block">
                Necessita revisão de documento ou meta? *
              </Label>
              <span className="text-[11px] text-slate-500">
                Determina se o resultado do teste exige atualização de IT, Ficha Mestra, AOM ou meta.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={!needsRevision ? 'default' : 'outline'}
                onClick={() => {
                  setNeedsRevision(false)
                  setRevisionStatus('Não aplicável')
                }}
                className={`text-xs h-7.5 px-3.5 font-bold ${
                  !needsRevision ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white'
                }`}
              >
                Não
              </Button>
              <Button
                type="button"
                size="sm"
                variant={needsRevision ? 'default' : 'outline'}
                onClick={() => {
                  setNeedsRevision(true)
                  if (revisionStatus === 'Não aplicável') setRevisionStatus('Pendente')
                }}
                className={`text-xs h-7.5 px-3.5 font-bold ${
                  needsRevision ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-white'
                }`}
              >
                ⚠ Sim
              </Button>
            </div>
          </div>

          {/* CAMPOS CONDICIONAIS QUANDO SIM */}
          {needsRevision && (
            <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Revisão */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    Tipo de Revisão *
                  </Label>
                  <Select
                    value={revisionTypes}
                    onValueChange={(val) => setRevisionTypes(val)}
                  >
                    <SelectTrigger data-testid="revision-type-select" className="text-xs h-8 bg-white mt-1">
                      <SelectValue placeholder="Selecione o tipo de revisão..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Documento" className="text-xs">
                        Documento (IT, Ficha Mestra, Procedimento, Receita AOM)
                      </SelectItem>
                      <SelectItem value="Meta" className="text-xs">
                        Meta (Velocidade, Rendimento, Tolerância)
                      </SelectItem>
                      <SelectItem value="Documento e Meta" className="text-xs">
                        Documento e Meta (Ambos)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status da Revisão */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    Status da Revisão
                  </Label>
                  <Select
                    value={revisionStatus}
                    onValueChange={(val) => setRevisionStatus(val)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente" className="text-xs font-medium text-amber-700">
                        Pendente
                      </SelectItem>
                      <SelectItem value="Em análise" className="text-xs font-medium text-blue-700">
                        Em análise
                      </SelectItem>
                      <SelectItem value="Em revisão" className="text-xs font-medium text-purple-700">
                        Em revisão
                      </SelectItem>
                      <SelectItem value="Concluída" className="text-xs font-medium text-emerald-700">
                        Concluída
                      </SelectItem>
                      <SelectItem value="Não aplicável" className="text-xs font-medium text-slate-500">
                        Não aplicável
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo Obrigatório */}
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Motivo da Revisão *
                </Label>
                <Textarea
                  data-testid="revision-reason-textarea"
                  rows={2}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Justifique o motivo técnico da necessidade de alteração de documento ou meta..."
                  className="text-xs bg-white mt-1 resize-none"
                  required
                />
              </div>

              {/* Documento Relacionado (Fonte Oficial SGQ existente) */}
              <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#004C97] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Documento Relacionado (Catálogo SGQ Oficial Ciafal)
                  </span>
                  <span className="text-[10px] text-blue-800 font-medium">
                    {loadingDocs ? 'Carregando SGQ...' : `${sgqDocuments.length} vigentes`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-600">
                      Selecionar do Catálogo SGQ
                    </Label>
                    <Select value={revisionDocCode} onValueChange={handleSelectSgqDoc}>
                      <SelectTrigger className="text-xs h-8 bg-white mt-0.5">
                        <SelectValue placeholder="Selecione um documento SGQ..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {sgqDocuments.map((doc) => (
                          <SelectItem key={doc.code} value={doc.code} className="text-xs">
                            <span className="font-mono font-bold text-[#004C97] mr-1.5">
                              {doc.code}
                            </span>
                            <span>{doc.title}</span>{' '}
                            <span className="text-[10px] text-slate-400">({doc.version})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-600">Código</Label>
                    <input
                      type="text"
                      value={revisionDocCode}
                      onChange={(e) => setRevisionDocCode(e.target.value)}
                      placeholder="Ex: IT-L1-002"
                      className="w-full h-8 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded mt-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <Label className="text-[11px] text-slate-600">Título do Documento</Label>
                    <input
                      type="text"
                      value={revisionDocTitle}
                      onChange={(e) => setRevisionDocTitle(e.target.value)}
                      placeholder="Título oficial do documento SGQ"
                      className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">Revisão / Versão</Label>
                    <input
                      type="text"
                      value={revisionDocVersion}
                      onChange={(e) => setRevisionDocVersion(e.target.value)}
                      placeholder="Ex: Rev. 04"
                      className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-300 rounded mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {validationError && (
          <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {validationError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs h-8 gap-1.5 bg-[#004C97] hover:bg-[#003974] text-white font-bold"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Gravando Fechamento...' : 'Salvar Fechamento'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
