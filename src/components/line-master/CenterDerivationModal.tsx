/**
 * Modal de Criação / Edição de Regra de Derivação de Centro
 * HUB CIAFAL - PCP Robotizado
 *
 * Funcionalidade:
 * - Seletor pesquisável de Centro de Origem (código interno, nome oficial, empresa, linha produtiva, Centro SAP e status)
 * - Bloqueio de autorrelacionamento (não permitir selecionar o próprio Centro)
 * - Alerta quando o Centro selecionado estiver inativo
 * - Por padrão listar somente Centros ativos (com toggle para exibir inativos)
 * - Grupo de Mercadorias (SAP ECC via RFC MARA-MATKL) pesquisável por código ou descrição
 * - Múltiplos grupos por regra (chips com adicionar/remover, sem duplicidade)
 * - Período de validade: Data Início obrigatória, Data Fim opcional, bloqueio se Fim < Início
 * - Datas no formato DD/MM/AAAA
 * - Status Ativa/Inativa
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  GitFork,
  Search,
  Plus,
  X,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Building2,
  Tag,
  Info,
} from 'lucide-react'
import { CenterDerivationRule, MatklGroupItem } from '@/types/center-derivation'
import { ProductionLine } from '@/types/line-master'
import { sapMatklService } from '@/services/sap-matkl-service'

interface CenterDerivationModalProps {
  open: boolean
  onClose: () => void
  currentCenterCode: string
  currentCenterName?: string
  availableCenters: ProductionLine[]
  existingRule?: CenterDerivationRule | null
  onSaveRule: (rule: CenterDerivationRule) => Promise<boolean | void>
}

export const CenterDerivationModal: React.FC<CenterDerivationModalProps> = ({
  open,
  onClose,
  currentCenterCode,
  currentCenterName,
  availableCenters,
  existingRule,
  onSaveRule,
}) => {
  // Estado dos campos do formulário
  const [sourceCenterCode, setSourceCenterCode] = useState<string>('')
  const [sourceCenterSearch, setSourceCenterSearch] = useState<string>('')
  const [showInactiveCenters, setShowInactiveCenters] = useState<boolean>(false)

  // Grupos MATKL selecionados na regra
  const [selectedMatklGroups, setSelectedMatklGroups] = useState<MatklGroupItem[]>([])

  // Busca e catálogo MATKL via SAP RFC
  const [matklSearchTerm, setMatklSearchTerm] = useState<string>('')
  const [matklCatalog, setMatklCatalog] = useState<MatklGroupItem[]>([])
  const [isMatklLoading, setIsMatklLoading] = useState<boolean>(false)
  const [matklRfcOffline, setMatklRfcOffline] = useState<boolean>(false)
  const [matklRfcMessage, setMatklRfcMessage] = useState<string | null>(null)
  const [matklLastSync, setMatklLastSync] = useState<string>('')

  // Datas
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Status
  const [status, setStatus] = useState<'Ativa' | 'Inativa'>('Ativa')

  // Feedback de erro / validação
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // Preencher formulário ao abrir ou alterar existingRule
  useEffect(() => {
    if (!open) return

    setErrorMessage(null)
    setSaving(false)

    if (existingRule) {
      setSourceCenterCode(existingRule.source_center_code || '')
      setSelectedMatklGroups(existingRule.matkl_groups || [])
      setStartDate(existingRule.start_date || '')
      setEndDate(existingRule.end_date || '')
      setStatus(existingRule.status || 'Ativa')
    } else {
      // Nova regra: valor default de data início (hoje em DD/MM/AAAA)
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      setSourceCenterCode('')
      setSelectedMatklGroups([])
      setStartDate(`${dd}/${mm}/${yyyy}`)
      setEndDate('')
      setStatus('Ativa')
    }

    // Carregar catálogo de Grupos de Mercadorias MATKL via SAP RFC
    loadMatklCatalog('')
  }, [open, existingRule])

  // Função para carregar MATKL com transparência RFC
  const loadMatklCatalog = async (search: string) => {
    setIsMatklLoading(true)
    try {
      const res = await sapMatklService.searchMatklGroups(search)
      setMatklCatalog(res.items)
      setMatklRfcOffline(res.is_offline)
      setMatklRfcMessage(res.message || null)
      setMatklLastSync(res.last_sync || '')
    } catch (err: any) {
      setMatklRfcOffline(true)
      setMatklRfcMessage(err.message || 'RFC SAP indisponível.')
    } finally {
      setIsMatklLoading(false)
    }
  }

  // Filtragem de centros disponíveis para origem
  const filteredSourceCenters = useMemo(() => {
    const curUpper = currentCenterCode.trim().toUpperCase()
    const search = sourceCenterSearch.trim().toLowerCase()

    return availableCenters.filter((c) => {
      // REGRA: Não permitir selecionar o próprio Centro
      if (c.code.trim().toUpperCase() === curUpper) return false

      // REGRA: Por padrão listar somente Centros ativos (a menos que o usuário ative o switch de inativos)
      const isActive = c.is_active !== false && c.status !== 'stopped'
      if (!showInactiveCenters && !isActive) return false

      if (!search) return true

      const fullString =
        `${c.code} ${c.name} ${c.company_name || ''} ${c.linha_produtiva_nome || ''} ${c.sap_plant_code || ''} ${c.sap_work_center || ''}`.toLowerCase()
      return fullString.includes(search)
    })
  }, [availableCenters, currentCenterCode, sourceCenterSearch, showInactiveCenters])

  // Objeto do centro selecionado
  const selectedCenterObj = useMemo(() => {
    return availableCenters.find(
      (c) => c.code.trim().toUpperCase() === sourceCenterCode.trim().toUpperCase(),
    )
  }, [availableCenters, sourceCenterCode])

  // Adicionar Grupo de Mercadorias (MATKL)
  const handleAddMatkl = (item: MatklGroupItem) => {
    const alreadyExists = selectedMatklGroups.some((g) => g.matkl === item.matkl)
    if (alreadyExists) {
      setErrorMessage(`O Grupo de Mercadorias MATKL ${item.matkl} já foi adicionado a esta regra.`)
      return
    }
    setErrorMessage(null)
    setSelectedMatklGroups((prev) => [...prev, item])
  }

  // Remover Grupo de Mercadorias
  const handleRemoveMatkl = (matklCode: string) => {
    setSelectedMatklGroups((prev) => prev.filter((g) => g.matkl !== matklCode))
  }

  // Formatação de data enquanto digita (DD/MM/AAAA)
  const handleDateInput = (val: string, setter: (v: string) => void) => {
    // Manter apenas dígitos e barras
    let clean = val.replace(/[^\d]/g, '')
    if (clean.length > 8) clean = clean.slice(0, 8)

    let formatted = clean
    if (clean.length > 2 && clean.length <= 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`
    } else if (clean.length > 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
    }
    setter(formatted)
  }

  // Validação e submissão
  const handleSave = async () => {
    setErrorMessage(null)

    // 1. Centro de origem obrigatório
    if (!sourceCenterCode.trim()) {
      setErrorMessage('O Centro de Origem é obrigatório.')
      return
    }

    // 2. Autorrelacionamento
    if (sourceCenterCode.trim().toUpperCase() === currentCenterCode.trim().toUpperCase()) {
      setErrorMessage('Um Centro não pode ser derivado dele mesmo.')
      return
    }

    // 3. Grupo de Mercadorias: exigir pelo menos 1
    if (selectedMatklGroups.length === 0) {
      setErrorMessage('Adicione pelo menos um Grupo de Mercadorias (MATKL) para esta regra.')
      return
    }

    // 4. Data de início obrigatória
    if (!startDate.trim() || startDate.trim().length < 10) {
      setErrorMessage('Informe a Data de Início válida no formato DD/MM/AAAA.')
      return
    }

    // 5. Data de término não pode ser < data início
    if (endDate.trim() && endDate.trim().length === 10) {
      const [sD, sM, sY] = startDate.split('/').map(Number)
      const [eD, eM, eY] = endDate.split('/').map(Number)
      const sDate = new Date(sY, sM - 1, sD)
      const eDate = new Date(eY, eM - 1, eD)

      if (eDate < sDate) {
        setErrorMessage('A Data de Término não pode ser anterior à Data de Início.')
        return
      }
    }

    setSaving(true)
    try {
      const ruleToSave: CenterDerivationRule = {
        id: existingRule?.id,
        center_code: currentCenterCode,
        source_center_code: sourceCenterCode.trim().toUpperCase(),
        source_center_name: selectedCenterObj?.name || existingRule?.source_center_name || '',
        source_center_sap:
          selectedCenterObj?.sap_work_center ||
          selectedCenterObj?.sap_plant_code ||
          existingRule?.source_center_sap ||
          '',
        source_center_company:
          selectedCenterObj?.company_name || existingRule?.source_center_company || 'CIAFAL',
        source_center_line:
          selectedCenterObj?.linha_produtiva_nome || existingRule?.source_center_line || '',
        matkl_groups: selectedMatklGroups,
        start_date: startDate.trim(),
        end_date: endDate.trim() ? endDate.trim() : undefined,
        status: status,
      }

      const res = await onSaveRule(ruleToSave)
      if (res !== false) {
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar a regra de derivação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-800 shadow-xl p-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="bg-[#004C97] text-white p-4 border-b border-blue-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-cyan-300">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                {existingRule ? 'Editar Regra de Derivação' : 'Criar Nova Regra de Derivação'}
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Centro de Destino:{' '}
                <strong className="text-white font-mono">{currentCenterCode}</strong>
                {currentCenterName ? ` — ${currentCenterName}` : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-5 text-xs">
          {/* Mensagem de Erro / Alerta Geral */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* 1. SELEÇÃO DE CENTRO DE ORIGEM */}
          <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#004C97]" />
                Centro de Origem / Centro do qual deriva <span className="text-rose-500">*</span>
              </Label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactiveCenters}
                  onChange={(e) => setShowInactiveCenters(e.target.checked)}
                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                />
                Exibir centros inativos
              </label>
            </div>

            {/* Filtro rápido de centros */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Pesquisar por código, nome, empresa, linha ou SAP..."
                value={sourceCenterSearch}
                onChange={(e) => setSourceCenterSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300"
              />
            </div>

            {/* Select customizado */}
            <select
              value={sourceCenterCode}
              onChange={(e) => setSourceCenterCode(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="">Selecione o Centro de Origem...</option>
              {filteredSourceCenters.map((c) => {
                const isActive = c.is_active !== false && c.status !== 'stopped'
                // Formato padrão: "FORNOL1 — Forno L1 — CIAFAL — L1 — SAP: FORNOL1"
                const formatLabel = `${c.code} — ${c.name} — ${c.company_name || 'CIAFAL'} — ${c.linha_produtiva_nome || c.code} — SAP: ${c.sap_work_center || c.sap_plant_code || c.code}${!isActive ? ' [INATIVO]' : ''}`
                return (
                  <option key={c.id || c.code} value={c.code}>
                    {formatLabel}
                  </option>
                )
              })}
            </select>

            {/* Alerta de Centro Inativo */}
            {selectedCenterObj &&
              (selectedCenterObj.is_active === false || selectedCenterObj.status === 'stopped') && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Atenção:</strong> O centro de origem selecionado (
                    {selectedCenterObj.code}) está atualmente <strong>INATIVO</strong> no cadastro
                    de Centros. Esta regra pode não ter efeito operacional enquanto o centro de
                    origem estiver inativo.
                  </div>
                </div>
              )}
          </div>

          {/* 2. GRUPO DE MERCADORIAS (SAP ECC via RFC MARA-MATKL) */}
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#004C97]" />
                  Grupo(s) de Mercadorias (SAP ECC RFC — MARA-MATKL){' '}
                  <span className="text-rose-500">*</span>
                </Label>
                <p className="text-[11px] text-slate-500">
                  Consulte por código MATKL ou descrição. Adicione um ou mais grupos a esta regra.
                </p>
              </div>

              {/* Botão de sincronização / status RFC */}
              <div className="flex items-center gap-2">
                {matklLastSync && (
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Sinc.: {matklLastSync}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMatklCatalog(matklSearchTerm)}
                  disabled={isMatklLoading}
                  className="h-7 text-[11px] px-2 text-[#004C97] hover:bg-blue-50"
                  title="Atualizar dados via RFC SAP"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1 ${isMatklLoading ? 'animate-spin' : ''}`}
                  />
                  RFC SAP
                </Button>
              </div>
            </div>

            {/* Mensagem clara quando a RFC estiver indisponível (critério estrito do usuário) */}
            {matklRfcOffline && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de Conectividade SAP ECC:</strong>{' '}
                  {matklRfcMessage ||
                    'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache homologado.'}
                </div>
              </div>
            )}

            {/* Barra de pesquisa de MATKL */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Pesquisar MATKL (ex: 001, tubos, perfis, barras...)"
                  value={matklSearchTerm}
                  onChange={(e) => {
                    const val = e.target.value
                    setMatklSearchTerm(val)
                    loadMatklCatalog(val)
                  }}
                  className="pl-8 h-8 text-xs bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Sugestões pesquisáveis rápidas */}
            <div className="max-h-36 overflow-y-auto border border-slate-200 bg-white rounded-md divide-y divide-slate-100 shadow-inner">
              {matklCatalog.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-[11px]">
                  {isMatklLoading
                    ? 'Consultando SAP ECC...'
                    : 'Nenhum Grupo de Mercadorias encontrado para este filtro.'}
                </div>
              ) : (
                matklCatalog.map((item) => {
                  const isAdded = selectedMatklGroups.some((g) => g.matkl === item.matkl)
                  return (
                    <div
                      key={item.matkl}
                      className="p-2 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] bg-slate-100 text-slate-700 font-bold"
                        >
                          MATKL {item.matkl}
                        </Badge>
                        <span className="text-slate-800 font-medium">{item.description}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isAdded ? 'secondary' : 'default'}
                        disabled={isAdded}
                        onClick={() => handleAddMatkl(item)}
                        className={`h-6 text-[11px] px-2 gap-1 ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-[#004C97] hover:bg-[#003870] text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Adicionado
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Adicionar
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Grupos selecionados exibidos como chips/tags com remoção individual */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Grupos Selecionados na Regra ({selectedMatklGroups.length}):
              </span>
              {selectedMatklGroups.length === 0 ? (
                <div className="p-3 bg-white border border-dashed border-slate-300 rounded-md text-center text-slate-500 text-[11px]">
                  Nenhum grupo de mercadorias adicionado. Clique em "+ Adicionar" acima para
                  vincular.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-md">
                  {selectedMatklGroups.map((g) => (
                    <div
                      key={g.matkl}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-blue-50 border border-blue-200 text-[#004C97] rounded-md text-[11px] font-medium"
                    >
                      <span className="font-mono font-bold">MATKL {g.matkl}</span>
                      <span className="text-slate-700 text-[10px] max-w-[180px] truncate">
                        — {g.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMatkl(g.matkl)}
                        className="text-slate-400 hover:text-rose-600 rounded p-0.5"
                        title="Remover grupo desta regra"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. PERÍODO DE VALIDADE E STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            {/* Data Início */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                Data Início <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="DD/MM/AAAA"
                value={startDate}
                onChange={(e) => handleDateInput(e.target.value, setStartDate)}
                className="h-8 text-xs font-mono bg-white border-slate-300"
              />
              <span className="text-[10px] text-slate-500">Obrigatória (DD/MM/AAAA)</span>
            </div>

            {/* Data Fim */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                Data Fim (Opcional)
              </Label>
              <Input
                placeholder="DD/MM/AAAA"
                value={endDate}
                onChange={(e) => handleDateInput(e.target.value, setEndDate)}
                className="h-8 text-xs font-mono bg-white border-slate-300"
              />
              <span className="text-[10px] text-slate-500">Vazia = Prazo indeterminado</span>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800">Status da Regra</Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={status === 'Ativa'}
                  onCheckedChange={(checked) => setStatus(checked ? 'Ativa' : 'Inativa')}
                />
                <Badge
                  className={
                    status === 'Ativa'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-400 text-white font-bold'
                  }
                >
                  {status}
                </Badge>
              </div>
              <span className="text-[10px] text-slate-500">
                Inativas são mantidas para auditoria
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <DialogFooter className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="h-8 text-xs bg-white text-slate-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold gap-1.5"
          >
            {saving
              ? 'Validando e salvando...'
              : existingRule
                ? 'Salvar Alterações'
                : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
