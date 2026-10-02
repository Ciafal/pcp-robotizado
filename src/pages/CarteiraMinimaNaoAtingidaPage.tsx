import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  FileText,
  Clock,
  Sparkles,
  Info,
  ServerOff,
  CheckCircle2,
  Database,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { carteiraMinimaService } from '@/services/carteira-minima-service'
import { CarteiraMinimaCards } from '@/components/carteira-views/CarteiraMinimaCards'
import { CarteiraMinimaFilterBar } from '@/components/carteira-views/CarteiraMinimaFilterBar'
import { CarteiraMinimaTable } from '@/components/carteira-views/CarteiraMinimaTable'
import { CarteiraMinimaDetailModal } from '@/components/carteira-views/CarteiraMinimaDetailModal'
import { CarteiraMinimaPdfModal } from '@/components/carteira-views/CarteiraMinimaPdfModal'
import { formatNumberPTBR } from '@/lib/number-format'

export const CarteiraMinimaNaoAtingidaPage: React.FC = () => {
  // Estados principais
  const [todosItens, setTodosItens] = useState<CarteiraMinimaItem[]>([])
  const [carregando, setCarregando] = useState<boolean>(true)
  const [atualizandoSap, setAtualizandoSap] = useState<boolean>(false)
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null)
  const [ultimaAtualizacaoSap, setUltimaAtualizacaoSap] = useState<string | null>(null)
  const [isFcaPendente, setIsFcaPendente] = useState<boolean>(true)

  // Filtros
  const [filtros, setFiltros] = useState<CarteiraMinimaFilterParams>({
    criticidade: 'TODAS',
  })

  // Modais
  const [itemSelecionado, setItemSelecionado] = useState<CarteiraMinimaItem | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false)

  // Carregamento de dados inicial
  const carregarDados = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setAtualizandoSap(true)
    } else {
      setCarregando(true)
    }
    setErroSincronizacao(null)

    try {
      const res = await carteiraMinimaService.sincronizarComSap()

      if (res.success) {
        setTodosItens(res.itens)
        setUltimaAtualizacaoSap(res.ultimaAtualizacaoSap)
        setIsFcaPendente(!res.fcaConfigured)
      } else {
        // Falha no SAP: mantém últimos dados e exibe o aviso específico da especificação
        setTodosItens(res.itens)
        setUltimaAtualizacaoSap(res.ultimaAtualizacaoSap)
        setErroSincronizacao(res.statusMessage)
      }
    } catch (err: any) {
      console.error('[CarteiraMinimaPage] Erro ao carregar dados:', err)
      setErroSincronizacao(
        'Não foi possível atualizar os dados do SAP. Os últimos dados disponíveis continuam sendo exibidos.',
      )
    } finally {
      setCarregando(false)
      setAtualizandoSap(false)
    }
  }, [])

  useEffect(() => {
    carregarDados(false)
  }, [carregarDados])

  // Manipulação de Filtros
  const handleMudarFiltro = useCallback((novos: Partial<CarteiraMinimaFilterParams>) => {
    setFiltros((prev) => ({ ...prev, ...novos }))
  }, [])

  const handleLimparFiltros = useCallback(() => {
    setFiltros({ criticidade: 'TODAS' })
  }, [])

  // Itens filtrados e Totalizadores recalculados
  const itensFiltrados = useMemo(() => {
    return carteiraMinimaService.filtrarItens(todosItens, filtros)
  }, [todosItens, filtros])

  const totalizadores = useMemo(() => {
    return carteiraMinimaService.calcularTotalizadores(itensFiltrados)
  }, [itensFiltrados])

  // Abertura de Relatório PDF com auditoria
  const handleAbrirPdf = useCallback(() => {
    carteiraMinimaService.registrarAuditoriaPdf({
      filtros,
      totalItens: itensFiltrados.length,
      totalCarteiraTons: totalizadores.carteira_total_tons,
      totalSaldoTons: totalizadores.saldo_total_produzir_tons,
    })
    setIsPdfModalOpen(true)
  }, [filtros, itensFiltrados.length, totalizadores])

  // Data formatada para "Última atualização SAP: dd/mm/aaaa HH:mm"
  const ultimaAtualizacaoFormatada = useMemo(() => {
    if (!ultimaAtualizacaoSap) return null
    try {
      const d = new Date(ultimaAtualizacaoSap)
      const dataStr = d.toLocaleDateString('pt-BR')
      const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `${dataStr} ${horaStr}`
    } catch {
      return null
    }
  }, [ultimaAtualizacaoSap])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-[#004C97] uppercase">
              PCP Robotizado • Análise de Carteira
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#004C97] border border-blue-200">
              <Sparkles className="w-3 h-3 text-[#004C97]" />
              IA + SAP FCA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Carteira Mínima Não Atingida
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-4xl">
            Identificação automática de materiais com saldo a produzir inferior ao lote mínimo
            industrial de produção ou laminação. Cálculo estrito:{' '}
            <strong>Saldo a Produzir = Carteira − Estoque Livre</strong>.
          </p>
        </div>

        {/* Status de Conexão SAP e Botão de Ação */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-mono font-medium bg-slate-50 text-slate-700 border-slate-300"
            >
              <Database className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
              {ultimaAtualizacaoFormatada
                ? `Última atualização SAP: ${ultimaAtualizacaoFormatada}`
                : 'Última atualização SAP: aguardando sincronização'}
            </Badge>
          </div>

          <span className="text-[11px] text-slate-500">
            Interface RFC: <code>Z_RFC_CARTEIRA_MINIMA_PROD</code> (FCA SAP)
          </span>
        </div>
      </div>

      {/* 2. AVISO DE ERRO DE SINCRONIZAÇÃO (Se a consulta falhar, mantém dados e exibe aviso exigido) */}
      {erroSincronizacao && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-sm">Aviso de Sincronização SAP</span>
            <p>{erroSincronizacao}</p>
          </div>
        </div>
      )}

      {/* 3. AVISO TÉCNICO DE INTEGRAÇÃO PENDENTE (Se a RFC ainda não estiver ativa na ponta SAP PRD) */}
      {isFcaPendente && todosItens.length === 0 && !carregando && (
        <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-blue-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-[#004C97] rounded-lg shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-sm block text-blue-900">
                Integração SAP FCA Catalogada • Interface RFC Z_RFC_CARTEIRA_MINIMA_PROD
              </span>
              <p className="text-blue-800 leading-relaxed max-w-3xl">
                O submódulo está plenamente conectado ao catálogo de integrações e ao serviço de
                auditoria. Para receber a carga direta em tempo real, a credencial{' '}
                <code>SAP_FCA_BASE_URL</code> deve ser apontada pela equipe de infraestrutura.
                Conforme diretriz de governança, nenhum dado fictício é injetado para simular
                operação.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => carregarDados(true)}
              disabled={atualizandoSap}
              className="text-xs h-8 bg-white border-blue-300 text-blue-900 hover:bg-blue-100 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${atualizandoSap ? 'animate-spin' : ''}`} />
              Verificar Conexão SAP
            </Button>
          </div>
        </div>
      )}

      {/* 4. TOTALIZADORES COMPACTOS (Cards padronizados com formatação pt-BR) */}
      <CarteiraMinimaCards
        totalizadores={totalizadores}
        carregando={carregando || atualizandoSap}
      />

      {/* 5. BARRA DE FILTROS E AÇÕES */}
      <CarteiraMinimaFilterBar
        filtros={filtros}
        aoMudarFiltro={handleMudarFiltro}
        aoLimparFiltros={handleLimparFiltros}
        aoAtualizarSap={() => carregarDados(true)}
        aoGerarPdf={handleAbrirPdf}
        carregandoAtualizacao={atualizandoSap}
        totalFiltrado={itensFiltrados.length}
        totalOriginal={todosItens.length}
      />

      {/* 6. CONTEÚDO PRINCIPAL: SKELETON / TABELA / ESTADO VAZIO */}
      {carregando ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
          <div className="mx-auto w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {todosItens.length === 0
                ? 'Nenhum dado de produção encontrado para os filtros selecionados.'
                : 'Nenhum material abaixo da carteira mínima com os filtros ativos.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              {todosItens.length === 0
                ? 'Aguardando sincronização de ordens com o SAP ou verifique os parâmetros de filtro.'
                : 'Tente ajustar os filtros de Linha, Centro, Material ou Período para expandir os resultados.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {todosItens.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLimparFiltros}
                className="text-xs"
              >
                Limpar Filtros
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => carregarDados(true)}
              className="text-xs bg-[#004C97] hover:bg-[#003d7a] text-white gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar dados SAP
            </Button>
          </div>
        </div>
      ) : (
        <CarteiraMinimaTable
          itens={itensFiltrados}
          aoSelecionarItem={(it) => setItemSelecionado(it)}
          itemSelecionadoId={itemSelecionado?.id}
        />
      )}

      {/* 7. MODAIS DE DETALHE E PDF */}
      <CarteiraMinimaDetailModal
        item={itemSelecionado}
        isOpen={Boolean(itemSelecionado)}
        onClose={() => setItemSelecionado(null)}
      />

      <CarteiraMinimaPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        itens={itensFiltrados}
        filtros={filtros}
        totalizadores={totalizadores}
        ultimaAtualizacaoSap={ultimaAtualizacaoSap}
      />
    </div>
  )
}

export default CarteiraMinimaNaoAtingidaPage
