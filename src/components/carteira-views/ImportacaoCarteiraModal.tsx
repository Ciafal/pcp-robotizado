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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CarteiraItem, CarteiraEntradaFutura, CarteiraUpload } from '@/types/carteira-analise'
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
  const [activeStep, setActiveStep] = useState<'UPLOAD' | 'VALIDACAO' | 'PREVIEW' | 'HISTORICO'>(
    'UPLOAD',
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHashHex, setFileHashHex] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validacaoResultado, setValidacaoResultado] = useState<ValidacaoUploadResultado | null>(
    null,
  )

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'txt' && ext !== 'xlsx' && ext !== 'xls') {
      toast({
        variant: 'destructive',
        title: 'Formato Não Autorizado',
        description:
          'Selecione apenas arquivos no formato autorizado (.xlsx, .xls, .csv, .txt) do layout CIAFAL.',
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
          title: 'Aviso de Idempotência',
          description: `Este mesmo arquivo já foi processado anteriormente (Carga: ${cargaExistente.upload_code}). O reprocessamento atualizará a versão vigente.`,
        })
      }

      if (res.erros.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Erros Encontrados na Validação',
          description: `${res.erros.length} linhas rejeitadas. Corrija o arquivo antes de processar.`,
        })
      } else {
        toast({
          title: 'Arquivo Validado com Sucesso (SHA-256 Calculado)',
          description: `${res.linhasValidas} linhas válidas prontas para pré-visualização e processamento.`,
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

  const handleProcessarCarteira = async () => {
    if (
      !validacaoResultado ||
      !validacaoResultado.valido ||
      validacaoResultado.itensValidos.length === 0
    ) {
      toast({
        variant: 'destructive',
        title: 'Carga Não Autorizada',
        description:
          'Não é permitido processar arquivos com linhas rejeitadas ou sem registros válidos.',
      })
      return
    }

    setIsProcessing(true)
    try {
      const uploadCode = `CARGA-QAS-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`

      const novaCarga: CarteiraUpload = {
        upload_code: uploadCode,
        filename: selectedFile?.name || 'Carga_Manual_ZSD28C.csv',
        file_hash: fileHashHex,
        file_hash_sha256: fileHashHex,
        snapshot_version: `SNAP-${uploadCode}`,
        execution_status: 'SUCESSO_HOMOLOGADO',
        reconciliation_status: 'PARIDADE_100',
        environment: 'QAS',
        file_size_bytes: selectedFile?.size || 0,
        total_rows: validacaoResultado.totalLinhas,
        valid_rows: validacaoResultado.linhasValidas,
        warning_rows: validacaoResultado.linhasComAlerta,
        rejected_rows: validacaoResultado.linhasRejeitadas,
        status: 'PROCESSADO',
        source_mode: 'EXCEL_QAS',
        user_name: 'Usuário PCP Autorizado',
        user_email: 'pcp@ciafal.com.br',
        version_tag: `v${new Date().toISOString().substring(0, 10)}`,
        validation_log: {
          errors: validacaoResultado.erros,
          warnings: validacaoResultado.alertas,
          duplicados: validacaoResultado.duplicados,
          file_hash_sha256: fileHashHex,
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
      )

      // Notifica o barramento central PCPDataLayer (CARTEIRA_UPDATED)
      const { pcpDataLayer } = await import('@/services/pcp-data-layer')
      pcpDataLayer.publish(
        'CARTEIRA_UPDATED',
        'CARTEIRA_ZSD28C',
        {
          upload_code: uploadSalvo.upload_code,
          total_itens: validacaoResultado.itensValidos.length,
          timestamp: new Date().toISOString(),
        },
        uploadSalvo.upload_code,
      )

      toast({
        title: 'Carteira Processada com Sucesso!',
        description: `Carga ${uploadCode} homologada no backend com ${validacaoResultado.itensValidos.length} itens.`,
      })

      onCargaConcluida(
        uploadSalvo,
        validacaoResultado.itensValidos,
        validacaoResultado.entradasFuturasValidas,
      )
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Processar Carga',
        description: err.message,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl">
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
                  Fluxo oficial: Template &bull; Upload &bull; Validação Severa &bull;
                  Pré-visualização &bull; Processamento Backend
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

        <div className="flex items-center gap-1 border-b border-slate-200 pt-2 text-xs">
          <button
            onClick={() => setActiveStep('UPLOAD')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
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
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeStep === 'VALIDACAO'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 2. Validação & Logs
          </button>
          <button
            disabled={!validacaoResultado || !validacaoResultado.valido}
            onClick={() => setActiveStep('PREVIEW')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeStep === 'PREVIEW'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> 3. Pré-visualização (
            {validacaoResultado?.linhasValidas || 0})
          </button>
          <button
            onClick={() => setActiveStep('HISTORICO')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeStep === 'HISTORICO'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> 4. Histórico & Rollback
          </button>
        </div>

        <div className="py-3 text-xs space-y-4">
          {activeStep === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <UploadCloud className="w-10 h-10 text-[#004C97] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">
                  Arraste ou selecione o arquivo da Carteira QAS (.xlsx, .xls, .csv)
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  O arquivo será validado contra fórmulas maliciosas, estrutura obrigatória,
                  consistência de pedidos e entradas futuras.
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

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-700" /> Diretrizes de Segurança e
                  Governança CIAFAL:
                </div>
                <p className="text-[11px]">
                  &bull; Bloqueio total de macros VBA e injeção de fórmulas (=, +, -, @).
                  <br />
                  &bull; O Excel é apenas fonte transitória no QAS: todos os cálculos oficiais rodam
                  estritamente no motor do PCP.
                  <br />
                  &bull; Cada carga gera um ID único, registro de hash e trilha de auditoria para
                  fins de compliance.
                </p>
              </div>
            </div>
          )}

          {activeStep === 'VALIDACAO' && validacaoResultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
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
              </div>

              {validacaoResultado.erros.length > 0 ? (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600" /> Linhas Rejeitadas (Ajuste
                    Obrigatório):
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {validacaoResultado.erros.map((err, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-rose-800 bg-white p-1.5 rounded border border-rose-100 font-mono"
                      >
                        Linha {err.linha}: [{err.campo}] {err.mensagem}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block text-xs">Estrutura 100% Válida</strong>
                    <span className="text-[11px]">
                      Nenhuma inconsistência impeditiva encontrada. Você pode avançar para a
                      pré-visualização.
                    </span>
                  </div>
                </div>
              )}

              {validacaoResultado.alertas.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas de Atenção (
                    {validacaoResultado.alertas.length}):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
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

          {activeStep === 'PREVIEW' && validacaoResultado && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Pré-visualização dos Itens Calculados ({validacaoResultado.itensValidos.length}{' '}
                  registros):
                </span>
                <Badge className="bg-[#004C97] text-white text-[10px]">Pronto para Processar</Badge>
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
                    {validacaoResultado.itensValidos.slice(0, 20).map((it, idx) => (
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
                  {historicoUploads.map((up) => (
                    <div
                      key={up.upload_code}
                      className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        up.is_active_current
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-xs text-slate-900">
                            {up.upload_code}
                          </strong>
                          {up.is_active_current && (
                            <Badge className="bg-[#004C97] text-white text-[9px] font-bold">
                              Versão Vigente
                            </Badge>
                          )}
                          <Badge className="bg-slate-200 text-slate-700 text-[9px]">
                            {up.source_mode}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Arquivo: {up.filename} &bull; {up.valid_rows} itens válidos &bull;{' '}
                          {up.created ? new Date(up.created).toLocaleString('pt-BR') : 'Data N/D'}
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
                  ))}
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
            Cancelar / Fechar
          </Button>

          <div className="flex items-center gap-2">
            {activeStep === 'VALIDACAO' && validacaoResultado?.valido && (
              <Button
                size="sm"
                onClick={() => setActiveStep('PREVIEW')}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Ver Pré-visualização
              </Button>
            )}

            {activeStep === 'PREVIEW' && validacaoResultado?.valido && (
              <Button
                size="sm"
                disabled={isProcessing}
                onClick={handleProcessarCarteira}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isProcessing ? 'Processando no Backend...' : 'Processar e Publicar Carteira'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ImportacaoCarteiraModal
