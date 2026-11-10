import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  AlertTriangle,
  Inbox,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import industrializerReportSendingsService, {
  type ReportSendingRecord,
  type ReportSendingsFilter,
} from '@/services/industrializer-report-sendings-service'
import { DetalhesEnvioModal } from '@/components/gestao-industrializador/DetalhesEnvioModal'
import { RelatoriosEmailFiltrosBar } from '@/components/gestao-industrializador/RelatoriosEmailFiltrosBar'

export const RelatoriosEmailPage: React.FC = () => {
  const [allRecords, setAllRecords] = useState<ReportSendingRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<ReportSendingRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<boolean>(false)

  const [filters, setFilters] = useState<ReportSendingsFilter>({
    channel: 'TODOS',
    screenKey: 'TODAS',
    status: 'TODOS',
    search: '',
    dateFrom: '',
    dateTo: '',
  })

  // Carrega os dados reais do backend
  const loadRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await industrializerReportSendingsService.getSendings({})
      setAllRecords(data)
    } catch (err: any) {
      console.error('Erro ao carregar relatórios de envio:', err)
      setError(
        'Não foi possível carregar o histórico de envios do servidor. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  // Aplica filtros em memória de forma reativa
  const filteredRecords = useMemo(() => {
    return industrializerReportSendingsService.applyFilters(allRecords, filters)
  }, [allRecords, filters])

  // KPIs calculados
  const kpis = useMemo(() => {
    return industrializerReportSendingsService.calculateKpis(filteredRecords)
  }, [filteredRecords])

  const handleOpenDetail = (record: ReportSendingRecord) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  const handleResetFilters = () => {
    setFilters({
      channel: 'TODOS',
      screenKey: 'TODAS',
      status: 'TODOS',
      search: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. Cabeçalho da Página no Padrão Ciafal #004C97 */}
      <div className="bg-white border-l-4 border-l-[#004C97] border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#004C97]/10 text-[#004C97] rounded-md">
                <Mail className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#004C97]">
                PCP Robotizado • Gestão Industrializador
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Relatórios de E-mail e Hub
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl">
              Histórico consolidado dos relatórios enviados por e-mail e publicados no HUB
              corporativo a partir das telas de Gestão de MP, Análise de Carteira e Sequenciamento P
              x R.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              disabled={loading}
              className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Cards de KPIs Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase">
                Total de Envios
              </span>
              <p className="text-xl font-bold text-slate-800">{kpis.total}</p>
            </div>
            <div className="p-2 bg-slate-100 text-[#004C97] rounded-lg">
              <Inbox className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Via E-mail</span>
              <p className="text-xl font-bold text-slate-800">{kpis.emails}</p>
            </div>
            <div className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase">
                Publicados no HUB
              </span>
              <p className="text-xl font-bold text-slate-800">{kpis.hub}</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase">
                Taxa de Sucesso
              </span>
              <p className="text-xl font-bold text-emerald-600">{kpis.successRatePct}%</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra de Filtros */}
      <RelatoriosEmailFiltrosBar
        filters={filters}
        onChangeFilters={setFilters}
        onReset={handleResetFilters}
        totalRecords={allRecords.length}
        filteredRecords={filteredRecords.length}
      />

      {/* 4. Tratamento de Erro Amigável (Não derruba a página, padrão Programação de Parada) */}
      {error && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900">
                  Falha ao consultar histórico de envios
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              className="text-xs border-rose-300 bg-white text-rose-800 hover:bg-rose-100 flex items-center gap-1.5 h-8 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 5. Tabela / Lista de Envios */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#004C97] animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Carregando histórico de relatórios e envios...
              </p>
              <p className="text-xs text-slate-400">
                Consultando registros de envios reais no banco de dados
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            /* Estado Vazio Amigável */
            <div className="p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Nenhum envio encontrado</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {allRecords.length === 0
                  ? 'Ainda não foram realizados disparos de e-mail ou publicações no HUB a partir das telas de Gestão Industrializador. Utilize os botões "Enviar e-mail" ou "Enviar Hub" para gerar os primeiros registros.'
                  : 'Nenhum envio corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca ou limpar os filtros.'}
              </p>
              {allRecords.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Limpar filtros aplicados
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Tela de Origem</th>
                    <th className="py-3 px-4">Assunto / Descrição</th>
                    <th className="py-3 px-4">Destinatários</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">Data e Hora</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.map((item) => {
                    const isEmail = item.channel === 'EMAIL'
                    const isSuccess = item.status === 'SUCESSO'

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => handleOpenDetail(item)}
                      >
                        {/* Canal */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="secondary"
                            className={
                              isEmail
                                ? 'bg-blue-50 text-[#004C97] border border-blue-200 flex items-center gap-1 w-fit font-semibold'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit font-semibold'
                            }
                          >
                            {isEmail ? (
                              <>
                                <Mail className="w-3 h-3" />
                                <span>E-mail</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>HUB</span>
                              </>
                            )}
                          </Badge>
                        </td>

                        {/* Tela de origem */}
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                          {item.screen_name}
                        </td>

                        {/* Assunto */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-800 truncate group-hover:text-[#004C97] transition-colors">
                            {item.subject}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {item.sending_code}
                          </p>
                        </td>

                        {/* Destinatários */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="truncate text-slate-600" title={item.recipients_text}>
                            {item.recipients_text}
                          </p>
                          {item.recipients.length > 1 && (
                            <span className="text-[10px] text-slate-400">
                              +{item.recipients.length - 1} destinatário(s)
                            </span>
                          )}
                        </td>

                        {/* Usuário Responsável */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-medium text-slate-800">{item.sender_user_name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {item.sender_user_email}
                          </p>
                        </td>

                        {/* Data / Hora */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                          {item.sent_at_formatted}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <Badge
                            className={
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-300 text-[11px] font-semibold inline-flex items-center gap-1'
                            }
                          >
                            {isSuccess ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Sucesso</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Falha</span>
                              </>
                            )}
                          </Badge>
                        </td>

                        {/* Ação */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#004C97] hover:text-[#003870] hover:bg-blue-50 px-2 font-medium inline-flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail(item)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detalhes</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Modal de Detalhes do Envio */}
      <DetalhesEnvioModal open={modalOpen} onOpenChange={setModalOpen} record={selectedRecord} />
    </div>
  )
}

export default RelatoriosEmailPage
