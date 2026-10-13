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
import { Sliders, Plus, Save, CheckCircle2, Boxes, Factory, Layers, Info } from 'lucide-react'
import { FacaMaterialParametrizado, FacaVinculoPaMp } from '@/types/faca-analise'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { useToast } from '@/hooks/use-toast'

interface FacaParametrizacaoModalProps {
  isOpen: boolean
  onClose: () => void
  materiais: FacaMaterialParametrizado[]
  vinculos: FacaVinculoPaMp[]
  onSalvo: () => void
}

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
  const [novoVinc, setNovoVinc] = useState<Partial<FacaVinculoPaMp>>({
    codigo_pa: '',
    descricao_pa: '',
    codigo_mp: '',
    descricao_mp: '',
    rendimento_transformacao: 0.92,
    perdas_previstas_pct: 8.0,
    origem_cadastro: 'Ficha Mestra do PCP',
    prioridade_consumo: 1,
    centro: '1100',
    ativo: true,
  })

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
        description: err.message || 'Falha ao gravar material no banco de dados.',
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

    try {
      setSalvando(true)
      await FacaAnaliseService.salvarVinculoPaMp({
        ...novoVinc,
        origem_cadastro: 'Ficha Mestra do PCP',
      })
      toast({
        title: 'Vínculo PA × MP homologado',
        description: `${novoVinc.codigo_pa} vinculado a ${novoVinc.codigo_mp} com rendimento de ${((novoVinc.rendimento_transformacao || 0.92) * 100).toFixed(1)}%.`,
      })
      setNovoVinc({
        codigo_pa: '',
        descricao_pa: '',
        codigo_mp: '',
        descricao_mp: '',
        rendimento_transformacao: 0.92,
        perdas_previstas_pct: 8.0,
        origem_cadastro: 'Ficha Mestra do PCP',
        prioridade_consumo: 1,
        centro: '1100',
        ativo: true,
      })
      onSalvo()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar vínculo',
        description: err.message || 'Falha ao persistir correlação técnica.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Parametrização Oficial — Grupo FACA & Matéria-Prima
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Homologação técnica de códigos SAP, lotes mínimos de laminação e vínculos com MP
                (Ficha Mestra)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Regra de Governança CIAFAL:</strong> Não assumir que todo material cujo código
            contém uma sequência pertence ao grupo FACA. A classificação utiliza estritamente os
            cadastros efetivos do SAP ou parametrizações homologadas nesta tela. Vínculos PA×MP
            refletem os rendimentos reais da Ficha Mestra sem dados fictícios.
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="materiais" className="text-xs font-semibold gap-1.5">
              <Factory className="w-3.5 h-3.5" /> 1. Materiais FACA Homologados
            </TabsTrigger>
            <TabsTrigger value="vinculos" className="text-xs font-semibold gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> 2. Vínculos PA × Matéria-Prima
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materiais" className="space-y-4 pt-2">
            {/* Tabela de materiais existentes */}
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
                      <TableRow key={m.codigo_material} className="hover:bg-slate-50/50">
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
                              className="bg-purple-50 text-purple-700 border-purple-300 text-[10px]"
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

            {/* Cadastro rápido de novo material */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Plus className="w-3.5 h-3.5 text-[#004C97]" /> Adicionar Novo Material ao Grupo
                FACA
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Código Material (SAP)</Label>
                  <Input
                    placeholder="Ex: FACA-550-1045"
                    className="h-8 text-xs font-mono"
                    value={novoMat.codigo_material}
                    onChange={(e) =>
                      setNovoMat({ ...novoMat, codigo_material: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Descrição Técnica</Label>
                  <Input
                    placeholder="Ex: BARRA CHATA FACA 550x12"
                    className="h-8 text-xs"
                    value={novoMat.descricao_material}
                    onChange={(e) => setNovoMat({ ...novoMat, descricao_material: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Grupo de Faca</Label>
                  <Input
                    placeholder="Ex: FACAS INDUSTRIAIS"
                    className="h-8 text-xs"
                    value={novoMat.grupo_faca}
                    onChange={(e) => setNovoMat({ ...novoMat, grupo_faca: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Bitola</Label>
                  <Input
                    placeholder="Ex: 550x12 mm"
                    className="h-8 text-xs"
                    value={novoMat.bitola}
                    onChange={(e) => setNovoMat({ ...novoMat, bitola: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Tipo de Aço</Label>
                  <Input
                    placeholder="Ex: SAE 1045"
                    className="h-8 text-xs"
                    value={novoMat.tipo_aco}
                    onChange={(e) => setNovoMat({ ...novoMat, tipo_aco: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Centro Produtivo</Label>
                  <Input
                    placeholder="1100"
                    className="h-8 text-xs font-mono"
                    value={novoMat.centro}
                    onChange={(e) => setNovoMat({ ...novoMat, centro: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Lote Mínimo Laminação (t)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    className="h-8 text-xs"
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
                    className="h-8 w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Material
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-slate-500">
                        Nenhum vínculo cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vinculos.map((v, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Cadastro rápido de vínculo */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Plus className="w-3.5 h-3.5 text-[#004C97]" /> Novo Vínculo Técnico PA × MP
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Código PA (FACA)</Label>
                  <Input
                    placeholder="Ex: FACA-450-1045"
                    className="h-8 text-xs font-mono"
                    value={novoVinc.codigo_pa}
                    onChange={(e) =>
                      setNovoVinc({ ...novoVinc, codigo_pa: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Código MP Vinculada</Label>
                  <Input
                    placeholder="Ex: MP-PAL-150-1045"
                    className="h-8 text-xs font-mono"
                    value={novoVinc.codigo_mp}
                    onChange={(e) =>
                      setNovoVinc({ ...novoVinc, codigo_mp: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Rendimento de Transformação</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.92 para 92%"
                    className="h-8 text-xs"
                    value={novoVinc.rendimento_transformacao}
                    onChange={(e) =>
                      setNovoVinc({ ...novoVinc, rendimento_transformacao: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Perdas Previstas (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="8.0 para 8%"
                    className="h-8 text-xs"
                    value={novoVinc.perdas_previstas_pct}
                    onChange={(e) =>
                      setNovoVinc({ ...novoVinc, perdas_previstas_pct: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Descrição MP</Label>
                  <Input
                    placeholder="PALANQUILHA 150x150 MM"
                    className="h-8 text-xs"
                    value={novoVinc.descricao_mp}
                    onChange={(e) => setNovoVinc({ ...novoVinc, descricao_mp: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Prioridade Consumo</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={novoVinc.prioridade_consumo}
                    onChange={(e) =>
                      setNovoVinc({ ...novoVinc, prioridade_consumo: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Centro</Label>
                  <Input
                    placeholder="1100"
                    className="h-8 text-xs font-mono"
                    value={novoVinc.centro}
                    onChange={(e) => setNovoVinc({ ...novoVinc, centro: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={handleSalvarVinculo}
                    disabled={salvando}
                    className="h-8 w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Vínculo
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
