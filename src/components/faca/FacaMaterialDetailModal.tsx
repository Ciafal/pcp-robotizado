import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  Layers,
  History,
  AlertTriangle,
  Factory,
  Sparkles,
  ArrowRight,
  Boxes,
} from 'lucide-react'
import { FacaItemAnalitico } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaMaterialDetailModalProps {
  item: FacaItemAnalitico | null
  isOpen: boolean
  onClose: () => void
}

export const FacaMaterialDetailModal: React.FC<FacaMaterialDetailModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'pedidos' | 'estoque' | 'mp'>('geral')

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 font-mono">
                  {item.codigo_material}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-semibold"
                >
                  {item.grupo_faca}
                </Badge>
                {item.is_mto && (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                  >
                    MTO
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {item.descricao} &bull; Centro {item.centro} &bull; Linha {item.linha_preferencial}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Diagnóstico da IA específico do material */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900">Análise Automatizada de PCP & IA:</div>
            <div>{item.observacoes_ia}</div>
            {item.pendencias_comerciais && (
              <div className="text-amber-800 font-medium">
                <strong>Pendência Comercial:</strong> {item.pendencias_comerciais}
              </div>
            )}
            {item.pendencias_industriais && (
              <div className="text-rose-800 font-medium">
                <strong>Pendência Industrial:</strong> {item.pendencias_industriais}
              </div>
            )}
          </div>
        </div>

        {/* Cards Resumo do Material */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Carteira Aberta</div>
            <div className="text-sm font-extrabold text-slate-900">
              {formatNumberPtBr(item.carteira_aberta_t, 1)} t
            </div>
            <div className="text-[10px] text-slate-500">SAP: {item.pedido_sap}</div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Estoque PA Livre</div>
            <div className="text-sm font-extrabold text-emerald-700">
              {formatNumberPtBr(item.estoque_livre_pa_t, 1)} t
            </div>
            <div className="text-[10px] text-slate-500">Físico liberado</div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Saldo a Produzir</div>
            <div className="text-sm font-extrabold text-amber-700">
              {formatNumberPtBr(item.saldo_a_produzir_t, 1)} t
            </div>
            <div className="text-[10px] text-slate-500">
              Prog: {formatNumberPtBr(item.quantidade_programada_t, 1)} t
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-bold">MP Necessária</div>
            <div className="text-sm font-extrabold text-purple-700">
              {formatNumberPtBr(item.mp_necessaria_t, 1)} t
            </div>
            <div className="text-[10px] text-slate-500">
              Rendimento: {(item.rendimento_transformacao * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="geral" className="text-xs">
              1. Dados Técnicos
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="text-xs">
              2. Pedidos SAP
            </TabsTrigger>
            <TabsTrigger value="estoque" className="text-xs">
              3. Movimentações
            </TabsTrigger>
            <TabsTrigger value="mp" className="text-xs">
              4. Matéria-Prima
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200 rounded-lg p-3 bg-white">
              <div>
                <span className="text-slate-500 text-[10px] block">Bitola / Dimensões:</span>
                <span className="font-bold text-slate-800">{item.bitola}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Tipo de Aço:</span>
                <span className="font-bold text-slate-800">{item.tipo_aco}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Lote Mínimo Laminação:</span>
                <span className="font-bold text-slate-800">
                  {formatNumberPtBr(item.carteira_minima_lam_t, 1)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Preço Unitário Médio:</span>
                <span className="font-bold text-slate-800">
                  R$ {item.preco_unitario_brl_t.toLocaleString('pt-BR')}/t
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Faturamento Previsto:</span>
                <span className="font-bold text-emerald-700">
                  R$ {item.valor_faturamento_previsto_brl.toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Previsão Faturamento:</span>
                <span className="font-bold text-blue-700">{item.previsao_faturamento}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-3 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Pedido SAP</TableHead>
                    <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                    <TableHead className="font-bold text-slate-700">Data Registro</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">
                      Volume (t)
                    </TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">
                      Status SAP
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.historico_pedidos && item.historico_pedidos.length > 0 ? (
                    item.historico_pedidos.map((ped, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono font-bold text-slate-800">
                          {ped.pedido}
                        </TableCell>
                        <TableCell className="text-slate-700">{ped.cliente}</TableCell>
                        <TableCell className="text-slate-500">{ped.data}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatNumberPtBr(ped.qtd_t, 1)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {ped.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-slate-500 text-xs">
                        Nenhum pedido histórico adicional encontrado para este material.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="space-y-3 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Tipo Movimento</TableHead>
                    <TableHead className="font-bold text-slate-700">Data</TableHead>
                    <TableHead className="font-bold text-slate-700">Documento SAP</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Depósito</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">
                      Quantidade (t)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.historico_movimentacoes && item.historico_movimentacoes.length > 0 ? (
                    item.historico_movimentacoes.map((mov, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-800">{mov.tipo}</TableCell>
                        <TableCell className="text-slate-500">{mov.data}</TableCell>
                        <TableCell className="font-mono text-slate-700">{mov.documento}</TableCell>
                        <TableCell className="text-center font-mono text-slate-600">
                          {mov.deposito}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatNumberPtBr(mov.qtd_t, 1)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-slate-500 text-xs">
                        Sem histórico recente de movimentações 101/601.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="mp" className="space-y-3 pt-2 text-xs">
            <div className="border border-slate-200 rounded-lg p-3 bg-indigo-50/40 space-y-2">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-700" /> Matéria-Prima Técnica Vinculada (Ficha
                Mestra)
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Código & Descrição MP:</span>
                  <span className="font-bold">{item.materia_prima_vinculada}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Rendimento Homologado:</span>
                  <span className="font-bold text-emerald-700">
                    {(item.rendimento_transformacao * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    MP Disponível no Depósito:
                  </span>
                  <span className="font-bold text-indigo-800">
                    {formatNumberPtBr(item.mp_disponivel_t, 1)} t
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    MP Necessária p/ Saldo a Produzir:
                  </span>
                  <span className="font-bold text-purple-800">
                    {formatNumberPtBr(item.mp_necessaria_t, 1)} t
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Detalhamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
