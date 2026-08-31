import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  ShieldCheck,
  Eye,
  Clock,
  Info,
  Check,
  AlertCircle,
  ListFilter,
  FileDown,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraUpload,
  LinhaRejeitadaDetalhe,
} from '@/types/carteira-analise'
import { CarteiraService, ValidacaoUploadResultado } from '@/services/carteira-service'

interface ImportacaoCarteiraModalProps {
  isOpen: boolean
  onClose: () => void
  onCargaConcluida: (
    upload: CarteiraUpload,
    itens: CarteiraItem[],
    entradas: CarteiraEntradaFutura[],
  ) => void
  historicoUploads: CarteiraUpload[]
  onRollback: (uploadCode: string) => Promise<void>
}

export const ImportacaoCarteiraModal: React.FC<ImportacaoCarteiraModalProps> = ({
  isOpen,
  onClose,
  onCargaConcluida,
  historicoUploads,
  onRollback,
}) => {
  const { toast } = useToast()
  const [activeStep, setActiveStep] = useState<
    'UPLOAD' | 'VALIDACAO' | 'PREVIEW' | 'HISTORICO' | 'SUCESSO'
  >('UPLOAD')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHashHex, setFileHashHex] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validacaoResultado, setValidacaoResultado] = useState<ValidacaoUploadResultado | null>(
    null,
  )

  // Estado para Modal de Confirmação de Carga Parcial
  const [isConfirmacaoParcialOpen, setIsConfirmacaoParcialOpen] = useState(false)

  // Estado com o resultado da importação concluída
  const [resultadoConcluido, setResultadoConcluido] = useState<{
    upload: CarteiraUpload
    itensValidosCount: number
    rejeitadosCount: number
    totalizacaoCount: number
    vaziasCount: number
    itens: CarteiraItem[]
    entradas: CarteiraEntradaFutura[]
  } | null>(null)

  const handleDownloadTemplate = () => {
    const blob = CarteiraService.gerarTemplateExcelBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template_Carteira_PCP_ZSD28C_QAS.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Template Gerado com Sucesso',
      description:
        'Arquivo Template_Carteira_PCP_ZSD28C_QAS.xlsx baixado com abas CARTEIRA, ENTRADAS FUTURAS e DICIONÁRIO.',
    })
  }

  const handleDownloadRelatorioErros = (formato: 'xlsx' | 'csv' = 'xlsx') => {
    if (!validacaoResultado || validacaoResultado.linhasRejeitadasDetalhes.length === 0) {
      toast({
        title: 'Nenhum erro registrado',
        description: 'Não existem registros rejeitados para exportação.',
      })
      return
    }

    const blob = CarteiraService.gerarRelatorioErrosBlob(
      validacaoResultado.linhasRejeitadasDetalhes,
      formato,
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Relatorio_Rejeicoes_${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'ZSD28C'}.${formato}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Relatório de Rejeições Baixado',
      description: `Arquivo com ${validacaoResultado.linhasRejeitadasDetalhes.length} linhas rejeitadas exportado em .${formato}.`,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'txt' && ext !== 'xlsx' && ext !== 'xls') {
      toast({
        variant: 'destructive',
        title: 'Formato Não Autorizado',
        description:
          'Selecione apenas arquivos no formato autorizado (.xlsx, .xls, .csv, .txt) do layout CIAFAL / ZSD28C.',
      })
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer
      const hash = await CarteiraService.calcularHashSHA256(buffer)
      setFileHashHex(hash)
      executarValidacao(buffer, file.name, hash)
    }
    reader.readAsArrayBuffer(file)
  }

  const executarValidacao = async (buffer: ArrayBuffer, fileName: string, hash: string) => {
    try {
      const { linhasCarteira, linhasEntradasFuturas } = CarteiraService.parseArquivoBuffer(
        buffer,
        fileName,
      )

      if (linhasCarteira.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Arquivo Vazio ou Aba Incorreta',
          description: 'Não foram encontradas linhas de carteira válidas no arquivo enviado.',
        })
        return
      }

      const res = CarteiraService.validarLinhasCarteira(linhasCarteira, linhasEntradasFuturas)
      setValidacaoResultado(res)
      setActiveStep('VALIDACAO')

      const cargaExistente = await CarteiraService.verificarCargaDuplicadaPorHash(hash)
      if (cargaExistente) {
        toast({
          title: 'Aviso de Idempotência / Arquivo já importado',
          description: `Este mesmo arquivo já foi processado anteriormente (Carga: ${cargaExistente.upload_code}). Uma nova confirmação atualizará a versão vigente da carteira.`,
        })
      }

      if (res.temErroCriticoEstrutural) {
        toast({
          variant: 'destructive',
          title: 'ERRO CRÍTICO (Nível 3) — Arquivo Incompatível',
          description: res.mensagemEstrutural || 'Coluna de Material não encontrada.',
        })
      } else if (res.linhasRejeitadas > 0 && res.linhasValidas > 0) {
        toast({
          title: 'Registros com Inconsistência Detectados',
          description: `${res.linhasValidas} linhas válidas e ${res.linhasRejeitadas} rejeitada(s). Importação parcial disponível mediante confirmação.`,
        })
      } else if (res.valido) {
        toast({
          title: 'Arquivo Validado com Sucesso',
          description: `${res.linhasValidas} linhas válidas prontas para processamento. Linhas não transacionais foram desconsideradas.`,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Validação do Arquivo',
        description: err.message,
      })
    }
  }

  const handleExecutarCarga = async (isParcial = false) => {
    if (
      !validacaoResultado ||
      validacaoResultado.itensValidos.length === 0 ||
      validacaoResultado.temErroCriticoEstrutural
    ) {
      toast({
        variant: 'destructive',
        title: 'Carga Não Autorizada',
        description:
          'Não é possível processar arquivos com erro estrutural crítico ou sem registros válidos.',
      })
      return
    }

    setIsProcessing(true)
    try {
      const uploadCode = `CARGA-QAS-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`

      const novaCarga: CarteiraUpload = {
        upload_code: uploadCode,
        filename: selectedFile?.name || 'ZSD28C_Carga.xlsx',
        file_hash: fileHashHex,
        file_hash_sha256: fileHashHex,
        snapshot_version: `SNAP-${uploadCode}`,
        execution_status: isParcial ? 'SUCESSO_PARCIAL_HOMOLOGADO' : 'SUCESSO_HOMOLOGADO',
        reconciliation_status: 'PARIDADE_100',
        environment: 'QAS',
        file_size_bytes: selectedFile?.size || 0,
        total_rows: validacaoResultado.totalLinhas,
        valid_rows: validacaoResultado.linhasValidas,
        warning_rows: validacaoResultado.linhasComAlerta,
        rejected_rows: validacaoResultado.linhasRejeitadas,
        ignored_rows: validacaoResultado.linhasTotalIgnoradas,
        empty_rows: validacaoResultado.linhasVaziasIgnoradas,
        total_aggregation_rows: validacaoResultado.linhasIgnoradasTotalizacao,
        status: isParcial ? 'IMPORTADO_PARCIAL' : 'IMPORTADO_COMPLETO',
        source_mode: 'EXCEL_ZSD28C',
        user_name: 'Usuário PCP Autorizado',
        user_email: 'pcp@ciafal.com.br',
        version_tag: `v${new Date().toISOString().substring(0, 10)}`,
        validation_log: {
          errors: validacaoResultado.erros,
          warnings: validacaoResultado.alertas,
          duplicados: validacaoResultado.duplicados,
          rejectedDetails: validacaoResultado.linhasRejeitadasDetalhes,
          ignoredDetails: validacaoResultado.linhasIgnoradasDetalhes,
          file_hash_sha256: fileHashHex,
          logs: validacaoResultado.logsProcessamento,
          isPartialImport: isParcial,
        },
        summary_kpis: {
          total_carteira_tons: validacaoResultado.itensValidos.reduce(
            (s, i) => s + (i.carteira_aberta_tons || 0),
            0,
          ),
          total_estoque_tons: validacaoResultado.itensValidos.reduce(
            (s, i) => s + (i.disponibilidade_fisica_elegivel_tons || 0),
            0,
          ),
          saldo_positivo_tons: validacaoResultado.itensValidos.reduce(
            (s, i) => s + (i.saldo_positivo_tons || 0),
            0,
          ),
          saldo_negativo_tons: validacaoResultado.itensValidos.reduce(
            (s, i) => s + (i.saldo_negativo_tons || 0),
            0,
          ),
          mto_a_produzir_tons: validacaoResultado.itensValidos
            .filter((i) => i.tipo_ordem === 'MTO' && i.status_atendimento === 'A_PRODUZIR')
            .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0),
          mto_a_faturar_tons: validacaoResultado.itensValidos
            .filter((i) => i.tipo_ordem === 'MTO' && i.status_atendimento === 'A_FATURAR')
            .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0),
          pedidos_atrasados: validacaoResultado.itensValidos.filter(
            (i) => new Date(i.data_desejada) < new Date(),
          ).length,
          materiais_em_ruptura: validacaoResultado.itensValidos.filter(
            (i) => i.status_ruptura === 'VERMELHO',
          ).length,
          possiveis_duplicidades: validacaoResultado.itensValidos.filter(
            (i) => i.possivel_duplicidade,
          ).length,
        },
        is_active_current: true,
      }

      const uploadSalvo = await CarteiraService.salvarCargaNoPocketBase(
        novaCarga,
        validacaoResultado.itensValidos,
        validacaoResultado.entradasFuturasValidas,
        {
          usuarioConfirmouParcial: isParcial,
          rejeitadosDesconsideradosQtd: validacaoResultado.linhasRejeitadas,
        },
      )

      // Notifica o barramento central PCPDataLayer (CARTEIRA_UPDATED)
      const { pcpDataLayer } = await import('@/services/pcp-data-layer')
      pcpDataLayer.publish(
        'CARTEIRA_UPDATED',
        'CARTEIRA_ZSD28C',
        {
          upload_code: uploadSalvo.upload_code,
          total_itens: validacaoResultado.itensValidos.length,
          status: uploadSalvo.status,
          is_partial: isParcial,
          timestamp: new Date().toISOString(),
        },
        uploadSalvo.upload_code,
      )

      // Atualiza estado de sucesso inequívoco pós-confirmação
      setResultadoConcluido({
        upload: uploadSalvo,
        itensValidosCount: validacaoResultado.linhasValidas,
        rejeitadosCount: validacaoResultado.linhasRejeitadas,
        totalizacaoCount: validacaoResultado.linhasIgnoradasTotalizacao,
        vaziasCount: validacaoResultado.linhasVaziasIgnoradas,
        itens: validacaoResultado.itensValidos,
        entradas: validacaoResultado.entradasFuturasValidas,
      })

      setActiveStep('SUCESSO')
      setIsConfirmacaoParcialOpen(false)

      toast({
        title: 'IMPORTAÇÃO CONCLUÍDA COM SUCESSO',
        description: `Lote ${uploadCode} gravado atomicamente com ${validacaoResultado.linhasValidas} registros.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Gravar Carga no Banco (Rollback Executado)',
        description: err.message,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFinalizarEIrParaCarteira = () => {
    if (resultadoConcluido) {
      onCargaConcluida(
        resultadoConcluido.upload,
        resultadoConcluido.itens,
        resultadoConcluido.entradas,
      )
    }
    onClose()
  }

  const resetarUpload = () => {
    setSelectedFile(null)
    setFileHashHex('')
    setValidacaoResultado(null)
    setResultadoConcluido(null)
    setActiveStep('UPLOAD')
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Importação da Carteira QAS &bull; Transação ZSD28C
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Classificação Semântica &bull; Validação de 3 Níveis &bull; Carga Parcial
                    Controlada &bull; Gravação Atômica
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="border-slate-300 text-[#004C97] hover:bg-blue-50 text-xs font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#004C97]" /> Baixar Template Excel (3 Abas)
              </Button>
            </div>
          </DialogHeader>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-1 border-b border-slate-200 pt-2 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveStep('UPLOAD')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeStep === 'UPLOAD'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" /> 1. Upload Arquivo
            </button>
            <button
              disabled={!validacaoResultado}
              onClick={() => setActiveStep('VALIDACAO')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeStep === 'VALIDACAO'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> 2. Validação & Logs
            </button>
            <button
              disabled={!validacaoResultado || validacaoResultado.itensValidos.length === 0}
              onClick={() => setActiveStep('PREVIEW')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeStep === 'PREVIEW'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> 3. Pré-visualização (
              {validacaoResultado?.linhasValidas || 0})
            </button>
            {resultadoConcluido && (
              <button
                onClick={() => setActiveStep('SUCESSO')}
                className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeStep === 'SUCESSO'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 4. Conclusão
              </button>
            )}
            <button
              onClick={() => setActiveStep('HISTORICO')}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeStep === 'HISTORICO'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Histórico & Rollback
            </button>
          </div>

          <div className="py-3 text-xs space-y-4">
            {/* ETAPA 1: UPLOAD */}
            {activeStep === 'UPLOAD' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-10 h-10 text-[#004C97] mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">
                    Arraste ou selecione a planilha da Carteira ZSD28C (.xlsx, .xls, .csv)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                    O classificador automático identifica linhas de totalização SAP e linhas vazias,
                    desconsiderando-as automaticamente para evitar falsas rejeições de código de
                    material.
                  </p>

                  <label className="mt-4 inline-block">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="bg-[#004C97] hover:bg-[#003870] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                      <UploadCloud className="w-4 h-4" /> Selecionar Arquivo do Computador
                    </span>
                  </label>

                  {selectedFile && (
                    <div className="mt-3 text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 inline-block">
                      Arquivo: <strong>{selectedFile.name}</strong> (
                      {(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#004C97]">
                      <Info className="w-4 h-4" /> Nível 1: Informativo
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Linhas vazias, rodapés e linha final de TOTALIZAÇÃO são ignorados
                      automaticamente. Não geram rejeição.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Nível 2: Erro de Registro
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Linha de material real com erro isolado. Permite importar parcialmente os
                      demais registros válidos após confirmação.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                      <XCircle className="w-4 h-4 text-rose-600" /> Nível 3: Erro Estrutural
                    </div>
                    <p className="text-[11px] text-rose-800">
                      Ausência de colunas obrigatórias ou arquivo corrompido bloqueia totalmente a
                      importação.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: VALIDAÇÃO & LOGS */}
            {activeStep === 'VALIDACAO' && validacaoResultado && (
              <div className="space-y-4">
                {/* Banner de Contexto de Severidade */}
                {validacaoResultado.temErroCriticoEstrutural ? (
                  <div className="p-3.5 bg-rose-100/90 rounded-xl border border-rose-300 text-rose-950 flex items-start gap-2.5">
                    <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-rose-900 uppercase">
                        ERRO CRÍTICO — CORREÇÃO DO ARQUIVO OBRIGATÓRIA (Nível 3)
                      </strong>
                      <p className="text-xs text-rose-800 mt-0.5">
                        {validacaoResultado.mensagemEstrutural ||
                          'O arquivo enviado possui inconformidade estrutural. A importação está bloqueada.'}
                      </p>
                    </div>
                  </div>
                ) : validacaoResultado.linhasRejeitadas > 0 ? (
                  <div className="p-3.5 bg-amber-100/90 rounded-xl border border-amber-300 text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-amber-900 uppercase">
                        REGISTROS COM ERRO — IMPORTAÇÃO PARCIAL DISPONÍVEL (Nível 2)
                      </strong>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Foram identificados {validacaoResultado.linhasRejeitadas} registro(s) de
                        negócio inválidos e {validacaoResultado.linhasValidas} registros válidos.
                        Você pode corrigir a planilha ou aprovar a importação apenas das linhas
                        válidas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-100/90 rounded-xl border border-emerald-300 text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-emerald-900 uppercase">
                        ARQUIVO VALIDADO — LINHAS NÃO TRANSACIONAIS DESCONSIDERADAS (Nível 1)
                      </strong>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Todos os {validacaoResultado.linhasValidas} registros transacionais estão
                        válidos e prontos para gravação. Totalizadores e linhas vazias foram
                        filtrados sem erros.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5 Cards Oficiais da Validação (Requisito 4) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Total de Linhas
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-lg">
                      {validacaoResultado.totalLinhas}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                      Linhas Válidas
                    </span>
                    <span className="font-mono font-bold text-emerald-800 text-lg">
                      {validacaoResultado.linhasValidas}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">
                      Com Alerta
                    </span>
                    <span className="font-mono font-bold text-amber-800 text-lg">
                      {validacaoResultado.linhasComAlerta}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">
                      Linhas Rejeitadas
                    </span>
                    <span className="font-mono font-bold text-rose-800 text-lg">
                      {validacaoResultado.linhasRejeitadas}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                      Ignoradas Auto
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono font-bold text-[#004C97] text-lg">
                        {validacaoResultado.linhasTotalIgnoradas}
                      </span>
                      <span className="text-[9px] text-blue-700">
                        ({validacaoResultado.linhasIgnoradasTotalizacao} totaliz. /{' '}
                        {validacaoResultado.linhasVaziasIgnoradas} vazias)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Log de Classificação Semântica */}
                {validacaoResultado.logsProcessamento.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                      <ListFilter className="w-3.5 h-3.5 text-[#004C97]" /> Log de Classificação e
                      Filtros Automáticos:
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {validacaoResultado.logsProcessamento.map((log, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-100 font-mono flex items-center gap-1.5"
                        >
                          <span className="text-blue-600">&bull;</span> {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visibilidade Completa dos Erros Reais (Requisito 5) */}
                {validacaoResultado.linhasRejeitadasDetalhes.length > 0 && (
                  <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                        <XCircle className="w-4 h-4 text-rose-600" /> Detalhes dos Registros
                        Rejeitados ({validacaoResultado.linhasRejeitadasDetalhes.length}):
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadRelatorioErros('xlsx')}
                        className="border-rose-300 text-rose-800 hover:bg-rose-100 text-xs h-7 gap-1 font-semibold"
                      >
                        <FileDown className="w-3.5 h-3.5 text-rose-700" /> BAIXAR RELATÓRIO DE ERROS
                        (.XLSX)
                      </Button>
                    </div>

                    <div className="border border-rose-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-rose-100/70 text-rose-900 text-[11px] sticky top-0">
                          <tr>
                            <th className="p-2">Linha Excel</th>
                            <th className="p-2">Linha Lógica</th>
                            <th className="p-2">Coluna</th>
                            <th className="p-2">Valor Encontrado</th>
                            <th className="p-2">Motivo da Rejeição</th>
                            <th className="p-2">Ação Sugerida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validacaoResultado.linhasRejeitadasDetalhes.map((r, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-rose-100 hover:bg-rose-50/40 text-[11px]"
                            >
                              <td className="p-2 font-mono font-bold text-slate-800">
                                {r.linhaExcel}
                              </td>
                              <td className="p-2 font-mono text-slate-600">
                                {r.linhaLogica || '-'}
                              </td>
                              <td className="p-2 font-semibold text-rose-900">{r.coluna}</td>
                              <td className="p-2 font-mono text-slate-700">
                                {r.valorEncontrado || '(vazio)'}
                              </td>
                              <td className="p-2 text-rose-800">{r.motivoRejeicao}</td>
                              <td className="p-2 text-slate-600 italic">{r.acaoSugerida}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Alertas */}
                {validacaoResultado.alertas.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas Operacionais (
                      {validacaoResultado.alertas.length}):
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {validacaoResultado.alertas.map((al, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-amber-800 bg-white p-1.5 rounded border border-amber-100"
                        >
                          Linha {al.linha}: {al.mensagem}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: PREVIEW */}
            {activeStep === 'PREVIEW' && validacaoResultado && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">
                      Pré-visualização dos Registros Válidos (
                      {validacaoResultado.itensValidos.length} itens a gravar):
                    </span>
                    {validacaoResultado.linhasRejeitadas > 0 && (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                        {validacaoResultado.linhasRejeitadas} registro(s) rejeitado(s) serão
                        desconsiderados
                      </Badge>
                    )}
                  </div>
                  <Badge className="bg-[#004C97] text-white text-[10px]">
                    Pronto para Confirmação
                  </Badge>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#004C97] text-white text-[11px]">
                      <tr>
                        <th className="p-2">Material</th>
                        <th className="p-2">Cliente / Pedido</th>
                        <th className="p-2 text-center">Tipo</th>
                        <th className="p-2 text-right">Carteira (t)</th>
                        <th className="p-2 text-right">Estoque (t)</th>
                        <th className="p-2 text-right">Saldo (+)</th>
                        <th className="p-2 text-right">Saldo (-)</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validacaoResultado.itensValidos.slice(0, 30).map((it, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 hover:bg-blue-50/40 text-[11px]"
                        >
                          <td className="p-2 font-mono font-bold text-slate-900">
                            {it.codigo_material}
                          </td>
                          <td className="p-2 text-slate-700">
                            {it.nome_cliente} ({it.ordem_venda}/{it.item_ordem})
                          </td>
                          <td className="p-2 text-center">
                            <Badge className="text-[9px] bg-slate-100 text-slate-700 border-slate-200">
                              {it.tipo_ordem}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900">
                            {it.carteira_aberta_tons.toFixed(1)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {it.disponibilidade_fisica_elegivel_tons?.toFixed(1) || '0.0'}
                          </td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-bold">
                            +{it.saldo_positivo_tons.toFixed(1)}
                          </td>
                          <td className="p-2 text-right font-mono text-rose-700 font-bold">
                            {it.saldo_negativo_tons.toFixed(1)}
                          </td>
                          <td className="p-2 text-center">
                            <Badge
                              className={`text-[9px] ${it.status_atendimento === 'A_FATURAR' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}
                            >
                              {it.status_atendimento}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ETAPA 4: SUCESSO PÓS-CONFIRMAÇÃO (Requisito 6) */}
            {activeStep === 'SUCESSO' && resultadoConcluido && (
              <div className="space-y-4 py-2">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950 uppercase">
                      IMPORTAÇÃO CONCLUÍDA COM SUCESSO
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Arquivo: <strong>{resultadoConcluido.upload.filename}</strong> &bull; Lote:{' '}
                      <span className="font-mono">{resultadoConcluido.upload.upload_code}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 max-w-lg mx-auto flex items-center justify-around text-xs">
                    <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                      <span className="text-base font-bold text-emerald-700">✓</span>
                      <span>{resultadoConcluido.itensValidosCount} importados</span>
                    </div>
                    {resultadoConcluido.totalizacaoCount > 0 && (
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <span className="text-base font-bold text-blue-600">○</span>
                        <span>{resultadoConcluido.totalizacaoCount} totaliz. ignorada</span>
                      </div>
                    )}
                    {resultadoConcluido.vaziasCount > 0 && (
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <span className="text-base font-bold text-slate-400">○</span>
                        <span>{resultadoConcluido.vaziasCount} vazias ignoradas</span>
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-1.5 font-semibold ${
                        resultadoConcluido.rejeitadosCount > 0 ? 'text-rose-700' : 'text-slate-500'
                      }`}
                    >
                      <span className="text-base font-bold">
                        {resultadoConcluido.rejeitadosCount > 0 ? '✕' : '✓'}
                      </span>
                      <span>{resultadoConcluido.rejeitadosCount} rejeitados</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleFinalizarEIrParaCarteira}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 px-4 h-9 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> VER CARTEIRA IMPORTADA
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveStep('HISTORICO')}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 h-9"
                  >
                    <Clock className="w-4 h-4 text-[#004C97]" /> VER LOG & HISTÓRICO
                  </Button>

                  {resultadoConcluido.rejeitadosCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadRelatorioErros('xlsx')}
                      className="border-rose-300 text-rose-800 hover:bg-rose-50 text-xs font-semibold gap-1.5 h-9"
                    >
                      <FileDown className="w-4 h-4 text-rose-600" /> BAIXAR REJEITADOS (.XLSX)
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA: HISTÓRICO */}
            {activeStep === 'HISTORICO' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">
                    Histórico de Cargas & Versões Auditáveis da Carteira:
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {historicoUploads.length} cargas registradas
                  </span>
                </div>

                {historicoUploads.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Nenhuma carga anterior registrada no backend.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {historicoUploads.map((up) => {
                      const isParcial =
                        up.status === 'IMPORTADO_PARCIAL' ||
                        up.execution_status === 'SUCESSO_PARCIAL_HOMOLOGADO' ||
                        (up.rejected_rows > 0 && up.valid_rows > 0)
                      return (
                        <div
                          key={up.upload_code}
                          className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            up.is_active_current
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="font-mono text-xs text-slate-900">
                                {up.upload_code}
                              </strong>
                              {up.is_active_current && (
                                <Badge className="bg-[#004C97] text-white text-[9px] font-bold">
                                  Versão Vigente
                                </Badge>
                              )}
                              {isParcial ? (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-semibold">
                                  IMPORTADO PARCIALMENTE
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[9px] font-semibold">
                                  IMPORTADO COMPLETO
                                </Badge>
                              )}
                              <Badge className="bg-slate-100 text-slate-700 text-[9px]">
                                {up.source_mode}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Arquivo: <strong>{up.filename}</strong> &bull; Aceitos:{' '}
                              <span className="font-semibold text-slate-700">
                                {up.valid_rows} / {up.total_rows} registros
                              </span>{' '}
                              {up.rejected_rows > 0 && (
                                <span className="text-rose-700 font-medium">
                                  ({up.rejected_rows} rejeitado{up.rejected_rows > 1 ? 's' : ''})
                                </span>
                              )}{' '}
                              &bull;{' '}
                              {up.created
                                ? new Date(up.created).toLocaleString('pt-BR')
                                : 'Data N/D'}
                            </p>
                          </div>

                          {!up.is_active_current && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRollback(up.upload_code)}
                              className="border-slate-300 text-slate-700 hover:bg-blue-50 text-xs font-semibold gap-1 shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#004C97]" /> Restaurar Versão
                              (Rollback)
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 text-xs"
            >
              Fechar
            </Button>

            <div className="flex items-center gap-2">
              {/* Botões do Step de Validação (Requisito 2 & 13) */}
              {activeStep === 'VALIDACAO' && validacaoResultado && (
                <>
                  {validacaoResultado.temErroCriticoEstrutural ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetarUpload}
                      className="border-rose-300 text-rose-800 hover:bg-rose-50 text-xs font-semibold gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Corrigir arquivo e importar novamente
                    </Button>
                  ) : validacaoResultado.linhasRejeitadas > 0 ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={resetarUpload}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Corrigir arquivo e importar novamente
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setIsConfirmacaoParcialOpen(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                      >
                        <ArrowRight className="w-4 h-4" />
                        IMPORTAR {validacaoResultado.linhasValidas.toLocaleString('pt-BR')} LINHAS
                        VÁLIDAS E IGNORAR {validacaoResultado.linhasRejeitadas} REJEITADA
                        {validacaoResultado.linhasRejeitadas > 1 ? 'S' : ''}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setActiveStep('PREVIEW')}
                      className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Avançar para Pré-visualização (
                      {validacaoResultado.linhasValidas})
                    </Button>
                  )}
                </>
              )}

              {/* Botões do Step de Preview */}
              {activeStep === 'PREVIEW' && validacaoResultado && (
                <Button
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    if (validacaoResultado.linhasRejeitadas > 0) {
                      setIsConfirmacaoParcialOpen(true)
                    } else {
                      handleExecutarCarga(false)
                    }
                  }}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing
                    ? 'Gravando e auditando...'
                    : validacaoResultado.linhasRejeitadas > 0
                      ? `Confirmar e Importar ${validacaoResultado.linhasValidas.toLocaleString('pt-BR')} Registros Válidos`
                      : `Confirmar e Publicar Carteira (${validacaoResultado.linhasValidas} Registros)`}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE IMPORTAÇÃO PARCIAL CONTROLADA (Requisito 2 & 14) */}
      <Dialog
        open={isConfirmacaoParcialOpen}
        onOpenChange={(open) => !open && setIsConfirmacaoParcialOpen(false)}
      >
        <DialogContent className="max-w-md bg-white border-amber-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-900">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Confirmar importação parcial?
                </DialogTitle>
                <span className="text-[11px] text-amber-800 font-semibold">
                  Governança e Auditoria CIAFAL
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3 text-slate-700">
            <p className="leading-relaxed">
              Serão importados{' '}
              <strong className="text-emerald-800 font-mono text-sm">
                {validacaoResultado?.linhasValidas.toLocaleString('pt-BR')}
              </strong>{' '}
              registros válidos.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
              <strong>
                {validacaoResultado?.linhasRejeitadas} registro(s) rejeitado(s) não{' '}
                {validacaoResultado?.linhasRejeitadas === 1 ? 'será importado' : 'serão importados'}
                .
              </strong>
              <p className="text-amber-800">
                Os registros rejeitados permanecerão disponíveis no histórico e relatório de
                inconsistências para posterior consulta e correção.
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-800">Deseja continuar?</p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConfirmacaoParcialOpen(false)}
              className="border-slate-300 text-slate-700 text-xs"
            >
              CANCELAR
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={() => handleExecutarCarga(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing
                ? 'Gravando e auditando...'
                : `CONFIRMAR E IMPORTAR ${validacaoResultado?.linhasValidas.toLocaleString('pt-BR')} REGISTROS`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ImportacaoCarteiraModal
