import React from 'react'
import {
  X,
  Package,
  Calendar,
  Building2,
  TrendingDown,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { KpiMaterialDetail } from '@/services/kpis-carteira-service'

interface KpiMaterialDetailModalProps {
  material: KpiMaterialDetail | null
  isOpen: boolean
  onClose: () => void
}

export const KpiMaterialDetailModal: React.FC<KpiMaterialDetailModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !material) return null

  const isNegativo = material.saldo_final_t < 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 text-white rounded-lg shadow-xs ${
                isNegativo ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {material.material}
                </span>
                <span className="text-slate-300">•</span>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    material.curva_abc === 'A'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : material.curva_abc === 'B'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  Curva {material.curva_abc}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-100 text-slate-700 border-slate-300 font-semibold"
                >
                  Centro {material.centro}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                {material.material_descricao}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerta de Criticidade / Observação da IA */}
          <div
            className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
              material.status_criticidade === 'Crítico'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : material.status_criticidade === 'Atenção'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <Sparkles className="w-4 h-4 mt-0.5 text-[#004C97] shrink-0" />
            <div className="space-y-1">
              <div className="font-bold uppercase tracking-wider text-[11px] text-[#004C97]">
                Diagnóstico Analítico de IA • PCP Robotizado
              </div>
              <p className="leading-relaxed">
                {material.observacao_ia ||
                  'Saldo operacional apurado em conformidade com o último snapshot diário do mês.'}
              </p>
            </div>
          </div>

          {/* Grid de Informações Chave */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Saldo Final
              </span>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  isNegativo ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {material.saldo_final_t.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                t
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Início:{' '}
                {material.saldo_inicial_t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Permanência Negativa
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {material.dias_negativos} dias
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {material.primeiro_dia_negativo
                  ? `De ${material.primeiro_dia_negativo} a ${material.ultimo_dia_negativo || 'hoje'}`
                  : 'Nenhum dia negativo'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Maior Saldo Negativo
              </span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {material.maior_saldo_negativo_t < 0
                  ? `${material.maior_saldo_negativo_t.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} t`
                  : '0,00 t'}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Pico de déficit no mês
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cancelamentos PCP
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {material.pedidos_cancelados_pcp} pedidos
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {material.toneladas_canceladas_pcp.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                t canceladas
              </span>
            </div>
          </div>

          {/* Detalhamento de Produção & Fábrica */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
              Parâmetros de Produção e Estoque (Posição Fechamento)
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Família</span>
                <span className="font-semibold text-slate-800">{material.familia || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tipo do Material</span>
                <span className="font-semibold text-slate-800">
                  {material.tipo_material || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Linha de Produção</span>
                <span className="font-semibold text-slate-800">{material.linha || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Centro Produtivo</span>
                <span className="font-semibold text-slate-800">{material.centro}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Estoque Físico</span>
                <span className="font-mono font-bold text-slate-800">
                  {material.estoque_t.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Programação Liberada</span>
                <span className="font-mono font-bold text-slate-800">
                  {material.programacao_t.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Produção Realizada</span>
                <span className="font-mono font-bold text-slate-800">
                  {material.producao_t.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Criticidade PCP</span>
                <span
                  className={`font-bold ${
                    material.status_criticidade === 'Crítico'
                      ? 'text-rose-600'
                      : material.status_criticidade === 'Atenção'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {material.status_criticidade}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Origem: Snapshot diário com auditoria imutável via pcpAuditService
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
