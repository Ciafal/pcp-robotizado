import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Layers,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Ship,
  ShoppingBag,
  Factory,
} from 'lucide-react'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CoverageTemporalAnalysis } from './CoverageTemporalAnalysis'
import {
  CoberturaTemporalEngine,
  InputAnaliseCobertura,
  OrigemCarteira,
  ResultadoCoberturaTemporal,
} from '@/services/cobertura-temporal-engine'

export interface DetalheMaterialUnificadoModalProps {
  isOpen: boolean
  onClose: () => void
  item: CarteiraItem | CarteiraSDCItem | null
  origemCarteira: OrigemCarteira
  entradasFuturasDisponiveis?: CarteiraEntradaFutura[]
}

export const DetalheMaterialUnificadoModal: React.FC<DetalheMaterialUnificadoModalProps> = ({
  isOpen,
  onClose,
  item,
  origemCarteira,
  entradasFuturasDisponiveis = [],
}) => {
  if (!item) return null

  // Normalização polimórfica: CarteiraItem vs CarteiraSDCItem
  const isSDC = origemCarteira === 'SDC' || ('carteira_t' in item && 'estoque_total_t' in item)
  const sdcItem = isSDC ? (item as CarteiraSDCItem) : null
  const genItem = !isSDC ? (item as CarteiraItem) : null

  const materialCodigo = sdcItem ? sdcItem.material : genItem ? genItem.codigo_material : ''
  const descricao = sdcItem ? sdcItem.descricao : genItem ? genItem.descricao_material : ''
  const familia = sdcItem ? sdcItem.familia : genItem ? genItem.familia : 'Geral'
  const bitola = sdcItem ? sdcItem.bitola : '-'
  const curvaAbc = sdcItem ? sdcItem.curva_abc : genItem ? genItem.curva_abc : 'B'
  const centro = sdcItem ? 'SDPL' : genItem ? genItem.centro || '1000' : '1000'

  // Estoque
  const estoqueTotal = sdcItem
    ? sdcItem.estoque_total_t
    : genItem
      ? Number(genItem.estoque_livre_tons || 0) +
        Number(genItem.estoque_acabado_tons || 0) +
        Number(genItem.estoque_semiacabado_tons || 0)
      : 0
  const estoqueBloqueado = sdcItem
    ? Number(sdcItem.estoque_bloqueado_t || 0)
    : genItem && genItem.bloqueio
      ? Number(genItem.estoque_acabado_tons || 0)
      : 0
  const estoqueQualidade = 0
  const estoqueDisponivelUtilizavel = sdcItem
    ? Number(sdcItem.estoque_disponivel_t ?? estoqueTotal - estoqueBloqueado)
    : genItem
      ? Number(genItem.estoque_livre_tons || 0)
      : 0

  // Carteira
  const carteiraAberta = sdcItem
    ? sdcItem.carteira_t
    : genItem
      ? Number(genItem.carteira_aberta_tons || genItem.qtd_ordem_tons || 0)
      : 0

  // Reposições
  const programadoTons = sdcItem
    ? sdcItem.programado_t
    : genItem
      ? Number(genItem.qtd_programada_tons || 0)
      : 0
  const emProducaoTons = sdcItem ? Number(sdcItem.em_producao_t || 0) : 0
  const dataProgramada = sdcItem
    ? sdcItem.data_prevista
    : genItem
      ? genItem.data_programada
      : undefined

  // Histórico de faturamento
  const mediaFaturamentoInformada = genItem?.media_faturamento_diario_t_dia
    ? Number(genItem.media_faturamento_diario_t_dia)
    : undefined

  // Entradas futuras associadas (Revenda, Importado ou Geral)
  const entradasDoMaterial = entradasFuturasDisponiveis.filter(
    (e) => e.codigo_material.toLowerCase() === materialCodigo.toLowerCase(),
  )

  // Monta reposições estruturadas para o motor
  const reposicoesEstruturadas: InputAnaliseCobertura['reposicoesFuturas'] = []

  // Se tiver entradas futuras do cadastro/carga (ex.: Revenda, Importado, Ordens de compra)
  entradasDoMaterial.forEach((ent) => {
    reposicoesEstruturadas.push({
      dataPrevista: ent.data_prevista_entrada,
      quantidadeTons: ent.quantidade_pendente_tons || ent.quantidade_prevista_tons,
      origem:
        ent.origem === 'REVENDA'
          ? 'Recebimento fornecedor'
          : ent.origem === 'IMPORTADO'
            ? 'Importação (Disponibilidade)'
            : ent.origem === 'PRODUCAO_INTERNA'
              ? 'Produção Interna'
              : 'Entrada Futura',
      documentoRef: ent.documento_ref,
      observacao: ent.observacao,
    })
  })

  // Se for SDC e tiver industrialização com previsão de retorno
  if (sdcItem?.industrializacao_sdc?.previsao_retorno) {
    const tonsSDC =
      Number(sdcItem.industrializacao_sdc.em_processo_t || 0) ||
      Number(sdcItem.em_producao_t || 0) ||
      Number(sdcItem.programado_t || 0)
    if (tonsSDC > 0) {
      reposicoesEstruturadas.push({
        dataPrevista: sdcItem.industrializacao_sdc.previsao_retorno,
        quantidadeTons: tonsSDC,
        origem: sdcItem.origem_producao === 'CIAFAL' ? 'Produção CIAFAL' : 'Retorno SDC',
        documentoRef: 'Retorno Industrialização SDPL',
      })
    }
  }

  // Prepara input do motor central de cobertura temporal
  const inputAnalise: InputAnaliseCobertura = {
    material: materialCodigo,
    descricao,
    familia,
    bitola,
    curvaAbc,
    origemCarteira,
    estoqueTotalT: estoqueTotal,
    estoqueBloqueadoT: estoqueBloqueado,
    estoqueQualidadeT: estoqueQualidade,
    estoqueDisponivelUtilizavelT: estoqueDisponivelUtilizavel,
    carteiraT: carteiraAberta,
    mediaDiariaFaturamentoInformadaT: mediaFaturamentoInformada,
    pedidos: sdcItem?.pedidos_compoem?.map((p) => ({
      ordemVenda: p.ordem_venda,
      itemOrdem: p.item_ordem,
      cliente: p.cliente,
      quantidadeTons: p.quantidade_t,
      dataDesejada: p.data_desejada,
    })) || [
      {
        ordemVenda: genItem?.ordem_venda || 'OV-PADRAO',
        itemOrdem: genItem?.item_ordem || '10',
        cliente: genItem?.nome_cliente || 'Mercado Geral',
        quantidadeTons: carteiraAberta,
        dataDesejada: genItem?.data_desejada || '',
      },
    ],
    reposicoesFuturas: reposicoesEstruturadas,
    programadoT: programadoTons,
    emProducaoT: emProducaoTons,
    dataProgramada: dataProgramada,
    situacaoProducao:
      sdcItem?.situacao_producao || (programadoTons > 0 ? 'Programado' : 'Sem programação'),
  }

  // Executa o cálculo pelo motor central
  const resultadoTemporal = CoberturaTemporalEngine.calcular(inputAnalise)

  const isDeficit = resultadoTemporal.saldoAtualT < 0
  const isProjPositivo = resultadoTemporal.saldoProjetadoT >= 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* 1. CABEÇALHO & IDENTIFICAÇÃO DO MATERIAL */}
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-black text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {materialCodigo}
              </span>
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                Carteira {origemCarteira} &bull; Centro {centro}
              </Badge>
              {curvaAbc && (
                <Badge
                  variant="outline"
                  className="border-slate-300 text-slate-700 text-[10px] font-bold"
                >
                  Curva {curvaAbc}
                </Badge>
              )}
            </div>

            {/* Badge Status Temporal */}
            <Badge
              className={`text-[11px] font-bold border ${resultadoTemporal.badgeCor.bg} ${resultadoTemporal.badgeCor.text} ${resultadoTemporal.badgeCor.border}`}
            >
              {resultadoTemporal.textoStatus}
            </Badge>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">{descricao}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Família: <strong>{familia}</strong> &bull; Bitola: <strong>{bitola}</strong> &bull;
            Origem: <strong>{origemCarteira}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* 2. NOVO BLOCO CENTRAL: COBERTURA TEMPORAL & PREVISÃO */}
        <div className="pt-2">
          <CoverageTemporalAnalysis analise={resultadoTemporal} />
        </div>

        {/* 3. BLOCOS DETALHADOS DE DEMANDA, ESTOQUE E PROGRAMAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* CARTEIRA / DEMANDA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#004C97]" /> Carteira &amp; Demanda Aberta
              </span>
              <span className="text-sm font-mono font-bold text-[#004C97]">
                {carteiraAberta.toFixed(2)} t
              </span>
            </div>

            {sdcItem?.pedidos_compoem && sdcItem.pedidos_compoem.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {sdcItem.pedidos_compoem.map((ped, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <span>{ped.ordem_venda}</span>
                        <span className="text-slate-400">/ {ped.item_ordem}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        Cliente: {ped.cliente}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {ped.quantidade_t.toFixed(2)} t
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Desejada: {ped.data_desejada}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : genItem ? (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordem de Venda:</span>
                  <strong className="text-slate-800 font-mono">
                    {genItem.ordem_venda} / {genItem.item_ordem}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-800 truncate max-w-[220px]">
                    {genItem.nome_cliente || 'Mercado Geral'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Desejada:</span>
                  <strong className="text-slate-800 font-mono">
                    {genItem.data_desejada || 'Não informada'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo Atendimento:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {genItem.tipo_ordem} &bull; {genItem.origem_produto}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                Nenhum pedido detalhado para este material no momento.
              </div>
            )}
          </div>

          {/* ESTOQUE DETALHADO (Total, Qualidade, Bloqueado, Disponível) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Balanço de Estoque Físico
              </span>
              <span className="text-sm font-mono font-bold text-emerald-700">
                {estoqueTotal.toFixed(2)} t
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Disponível Utilizável</span>
                <strong className="text-xs font-mono text-emerald-700">
                  {estoqueDisponivelUtilizavel.toFixed(2)} t
                </strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Bloqueado / Restrições</span>
                <strong
                  className={`text-xs font-mono ${
                    estoqueBloqueado > 0 ? 'text-rose-600 font-bold' : 'text-slate-700'
                  }`}
                >
                  {estoqueBloqueado.toFixed(2)} t
                </strong>
              </div>
            </div>

            {estoqueBloqueado > 0 && (
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Existe lote bloqueado deduzido do estoque utilizável conforme regra corporativa.
              </div>
            )}
          </div>

          {/* PROGRAMAÇÃO / REPOSIÇÃO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> Programação &amp; Reposição
              </span>
              <span className="text-sm font-mono font-bold text-blue-700">
                {(programadoTons + emProducaoTons).toFixed(2)} t
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Próxima Entrada:</span>
                <strong className="text-slate-800 font-mono">
                  {resultadoTemporal.proximaDataPrevistaFormatada}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Programado:</span>
                <strong className="text-slate-800 font-mono">{programadoTons.toFixed(2)} t</strong>
              </div>
              {emProducaoTons > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Em Produção:</span>
                  <strong className="text-indigo-700 font-mono">
                    {emProducaoTons.toFixed(2)} t
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* PARTICULARIDADES DA CARTEIRA ESPECÍFICA */}
          {origemCarteira === 'SDC' && sdcItem ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-600" /> Industrialização SDC
                </span>
                <span className="text-sm font-mono font-bold text-purple-700">
                  {(sdcItem.em_producao_t + sdcItem.programado_t).toFixed(2)} t
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Destinada</span>
                  <strong className="font-mono text-slate-800">
                    {(sdcItem.industrializacao_sdc?.destinada_t ?? sdcItem.programado_t).toFixed(2)}{' '}
                    t
                  </strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Em Processo</span>
                  <strong className="font-mono text-indigo-700">
                    {(sdcItem.industrializacao_sdc?.em_processo_t ?? sdcItem.em_producao_t).toFixed(
                      2,
                    )}{' '}
                    t
                  </strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-500 block">Concluída</span>
                  <strong className="font-mono text-emerald-700">
                    {(sdcItem.industrializacao_sdc?.concluida_t ?? sdcItem.estoque_total_t).toFixed(
                      2,
                    )}{' '}
                    t
                  </strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
                <span>Retorno SDC:</span>
                <span className="font-mono font-bold text-slate-700">
                  {sdcItem.industrializacao_sdc?.previsao_retorno ||
                    sdcItem.data_prevista ||
                    'A programar'}
                </span>
              </div>
            </div>
          ) : origemCarteira === 'IMPORTADO' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Ship className="w-4 h-4 text-sky-600" /> Detalhes de Importação (ETA /
                  Desembaraço)
                </span>
                <span className="text-xs font-mono font-bold text-sky-700">
                  {entradasDoMaterial.length} remessa(s)
                </span>
              </div>
              {entradasDoMaterial.length > 0 ? (
                <div className="space-y-1 text-xs">
                  {entradasDoMaterial.map((ent, idx) => (
                    <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>Doc: {ent.documento_ref}</span>
                        <span className="font-mono font-bold text-sky-700">
                          {ent.quantidade_prevista_tons.toFixed(2)} t
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                        <span>Disponibilidade Efetiva: {ent.data_prevista_entrada}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {ent.status_entrada}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Nenhuma ordem de importação em trânsito/desembaraço vinculada.
                </p>
              )}
            </div>
          ) : origemCarteira === 'REVENDA' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" /> Ordens de Compra &amp;
                  Fornecedor
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {entradasDoMaterial.length} pedido(s)
                </span>
              </div>
              {entradasDoMaterial.length > 0 ? (
                <div className="space-y-1 text-xs">
                  {entradasDoMaterial.map((ent, idx) => (
                    <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>Fornec: {ent.fornecedor_origem || 'Gerdau/Arcelor'}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {ent.quantidade_prevista_tons.toFixed(2)} t
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                        <span>Recebimento Previsto: {ent.data_prevista_entrada}</span>
                        <span className="font-mono">Doc: {ent.documento_ref}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Nenhum pedido de compra/recebimento de revenda pendente.
                </p>
              )}
            </div>
          ) : origemCarteira === 'MTO' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-purple-600" /> Ordem MTO &amp; Rastreabilidade
                </span>
                <Badge variant="outline" className="text-[10px]">
                  OP Associada ao Pedido
                </Badge>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estoque MTO Dedicado:</span>
                  <strong className="text-purple-800 font-mono">
                    {Number(genItem?.estoque_mto_tons || 0).toFixed(2)} t
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carteira MTO Aberta:</span>
                  <strong className="text-slate-800 font-mono">
                    {Number(genItem?.carteira_mto_tons || carteiraAberta).toFixed(2)} t
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Programação da Ordem:</span>
                  <strong className="text-slate-800 font-mono">
                    {dataProgramada || 'Aguardando sequenciamento'}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-[#004C97]" /> Linha &amp; Sequenciamento
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {genItem?.linha || 'CFPL'}
                </Badge>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Semana Programada:</span>
                  <strong className="text-slate-800 font-mono">
                    {genItem?.semana_programada || 'Não informada'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Programada:</span>
                  <strong className="text-slate-800 font-mono">
                    {genItem?.data_programada || 'Não informada'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Atendimento:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {genItem?.status_atendimento || 'A_PRODUZIR'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. BALANÇO CLÁSSICO AUDITÁVEL (Preservando todos os 4 indicadores) */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#004C97]" /> 4 Indicadores Estruturais de
              Balanço
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Unidade: Toneladas (t)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Saldo Atual */}
            <div
              className={`p-3 rounded-lg border ${
                isDeficit ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                1. Saldo Atual (Estoque − Carteira)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-base font-mono font-black ${
                    isDeficit ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {resultadoTemporal.saldoAtualT > 0
                    ? `+${resultadoTemporal.saldoAtualT.toFixed(2)}`
                    : resultadoTemporal.saldoAtualT.toFixed(2)}
                </strong>
                <span className="text-xs text-slate-500 font-semibold">t</span>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                {isDeficit
                  ? `Déficit de ${Math.abs(resultadoTemporal.saldoAtualT).toFixed(2)} t`
                  : 'Coberto com estoque atual'}
              </span>
            </div>

            {/* Saldo Projetado */}
            <div
              className={`p-3 rounded-lg border ${
                isProjPositivo ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                2. Saldo Projetado (+ Reposições)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-base font-mono font-black ${
                    isProjPositivo ? 'text-[#004C97]' : 'text-amber-800'
                  }`}
                >
                  {resultadoTemporal.saldoProjetadoT > 0
                    ? `+${resultadoTemporal.saldoProjetadoT.toFixed(2)}`
                    : resultadoTemporal.saldoProjetadoT.toFixed(2)}
                </strong>
                <span className="text-xs text-slate-500 font-semibold">t</span>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                {isProjPositivo
                  ? 'Cobertura projetada suficiente'
                  : `Déficit residual: ${Math.abs(resultadoTemporal.saldoProjetadoT).toFixed(2)} t`}
              </span>
            </div>

            {/* Dias Cobertura */}
            <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                3. Dias Cobertura (Consumo Médio)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong className="text-base font-mono font-black text-slate-800">
                  {resultadoTemporal.diasCoberturaFormatado}
                </strong>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                Estoque / Média Diária
              </span>
            </div>

            {/* Dias Estoque Negativo */}
            <div
              className={`p-3 rounded-lg border ${
                resultadoTemporal.temGapRuptura
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                4. Dias Negativos (Gap Temporal)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className={`text-base font-mono font-black ${
                    resultadoTemporal.temGapRuptura ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {resultadoTemporal.diasEstoqueNegativoFormatado}
                </strong>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                {resultadoTemporal.temGapRuptura ? 'Período sem estoque' : 'Sem intervalo negativo'}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com Fechamento */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Detalhamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DetalheMaterialUnificadoModal
