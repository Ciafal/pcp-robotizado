import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Eye } from 'lucide-react'
import { CarteiraItem, StatusRuptura } from '@/types/carteira-analise'

interface CarteiraGeralViewProps {
  itens: CarteiraItem[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenImportModal: () => void
  filtroMaterial?: string
}

export const CarteiraGeralView: React.FC<CarteiraGeralViewProps> = ({
  itens,
  onOpenMemoria,
  onOpenImportModal,
  filtroMaterial = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(filtroMaterial)
  const [filtroLinha, setFiltroLinha] = useState<string>('TODAS')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')
  const [filtroCurva, setFiltroCurva] = useState<string>('TODAS')
  const [filtroSaldo, setFiltroSaldo] = useState<'TODOS' | 'POSITIVO' | 'NEGATIVO'>('TODOS')
  const [filtroRuptura, setFiltroRuptura] = useState<string>('TODOS')
  const [pagina, setPagina] = useState(1)
  const itensPorPagina = 25

  const itensFiltrados = itens.filter((it) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchMat = it.codigo_material.toLowerCase().includes(term)
      const matchDesc = it.descricao_material.toLowerCase().includes(term)
      const matchCli = it.nome_cliente.toLowerCase().includes(term)
      const matchPed = it.ordem_venda.toLowerCase().includes(term)
      if (!matchMat && !matchDesc && !matchCli && !matchPed) return false
    }

    if (filtroLinha !== 'TODAS' && it.linha !== filtroLinha) return false
    if (filtroTipo !== 'TODOS' && it.tipo_ordem !== filtroTipo) return false
    if (filtroCurva !== 'TODAS' && it.curva_abc !== filtroCurva) return false

    if (filtroSaldo === 'POSITIVO' && it.saldo_positivo_tons <= 0) return false
    if (filtroSaldo === 'NEGATIVO' && it.saldo_negativo_tons >= 0) return false

    if (filtroRuptura !== 'TODOS' && it.status_ruptura !== filtroRuptura) return false

    return true
  })

  const totalCarteiraTons = itens.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const totalSaldoPositivoTons = itens.reduce((s, i) => s + (i.saldo_positivo_tons || 0), 0)
  const totalSaldoNegativoTons = itens.reduce((s, i) => s + (i.saldo_negativo_tons || 0), 0)
  const totalMtoProduzir = itens
    .filter((i) => i.tipo_ordem === 'MTO' && i.status_atendimento === 'A_PRODUZIR')
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const itensRuptura = itens.filter((i) => i.status_ruptura === 'VERMELHO').length
  const itensDuplicidade = itens.filter((i) => i.possivel_duplicidade).length

