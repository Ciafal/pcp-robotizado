import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText,
  RefreshCw,
  Send,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CarteiraMinimaCards } from '@/components/carteira-views/CarteiraMinimaCards'
import { CarteiraMinimaFilterBar } from '@/components/carteira-views/CarteiraMinimaFilterBar'
import { CarteiraMinimaTable } from '@/components/carteira-views/CarteiraMinimaTable'
import { CarteiraMinimaDetailModal } from '@/components/carteira-views/CarteiraMinimaDetailModal'
import { CarteiraMinimaPdfModal } from '@/components/carteira-views/CarteiraMinimaPdfModal'
import { EnviarComunicadoComercialModal } from '@/components/carteira-views/EnviarComunicadoComercialModal'
import { HistoricoComunicadoItemModal } from '@/components/carteira-views/HistoricoComunicadoItemModal'
import { VisualizadorComunicadoModal } from '@/components/carteira-views/VisualizadorComunicadoModal'
import { carteiraMinimaService } from '@/services/carteira-minima-service'
import { comercialComunicadoService } from '@/services/comercial-comunicado-service'
import {
  CarteiraMinimaFiltros,
  CarteiraMinimaItem,
  CarteiraMinimaKpis,
} from '@/types/carteira-minima'
import { EnvioComunicadoResult, ItemComercialStatus } from '@/types/comercial-comunicado'

