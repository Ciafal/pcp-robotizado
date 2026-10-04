import React, { useState, useEffect, useCallback } from 'react'
import {
  pcpIndicadoresService,
  IndicadorMatrizLinha,
  FiltrosMatrizIndicadores,
} from '@/services/pcp-indicadores-service'
import { IndicadoresFilterBar } from '@/components/pcp-indicadores/IndicadoresFilterBar'
import { MatrizAnualIndicadores } from '@/components/pcp-indicadores/MatrizAnualIndicadores'
import { IndicadorDetailModal } from '@/components/pcp-indicadores/IndicadorDetailModal'
import { BarChart3, Info } from 'lucide-react'

export const IndicadoresPcpPage: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosMatrizIndicadores>({
    empresa: '',
    linha: '',
    centro: '',
    ano: 2026,
    tipoIndicador: '',
    status: 'TODOS',
  })

  const [linhas, setLinhas] = useState<IndicadorMatrizLinha[]>([])
  const [carregando, setCarregando] = useState<boolean>(true)
  const [linhaSelecionada, setLinhaSelecionada] = useState<IndicadorMatrizLinha | null>(null)
  const [modalAberto, setModalAberto] = useState<boolean>(false)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const resultado = await pcpIndicadoresService.calcularMatrizAnual(filtros)
      setLinhas(resultado)
    } catch (err) {
      console.error('[IndicadoresPcpPage] Falha ao carregar matriz:', err)
    } finally {
      setCarregando(false)
    }
  }, [filtros])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleChangeFiltros = (novos: Partial<FiltrosMatrizIndicadores>) => {
    setFiltros((prev) => ({ ...prev, ...novos }))
  }

  const handleAbrirDetalhe = (linha: IndicadorMatrizLinha) => {
    setLinhaSelecionada(linha)
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setLinhaSelecionada(null)
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-50 overflow-y-auto no-scrollbar">
      {/* Topo Institucional Ciafal */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#004C97] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                Relatórios PCP
              </span>
              <span className="text-xs text-slate-400 font-mono">• Exercício {filtros.ano}</span>
            </div>
            {/* Título Principal Exato Conforme Pedido do Usuário */}
            <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              <BarChart3 className="w-5 h-5 text-[#004C97] shrink-0" />
              <span>INDICADORES PCP — MATRIZ ANUAL CONSOLIDADA (JAN–DEZ/{filtros.ano})</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhamento corporativo de METAS x REALIZADO mensal, rastreabilidade de
              conformidade e detalhamento analítico com inteligência operacional.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Padrão Ciafal
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                Divinópolis • Contagem
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Barra de Filtros e Grade Anual */}
      <div className="p-4 sm:p-6 space-y-4 flex-1">
        {/* Barra de Filtros */}
        <IndicadoresFilterBar
          filtros={filtros}
          onChangeFiltros={handleChangeFiltros}
          onRecarregar={carregarDados}
          carregando={carregando}
        />

        {/* Informação Operacional de Arquitetura e Fontes */}
        <div className="p-3 bg-white border border-slate-200 rounded-md text-xs text-slate-600 flex items-start gap-2 shadow-2xs">
          <Info className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-800">Origem dos dados em tempo real:</span> Os
            indicadores utilizam programações consolidadas de{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-[#004C97]">
              weekly_schedules
            </code>
            , paradas e setup de{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-[#004C97]">
              pcp_production_stops
            </code>{' '}
            e carteira expedida. Indicadores sem registros no mês ou aguardando homologação do ERP
            aparecem como <span className="font-semibold">Sem dados</span>.
          </div>
        </div>

        {/* Matriz Anual Corporativa */}
        <MatrizAnualIndicadores
          linhas={linhas}
          ano={filtros.ano}
          onAbrirDetalhe={handleAbrirDetalhe}
          carregando={carregando}
        />
      </div>

      {/* Modal de Detalhamento com Gráficos e IA */}
      <IndicadorDetailModal
        open={modalAberto}
        onClose={handleFecharModal}
        linha={linhaSelecionada}
        ano={filtros.ano}
        empresaFiltro={filtros.empresa}
        linhaFiltro={filtros.linha}
        centroFiltro={filtros.centro}
        onSalvarMeta={carregarDados}
      />
    </div>
  )
}
export default IndicadoresPcpPage