  const totalPaginas = Math.ceil(itensFiltrados.length / itensPorPagina) || 1
  const itensExibidos = itensFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina)

  const getRupturaBadge = (status: StatusRuptura) => {
    switch (status) {
      case 'VERDE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            No Prazo
          </Badge>
        )
      case 'AMARELO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            Atenção
          </Badge>
        )
      case 'VERMELHO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold animate-pulse">
            Risco Ruptura
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
            Sem Prog.
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div
          onClick={() => {
            setFiltroSaldo('TODOS')
            setFiltroTipo('TODOS')
            setFiltroRuptura('TODOS')
          }}
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Carteira Total
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {totalCarteiraTons.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-slate-500">t</span>
          </div>
        </div>

        <div
          onClick={() => {
            setFiltroSaldo('POSITIVO')
          }}
          className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Saldo Positivo (+)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-emerald-700">
              +{totalSaldoPositivoTons.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-emerald-600">t</span>
          </div>
        </div>

        <div
          onClick={() => {
            setFiltroSaldo('NEGATIVO')
          }}
          className="p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Saldo Negativo (-)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-rose-700">
              {totalSaldoNegativoTons.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-rose-600">t</span>
          </div>
        </div>

        <div
          onClick={() => {
            setFiltroTipo('MTO')
          }}
          className="p-3 bg-white rounded-xl border border-purple-200 hover:border-purple-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-purple-700 block">
            MTO a Produzir
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-purple-800">
              {totalMtoProduzir.toFixed(1)}
            </strong>
            <span className="text-xs font-semibold text-purple-600">t</span>
          </div>
        </div>

        <div
          onClick={() => {
            setFiltroRuptura('VERMELHO')
          }}
          className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-amber-700 block">
            Risco Ruptura
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-amber-800">
              {itensRuptura}
            </strong>
            <span className="text-xs font-semibold text-amber-600">itens</span>
          </div>
        </div>

        <div
          onClick={() => {
            setSearchTerm('')
          }}
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Duplicidades</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-base sm:text-lg font-bold font-mono text-blue-900">
              {itensDuplicidade}
            </strong>
            <span className="text-xs font-semibold text-slate-500">alertas</span>
          </div>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPagina(1)
                  }}
                  placeholder="Buscar material, descrição, cliente ou pedido..."
                  className="w-full text-xs pl-3 pr-8 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
              </div>

              <select
                value={filtroLinha}
                onChange={(e) => {
                  setFiltroLinha(e.target.value)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Linhas: Todas</option>
                <option value="L1">Linha L1</option>
                <option value="L2">Linha L2</option>
              </select>

              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Tipo: Todos</option>
                <option value="MTS">MTS (Estoque)</option>
                <option value="MTO">MTO (Encomenda)</option>
              </select>

              <select
                value={filtroCurva}
                onChange={(e) => {
                  setFiltroCurva(e.target.value)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Curva ABC: Todas</option>
                <option value="A">Curva A</option>
                <option value="B">Curva B</option>
                <option value="C">Curva C</option>
              </select>

              <select
                value={filtroSaldo}
                onChange={(e) => {
                  setFiltroSaldo(e.target.value as any)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Saldos: Todos</option>
                <option value="POSITIVO">Apenas Saldo Positivo (+)</option>
                <option value="NEGATIVO">Apenas Saldo Negativo (-)</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setFiltroLinha('TODAS')
                setFiltroTipo('TODOS')
                setFiltroCurva('TODAS')
                setFiltroSaldo('TODOS')
                setFiltroRuptura('TODOS')
                setPagina(1)
              }}
              className="border-slate-300 text-slate-600 hover:bg-slate-50 text-xs h-7"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {itens.length === 0 ? (
        <Card className="bg-white border-slate-200 text-center py-12 px-4 shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="p-3 bg-blue-50 text-[#004C97] w-12 h-12 rounded-full mx-auto flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhuma carteira carregada</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Utilize "Importar Carteira" para iniciar a análise. O arquivo Excel QAS ZSD28C
              alimentará automaticamente todos os 6 tópicos da base única de carteira.
            </p>
            <Button
              onClick={onOpenImportModal}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Importar Carteira QAS / ZSD28C
            </Button>
          </div>
        </Card>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#004C97] text-white text-[11px] select-none">
                <tr>
                  <th className="p-2.5 font-bold">Material / Descrição</th>
                  <th className="p-2.5 font-bold">Cliente & Pedido</th>
                  <th className="p-2.5 font-bold text-center">Linha</th>
                  <th className="p-2.5 font-bold text-center">Tipo</th>
                  <th className="p-2.5 font-bold text-center">Curva</th>
                  <th className="p-2.5 font-bold text-right">Carteira (t)</th>
                  <th className="p-2.5 font-bold text-right">Estoque (t)</th>
                  <th className="p-2.5 font-bold text-right">Saldo (+)</th>
                  <th className="p-2.5 font-bold text-right">Saldo (-)</th>
                  <th className="p-2.5 font-bold text-right">Nec. Líquida (t)</th>
                  <th className="p-2.5 font-bold text-center">Programação</th>
                  <th className="p-2.5 font-bold text-center">Ruptura</th>
                  <th className="p-2.5 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensExibidos.map((it, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-blue-50/40 transition-colors text-[11px] ${
                      it.possivel_duplicidade ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-2.5">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        {it.codigo_material}
                        {it.possivel_duplicidade && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                            Sobrecobertura
                          </Badge>
                        )}
                        {it.bloqueio && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                        {it.descricao_material}
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-semibold text-slate-800 block truncate max-w-[160px]">
                        {it.nome_cliente}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Ped: {it.ordem_venda}/{it.item_ordem} &bull; Desejada: {it.data_desejada}
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge className="bg-slate-100 text-[#004C97] font-bold border-slate-200 text-[10px]">
                        {it.linha || 'GERAL'}
                      </Badge>
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge
                        className={`text-[9px] ${it.tipo_ordem === 'MTO' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                      >
                        {it.tipo_ordem}
                      </Badge>
                    </td>

                    <td className="p-2.5 text-center font-bold text-slate-700">{it.curva_abc}</td>

                    <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                      {it.carteira_aberta_tons.toFixed(1)}
                    </td>

                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {it.disponibilidade_fisica_elegivel_tons?.toFixed(1) || '0.0'}
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {it.saldo_positivo_tons > 0 ? `+${it.saldo_positivo_tons.toFixed(1)}` : '-'}
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.saldo_negativo_tons < 0 ? it.saldo_negativo_tons.toFixed(1) : '-'}
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                      {it.necessidade_liquida_tons > 0
                        ? it.necessidade_liquida_tons.toFixed(1)
                        : '-'}
                    </td>

                    <td className="p-2.5 text-center">
                      {it.qtd_programada_tons > 0 ? (
                        <div>
                          <strong className="font-mono text-slate-800 block text-[10px]">
                            {it.qtd_programada_tons.toFixed(1)} t
                          </strong>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {it.data_programada || it.semana_programada || 'Programado'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem Prog.</span>
                      )}
                    </td>

                    <td className="p-2.5 text-center">{getRupturaBadge(it.status_ruptura)}</td>

                    <td className="p-2.5 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenMemoria(it)}
                        className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                        title="Ver memória de cálculo auditável"
                      >
                        <Eye className="w-3 h-3 text-[#004C97]" /> Memória
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Exibindo <strong>{itensExibidos.length}</strong> de{' '}
              <strong>{itensFiltrados.length}</strong> itens
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={pagina === 1}
                onClick={() => setPagina(pagina - 1)}
                className="h-7 text-xs border-slate-300"
              >
                Anterior
              </Button>
              <span className="px-2 font-mono text-xs">
                {pagina} / {totalPaginas}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina(pagina + 1)}
                className="h-7 text-xs border-slate-300"
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default CarteiraGeralView
