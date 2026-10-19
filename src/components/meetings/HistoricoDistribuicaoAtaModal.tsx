import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  History,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Mail,
  Bell,
  Check,
  X,
} from 'lucide-react'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'
import {
  PcpAtaDistribuicaoRecord,
  PcpAtaDestinatarioEnvioRecord,
  PcpAtaConfirmacaoLeituraRecord,
  IndicadoresHistoricoDistribuicao,
} from '@/types/pcp-ata-distribuicao'
import pcpAtaDistribuicaoService from '@/services/pcp-ata-distribuicao-service'

export interface HistoricoDistribuicaoAtaModalProps {
  isOpen: boolean
  onClose: () => void
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
}

export const HistoricoDistribuicaoAtaModal: React.FC<HistoricoDistribuicaoAtaModalProps> = ({
  isOpen,
  onClose,
  meeting,
  ata,
}) => {
  const [loading, setLoading] = useState(false)
  const [distribuicoes, setDistribuicoes] = useState<PcpAtaDistribuicaoRecord[]>([])
  const [destinatarios, setDestinatarios] = useState<PcpAtaDestinatarioEnvioRecord[]>([])
  const [confirmacoes, setConfirmacoes] = useState<PcpAtaConfirmacaoLeituraRecord[]>([])
  const [indicadores, setIndicadores] = useState<IndicadoresHistoricoDistribuicao>({
    totalDestinatarios: 0,
    enviosBemSucedidos: 0,
    confirmacoesRecebidas: 0,
    pendentesConfirmacao: 0,
    percentualConfirmado: 0,
    totalDistribuicoes: 0,
  })

  // Filtros
  const [filtroCanal, setFiltroCanal] = useState<string>('TODOS')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('TODOS')
  const [buscaDestinatario, setBuscaDestinatario] = useState<string>('')

  const loadData = async () => {
    if (!ata?.id) return
    setLoading(true)
    try {
      const [dists, dests, confs, indics] = await Promise.all([
        pcpAtaDistribuicaoService.listarDistribuicoesAta(ata.id),
        pcpAtaDistribuicaoService.listarDestinatariosEnvioAta(ata.id),
        pcpAtaDistribuicaoService.listarConfirmacoesLeituraAta(ata.id),
        pcpAtaDistribuicaoService.calcularIndicadoresHistorico(ata.id),
      ])

      setDistribuicoes(dists)
      setDestinatarios(dests)
      setConfirmacoes(confs)
      setIndicadores(indics)
    } catch (err) {
      console.warn('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, ata?.id])

  // Filtragem da tabela de destinatários
  const destinatariosFiltrados = destinatarios.filter((d) => {
    const matchCanal = filtroCanal === 'TODOS' || d.canal === filtroCanal

    let matchSituacao = true
    if (filtroSituacao === 'CONFIRMADO') {
      matchSituacao = !!d.confirmado_leitura
    } else if (filtroSituacao === 'PENDENTE') {
      matchSituacao = !d.confirmado_leitura
    }

    const q = buscaDestinatario.toLowerCase()
    const matchBusca =
      !q ||
      d.destinatario_nome.toLowerCase().includes(q) ||
      d.destinatario_email.toLowerCase().includes(q) ||
      (d.setor && d.setor.toLowerCase().includes(q))

    return matchCanal && matchSituacao && matchBusca
  })

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-xl">
        {/* Header */}
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-xs">
                <History className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Histórico de Distribuição &bull; Rastreabilidade e Confirmações
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Registro auditado e imutável de envios (HUB e E-mail) e confirmações de leitura da
                  ATA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {meeting.meeting_code} &bull; V{ata.version}.0
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-8 px-2 text-slate-500 hover:text-slate-900"
                title="Atualizar histórico"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Cards de Indicadores Consolidados */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Total Destinatários
              </span>
              <span className="text-lg font-extrabold font-mono text-slate-900 mt-0.5 block">
                {indicadores.totalDestinatarios}
              </span>
              <span className="text-[10px] text-slate-400">
                {indicadores.totalDistribuicoes} distribuição(ões)
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Envios Bem-Sucedidos
              </span>
              <span className="text-lg font-extrabold font-mono text-blue-900 mt-0.5 block">
                {indicadores.enviosBemSucedidos}
              </span>
              <span className="text-[10px] text-slate-400">Notificados / Enfileirados</span>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
              <span className="text-emerald-800 block text-[10px] uppercase font-bold tracking-wider">
                Confirmações Recebidas
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-900 mt-0.5 block">
                {indicadores.confirmacoesRecebidas}
              </span>
              <span className="text-[10px] text-emerald-700">Evidências auditadas</span>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
              <span className="text-amber-800 block text-[10px] uppercase font-bold tracking-wider">
                Pendentes Leitura
              </span>
              <span className="text-lg font-extrabold font-mono text-amber-900 mt-0.5 block">
                {indicadores.pendentesConfirmacao}
              </span>
              <span className="text-[10px] text-amber-700">Aguardando aceite</span>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-lg">
              <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">
                % Leitura Confirmada
              </span>
              <span className="text-lg font-extrabold font-mono text-white mt-0.5 block">
                {indicadores.percentualConfirmado}%
              </span>
              <span className="text-[10px] text-slate-400">Aderência SGQ</span>
            </div>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={buscaDestinatario}
                onChange={(e) => setBuscaDestinatario(e.target.value)}
                placeholder="Buscar por destinatário, setor..."
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                <Filter className="w-3.5 h-3.5" />
                <span>Canal:</span>
                <select
                  value={filtroCanal}
                  onChange={(e) => setFiltroCanal(e.target.value)}
                  className="text-xs h-8 border border-slate-300 rounded px-2 bg-white font-medium"
                >
                  <option value="TODOS">Todos os canais</option>
                  <option value="HUB">HUB CIAFAL</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                <span>Situação:</span>
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="text-xs h-8 border border-slate-300 rounded px-2 bg-white font-medium"
                >
                  <option value="TODOS">Todas as situações</option>
                  <option value="CONFIRMADO">Leitura Confirmada</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de Destinatários Detalhada */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] block">
              Tabela de Destinatários ({destinatariosFiltrados.length} registros)
            </span>

            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Destinatário</th>
                    <th className="py-2 px-2">Setor</th>
                    <th className="py-2 px-2 text-center">Canal</th>
                    <th className="py-2 px-2">Status do Envio</th>
                    <th className="py-2 px-2 text-center">Confirmação de Leitura</th>
                    <th className="py-2 px-3 text-right">Data / Evidência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#004C97]" />
                        Carregando histórico de distribuição...
                      </td>
                    </tr>
                  ) : destinatariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum envio registrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    destinatariosFiltrados.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3">
                          <strong className="text-slate-900 block font-medium">
                            {item.destinatario_nome}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.destinatario_email}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[9px]">
                            {item.setor || 'Operação'}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            className={`text-[9px] font-bold ${
                              item.canal === 'HUB'
                                ? 'bg-blue-100 text-blue-900 border-blue-200'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {item.canal === 'HUB' ? (
                              <span className="flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" /> HUB
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" /> E-MAIL
                              </span>
                            )}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              item.status_envio === 'LEITURA_CONFIRMADA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status_envio === 'PENDENTE_SMTP'
                                  ? 'bg-amber-100 text-amber-900'
                                  : item.status_envio === 'NOTIFICADO'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status_envio.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {item.confirmado_leitura ? (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-bold gap-1">
                              <Check className="w-2.5 h-2.5" /> CONFIRMADA
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-slate-500 border-dashed"
                            >
                              <Clock className="w-2.5 h-2.5 mr-0.5" /> Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-600">
                          {item.confirmado_em ? (
                            <div>
                              <strong className="text-emerald-700 block">
                                {new Date(item.confirmado_em).toLocaleString('pt-BR')}
                              </strong>
                              <span className="text-[9px] text-slate-400">
                                Via {item.canal_confirmacao || 'HUB'}
                              </span>
                            </div>
                          ) : item.enviado_em ? (
                            <span className="text-slate-400">
                              Enviado em {new Date(item.enviado_em).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Histórico protegido contra exclusão. Conformidade SGQ garantida.</span>
          </div>

          <Button type="button" size="sm" onClick={onClose} className="text-xs h-8">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default HistoricoDistribuicaoAtaModal
