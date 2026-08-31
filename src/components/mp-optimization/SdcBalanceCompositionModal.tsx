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
import { Layers, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { MPSdcSteelMatrixRow } from '@/types/mp-optimization'

interface SdcBalanceCompositionModalProps {
  isOpen: boolean
  onClose: () => void
  row: MPSdcSteelMatrixRow | null
}

export const SdcBalanceCompositionModal: React.FC<SdcBalanceCompositionModalProps> = ({
  isOpen,
  onClose,
  row,
}) => {
  if (!row) return null

  const items = [
    {
      source: 'Estoque SDC (Depósito DS03)',
      owner: 'Sidercentro',
      tons: row.stock_sdc_ds03_tons,
      eligibility: '100% Liberado para SDC',
      rule: 'Material exclusivo no pátio físico SDC',
      type: 'PROPRIO_SDC',
    },
    {
      source: 'Estoque CIAFAL (Depósito DP04 Elegível)',
      owner: 'CIAFAL Wilson Santos',
      tons: row.stock_ciafal_eligible_tons,
      eligibility:
        row.stock_ciafal_eligible_tons > 0 ? 'Liberado por Regra Técnica' : 'Não elegível',
      rule: 'Cessão autorizada conforme matriz de compatibilidade',
      type: 'CIAFAL_ELEGIVEL',
    },
    {
      source: 'Estoque KS Elegível',
      owner: 'Depósito KS Parceiro',
      tons: row.stock_ks_tons,
      eligibility: row.stock_ks_tons > 0 ? 'Liberado' : 'Sem saldo',
      rule: 'Palanquilhas e sobras em pátio externo',
      type: 'KS_ELEGIVEL',
    },
    {
      source: 'Placas Finas',
      owner: 'Sidercentro',
      tons: row.stock_thin_plates_tons,
      eligibility: 'Liberado',
      rule: 'Lotes de placas finas para cortes especiais',
      type: 'PLACAS_FINAS',
    },
    {
      source: 'Sucata Utilizável SDC',
      owner: 'Sidercentro',
      tons: row.stock_usable_scrap_sdc_tons,
      eligibility: 'Reclassificado para corte',
      rule: 'Aproveitamento de sobras de processo com inspeção visual',
      type: 'SUCATA_UTILIZAVEL',
    },
    {
      source: 'Entradas Programadas / Recebimentos',
      owner: 'Fornecedor / Usina',
      tons: row.expected_receipts_tons,
      eligibility: 'Eventos reais programados',
      rule: 'Pedidos SAP confirmados e transferências em trânsito',
      type: 'RECEBIMENTO',
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Rastreabilidade e Composição do Saldo — {row.steel_grade}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Abertura detalhada por depósito, elegibilidade técnica e propriedade do material
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-300 text-xs font-bold font-mono"
            >
              Total: {row.total_stock_tons.toFixed(2)} t
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Card Resumo */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Aço / Classe
              </span>
              <span className="text-sm font-bold text-slate-900">
                {row.steel_grade} ({row.steel_class})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Saldo Projetado
              </span>
              <span className="text-sm font-bold text-[#004C97] font-mono">
                {row.projected_balance_tons.toFixed(2)} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Estoque Mínimo
              </span>
              <span className="text-sm font-bold text-slate-700 font-mono">
                {row.min_stock_tons.toFixed(2)} t
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Cobertura
              </span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {row.statistical_coverage_days} dias
              </span>
            </div>
          </div>

          {/* Tabela de Composição */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Fonte / Depósito</th>
                  <th className="p-3">Proprietário</th>
                  <th className="p-3 text-right">Tonelagem (t)</th>
                  <th className="p-3">Elegibilidade Técnica</th>
                  <th className="p-3">Regra Aplicada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{it.source}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          it.owner.includes('Sidercentro')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {it.owner}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#004C97]">
                      {it.tons > 0 ? `${it.tons.toFixed(2)} t` : '-'}
                    </td>
                    <td className="p-3 text-slate-700">
                      <span className="flex items-center gap-1">
                        {it.tons > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : null}
                        {it.eligibility}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{it.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fórmula e Auditoria */}
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5 text-[11px] text-slate-700">
            <span className="font-bold text-[#004C97] block">
              Regra de Propriedade & Governança:
            </span>
            <p className="leading-relaxed">
              O estoque da CIAFAL (DP04) NÃO é somado automaticamente à Sidercentro. Somente entram
              no saldo as parcelas expressamente autorizadas pelas regras técnicas de cessão e
              substituição.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Fechar Rastreabilidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcBalanceCompositionModal
