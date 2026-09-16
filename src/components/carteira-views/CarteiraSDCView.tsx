import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Eye,
  Download,
  UploadCloud,
  ArrowUpDown,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import {
  CarteiraSDCItem,
  CarteiraSDCKpis,
  StatusCarteiraSDC,
  OrigemProducaoSDC,
  CarteiraSDCImportRow,
} from '@/types/carteira-sdc'
import { CarteiraSDCEngine } from '@/services/carteira-sdc-engine'
import { DetalheMaterialSDCModal } from './DetalheMaterialSDCModal'
import { ImportacaoCarteiraSDCModal } from './ImportacaoCarteiraSDCModal'

interface CarteiraSDCViewProps {
  itens: CarteiraSDCItem[]
  kpis: CarteiraSDCKpis
  fonteAtual: 'Carga QAS' | 'SAP ECC'
  dataAtualizacao: string
  analisesIA: string[]
  onAtualizarItens?: (itens: CarteiraSDCItem[]) => void
}

export const CarteiraSDCView: React.FC<CarteiraSDCViewProps> = ({
  itens: itensIniciais,
  kpis: kpisIniciais,
  fonteAtual,
  dataAtualizacao,
  analisesIA,
  onAtualizarItens,
}) => {
  const [itens, setItens] = useState<CarteiraSDCItem[]>(itensIniciais)
  const [kpis, setKpis] = useState<CarteiraSDCKpis>(kpisIniciais)

  // Atualiza estado local se props mudarem
  React.useEffect(() => {
    setItens(itensIniciais)
    setKpis(kpisIniciais)
  }, [itensIniciais, kpisIniciais])

  // Modais
  const [itemSelecionado, setItemSelecionado] = useState<CarteiraSDCItem | null>(null)
  const [isModalDetalheOpen, setIsModalDetalheOpen] = useState(false)
  const [isModalImportOpen, setIsModalImportOpen] = useState(false)

  // Filtros compactos
  const [busca, setBusca] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('TODAS')
  const [filtroBitola, setFiltroBitola] = useState('TODAS')
  const [filtroAco, setFiltroAco] = useState('TODOS')
  const [filtroCurva, setFiltroCurva] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS')
  const [apenasComDeficit, setApenasComDeficit] = useState(false)
  const [apenasComProg, setApenasComProg] = useState(false)
  const [apenasEmProducao, setApenasEmProducao] = useState(false)

  // Ordenação
  const [ordenacaoCampo, setOrdenacaoCampo] = useState<string>('PRIORIZAR_NECESSIDADE')
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<'asc' | 'desc'>('asc')

  // Extrair listas únicas para selects
  const familias = useMemo(
    () => Array.from(new Set(itens.map((i) => i.familia || 'Perfis SDC'))).sort(),
    [itens],
  )
  const bitolas = useMemo(
    () => Array.from(new Set(itens.map((i) => i.bitola || '-'))).sort(),
    [itens],
  )
  const acos = useMemo(
    () => Array.from(new Set(itens.map((i) => i.qualidade_aco || 'SAE 1020'))).sort(),
    [itens],
  )

  // Filtro
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (busca) {
        const b = busca.toLowerCase()
        const matMatch = it.material.toLowerCase().includes(b)
        const descMatch = it.descricao.toLowerCase().includes(b)
        if (!matMatch && !descMatch) return false
      }

      if (filtroFamilia !== 'TODAS' && it.familia !== filtroFamilia) return false
      if (filtroBitola !== 'TODAS' && it.bitola !== filtroBitola) return false
      if (filtroAco !== 'TODOS' && it.qualidade_aco !== filtroAco) return false
      if (filtroCurva !== 'TODAS' && it.curva_abc !== filtroCurva) return false
      if (filtroStatus !== 'TODOS' && it.status !== filtroStatus) return false
      if (filtroOrigem !== 'TODAS' && it.origem_producao !== filtroOrigem) return false

      if (apenasComDeficit && it.saldo_t >= 0) return false
      if (apenasComProg && it.programado_t <= 0) return false
      if (apenasEmProducao && it.em_producao_t <= 0) return false

      return true
    })
  }, [
    itens,
    busca,
    filtroFamilia,
    filtroBitola,
    filtroAco,
    filtroCurva,
    filtroStatus,
    filtroOrigem,
    apenasComDeficit,
    apenasComProg,
    apenasEmProducao,
  ])

  // Ordenar
  const itensOrdenados = useMemo(() => {
    return CarteiraSDCEngine.ordenarItens(itensFiltrados, ordenacaoCampo, ordenacaoDirecao)
  }, [itensFiltrados, ordenacaoCampo, ordenacaoDirecao])

  const handleOrdenar = (campo: string) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenacaoCampo(campo)
      setOrdenacaoDirecao('asc')
    }
  }

  const handleOpenDetalhe = (item: CarteiraSDCItem) => {
    setItemSelecionado(item)
    setIsModalDetalheOpen(true)
  }

  const handleImportarQAS = (rows: CarteiraSDCImportRow[]) => {
    const novosItens = rows.map((r) =>
      CarteiraSDCEngine.calcularItem({
        material: r.material,
        descricao: r.descricao,
        curva_abc: r.curva_abc,
        carteira_t: r.carteira_t,
        estoque_total_t: r.estoque_total_t,
        programado_t: r.programado_t || 0,
        em_producao_t: r.em_producao_t || 0,
        origem_producao: r.origem_producao || 'Sidercentro',
        centro_sap: 'SDPL',
      }),
    )
    const novosKpis = CarteiraSDCEngine.calcularKpis(novosItens)
    setItens(novosItens)
    setKpis(novosKpis)
    if (onAtualizarItens) {
      onAtualizarItens(novosItens)
    }
  }

  const getStatusBadge = (status: StatusCarteiraSDC) => {
    switch (status) {
      case 'COBERTO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            COBERTO
          </Badge>
        )
      case 'DÉFICIT':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            DÉFICIT
          </Badge>
        )
      case 'EM PRODUÇÃO':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-bold">
            EM PRODUÇÃO
          </Badge>
        )
      case 'COBERTURA PROGRAMADA':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold">
            COBERTURA PROGRAMADA
          </Badge>
        )
      case 'COBERTURA PARCIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            COBERTURA PARCIAL
          </Badge>
        )
      case 'SEM CARTEIRA':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
            SEM CARTEIRA
          </Badge>
        )
      case 'SEM ESTOQUE':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold animate-pulse">
            SEM ESTOQUE
          </Badge>
        )
      case 'CRÍTICO':
        return (
          <Badge className="bg-rose-600 text-white border-rose-700 text-[10px] font-bold animate-pulse">
            CRÍTICO
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  const getSituacaoBadge = (situacao: string) => {
    const isCIAFAL = situacao.includes('CIAFAL')
    const isSDC = situacao.includes('SDC')
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
          isCIAFAL
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : isSDC
              ? 'bg-purple-50 text-purple-800 border border-purple-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
        }`}
      >
        <Building2 className="w-3 h-3 shrink-0" />
        {situacao}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* 7 CARDS EXECUTIVOS NO TOPO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. Carteira Total SDC */}
        <div
          onClick={() => {
            setFiltroStatus('TODOS')
            setApenasComDeficit(false)
          }}
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Carteira Total SDC
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {kpis.carteira_total_t.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {kpis.total_itens} itens analisados
          </span>
        </div>

        {/* 2. Estoque Total */}
        <div className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 cursor-pointer shadow-xs transition-all">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Estoque Total SDPL
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-emerald-700">
              {kpis.estoque_total_t.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-emerald-600">t</span>
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Centro WERKS = SDPL</span>
        </div>

        {/* 3. Déficit Atual */}
        <div
          onClick={() => setApenasComDeficit((prev) => !prev)}
          className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all ${
            apenasComDeficit
              ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
              : 'bg-white border-rose-200 hover:border-rose-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Déficit Atual (-)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
              {kpis.deficit_atual_t.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-rose-600">t</span>
          </div>
          <span className="text-[10px] text-rose-600 block mt-0.5">Soma saldos negativos</span>
        </div>

        {/* 4. Itens com Déficit */}
        <div
          onClick={() => setApenasComDeficit(true)}
          className="p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Itens com Déficit
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
              {kpis.itens_com_deficit_count}
            </strong>
            <span className="text-xs font-semibold text-rose-600">itens</span>
          </div>
          <span className="text-[10px] text-rose-600 block mt-0.5">Necessitam cobertura</span>
        </div>

        {/* 5. Em Produção */}
        <div
          onClick={() => setApenasEmProducao((prev) => !prev)}
          className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all ${
            apenasEmProducao
              ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
              : 'bg-white border-indigo-200 hover:border-indigo-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-indigo-700 block">
            Em Produção (t)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-indigo-700">
              {kpis.em_producao_total_t.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-indigo-600">t</span>
          </div>
          <span className="text-[10px] text-indigo-600 block mt-0.5">Processo em andamento</span>
        </div>

        {/* 6. Cobertura Programada */}
        <div
          onClick={() => setFiltroStatus('COBERTURA PROGRAMADA')}
          className="p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Cobertura Programada
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-[#004C97]">
              {kpis.itens_cobertura_programada_count}
            </strong>
            <span className="text-xs font-semibold text-[#004C97]">itens</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Saldo proj. ≥ 0</span>
        </div>

        {/* 7. Itens Críticos */}
        <div
          onClick={() => setFiltroStatus('CRÍTICO')}
          className="p-3 bg-white rounded-xl border border-amber-200 hover:border-rose-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-amber-800 block">
            Itens Críticos
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
              {kpis.itens_criticos_count}
            </strong>
            <span className="text-xs font-semibold text-rose-600">itens</span>
          </div>
          <span className="text-[10px] text-rose-600 block mt-0.5">Sem prog / Sem estoque</span>
        </div>
      </div>

      {/* PAINEL DE INTELIGÊNCIA ARTIFICIAL: ALERTAS & IA */}
      <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-none">
                Alertas & IA &bull; Análise Automática da Carteira SDC
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Diagnóstico preditivo em tempo real &bull; Centro SAP SDPL &bull; Sidercentro
              </p>
            </div>
          </div>
          <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Motor IA Ativo</Badge>
        </div>

        <div className="space-y-1.5 pt-1">
          {analisesIA.map((msg, idx) => (
            <div
              key={idx}
              className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS COMPACTOS & CONTROLES */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Pesquisa rápida por código ou descrição */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar código SAP ou descrição..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Família */}
              <select
                value={filtroFamilia}
                onChange={(e) => setFiltroFamilia(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Família: Todas</option>
                {familias.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              {/* Bitola */}
              <select
                value={filtroBitola}
                onChange={(e) => setFiltroBitola(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Bitola: Todas</option>
                {bitolas.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Aço / Qualidade */}
              <select
                value={filtroAco}
                onChange={(e) => setFiltroAco(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Aço: Todos</option>
                {acos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* Curva ABC */}
              <select
                value={filtroCurva}
                onChange={(e) => setFiltroCurva(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Curva ABC: Todas</option>
                <option value="A">Curva A</option>
                <option value="B">Curva B</option>
                <option value="C">Curva C</option>
              </select>

              {/* Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="COBERTO">COBERTO</option>
                <option value="DÉFICIT">DÉFICIT</option>
                <option value="EM PRODUÇÃO">EM PRODUÇÃO</option>
                <option value="COBERTURA PROGRAMADA">COBERTURA PROGRAMADA</option>
                <option value="COBERTURA PARCIAL">COBERTURA PARCIAL</option>
                <option value="SEM CARTEIRA">SEM CARTEIRA</option>
                <option value="SEM ESTOQUE">SEM ESTOQUE</option>
                <option value="CRÍTICO">CRÍTICO</option>
              </select>

              {/* Origem da Produção */}
              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Origem: Todas</option>
                <option value="Sidercentro">Sidercentro (SDC)</option>
                <option value="CIAFAL">CIAFAL</option>
              </select>
            </div>

            {/* Ações e Limpeza */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={ordenacaoCampo === 'PRIORIZAR_NECESSIDADE' ? 'default' : 'outline'}
                onClick={() => setOrdenacaoCampo('PRIORIZAR_NECESSIDADE')}
                className={`text-xs h-7 font-bold gap-1 ${
                  ordenacaoCampo === 'PRIORIZAR_NECESSIDADE'
                    ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                    : 'border-slate-300 text-slate-700'
                }`}
                title="1 críticos, 2 maior déficit, 3 cobertura parcial, 4 cobertura programada, 5 cobertos, 6 sem carteira"
              >
                <ArrowUpDown className="w-3 h-3" /> Priorizar Necessidade
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBusca('')
                  setFiltroFamilia('TODAS')
                  setFiltroBitola('TODAS')
                  setFiltroAco('TODOS')
                  setFiltroCurva('TODAS')
                  setFiltroStatus('TODOS')
                  setFiltroOrigem('TODAS')
                  setApenasComDeficit(false)
                  setApenasComProg(false)
                  setApenasEmProducao(false)
                  setOrdenacaoCampo('PRIORIZAR_NECESSIDADE')
                }}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 text-xs h-7"
              >
                Limpar
              </Button>

              <Button
                size="sm"
                onClick={() => setIsModalImportOpen(true)}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1 h-7 shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Importar Carga QAS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABELA PRINCIPAL DA CARTEIRA SDC (Colunas mínimas do usuário) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] select-none">
              <tr>
                <th
                  onClick={() => handleOrdenar('material')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Material (Código SAP)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleOrdenar('descricao')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  Descrição
                </th>
                <th
                  onClick={() => handleOrdenar('curva_abc')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Curva ABC
                </th>
                <th
                  onClick={() => handleOrdenar('carteira_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Carteira (t)
                </th>
                <th
                  onClick={() => handleOrdenar('estoque_total_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Estoque Total (t)
                </th>
                <th
                  onClick={() => handleOrdenar('saldo_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                  title="FÓRMULA: Saldo = Estoque Total − Carteira"
                >
                  Saldo (t)
                </th>
                <th
                  onClick={() => handleOrdenar('programado_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Programado (t)
                </th>
                <th
                  onClick={() => handleOrdenar('em_producao_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Em Produção (t)
                </th>
                <th
                  onClick={() => handleOrdenar('saldo_projetado_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                  title="FÓRMULA: Saldo Projetado = Estoque + Programado/Em Produção − Carteira"
                >
                  Saldo Projetado (t)
                </th>
                <th
                  onClick={() => handleOrdenar('cobertura_pct')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Cobertura (%)
                </th>
                <th
                  onClick={() => handleOrdenar('status')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Status
                </th>
                <th
                  onClick={() => handleOrdenar('origem_producao')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Origem Produção
                </th>
                <th
                  onClick={() => handleOrdenar('situacao_producao')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Situação Produção
                </th>
                <th
                  onClick={() => handleOrdenar('data_prevista')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Data Prevista
                </th>
                <th className="p-2.5 font-bold text-center">Alerta</th>
                <th className="p-2.5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-slate-500">
                    Nenhum produto da Carteira SDC encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensOrdenados.map((it, idx) => {
                  const isDeficit = it.saldo_t < 0
                  const isProjNegativo = it.saldo_projetado_t < 0

                  return (
                    <tr
                      key={it.material + idx}
                      onClick={() => handleOpenDetalhe(it)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer text-[11px] ${
                        it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE'
                          ? 'bg-rose-50/30'
                          : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Material */}
                      <td className="p-2.5 font-mono font-bold text-slate-900">{it.material}</td>

                      {/* Descrição */}
                      <td className="p-2.5 text-slate-700 max-w-[220px]">
                        <span className="truncate block font-medium" title={it.descricao}>
                          {it.descricao}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {it.familia} &bull; {it.bitola}
                        </span>
                      </td>

                      {/* Curva ABC */}
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            it.curva_abc === 'A'
                              ? 'bg-purple-100 text-purple-800'
                              : it.curva_abc === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {it.curva_abc || '-'}
                        </span>
                      </td>

                      {/* Carteira (t) */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {it.carteira_t.toFixed(2)}
                      </td>

                      {/* Estoque Total (t) */}
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                        {it.estoque_total_t.toFixed(2)}
                        {(it.estoque_bloqueado_t || 0) > 0 && (
                          <span
                            className="block text-[9px] text-rose-600 font-normal"
                            title="Estoque bloqueado"
                          >
                            (bloq: {it.estoque_bloqueado_t?.toFixed(2)})
                          </span>
                        )}
                      </td>

                      {/* Saldo (t) = Estoque Total - Carteira */}
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          isDeficit ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {it.saldo_t > 0 ? `+${it.saldo_t.toFixed(2)}` : it.saldo_t.toFixed(2)}
                      </td>

                      {/* Programado (t) */}
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {it.programado_t.toFixed(2)}
                      </td>

                      {/* Em Produção (t) */}
                      <td className="p-2.5 text-right font-mono font-semibold text-indigo-700">
                        {it.em_producao_t.toFixed(2)}
                      </td>

                      {/* Saldo Projetado (t) */}
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          isProjNegativo ? 'text-amber-800' : 'text-[#004C97]'
                        }`}
                      >
                        {it.saldo_projetado_t > 0
                          ? `+${it.saldo_projetado_t.toFixed(2)}`
                          : it.saldo_projetado_t.toFixed(2)}
                      </td>

                      {/* Cobertura (%) */}
                      <td className="p-2.5 text-center font-mono font-semibold">
                        <span
                          className={`${
                            it.cobertura_pct >= 100
                              ? 'text-emerald-700'
                              : it.cobertura_pct >= 50
                                ? 'text-amber-700'
                                : 'text-rose-600'
                          }`}
                        >
                          {it.cobertura_pct.toFixed(0)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {getStatusBadge(it.status)}
                      </td>

                      {/* Origem Produção */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            it.origem_producao === 'CIAFAL'
                              ? 'border-blue-300 text-blue-800'
                              : 'border-purple-300 text-purple-800'
                          }`}
                        >
                          {it.origem_producao}
                        </Badge>
                      </td>

                      {/* Situação da Produção */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {getSituacaoBadge(it.situacao_producao)}
                      </td>

                      {/* Data Prevista */}
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {it.data_prevista || '-'}
                      </td>

                      {/* Alerta */}
                      <td className="p-2.5 text-center">
                        {it.alerta ? (
                          <div
                            className="inline-flex items-center text-amber-600"
                            title={it.alerta}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDetalhe(it)}
                          className="h-6 w-6 p-0 text-[#004C97] hover:bg-blue-100 rounded"
                          title="Ver Detalhamento Completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHAMENTO DO MATERIAL (5 Blocos) */}
      <DetalheMaterialSDCModal
        isOpen={isModalDetalheOpen}
        onClose={() => setIsModalDetalheOpen(false)}
        item={itemSelecionado}
      />

      {/* MODAL IMPORTAÇÃO QAS (Modo Preparado para SAP ECC) */}
      <ImportacaoCarteiraSDCModal
        isOpen={isModalImportOpen}
        onClose={() => setIsModalImportOpen(false)}
        onImportar={handleImportarQAS}
      />
    </div>
  )
}
export default CarteiraSDCView
