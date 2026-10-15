import React, { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import {
  Sliders,
  Plus,
  Save,
  Loader2,
  CheckCircle2,
  Boxes,
  Factory,
  Layers,
  Info,
  X,
  Link2,
  PackageSearch,
  PackageOpen,
  PackagePlus,
  Wrench,
} from 'lucide-react'
import {
  FacaMaterialParametrizado,
  FacaVinculoPaMp,
  FacaTipoDisponibilidadeMp,
  FacaOrigemMpDerivada,
  FacaFormaConsolidacaoMp,
  FacaRegraExibicaoMp,
} from '@/types/faca-analise'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { useToast } from '@/hooks/use-toast'

interface FacaParametrizacaoModalProps {
  isOpen: boolean
  onClose: () => void
  materiais: FacaMaterialParametrizado[]
  vinculos: FacaVinculoPaMp[]
  onSalvo: () => void
}

const LABEL_CLS = 'text-[11px] font-semibold text-slate-600'
const INPUT_CLS = 'h-8 text-xs'
const BLOCO_CLS = 'border border-slate-200 rounded-lg bg-white p-3 space-y-3 shadow-xs'
const BLOCO_TITLE_CLS =
  'flex items-center gap-1.5 text-xs font-bold text-[#004C97] uppercase tracking-wide'
const BTN_AZUL_CLS = 'h-8 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5'

const OPCOES_TIPO_DISPONIBILIDADE: Array<{ value: FacaTipoDisponibilidadeMp; label: string }> = [
  { value: 'tarugo_disponivel', label: 'Tarugo disponível' },
  { value: 'saldo_cortar_ks', label: 'Saldo a cortar na KS' },
  { value: 'mp_sem_cortar', label: 'Matéria-prima sem cortar' },
  { value: 'mp_derivada', label: 'MP derivada' },
  { value: 'mp_produzir_l2', label: 'MP a produzir na L2' },
  { value: 'semiacabado_transformavel', label: 'Semiacabado transformável' },
  { value: 'outro', label: 'Outro' },
]

const OPCOES_ORIGEM_DERIVADA: Array<{ value: FacaOrigemMpDerivada; label: string }> = [
  { value: 'tarugo', label: 'Tarugo' },
  { value: 'palanquilha', label: 'Palanquilha' },
  { value: 'material_bruto', label: 'Material bruto' },
  { value: 'saldo_ks', label: 'Saldo KS' },
  { value: 'producao_l2', label: 'Produção L2' },
  { value: 'outra_estoque_intermediario', label: 'Outro estoque intermediário' },
]

const OPCOES_FORMA_CONSOLIDACAO: Array<{ value: FacaFormaConsolidacaoMp; label: string }> = [
  { value: 'toneladas', label: 'Toneladas' },
  { value: 'peca', label: 'Peça' },
  { value: 'lote', label: 'Lote' },
  { value: 'saldo_equivalente_tonelada', label: 'Saldo equivalente em tonelada' },
]

const OPCOES_REGRA_EXIBICAO: Array<{ value: FacaRegraExibicaoMp; label: string }> = [
  { value: 'somar_estoque_imediato', label: 'Somar no estoque imediato' },
  { value: 'somar_apenas_potencial', label: 'Somar apenas no potencial' },
  { value: 'exibir_separado', label: 'Exibir separado' },
  { value: 'nao_consolidar', label: 'Não consolidar automaticamente' },
]

const vazioVinculo = (): Partial<FacaVinculoPaMp> => ({
  codigo_pa: '',
  descricao_pa: '',
  codigo_mp: '',
  descricao_mp: '',
  tipo_aco_mp: '',
  bitola_mp: '',
  dimensoes_mp: '',
  rendimento_transformacao: 0.92,
  perdas_previstas_pct: 8.0,
  origem_cadastro: 'Ficha Mestra do PCP',
  prioridade_consumo: 1,
  centro: '1100',
  ativo: true,
  notas_tecnicas: '',
  familia_grupo_pa: '',
  flag_mp_derivada: false,
  tipo_disponibilidade_mp: 'mp_sem_cortar',
  tipo_disponibilidade_outro: '',
  origem_mp_derivada: 'palanquilha',
  exige_corte: false,
  disponivel_sem_corte: true,
  fator_conversao: 1.0,
  forma_consolidacao: 'toneladas',
  regra_exibicao: 'somar_estoque_imediato',
})

export const FacaParametrizacaoModal: React.FC<FacaParametrizacaoModalProps> = ({
  isOpen,
  onClose,
  materiais,
  vinculos,
  onSalvo,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'materiais' | 'vinculos'>('materiais')
  const [salvando, setSalvando] = useState(false)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)

  // Form novo material
  const [novoMat, setNovoMat] = useState<Partial<FacaMaterialParametrizado>>({
    codigo_material: '',
    descricao_material: '',
    grupo_faca: 'FACAS AGRÍCOLAS',
    bitola: '',
    tipo_aco: 'SAE 1045',
    centro: '1100',
    carteira_minima_lam_t: 30.0,
    is_mto: false,
    ativo: true,
  })

  // Form novo vínculo
  const [novoVinc, setNovoVinc] = useState<Partial<FacaVinculoPaMp>>(vazioVinculo())

  const handleSalvarMaterial = async () => {
    if (!novoMat.codigo_material) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o código do material SAP.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)
      await FacaAnaliseService.salvarMaterialParametrizado({
        ...novoMat,
        empresa: 'CIAFAL',
        homologado_por: 'PCP Robotizado / Governança',
        observacoes_tecnicas:
          novoMat.observacoes_tecnicas || 'Parametrização homologada via HUB CIAFAL',
      })
      toast({
        title: 'Material cadastrado com sucesso',
        description: `Código ${novoMat.codigo_material} homologado no grupo FACA.`,
      })
      setNovoMat({
        codigo_material: '',
        descricao_material: '',
        grupo_faca: 'FACAS AGRÍCOLAS',
        bitola: '',
        tipo_aco: 'SAE 1045',
        centro: '1100',
        carteira_minima_lam_t: 30.0,
        is_mto: false,
        ativo: true,
      })
      onSalvo()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao gravar material no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarVinculo = async () => {
    if (!novoVinc.codigo_pa || !novoVinc.codigo_mp) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o código do produto acabado e da matéria-prima correspondente.',
        variant: 'destructive',
      })
      return
    }
    if (novoVinc.flag_mp_derivada && !novoVinc.tipo_disponibilidade_mp) {
      toast({
        title: 'Tipo de disponibilidade obrigatório',
        description:
          'Para MP derivada, informe o tipo de disponibilidade da matéria-prima vinculada.',
        variant: 'destructive',
      })
      return
    }
    if (
      novoVinc.flag_mp_derivada &&
      novoVinc.tipo_disponibilidade_mp === 'outro' &&
      !novoVinc.tipo_disponibilidade_outro
    ) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Descreva o tipo de disponibilidade quando a opção "Outro" estiver marcada.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)
      await FacaAnaliseService.salvarVinculoPaMp({
        ...novoVinc,
        origem_cadastro: 'Ficha Mestra do PCP',
      })
      toast({
        title: 'Vínculo PA × MP homologado',
        description: novoVinc.flag_mp_derivada
          ? `${novoVinc.codigo_pa} vinculado a ${novoVinc.codigo_mp} como MP derivada (${novoVinc.tipo_disponibilidade_mp}).`
          : `${novoVinc.codigo_pa} vinculado a ${novoVinc.codigo_mp} com rendimento de ${((novoVinc.rendimento_transformacao || 0.92) * 100).toFixed(1)}%.`,
      })
      setSalvoComSucesso(true)
      setTimeout(() => setSalvoComSucesso(false), 2500)
      setNovoVinc(vazioVinculo())
      onSalvo()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar vínculo',
        description: err?.message || 'Falha ao persistir correlação técnica.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const ehDerivada = Boolean(novoVinc.flag_mp_derivada)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            aria-label="Fechar parametrização"
            className="absolute right-0 top-0 h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-[#004C97] transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 pr-10">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Parametrização Oficial — Grupo FACA &amp; Matéria-Prima
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Homologação técnica de códigos SAP, lotes mínimos de laminação e vínculos com MP
                (Ficha Mestra)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-slate-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div>
            <strong>Regra de Governança CIAFAL:</strong> Não assumir que todo material cujo código
            contém uma sequência pertence ao grupo FACA. A classificação utiliza estritamente os
            cadastros efetivos do SAP ou parametrizações homologadas nesta tela. Vínculos PA×MP
            refletem os rendimentos reais da Ficha Mestra sem dados fictícios.
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md bg-slate-100">
            <TabsTrigger
              value="materiais"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
            >
              <Factory className="w-3.5 h-3.5" /> 1. Materiais FACA Homologados
            </TabsTrigger>
            <TabsTrigger
              value="vinculos"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
            >
              <Boxes className="w-3.5 h-3.5" /> 2. Vínculos PA × Matéria-Prima
            </TabsTrigger>
          </TabsList>

          {/* ============================ ABA 1 — MATERIAIS ============================ */}
          <TabsContent value="materiais" className="space-y-4 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Código SAP</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Descrição</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">
                      Grupo / Família
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Bitola / Aço</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      Centro
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">
                      Lote Mín. (t)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      MTO
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiais.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-500">
                        Nenhum material homologado encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    materiais.map((m) => (
                      <TableRow key={m.codigo_material} className="hover:bg-blue-50/40">
                        <TableCell className="font-mono text-xs font-bold text-[#004C97]">
                          {m.codigo_material}
                        </TableCell>
                        <TableCell
                          className="text-xs text-slate-700 max-w-[200px] truncate"
                          title={m.descricao_material}
                        >
                          {m.descricao_material}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{m.grupo_faca}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {m.bitola} &bull; <span className="font-semibold">{m.tipo_aco}</span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-center text-slate-700">
                          {m.centro}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-800 text-right">
                          {m.carteira_minima_lam_t.toFixed(1)} t
                        </TableCell>
                        <TableCell className="text-center">
                          {m.is_mto ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-[#004C97] border-blue-300 text-[10px]"
                            >
                              MTO
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">MTS</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-600 text-white text-[10px]">Ativo</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className={BLOCO_CLS}>
              <div className={BLOCO_TITLE_CLS}>
                <Plus className="w-3.5 h-3.5" /> Adicionar Novo Material ao Grupo FACA
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Código Material (SAP)</Label>
                  <Input
                    placeholder="Ex: FACA-550-1045"
                    className={`${INPUT_CLS} font-mono`}
                    value={novoMat.codigo_material}
                    onChange={(e) =>
                      setNovoMat({ ...novoMat, codigo_material: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Descrição Técnica</Label>
                  <Input
                    placeholder="Ex: BARRA CHATA FACA 550x12"
                    className={INPUT_CLS}
                    value={novoMat.descricao_material}
                    onChange={(e) => setNovoMat({ ...novoMat, descricao_material: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Grupo de Faca</Label>
                  <Input
                    placeholder="Ex: FACAS INDUSTRIAIS"
                    className={INPUT_CLS}
                    value={novoMat.grupo_faca}
                    onChange={(e) => setNovoMat({ ...novoMat, grupo_faca: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Bitola</Label>
                  <Input
                    placeholder="Ex: 550x12 mm"
                    className={INPUT_CLS}
                    value={novoMat.bitola}
                    onChange={(e) => setNovoMat({ ...novoMat, bitola: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Tipo de Aço</Label>
                  <Input
                    placeholder="Ex: SAE 1045"
                    className={INPUT_CLS}
                    value={novoMat.tipo_aco}
                    onChange={(e) => setNovoMat({ ...novoMat, tipo_aco: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Centro Produtivo</Label>
                  <Input
                    placeholder="1100"
                    className={`${INPUT_CLS} font-mono`}
                    value={novoMat.centro}
                    onChange={(e) => setNovoMat({ ...novoMat, centro: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className={LABEL_CLS}>Lote Mínimo Laminação (t)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    className={INPUT_CLS}
                    value={novoMat.carteira_minima_lam_t}
                    onChange={(e) =>
                      setNovoMat({ ...novoMat, carteira_minima_lam_t: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={handleSalvarMaterial}
                    disabled={salvando}
                    className={`${BTN_AZUL_CLS} w-full`}
                  >
                    {salvando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Salvar Material
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ============================ ABA 2 — VÍNCULOS ============================ */}
          <TabsContent value="vinculos" className="space-y-4 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">
                      Produto Acabado (PA)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">
                      Matéria-Prima Vinculada (MP)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      Aço / Bitola MP
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">
                      Rendimento Nom.
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">
                      Perdas Previstas
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      Origem
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      Prioridade
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">
                      MP Derivada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-500">
                        Nenhum vínculo cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vinculos.map((v, idx) => (
                      <TableRow key={v.id || idx} className="hover:bg-blue-50/40">
                        <TableCell>
                          <div className="text-xs font-bold font-mono text-[#004C97]">
                            {v.codigo_pa}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {v.descricao_pa}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold font-mono text-slate-800">
                            {v.codigo_mp}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {v.descricao_mp}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-center text-slate-700">
                          {v.tipo_aco_mp} &bull; {v.bitola_mp}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-700 text-right">
                          {(v.rendimento_transformacao * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-rose-700 text-right">
                          {v.perdas_previstas_pct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-300 text-[10px]"
                          >
                            {v.origem_cadastro}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-700">
                          P{v.prioridade_consumo}
                        </TableCell>
                        <TableCell className="text-center">
                          {v.flag_mp_derivada ? (
                            <Badge className="bg-[#004C97] text-white text-[10px]">
                              {v.tipo_disponibilidade_mp === 'outro'
                                ? v.tipo_disponibilidade_outro || 'Outro'
                                : OPCOES_TIPO_DISPONIBILIDADE.find(
                                    (o) => o.value === v.tipo_disponibilidade_mp,
                                  )?.label || 'Derivada'}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">MP bruta</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ===================== FORMULÁRIO DO VÍNCULO — 3 BLOCOS ===================== */}
            <div className="border border-slate-200 rounded-lg bg-slate-50/70 space-y-4 p-3">
              <div className={BLOCO_TITLE_CLS}>
                <Link2 className="w-3.5 h-3.5" /> Novo Vínculo Técnico PA × MP
              </div>

              {/* ---------- BLOCO 1 — DADOS DO PRODUTO FACA ---------- */}
              <div className={BLOCO_CLS}>
                <div className={BLOCO_TITLE_CLS}>
                  <PackageOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-700">Bloco 1 — Dados do Produto FACA (PA)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>
                      Código PA (FACA) <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: FACA-450-1045"
                      className={`${INPUT_CLS} font-mono`}
                      value={novoVinc.codigo_pa}
                      onChange={(e) =>
                        setNovoVinc({ ...novoVinc, codigo_pa: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className={LABEL_CLS}>Descrição do produto acabado</Label>
                    <Input
                      placeholder="Ex: BARRA CHATA FACA 450x12 MM"
                      className={INPUT_CLS}
                      value={novoVinc.descricao_pa || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, descricao_pa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Centro (WERKS)</Label>
                    <Input
                      placeholder="1100"
                      className={`${INPUT_CLS} font-mono`}
                      value={novoVinc.centro || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, centro: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Família / grupo</Label>
                    <Input
                      placeholder="Ex: FACAS AGRÍCOLAS"
                      className={INPUT_CLS}
                      value={novoVinc.familia_grupo_pa || ''}
                      onChange={(e) =>
                        setNovoVinc({ ...novoVinc, familia_grupo_pa: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ---------- BLOCO 2 — DADOS DA MATÉRIA-PRIMA ---------- */}
              <div className={BLOCO_CLS}>
                <div className={BLOCO_TITLE_CLS}>
                  <PackageSearch className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-700">Bloco 2 — Dados da Matéria-Prima (MP)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>
                      Código MP vinculada <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: MP-PAL-150-1045"
                      className={`${INPUT_CLS} font-mono`}
                      value={novoVinc.codigo_mp}
                      onChange={(e) =>
                        setNovoVinc({ ...novoVinc, codigo_mp: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className={LABEL_CLS}>Descrição da MP</Label>
                    <Input
                      placeholder="Ex: PALANQUILHA 150x150 MM SAE 1045"
                      className={INPUT_CLS}
                      value={novoVinc.descricao_mp || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, descricao_mp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Tipo de aço</Label>
                    <Input
                      placeholder="Ex: SAE 1045"
                      className={INPUT_CLS}
                      value={novoVinc.tipo_aco_mp || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, tipo_aco_mp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Dimensão / bitola / seção</Label>
                    <Input
                      placeholder="Ex: 150x150 mm"
                      className={INPUT_CLS}
                      value={novoVinc.bitola_mp || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, bitola_mp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className={LABEL_CLS}>Origem da MP</Label>
                    <Input
                      placeholder="Ex: Compra nacional / Importada / Transferência entre centros"
                      className={INPUT_CLS}
                      value={novoVinc.dimensoes_mp || ''}
                      onChange={(e) => setNovoVinc({ ...novoVinc, dimensoes_mp: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ---------- BLOCO 3 — PARÂMETROS TÉCNICOS ---------- */}
              <div className={BLOCO_CLS}>
                <div className={BLOCO_TITLE_CLS}>
                  <Wrench className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-700">Bloco 3 — Parâmetros Técnicos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Rendimento de transformação (0–1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.92 para 92%"
                      className={INPUT_CLS}
                      value={novoVinc.rendimento_transformacao}
                      onChange={(e) =>
                        setNovoVinc({
                          ...novoVinc,
                          rendimento_transformacao: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Perdas previstas (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="8.0 para 8%"
                      className={INPUT_CLS}
                      value={novoVinc.perdas_previstas_pct}
                      onChange={(e) =>
                        setNovoVinc({ ...novoVinc, perdas_previstas_pct: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Prioridade de consumo</Label>
                    <Input
                      type="number"
                      min="1"
                      className={INPUT_CLS}
                      value={novoVinc.prioridade_consumo}
                      onChange={(e) =>
                        setNovoVinc({ ...novoVinc, prioridade_consumo: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Tipo de disponibilidade da MP</Label>
                    <Input
                      value={
                        novoVinc.flag_mp_derivada
                          ? OPCOES_TIPO_DISPONIBILIDADE.find(
                              (o) => o.value === novoVinc.tipo_disponibilidade_mp,
                            )?.label || '—'
                          : 'Matéria-prima sem cortar (padrão MP bruta)'
                      }
                      readOnly
                      className={`${INPUT_CLS} bg-slate-100 text-slate-500`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={LABEL_CLS}>Regra de consolidação / conversão</Label>
                    <Input
                      value={
                        OPCOES_FORMA_CONSOLIDACAO.find(
                          (o) => o.value === novoVinc.forma_consolidacao,
                        )?.label || 'Toneladas'
                      }
                      readOnly
                      className={`${INPUT_CLS} bg-slate-100 text-slate-500`}
                    />
                  </div>
                </div>
              </div>

              {/* ---------- BLOCO 3a — MP DERIVADA ---------- */}
              <div
                className={`${BLOCO_CLS} ${ehDerivada ? 'border-[#004C97] bg-blue-50/40' : ''}`}
                data-testid="bloco-mp-derivada"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={BLOCO_TITLE_CLS}>
                    <PackagePlus className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-700">Matéria-Prima Derivada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      É matéria-prima derivada?
                    </Label>
                    <Switch
                      checked={ehDerivada}
                      onCheckedChange={(v) => setNovoVinc({ ...novoVinc, flag_mp_derivada: v })}
                      aria-label="É matéria-prima derivada?"
                    />
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        ehDerivada
                          ? 'bg-[#004C97] text-white border-[#004C97]'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                    >
                      {ehDerivada ? 'SIM' : 'NÃO'}
                    </Badge>
                  </div>
                </div>

                {ehDerivada && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className={LABEL_CLS}>
                          Tipo de disponibilidade da MP <span className="text-rose-600">*</span>
                        </Label>
                        <select
                          className={`${INPUT_CLS} w-full rounded-md border border-input bg-white px-2 py-1 text-xs`}
                          value={novoVinc.tipo_disponibilidade_mp || 'mp_sem_cortar'}
                          onChange={(e) =>
                            setNovoVinc({
                              ...novoVinc,
                              tipo_disponibilidade_mp: e.target.value as FacaTipoDisponibilidadeMp,
                            })
                          }
                        >
                          {OPCOES_TIPO_DISPONIBILIDADE.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {novoVinc.tipo_disponibilidade_mp === 'outro' && (
                        <div className="space-y-1 md:col-span-2">
                          <Label className={LABEL_CLS}>
                            Descrição do tipo (texto livre) <span className="text-rose-600">*</span>
                          </Label>
                          <Input
                            placeholder="Descreva o tipo de disponibilidade específico"
                            className={INPUT_CLS}
                            value={novoVinc.tipo_disponibilidade_outro || ''}
                            onChange={(e) =>
                              setNovoVinc({
                                ...novoVinc,
                                tipo_disponibilidade_outro: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className={LABEL_CLS}>Origem da MP derivada</Label>
                        <select
                          className={`${INPUT_CLS} w-full rounded-md border border-input bg-white px-2 py-1 text-xs`}
                          value={novoVinc.origem_mp_derivada || 'palanquilha'}
                          onChange={(e) =>
                            setNovoVinc({
                              ...novoVinc,
                              origem_mp_derivada: e.target.value as FacaOrigemMpDerivada,
                            })
                          }
                        >
                          {OPCOES_ORIGEM_DERIVADA.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className={LABEL_CLS}>Fator de conversão (t MP → t PA)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className={INPUT_CLS}
                          value={novoVinc.fator_conversao ?? 1}
                          onChange={(e) =>
                            setNovoVinc({ ...novoVinc, fator_conversao: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className={LABEL_CLS}>Unidade / forma de consolidação</Label>
                        <select
                          className={`${INPUT_CLS} w-full rounded-md border border-input bg-white px-2 py-1 text-xs`}
                          value={novoVinc.forma_consolidacao || 'toneladas'}
                          onChange={(e) =>
                            setNovoVinc({
                              ...novoVinc,
                              forma_consolidacao: e.target.value as FacaFormaConsolidacaoMp,
                            })
                          }
                        >
                          {OPCOES_FORMA_CONSOLIDACAO.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className={LABEL_CLS}>Regra de exibição no card MP Disponível</Label>
                        <select
                          className={`${INPUT_CLS} w-full rounded-md border border-input bg-white px-2 py-1 text-xs`}
                          value={novoVinc.regra_exibicao || 'somar_estoque_imediato'}
                          onChange={(e) =>
                            setNovoVinc({
                              ...novoVinc,
                              regra_exibicao: e.target.value as FacaRegraExibicaoMp,
                            })
                          }
                        >
                          {OPCOES_REGRA_EXIBICAO.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            Exige corte para virar MP utilizável?
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Sim exige passagem pela KS antes do consumo
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-slate-500">
                            {novoVinc.exige_corte ? 'Sim' : 'Não'}
                          </Label>
                          <Switch
                            checked={Boolean(novoVinc.exige_corte)}
                            onCheckedChange={(v) => setNovoVinc({ ...novoVinc, exige_corte: v })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            Permitir visualizar como disponibilidade sem corte?
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Sem este flag, a MP derivada não entra como estoque imediato
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-slate-500">
                            {novoVinc.disponivel_sem_corte ? 'Sim' : 'Não'}
                          </Label>
                          <Switch
                            checked={
                              novoVinc.disponivel_sem_corte !== false
                                ? Boolean(novoVinc.disponivel_sem_corte)
                                : false
                            }
                            onCheckedChange={(v) =>
                              setNovoVinc({ ...novoVinc, disponivel_sem_corte: v })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ação de salvar — alinhada à direita no padrão HUB */}
              <div className="flex items-center justify-end gap-3 pt-1">
                {salvoComSucesso && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> Vínculo persistido
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleSalvarVinculo}
                  disabled={salvando}
                  className={`${BTN_AZUL_CLS} min-w-[160px]`}
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Salvar Vínculo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold border-slate-300 hover:bg-slate-100 hover:text-[#004C97] min-w-[120px]"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
