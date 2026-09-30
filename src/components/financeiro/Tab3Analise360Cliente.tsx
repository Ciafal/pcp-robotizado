/**
 * Componente: Tab3Analise360Cliente
 * Módulo: Financeiro / Crédito — Análise 360º do Cliente
 * PCP Robotizado CIAFAL
 *
 * Fornece visão 360º completa do cliente sob ótica financeira e de crédito:
 * - Limite aprovado SAP vs. Tomado vs. Saldo disponível
 * - Títulos em aberto, vencidos e histórico de pontualidade
 * - Status de crédito (Liberado / Em Análise / Bloqueado por Crédito)
 * - Indicadores de risco e parecer de governança para liberação de OPs
 */

import React, { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  DollarSign,
  AlertCircle,
  FileText,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyPtBr } from '@/lib/formatters-ptbr'

export interface ClienteCredito360 {
  codigo: string
  nome: string
  cnpj: string
  curvaAbc: 'A' | 'B' | 'C'
  limiteAprovado: number
  creditoUtilizado: number
  saldoDisponivel: number
  titulosVencidos: number
  titulosAVencer: number
  diasMedioAtraso: number
  scoreRisco: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  statusCredito: 'LIBERADO' | 'EM_ANALISE' | 'BLOQUEADO'
  ordensImpactadas: string[]
  motivoBloqueio?: string
  dataUltimaRevisao: string
}

export interface Tab3Analise360ClienteProps {
  clienteId?: string
  clienteSelecionado?: ClienteCredito360
  onClienteChange?: (cliente: ClienteCredito360) => void
  onSolicitarRevisaoCredito?: (cliente: ClienteCredito360, justificativa: string) => void
}

const CLIENTES_MOCK: ClienteCredito360[] = [
  {
    codigo: 'CLI-001042',
    nome: 'Metalúrgica São Jorge Ltda',
    cnpj: '12.345.678/0001-90',
    curvaAbc: 'A',
    limiteAprovado: 2500000,
    creditoUtilizado: 2680000,
    saldoDisponivel: -180000,
    titulosVencidos: 145000,
    titulosAVencer: 1250000,
    diasMedioAtraso: 14,
    scoreRisco: 'CRITICO',
    statusCredito: 'BLOQUEADO',
    ordensImpactadas: ['OP-2026-1011', 'OP-2026-1045'],
    motivoBloqueio: 'Excesso de limite de crédito (R$ -180.000) e 2 títulos vencidos > 10 dias.',
    dataUltimaRevisao: '28/09/2026',
  },
  {
    codigo: 'CLI-000854',
    nome: 'Estruturas Metálicas Brasil S.A.',
    cnpj: '98.765.432/0001-10',
    curvaAbc: 'A',
    limiteAprovado: 5000000,
    creditoUtilizado: 3200000,
    saldoDisponivel: 1800000,
    titulosVencidos: 0,
    titulosAVencer: 1950000,
    diasMedioAtraso: 0,
    scoreRisco: 'BAIXO',
    statusCredito: 'LIBERADO',
    ordensImpactadas: [],
    dataUltimaRevisao: '15/09/2026',
  },
  {
    codigo: 'CLI-001290',
    nome: 'Comércio de Ferros Centro-Oeste',
    cnpj: '45.123.789/0002-45',
    curvaAbc: 'B',
    limiteAprovado: 800000,
    creditoUtilizado: 790000,
    saldoDisponivel: 10000,
    titulosVencidos: 25000,
    titulosAVencer: 310000,
    diasMedioAtraso: 5,
    scoreRisco: 'MEDIO',
    statusCredito: 'EM_ANALISE',
    ordensImpactadas: ['OP-2026-1088'],
    motivoBloqueio: 'Limite próximo da saturação (98,7% tomado). Título em prorrogação bancária.',
    dataUltimaRevisao: '22/09/2026',
  },
]

