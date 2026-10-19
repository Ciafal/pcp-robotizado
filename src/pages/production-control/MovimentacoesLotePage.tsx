import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BatchFilterBar } from '@/components/batch-movements/BatchFilterBar'
import { BatchSummaryCard } from '@/components/batch-movements/BatchSummaryCard'
import { SapMovementsTab } from '@/components/batch-movements/SapMovementsTab'
import { RfidMovementsTab } from '@/components/batch-movements/RfidMovementsTab'
import { IntegratedTraceabilityTab } from '@/components/batch-movements/IntegratedTraceabilityTab'
import { SapMovementDetailModal } from '@/components/batch-movements/SapMovementDetailModal'
import { LabelReprintModal } from '@/components/batch-movements/LabelReprintModal'
import {
  SapBatchMovement,
  RfidMovement,
  IntegratedTraceabilityEvent,
  BatchSummary,
  LabelReprintRequest,
  LabelReprintResult,
} from '@/types/batch-movements'
import {
  fetchSapBatchMovements,
  fetchRfidMovements,
  buildBatchSummary,
  buildIntegratedTraceability,
  requestLabelReprint,
  logBatchAuditAction,
} from '@/services/batch-movements-service'
import { FileText, Radio, GitMerge, ShieldCheck, Download, Search } from 'lucide-react'

