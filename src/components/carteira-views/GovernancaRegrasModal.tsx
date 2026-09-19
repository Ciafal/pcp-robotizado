import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, Sliders, Shield, Save, Calendar, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { REGRAS_PADRAO, RegrasParametrizadas } from '@/services/carteira-engine'
import { CoberturaTemporalEngine, MetodoCalendario } from '@/services/cobertura-temporal-engine'

interface GovernancaRegrasModalProps {
  isOpen: boolean
  onClose: () => void
  onSalvarRegras: (regrasAtualizadas: RegrasParametrizadas) => void
}

export const GovernancaRegrasModal: React.FC<GovernancaRegrasModalProps> = ({
  isOpen,
  onClose,
  onSalvarRegras,
}) => {
  const { toast } = useToast()
  const [regras, setRegras] = useState<RegrasParametrizadas>(REGRAS_PADRAO)
  const [justificativa, setJustificativa] = useState('')

  // Parâmetros corporativos centrais do motor de cobertura temporal
  const paramsGlobais = CoberturaTemporalEngine.getParametrosGlobais()
  const [periodoFaturamento, setPeriodoFaturamento] = useState<30 | 60 | 90 | 180>(
    paramsGlobais.periodoDiasHistorico,
  )
  const [metodoCalendario, setMetodoCalendario] = useState<MetodoCalendario>(
    paramsGlobais.metodoCalendario,
  )
  const [limiteAtencao, setLimiteAtencao] = useState<number>(paramsGlobais.limiteAtencaoDias)
  const [limiteCritico, setLimiteCritico] = useState<number>(paramsGlobais.limiteCriticoDias)
  const [considerarQualidade, setConsiderarQualidade] = useState<boolean>(
    paramsGlobais.considerarEstoqueQualidade,
  )
  const [considerarBloqueado, setConsiderarBloqueado] = useState<boolean>(
    paramsGlobais.considerarEstoqueBloqueado,
  )

  const handleSalvar = () => {
    if (!justificativa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description:
          'É mandatório informar o motivo da alteração das regras de cálculo para auditoria.',
      })
      return
    }

    // Atualiza parâmetros corporativos para todas as 7 carteiras
    CoberturaTemporalEngine.setParametrosGlobais({
      periodoDiasHistorico: periodoFaturamento,
      metodoCalendario,
      limiteAtencaoDias: limiteAtencao,
      limiteCriticoDias: limiteCritico,
      considerarEstoqueQualidade: considerarQualidade,
      considerarEstoqueBloqueado: considerarBloqueado,
    })

    onSalvarRegras(regras)
    toast({
      title: 'Regras de Cálculo & Parâmetros Atualizados',
      description:
        'Nova versão das regras e parâmetros corporativos de cobertura temporal registrados.',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="modal-analitico w-[min(96vw,1800px)] max-w-[min(96vw,1800px)] h-[94vh] max-h-[94vh] 2xl:h-[min(94vh,1100px)] 2xl:max-h-[min(94vh,1100px)] bg-white border-slate-200 text-slate-900 shadow-xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Governança & Parametrização do Motor de Regras
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Parametrize classificações, janelas de tolerância e regras de negócio com
                versionamento auditável.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* Seção 1: Parâmetros Corporativos de Cobertura Temporal */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004C97] flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-[#004C97]" /> Parâmetros Corporativos: Cobertura
                Temporal & Previsão
              </span>
              <Badge className="bg-[#004C97] text-white text-[10px]">
                Central PCP (7 Carteiras)
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600">
              Padronização obrigatória em todas as carteiras (Geral, L1, L2, MTO, Revenda, Importado
              e SDC).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Período Histórico da Média:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {([30, 60, 90, 180] as const).map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => setPeriodoFaturamento(dias)}
                      className={`py-1 text-xs font-semibold rounded border transition-colors ${
                        periodoFaturamento === dias
                          ? 'bg-[#004C97] text-white border-[#004C97]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {dias} dias
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Método de Calendário:
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setMetodoCalendario('DIAS_CORRIDOS')}
                    className={`py-1 px-1.5 text-xs font-semibold rounded border transition-colors ${
                      metodoCalendario === 'DIAS_CORRIDOS'
                        ? 'bg-[#004C97] text-white border-[#004C97]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Dias Corridos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoCalendario('CALENDARIO_OPERACIONAL')}
                    className={`py-1 px-1.5 text-xs font-semibold rounded border transition-colors ${
                      metodoCalendario === 'CALENDARIO_OPERACIONAL'
                        ? 'bg-[#004C97] text-white border-[#004C97]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Calendário Útil
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Limiar Alerta Atenção (dias):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={limiteAtencao}
                    onChange={(e) => setLimiteAtencao(Math.max(1, parseInt(e.target.value) || 5))}
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-amber-700 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">dias de cobertura residual</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Limiar Alerta Crítico (dias):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={limiteCritico}
                    onChange={(e) => setLimiteCritico(Math.max(0, parseInt(e.target.value) || 2))}
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-rose-700 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">dias antes da ruptura</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <span className="text-[11px] text-slate-700 font-medium">
                  Considerar Estoque Qualidade?
                </span>
                <button
                  type="button"
                  onClick={() => setConsiderarQualidade(!considerarQualidade)}
                  className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                    considerarQualidade
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {considerarQualidade ? 'SIM' : 'NÃO (Padrão)'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <span className="text-[11px] text-slate-700 font-medium">
                  Considerar Estoque Bloqueado?
                </span>
                <button
                  type="button"
                  onClick={() => setConsiderarBloqueado(!considerarBloqueado)}
                  className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                    considerarBloqueado
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {considerarBloqueado ? 'SIM' : 'NÃO (Padrão)'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#004C97]" /> Janela de Alerta de Ruptura (Dias
                Amarelo Clássico)
              </span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {regras.amareloDiasRuptura} dias
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Intervalo de dias entre o término estimado do estoque e a produção programada para
              acionar status Amarelo.
            </p>
            <input
              type="range"
              min="1"
              max="30"
              value={regras.amareloDiasRuptura}
              onChange={(e) =>
                setRegras({ ...regras, amareloDiasRuptura: parseInt(e.target.value) || 7 })
              }
              className="w-full accent-[#004C97]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Prefixos Linha L1 (Parametrizáveis)
              </span>
              <div className="space-y-1">
                {Object.entries(regras.prefixosL1).map(([pref, data]) => (
                  <div
                    key={pref}
                    className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-mono font-bold text-[#004C97]">{pref}</span>
                    <span className="text-slate-600">
                      {data.descricao} ({data.familia})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">
                Prefixos Linha L2 (Parametrizáveis)
              </span>
              <div className="space-y-1">
                {Object.entries(regras.prefixosL2).map(([pref, data]) => (
                  <div
                    key={pref}
                    className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-[11px]"
                  >
                    <span className="font-mono font-bold text-[#004C97]">{pref}</span>
                    <span className="text-slate-600">
                      {data.descricao} ({data.familia})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004C97] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#004C97]" /> Justificativa Obrigatória de
                Governança
              </span>
              <Badge className="bg-slate-200 text-slate-800 text-[10px]">
                Auditado pelo AD/PCP
              </Badge>
            </div>

            <textarea
              rows={2}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a razão técnica para alteração das tolerâncias ou regras..."
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSalvar}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Salvar & Publicar Nova Versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default GovernancaRegrasModal
