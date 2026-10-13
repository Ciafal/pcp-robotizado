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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Printer,
  Save,
  Mail,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react'
import { FacaRelatorioExecutivo } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'
import { useToast } from '@/hooks/use-toast'

interface FacaRelatorioModalProps {
  relatorio: FacaRelatorioExecutivo | null
  isOpen: boolean
  onClose: () => void
  onSalvarEdicao: (relatorioAtualizado: FacaRelatorioExecutivo) => Promise<void>
  onAbrirEnvioEmail: () => void
}

export const FacaRelatorioModal: React.FC<FacaRelatorioModalProps> = ({
  relatorio,
  isOpen,
  onClose,
  onSalvarEdicao,
  onAbrirEnvioEmail,
}) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Estados editáveis
  const [resumoEditado, setResumoEditado] = useState('')
  const [mpTextoEditado, setMpTextoEditado] = useState('')

  React.useEffect(() => {
    if (relatorio) {
      setResumoEditado(relatorio.resumo_executivo)
      setMpTextoEditado(relatorio.analise_materia_prima.detalhes_texto)
      setIsEditing(false)
    }
  }, [relatorio])

  if (!relatorio) return null

  const handleSalvar = async () => {
    try {
      setSalvando(true)
      const atualizado: FacaRelatorioExecutivo = {
        ...relatorio,
        resumo_executivo: resumoEditado,
        analise_materia_prima: {
          ...relatorio.analise_materia_prima,
          detalhes_texto: mpTextoEditado,
        },
        versao: (relatorio.versao || 1) + 1,
      }
      await onSalvarEdicao(atualizado)
      setIsEditing(false)
      toast({
        title: 'Relatório salvo com sucesso',
        description: `Versão ${atualizado.versao} registrada no histórico oficial.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao salvar versão do relatório.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleImprimirPdf = () => {
    FacaAnaliseService.registrarAuditLog({
      acao: 'EXPORTACAO_PDF_ANALISE_FACA',
      recursoId: `FACA-v${relatorio.versao}-${relatorio.data_referencia}`,
      motivo: `Exportação de relatório PDF / Impressão A4 (versão ${relatorio.versao})`,
      detalhes: {
        versao: relatorio.versao,
        data_referencia: relatorio.data_referencia,
        empresa: relatorio.empresa,
        centro: relatorio.centro,
      },
    })
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto w-[96vw] p-6 print:p-0 print:border-none print:shadow-none">
        {/* Cabeçalho do Modal (não visível em impressão nativa) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Relatório Executivo — Análise de FACA
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Data de referência: {relatorio.data_referencia} &bull; Versão {relatorio.versao}{' '}
                &bull; Empresa {relatorio.empresa} (Centro {relatorio.centro})
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs h-8 gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              {isEditing ? 'Cancelar Edição' : 'Editar Relatório'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleImprimirPdf}
              className="text-xs h-8 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Gerar PDF / Imprimir
            </Button>

            <Button
              size="sm"
              onClick={onAbrirEnvioEmail}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" /> Visualizar & Enviar E-mail
            </Button>
          </div>
        </div>

        {/* Corpo Oficial do Relatório (Layout Padronizado A4) */}
        <div className="space-y-6 pt-2 text-slate-800 text-xs">
          {/* Header Corporativo CIAFAL */}
          <div className="border-b-2 border-[#004C97] pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-widest font-extrabold text-[#004C97] uppercase">
                CIAFAL &bull; Wilson Santos &bull; HUB PCP ROBOTIZADO
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight pt-0.5">
                {relatorio.titulo}
              </h1>
              <div className="text-xs text-slate-600 pt-0.5">
                Carteira de Pedidos SAP ZSD28C, Estoques PA/MP e Previsão de Faturamento
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-600 space-y-0.5">
              <div>
                Data de Referência: <strong>{relatorio.data_referencia}</strong>
              </div>
              <div>
                Empresa / Centro:{' '}
                <strong>
                  {relatorio.empresa} / {relatorio.centro}
                </strong>
              </div>
              <div>
                Versão do Documento: <strong>v{relatorio.versao}.0</strong>
              </div>
            </div>
          </div>

          {/* 1. Resumo Executivo */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                1
              </span>
              Resumo Executivo
            </h2>
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-600">Editar redação do resumo:</Label>
                <Textarea
                  rows={4}
                  className="text-xs"
                  value={resumoEditado}
                  onChange={(e) => setResumoEditado(e.target.value)}
                />
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                {relatorio.resumo_executivo}
              </div>
            )}
          </div>

          {/* 2. Situação da Carteira e Estoque (Tabela) */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                2
              </span>
              Situação da Carteira e Estoque de Produto Acabado
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Material</TableHead>
                    <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">
                      Carteira (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">
                      Estoque Livre (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">
                      A Produzir (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">
                      Previsão Faturamento
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 min-w-[200px]">
                      Observações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.situacao_carteira_estoque.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-bold text-[#004C97]">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-slate-700">{item.descricao}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatNumberPtBr(item.carteira_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatNumberPtBr(item.estoque_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">
                        {formatNumberPtBr(item.a_produzir_t, 1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px]">
                          {item.previsao_faturamento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-[11px]">
                        {item.observacoes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 3. Análise de Matéria-Prima */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                3
              </span>
              Análise de Matéria-Prima (Disponibilidade, Consumo e Saldo Futuro)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  Disponibilidade Total
                </div>
                <div className="text-sm font-extrabold text-indigo-700">
                  {formatNumberPtBr(relatorio.analise_materia_prima.disponibilidade_total_t, 1)} t
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  Consumo Projetado
                </div>
                <div className="text-sm font-extrabold text-purple-700">
                  {formatNumberPtBr(relatorio.analise_materia_prima.consumo_projetado_t, 1)} t
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  Necessidade Adicional
                </div>
                <div className="text-sm font-extrabold text-rose-700">
                  {formatNumberPtBr(relatorio.analise_materia_prima.necessidade_adicional_t, 1)} t
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  Saldo Futuro Projetado
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {formatNumberPtBr(relatorio.analise_materia_prima.saldo_futuro_t, 1)} t
                </div>
              </div>
            </div>
            {isEditing ? (
              <Textarea
                rows={2}
                className="text-xs"
                value={mpTextoEditado}
                onChange={(e) => setMpTextoEditado(e.target.value)}
              />
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 leading-relaxed">
                {relatorio.analise_materia_prima.detalhes_texto}
              </div>
            )}
          </div>

          {/* 4 e 5. Pendências Comerciais e Industriais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                  4
                </span>
                Pendências Comerciais
              </h2>
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs text-amber-950">
                {relatorio.pendencias_comerciais.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-700 font-bold">&bull;</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                  5
                </span>
                Pendências Industriais & MP
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-800">
                {relatorio.pendencias_industriais.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-slate-500 font-bold">&bull;</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Previsão de Faturamento */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                6
              </span>
              Previsão de Faturamento (Confirmado vs Dependente de Produção)
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Período / Semana</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-emerald-800">
                      Confirmado (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-emerald-800">
                      Confirmado (R$)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-amber-800">
                      Dependente Prod. (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-right text-amber-800">
                      Dependente Prod. (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.previsao_faturamento.detalhes_periodo.map((per, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-slate-800">{per.periodo}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatNumberPtBr(per.confirmado_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        R$ {per.confirmado_brl.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">
                        {formatNumberPtBr(per.dependente_producao_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">
                        R$ {per.dependente_producao_brl.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 7. Recomendações da IA */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                7
              </span>
              Recomendações da IA por Área de Atuação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-[#004C97] block">PCP</span>
                {relatorio.recomendacoes_ia.pcp.map((r, idx) => (
                  <p key={idx} className="text-[11px] text-slate-700 leading-tight">
                    &bull; {r}
                  </p>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                  Comercial
                </span>
                {relatorio.recomendacoes_ia.comercial.map((r, idx) => (
                  <p key={idx} className="text-[11px] text-slate-700 leading-tight">
                    &bull; {r}
                  </p>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-amber-700 block">
                  Produção
                </span>
                {relatorio.recomendacoes_ia.producao.map((r, idx) => (
                  <p key={idx} className="text-[11px] text-slate-700 leading-tight">
                    &bull; {r}
                  </p>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-purple-700 block">
                  Gestão de MP
                </span>
                {relatorio.recomendacoes_ia.gestao_mp.map((r, idx) => (
                  <p key={idx} className="text-[11px] text-slate-700 leading-tight">
                    &bull; {r}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* 8. Ações e Responsáveis (Tabela) */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-[#004C97] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] flex items-center justify-center text-[10px]">
                8
              </span>
              Plano de Ações e Responsáveis
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Pendência</TableHead>
                    <TableHead className="font-bold text-slate-700">Material</TableHead>
                    <TableHead className="font-bold text-slate-700">Ação Recomendada</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Área</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Prazo</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.acoes_responsaveis.map((ac, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-slate-800">{ac.pendencia}</TableCell>
                      <TableCell className="font-mono text-[#004C97]">{ac.material}</TableCell>
                      <TableCell className="text-slate-700">{ac.acao_recomendada}</TableCell>
                      <TableCell className="text-center font-semibold text-slate-700">
                        {ac.area_responsavel}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {ac.prazo_previsto}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            ac.status === 'CONCLUIDO'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ac.status === 'EM_ANDAMENTO'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {ac.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3 print:hidden">
          {isEditing && (
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Edições como Nova Versão
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