export const MovimentacoesLotePage: React.FC = () => {
  // Filtros
  const [lote, setLote] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [materialCode, setMaterialCode] = useState('')

  // Estados de Validação e Consulta
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hasQueried, setHasQueried] = useState(false)
  const [isLoadingSap, setIsLoadingSap] = useState(false)
  const [isLoadingRfid, setIsLoadingRfid] = useState(false)
  const [sapError, setSapError] = useState<string | undefined>(undefined)
  const [rfidError, setRfidError] = useState<string | undefined>(undefined)

  // Dados
  const [sapMovements, setSapMovements] = useState<SapBatchMovement[]>([])
  const [rfidMovements, setRfidMovements] = useState<RfidMovement[]>([])
  const [summary, setSummary] = useState<BatchSummary | null>(null)
  const [integratedEvents, setIntegratedEvents] = useState<IntegratedTraceabilityEvent[]>([])
  const [divergencesCount, setDivergencesCount] = useState(0)

  // Modais
  const [selectedSapMovement, setSelectedSapMovement] = useState<SapBatchMovement | null>(null)
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false)

  // Aba ativa
  const [activeTab, setActiveTab] = useState<'sap' | 'rfid' | 'integrated'>('sap')

  // Regras de validação e consulta
  const handleSearch = useCallback(async () => {
    setValidationError(null)

    const cleanLote = lote.trim()
    if (!cleanLote) {
      setValidationError('Informe o número do lote para realizar a consulta.')
      return
    }

    if (dataInicial && dataFinal && dataInicial > dataFinal) {
      setValidationError('A data inicial não pode ser posterior à data final.')
      return
    }

    setHasQueried(true)
    setIsLoadingSap(true)
    setIsLoadingRfid(true)
    setSapError(undefined)
    setRfidError(undefined)

    // Auditoria de consulta realizada
    logBatchAuditAction('CONSULTA_REALIZADA', cleanLote, {
      data_inicial: dataInicial,
      data_final: dataFinal,
      material_code: materialCode,
    })

    // Consultas concorrentes e independentes: se UMA falhar, a outra NÃO cai
    const sapPromise = fetchSapBatchMovements({
      lote: cleanLote,
      data_inicial: dataInicial,
      data_final: dataFinal,
      material_code: materialCode,
    })

    const rfidPromise = fetchRfidMovements({
      lote: cleanLote,
      data_inicial: dataInicial,
      data_final: dataFinal,
      material_code: materialCode,
    })

    let currentSap: SapBatchMovement[] = []
    let currentRfid: RfidMovement[] = []

    try {
      const sapRes = await sapPromise
      if (sapRes.success) {
        currentSap = sapRes.data
        setSapMovements(sapRes.data)
      } else {
        setSapError(
          sapRes.error || 'Não foi possível consultar as movimentações SAP neste momento.',
        )
        setSapMovements([])
      }
    } catch (_) {
      setSapError('Não foi possível consultar as movimentações SAP neste momento.')
      setSapMovements([])
    } finally {
      setIsLoadingSap(false)
    }

    try {
      const rfidRes = await rfidPromise
      if (rfidRes.success) {
        currentRfid = rfidRes.data
        setRfidMovements(rfidRes.data)
      } else {
        setRfidError(
          rfidRes.error || 'Não foi possível consultar as movimentações RFID neste momento.',
        )
        setRfidMovements([])
      }
    } catch (_) {
      setRfidError('Não foi possível consultar as movimentações RFID neste momento.')
      setRfidMovements([])
    } finally {
      setIsLoadingRfid(false)
    }

    // Construir resumo do lote e visão integrada mesmo com dados parciais
    const sum = buildBatchSummary(cleanLote, currentSap, currentRfid)
    setSummary(sum)

    const integrated = buildIntegratedTraceability(currentSap, currentRfid, cleanLote)
    setIntegratedEvents(integrated.events)
    setDivergencesCount(integrated.divergencesCount)
  }, [lote, dataInicial, dataFinal, materialCode])

  const handleClear = () => {
    setLote('')
    setDataInicial('')
    setDataFinal('')
    setMaterialCode('')
    setValidationError(null)
    setHasQueried(false)
    setSapMovements([])
    setRfidMovements([])
    setSummary(null)
    setIntegratedEvents([])
    setDivergencesCount(0)
    setSapError(undefined)
    setRfidError(undefined)
  }

  // Exportação CSV/Relatório
  const handleExport = (origemTipo: 'SAP' | 'RFID' | 'INTEGRADA') => {
    const cleanLote = lote.trim() || 'LOTE'
    logBatchAuditAction('EXPORTACAO_RELATORIO', cleanLote, {
      tipo: origemTipo,
      filtros: { dataInicial, dataFinal, materialCode },
    })

    let csvContent = 'data:text/csv;charset=utf-8,'
    if (origemTipo === 'SAP') {
      csvContent +=
        'Data;Hora;Documento;Ano;Item;Material;Descricao;Lote;BWART;Descricao_BWART;Quantidade;UM;Centro;Deposito;OP;Doc_Ref;Usuario\n'
      sapMovements.forEach((m) => {
        csvContent += `"${m.data_lancamento}";"${m.hora || ''}";"${m.mblnr}";"${m.mjahr}";"${m.zeile}";"${m.material_code}";"${m.material_desc || ''}";"${m.lote}";"${m.bwart}";"${m.bwart_desc || ''}";"${m.quantidade}";"${m.unidade_medida || 'UN'}";"${m.werks || ''}";"${m.lgort || ''}";"${m.aufnr || ''}";"${m.xblnr || ''}";"${m.usnam || ''}"\n`
      })
    } else if (origemTipo === 'RFID') {
      csvContent +=
        'Data;Hora;TAG_RFID;EPC;Material;Lote;Quantidade;UM;Localizacao_Anterior;Localizacao_Atual;Deposito;Centro;Coletor;Usuario;Tipo_Coleta;Status\n'
      rfidMovements.forEach((r) => {
        csvContent += `"${r.data_leitura}";"${r.hora_leitura}";"${r.tag_rfid}";"${r.epc || ''}";"${r.material_code}";"${r.lote}";"${r.quantidade || ''}";"${r.unidade_medida || 'KG'}";"${r.localizacao_anterior || ''}";"${r.localizacao_atual}";"${r.deposito || ''}";"${r.centro || ''}";"${r.equipamento_coletor || ''}";"${r.usuario || ''}";"${r.tipo_coleta || ''}";"${r.status || ''}"\n`
      })
    } else {
      csvContent +=
        'Data_Hora;Origem;Evento;Titulo;Descricao;Lote;Material;Qtd;Centro;Deposito;Localizacao_Fisica;Correlacao;Divergencia;Detalhe_Divergencia\n'
      integratedEvents.forEach((e) => {
        csvContent += `"${e.data_display} ${e.hora_display}";"${e.origem}";"${e.tipo_evento}";"${e.titulo}";"${e.descricao}";"${e.lote}";"${e.material_code}";"${e.quantidade || ''}";"${e.centro || ''}";"${e.deposito || ''}";"${e.localizacao_fisica || ''}";"${e.status_correlacao}";"${e.tem_divergencia ? 'SIM' : 'NAO'}";"${e.detalhe_divergencia || ''}"\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `movimentacoes_lote_${cleanLote}_${origemTipo.toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Manipulação do envio de 2ª via
  const handleSubmitReprint = async (req: LabelReprintRequest): Promise<LabelReprintResult> => {
    return await requestLabelReprint(req)
  }

  const isLoadingTotal = isLoadingSap || isLoadingRfid

  return (
    <div className="space-y-4 pb-12">
      {/* Título da Página e Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Movimentações Lote
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-[#004C97] font-semibold">
              PCP Robotizado
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de Produção • Rastreabilidade Integrada SAP ECC (MB51) e Coletores RFID/WMS
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Auditoria Estrita Ativa</span>
        </div>
      </div>

      {/* 1. Card de Filtros */}
      <BatchFilterBar
        lote={lote}
        setLote={setLote}
        dataInicial={dataInicial}
        setDataInicial={setDataInicial}
        dataFinal={dataFinal}
        setDataFinal={setDataFinal}
        materialCode={materialCode}
        setMaterialCode={setMaterialCode}
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={isLoadingTotal}
        validationError={validationError}
      />

      {/* Estado Inicial (antes da primeira consulta) */}
      {!hasQueried && (
        <Card className="border border-slate-200">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-sky-50 text-[#004C97] mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Informe um lote para consultar sua rastreabilidade.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Digite o número do lote ou utilize um leitor de código de barras/RFID para carregar os
              documentos contábeis do SAP ECC e as coletas físicas do WMS.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exibição dos Dados após a Consulta */}
      {hasQueried && (
        <div className="space-y-4">
          {/* 2. Resumo do Lote */}
          {summary && (
            <BatchSummaryCard
              summary={summary}
              onOpenReprintModal={() => setIsReprintModalOpen(true)}
              canReprint={true}
            />
          )}

          {/* 3. Abas de Movimentações */}
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full"
          >
            <TabsList className="bg-slate-100 p-1 border border-slate-200">
              <TabsTrigger
                value="sap"
                className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Movimentações SAP (MB51)
                {sapMovements.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                    {sapMovements.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="rfid"
                className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700"
              >
                <Radio className="w-3.5 h-3.5 mr-1.5" />
                Movimentações RFID
                {rfidMovements.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px]">
                    {rfidMovements.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="integrated"
                className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
              >
                <GitMerge className="w-3.5 h-3.5 mr-1.5" />
                Rastreabilidade Integrada & Linha do Tempo
                {divergencesCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    {divergencesCount} div.
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: SAP */}
            <TabsContent value="sap" className="mt-3">
              <SapMovementsTab
                movements={sapMovements}
                isLoading={isLoadingSap}
                error={sapError}
                onSelectMovement={(m) => {
                  setSelectedSapMovement(m)
                  logBatchAuditAction('VISUALIZACAO_DETALHES_SAP', m.lote, {
                    mblnr: m.mblnr,
                    zeile: m.zeile,
                  })
                }}
                onExport={() => handleExport('SAP')}
              />
            </TabsContent>

            {/* Aba 2: RFID */}
            <TabsContent value="rfid" className="mt-3">
              <RfidMovementsTab
                movements={rfidMovements}
                isLoading={isLoadingRfid}
                error={rfidError}
                onExport={() => handleExport('RFID')}
              />
            </TabsContent>

            {/* Aba 3: Rastreabilidade Integrada */}
            <TabsContent value="integrated" className="mt-3">
              <IntegratedTraceabilityTab
                events={integratedEvents}
                divergencesCount={divergencesCount}
                onExport={() => handleExport('INTEGRADA')}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Modal de Detalhes da Movimentação SAP */}
      <SapMovementDetailModal
        movement={selectedSapMovement}
        isOpen={Boolean(selectedSapMovement)}
        onClose={() => setSelectedSapMovement(null)}
      />

      {/* Modal de 2ª Via de Etiqueta */}
      <LabelReprintModal
        summary={summary}
        isOpen={isReprintModalOpen}
        onClose={() => setIsReprintModalOpen(false)}
        onSubmitReprint={handleSubmitReprint}
      />
    </div>
  )
}

export default MovimentacoesLotePage
