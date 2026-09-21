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
import { sapWerksService, SapWerksItem } from '@/services/sap-werks-service'

interface CenterDerivationModalProps {
  open: boolean
  onClose: () => void
  currentCenterCode: string
  currentCenterName?: string
  availableCenters: ProductionLine[]
  existingRule?: CenterDerivationRule | null
  onSaveRule: (
    rule: CenterDerivationRule,
    options?: { signal?: AbortSignal },
  ) => Promise<boolean | void>
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
  const [selectedWerks, setSelectedWerks] = useState<string>('')
  const [werksCatalog, setWerksCatalog] = useState<SapWerksItem[]>([])
  const [isWerksLoading, setIsWerksLoading] = useState<boolean>(false)
  const [werksError, setWerksError] = useState<string | null>(null)
  const [sourceCenterCode, setSourceCenterCode] = useState<string>('')
  const [sourceCenterSearch, setSourceCenterSearch] = useState<string>('')
  const [showInactiveCenters, setShowInactiveCenters] = useState<boolean>(false)

  // Dirty State (aviso de alterações não salvas ao cancelar)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState<boolean>(false)

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
      setSelectedWerks(existingRule.source_center_werks || '')
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
      setSelectedWerks('1000')
      setStartDate(`${dd}/${mm}/${yyyy}`)
      setEndDate('')
      setStatus('Ativa')
    }

    setIsDirty(false)
    setShowCancelConfirmDialog(false)

    // Carregar WERKS via RFC
    loadWerksCatalog('')
    // Carregar catálogo de Grupos de Mercadorias MATKL via SAP RFC
    loadMatklCatalog('')
  }, [open, existingRule])

  const loadWerksCatalog = async (search: string) => {
    setIsWerksLoading(true)
    setWerksError(null)
    try {
      const res = await sapWerksService.getWerksList(search)
      if (res.is_offline && res.error_message) {
        setWerksError(res.error_message)
      } else {
        setWerksCatalog(res.items)
        if (!selectedWerks && res.items.length > 0) {
          setSelectedWerks(res.items[0].werks)
        }
      }
    } catch {
      setWerksError(
        'Não foi possível consultar as empresas/unidades no SAP via RFC. Verifique a integração WERKS e tente novamente.',
      )
    } finally {
      setIsWerksLoading(false)
    }
  }

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

  // Filtragem de centros disponíveis para origem: fonte EXCLUSIVA Centros e Ficha Mestre
  // Sem filtro WERKS intermediário. Bloqueio de autorrelacionamento e busca unificada.
  const filteredSourceCenters = useMemo(() => {
    const curUpper = currentCenterCode.trim().toUpperCase()
    const search = sourceCenterSearch.trim().toLowerCase()

    return availableCenters.filter((c) => {
      // REGRA: Bloquear autorrelacionamento (não permitir o próprio centro como origem)
      if (c.code.trim().toUpperCase() === curUpper) return false

      // REGRA: Por padrão mostrar apenas ativos, com toggle para exibir inativos
      const isActive = c.is_active !== false && c.status !== 'stopped'
      if (!showInactiveCenters && !isActive) return false

      if (!search) return true

      // Busca única por código interno, nome oficial, Centro SAP, linha e empresa
      const sapCode = c.sap_work_center || c.sap_plant_code || ''
      const lineName = c.linha_produtiva_nome || ''
      const company = c.company_name || ''
      const fullString = `${c.code} ${c.name} ${sapCode} ${lineName} ${company}`.toLowerCase()
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
    setIsDirty(true)
    setSelectedMatklGroups((prev) => [...prev, item])
  }

  // Remover Grupo de Mercadorias
  const handleRemoveMatkl = (matklCode: string) => {
    setIsDirty(true)
    setSelectedMatklGroups((prev) => prev.filter((g) => g.matkl !== matklCode))
  }

  const handleRequestCancel = () => {
    if (isDirty) {
      setShowCancelConfirmDialog(true)
    } else {
      onClose()
    }
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

  // Validação e submissão com bloqueio de duplo clique e timeout de 15s
  const handleSave = async () => {
    if (saving) return
    setErrorMessage(null)

    // 1. Centro de origem obrigatório
    if (!sourceCenterCode.trim()) {
      setErrorMessage('Centro de Origem não informado.')
      return
    }

    // 2. Autorrelacionamento
    if (sourceCenterCode.trim().toUpperCase() === currentCenterCode.trim().toUpperCase()) {
      setErrorMessage(
        'Esta relação gera uma dependência circular: o Centro não pode derivar dele mesmo.',
      )
      return
    }

    // 3. Grupo de Mercadorias: exigir pelo menos 1
    if (selectedMatklGroups.length === 0) {
      setErrorMessage('Selecione pelo menos um MATKL.')
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
        setErrorMessage('A Data Fim deve ser maior ou igual à Data Início.')
        return
      }
    }

    setSaving(true)

    // Timeout de 15 segundos com AbortController
    const controller = new AbortController()
    const timeoutTimer = setTimeout(() => {
      controller.abort()
    }, 15000)

    try {
      // Resolver IDs relacionais
      const currentCenterObj = availableCenters.find(
        (c) => c.code.trim().toUpperCase() === currentCenterCode.trim().toUpperCase(),
      )
      const srcLine = selectedCenterObj

      const ruleToSave: CenterDerivationRule = {
        id: existingRule?.id,
        center_code: currentCenterCode,
        center_id: currentCenterObj?.id || (existingRule as any)?.center_id,
        source_center_code: sourceCenterCode.trim().toUpperCase(),
        source_center_id: srcLine?.id || (existingRule as any)?.source_center_id,
        source_center_name: srcLine?.name || existingRule?.source_center_name || '',
        source_center_sap:
          srcLine?.sap_work_center ||
          srcLine?.sap_plant_code ||
          existingRule?.source_center_sap ||
          '',
        source_center_company:
          srcLine?.company_name || existingRule?.source_center_company || 'CIAFAL',
        source_center_werks:
          selectedWerks || srcLine?.sap_plant_code || existingRule?.source_center_werks || '1000',
        source_center_line: srcLine?.linha_produtiva_nome || existingRule?.source_center_line || '',
        matkl_groups: selectedMatklGroups,
        start_date: startDate.trim(),
        end_date: endDate.trim() ? endDate.trim() : undefined,
        status: status,
      }

      const res = await onSaveRule(ruleToSave, { signal: controller.signal })
      clearTimeout(timeoutTimer)
      if (res !== false) {
        setIsDirty(false)
        onClose()
      }
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      const rawMsg = err?.message || ''
      if (
        controller.signal.aborted ||
        rawMsg.includes('tempo de resposta') ||
        rawMsg.includes('excedeu')
      ) {
        setErrorMessage(
          'Não foi possível salvar a Derivação — A operação excedeu o tempo de resposta. Tente novamente ou consulte os Logs de Integração.',
        )
      } else if (rawMsg.includes('circular') || rawMsg.includes('dependência')) {
        setErrorMessage('Esta relação gera uma dependência circular.')
      } else if (
        rawMsg.includes('combinação') ||
        rawMsg.includes('duplicada') ||
        rawMsg.includes('duplicidade') ||
        rawMsg.includes('Já existe')
      ) {
        setErrorMessage('Já existe uma Derivação com esta combinação.')
      } else if (rawMsg.includes('Data Fim') || rawMsg.includes('Data de Término')) {
        setErrorMessage('A Data Fim deve ser maior ou igual à Data Início.')
      } else if (rawMsg.includes('Centro de Origem') || rawMsg.includes('dele mesmo')) {
        setErrorMessage(rawMsg)
      } else if (rawMsg.includes('MATKL') || rawMsg.includes('Mercadorias')) {
        setErrorMessage('Selecione pelo menos um MATKL.')
      } else if (rawMsg) {
        setErrorMessage(rawMsg)
      } else {
        setErrorMessage('Falha ao persistir a Derivação no banco de dados.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && handleRequestCancel()}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-800 shadow-xl p-0 flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header Fixo */}
          <DialogHeader className="bg-[#004C97] text-white p-4 border-b border-blue-900 shrink-0">
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

          {/* Conteúdo com Scroll vertical */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
            {/* Mensagem de Erro / Alerta Geral */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-800 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* 1. TOPO: Empresa / Unidade (Integração SAP RFC - WERKS) */}
            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#004C97]" />
                  Empresa / Unidade (Integração SAP RFC — WERKS){' '}
                  <span className="text-rose-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadWerksCatalog('')}
                  disabled={isWerksLoading}
                  className="h-6 text-[10px] px-2 text-[#004C97] hover:bg-blue-50"
                  title="Atualizar empresas via SAP RFC"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isWerksLoading ? 'animate-spin' : ''}`} />
                  Atualizar WERKS
                </Button>
              </div>

              {werksError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{werksError}</span>
                </div>
              )}

              <select
                value={selectedWerks}
                onChange={(e) => {
                  setSelectedWerks(e.target.value)
                  setIsDirty(true)
                }}
                className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="">Selecione a Empresa / Unidade WERKS...</option>
                {werksCatalog.map((w) => (
                  <option key={w.werks} value={w.werks}>
                    {sapWerksService.formatWerksLabel(w)}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. CENTRO DE ORIGEM (Fonte EXCLUSIVA: Centros e Ficha Mestre) */}
            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#004C97]" />
                  Centro de Origem *
                </Label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactiveCenters}
                    onChange={(e) => setShowInactiveCenters(e.target.checked)}
                    className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                  />
                  ☐ Exibir Centros inativos
                </label>
              </div>

              {/* Único campo de busca */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Pesquisar Centro..."
                  value={sourceCenterSearch}
                  onChange={(e) => setSourceCenterSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-300"
                />
              </div>

              {/* Seletor "Selecione o Centro de Origem": "Código — Nome Oficial" + "Centro SAP" */}
              <select
                value={sourceCenterCode}
                onChange={(e) => {
                  const val = e.target.value
                  if (val.trim().toUpperCase() === currentCenterCode.trim().toUpperCase()) {
                    setErrorMessage(
                      'O Centro não pode ser derivado dele mesmo. Selecione outro Centro de Origem.',
                    )
                    return
                  }
                  setErrorMessage(null)
                  setSourceCenterCode(val)
                  setIsDirty(true)
                }}
                className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="">Selecione o Centro de Origem...</option>
                {filteredSourceCenters.map((c) => {
                  const isActive = c.is_active !== false && c.status !== 'stopped'
                  const sapCode = c.sap_work_center || c.sap_plant_code || ''
                  const sapPart = sapCode ? ` — SAP: ${sapCode}` : ''
                  const inactivePart = !isActive ? ' — INATIVO' : ''
                  const label = `${c.code} — ${c.name}${sapPart}${inactivePart}`
                  return (
                    <option key={c.id || c.code} value={c.code}>
                      {label}
                    </option>
                  )
                })}
              </select>

              {/* Alerta de Centro Inativo */}
              {selectedCenterObj &&
                (selectedCenterObj.is_active === false ||
                  selectedCenterObj.status === 'stopped') && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-800 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Atenção:</strong> O Centro de Origem selecionado (
                      {selectedCenterObj.code}) está atualmente <strong>INATIVO</strong> no cadastro
                      de Centros.
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

          {/* Rodapé FIXO/STICKY com [Cancelar] e [Salvar Derivação] */}
          <DialogFooter className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between sm:justify-between shrink-0 sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestCancel}
              disabled={saving}
              className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold gap-1.5 shadow-xs"
            >
              {saving ? 'Salvando...' : 'Salvar Derivação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de Cancelar com dirty-state */}
      {showCancelConfirmDialog && (
        <Dialog open={showCancelConfirmDialog} onOpenChange={setShowCancelConfirmDialog}>
          <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Alterações não salvas
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-slate-600 py-2">
              Existem alterações nesta Regra de Derivação que ainda não foram salvas.
            </p>
            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirmDialog(false)}
                className="text-xs"
              >
                Continuar editando
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowCancelConfirmDialog(false)
                  setIsDirty(false)
                  onClose()
                }}
                className="text-xs"
              >
                Descartar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
