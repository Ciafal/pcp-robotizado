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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  Users,
  ShieldAlert,
} from 'lucide-react'
import { FacaRelatorioExecutivo } from '@/types/faca-analise'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { useToast } from '@/hooks/use-toast'

interface FacaEnvioEmailModalProps {
  relatorio: FacaRelatorioExecutivo | null
  analiseId?: string
  isOpen: boolean
  onClose: () => void
  onEnvioRegistrado: () => void
}

export const FacaEnvioEmailModal: React.FC<FacaEnvioEmailModalProps> = ({
  relatorio,
  analiseId,
  isOpen,
  onClose,
  onEnvioRegistrado,
}) => {
  const { toast } = useToast()
  const [enviando, setEnviando] = useState(false)
  const [confirmacaoExplicita, setConfirmacaoExplicita] = useState(false)
  const [incluirPdf, setIncluirPdf] = useState(true)

  // Destinatários pré-definidos por área
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>([
    'PCP',
    'Comercial',
    'Produção',
    'Suprimentos',
  ])

  const [destinatariosPara, setDestinatariosPara] = useState<string>(
    'pcp.programador@ciafal.com.br, comercial.usinas@ciafal.com.br, gerencia.producao@ciafal.com.br',
  )
  const [destinatariosCc, setDestinatariosCc] = useState<string>(
    'diretoria.industrial@ciafal.com.br, suprimentos.mp@ciafal.com.br',
  )

  const hoje = new Date().toLocaleDateString('pt-BR')
  const [assunto, setAssunto] = useState<string>(
    `FACA | Análise de Carteira, Matéria-Prima e Previsão de Faturamento | ${hoje}`,
  )

  const corpoHtmlPadrao = relatorio
    ? `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 800px;">
  <div style="border-bottom: 3px solid #004C97; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="color: #004C97; margin: 0 0 4px 0;">CIAFAL — ANÁLISE DE FACA (PCP ROBOTIZADO)</h2>
    <p style="margin: 0; font-size: 13px; color: #64748b;">
      Carteira, Estoque de Produto Acabado, Matéria-Prima e Previsão de Faturamento &bull; Ref: ${relatorio.data_referencia}
    </p>
  </div>

  <p style="font-size: 14px; line-height: 1.5;">
    <strong>Resumo Executivo:</strong><br/>
    ${relatorio.resumo_executivo}
  </p>

  <h3 style="color: #004C97; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
    Indicadores Centrais de Atendimento
  </h3>
  <ul>
    <li>Carteira Total: <strong>${relatorio.situacao_carteira_estoque.reduce((acc, c) => acc + c.carteira_t, 0).toFixed(1)} t</strong></li>
    <li>Estoque Livre de PA: <strong>${relatorio.situacao_carteira_estoque.reduce((acc, c) => acc + c.estoque_t, 0).toFixed(1)} t</strong></li>
    <li>Necessidade Líquida a Produzir: <strong>${relatorio.situacao_carteira_estoque.reduce((acc, c) => acc + c.a_produzir_t, 0).toFixed(1)} t</strong></li>
    <li>Faturamento Confirmado: <strong>R$ ${relatorio.previsao_faturamento.faturamento_confirmado_brl.toLocaleString('pt-BR')}</strong></li>
    <li>Potencial Total: <strong>R$ ${relatorio.previsao_faturamento.potencial_faturamento_brl.toLocaleString('pt-BR')}</strong></li>
  </ul>

  <h3 style="color: #004C97; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
    Recomendações Prioritárias da IA
  </h3>
  <p><strong>PCP:</strong> ${relatorio.recomendacoes_ia.pcp.join(' | ')}</p>
  <p><strong>Comercial:</strong> ${relatorio.recomendacoes_ia.comercial.join(' | ')}</p>
  <p><strong>Gestão de MP:</strong> ${relatorio.recomendacoes_ia.gestao_mp.join(' | ')}</p>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 16px;">
    Documento emitido automaticamente pelo HUB PCP Robotizado CIAFAL com dados rastreáveis do SAP ECC (ZSD28C).
  </div>
</div>
`
    : ''

  const [corpoHtml, setCorpoHtml] = useState<string>(corpoHtmlPadrao)

  if (!relatorio) return null

  const toggleArea = (area: string) => {
    if (areasSelecionadas.includes(area)) {
      setAreasSelecionadas(areasSelecionadas.filter((a) => a !== area))
    } else {
      setAreasSelecionadas([...areasSelecionadas, area])
    }
  }

  const handleDispararEnvio = async () => {
    // REGRAS OBRIGATÓRIAS DO USUÁRIO:
    // (1) permitir revisão/edição antes de enviar
    // (2) exigir confirmação explícita
    // (3) NÃO enviar automaticamente só por gerar
    // (4) registrar remetente, destinatários, data e horário
    // (5) registrar sucesso ou falha
    // (6) não duplicar envios por múltiplos cliques
    // (7) salvar cópia no histórico
    // (8) apenas destinatários autorizados
    // (9) consultar status de envio
    if (!confirmacaoExplicita) {
      toast({
        title: 'Confirmação obrigatória',
        description:
          'Você precisa marcar a caixa de confirmação explícita antes de disparar o comunicado.',
        variant: 'destructive',
      })
      return
    }

    const destinatariosArr = destinatariosPara
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    if (destinatariosArr.length === 0) {
      toast({
        title: 'Destinatário obrigatório',
        description: 'Informe ao menos um e-mail de destino válido no campo "Para:".',
        variant: 'destructive',
      })
      return
    }

    try {
      setEnviando(true)

      const ccArr = destinatariosCc
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)

      const resultado = await FacaAnaliseService.registrarEnvioEmail({
        codigo_analise: `FACA-${relatorio.data_referencia.replace(/\//g, '')}`,
        analise_id: analiseId,
        remetente_nome: 'Programador PCP / HUB CIAFAL',
        remetente_email: 'pcp.programador@ciafal.com.br',
        destinatarios_para: destinatariosArr,
        destinatarios_cc: ccArr,
        areas_envolvidas: areasSelecionadas,
        assunto,
        corpo_html: corpoHtml,
        anexo_pdf_gerado: incluirPdf,
      })

      // REGRA OBRIGATÓRIA: NUNCA exibir mensagem fictícia de sucesso se SMTP não existir!
      if (!resultado.sucesso) {
        toast({
          title: 'Envio Registrado com Falha de SMTP',
          description: resultado.mensagem,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'E-mail enviado',
          description: 'Comunicado corporativo enviado com sucesso.',
        })
      }

      onEnvioRegistrado()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro no processo de envio',
        description: err.message || 'Falha ao registrar log de disparo.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Disparo Oficial de Comunicado — Análise de FACA
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Revisão prévia, seleção de destinatários por área e auditoria obrigatória de disparo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alerta de Governança sobre Envio */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Política de Envio CIAFAL:</strong> O comunicado só é enviado após confirmação
            explícita. O remetente, destinatários, data/hora e anexo PDF são auditados no histórico
            imutável. Como o serviço SMTP do backend não possui credenciais ativas, o sistema
            registrará a tentativa com status real de falha auditável.
          </div>
        </div>

        <div className="space-y-4 pt-1 text-xs">
          {/* Seleção de áreas */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">Áreas Envolvidas:</Label>
            <div className="flex flex-wrap gap-2">
              {['PCP', 'Comercial', 'Produção', 'Suprimentos', 'Diretoria'].map((area) => (
                <Badge
                  key={area}
                  variant={areasSelecionadas.includes(area) ? 'default' : 'outline'}
                  onClick={() => toggleArea(area)}
                  className={`cursor-pointer select-none text-xs font-semibold ${
                    areasSelecionadas.includes(area)
                      ? 'bg-[#004C97] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          {/* Para */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600">Para (separar por vírgula):</Label>
            <Input
              className="h-8 text-xs font-mono"
              value={destinatariosPara}
              onChange={(e) => setDestinatariosPara(e.target.value)}
            />
          </div>

          {/* Cc */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600">Cc (Cópia carbono):</Label>
            <Input
              className="h-8 text-xs font-mono"
              value={destinatariosCc}
              onChange={(e) => setDestinatariosCc(e.target.value)}
            />
          </div>

          {/* Assunto */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600">Assunto Oficial:</Label>
            <Input
              className="h-8 text-xs font-semibold"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            />
          </div>

          {/* Anexo PDF */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <Checkbox
              id="pdfCheck"
              checked={incluirPdf}
              onCheckedChange={(c) => setIncluirPdf(Boolean(c))}
            />
            <Label
              htmlFor="pdfCheck"
              className="text-xs text-slate-700 cursor-pointer flex items-center gap-1.5"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#004C97]" />
              Incluir Relatório Consolidado como Anexo PDF (layout A4 de impressão)
            </Label>
          </div>

          {/* Pré-visualização do Corpo */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600">Corpo do E-mail (HTML Editável):</Label>
            <Textarea
              rows={6}
              className="text-xs font-mono"
              value={corpoHtml}
              onChange={(e) => setCorpoHtml(e.target.value)}
            />
          </div>

          {/* Checkbox de Confirmação Explícita Obrigatória */}
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg flex items-start gap-2.5">
            <Checkbox
              id="confirmacaoExplicita"
              checked={confirmacaoExplicita}
              onCheckedChange={(c) => setConfirmacaoExplicita(Boolean(c))}
              className="mt-0.5"
            />
            <Label
              htmlFor="confirmacaoExplicita"
              className="text-xs text-red-900 font-bold leading-snug cursor-pointer select-none"
            >
              Confirmo formalmente o disparo deste comunicado oficial da Análise de FACA para os
              destinatários selecionados, ciente do registro imutável em auditoria.
            </Label>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleDispararEnvio}
            disabled={enviando || !confirmacaoExplicita}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {enviando ? 'Disparando...' : 'Confirmar e Enviar Comunicado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
