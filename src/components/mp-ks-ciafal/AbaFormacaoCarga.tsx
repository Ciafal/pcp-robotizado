// Aba 2 — Formação de carga / Romaneio (peças em DP28 após 311)
// Fluxo: criar romaneio (L2→DP02 | L1→DP07) → Expedir (313) → Receber (315) → Confirmar DP07
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
  listarPecas,
  listarSelecoes,
  listarRomaneios,
  listarPecasRomaneio,
  criarRomaneio,
  expedirRomaneio,
  receberRomaneio,
  confirmarDp07,
  formatterKg,
  statusRomaneioLabel,
  type PecaKs,
  type RomaneioKs,
  type SelecaoKs,
} from '@/services/mp-ks-ciafal-service'
import type { UsuarioExpedidor } from '@/services/mp-ks-ciafal-service'

type Origem = 'KSC' | 'KSF' | 'CISAM'

interface Props {
  usuario: UsuarioExpedidor
}

export default function AbaFormacaoCarga({ usuario }: Props) {
  const [origem, setOrigem] = useState<Origem>('KSC')
  const [pecas, setPecas] = useState<PecaKs[]>([])
  const [selecoes, setSelecoes] = useState<SelecaoKs[]>([])
  const [romaneios, setRomaneios] = useState<RomaneioKs[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [msgSucesso, setMsgSucesso] = useState('')
  const [erroAcao, setErroAcao] = useState('')
  const [confirmaAberto, setConfirmaAberto] = useState(false)
  const [destinoTipo, setDestinoTipo] = useState<'L2' | 'L1'>('L2')
  const [processando, setProcessando] = useState(false)
  const [romaneioDetalhe, setRomaneioDetalhe] = useState<RomaneioKs | null>(null)
  const [pecasDetalhe, setPecasDetalhe] = useState<
    Array<{
      id: string
      matnr: string
      maktx: string
      peso_kg: number
      numero_bloco: string
      situacao: string
    }>
  >([])
  const [divergenciasAberto, setDivergenciasAberto] = useState(false)
  const [divergenciasTexto, setDivergenciasTexto] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroCarga('')
    try {
      const [ps, ss, rs] = await Promise.all([
        listarPecas(usuario.centro, origem),
        listarSelecoes(usuario.centro),
        listarRomaneios(usuario.centro),
      ])
      setPecas(ps)
      setSelecoes(ss)
      setRomaneios(rs)
    } catch (err) {
      setErroCarga(err instanceof Error ? err.message : 'Falha ao carregar dados da carga.')
    } finally {
      setCarregando(false)
    }
  }, [usuario.centro, origem])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Peças em DP28 (311 concluído), disponíveis para formação de carga
  const pecasDp28 = useMemo(
    () => pecas.filter((p) => p.deposito_atual === 'DP28' && p.status === 'Selecionado'),
    [pecas],
  )

  const selecaoVigente = useMemo(
    () => selecoes.find((s) => s.vigente && s.origem === origem) || null,
    [selecoes, origem],
  )

  const cards = useMemo(() => {
    const pesoDp28 = pecasDp28.reduce((a, p) => a + p.peso_kg, 0)
    const emTransito = romaneios.filter((r) => r.status === 'Em transito')
    const pesoTransito = emTransito.reduce((a, r) => a + r.peso_total_kg, 0)
    const recebidos = romaneios.filter((r) => r.status === 'Recebido')
    return [
      {
        chave: 'dp28',
        titulo: 'Peças em DP28',
        valor: String(pecasDp28.length),
        cor: 'text-violet-700',
      },
      {
        chave: 'peso28',
        titulo: 'Peso em DP28',
        valor: formatterKg(pesoDp28),
        cor: 'text-violet-700',
      },
      {
        chave: 'roms',
        titulo: 'Romaneios',
        valor: String(romaneios.length),
        cor: 'text-[#004C97]',
      },
      {
        chave: 'transito',
        titulo: 'Em trânsito (313)',
        valor: String(emTransito.length),
        cor: 'text-cyan-700',
      },
      {
        chave: 'pesotrans',
        titulo: 'Peso em trânsito',
        valor: formatterKg(pesoTransito),
        cor: 'text-cyan-700',
      },
      {
        chave: 'receb',
        titulo: 'Recebidos (315)',
        valor: String(recebidos.length),
        cor: 'text-emerald-700',
      },
    ]
  }, [pecasDp28, romaneios])

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
      const todosJa = pecasDp28.length > 0 && pecasDp28.every((p) => prev.has(p.id))
      const next = new Set(prev)
      if (todosJa) pecasDp28.forEach((p) => next.delete(p.id))
      else pecasDp28.forEach((p) => next.add(p.id))
      return next
    })
  }

  async function handleCriarRomaneio() {
    if (processando || selecionadas.size === 0) return
    setConfirmaAberto(false)
    setProcessando(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await criarRomaneio({
        selecao_id: selecaoVigente?.id || '',
        peca_ids: Array.from(selecionadas),
        destino_tipo: destinoTipo,
        usuario: { matricula: usuario.matricula, nome: usuario.nome },
      })
      setMsgSucesso(`Romaneio ${res.numero_romaneio} criado com ${res.qtd_pecas} peças.`)
      setSelecionadas(new Set())
      await carregar()
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : 'Falha ao gerar o romaneio.')
    } finally {
      setProcessando(false)
    }
  }

  async function handleExpedir(rom: RomaneioKs) {
    if (processando) return
    setProcessando(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await expedirRomaneio(rom.id, {
        matricula: usuario.matricula,
        nome: usuario.nome,
      })
      setMsgSucesso(res.mensagem)
      await carregar()
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : 'Falha na expedição 313.')
    } finally {
      setProcessando(false)
    }
  }

  async function handleReceber(rom: RomaneioKs, divergencias: string) {
    if (processando) return
    setProcessando(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await receberRomaneio(rom.id, divergencias, {
        matricula: usuario.matricula,
        nome: usuario.nome,
      })
      setMsgSucesso(res.mensagem)
      setDivergenciasAberto(false)
      setDivergenciasTexto('')
      await carregar()
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : 'Falha no recebimento 315.')
    } finally {
      setProcessando(false)
    }
  }

  async function handleConfirmarDp07(rom: RomaneioKs) {
    if (processando) return
    setProcessando(true)
    setErroAcao('')
    setMsgSucesso('')
    try {
      const res = await confirmarDp07(rom.id, {
        matricula: usuario.matricula,
        nome: usuario.nome,
      })
      setMsgSucesso(res.mensagem)
      await carregar()
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : 'Falha na confirmação DP07.')
    } finally {
      setProcessando(false)
    }
  }

  async function abrirDetalhe(rom: RomaneioKs) {
    setRomaneioDetalhe(rom)
    setPecasDetalhe([])
    try {
      const itens = await listarPecasRomaneio(rom.id)
      setPecasDetalhe(itens)
    } catch {
      setPecasDetalhe([])
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Origem envio</Label>
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
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.chave}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {c.titulo}
            </div>
            <div className={`text-lg font-bold ${c.cor}`}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* Formação de carga — peças em DP28 */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-bold text-[#004C97] md:text-base">
            FORMAÇÃO DE CARGA — peças em DP28 (311 concluído)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Checkbox
              id="sel-todos-carga"
              checked={pecasDp28.length > 0 && pecasDp28.every((p) => selecionadas.has(p.id))}
              onCheckedChange={toggleTodosVisiveis}
            />
            <Label htmlFor="sel-todos-carga" className="cursor-pointer">
              selecionar todas
            </Label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[900px] text-xs md:text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2">Sel.</th>
                  <th className="px-3 py-2 text-left">Aplicação</th>
                  <th className="px-3 py-2 text-left">MP</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-left">Corrida</th>
                  <th className="px-3 py-2 text-left">Nº Bloco</th>
                  <th className="px-3 py-2 text-left">Depósito</th>
                  <th className="px-3 py-2 text-left">Seleção</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!carregando && pecasDp28.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                      Nenhuma peça em DP28 para esta origem. Execute a transferência 311 na aba de
                      seleção.
                    </td>
                  </tr>
                )}
                {pecasDp28.map((p) => {
                  const isSel = selecionadas.has(p.id)
                  const sel = selecoes.find((s) => s.id === p.selecao_id)
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-slate-100 ${isSel ? 'bg-violet-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-2 py-1.5 text-center">
                        <Checkbox checked={isSel} onCheckedChange={() => togglePeca(p.id)} />
                      </td>
                      <td className="px-3 py-1.5">{p.aplicacao}</td>
                      <td className="px-3 py-1.5 font-medium">{p.matnr}</td>
                      <td className="px-3 py-1.5">{p.maktx}</td>
                      <td className="px-3 py-1.5 text-right">{formatterKg(p.peso_kg)}</td>
                      <td className="px-3 py-1.5">{p.corrida}</td>
                      <td className="px-3 py-1.5">{p.numero_bloco}</td>
                      <td className="px-3 py-1.5">{p.deposito_atual}</td>
                      <td className="px-3 py-1.5">{sel?.numero_selecao || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ações de carga */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs md:text-sm">
          <span>
            Selecionadas: <b>{selecionadas.size}</b>
          </span>
          <span>
            Peso:{' '}
            <b>
              {formatterKg(
                pecasDp28.filter((p) => selecionadas.has(p.id)).reduce((a, p) => a + p.peso_kg, 0),
              )}
            </b>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={destinoTipo}
            onChange={(e) => setDestinoTipo(e.target.value as 'L2' | 'L1')}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="L2">L2 → DP02</option>
            <option value="L1">L1 → DP07</option>
          </select>
          <Button
            onClick={() => setConfirmaAberto(true)}
            disabled={processando || selecionadas.size === 0}
            className="bg-[#004C97] hover:bg-[#003a75]"
          >
            {processando ? 'Processando…' : 'Formar carga / Gerar romaneio'}
          </Button>
        </div>
      </div>

      {/* Romaneios */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#004C97] md:text-base">
            ROMANEIOS — Expedição 313 / Recebimento 315
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[1050px] text-xs md:text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Nº Romaneio</th>
                  <th className="px-3 py-2 text-left">Nº Seleção</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Destino</th>
                  <th className="px-3 py-2 text-right">Peças</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Doc. 313</th>
                  <th className="px-3 py-2 text-left">Doc. 315</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {romaneios.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                      Nenhum romaneio gerado para este centro.
                    </td>
                  </tr>
                )}
                {romaneios.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-[#004C97]">
                      <button onClick={() => void abrirDetalhe(r)} className="hover:underline">
                        {r.numero_romaneio}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">{r.numero_selecao}</td>
                    <td className="px-3 py-1.5">{r.origem}</td>
                    <td className="px-3 py-1.5">
                      {r.destino_tipo} ({r.deposito_destino})
                    </td>
                    <td className="px-3 py-1.5 text-right">{r.qtd_pecas}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(r.peso_total_kg)}</td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant={
                          r.status === 'Recebido'
                            ? 'default'
                            : r.status === 'Com divergencia'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {statusRomaneioLabel(r.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-[11px]">{r.documento_313 || '—'}</td>
                    <td className="px-3 py-1.5 text-[11px]">{r.documento_315 || '—'}</td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        {(r.status === 'Em formacao' || r.status === 'Pronto para expedicao') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processando}
                            onClick={() => void handleExpedir(r)}
                          >
                            Expedir (313)
                          </Button>
                        )}
                        {(r.status === 'Em transito' || r.status === 'Aguardando recebimento') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processando}
                              onClick={() => void handleReceber(r, '')}
                            >
                              Receber OK (315)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-300 text-amber-700"
                              disabled={processando}
                              onClick={() => {
                                setDivergenciasAberto(true)
                                setDivergenciasTexto('')
                                setRomaneioDetalhe(r)
                              }}
                            >
                              Com divergência
                            </Button>
                          </>
                        )}
                        {r.status === 'Aguardando confirmacao DP07' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processando}
                            onClick={() => void handleConfirmarDp07(r)}
                          >
                            Confirmar DP07
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmar formação de carga */}
      <Dialog open={confirmaAberto} onOpenChange={setConfirmaAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">Formar carga / Gerar romaneio</DialogTitle>
            <DialogDescription>
              Somente peças transferidas para DP28 (311 concluído) podem entrar em carga. O romaneio
              inicia em "Em formação".
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              Destino: <b>{destinoTipo === 'L2' ? 'L2 (DP02)' : 'L1 (DP07)'}</b>
            </div>
            <div>
              Qtd peças: <b>{selecionadas.size}</b>
            </div>
            <div>
              Peso:{' '}
              <b>
                {formatterKg(
                  pecasDp28
                    .filter((p) => selecionadas.has(p.id))
                    .reduce((a, p) => a + p.peso_kg, 0),
                )}
              </b>
            </div>
            <div>
              Centro: <b>{usuario.centro}</b>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmaAberto(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarRomaneio}
              className="bg-[#004C97] hover:bg-[#003a75]"
              disabled={processando || selecionadas.size === 0}
            >
              {processando ? 'Gerando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receber com divergência */}
      <Dialog open={divergenciasAberto} onOpenChange={setDivergenciasAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">Receber com divergência (315)</DialogTitle>
            <DialogDescription>
              Registre a divergência encontrada no recebimento (peso, bloco, certificado…).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={divergenciasTexto}
            onChange={(e) => setDivergenciasTexto(e.target.value)}
            placeholder="Descrição da divergência"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDivergenciasAberto(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                romaneioDetalhe && void handleReceber(romaneioDetalhe, divergenciasTexto)
              }
              className="bg-[#004C97] hover:bg-[#003a75]"
              disabled={processando || !divergenciasTexto.trim()}
            >
              {processando ? 'Registrando…' : 'Registrar recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe do romaneio */}
      <Dialog
        open={!!romaneioDetalhe && !divergenciasAberto}
        onOpenChange={(o) => !o && setRomaneioDetalhe(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#004C97]">
              Romaneio {romaneioDetalhe?.numero_romaneio || ''}
            </DialogTitle>
            <DialogDescription>
              Seleção {romaneioDetalhe?.numero_selecao} · {romaneioDetalhe?.origem} →{' '}
              {romaneioDetalhe?.destino_tipo} ({romaneioDetalhe?.deposito_destino})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[380px] overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">MP</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Nº Bloco</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-left">Situação</th>
                </tr>
              </thead>
              <tbody>
                {pecasDetalhe.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                      Sem peças no romaneio.
                    </td>
                  </tr>
                )}
                {pecasDetalhe.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-medium">{p.matnr}</td>
                    <td className="px-3 py-1.5">{p.maktx}</td>
                    <td className="px-3 py-1.5">{p.numero_bloco}</td>
                    <td className="px-3 py-1.5 text-right">{formatterKg(p.peso_kg)}</td>
                    <td className="px-3 py-1.5">{p.situacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
