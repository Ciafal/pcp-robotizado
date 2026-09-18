import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Box, Save, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import {
  LineBufferRecord,
  BufferPosition,
  BufferType,
  BufferUnit,
  BufferStatus,
  BufferStockSource,
} from '@/types/line-buffers'
import { LineBuffersService, SaveBufferInput } from '@/services/line-buffers-service'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

interface LineBufferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bufferToEdit?: LineBufferRecord | null
  initialRouteCode?: string
  initialLineCode?: string
  onSuccess: (saved: LineBufferRecord) => void
}

export const LineBufferModal: React.FC<LineBufferModalProps> = ({
  open,
  onOpenChange,
  bufferToEdit,
  initialRouteCode,
  initialLineCode,
  onSuccess,
}) => {
  const { toast } = useToast()

  // Dados auxiliares carregados do backend
  const [companies, setCompanies] = useState<
    Array<{ id: string; code: string; name: string; sap_company_code?: string }>
  >([])
  const [lines, setLines] = useState<
    Array<{ id: string; code: string; name: string; is_active?: boolean }>
  >([])
  const [routes, setRoutes] = useState<
    Array<{ id: string; code: string; description: string; nodes?: any[]; edges?: any[] }>
  >([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  // 17 Campos em ordem:
  // 1. Empresa*
  const [companyCode, setCompanyCode] = useState<string>('CIAFAL')
  // 2. Linha*
  const [lineCode, setLineCode] = useState<string>('')
  // 3. Rota Produtiva*
  const [routeCode, setRouteCode] = useState<string>('')
  // 4. Centro*
  const [centerCode, setCenterCode] = useState<string>('')
  // 5. Centro Relacionado*
  const [relatedCenterCode, setRelatedCenterCode] = useState<string>('')
  // 6. Posição do Buffer*
  const [position, setPosition] = useState<BufferPosition>('Saída do Centro')
  // 7. Tipo de Buffer/Pulmão*
  const [bufferType, setBufferType] = useState<BufferType>('Buffer Operacional')
  // 8. Unidade de Medida*
  const [unitOfMeasure, setUnitOfMeasure] = useState<BufferUnit>('t')
  // 9. Capacidade Mínima*
  const [minCapacity, setMinCapacity] = useState<string>('')
  // 10. Capacidade Ideal/Operacional*
  const [idealCapacity, setIdealCapacity] = useState<string>('')
  // 11. Capacidade Máxima*
  const [maxCapacity, setMaxCapacity] = useState<string>('')
  // 12. Limite de Alerta Inferior
  const [alertLowerLimit, setAlertLowerLimit] = useState<string>('')
  // 13. Limite de Alerta Superior
  const [alertUpperLimit, setAlertUpperLimit] = useState<string>('')
  // 14. Status*
  const [status, setStatus] = useState<BufferStatus>('Ativo')
  // 15. Vigência Inicial*
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().split('T')[0])
  // 16. Vigência Final*
  const [validUntil, setValidUntil] = useState<string>('2026-12-31')
  // 17. Observação
  const [observation, setObservation] = useState<string>('')

  // Fonte do Estoque e Configurações Adicionais
  const [stockSource, setStockSource] = useState<BufferStockSource>('MES 4.0')
  const [sourceDeposito, setSourceDeposito] = useState<string>('DP07')
  const [sourceLocalizacao, setSourceLocalizacao] = useState<string>('')
  const [sourceCentro, setSourceCentro] = useState<string>('')
  const [sourceCampo, setSourceCampo] = useState<string>('')
  const [sourceMaterialFamilia, setSourceMaterialFamilia] = useState<string>('')
  const [sourceOrigem, setSourceOrigem] = useState<string>('')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Carregar dados de Empresas, Linhas e Rotas do backend
  useEffect(() => {
    if (!open) return
    let isMounted = true

    async function loadData() {
      setLoadingLookups(true)
      try {
        const [compList, linesList, routesList] = await Promise.all([
          pb
            .collection('companies')
            .getFullList({ filter: "status = 'ACTIVE' || status = null", sort: 'code' })
            .catch(() => []),
          pb
            .collection('production_lines')
            .getFullList({ sort: 'code' })
            .catch(() => []),
          pb
            .collection('production_routes')
            .getFullList({ sort: 'code' })
            .catch(() => []),
        ])

        if (!isMounted) return
        setCompanies(
          compList.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            sap_company_code: c.sap_company_code,
          })),
        )
        setLines(
          linesList.map((l: any) => ({
            id: l.id,
            code: l.code,
            name: l.name,
            is_active: l.is_active,
          })),
        )

        // Buscar nodes de cada rota para montar o grafo de centros
        const routesWithNodes = await Promise.all(
          routesList.map(async (r: any) => {
            const [nodes, edges] = await Promise.all([
              pb
                .collection('production_route_nodes')
                .getFullList({ filter: `route_id = '${r.id}'`, sort: 'logical_order' })
                .catch(() => []),
              pb
                .collection('production_route_edges')
                .getFullList({ filter: `route_id = '${r.id}'` })
                .catch(() => []),
            ])
            return {
              id: r.id,
              code: r.code,
              description: r.description || r.code,
              nodes,
              edges,
            }
          }),
        )
        if (isMounted) {
          setRoutes(routesWithNodes)
        }
      } catch (err) {
        console.error('Erro ao carregar lookups de buffers:', err)
      } finally {
        if (isMounted) setLoadingLookups(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [open])

  // Inicializar formulário para criação ou edição
  useEffect(() => {
    if (!open) return

    setErrorMessage(null)

    if (bufferToEdit) {
      setCompanyCode(bufferToEdit.company_code || 'CIAFAL')
      setLineCode(bufferToEdit.line_code || '')
      setRouteCode(bufferToEdit.route_code || '')
      setCenterCode(bufferToEdit.center_code || '')
      setRelatedCenterCode(bufferToEdit.related_center_code || '')
      setPosition(bufferToEdit.position || 'Saída do Centro')
      setBufferType(bufferToEdit.buffer_type || 'Buffer Operacional')
      setUnitOfMeasure(bufferToEdit.unit_of_measure || 't')
      setMinCapacity(
        bufferToEdit.min_capacity !== undefined ? String(bufferToEdit.min_capacity) : '',
      )
      setIdealCapacity(
        bufferToEdit.ideal_capacity !== undefined ? String(bufferToEdit.ideal_capacity) : '',
      )
      setMaxCapacity(
        bufferToEdit.max_capacity !== undefined ? String(bufferToEdit.max_capacity) : '',
      )
      setAlertLowerLimit(
        bufferToEdit.alert_lower_limit !== null && bufferToEdit.alert_lower_limit !== undefined
          ? String(bufferToEdit.alert_lower_limit)
          : '',
      )
      setAlertUpperLimit(
        bufferToEdit.alert_upper_limit !== null && bufferToEdit.alert_upper_limit !== undefined
          ? String(bufferToEdit.alert_upper_limit)
          : '',
      )
      setStatus(bufferToEdit.status || 'Ativo')
      setValidFrom(
        bufferToEdit.valid_from
          ? bufferToEdit.valid_from.split('T')[0]
          : new Date().toISOString().split('T')[0],
      )
      setValidUntil(
        bufferToEdit.valid_until ? bufferToEdit.valid_until.split('T')[0] : '2026-12-31',
      )
      setObservation(bufferToEdit.observation || '')
      setStockSource(bufferToEdit.stock_source || 'MES 4.0')

      const cfg = bufferToEdit.source_config || {}
      setSourceDeposito(cfg.deposito || 'DP07')
      setSourceLocalizacao(cfg.localizacao || '')
      setSourceCentro(cfg.centro || '')
      setSourceCampo(cfg.campo || '')
      setSourceMaterialFamilia(cfg.material_familia || '')
      setSourceOrigem(cfg.origem || '')
    } else {
      // Criação nova com valores padrão
      setCompanyCode('CIAFAL')
      setLineCode(initialLineCode || '')
      setRouteCode(initialRouteCode || '')
      setCenterCode('')
      setRelatedCenterCode('')
      setPosition('Saída do Centro')
      setBufferType('Buffer Operacional')
      setUnitOfMeasure('t')
      setMinCapacity('')
      setIdealCapacity('')
      setMaxCapacity('')
      setAlertLowerLimit('')
      setAlertUpperLimit('')
      setStatus('Ativo')
      setValidFrom(new Date().toISOString().split('T')[0])
      setValidUntil('2026-12-31')
      setObservation('')
      setStockSource('MES 4.0')
      setSourceDeposito('DP07')
      setSourceLocalizacao('')
      setSourceCentro('')
      setSourceCampo('')
      setSourceMaterialFamilia('')
      setSourceOrigem('')
    }
  }, [open, bufferToEdit, initialRouteCode, initialLineCode])

  // Rota selecionada
  const selectedRouteObj = routes.find((r) => r.code === routeCode)

  // Centros elegíveis: apenas centros pertencentes à rota escolhida
  const availableCentersInRoute: string[] = React.useMemo(() => {
    if (!selectedRouteObj || !selectedRouteObj.nodes || selectedRouteObj.nodes.length === 0) {
      // Fallback para linhas ativas se rota não tiver nós
      return lines.map((l) => l.code)
    }
    const centerSet = new Set<string>()
    selectedRouteObj.nodes.forEach((n: any) => {
      if (n.line_code) centerSet.add(n.line_code)
    })
    return Array.from(centerSet)
  }, [selectedRouteObj, lines])

  // Centros Relacionados: calculados do grafo da rota (apenas IMEDIATAMENTE anteriores/posteriores)
  const availableRelatedCenters: string[] = React.useMemo(() => {
    if (!centerCode) return []
    if (selectedRouteObj && selectedRouteObj.nodes && selectedRouteObj.nodes.length > 0) {
      return LineBuffersService.getImmediatelyRelatedCenters(
        centerCode,
        selectedRouteObj.nodes,
        selectedRouteObj.edges || [],
      )
    }
    // Fallback: se não houver nós de rota, centros da rota exceto o próprio
    return availableCentersInRoute.filter((c) => c !== centerCode)
  }, [centerCode, selectedRouteObj, availableCentersInRoute])

  // Ao mudar a rota, se o centro atual não pertencer a ela, limpar
  useEffect(() => {
    if (centerCode && !availableCentersInRoute.includes(centerCode)) {
      setCenterCode('')
      setRelatedCenterCode('')
    }
  }, [routeCode, availableCentersInRoute, centerCode])

  // Ao mudar o centro, verificar se o centro relacionado continua válido
  useEffect(() => {
    if (relatedCenterCode && !availableRelatedCenters.includes(relatedCenterCode)) {
      setRelatedCenterCode('')
    }
  }, [centerCode, availableRelatedCenters, relatedCenterCode])

  // Salvar Buffer (Criação ou Edição)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validar regras e mensagens exatas antes de enviar
    const min = Number(minCapacity)
    const ideal = Number(idealCapacity)
    const max = Number(maxCapacity)

    if (isNaN(min) || isNaN(ideal) || isNaN(max)) {
      setErrorMessage('Preencha valores numéricos válidos para as capacidades.')
      return
    }

    if (ideal < min) {
      setErrorMessage('A capacidade operacional deve ser maior ou igual à capacidade mínima.')
      return
    }
    if (ideal > max) {
      setErrorMessage('A capacidade operacional não pode ser superior à capacidade máxima.')
      return
    }

    if (!validFrom || !validUntil) {
      setErrorMessage('Vigência Inicial e Vigência Final são obrigatórias.')
      return
    }

    if (new Date(validUntil).getTime() < new Date(validFrom).getTime()) {
      setErrorMessage('A Vigência Final deve ser maior ou igual à Vigência Inicial.')
      return
    }

    setIsSubmitting(true)

    try {
      const selectedCompany = companies.find((c) => c.code === companyCode)
      const selectedLine = lines.find((l) => l.code === lineCode)
      const selectedRoute = routes.find((r) => r.code === routeCode)

      const payload: SaveBufferInput = {
        id: bufferToEdit?.id,
        company_id: selectedCompany?.id,
        company_code: companyCode,
        line_id: selectedLine?.id,
        line_code: lineCode,
        route_id: selectedRoute?.id,
        route_code: routeCode,
        center_code: centerCode,
        related_center_code: relatedCenterCode,
        position,
        buffer_type: bufferType,
        unit_of_measure: unitOfMeasure,
        min_capacity: min,
        ideal_capacity: ideal,
        max_capacity: max,
        alert_lower_limit: alertLowerLimit !== '' ? Number(alertLowerLimit) : null,
        alert_upper_limit: alertUpperLimit !== '' ? Number(alertUpperLimit) : null,
        status,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: new Date(validUntil).toISOString(),
        observation,
        stock_source: stockSource,
        source_config: {
          deposito: sourceDeposito || undefined,
          localizacao: sourceLocalizacao || undefined,
          centro: sourceCentro || undefined,
          campo: sourceCampo || undefined,
          material_familia: sourceMaterialFamilia || undefined,
          origem: sourceOrigem || undefined,
        },
      }

      const saved = await LineBuffersService.saveBuffer(payload)

      toast({
        title: bufferToEdit ? 'Buffer Atualizado' : 'Buffer Cadastrado',
        description: `Buffer ${saved.center_code} ➔ ${saved.related_center_code} persistido com sucesso no banco.`,
      })

      onSuccess(saved)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar buffer:', err)
      setErrorMessage(err.message || 'Erro inesperado ao salvar o buffer no backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {bufferToEdit
                    ? 'Editar Buffer / Pulmão Produtivo'
                    : 'Novo Buffer / Pulmão Produtivo'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Parametrização determinística por ROTA + CENTRO + CENTRO RELACIONADO.
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                status === 'Ativo'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[11px]'
                  : 'bg-slate-100 text-slate-700 border-slate-300 font-mono text-[11px]'
              }
            >
              {status}
            </Badge>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro de Validação</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* BLOCO A: VÍNCULOS HIERÁRQUICOS (Campos 1 a 5) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                A
              </span>
              1. Vínculo Hierárquico (Empresa, Linha, Rota N:N e Centros Relacionados)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Empresa* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  1. Empresa *
                </label>
                <select
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  disabled={loadingLookups}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} {c.sap_company_code ? `(WERKS ${c.sap_company_code})` : ''} -{' '}
                      {c.name}
                    </option>
                  ))}
                  {companies.length === 0 && <option value="CIAFAL">CIAFAL (1000)</option>}
                </select>
              </div>

              {/* 2. Linha* (Filtrada pela empresa, da hierarquia) */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  2. Linha Produtiva *
                </label>
                <select
                  value={lineCode}
                  onChange={(e) => setLineCode(e.target.value)}
                  disabled={loadingLookups}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="">Selecione a Linha da Hierarquia...</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name} {l.is_active === false ? '(Inativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Rota Produtiva* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  3. Rota Produtiva N:N *
                </label>
                <select
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  disabled={loadingLookups}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="">Selecione a Rota de Sequenciamento...</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.code} - {r.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              {/* 4. Centro* (Filtrado pelos centros pertencentes à rota) */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  4. Centro (da Rota) *
                </label>
                <select
                  value={centerCode}
                  onChange={(e) => setCenterCode(e.target.value)}
                  disabled={!routeCode || availableCentersInRoute.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="">
                    {routeCode
                      ? 'Selecione o Centro pertencente à rota...'
                      : 'Primeiro selecione uma Rota'}
                  </option>
                  {availableCentersInRoute.map((c) => (
                    <option key={c} value={c}>
                      Centro: {c}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Exibe apenas centros que participam da rota escolhida.
                </span>
              </div>

              {/* 5. Centro Relacionado* (Grafo: apenas imediatamente anteriores/posteriores) */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  5. Centro Relacionado (Adjacente na Rota) *
                </label>
                <select
                  value={relatedCenterCode}
                  onChange={(e) => setRelatedCenterCode(e.target.value)}
                  disabled={!centerCode || availableRelatedCenters.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="">
                    {centerCode ? 'Selecione o Centro Adjacente...' : 'Primeiro selecione o Centro'}
                  </option>
                  {availableRelatedCenters.map((rc) => (
                    <option key={rc} value={rc}>
                      Adjacente: {rc}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Calculado do grafo da rota: centros imediatamente anteriores ou posteriores.
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO B: CLASSIFICAÇÃO E UNIDADE (Campos 6 a 8) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                B
              </span>
              2. Classificação Física & Operacional
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 6. Posição do Buffer* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  6. Posição do Buffer *
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as BufferPosition)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="Entrada do Centro">Entrada do Centro</option>
                  <option value="Saída do Centro">Saída do Centro</option>
                  <option value="Entre Centros">Entre Centros</option>
                </select>
              </div>

              {/* 7. Tipo de Buffer/Pulmão* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  7. Tipo de Buffer/Pulmão *
                </label>
                <select
                  value={bufferType}
                  onChange={(e) => setBufferType(e.target.value as BufferType)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="Buffer Físico">Buffer Físico</option>
                  <option value="Buffer Operacional">Buffer Operacional</option>
                  <option value="Buffer de Segurança">Buffer de Segurança</option>
                  <option value="Pulmão de Produção">Pulmão de Produção</option>
                  <option value="Pulmão Intermediário">Pulmão Intermediário</option>
                </select>
              </div>

              {/* 8. Unidade de Medida* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  8. Unidade de Medida *
                </label>
                <select
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value as BufferUnit)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 text-xs font-mono focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="t">t (Toneladas)</option>
                  <option value="kg">kg (Quilogramas)</option>
                  <option value="peças">peças</option>
                  <option value="unidades">unidades</option>
                  <option value="barras">barras</option>
                  <option value="tarugos">tarugos</option>
                  <option value="palanquilhas">palanquilhas</option>
                </select>
              </div>
            </div>
          </div>

          {/* BLOCO C: CAPACIDADES E LIMITES DE ALERTA (Campos 9 a 13) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                C
              </span>
              3. Capacidades & Limites de Alerta (Regra: Mínimo &le; Ideal &le; Máximo)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* 9. Capacidade Mínima* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  9. Capacidade Mínima * ({unitOfMeasure})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  placeholder="Ex: 15"
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              {/* 10. Capacidade Ideal/Operacional* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  10. Capacidade Ideal/Operacional * ({unitOfMeasure})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={idealCapacity}
                  onChange={(e) => setIdealCapacity(e.target.value)}
                  placeholder="Ex: 30"
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              {/* 11. Capacidade Máxima* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  11. Capacidade Máxima * ({unitOfMeasure})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="Ex: 100"
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {/* 12. Limite de Alerta Inferior */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  12. Limite de Alerta Inferior ({unitOfMeasure}) [Opcional]
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={alertLowerLimit}
                  onChange={(e) => setAlertLowerLimit(e.target.value)}
                  placeholder="Ex: 18 (Gera Atenção: Próximo do Mínimo)"
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>

              {/* 13. Limite de Alerta Superior */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  13. Limite de Alerta Superior ({unitOfMeasure}) [Opcional]
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={alertUpperLimit}
                  onChange={(e) => setAlertUpperLimit(e.target.value)}
                  placeholder="Ex: 90 (Gera Atenção: Próximo do Máximo)"
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* BLOCO D: STATUS, VIGÊNCIA E OBSERVAÇÃO (Campos 14 a 17) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                D
              </span>
              4. Governança, Vigência & Observações
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 14. Status* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  14. Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BufferStatus)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              {/* 15. Vigência Inicial* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  15. Vigência Inicial *
                </label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>

              {/* 16. Vigência Final* */}
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  16. Vigência Final *
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-white border-slate-300 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* 17. Observação */}
            <div className="text-xs">
              <label className="block text-slate-700 mb-1 font-mono font-medium">
                17. Observação [Opcional]
              </label>
              <Input
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Pulmão crítico para resfriamento antes do corte final"
                className="bg-white border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* BLOCO E: FONTE DO ESTOQUE / QUANTIDADE ATUAL */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center text-[10px]">
                  E
                </span>
                5. Fonte do Estoque / Quantidade Atual (6 Opções Integradas)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                O valor Atual NUNCA é digitado manualmente.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Fonte Integrada de Apontamento *
                </label>
                <select
                  value={stockSource}
                  onChange={(e) => setStockSource(e.target.value as BufferStockSource)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 text-xs font-mono focus:ring-1 focus:ring-[#004C97] outline-none"
                  required
                >
                  <option value="WMS">WMS</option>
                  <option value="SAP">SAP</option>
                  <option value="MES 4.0">MES 4.0</option>
                  <option value="Banco Industrial">Banco Industrial</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Apontamento Manual Controlado">
                    Apontamento Manual Controlado
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Depósito SAP / WMS
                </label>
                <Input
                  value={sourceDeposito}
                  onChange={(e) => setSourceDeposito(e.target.value)}
                  placeholder="Ex: DP07, DP04, DP01..."
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Localização / Baia
                </label>
                <Input
                  value={sourceLocalizacao}
                  onChange={(e) => setSourceLocalizacao(e.target.value)}
                  placeholder="Ex: BAIA-01, ESTEIRA-02..."
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Centro Operacional
                </label>
                <Input
                  value={sourceCentro}
                  onChange={(e) => setSourceCentro(e.target.value)}
                  placeholder="Ex: CR_ESTRUT, WC-CTG-ENDIR..."
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Campo / Tag de Telemetria
                </label>
                <Input
                  value={sourceCampo}
                  onChange={(e) => setSourceCampo(e.target.value)}
                  placeholder="Ex: PESO_LIQ, BALANCA_01..."
                  className="bg-white border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-xs"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSubmitting
                ? 'Salvando no Banco...'
                : bufferToEdit
                  ? 'Atualizar Buffer'
                  : 'Salvar Buffer / Pulmão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