export function Tab3Analise360Cliente({
  clienteId,
  clienteSelecionado: clienteProp,
  onClienteChange,
  onSolicitarRevisaoCredito,
}: Tab3Analise360ClienteProps) {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('ALL')
  const [clienteAtual, setClienteAtual] = useState<ClienteCredito360>(
    clienteProp || CLIENTES_MOCK.find((c) => c.codigo === clienteId) || CLIENTES_MOCK[0],
  )
  const [justificativa, setJustificativa] = useState('')
  const [enviandoRevisao, setEnviandoRevisao] = useState(false)

  const clientesFiltrados = CLIENTES_MOCK.filter((c) => {
    if (filtroStatus !== 'ALL' && c.statusCredito !== filtroStatus) return false
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.codigo.toLowerCase().includes(termo) ||
      c.cnpj.includes(termo)
    )
  })

  const handleSelecionarCliente = (c: ClienteCredito360) => {
    setClienteAtual(c)
    if (onClienteChange) onClienteChange(c)
  }

  const handleEnviarRevisao = () => {
    if (!justificativa.trim()) return
    setEnviandoRevisao(true)
    setTimeout(() => {
      if (onSolicitarRevisaoCredito) {
        onSolicitarRevisaoCredito(clienteAtual, justificativa)
      }
      setJustificativa('')
      setEnviandoRevisao(false)
    }, 600)
  }

  const isBloqueado = clienteAtual.statusCredito === 'BLOQUEADO'
  const isEmAnalise = clienteAtual.statusCredito === 'EM_ANALISE'
  const isLiberado = clienteAtual.statusCredito === 'LIBERADO'

  const percentualTomado =
    clienteAtual.limiteAprovado > 0
      ? Math.min(100, (clienteAtual.creditoUtilizado / clienteAtual.limiteAprovado) * 100)
      : 0

  return (
    <div className="space-y-4" data-testid="tab3-analise-360-cliente">
      {/* Cabeçalho da Aba 360 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              Análise 360º de Crédito & Impacto na Produção (PCP)
            </h2>
            <Badge className="bg-blue-100 text-[#004C97] border-[#004C97]/20 text-[10px] font-bold">
              Financeiro / Crédito
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruzamento entre limite financeiro aprovado no SAP ECC e ordens programadas na fábrica.
          </p>
        </div>

        {/* Status Consolidado do Cliente Ativo */}
        <div className="flex items-center gap-2">
          {isBloqueado && (
            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold gap-1 px-2.5 py-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Bloqueio Financeiro Ativo
            </Badge>
          )}
          {isEmAnalise && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold gap-1 px-2.5 py-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Crédito em Análise
            </Badge>
          )}
          {isLiberado && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold gap-1 px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Crédito Regular
            </Badge>
          )}
        </div>
      </div>

      {/* Grid: Lista de Clientes e Detalhe 360 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1: Seletor de Clientes */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="p-3 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Clientes Monitorados</span>
              <Badge variant="outline" className="text-[10px]">
                {clientesFiltrados.length}
              </Badge>
            </CardTitle>
            <div className="pt-2 space-y-2">
              <div className="relative">
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por cliente ou CNPJ..."
                  className="text-xs h-8 pl-7 bg-slate-50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full text-xs p-1 rounded border border-slate-300 bg-slate-50 text-slate-700"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="BLOQUEADO">Bloqueados por Crédito</option>
                  <option value="EM_ANALISE">Em Análise</option>
                  <option value="LIBERADO">Liberados</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
            {clientesFiltrados.map((cli) => {
              const isSelected = cli.codigo === clienteAtual.codigo
              return (
                <button
                  key={cli.codigo}
                  type="button"
                  onClick={() => handleSelecionarCliente(cli)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'border-[#004C97] bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-900 truncate block">{cli.nome}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 shrink-0 font-bold ${
                        cli.curvaAbc === 'A'
                          ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      Curva {cli.curvaAbc}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{cli.codigo}</span>
                    <span
                      className={`font-semibold ${
                        cli.statusCredito === 'BLOQUEADO'
                          ? 'text-rose-600'
                          : cli.statusCredito === 'EM_ANALISE'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {cli.statusCredito}
                    </span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Coluna 2 e 3: Análise Detalhada 360 do Cliente Selecionado */}
        <div className="lg:col-span-2 space-y-4">
          {/* Alerta de Bloqueio com ShieldAlert se Bloqueado */}
          {isBloqueado && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg text-rose-950 flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Bloqueio Ativo no Fluxo de Ordens</span>
                  <Badge className="bg-rose-600 text-white text-[10px]">
                    {clienteAtual.ordensImpactadas.length} OPs Retidas
                  </Badge>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {clienteAtual.motivoBloqueio ||
                    'Limite de crédito excedido no SAP ECC. As ordens associadas a este cliente não devem ser sequenciadas para laminação sem aprovação formal do Financeiro.'}
                </p>
                {clienteAtual.ordensImpactadas.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-slate-600 font-medium">Ordens com trava:</span>
                    {clienteAtual.ordensImpactadas.map((op) => (
                      <span
                        key={op}
                        className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-800 font-bold"
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cards de Métricas Financeiras */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-white border-slate-200 p-3 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Limite Aprovado
              </span>
              <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                {formatCurrencyPtBr(clienteAtual.limiteAprovado)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Rev. {clienteAtual.dataUltimaRevisao}
              </span>
            </Card>

            <Card className="bg-white border-slate-200 p-3 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Crédito Utilizado
              </span>
              <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                {formatCurrencyPtBr(clienteAtual.creditoUtilizado)}
              </span>
              <span className="text-[10px] text-indigo-600 block mt-0.5 font-semibold">
                {percentualTomado.toFixed(1)}% do limite
              </span>
            </Card>

            <Card className="bg-white border-slate-200 p-3 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Saldo Disponível
              </span>
              <span
                className={`text-base font-black font-mono mt-1 block ${
                  clienteAtual.saldoDisponivel < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrencyPtBr(clienteAtual.saldoDisponivel)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {clienteAtual.saldoDisponivel < 0 ? 'Déficit de garantia' : 'Margem operacional'}
              </span>
            </Card>

            <Card className="bg-white border-slate-200 p-3 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Títulos Vencidos
              </span>
              <span
                className={`text-base font-black font-mono mt-1 block ${
                  clienteAtual.titulosVencidos > 0 ? 'text-rose-600' : 'text-slate-800'
                }`}
              >
                {formatCurrencyPtBr(clienteAtual.titulosVencidos)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Atraso médio: {clienteAtual.diasMedioAtraso} dias
              </span>
            </Card>
          </div>

          {/* Seção de Solicitação de Revisão / Liberação Emergencial de Crédito */}
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <FileText className="w-4 h-4 text-[#004C97]" />
              Parecer Financeiro & Solicitação de Liberação para PCP
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mb-3">
              Caso o lote de produção seja urgente (ex: parada de linha em cliente ou entrega
              contratual), solicite reavaliação expressa à Gerência de Crédito.
            </CardDescription>

            <div className="space-y-2">
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva a justificativa industrial/comercial para liberação excepcional ou aumento temporário de limite..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97] bg-slate-50"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Rastreabilidade gravada com protocolo oficial de auditoria.
                </span>
                <Button
                  size="sm"
                  onClick={handleEnviarRevisao}
                  disabled={!justificativa.trim() || enviandoRevisao}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1 ${enviandoRevisao ? 'animate-spin' : ''}`}
                  />
                  {enviandoRevisao ? 'Enviando ao Financeiro...' : 'Solicitar Liberação'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Tab3Analise360Cliente
