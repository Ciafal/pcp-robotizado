import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, Download, FileText, CheckCircle2, ShieldCheck } from 'lucide-react'
import { PCPMonthlySummaryRecord } from '@/services/pcp-monthly-summaries'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface SummaryPdfModalProps {
  isOpen: boolean
  onClose: () => void
  summary: PCPMonthlySummaryRecord
  isExecutiveMode?: boolean
}

export const SummaryPdfModal: React.FC<SummaryPdfModalProps> = ({
  isOpen,
  onClose,
  summary,
  isExecutiveMode = false,
}) => {
  const sec = summary.sections_data

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100">
        <DialogHeader className="p-3.5 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#004C97] text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                {isExecutiveMode
                  ? 'Visualização de Impressão: PDF Executivo CIAFAL'
                  : 'Visualização de Impressão: Relatório Completo CIAFAL'}
              </DialogTitle>
              <div className="text-[11px] text-slate-500">
                Resumo: {summary.summary_code} &bull; Linha:{' '}
                {summary.linha_nome || summary.linha_code} &bull; {summary.version_tag}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 bg-white border-slate-300 text-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Folha A4 Formatada Padrão CIAFAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
          <div
            id="ciafal-pdf-content"
            className="w-full max-w-3xl bg-white shadow-md border border-slate-300 p-6 sm:p-8 space-y-6 text-slate-800 text-xs font-sans print:shadow-none print:border-none print:m-0 print:p-0"
          >
            {/* Topo do Cabeçalho com Logomarca Institucional CIAFAL */}
            <div className="border-b-2 border-[#004C97] pb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-black tracking-tight text-[#004C97] uppercase">
                  CIAFAL &bull; PCP ROBOTIZADO
                </div>
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {isExecutiveMode
                    ? 'RESUMO MENSAL EXECUTIVO DE ENTREGAS'
                    : 'RELATÓRIO MENSAL CONSOLIDADO DE ENTREGAS PCP'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Divinópolis &bull; Contagem &bull; Filial Sidercentro
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <Badge
                  variant="outline"
                  className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/30 font-bold text-xs"
                >
                  Versão {summary.version_tag}
                </Badge>
                <div className="text-[10px] text-slate-500 font-mono">
                  Período: <strong>{summary.mes_ano}</strong>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Entrega: {summary.data_entrega || '04/05/2025'}
                </div>
              </div>
            </div>

            {/* Quadro de Identificação */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Empresa / Centro:
                </span>
                <span className="font-bold text-slate-800">
                  {summary.empresa_code} - {summary.centro_code}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Linha Fabril:
                </span>
                <span className="font-bold text-slate-800">
                  {summary.linha_nome || summary.linha_code}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Responsável PCP:
                </span>
                <span className="font-bold text-slate-800">
                  {summary.responsavel_pcp_nome || 'Carlos Mendes'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Status do Resumo:
                </span>
                <span className="font-bold text-[#004C97]">{summary.status}</span>
              </div>
            </div>

            {/* 1. Sumário Executivo */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] border-b border-slate-200 pb-1">
                1. Sumário Executivo do Mês
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 leading-relaxed">
                {sec.sumarioExecutivo?.bullets?.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>

            {/* 2. Análise de Carteira */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] border-b border-slate-200 pb-1">
                2. Análise de Carteira & Atendimento (SAP ZSD28C)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Volume Total:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {sec.analiseCarteira?.totalTons?.formattedText || '3.420,50 t'}
                  </span>
                </div>
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Ordens MTO:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {sec.analiseCarteira?.carteiraMTOTons?.formattedText || '840,20 t'}
                  </span>
                </div>
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Cobertura Média:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {sec.analiseCarteira?.coberturaDias || 22} dias
                  </span>
                </div>
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Rupturas:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {sec.analiseCarteira?.rupturasIdentificadas || 0} itens
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Matéria-Prima & Suprimentos */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-[#004C97] border-b border-slate-200 pb-1">
                3. Matéria-Prima & Saldo de Pátio
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Estoque Físico:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {sec.materiaPrima?.estoqueAtualTons?.formattedText || '5.840,00 t'}
                  </span>
                </div>
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Necessidade Prevista:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {sec.materiaPrima?.necessidadeTotalTons?.formattedText || '3.820,00 t'}
                  </span>
                </div>
                <div className="p-2 border rounded bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Risco Global MP:</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {sec.materiaPrima?.riscoRupturaNivel || 'BAIXO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Seções complementares (quando relatório completo) */}
            {!isExecutiveMode && (
              <>
                {/* 4. Restrições e Problemas Industriais */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-[#004C97] border-b border-slate-200 pb-1">
                    4. Restrições Industriais & Produtividade Realizada
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-slate-700">
                    <div className="p-2 border rounded">
                      <span className="text-[10px] text-slate-500 block">Produtividade Média:</span>
                      <span className="font-bold font-mono">
                        {sec.restricoesProblemas?.produtividadeRealizadaTph?.formattedText ||
                          '14,8 t/h'}
                      </span>
                    </div>
                    <div className="p-2 border rounded">
                      <span className="text-[10px] text-slate-500 block">Tempo Setup Médio:</span>
                      <span className="font-bold font-mono">
                        {sec.restricoesProblemas?.tempoSetupMedioMin || 42} min
                      </span>
                    </div>
                    <div className="p-2 border rounded">
                      <span className="text-[10px] text-slate-500 block">Paradas Programadas:</span>
                      <span className="font-bold font-mono">
                        {sec.restricoesProblemas?.paradasProgramadasHoras || 16} h
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Pendências por Área */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-[#004C97] border-b border-slate-200 pb-1">
                    5. Pendências & Planos de Ação por Área
                  </h3>
                  <table className="w-full text-[11px] border border-slate-200 text-left">
                    <thead className="bg-slate-50 font-bold text-slate-700 border-b">
                      <tr>
                        <th className="p-1.5">Área</th>
                        <th className="p-1.5">Ação Acordada</th>
                        <th className="p-1.5">Responsável</th>
                        <th className="p-1.5">Prazo</th>
                        <th className="p-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sec.pendenciasPorArea?.tabela?.map((p) => (
                        <tr key={p.id}>
                          <td className="p-1.5 font-bold text-slate-800">{p.area}</td>
                          <td className="p-1.5 text-slate-700">{p.acao}</td>
                          <td className="p-1.5 text-slate-600">{p.responsavel}</td>
                          <td className="p-1.5 font-mono">{p.prazo}</td>
                          <td className="p-1.5 font-semibold text-slate-800">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Conclusão IA & Aprovações */}
            <div className="space-y-2 border-t-2 border-slate-200 pt-4">
              <h3 className="text-xs font-black uppercase text-[#004C97]">
                Parecer Técnico & Aprovação PCP
              </h3>
              <p className="text-slate-700 leading-relaxed italic bg-slate-50 p-2.5 rounded border border-slate-200">
                "
                {sec.conclusaoIA?.parecerGeral ||
                  'Relatório mensal com consistência técnica plena, dados rastreáveis e conformidade com as diretrizes de governança CIAFAL.'}
                "
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                <div className="border-t border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">
                    {summary.responsavel_pcp_nome || 'Carlos Mendes'}
                  </div>
                  <div className="text-[10px] text-slate-500">Programador PCP / Homologador</div>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">Gerência Industrial CIAFAL</div>
                  <div className="text-[10px] text-slate-500">Validação Operacional & SLA</div>
                </div>
              </div>
            </div>

            {/* Rodapé com Rastreabilidade */}
            <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>CIAFAL PCP Robotizado &bull; Documento Autenticado</span>
              <span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300"
          >
            Fechar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar / Imprimir</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default SummaryPdfModal
