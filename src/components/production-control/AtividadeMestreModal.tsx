import React, { useState } from 'react'
import {
  Plus,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChecklistAtividadeModelo,
  ChecklistFonteDados,
  ChecklistFrequencia,
} from '@/types/checklist-fechamento'

interface Props {
  open: boolean
  onClose: () => void
  modelo: ChecklistAtividadeModelo | null
  onSave: (dados: Partial<ChecklistAtividadeModelo>) => Promise<void>
  onToggleAtivo?: (id: string, ativo: boolean) => Promise<void>
}

export const AtividadeMestreModal: React.FC<Props> = ({
  open,
  onClose,
  modelo,
  onSave,
  onToggleAtivo,
}) => {
  const isEditing = Boolean(modelo?.id)

  const [codigo, setCodigo] = useState('')
  const [sequencia, setSequencia] = useState<number>(1)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Processamento SAP')
  const [linhaCentro, setLinhaCentro] = useState('Geral')
  const [transacaoSap, setTransacaoSap] = useState('')
  const [depositoSap, setDepositoSap] = useState('')
  const [frequencia, setFrequencia] = useState<ChecklistFrequencia>('somente_fechamento')
  const [obrigatoria, setObrigatoria] = useState(true)
  const [responsavelPadrao, setResponsavelPadrao] = useState('Controle de Produção')
  const [areaResponsavel, setAreaResponsavel] = useState('Controle de Produção')
  const [prazoRelativo, setPrazoRelativo] = useState('2º dia útil')
  const [manualDoc, setManualDoc] = useState('CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO')
  const [regraValidacao, setRegraValidacao] = useState('')
  const [fonteDados, setFonteDados] = useState<ChecklistFonteDados>('Manual')
  const [statusRegra, setStatusRegra] = useState('Oficial')
  const [ativa, setAtiva] = useState(true)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (modelo && open) {
      setCodigo(modelo.codigo || '')
      setSequencia(modelo.sequencia || 1)
      setTitulo(modelo.titulo || '')
      setDescricao(modelo.descricao_detalhada || '')
      setCategoria(modelo.categoria || 'Processamento SAP')
      setLinhaCentro(modelo.linha_centro_relacionado || 'Geral')
      setTransacaoSap(modelo.transacao_sap || '')
      setDepositoSap(modelo.deposito_sap || '')
      setFrequencia(modelo.frequencia || 'somente_fechamento')
      setObrigatoria(Boolean(modelo.obrigatoria))
      setResponsavelPadrao(modelo.responsavel_padrao || 'Controle de Produção')
      setAreaResponsavel(modelo.area_responsavel || 'Controle de Produção')
      setPrazoRelativo(modelo.prazo_relativo_fechamento || '2º dia útil')
      setManualDoc(modelo.manual_documento_referencia || 'CHECK-LIST FECHAMENTO')
      setRegraValidacao(modelo.regra_validacao || '')
      setFonteDados(modelo.fonte_dados || 'Manual')
      setStatusRegra(modelo.status_regra || 'Oficial')
      setAtiva(modelo.ativa ?? true)
    } else if (!modelo && open) {
      setCodigo('')
      setSequencia(27)
      setTitulo('')
      setDescricao('')
      setCategoria('Processamento SAP')
      setLinhaCentro('Geral')
      setTransacaoSap('')
      setDepositoSap('')
      setFrequencia('somente_fechamento')
      setObrigatoria(true)
      setResponsavelPadrao('Controle de Produção')
      setAreaResponsavel('Controle de Produção')
      setPrazoRelativo('2º dia útil')
      setManualDoc('CHECK-LIST FECHAMENTO DO CONTROLE DE PRODUÇÃO')
      setRegraValidacao('')
      setFonteDados('Manual')
      setStatusRegra('Oficial')
      setAtiva(true)
    }
  }, [modelo, open])

  const handleSubmit = async () => {
    if (!codigo.trim() || !titulo.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: modelo?.id,
        codigo: codigo.trim(),
        sequencia,
        titulo: titulo.trim(),
        descricao_detalhada: descricao.trim(),
        categoria,
        linha_centro_relacionado: linhaCentro,
        empresa: 'CIAFAL',
        transacao_sap: transacaoSap.trim() || 'N/A',
        deposito_sap: depositoSap.trim() || 'N/A',
        frequencia,
        obrigatoria,
        responsavel_padrao: responsavelPadrao,
        area_responsavel: areaResponsavel,
        prazo_relativo_fechamento: prazoRelativo,
        manual_documento_referencia: manualDoc,
        regra_validacao: regraValidacao.trim(),
        fonte_dados: fonteDados,
        status_regra: statusRegra,
        ativa,
        data_inicio_vigencia:
          modelo?.data_inicio_vigencia || new Date().toISOString().split('T')[0],
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async () => {
    if (!modelo?.id || !onToggleAtivo) return
    setSaving(true)
    try {
      await onToggleAtivo(modelo.id, !ativa)
      setAtiva(!ativa)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {isEditing
                    ? `Editar Atividade Mestre (${codigo})`
                    : 'Cadastrar Nova Atividade Mestre'}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Regra do manual de fechamento da CIAFAL (preserva histórico de meses antigos).
                </p>
              </div>
            </div>

            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleAtivo}
                className={`h-7 text-xs ${ativa ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
              >
                {ativa ? 'Desativar Atividade' : 'Reativar Atividade'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Código <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: 1.26"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="h-8 text-xs bg-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Sequência</label>
              <Input
                type="number"
                min={1}
                value={sequencia}
                onChange={(e) => setSequencia(parseInt(e.target.value, 10) || 1)}
                className="h-8 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Categoria</label>
              <Input
                type="text"
                placeholder="Ex: Processamento SAP"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Título da Atividade <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: ZPP_99 — Validação de Sucata Especial"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Descrição Detalhada do Manual</label>
            <Textarea
              rows={2}
              placeholder="Instruções operacionais e procedimentos do manual interno..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Transação SAP</label>
              <Input
                type="text"
                placeholder="Ex: MB52, COGI, ZPP_04"
                value={transacaoSap}
                onChange={(e) => setTransacaoSap(e.target.value)}
                className="h-8 text-xs bg-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Depósito SAP</label>
              <Input
                type="text"
                placeholder="Ex: DP06, DP11, BAL2"
                value={depositoSap}
                onChange={(e) => setDepositoSap(e.target.value)}
                className="h-8 text-xs bg-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Linha / Centro</label>
              <Input
                type="text"
                placeholder="Ex: L1, L2, Acabamento"
                value={linhaCentro}
                onChange={(e) => setLinhaCentro(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Frequência</label>
              <select
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as ChecklistFrequencia)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="somente_fechamento">Somente Fechamento</option>
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="diaria">Diária</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Fonte de Dados</label>
              <select
                value={fonteDados}
                onChange={(e) => setFonteDados(e.target.value as ChecklistFonteDados)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="Manual">Manual</option>
                <option value="SAP RFC">SAP RFC</option>
                <option value="MES">MES</option>
                <option value="Integração HUB">Integração HUB</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Status da Regra</label>
              <select
                value={statusRegra}
                onChange={(e) => setStatusRegra(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="Oficial">Oficial</option>
                <option value="Regra em validação">Regra em validação</option>
                <option value="Pendente de validação de processo">
                  Pendente de validação de processo
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Regra de Validação Objetiva</label>
            <Textarea
              rows={2}
              placeholder="Critério exato para que a atividade seja aprovada (OK)..."
              value={regraValidacao}
              onChange={(e) => setRegraValidacao(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Atividade Obrigatória</span>
              <span className="text-slate-500 text-[11px]">
                Se ativa como obrigatória, o fechamento mensal só poderá ser concluído se esta
                atividade estiver em OK.
              </span>
            </div>
            <Switch checked={obrigatoria} onCheckedChange={setObrigatoria} />
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving || !codigo.trim() || !titulo.trim()}
            onClick={handleSubmit}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-medium shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Atividade Mestre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
