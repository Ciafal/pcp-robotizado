import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'

export const MPAIAgentAnalystCard: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Olá! Sou o Agente Especialista em Matéria-Prima CIAFAL. Estou monitorando continuamente os estoques, programação do PCP, recebimentos SAP, sobras sem aplicação e desvios de substituição.',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Alertas Proativos do Agente IA
  const proactiveAlerts = [
    {
      id: 'al-1',
      title: 'Risco de Ruptura SAE 1045 em 18 dias',
      text: 'A MP 1045 possui ruptura projetada em 18 dias. O pedido de compra PO-45009040 (Sinobrás) de 40t chegará somente 4 dias depois. Recomenda-se antecipar a entrega junto a Compras.',
      severity: 'CRITICO',
    },
    {
      id: 'al-2',
      title: 'Cobertura Estendida SAE 1020',
      text: 'O aço 1020 possui material bruto suficiente para 51 dias, porém o estoque de acabado na expedição (+74 dias) prolonga a cobertura total da cadeia para 125 dias.',
      severity: 'INFO',
    },
    {
      id: 'al-3',
      title: '43,2 t em Sobras Sem Aplicação',
      text: 'Foram identificadas 43,2 t de sobras (< 0,35 t). Foram encontradas ordens futuras na L1/L2 potencialmente compatíveis no submódulo "Otimizar Aplicações".',
      severity: 'AVISO',
    },
    {
      id: 'al-4',
      title: 'Déficit no Pool Q130-525 para Semana 38',
      text: 'A programação L1 da Semana 38 exigirá 120 t adicionais do pool Q130-525. A produção L2 atual necessita ser programada para suprir o déficit.',
      severity: 'AVISO',
    },
    {
      id: 'al-5',
      title: 'Desvio de Aplicação: 1020 em Ordens AC',
      text: 'Houve taxa de 27,4% de utilização de 1020 em ordens comercialmente elegíveis para AC. Isso está antecipando a ruptura do estoque nobre.',
      severity: 'AVISO',
    },
  ]

  const handleSend = (userText?: string) => {
    const query = userText || inputValue
    if (!query.trim()) return

    setMessages((prev) => [...prev, { role: 'user', text: query }])
    if (!userText) setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      let reply =
        'Analisei as fontes oficiais SAP ECC e a programação do PCP Robotizado. Os parâmetros de atendimento e curvas de estoque confirmam que os níveis estão sendo balanceados de acordo com as regras de governança CIAFAL.'

      const qLower = query.toLowerCase()
      if (qLower.includes('1045') || qLower.includes('ruptura')) {
        reply =
          'O aço SAE 1045 possui 280,0 t de estoque disponível e consumo mensal médio de 290,0 t/mês. Pelo motor diário, a ruptura ocorrerá no dia 18/07/2026. O pedido SAP PO-45009040 da Sinobrás (40 t) está previsto para 22/07/2026. Recomenda-se emitir solicitação de antecipação formal para suprir a janela de 4 dias de risco.'
      } else if (
        qLower.includes('1020') ||
        qLower.includes('acabado') ||
        qLower.includes('cobertura')
      ) {
        reply =
          'Para o aço SAE 1020, o estoque de MP bruta confere 51 dias de cobertura (esgotamento em agosto). Somando os 920,0 t de produto acabado e semiacabado em estoque comercial (+74 dias), a cobertura total atinge 125 dias (fim estimado em 18/11/2026). Situação plenamente estável.'
      } else if (qLower.includes('sobra') || qLower.includes('sem aplicação')) {
        reply =
          'Atualmente existem 43,2 t em lotes classificados como Sem Aplicação (critério: peças < 0,35 t). No submódulo Otimizar Aplicações, o motor de IA identificou compatibilidade dimensional para 87% deste volume nas ordens de laminação do próximo mês.'
      } else if (qLower.includes('l2') || qLower.includes('atendimento')) {
        reply =
          'A Linha 2 está configurada com fator de atendimento de 95% (0,95 versionado). Para a Semana 38, a L1 requisitou 120 t de tarugos 120x120 mm. A ação foi encaminhada para a fila de versionamento de programação da L2.'
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
      setIsTyping(false)
    }, 600)
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-200 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              IA Analista de Matéria-Prima CIAFAL
            </CardTitle>
            <span className="text-[10px] text-slate-500">
              Agente especializado Skip AI conectado aos dados oficiais SAP e PCP
            </span>
          </div>
        </div>
        <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-semibold">
          <Sparkles className="w-3 h-3 mr-1 text-blue-600" /> Monitoramento Contínuo
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Alertas Inteligentes Proativos */}
        <div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Insights e Alertas Proativos da IA
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {proactiveAlerts.slice(0, 3).map((al) => (
              <div
                key={al.id}
                onClick={() => handleSend(`Explique o insight: ${al.title}`)}
                className="p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-sm bg-slate-50/70 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 line-clamp-1">{al.title}</span>
                  <Badge
                    className={`text-[9px] px-1 py-0 ${
                      al.severity === 'CRITICO'
                        ? 'bg-rose-100 text-rose-700'
                        : al.severity === 'AVISO'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {al.severity}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{al.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat com o Agente */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2.5">
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-5 h-5 rounded bg-[#004C97] text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                    IA
                  </div>
                )}
                <div
                  className={`p-2.5 rounded-lg max-w-[85%] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#004C97] text-white'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#004C97] animate-spin" />
                Agente IA analisando dados de estoque e ordens...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2 pt-1 border-t border-slate-200/80"
          >
            <Input
              placeholder="Pergunte sobre rupturas, aços especiais, sobras ou substituições..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 text-xs bg-white"
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 px-3 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

export default MPAIAgentAnalystCard
