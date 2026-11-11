// Tópico: Envio de MP KS → Ciafal (GESTÃO DE MATÉRIA-PRIMA)
// Aba 1: Seleção de peças para envio | Aba 2: Formação de carga / Romaneio
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import AbaSelecaoPecas from '@/components/mp-ks-ciafal/AbaSelecaoPecas'
import AbaFormacaoCarga from '@/components/mp-ks-ciafal/AbaFormacaoCarga'
import LoginExpedidorModal from '@/components/mp-ks-ciafal/LoginExpedidorModal'
import HistoricoSelecoesModal from '@/components/mp-ks-ciafal/HistoricoSelecoesModal'
import type { UsuarioExpedidor } from '@/services/mp-ks-ciafal-service'

export default function EnvioMpKsCiafalPage() {
  const [tab, setTab] = useState('selecao')
  const [usuario, setUsuario] = useState<UsuarioExpedidor | null>(null)
  const [loginAberto, setLoginAberto] = useState(true)
  const [historicoAberto, setHistoricoAberto] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-[1920px] space-y-4">
        {/* Cabeçalho institucional */}
        <Card className="border-t-4 border-t-[#004C97] shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#004C97] md:text-xl">
                Envio de MP KS → Ciafal
              </h1>
              <p className="text-xs text-slate-500 md:text-sm">
                Seleção versionada de peças · Transferência 311 → DP28 · Formação de carga/Romaneio
                · 313 trânsito · 315 recebimento (DP02/DP07)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {usuario ? (
                <div className="rounded-md border border-[#004C97]/20 bg-[#004C97]/5 px-3 py-1.5 text-xs md:text-sm">
                  <span className="font-semibold text-[#004C97]">{usuario.nome}</span>
                  <span className="ml-2 text-slate-500">
                    Mat. {usuario.matricula} · Centro {usuario.centro}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setLoginAberto(true)}
                  className="rounded-md bg-[#004C97] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003a75] md:text-sm"
                >
                  Login operacional
                </button>
              )}
              <button
                onClick={() => setHistoricoAberto(true)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:text-sm"
              >
                Histórico
              </button>
            </div>
          </CardContent>
        </Card>

        {!usuario ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Faça o login operacional (centro + matrícula/senha) para acessar o processo de envio.
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="selecao">1. Seleção de peças para envio</TabsTrigger>
              <TabsTrigger value="carga">2. Formação de carga / Romaneio</TabsTrigger>
            </TabsList>
            <TabsContent value="selecao">
              <AbaSelecaoPecas usuario={usuario} />
            </TabsContent>
            <TabsContent value="carga">
              <AbaFormacaoCarga usuario={usuario} />
            </TabsContent>
          </Tabs>
        )}

        <LoginExpedidorModal
          open={loginAberto}
          onOpenChange={setLoginAberto}
          onSuccess={(u) => {
            setUsuario(u)
            setLoginAberto(false)
          }}
        />
        <HistoricoSelecoesModal open={historicoAberto} onOpenChange={setHistoricoAberto} />
      </div>
    </div>
  )
}
