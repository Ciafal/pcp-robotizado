import React, { useState } from 'react'
import {
  Sparkles,
  Send,
  MessageSquare,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { executiveService } from '@/services/executive-service'
import { useToast } from '@/hooks/use-toast'

interface ExecutiveAskHubAiProps {
  userRole?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const EXAMPLE_QUESTIONS = [
  'Quais são as pendências da L01 vindas da reunião de PCP?',
  'Existe algum comunicado vigente ou alerta crítico para as linhas?',
  'O que foi decidido na última reunião sobre qualidade e materiais?',
  'Por que a produção da L01 registrou perda de cadência esta semana?',
  'Quais indicadores apresentam risco de não atingir a meta no fechamento?',
]

export const ExecutiveAskHubAi: React.FC<ExecutiveAskHubAiProps> = () => {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou o Assistente Executivo Corporativo do HUB CIAFAL (Agente Nativo Skip Cloud). Posso esclarecer dúvidas sobre capacidade, perdas, ocupação de linhas, estoques e recomendações operacionais fundamentadas exclusivamente nos dados industriais reais do PCP aos quais você tem autorização.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputQuery, setInputQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim()
    if (!query || loading) return

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputQuery('')
    setLoading(true)

    try {
      const response = await executiveService.askExecutiveAgent({
        message: query,
        conversation_id: conversationId,
      })

      if (response.conversation_id) {
        setConversationId(response.conversation_id)
      }

      const aiMsg: ChatMessage = {
        id: response.message_id || `ai_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Consulta à IA',
        description:
          err?.data?.error ||
          err?.message ||
          'Acesso negado ou erro ao comunicar com o Agente Corporativo CIAFAL.',
      })

      // Mensagem de fallback amigável
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Não foi possível processar sua consulta: ${err?.data?.error || err?.message || 'Verifique suas permissões de acesso ao Cockpit Executivo.'}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Conversa reiniciada. Em que posso auxiliá-lo na análise executiva dos dados da CIAFAL?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setConversationId(null)
  }

  return (
    <Card className="bg-white border-blue-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border-b border-blue-100 p-4 pb-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              Pergunte ao Hub CIAFAL
              <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold">
                Agente Nativo Skip Cloud
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Consultas em linguagem natural protegidas por escopo e autorização granular RBAC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-xs h-7 text-slate-500 hover:text-slate-800"
            title="Limpar Histórico"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reiniciar
          </Button>
        </div>
      </CardHeader>

      {/* Corpo da Conversa com Scroll */}
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user'

          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                  isUser ? 'bg-slate-700' : 'bg-[#004C97]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] rounded-xl p-3 shadow-2xs ${
                  isUser
                    ? 'bg-[#004C97] text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none leading-relaxed'
                }`}
              >
                <div className="text-[11px] whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`text-[9px] mt-1 text-right font-mono ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#004C97] flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-none p-3 text-slate-500 text-[11px] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#004C97] animate-bounce" />
              <span>Consultando dados do PCP no Agente Skip Cloud...</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Sugestões de Perguntas Rápidas */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Exemplos:</span>
        {EXAMPLE_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            disabled={loading}
            className="text-[10px] bg-white border border-slate-200 text-slate-700 hover:text-[#004C97] hover:border-blue-300 px-2 py-1 rounded-md shrink-0 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Caixa de Entrada de Texto */}
      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
        <Input
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          placeholder="Faça uma pergunta sobre o planejamento, capacidade ou estoques da CIAFAL..."
          className="bg-white border-slate-300 text-slate-900 text-xs h-9 focus-visible:ring-[#004C97]"
          disabled={loading}
        />
        <Button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputQuery.trim()}
          className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-9 px-4 gap-1.5 shrink-0 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Perguntar</span>
        </Button>
      </div>
    </Card>
  )
}

export default ExecutiveAskHubAi
