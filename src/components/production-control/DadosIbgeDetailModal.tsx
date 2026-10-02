/**
 * Modal de Detalhamento — Peça 1: Dados IBGE
 * Título: "Dados IBGE — Detalhamento"
 *
 * Exibe Identificação, Material, Produção e Rastreabilidade completa dos registros formadores.
 * Somente leitura. Botão "Fechar".
 */

import React from 'react'
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
  Building2,
  GitBranch,
  Factory,
  Calendar,
  Layers,
  Package,
  Scale,
  FileSpreadsheet,
  X,
  FileCheck2,
} from 'lucide-react'
import { LinhaConsolidadaIbge } from '@/types/dados-ibge'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface Props {
  open: boolean
  onClose: () => void
  item: LinhaConsolidadaIbge | null
}

export const DadosIbgeDetailModal: React.FC<Props> = ({ open, onClose, item }) => {
  if (!item) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enviada à Contabilidade':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
            Enviada à Contabilidade
          </Badge>
        )
      case 'Conferida':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-xs font-semibold">
            Conferida
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#004C97] text-white rounded-xl shadow-xs">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Dados IBGE — Detalhamento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Composição analítica da linha consolidada para fechamento e auditoria da
                  Contabilidade.
                </DialogDescription>
              </div>
            </div>
            {getStatusBadge(item.status_fechamento)}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-6">
          {/* 1. SEÇÃO IDENTIFICAÇÃO */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#004C97]" />
              Identificação do Lote
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Empresa / WERKS:
                </span>
                <span className="font-semibold text-slate-900">
                  {item.empresa_code} — {item.empresa_nome}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Linha:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-[#004C97]" />
                  {item.linha_code} — {item.linha_nome}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Centro Principal:
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Factory className="w-3 h-3 text-[#004C97]" />
                  {item.centro_code}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Período / Competência:
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#004C97]" />
                  {item.competencia}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SEÇÃO MATERIAL */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#004C97]" />
              Dados do Material
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Código do Material:
                </span>
                <span className="font-mono font-bold text-[#004C97]">{item.material_code}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Descrição:</span>
                <span className="font-semibold text-slate-900">{item.material_descricao}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Tipo Material (MTART) / UM:
                </span>
                <span className="font-semibold text-slate-900">
                  <Badge variant="outline" className="mr-1.5 text-[10px] bg-white">
                    {item.tipo_material}
                  </Badge>
                  {item.unidade_medida}
                </span>
              </div>
            </div>
          </div>

          {/* 3. SEÇÃO PRODUÇÃO CONSOLIDADA */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#004C97]" />
              Produção Consolidada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/70 text-xs">
              <div>
                <span className="text-[11px] text-slate-600 block font-medium">
                  Quantidade Consolidada:
                </span>
                <span className="text-base font-bold text-[#004C97]">
                  {formatNumberPTBR(item.quantidade_produzida, 3)} {item.unidade_medida}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600 block font-medium">
                  Origem dos Dados:
                </span>
                <span className="font-semibold text-slate-800">
                  {item.registros_rastreabilidade.some((r) => r.origem === 'APONTAMENTO_MES')
                    ? 'Apontamentos MES + Ordens'
                    : 'Ordens de Produção PCP'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600 block font-medium">
                  Centros Envolvidos:
                </span>
                <span className="font-semibold text-slate-800">
                  {item.centros_envolvidos.join(', ') || item.centro_code}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600 block font-medium">
                  Registros Considerados:
                </span>
                <span className="font-semibold text-slate-800">
                  {item.total_registros} registro(s)
                </span>
              </div>
            </div>
          </div>

          {/* 4. SEÇÃO RASTREABILIDADE (Tabela dos registros formadores) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#004C97]" />
                Rastreabilidade de Registros Formadores ({item.registros_rastreabilidade.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-normal">
                Visualização auditada de chão de fábrica
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-600 font-semibold sticky top-0 z-5 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Origem</th>
                      <th className="py-2 px-3">OP / Apontamento</th>
                      <th className="py-2 px-3">Data/Hora (24h)</th>
                      <th className="py-2 px-3 text-right">Quantidade</th>
                      <th className="py-2 px-3">UM</th>
                      <th className="py-2 px-3">Doc SAP</th>
                      <th className="py-2 px-3">Usuário / Origem</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {item.registros_rastreabilidade.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          Nenhum registro analítico detalhado disponível para esta linha.
                        </td>
                      </tr>
                    ) : (
                      item.registros_rastreabilidade.map((reg, idx) => (
                        <tr key={reg.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-medium text-slate-700">
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Layers className="w-3 h-3 text-[#004C97]" />
                              {reg.origem === 'APONTAMENTO_MES' ? 'MES' : 'OP'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            {reg.op_number}
                          </td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {reg.data_hora_formatada}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 text-right">
                            {formatNumberPTBR(reg.quantidade, 3)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 uppercase font-mono">
                            {reg.unidade}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono">
                            {reg.sap_document_number || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{reg.usuario_origem}</td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                              {reg.status_processamento}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 text-xs font-semibold px-4 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DadosIbgeDetailModal
