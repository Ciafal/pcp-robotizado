// Aba 1 — Seleção de peças para envio (ZPPT045 → ZPPT047)
// Bloco A: programação de envio | Bloco B: peças físicas com seleção versionada
// Correção PCP-798886BE: typecheck revalidado do zero (v0.0.740+)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  depositoOrigem,
  executarTransferencia311,
  formatterKg,
  listarMotivos,
  listarPecas,
  listarSelecoes,
  listarIdsPecasDaSelecao,
  salvarSelecao,
  situacaoBloco,
  type MotivoZpp82,
  type PecaKs,
  type SelecaoKs,
} from '@/services/mp-ks-ciafal-service'
import type { UsuarioExpedidor } from '@/services/mp-ks-ciafal-service'

type Origem = 'KSC' | 'KSF' | 'CISAM'

interface Props {
  usuario: UsuarioExpedidor
}

export default function AbaSelecaoPecas({ usuario }: Props) {
  const [origem, setOrigem] = useState<Origem>('KSC')
  const [pecas, setPecas] = useState<PecaKs[]>([])
  const [selecoes, setSelecoes] = useState<SelecaoKs[]>([])
  const [motivos, setMotivos] = useState<MotivoZpp82[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [transferindo, setTransferindo] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')
  const [erroAcao, setErroAcao] = useState('')
  const [confirmaAberto, setConfirmaAberto] = useState(false)
  const [transferAberto, setTransferAberto] = useState(false)
  const [dataEnvioEdits, setDataEnvioEdits] = useState<Record<string, string>>({})
  const [busca, setBusca] = useState('')
  const [motivoId, setMotivoId] = useState('')
  const [justificativa, setJustificativa] = useState('')

  const selecaoVigente = useMemo(
    () => selecoes.find((s) => s.vigente && s.origem === origem) || null,
    [selecoes, origem],
  )

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroCarga('')
    try {
      const [ps, ss, ms] = await Promise.all([
        listarPecas(usuario.centro, origem),
        listarSelecoes(usuario.centro),
        listarMotivos(),
      ])
      setPecas(ps)
      setSelecoes(ss)
      setMotivos(ms)
      const vigente = ss.find((s) => s.vigente && s.origem === origem)
      setSelecionadas(new Set(vigente ? await listarIdsPecasDaSelecao(vigente.id) : []))
    } catch (err) {
      setErroCarga(err instanceof Error ? err.message : 'Falha ao carregar dados do envio.')
    } finally {
      setCarregando(false)
    }
  }, [usuario.centro, origem])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // ---------- Bloco A: agregado por aplicação/MP
  const blocosA = useMemo(() => {
    const mapa = new Map<
      string,
      {
        aplicacao: string
        matnr: string
        maktx: string
        previsto: number
        atendido: number
        selecionado: number
      }
    >()
    for (const p of pecas) {
      const k = p.aplicacao + '|' + p.matnr
      if (!mapa.has(k))
        mapa.set(k, {
          aplicacao: p.aplicacao,
          matnr: p.matnr,
          maktx: p.maktx,
          previsto: 0,
          atendido: 0,
          selecionado: 0,
        })
      const b = mapa.get(k)!
      b.previsto += p.peso_kg
      if (selecionadas.has(p.id)) b.selecionado += p.peso_kg
      if (p.status === 'Recebido' || p.status === 'Em transito') b.atendido += p.peso_kg
    }
    return Array.from(mapa.values()).map((b) => ({
      ...b,
      saldo: b.previsto - b.selecionado,
      situacao: situacaoBloco(b.previsto, b.atendido, b.selecionado),
    }))
  }, [pecas, selecionadas])

  // ---------- Bloco B: peças visíveis (Liberado/Selecionado da origem; fora DP28)
  const pecasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return pecas.filter((p) => {
      if (p.status !== 'Liberado' && p.status !== 'Selecionado') return false
      if (p.deposito_atual === 'DP28') return false
      if (!termo) return true
      return (
        p.matnr.toLowerCase().includes(termo) ||
        p.maktx.toLowerCase().includes(termo) ||
        p.numero_bloco.toLowerCase().includes(termo) ||
        p.aplicacao.toLowerCase().includes(termo)
      )
    })
  }, [pecas, busca])

  // ---------- Cards de resumo
  const cards = useMemo(() => {
    const previsto = blocosA.reduce((a, b) => a + b.previsto, 0)
    const atendido = blocosA.reduce((a, b) => a + b.atendido, 0)
    const selecionado = blocosA.reduce((a, b) => a + b.selecionado, 0)
    const disponiveis = pecasVisiveis.filter((p) => p.status === 'Liberado').length
    const qtdSel = pecasVisiveis.filter((p) => selecionadas.has(p.id)).length
    const pesoDp28 = pecas
      .filter((p) => p.deposito_atual === 'DP28')
      .reduce((a, p) => a + p.peso_kg, 0)
    const pesoTransito = pecas
      .filter((p) => p.status === 'Em transito')
      .reduce((a, p) => a + p.peso_kg, 0)
    return [
      {
        chave: 'previsto',
        titulo: 'Previsto',
        valor: formatterKg(previsto),
        cor: 'text-[#004C97]',
      },
      {
        chave: 'atendido',
        titulo: 'Atendido',
        valor: formatterKg(atendido),
        cor: 'text-emerald-700',
      },
      {
        chave: 'selecionado',
        titulo: 'Selecionado',
        valor: formatterKg(selecionado),
        cor: 'text-amber-700',
      },
      {
        chave: 'saldo',
        titulo: 'Saldo',
        valor: formatterKg(Math.max(0, previsto - selecionado)),
        cor: 'text-slate-700',
      },
      {
        chave: 'disp',
        titulo: 'Peças disponíveis',
        valor: String(disponiveis),
        cor: 'text-[#004C97]',
      },
      { chave: 'sel', titulo: 'Peças selecionadas', valor: String(qtdSel), cor: 'text-amber-700' },
      {
        chave: 'dp28',
        titulo: 'Peso em DP28',
        valor: formatterKg(pesoDp28),
        cor: 'text-violet-700',
      },
      {
        chave: 'transito',
        titulo: 'Peso em trânsito',
        valor: formatterKg(pesoTransito),
        cor: 'text-cyan-700',
      },
    ]
  }, [blocosA, pecasVisiveis, pecas, selecionadas])

  const pesoSelecaoAtual = useMemo(
    () => pecasVisiveis.filter((p) => selecionadas.has(p.id)).reduce((a, p) => a + p.peso_kg, 0),
    [pecasVisiveis, selecionadas],
  )

  function setBuscaFiltroCard(chave: string) {
    if (chave === 'disp') setBusca('')
    else if (chave === 'sel') setBusca('')
  }

  function togglePeca(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodosVisiveis() {
    setSelecionadas((prev) => {
      const ids = pecasVisiveis.filter((p) => p.status === 'Liberado').map((p) => p.id)
      const todosJa = ids.length > 0 && ids.every((id) => prev.has(id))
      const next = new Set(prev)
      if (todosJa) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  async function handleSalvar() {
    if (salvando || selecionadas.size === 0) return
    setConfirmaAberto(false)
    setSalvando(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await salvarSelecao({
        selecao_id: selecaoVigente?.id,
        centro: usuario.centro,
        origem,
        usuario_matricula: usuario.matricula,
        usuario_nome: usuario.nome,
        pecas: Array.from(selecionadas),
        motivo_id: motivoId || undefined,
        justificativa: justificativa || undefined,
        data_envio_edits: dataEnvioEdits,
      })
      setMsgSucesso(`${res.mensagem} — gravado em ${new Date().toLocaleString('pt-BR')}`)
      setMotivoId('')
      setJustificativa('')
      setSelecionadas(new Set())
      setDataEnvioEdits({})
      await carregar()
    } catch (err) {
      // erro preserva os dados marcados — só destaca o problema
      setErroAcao(err instanceof Error ? err.message : 'Falha ao salvar a seleção.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleTransferir() {
    if (transferindo || !selecaoVigente) return
    setTransferAberto(false)
    setTransferindo(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await executarTransferencia311(selecaoVigente.id, {
        matricula: usuario.matricula,
        nome: usuario.nome,
      })
      setMsgSucesso(res.mensagem)
      await carregar()
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : 'Falha na transferência 311.')
    } finally {
      setTransferindo(false)
    }
  }

  const podeTransferir = !!selecaoVigente && selecaoVigente.status === 'Aberta' && !transferindo
  const semanaSpwoc = getWeekNumber(new Date())

  return (
    <div className="space-y-4">
      {/* Cabeçalho operacional */}
      <Card className="shadow-sm">
        <CardContent className="grid grid-cols-2 gap-3 py-3 text-xs md:grid-cols-3 lg:grid-cols-6 md:text-sm">
          <div>
            <div className="text-slate-500">Nº Seleção</div>
            <div className="font-semibold text-[#004C97]">
              {selecaoVigente?.numero_selecao || '— (novo)'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Versão seleção</div>
            <div className="font-semibold">
              {selecaoVigente ? `${selecaoVigente.versao} (vigente)` : 'V00 (nova)'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Feito por</div>
            <div className="font-semibold">{usuario.nome}</div>
          </div>
          <div>
            <div className="text-slate-500">Origem envio</div>
            <div className="font-semibold">{origem}</div>
          </div>
          <div>
            <div className="text-slate-500">Semana (SPWOC)</div>
            <div className="font-semibold">{semanaSpwoc}</div>
          </div>
          <div>
            <div className="text-slate-500">Depósito origem</div>
            <div className="font-semibold">{depositoOrigem(origem)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Origem envio (P3000-VERAN)</Label>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value as Origem)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="KSC">KSC (DP20)</option>
            <option value="KSF">KSF (DP25)</option>
            <option value="CISAM">Cisam (DC09)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Buscar</Label>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="MP, descrição, bloco…"
            className="w-64"
          />
        </div>
      </div>

      {msgSucesso && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {msgSucesso}
        </div>
      )}
      {erroAcao && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {erroAcao}
        </div>
      )}
      {erroCarga && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {erroCarga}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {cards.map((c) => (
          <div
            key={c.chave}
            className="cursor-default rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-[#004C97]/40"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {c.titulo}
            </div>
            <div className={`text-lg font-bold ${c.cor}`}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* BLOCO A */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#004C97] md:text-base">
            BLOCO A — Programação de envio (programado × atendido × selecionado)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-56 overflow-auto">
            <table className="w-full min-w-[780px] text-xs md:text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Aplicação</th>
                  <th className="px-3 py-2 text-left">Cód. MP</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-right">Peso Alvo</th>
                  <th className="px-3 py-2 text-right">Previsto</th>
                  <th className="px-3 py-2 text-right">Atendido</th>
                  <th className="px-3 py-2 text-right">Seleção</th>
                  <th className="px-3 py-2 text-right">Saldo a selecionar</th>
                  <th className="px-3 py-2 text-left">Situação</th>
                </tr>
              </thead>
              <tbody>
                {blocosA.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-slate-400">
                      Sem peças carregadas para esta origem.
                    </td>
                  </tr>
                )}
                {blocosA.map((b) => (
                  <tr key={b.aplicacao + '|' + b.matnr} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-medium">{b.aplicacao}</td>
                    <td className="px-3 py-1.5">{b.matnr}</td>
                    <td className="px-3 py-1.5">{b.maktx}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(b.previsto)}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(b.previsto)}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(b.atendido)}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(b.selecionado)}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(Math.max(0, b.saldo))}</td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant={
                          b.situacao === 'Atendido'
                            ? 'default'
                            : b.situacao === 'Excedente'
                              ? 'destructive'
                              : b.situacao === 'Parcial'
                                ? 'secondary'
                                : 'outline'
                        }
                      >
                        {b.situacao}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              {blocosA.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={3}>
                      Totais em tempo real
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatterKg(blocosA.reduce((a, b) => a + b.previsto, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatterKg(blocosA.reduce((a, b) => a + b.previsto, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatterKg(blocosA.reduce((a, b) => a + b.atendido, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatterKg(blocosA.reduce((a, b) => a + b.selecionado, 0))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatterKg(
                        Math.max(
                          0,
                          blocosA.reduce((a, b) => a + b.saldo, 0),
                        ),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO B */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-bold text-[#004C97] md:text-base">
            BLOCO B — Seleção de envio (peças · somente estoque &gt; 0)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Checkbox
              id="sel-todos"
              checked={
                pecasVisiveis.some((p) => p.status === 'Liberado') &&
                pecasVisiveis
                  .filter((p) => p.status === 'Liberado')
                  .every((p) => selecionadas.has(p.id))
              }
              onCheckedChange={toggleTodosVisiveis}
            />
            <Label htmlFor="sel-todos" className="cursor-pointer">
              selecionar todos os visíveis
            </Label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[1150px] text-xs md:text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2">Sel.</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Aplicação</th>
                  <th className="px-3 py-2 text-left">MP</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-left">Corrida</th>
                  <th className="px-3 py-2 text-center">Letra</th>
                  <th className="px-3 py-2 text-left">Nº Bloco</th>
                  <th className="px-3 py-2 text-left">Data envio</th>
                  <th className="px-3 py-2 text-left">Certificado</th>
                  <th className="px-3 py-2 text-left">Status bloco</th>
                  <th className="px-3 py-2 text-left">Depósito</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                </tr>
              </thead>
              <tbody>
                {pecasVisiveis.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-slate-400">
                      Nenhuma peça disponível para esta origem.
                    </td>
                  </tr>
                )}
                {pecasVisiveis.map((p) => {
                  const isSel = selecionadas.has(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-slate-100 ${isSel ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-2 py-1.5 text-center">
                        <Checkbox checked={isSel} onCheckedChange={() => togglePeca(p.id)} />
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant={p.status === 'Selecionado' ? 'secondary' : 'outline'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">{p.aplicacao}</td>
                      <td className="px-3 py-1.5 font-medium">{p.matnr}</td>
                      <td className="px-3 py-1.5">{p.maktx}</td>
                      <td className="px-3 py-1.5 text-right">{formatterKg(p.peso_kg)}</td>
                      <td className="px-3 py-1.5">{p.corrida}</td>
                      <td className="px-3 py-1.5 text-center">{p.letra}</td>
                      <td className="px-3 py-1.5">{p.numero_bloco}</td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={dataEnvioEdits[p.id] ?? p.data_envio}
                          onChange={(e) =>
                            setDataEnvioEdits((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder="dd/mm/aaaa"
                          className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        {p.certificado_ok ? (
                          <span className="font-semibold text-emerald-700">OK</span>
                        ) : (
                          <span className="font-semibold text-amber-600">Pendente</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">{p.status_bloco}</td>
                      <td className="px-3 py-1.5">{p.deposito}</td>
                      <td className="px-3 py-1.5">{p.origem}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totais + ações */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs md:text-sm">
          <span>
            Programado: <b>{formatterKg(blocosA.reduce((a, b) => a + b.previsto, 0))}</b>
          </span>
          <span>
            Atendido: <b>{formatterKg(blocosA.reduce((a, b) => a + b.atendido, 0))}</b>
          </span>
          <span>
            Selecionado anterior: <b>{formatterKg(selecaoVigente?.peso_total_kg || 0)}</b>
          </span>
          <span>
            Seleção atual: <b>{formatterKg(pesoSelecaoAtual)}</b>
          </span>
          <span>
            Total pós-salvar: <b>{formatterKg(pesoSelecaoAtual)}</b>
          </span>
          <span>
            Saldo restante:{' '}
            <b>
              {formatterKg(
                Math.max(
                  0,
                  blocosA.reduce((a, b) => a + b.saldo, 0),
                ),
              )}
            </b>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setConfirmaAberto(true)}
            disabled={salvando || selecionadas.size === 0}
            className="bg-[#004C97] hover:bg-[#003a75]"
          >
            {salvando ? 'Salvando…' : 'Salvar Envio'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransferAberto(true)}
            disabled={!podeTransferir}
            className="border-[#004C97] text-[#004C97] hover:bg-[#004C97]/5"
          >
            {transferindo ? 'Executando…' : 'Executar transferência (311 → DP28)'}
          </Button>
        </div>
      </div>

      {/* Confirmar salvar */}
      <Dialog open={confirmaAberto} onOpenChange={setConfirmaAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">Salvar seleção de envio</DialogTitle>
            <DialogDescription>
              {selecaoVigente
                ? `Revisão da seleção ${selecaoVigente.numero_selecao} (${selecaoVigente.versao} → nova versão). Versão anterior fica no histórico, somente leitura.`
                : 'Será gerado novo Nº Seleção SXXXXX/AA, versão V00 (vigente).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                Centro: <b>{usuario.centro}</b>
              </div>
              <div>
                Origem: <b>{origem}</b>
              </div>
              <div>
                Qtd peças: <b>{selecionadas.size}</b>
              </div>
              <div>
                Peso: <b>{formatterKg(pesoSelecaoAtual)}</b>
              </div>
            </div>
            {selecaoVigente && (
              <div className="grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-800">
                  Revisão exige código de motivo (ZPP82) + justificativa (máx. 60 caracteres)
                </div>
                <select
                  value={motivoId}
                  onChange={(e) => setMotivoId(e.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  <option value="">— Selecione o motivo —</option>
                  {motivos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo} — {m.descricao}
                    </option>
                  ))}
                </select>
                <Input
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value.slice(0, 60))}
                  placeholder="Justificativa (máx. 60 caracteres)"
                  maxLength={60}
                />
                <span className="text-right text-[11px] text-slate-500">
                  {justificativa.length}/60
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmaAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              className="bg-[#004C97] hover:bg-[#003a75]"
              disabled={salvando || (selecaoVigente ? !motivoId || !justificativa.trim() : false)}
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar transferência 311 */}
      <Dialog open={transferAberto} onOpenChange={setTransferAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">Executar transferência 311 → DP28</DialogTitle>
            <DialogDescription>
              Idempotente: novo clique não gera 2º documento de material.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              Nº seleção: <b>{selecaoVigente?.numero_selecao || '—'}</b>
            </div>
            <div>
              Centro: <b>{usuario.centro}</b>
            </div>
            <div>
              Origem: <b>{origem}</b>
            </div>
            <div>
              Qtd peças: <b>{selecaoVigente?.qtd_pecas ?? selecionadas.size}</b>
            </div>
            <div>
              Peso: <b>{formatterKg(selecaoVigente?.peso_total_kg || pesoSelecaoAtual)}</b>
            </div>
            <div>
              Depósito origem: <b>{depositoOrigem(origem)}</b>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferAberto(false)}
              disabled={transferindo}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransferir}
              className="bg-[#004C97] hover:bg-[#003a75]"
              disabled={transferindo}
            >
              {transferindo ? 'Executando…' : 'Confirmar transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getWeekNumber(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return String(week).padStart(2, '0')
}
