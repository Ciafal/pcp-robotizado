// Modal — Histórico de seleções versionadas (VXX vigente / históricas, somente leitura)
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatterKg,
  listarMotivos,
  listarPecasDaSelecao,
  listarSelecoes,
  type MotivoZpp82,
  type PecaRomaneio,
  type SelecaoKs,
} from '@/services/mp-ks-ciafal-service'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function HistoricoSelecoesModal({ open, onOpenChange }: Props) {
  const [selecoes, setSelecoes] = useState<SelecaoKs[]>([])
  const [motivos, setMotivos] = useState<MotivoZpp82[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [pecasDetalhe, setPecasDetalhe] = useState<PecaRomaneio[]>([])

  useEffect(() => {
    if (!open) return
    setCarregando(true)
    setErro('')
    Promise.all([
      listarSelecoes('').catch(() => [] as SelecaoKs[]),
      listarMotivos().catch(() => []),
    ])
      .then(([ss, ms]) => {
        setSelecoes(ss)
        setMotivos(ms)
      })
      .finally(() => setCarregando(false))
  }, [open])

  useEffect(() => {
    if (!detalheId) {
      setPecasDetalhe([])
      return
    }
    let alive = true
    listarPecasDaSelecao(detalheId)
      .then((itens) => {
        if (alive) setPecasDetalhe(itens)
      })
      .catch(() => {
        if (alive) setPecasDetalhe([])
      })
    return () => {
      alive = false
    }
  }, [detalheId])

  const lista = useMemo(() => {
    return selecoes
      .filter((s) => (filtroCentro ? s.centro === filtroCentro : true))
      .filter((s) => (filtroOrigem ? s.origem === filtroOrigem : true))
      .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
  }, [selecoes, filtroCentro, filtroOrigem])

  const centros = useMemo(
    () => Array.from(new Set(selecoes.map((s) => s.centro))).sort(),
    [selecoes],
  )

  const motivoCodigo = (id: string) => {
    const m = motivos.find((x) => x.id === id)
    return m ? `${m.codigo} — ${m.descricao}` : id || '—'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#004C97]">Histórico de seleções (VXX)</DialogTitle>
          <DialogDescription>
            Consulta somente leitura: seleção vigente e versões históricas com motivo e
            justificativa da revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Centro</Label>
            <select
              value={filtroCentro}
              onChange={(e) => setFiltroCentro(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Todos</option>
              {centros.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Origem</Label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="KSC">KSC</option>
              <option value="KSF">KSF</option>
              <option value="CISAM">Cisam</option>
            </select>
          </div>
        </div>

        {erro && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {erro}
          </div>
        )}

        <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[860px] text-xs md:text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Nº Seleção</th>
                <th className="px-3 py-2 text-left">Versão</th>
                <th className="px-3 py-2 text-left">Centro</th>
                <th className="px-3 py-2 text-left">Origem</th>
                <th className="px-3 py-2 text-right">Peças</th>
                <th className="px-3 py-2 text-right">Peso</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Doc. 311</th>
                <th className="px-3 py-2 text-left">Criado em</th>
                <th className="px-3 py-2 text-left">Motivo da revisão</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    Carregando…
                  </td>
                </tr>
              )}
              {!carregando && lista.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    Nenhuma seleção registrada.
                  </td>
                </tr>
              )}
              {lista.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => setDetalheId(s.id === detalheId ? null : s.id)}
                      className="font-medium text-[#004C97] hover:underline"
                    >
                      {s.numero_selecao}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="font-semibold">{s.versao}</span>
                    {s.vigente && (
                      <Badge variant="default" className="ml-2 bg-emerald-600">
                        vigente
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5">{s.centro}</td>
                  <td className="px-3 py-1.5">{s.origem}</td>
                  <td className="px-3 py-1.5 text-right">{s.qtd_pecas}</td>
                  <td className="px-3 py-1.5 text-right">{formatterKg(s.peso_total_kg)}</td>
                  <td className="px-3 py-1.5">{s.status}</td>
                  <td className="px-3 py-1.5 text-[11px]">{s.documento_311 || '—'}</td>
                  <td className="px-3 py-1.5 text-[11px]">
                    {s.criado_em ? new Date(s.criado_em).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-[11px]">
                    {s.motivo_codigo ? motivoCodigo(s.motivo_codigo) : '—'}
                    {s.justificativa ? ` · ${s.justificativa}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detalheId && (
          <div className="rounded-md border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Peças da seleção selecionada
            </div>
            <div className="max-h-52 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">MP</th>
                    <th className="px-3 py-1.5 text-left">Descrição</th>
                    <th className="px-3 py-1.5 text-left">Nº Bloco</th>
                    <th className="px-3 py-1.5 text-right">Peso</th>
                    <th className="px-3 py-1.5 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasDetalhe.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-slate-400">
                        Sem peças vinculadas.
                      </td>
                    </tr>
                  )}
                  {pecasDetalhe.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-1 font-medium">{p.matnr}</td>
                      <td className="px-3 py-1">{p.maktx}</td>
                      <td className="px-3 py-1">{p.numero_bloco}</td>
                      <td className="px-3 py-1 text-right">{formatterKg(p.peso_kg)}</td>
                      <td className="px-3 py-1">{p.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
