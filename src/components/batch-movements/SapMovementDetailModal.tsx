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
import { SapBatchMovement } from '@/types/batch-movements'
import {
  FileText,
  Building2,
  Calendar,
  Layers,
  User,
  Hash,
  Scale,
  ArrowRightLeft,
  Info,
} from 'lucide-react'

interface SapMovementDetailModalProps {
  movement: SapBatchMovement | null
  isOpen: boolean
  onClose: () => void
}

export const SapMovementDetailModal: React.FC<SapMovementDetailModalProps> = ({
  movement,
  isOpen,
  onClose,
}) => {
  if (!movement) return null

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const isSaida = movement.shkzg === 'H' || movement.bwart === '261' || movement.bwart === '601'
  const isEstorno =
    movement.is_estorno ||
    movement.bwart === '102' ||
    movement.bwart === '262' ||
    movement.bwart === '602'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-[#004C97]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Detalhes da Movimentação SAP (MB51)
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Documento de Material:{' '}
                  <strong className="font-mono text-slate-700">
                    {movement.mblnr}/{movement.mjahr}
                  </strong>{' '}
                  (Item {movement.zeile})
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-bold px-2.5 py-1 ${
                movement.bwart === '601'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : isEstorno
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              Tipo {movement.bwart} {isEstorno && '— Estorno'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Informações Principais em Grid */}
        <div className="space-y-4 py-2">
          {/* Bloco 1: Movimento e Descrição Oficial SAP */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Classificação do Movimento (BWART)
            </span>
            <div className="text-sm font-bold text-slate-800">
              {movement.bwart} —{' '}
              {movement.bwart_desc || 'Descrição do movimento não informada pelo SAP'}
            </div>
            {movement.bktxt && (
              <div className="mt-1 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Texto Cabeçalho:</span>{' '}
                {movement.bktxt}
              </div>
            )}
          </div>

          {/* Bloco 2: Dados Contábeis e Quantidades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span>Quantidade Lançada</span>
              </div>
              <div
                className={`text-base font-mono font-bold ${
                  isSaida ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isSaida ? '-' : '+'}
                {formatNumber(Math.abs(movement.quantidade))}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  {movement.unidade_medida || 'KG'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Débito/Crédito (SHKZG): {movement.shkzg || (isSaida ? 'H' : 'S')}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Centro e Depósito</span>
              </div>
              <div className="text-sm font-bold text-slate-800">
                Centro: {movement.werks || '--'}
              </div>
              <div className="text-xs text-sky-700 font-semibold">
                Depósito: {movement.lgort || '--'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Data e Hora de Lançamento</span>
              </div>
              <div className="text-sm font-bold text-slate-800">{movement.data_lancamento}</div>
              <div className="text-xs font-mono text-slate-500">{movement.hora || '--:--:--'}</div>
            </div>
          </div>

          {/* Bloco 3: Dados do Material e Lote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Material</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800">
                {movement.material_code}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {movement.material_desc || 'Sem descrição cadastrada'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Lote</span>
              </div>
              <div className="text-sm font-mono font-extrabold text-[#004C97]">{movement.lote}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Controle de Lote Obrigatório</div>
            </div>
          </div>

          {/* Bloco 4: Rastreabilidade de Ordens e Documentos Comerciais */}
          <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-[#004C97]" />
              <span>Documentos Relacionados & Vínculos Operacionais</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Ordem Produção (AUFNR):</span>
                <span className="font-mono font-bold text-slate-800">{movement.aufnr || '--'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Pedido Venda (KDAUF):</span>
                <span className="font-mono font-bold text-slate-800">
                  {movement.kdauf ? `${movement.kdauf} / ${movement.kdpos || '001'}` : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Doc Referência (XBLNR):</span>
                <span className="font-mono font-bold text-slate-800">{movement.xblnr || '--'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Faturamento (VBELN_VF):</span>
                <span className="font-mono font-bold text-slate-800">
                  {movement.vbeln_vf || '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Bloco 5: Origem, Destino e Usuário SAP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Origem & Destino da Movimentação
              </span>
              <div className="text-xs text-slate-700">
                <strong>Origem:</strong> {movement.origem_movimento || 'Depósito padrão'}
              </div>
              <div className="text-xs text-slate-700 mt-1">
                <strong>Destino:</strong> {movement.destino_movimento || 'Depósito padrão'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Usuário SAP / Auditoria</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800">
                {movement.usnam || 'SISTEMA_SAP'}
              </div>
              {isEstorno && movement.doc_estorno_original && (
                <div className="text-xs text-rose-600 mt-1 font-medium">
                  Documento Original Estornado: {movement.doc_estorno_original}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