export const CarteiraMinimaNaoAtingidaPage: React.FC = () => {
  const [itens, setItens] = useState<CarteiraMinimaItem[]>([])
  const [filtros, setFiltros] = useState<CarteiraMinimaFiltros>({
    busca: '',
    centro: 'TODOS',
    linha: 'TODAS',
    criticidade: 'TODAS',
    periodoInicio: '',
    periodoFim: '',
  })
  const [carregando, setCarregando] = useState<boolean>(true)
  const [atualizandoSap, setAtualizandoSap] = useState<boolean>(false)
  const [ultimoUpdateSap, setUltimoUpdateSap] = useState<string>('')
  const [itemSelecionadoDetalhe, setItemSelecionadoDetalhe] = useState<CarteiraMinimaItem | null>(
    null,
  )
  const [modalPdfAberto, setModalPdfAberto] = useState<boolean>(false)

  // 1. Seleção dos itens para comunicado ao Comercial
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<string[]>([])

  // 2. Modais do Envio ao Comercial, Histórico e Visualização
  const [modalEnviarComercialAberto, setModalEnviarComercialAberto] = useState<boolean>(false)
  const [itemHistoricoComercial, setItemHistoricoComercial] = useState<CarteiraMinimaItem | null>(
    null,
  )
  const [comunicadoParaVisualizar, setComunicadoParaVisualizar] = useState<string | null>(null)

  // 3. Mapa de status comercial dos itens
  const [mapaStatusComercial, setMapaStatusComercial] = useState<
    Record<string, ItemComercialStatus>
  >({})

  // 4. Toast/Banner de confirmação do envio
  const [notificacaoSucesso, setNotificacaoSucesso] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const data = await carteiraMinimaService.obterItensCarteiraMinima()
      setItens(data)
      setUltimoUpdateSap(new Date().toLocaleTimeString('pt-BR'))

      // Carregar mapa de status comercial dos itens
      const statusMap = await comercialComunicadoService.obterMapaStatusItens(data)
      setMapaStatusComercial(statusMap)
    } catch (err) {
      console.error('[CarteiraMinimaPage] Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase()
        const mat = (it.material || '').toLowerCase()
        const desc = (it.descricao_material || '').toLowerCase()
        const ped = (it.pedido_formatado || `${it.pedido_venda}/${it.item_pedido}`).toLowerCase()
        if (!mat.includes(termo) && !desc.includes(termo) && !ped.includes(termo)) {
          return false
        }
      }
      if (filtros.centro && filtros.centro !== 'TODOS' && it.centro !== filtros.centro) {
        return false
      }
      if (filtros.linha && filtros.linha !== 'TODAS' && it.linha !== filtros.linha) {
        return false
      }
      if (
        filtros.criticidade &&
        filtros.criticidade !== 'TODAS' &&
        it.criticidade !== filtros.criticidade
      ) {
        return false
      }
      if (filtros.periodoInicio && it.data_desejada && it.data_desejada < filtros.periodoInicio) {
        return false
      }
      if (filtros.periodoFim && it.data_desejada && it.data_desejada > filtros.periodoFim) {
        return false
      }
      return true
    })
  }, [itens, filtros])

  // Lista dos objetos de itens selecionados conforme a seleção atual
  const itensSelecionadosObjetos = useMemo(() => {
    return itensFiltrados.filter((it) => itensSelecionadosIds.includes(it.id))
  }, [itensFiltrados, itensSelecionadosIds])

  const kpis: CarteiraMinimaKpis = useMemo(() => {
    return carteiraMinimaService.calcularKpis(itensFiltrados)
  }, [itensFiltrados])

  const handleToggleSelecionarItem = (id: string) => {
    setItensSelecionadosIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleToggleSelecionarTodos = (selecionarTodos: boolean) => {
    if (selecionarTodos) {
      const todosIds = itensFiltrados.map((it) => it.id)
      setItensSelecionadosIds(todosIds)
    } else {
      setItensSelecionadosIds([])
    }
  }

  const handleAtualizarSap = async () => {
    setAtualizandoSap(true)
    try {
      const data = await carteiraMinimaService.sincronizarDadosSap()
      setItens(data)
      setUltimoUpdateSap(new Date().toLocaleTimeString('pt-BR'))
      const statusMap = await comercialComunicadoService.obterMapaStatusItens(data)
      setMapaStatusComercial(statusMap)
    } catch (err) {
      console.error('[CarteiraMinimaPage] Erro ao sincronizar SAP:', err)
    } finally {
      setAtualizandoSap(false)
    }
  }

  // Ao concluir envio de comunicado com sucesso
  const handleSucessoEnvioComunicado = async (resultado: EnvioComunicadoResult) => {
    setNotificacaoSucesso(
      `Comunicado ${resultado.numeroSequencial} enviado com sucesso: ${resultado.mensagemRetorno}`,
    )
    // Limpar seleção
    setItensSelecionadosIds([])
    // Atualizar tabela e status
    await carregarDados()
    setTimeout(() => {
      setNotificacaoSucesso(null)
    }, 8000)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* CABEÇALHO PRINCIPAL DA TELA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-[#004C97] uppercase">
              PCP Robotizado &bull; Análise de Carteira
            </span>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 font-semibold text-[10px]"
            >
              Lote Mínimo &bull; Regra Saldo = Carteira − Estoque livre
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Carteira mínima não atingida
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Monitoramento preventivo de itens com saldo a produzir inferior à carteira mínima de
            produção/laminação cadastrada. Identifique gargalos e comunique o Comercial para
            avaliação de complementação ou reprogramação.
          </p>
        </div>

        {/* GRUPO DE BOTÕES DE AÇÃO: DISPOSIÇÃO ORGANIZADA E RESPONSIVA
            [Gerar relatório PDF] [Atualizar dados SAP] [Enviar p/ Comercial (qtd)]
            Disposição flex-wrap limpa sem quebra feia, mantendo o alinhamento em celulares e telas pequenas. */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 self-start lg:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalPdfAberto(true)}
            className="text-xs font-semibold h-9 px-3.5 border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Gerar relatório PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAtualizarSap}
            disabled={atualizandoSap || carregando}
            className="text-xs font-semibold h-9 px-3.5 border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs gap-1.5 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${atualizandoSap ? 'animate-spin text-[#004C97]' : 'text-slate-500'}`}
            />
            <span>{atualizandoSap ? 'Atualizando...' : 'Atualizar dados SAP'}</span>
          </Button>

          {/* Botão Enviar p/ Comercial com contagem dinâmica e desabilitado sem seleção */}
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={itensSelecionadosIds.length === 0}
            onClick={() => setModalEnviarComercialAberto(true)}
            title={
              itensSelecionadosIds.length === 0
                ? 'Selecione pelo menos 1 item na tabela para enviar comunicado ao Comercial'
                : 'Abrir popup de revisão e envio do comunicado ao Comercial'
            }
            className={`text-xs font-semibold h-9 px-4 gap-1.5 shadow-2xs transition-all ${
              itensSelecionadosIds.length > 0
                ? 'bg-[#004C97] hover:bg-[#003d7a] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              Enviar p/ Comercial
              {itensSelecionadosIds.length > 0 ? ` (${itensSelecionadosIds.length})` : ''}
            </span>
          </Button>
        </div>
      </div>

      {/* BANNER DE SUCESSO PÓS-ENVIO DO COMUNICADO */}
      {notificacaoSucesso && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 shadow-2xs animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-bold text-xs block">Comunicado emitido com sucesso!</span>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              {notificacaoSucesso}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificacaoSucesso(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-semibold"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* KPI CARDS EXECUTIVOS */}
      <CarteiraMinimaCards kpis={kpis} />

      {/* BARRA DE FILTROS */}
      <CarteiraMinimaFilterBar
        filtros={filtros}
        onFiltroChange={setFiltros}
        onLimparFiltros={() =>
          setFiltros({
            busca: '',
            centro: 'TODOS',
            linha: 'TODAS',
            criticidade: 'TODAS',
            periodoInicio: '',
            periodoFim: '',
          })
        }
        totalItens={itens.length}
        totalFiltrados={itensFiltrados.length}
      />

      {/* SEÇÃO DA TABELA PRINCIPAL COM CHECKBOX E STATUS COMERCIAL */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Itens com Carteira Mínima Não Atingida ({itensFiltrados.length})
            </h2>
            {itensSelecionadosIds.length > 0 && (
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                {itensSelecionadosIds.length} selecionado(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {ultimoUpdateSap && (
              <span>
                Última leitura SAP: <strong>{ultimoUpdateSap}</strong>
              </span>
            )}
          </div>
        </div>

        <CarteiraMinimaTable
          itens={itens}
          itensFiltrados={itensFiltrados}
          itensSelecionadosIds={itensSelecionadosIds}
          onToggleSelecionarItem={handleToggleSelecionarItem}
          onToggleSelecionarTodos={handleToggleSelecionarTodos}
          onVisualizarItem={(item) => setItemSelecionadoDetalhe(item)}
          onVerHistoricoComercial={(item) => setItemHistoricoComercial(item)}
          mapaStatusComercial={mapaStatusComercial}
        />
      </div>

      {/* MODAL 1: REVISÃO E ENVIO DO COMUNICADO AO COMERCIAL */}
      {modalEnviarComercialAberto && (
        <EnviarComunicadoComercialModal
          isOpen={modalEnviarComercialAberto}
          onClose={() => setModalEnviarComercialAberto(false)}
          itens={itensSelecionadosObjetos}
          onSucessoEnvio={(resultado) => {
            setModalEnviarComercialAberto(false)
            handleSucessoEnvioComunicado(resultado)
          }}
        />
      )}

      {/* MODAL 2: HISTÓRICO COMERCIAL DO ITEM (Ao clicar no status da tabela) */}
      {itemHistoricoComercial && (
        <HistoricoComunicadoItemModal
          isOpen={Boolean(itemHistoricoComercial)}
          onClose={() => setItemHistoricoComercial(null)}
          item={itemHistoricoComercial}
          onVerComunicadoCompleto={(seq) => {
            setItemHistoricoComercial(null)
            setComunicadoParaVisualizar(seq)
          }}
        />
      )}

      {/* MODAL 3: VISUALIZADOR DE COMUNICADO NA ÍNTEGRA (Comercial / HUB / Meu Dia) */}
      {comunicadoParaVisualizar && (
        <VisualizadorComunicadoModal
          isOpen={Boolean(comunicadoParaVisualizar)}
          onClose={() => setComunicadoParaVisualizar(null)}
          identificador={comunicadoParaVisualizar}
          onVisualizarNoPcp={(itensIds) => {
            setComunicadoParaVisualizar(null)
            setItensSelecionadosIds(itensIds)
          }}
        />
      )}

      {/* MODAL 4: DETALHES DO ITEM */}
      {itemSelecionadoDetalhe && (
        <CarteiraMinimaDetailModal
          isOpen={Boolean(itemSelecionadoDetalhe)}
          onClose={() => setItemSelecionadoDetalhe(null)}
          item={itemSelecionadoDetalhe}
        />
      )}

      {/* MODAL 5: RELATÓRIO PDF */}
      <CarteiraMinimaPdfModal
        isOpen={modalPdfAberto}
        onClose={() => setModalPdfAberto(false)}
        itens={itensFiltrados}
        kpis={kpis}
      />
    </div>
  )
}

export default CarteiraMinimaNaoAtingidaPage
