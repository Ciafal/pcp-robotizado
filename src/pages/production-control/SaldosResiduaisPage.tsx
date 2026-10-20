import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ResidualBalancesCards } from '../../components/residual-balances/ResidualBalancesCards'
import { DepositStatusTable } from '../../components/residual-balances/DepositStatusTable'
import {
  ResidualBalancesFilterBar,
  ResidualBalancesFiltersState,
} from '../../components/residual-balances/ResidualBalancesFilterBar'
import { ResidualBalancesTable } from '../../components/residual-balances/ResidualBalancesTable'
import { ResidualBalanceDetailModal } from '../../components/residual-balances/ResidualBalanceDetailModal'
import { ResidualBalanceActionModal } from '../../components/residual-balances/ResidualBalanceActionModal'
import { ResidualBalanceHistoryModal } from '../../components/residual-balances/ResidualBalanceHistoryModal'
import { ResidualBalanceParametersModal } from '../../components/residual-balances/ResidualBalanceParametersModal'
import { ResidualBalancesService } from '../../services/pcp-residual-balances-service'
import { getStorageDeposits, StorageDeposit } from '../../services/pcp-storage-deposits-service'
import {
  ResidualBalanceItem,
  DepositResidualSummary,
  ResidualBalancesExecutiveCards as CardsType,
} from '../../types/pcp-residual-balances'
import { RotateCw, Settings, Layers, CheckCircle2, AlertCircle } from 'lucide-react'

const initialFilters: ResidualBalancesFiltersState = {
  deposito: 'TODOS',
  materialCodigo: '',
  materialDescricao: '',
  lote: '',
  status: 'TODOS',
  dataInicial: '',
  dataFinal: '',
}

export const SaldosResiduaisPage: React.FC = () => {
  const [filters, setFilters] = useState<ResidualBalancesFiltersState>(initialFilters)
  const [items, setItems] = useState<ResidualBalanceItem[]>([])
  const [summaries, setSummaries] = useState<DepositResidualSummary[]>([])
  const [cards, setCards] = useState<CardsType>({
    depositos_com_residual: 0,
    materiais_com_residual: 0,
    lotes_com_residual: 0,
    volume_total_residual: 0,
    unidade_medida_predominante: 'kg',
    acoes_necessarias: 0,
    em_tratamento: 0,
  })
  const [deposits, setDeposits] = useState<StorageDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Modais
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionModalMode, setActionModalMode] = useState<'TREAT' | 'REGULARIZE'>('TREAT')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [parametersModalOpen, setParametersModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ResidualBalanceItem | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 4500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ResidualBalancesService.getResidualBalances({
        deposito: filters.deposito !== 'TODOS' ? filters.deposito : undefined,
        materialCodigo: filters.materialCodigo || undefined,
        materialDescricao: filters.materialDescricao || undefined,
        lote: filters.lote || undefined,
        status: filters.status !== 'TODOS' ? filters.status : undefined,
        dataInicial: filters.dataInicial || undefined,
        dataFinal: filters.dataFinal || undefined,
      })

      setItems(res.items)
      setSummaries(res.summaries)
      setCards(res.cards)
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar dados de saldos residuais.', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    setDeposits(getStorageDeposits())
    loadData()
  }, [loadData])

  const handleSelectDepositFromTable = (depositCode: string) => {
    setFilters((prev) => ({
      ...prev,
      deposito: depositCode,
    }))
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
  }

  const handleOpenDetail = (item: ResidualBalanceItem) => {
    setSelectedItem(item)
    setDetailModalOpen(true)
  }

  const handleStartTreatment = async (item: ResidualBalanceItem) => {
    try {
      const res = await ResidualBalancesService.registerAction({
        saldoId: item.id,
        deposito: item.deposito,
        materialCodigo: item.material_codigo,
        materialDescricao: item.material_descricao,
        lote: item.lote,
        quantidadeResidual: item.quantidade_atual,
        unidadeMedida: item.unidade_medida,
        regraAplicada: item.regra_aplicada_descricao,
        acaoPrevista: item.acao_recomendada,
        acaoRealizada: 'Início de tratamento operacional do saldo residual',
        responsavel: item.responsavel_acao || 'Operador / PCP',
        statusNovo: 'EM_TRATAMENTO',
        observacao: 'Tratamento iniciado via painel de Saldos Residuais',
      })
      if (res.success) {
        showToast(res.message, 'success')
        loadData()
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao iniciar tratamento.', 'error')
    }
  }

  const handleRegisterAction = (item: ResidualBalanceItem) => {
    setSelectedItem(item)
    setActionModalMode('TREAT')
    setActionModalOpen(true)
  }

  const handleRegularize = (item: ResidualBalanceItem) => {
    setSelectedItem(item)
    setActionModalMode('REGULARIZE')
    setActionModalOpen(true)
  }

  const handleOpenHistory = (item: ResidualBalanceItem) => {
    setSelectedItem(item)
    setHistoryModalOpen(true)
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Toast Notificação de Sucesso/Erro */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border flex items-center gap-3 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Cabeçalho da Tela Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Saldos Residuais</h1>
            <p className="text-xs text-slate-500">
              Monitoramento e tratamento dos saldos residuais por depósito
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="text-xs h-9 text-slate-700 hover:text-slate-900 border-slate-300 flex items-center gap-1.5 shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setParametersModalOpen(true)}
            className="text-xs h-9 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            Parâmetros
          </Button>
        </div>
      </div>

      {/* 1. Cards da Visão Geral (Calculados dos dados reais) */}
      <ResidualBalancesCards cards={cards} loading={loading} />

      {/* 2. Filtros Combináveis */}
      <ResidualBalancesFilterBar
        filters={filters}
        deposits={deposits}
        onFilterChange={setFilters}
        onApplyFilters={loadData}
        onClearFilters={handleClearFilters}
        loading={loading}
      />

      {/* 3. Status dos Depósitos */}
      <DepositStatusTable
        summaries={summaries}
        selectedDeposit={filters.deposito !== 'TODOS' ? filters.deposito : undefined}
        onSelectDeposit={handleSelectDepositFromTable}
        loading={loading}
      />

      {/* 4. Tabela Detalhada dos Saldos Residuais */}
      <ResidualBalancesTable
        items={items}
        loading={loading}
        onViewDetail={handleOpenDetail}
        onStartTreatment={handleStartTreatment}
        onRegisterAction={handleRegisterAction}
        onRegularize={handleRegularize}
        onViewHistory={handleOpenHistory}
      />

      {/* Modais */}
      <ResidualBalanceDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        item={selectedItem}
        onOpenActionModal={(it) => {
          setDetailModalOpen(false)
          handleRegisterAction(it)
        }}
        onOpenHistoryModal={(it) => {
          setDetailModalOpen(false)
          handleOpenHistory(it)
        }}
      />

      <ResidualBalanceActionModal
        open={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        item={selectedItem}
        mode={actionModalMode}
        onSuccess={(msg) => {
          showToast(msg, 'success')
          loadData()
        }}
      />

      <ResidualBalanceHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        item={selectedItem}
      />

      <ResidualBalanceParametersModal
        open={parametersModalOpen}
        onClose={() => setParametersModalOpen(false)}
        deposits={deposits}
        onSuccessNotification={(msg) => {
          showToast(msg, 'success')
          loadData()
        }}
      />
    </div>
  )
}

export default SaldosResiduaisPage
