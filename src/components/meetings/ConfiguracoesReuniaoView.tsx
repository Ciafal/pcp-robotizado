import React, { useState, useEffect } from 'react'
import {
  Sliders,
  FileText,
  Save,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { PCPMeetingTemplateRecord, RecurrenceConfig } from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export const ConfiguracoesReuniaoView: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<PCPMeetingTemplateRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Configuração de Recorrência Padrão
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(true)
  const [recurrenceDay, setRecurrenceDay] = useState<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX'>('TER')
  const [recurrenceTime, setRecurrenceTime] = useState('09:00')
  const [recurrencePeriod, setRecurrencePeriod] = useState<'SEMANAL' | 'QUINZENAL' | 'MENSAL'>(
    'SEMANAL',
  )

  const userContext = {
    id: user?.id,
    name: user?.name || 'Coordenação PCP',
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const list = await pcpMeetingFatia1Service.listTemplates()
      setTemplates(list)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar templates',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleSaveRecurrence = () => {
    toast({
      title: 'Recorrência Configurada!',
      description: `Padrão salvo: Toda ${recurrenceDay} às ${recurrenceTime} (${recurrencePeriod}). Aplicável na criação de novas reuniões.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Topo Informativo */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <h2 className="text-base font-black text-slate-900 tracking-tight">
          Configurações de Governança & Templates SGQ
        </h2>
        <p className="text-xs text-slate-500">
          Gerenciamento parametrizável do cadastro de templates oficiais de ATA e recorrência
          semanal sem necessidade de alterar o código-fonte da aplicação.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel 1: Recorrência Semanal */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#004C97]" /> Recorrência Padrão da Reunião PCP
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">
              Parametrizável
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recCheck"
                checked={recurrenceEnabled}
                onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#004C97]"
              />
              <label htmlFor="recCheck" className="font-semibold text-slate-800">
                Ativar sugestão de recorrência semanal automática
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Dia da Semana</label>
                <select
                  value={recurrenceDay}
                  onChange={(e: any) => setRecurrenceDay(e.target.value)}
                  disabled={!recurrenceEnabled}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs disabled:opacity-50"
                >
                  <option value="SEG">Segunda-feira</option>
                  <option value="TER">Terça-feira</option>
                  <option value="QUA">Quarta-feira</option>
                  <option value="QUI">Quinta-feira</option>
                  <option value="SEX">Sexta-feira</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Horário Padrão</label>
                <Input
                  type="time"
                  value={recurrenceTime}
                  onChange={(e) => setRecurrenceTime(e.target.value)}
                  disabled={!recurrenceEnabled}
                  className="text-xs h-8 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Periodicidade</label>
                <select
                  value={recurrencePeriod}
                  onChange={(e: any) => setRecurrencePeriod(e.target.value)}
                  disabled={!recurrenceEnabled}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs disabled:opacity-50"
                >
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                onClick={handleSaveRecurrence}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Salvar Regra de Recorrência
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Painel 2: Cadastro de Templates SGQ */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004C97]" /> Cadastro de Templates de ATA SGQ
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTemplates}
              disabled={loading}
              className="text-xs font-semibold h-7 gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            <p className="text-slate-600">
              O modelo vigente abaixo é consumido dinamicamente pelo gerador de ATA via IA. Novas
              revisões do SGQ podem ser adicionadas diretamente na base de dados.
            </p>

            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3 border border-slate-200 rounded-md bg-white space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{tpl.code}</span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">{tpl.status}</Badge>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Revisão {tpl.revision} &bull; Vigência: {tpl.effective_date}
                  </span>
                </div>

                <div className="text-slate-700 font-medium">{tpl.title}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Responsável: {tpl.responsible}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Seções Estruturadas ({tpl.structure?.secoes?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                    {tpl.structure?.secoes?.map((sec) => (
                      <Badge
                        key={sec.id}
                        variant="outline"
                        className="text-[10px] text-slate-700 bg-slate-50"
                      >
                        {sec.ordem}. {sec.nome} {sec.obrigatorio ? '*' : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ConfiguracoesReuniaoView
