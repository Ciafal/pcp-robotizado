import React, { useState, useRef } from 'react'
import {
  FileText,
  X,
  Printer,
  Sparkles,
  Calendar,
  Building2,
  Filter,
  User,
  Clock,
  Mail,
  ClipboardList,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import {
  CarteiraConsolidadaRow,
  CarteiraConsolidadaAiReport,
  CarteiraVisaoModo,
} from '@/types/carteira-minima-consolidada'
import { formatNumberPTBR } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'
import { EnviarEmailCarteiraMinimaModal } from './EnviarEmailCarteiraMinimaModal'
import { CriarPendenciaCarteiraMinimaModal } from './CriarPendenciaCarteiraMinimaModal'
import { HistoricoEnviosCarteiraMinimaModal } from './HistoricoEnviosCarteiraMinimaModal'

interface CarteiraMinimaPdfModalProps {
  isOpen: boolean
  onClose: () => void
  itens: CarteiraMinimaItem[]
  filtros?: CarteiraMinimaFilterParams
  totalizadores?: CarteiraMinimaTotalizadores
  kpis?: CarteiraMinimaTotalizadores
  ultimaAtualizacaoSap?: string | null
  modoVisao?: CarteiraVisaoModo
  rowsConsolidadas?: CarteiraConsolidadaRow[]
  analiseIaReport?: CarteiraConsolidadaAiReport | null
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const parts = dataIso.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

export const CarteiraMinimaPdfModal: React.FC<CarteiraMinimaPdfModalProps> = ({
  isOpen,
  onClose,
  itens,
  filtros = {},
  totalizadores: totalizadoresProp,
  kpis,
  ultimaAtualizacaoSap = null,
  modoVisao = 'MATERIAL',
  rowsConsolidadas = [],
  analiseIaReport = null,
}) => {
  const [modalEmailOpen, setModalEmailOpen] = useState(false)
  const [modalPendenciaOpen, setModalPendenciaOpen] = useState(false)
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const totalizadores = totalizadoresProp ||
    kpis || {
      total_itens_abaixo_minimo: itens.length,
      carteira_total_tons: 0,
      estoque_livre_total_tons: 0,
      saldo_total_produzir_tons: 0,
      pedidos_afetados_count: 0,
    }

  const handlePrint = () => {
    window.print()
  }

  const currentUser = pb.authStore.record || pb.authStore.model
  const userName =
    (currentUser as any)?.name || (currentUser as any)?.email || 'Administrador Geral CIAFAL'

  const dataHoraEmissao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  // Nome padronizado do PDF exigido: PCP_Carteira_Minima_Nao_Atingida_DDMMAAAA_HHMM.pdf
  const now = new Date()
  const ddmmaaaa = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
  const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const sufixoModo = modoVisao === 'BITOLA' ? '_Bitola' : modoVisao === 'FAMILIA' ? '_Familia' : ''
  const nomeArquivoPdf = `PCP_Carteira_Minima_Nao_Atingida${sufixoModo}_${ddmmaaaa}_${hhmm}.pdf`

  const tituloRelatorio =
    modoVisao === 'BITOLA'
      ? 'Relatório de Carteira Mínima Não Atingida — Bitola'
      : modoVisao === 'FAMILIA'
        ? 'Relatório de Carteira Mínima Não Atingida — Família'
        : 'Relatório de Carteira Mínima Não Atingida'

  // Montagem da descrição de filtros aplicados
  const filtrosDesc: string[] = []
  if (filtros.empresa) filtrosDesc.push(`Empresa: ${filtros.empresa}`)
  if (filtros.centro) filtrosDesc.push(`Centro: ${filtros.centro}`)
  if (filtros.linha) filtrosDesc.push(`Linha: ${filtros.linha}`)
  if (filtros.material) filtrosDesc.push(`Material: ${filtros.material}`)
  if (filtros.pedido) filtrosDesc.push(`Pedido: ${filtros.pedido}`)
  if (filtros.criticidade && filtros.criticidade !== 'TODAS') {
    filtrosDesc.push(`Criticidade: ${filtros.criticidade}`)
  }
  if (filtros.dataDesejadaInicio || filtros.dataDesejadaFim) {
    filtrosDesc.push(
      `Período: ${formatarDataPtBr(filtros.dataDesejadaInicio)} até ${formatarDataPtBr(filtros.dataDesejadaFim)}`,
    )
  }
  const filtrosFormatados =
    filtrosDesc.length > 0
      ? filtrosDesc.join(' | ')
      : 'Nenhum filtro restritivo aplicado (Todos os registros)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Barra superior de ações (oculta na impressão nativa via no-print) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Visualização do Relatório PDF • Carteira Mínima Não Atingida
              </h3>
              <p className="text-xs text-slate-500">
                Padrão Oficial CIAFAL • {itens.length} material(is) listado(s)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Acesso rápido ao Histórico de Envios */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalHistoricoOpen(true)}
              className="text-xs h-8 gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100"
              title="Consultar histórico de e-mails e pendências"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              Histórico de envios
            </Button>

            {/* Ação 1: Enviar por e-mail */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalEmailOpen(true)}
              className="text-xs h-8 gap-1.5 border-[#004C97]/30 text-[#004C97] hover:bg-blue-50 font-semibold"
            >
              <Mail className="w-3.5 h-3.5" />
              Enviar por e-mail
            </Button>

            {/* Ação 2: Enviar pendência no HUB */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalPendenciaOpen(true)}
              className="text-xs h-8 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Enviar pendência no HUB
            </Button>

            {/* Ação nativa Imprimir / Salvar PDF preservada */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Salvar PDF
            </Button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Documento Impresso / Visualizado */}
        <div
          ref={reportRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-900 print:p-0 print:space-y-4"
        >
          {/* Cabeçalho Corporativo CIAFAL */}
          <div className="border-b-2 border-[#004C97] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#004C97] uppercase">
                HUB INDUSTRIAL CIAFAL • PCP ROBOTIZADO
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{tituloRelatorio}</h1>
              <p className="text-xs text-slate-600 mt-1">
                Submódulo: Análise de Carteira • Abordagem:{' '}
                <strong className="text-[#004C97]">
                  {modoVisao === 'BITOLA'
                    ? 'Consolidada por Bitola'
                    : modoVisao === 'FAMILIA'
                      ? 'Consolidada por Família'
                      : 'Por Material'}
                </strong>{' '}
                • Origem dos Dados:{' '}
                <strong>SAP ECC via FCA (RFC Z_RFC_CARTEIRA_MINIMA_PROD)</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div className="font-semibold text-slate-800">Emissão Oficial</div>
              <div>{dataHoraEmissao}</div>
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-[#004C97] rounded font-mono font-bold mt-1 inline-block border border-blue-200">
                RELATÓRIO AUDITADO
              </span>
            </div>
          </div>

          {/* Cards Resumo dos Totalizadores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Itens Abaixo do Mínimo
              </span>
              <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                {totalizadores.total_itens_abaixo_minimo} materiais
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Carteira Total
              </span>
              <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                {formatNumberPTBR(totalizadores.carteira_total_tons, 3)} t
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Estoque Livre Total
              </span>
              <span className="text-base font-bold font-mono text-emerald-800 mt-0.5 block">
                {formatNumberPTBR(totalizadores.estoque_livre_total_tons, 3)} t
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Saldo Total a Produzir
              </span>
              <span className="text-base font-bold font-mono text-amber-800 mt-0.5 block">
                {formatNumberPTBR(totalizadores.saldo_total_produzir_tons, 3)} t
              </span>
            </div>
          </div>

          {/* TABELA DA ABORDAGEM ATIVA: CONSOLIDADA (Bitola/Família) OU ORIGINAL (Material) */}
          {modoVisao !== 'MATERIAL' ? (
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Detalhamento Consolidado por {modoVisao === 'BITOLA' ? 'Bitola' : 'Família'}
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">
                        {modoVisao === 'BITOLA' ? 'Bitola' : 'Família'}
                      </th>
                      <th className="py-2 px-2.5">Linha/Centro</th>
                      <th className="py-2 px-2.5 text-center">Materiais (qtde)</th>
                      <th className="py-2 px-2.5 text-center">Pedidos (qtde)</th>
                      <th className="py-2 px-2.5 text-right">Carteira total (t)</th>
                      <th className="py-2 px-2.5 text-right">Estoque livre (t)</th>
                      <th className="py-2 px-2.5 text-right">Saldo a produzir (t)</th>
                      <th className="py-2 px-2.5 text-right">Produção mínima (t)</th>
                      <th className="py-2 px-2.5 text-right">Diferença (t)</th>
                      <th className="py-2 px-2.5 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {rowsConsolidadas.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-slate-500">
                          Nenhum registro consolidado para emissão do relatório.
                        </td>
                      </tr>
                    ) : (
                      rowsConsolidadas.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {row.chave}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {row.linha_centro}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-semibold">
                            {row.materiais_count}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-semibold">
                            {row.pedidos_count}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                            {formatNumberPTBR(row.carteira_total_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-emerald-800 whitespace-nowrap">
                            {formatNumberPTBR(row.estoque_livre_total_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                            {formatNumberPTBR(row.saldo_total_produzir_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                            {row.producao_minima_tons !== null
                              ? `${formatNumberPTBR(row.producao_minima_tons, 3)} t`
                              : row.situacao}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                            {row.diferenca_tons !== null ? (
                              <span
                                className={
                                  row.diferenca_tons < 0 ? 'text-rose-700' : 'text-emerald-700'
                                }
                              >
                                {row.diferenca_tons > 0 ? '+' : ''}
                                {formatNumberPTBR(row.diferenca_tons, 3)} t
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                row.situacao === 'Atendida'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.situacao === 'Não atingida'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {row.situacao}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Detalhamento de Itens com Gargalo de Produção Mínima
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Material</th>
                      <th className="py-2 px-2.5">Texto breve</th>
                      <th className="py-2 px-2.5 text-right">Carteira (t)</th>
                      <th className="py-2 px-2.5 text-right">Estoque livre (t)</th>
                      <th className="py-2 px-2.5 text-right">Saldo do pedido (t)</th>
                      <th className="py-2 px-2.5 text-right">Carteira mínima de produção (t)</th>
                      <th className="py-2 px-2.5 text-center">Pedido</th>
                      <th className="py-2 px-2.5 text-center">Data desejada</th>
                      <th className="py-2 px-2.5">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500">
                          Nenhum registro encontrado para emissão do relatório.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {item.material}
                          </td>
                          <td className="py-2 px-2.5 font-medium">{item.descricao_material}</td>
                          <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                            {formatNumberPTBR(item.carteira_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-emerald-800 whitespace-nowrap">
                            {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                            {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                            {formatNumberPTBR(item.producao_minima_tons, 3)} t
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-[#004C97] whitespace-nowrap">
                            {item.pedido_formatado}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono whitespace-nowrap">
                            {formatarDataPtBr(item.data_desejada)}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 text-[10px] leading-relaxed">
                            {item.observacao_ia}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEÇÃO DA ANÁLISE IA QUANDO DISPONÍVEL NO PDF */}
          {analiseIaReport && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#004C97] uppercase text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagnóstico Inteligente de IA Integrado</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {analiseIaReport.resumoExecutivo}
              </p>
              {analiseIaReport.recomendacoesPcp.length > 0 && (
                <div className="pt-1">
                  <span className="font-bold text-slate-800 block text-[10px] uppercase">
                    Principais Recomendações:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 mt-1">
                    {analiseIaReport.recomendacoesPcp.slice(0, 3).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Rodapé Obrigatório da Especificação: Data/hora, Usuário e Filtros Aplicados */}
          <div className="border-t-2 border-slate-200 pt-4 text-[11px] text-slate-600 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Data/hora de geração: <strong>{dataHoraEmissao}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Usuário responsável pela geração: <strong>{userName}</strong>
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700 block">Filtros Aplicados:</span>
                <span className="text-slate-600">{filtrosFormatados}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>
                Última atualização SAP registrada:{' '}
                {ultimaAtualizacaoSap
                  ? `${new Date(ultimaAtualizacaoSap).toLocaleDateString('pt-BR')} ${new Date(ultimaAtualizacaoSap).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'N/A'}
              </span>
              <span>Padrão Corporativo CIAFAL • PCP Robotizado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Secundário: Enviar Relatório por E-mail */}
      {modalEmailOpen && (
        <EnviarEmailCarteiraMinimaModal
          isOpen={modalEmailOpen}
          onClose={() => setModalEmailOpen(false)}
          itens={itens}
          filtros={filtros}
          totalizadores={totalizadores}
          nomeArquivoPdf={nomeArquivoPdf}
        />
      )}

      {/* Modal Secundário: Criar Pendência PCP no Meu Dia */}
      {modalPendenciaOpen && (
        <CriarPendenciaCarteiraMinimaModal
          isOpen={modalPendenciaOpen}
          onClose={() => setModalPendenciaOpen(false)}
          itens={itens}
          filtros={filtros}
          totalizadores={totalizadores}
          nomeArquivoPdf={nomeArquivoPdf}
          onVisualizarRelatorioOriginal={() => {
            setModalPendenciaOpen(false)
          }}
        />
      )}

      {/* Modal Secundário: Histórico de Envios */}
      {modalHistoricoOpen && (
        <HistoricoEnviosCarteiraMinimaModal
          isOpen={modalHistoricoOpen}
          onClose={() => setModalHistoricoOpen(false)}
        />
      )}
    </div>
  )
}

export default CarteiraMinimaPdfModal
