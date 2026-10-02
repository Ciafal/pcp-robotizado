import React from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { formatNumberPTBR } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'

interface CarteiraMinimaPdfModalProps {
  isOpen: boolean
  onClose: () => void
  itens: CarteiraMinimaItem[]
  filtros: CarteiraMinimaFilterParams
  totalizadores: CarteiraMinimaTotalizadores
  ultimaAtualizacaoSap: string | null
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
  filtros,
  totalizadores,
  ultimaAtualizacaoSap,
}) => {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const currentUser = pb.authStore.record || pb.authStore.model
  const userName =
    (currentUser as any)?.name || (currentUser as any)?.email || 'Administrador Geral CIAFAL'

  const dataHoraEmissao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

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
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-900 print:p-0 print:space-y-4">
          {/* Cabeçalho Corporativo CIAFAL */}
          <div className="border-b-2 border-[#004C97] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#004C97] uppercase">
                HUB INDUSTRIAL CIAFAL • PCP ROBOTIZADO
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                Relatório de Carteira Mínima Não Atingida
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Submódulo: Análise de Carteira • Origem dos Dados:{' '}
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

          {/* Estrutura Exata Exigida da Tabela do PDF */}
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
    </div>
  )
}

export default CarteiraMinimaPdfModal
