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
import { AlertaCarteiraSDC } from '@/types/carteira-sdc'
import {
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Factory,
  CheckCircle2,
  FileSearch,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface AnalisarImpactoSDCModalProps {
  isOpen: boolean
  onClose: () => void
  alerta: AlertaCarteiraSDC | null
  onAssumirTratamento?: (alertaId: string) => void
}

export const AnalisarImpactoSDCModal: React.FC<AnalisarImpactoSDCModalProps> = ({
  isOpen,
  onClose,
  alerta,
  onAssumirTratamento,
}) => {
  if (!alerta) return null

  const deficitAtualAbs = Math.abs(alerta.saldo_atual).toFixed(2).replace('.', ',')
  const programadoAbs = alerta.quantidade_programada.toFixed(2).replace('.', ',')
  const deficitResidualAbs = Math.abs(alerta.saldo_projetado).toFixed(2).replace('.', ',')
  const temResidual = alerta.saldo_projetado < 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden shadow-2xl border-slate-200">
        <DialogHeader className="bg-gradient-to-r from-rose-50 via-white to-slate-50 border-b border-rose-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-black text-slate-900 tracking-tight">
                    Análise de Impacto &bull; Carteira SDC
                  </DialogTitle>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                    {alerta.severidade}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {alerta.empresa_centro}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Material: <strong className="text-slate-800 font-mono">{alerta.material}</strong>{' '}
                  &bull; {alerta.descricao}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 6 Blocos Exatos Exigidos:
            1. Situação (déficit atual)
            2. Programação existente (quantidade + data)
            3. Déficit residual
            4. Carteira afetada
            5. Impactos possíveis (atendimento, capacidade, programação, industrialização)
            6. Próximas verificações (sem alterar programação)
        */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Grid dos 4 Primeiros Blocos Numéricos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Bloco 1: Situação (Déficit Atual) */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">
                1. Situação (Déficit Atual)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong className="text-xl font-bold font-mono text-rose-700">
                  -{deficitAtualAbs}
                </strong>
                <span className="text-xs font-semibold text-rose-600">t</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Estoque: {alerta.estoque.toFixed(2).replace('.', ',')} t
              </span>
            </div>

            {/* Bloco 2: Programação Existente */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                2. Programação Existente
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong className="text-xl font-bold font-mono text-[#004C97]">
                  {programadoAbs}
                </strong>
                <span className="text-xs font-semibold text-[#004C97]">t</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Previsão:{' '}
                <strong className="text-slate-700">
                  {alerta.data_prevista || 'Não informada'}
                </strong>
              </span>
            </div>

            {/* Bloco 3: Déficit Residual */}
            <div
              className={`rounded-xl p-3 border ${
                temResidual
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-bold block ${
                  temResidual ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                3. Déficit Residual
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-xl font-bold font-mono ${
                    temResidual ? 'text-amber-800' : 'text-emerald-700'
                  }`}
                >
                  {alerta.saldo_projetado >= 0 ? `+0,00` : `-${deficitResidualAbs}`}
                </strong>
                <span className="text-xs font-semibold">t</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {temResidual ? 'Necessita complemento' : 'Cobertura integral projetada'}
              </span>
            </div>

            {/* Bloco 4: Carteira Afetada */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                4. Carteira Afetada
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong className="text-xl font-bold font-mono text-slate-900">
                  {Math.abs(alerta.saldo_atual - alerta.estoque)
                    .toFixed(2)
                    .replace('.', ',')}
                </strong>
                <span className="text-xs font-semibold text-slate-600">t</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Desejada: {alerta.data_desejada || 'A combinar'}
              </span>
            </div>
          </div>

          {/* Bloco 5: Impactos Possíveis */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Factory className="w-4 h-4 text-[#004C97]" /> 5. Impactos Possíveis Avaliados
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">
                  &bull; Atendimento Comercial / OTIF:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Risco de inadimplência de prazo na entrega de pedidos para o centro SDPL. Saldo
                  negativo não permite faturamento imediato.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">
                  &bull; Capacidade Fabril & Linhas:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Necessidade de alocação de campanha na linha compatível (Laminação ou
                  Perfiladeira) sem violar lotes mínimos e regras de setup.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">
                  &bull; Programação PCP:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Ajuste na sequência semanal para encaixe do lote de {deficitAtualAbs} t na esteira
                  produtiva antes da data crítica.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">
                  &bull; Industrialização SDC:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Verificar disponibilidade de matéria-prima (tarugos/perfil) e capacidade na
                  Sidercentro ou viabilidade de fornecimento via CIAFAL.
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 6: Próximas Verificações */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-[#004C97] uppercase tracking-wider flex items-center gap-1.5">
              <FileSearch className="w-4 h-4 text-[#004C97]" /> 6. Próximas Verificações
              Recomendadas (Sem Alterar Programação)
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Consultar ordens de venda vinculadas na tela de detalhamento do material
                  (OV-450891, OV-450912).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Verificar estoque de matéria-prima para laminação no centro SDPL (módulo MP
                  Sidercentro).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Alinhar com o programador fabril se o lote mínimo de produção comporta a demanda
                  de {deficitAtualAbs} t.
                </span>
              </li>
            </ul>
            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-blue-100">
              * Nota de Governança: Esta análise é puramente consultiva e não realiza alterações
              automáticas em ordens de produção ou cadastros mestres.
            </p>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 text-xs h-8"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            {onAssumirTratamento && alerta.status !== 'Em tratamento' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onAssumirTratamento(alerta.id)
                  onClose()
                }}
                className="border-blue-300 text-[#004C97] hover:bg-blue-50 text-xs font-semibold h-8"
              >
                Assumir Tratamento
              </Button>
            )}

            <Button
              type="button"
              asChild
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-sm"
            >
              <Link to={alerta.link_detalhamento}>
                Ver Análise na Carteira SDC <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default AnalisarImpactoSDCModal
