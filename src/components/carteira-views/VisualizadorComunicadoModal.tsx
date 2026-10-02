import React, { useState, useEffect } from 'react'
import {
  X,
  FileText,
  Calendar,
  Send,
  User,
  Users,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Shield,
  MessageSquare,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ComunicadoComercialRecord } from '@/types/comercial-comunicado'
import { comercialComunicadoService } from '@/services/comercial-comunicado-service'
import { formatNumberPTBR } from '@/lib/number-format'

interface VisualizadorComunicadoModalProps {
  isOpen: boolean
  onClose: () => void
  identificador: string | null // id ou numero_sequencial
  onVisualizarNoPcp?: (itensIds: string[]) => void
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const clean = dataIso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

export const VisualizadorComunicadoModal: React.FC<VisualizadorComunicadoModalProps> = ({
  isOpen,
  onClose,
  identificador,
  onVisualizarNoPcp,
}) => {
  const [comunicado, setComunicado] = useState<ComunicadoComercialRecord | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
    if (!isOpen || !identificador) return

    let isMounted = true
    setCarregando(true)

    comercialComunicadoService
      .buscarComunicado(identificador)
      .then((res) => {
        if (!isMounted) return
        setComunicado(res)
      })
      .finally(() => {
        if (isMounted) setCarregando(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, identificador])

  if (!isOpen || !identificador) return null

  const itens = comunicado?.itens_relacionados_json || []
  const destinatarios = comunicado?.destinatarios_json || []
  const destinos = comunicado?.destinos_json || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-3xl max-h-[88vh] bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#004C97] uppercase">
                HUB Corporativo • Ambiente Comercial
              </span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-300 text-[10px] font-bold"
              >
                Origem: PCP Robotizado
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  comunicado?.prioridade === 'Crítica'
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : comunicado?.prioridade === 'Atenção'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-blue-50 text-blue-700 border-blue-300'
                }`}
              >
                Prioridade: {comunicado?.prioridade || 'Normal'}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#004C97]" />
              {comunicado?.numero_sequencial || identificador}
            </DialogTitle>
            <p className="text-xs text-slate-600 font-semibold">{comunicado?.assunto}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-slate-800">
          {carregando ? (
            <div className="p-8 text-center text-slate-500">
              Carregando detalhes do comunicado...
            </div>
          ) : !comunicado ? (
            <div className="p-8 text-center text-rose-600">
              Comunicado não encontrado ou indisponível.
            </div>
          ) : (
            <>
              {/* Metadados */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Remetente
                  </span>
                  <span className="font-semibold text-slate-800">{comunicado.remetente_nome}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {comunicado.remetente_email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Canais de Destino
                  </span>
                  <span className="font-semibold text-slate-800">
                    {destinos.includes('COMERCIAL_HUB') && destinos.includes('MEU_DIA')
                      ? 'Comercial – HUB + Meu Dia'
                      : destinos.includes('COMERCIAL_HUB')
                        ? 'Comercial – HUB'
                        : 'Meu Dia'}
                  </span>
                  {comunicado.data_meu_dia && (
                    <span className="text-[10px] text-slate-500 block">
                      Meu Dia agendado: {comunicado.data_meu_dia}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Status
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                  >
                    {comunicado.status}
                  </Badge>
                  {comunicado.foi_aprimorado_ia && (
                    <span className="text-[10px] text-[#004C97] block font-medium pt-0.5">
                      ★ Sintetizado com IA
                    </span>
                  )}
                </div>
              </div>

              {/* Destinatários */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários ({destinatarios.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {destinatarios.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px]"
                    >
                      {d.name} &lt;{d.email}&gt;
                    </span>
                  ))}
                </div>
              </div>

              {/* Mensagem oficial */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#004C97]" />
                  Mensagem Oficial
                </span>
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                  {comunicado.mensagem}
                </div>
              </div>

              {/* Tabela dos Itens Vinculados */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                    Itens Vinculados ao Comunicado ({itens.length})
                  </span>
                  {onVisualizarNoPcp && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onVisualizarNoPcp(itens.map((it) => it.id))}
                      className="text-xs text-[#004C97] hover:bg-blue-50 h-6 gap-1"
                    >
                      Visualizar no PCP
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">Material</th>
                        <th className="py-2 px-2.5">Pedido / Item</th>
                        <th className="py-2 px-2.5 text-right">Saldo a produzir (t)</th>
                        <th className="py-2 px-2.5 text-right">Carteira mínima (t)</th>
                        <th className="py-2 px-2.5 text-center">Data desejada</th>
                        <th className="py-2 px-2.5 text-center">Criticidade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">
                            {it.material}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[#004C97]">
                            {it.pedido_formatado || `${it.pedido_venda} / ${it.item_pedido}`}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-amber-800">
                            {formatNumberPTBR(it.saldo_produzir_tons, 3)} t
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono">
                            {formatNumberPTBR(it.producao_minima_tons, 3)} t
                          </td>
                          <td className="py-1.5 px-2.5 text-center">
                            {formatarDataPtBr(it.data_desejada)}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold">{it.criticidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Registro auditado e integrado ao HUB Corporativo Ciafal.
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
      </DialogContent>
    </Dialog>
  )
}

export default VisualizadorComunicadoModal
