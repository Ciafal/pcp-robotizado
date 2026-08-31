import React, { useState, useEffect } from 'react'
import { Layers, RefreshCw, UploadCloud, Sliders, ShieldCheck, Clock, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraUpload,
  CarteiraIAInsight,
} from '@/types/carteira-analise'
import { CarteiraService } from '@/services/carteira-service'
import { CarteiraZSD28CEngine } from '@/services/carteira-engine'

// Componentes da Análise de Carteira
import CarteiraGeralView from '@/components/carteira-views/CarteiraGeralView'
import CarteiraL1View from '@/components/carteira-views/CarteiraL1View'
import CarteiraL2View from '@/components/carteira-views/CarteiraL2View'
import CarteiraMTOView from '@/components/carteira-views/CarteiraMTOView'
import CarteiraRevendaView from '@/components/carteira-views/CarteiraRevendaView'
import CarteiraImportadoView from '@/components/carteira-views/CarteiraImportadoView'
import AnalistaIACard from '@/components/carteira-views/AnalistaIACard'
import MemoriaCalculoModal from '@/components/carteira-views/MemoriaCalculoModal'
import ImportacaoCarteiraModal from '@/components/carteira-views/ImportacaoCarteiraModal'
import GovernancaRegrasModal from '@/components/carteira-views/GovernancaRegrasModal'
import ReconciliacaoSapModal from '@/components/carteira-views/ReconciliacaoSapModal'

type TopicoCarteira = 'GERAL' | 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO'

export const AnaliseCarteiraPage: React.FC = () => {
  const { toast } = useToast()

  const [topicoAtivo, setTopicoAtivo] = useState<TopicoCarteira>('GERAL')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [itens, setItens] = useState<CarteiraItem[]>([])
  const [entradasFuturas, setEntradasFuturas] = useState<CarteiraEntradaFutura[]>([])
  const [uploadAtual, setUploadAtual] = useState<CarteiraUpload | null>(null)
  const [historicoUploads, setHistoricoUploads] = useState<CarteiraUpload[]>([])
  const [insightsIA, setInsightsIA] = useState<CarteiraIAInsight[]>([])

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMemoriaOpen, setIsMemoriaOpen] = useState(false)
  const [itemSelecionadoMemoria, setItemSelecionadoMemoria] = useState<CarteiraItem | null>(null)
  const [isRegrasModalOpen, setIsRegrasModalOpen] = useState(false)
  const [isReconciliacaoOpen, setIsReconciliacaoOpen] = useState(false)
  const [filtroMaterialDireto, setFiltroMaterialDireto] = useState('')

  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const regrasDb = await CarteiraService.carregarRegrasVigentes()
      const res = await CarteiraService.carregarCarteiraAtual()

      // Se houver regras cadastradas no backend, recalcula itens para assegurar paridade
      if (regrasDb && res.itens.length > 0) {
        const recalculados = res.itens.map((item) =>
          CarteiraZSD28CEngine.calcularItem(item, res.entradasFuturas, regrasDb),
        )
        setItens(recalculados)
      } else {
        setItens(res.itens)
      }

      setEntradasFuturas(res.entradasFuturas)
      setUploadAtual(res.uploadAtual)
      setHistoricoUploads(res.historicoUploads)
      setInsightsIA(res.insights)
    } catch (err: any) {
      console.error('Erro ao carregar dados da carteira:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleCargaConcluida = (
    upload: CarteiraUpload,
    novosItens: CarteiraItem[],
    novasEntradas: CarteiraEntradaFutura[],
  ) => {
    setUploadAtual(upload)
    setItens(novosItens)
    setEntradasFuturas(novasEntradas)
    setHistoricoUploads((prev) => [
      upload,
      ...prev.filter((u) => u.upload_code !== upload.upload_code),
    ])
    carregarDados()
  }

  const handleRollback = async (uploadCode: string) => {
    const ok = await CarteiraService.reverterParaCargaAnterior(uploadCode)
    if (ok) {
      toast({
        title: 'Versão Restaurada com Sucesso',
        description: `A carteira foi restaurada para a carga ${uploadCode}.`,
      })
      await carregarDados()
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha no Rollback',
        description: 'Não foi possível restaurar a versão selecionada.',
      })
    }
  }

  const handleOpenMemoria = (item: CarteiraItem) => {
    setItemSelecionadoMemoria(item)
    setIsMemoriaOpen(true)
  }

  const handleFiltrarMaterialIA = (material: string) => {
    setFiltroMaterialDireto(material)
    setTopicoAtivo('GERAL')
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-none">
                  Análise de Carteira
                </h1>
                <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                  Paridade SAP ZSD28C
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                PCP Robotizado &bull; Central de Carteira Aberta, Saldos, Ruptura e Detecção de
                Duplicidades CIAFAL.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsReconciliacaoOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 h-8"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" /> Reconciliação SAP
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRegrasModalOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 h-8"
          >
            <Sliders className="w-3.5 h-3.5 text-[#004C97]" /> Motor de Regras
          </Button>

          <Button
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Importar Carteira QAS
          </Button>
        </div>
      </div>

      <div className="px-3.5 py-2 bg-slate-100/80 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold text-slate-800">
            <Database className="w-3.5 h-3.5 text-[#004C97]" /> Fonte:{' '}
            {uploadAtual
              ? `${uploadAtual.source_mode} (${uploadAtual.upload_code})`
              : 'Excel QAS / Aguardando Carga'}
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Dados atualizados em:{' '}
            {uploadAtual?.created
              ? new Date(uploadAtual.created).toLocaleString('pt-BR')
              : 'Tempo Real'}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-slate-500">
            Unidades: <strong>Toneladas (t) & ABNT/SI</strong>
          </span>
          <button
            onClick={carregarDados}
            className="text-[#004C97] hover:underline font-bold flex items-center gap-1 ml-2"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Recarregar
          </button>
        </div>
      </div>

      <AnalistaIACard insights={insightsIA} onFiltrarMaterial={handleFiltrarMaterialIA} />

      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setTopicoAtivo('GERAL')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'GERAL'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          1. Carteira Geral (ZSD28C)
        </button>

        <button
          onClick={() => setTopicoAtivo('L1')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'L1'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          2. Carteira L1 (Ciclo L1)
        </button>

        <button
          onClick={() => setTopicoAtivo('L2')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'L2'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          3. Carteira L2 (Ciclo L2)
        </button>

        <button
          onClick={() => setTopicoAtivo('MTO')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'MTO'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          4. Carteira MTO (L1 / L2)
        </button>

        <button
          onClick={() => setTopicoAtivo('REVENDA')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'REVENDA'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          5. Carteira Revenda
        </button>

        <button
          onClick={() => setTopicoAtivo('IMPORTADO')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'IMPORTADO'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          6. Carteira Importado
        </button>
      </div>

      <div className="pt-1">
        {topicoAtivo === 'GERAL' && (
          <CarteiraGeralView
            itens={itens}
            onOpenMemoria={handleOpenMemoria}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            filtroMaterial={filtroMaterialDireto}
          />
        )}

        {topicoAtivo === 'L1' && <CarteiraL1View itens={itens} onOpenMemoria={handleOpenMemoria} />}

        {topicoAtivo === 'L2' && <CarteiraL2View itens={itens} onOpenMemoria={handleOpenMemoria} />}

        {topicoAtivo === 'MTO' && (
          <CarteiraMTOView itens={itens} onOpenMemoria={handleOpenMemoria} />
        )}

        {topicoAtivo === 'REVENDA' && (
          <CarteiraRevendaView
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
          />
        )}

        {topicoAtivo === 'IMPORTADO' && (
          <CarteiraImportadoView
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
          />
        )}
      </div>

      <MemoriaCalculoModal
        isOpen={isMemoriaOpen}
        onClose={() => setIsMemoriaOpen(false)}
        item={itemSelecionadoMemoria}
      />

      <ImportacaoCarteiraModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onCargaConcluida={handleCargaConcluida}
        historicoUploads={historicoUploads}
        onRollback={handleRollback}
      />

      <GovernancaRegrasModal
        isOpen={isRegrasModalOpen}
        onClose={() => setIsRegrasModalOpen(false)}
        onSalvarRegras={async (regrasAtualizadas) => {
          await CarteiraService.salvarRegrasParametrizadas(
            regrasAtualizadas,
            'pcp.admin@ciafal.com.br',
            'Atualização de parâmetros via Modal de Governança',
          )
          carregarDados()
        }}
      />

      <ReconciliacaoSapModal
        isOpen={isReconciliacaoOpen}
        onClose={() => setIsReconciliacaoOpen(false)}
        itensPcp={itens}
      />
    </div>
  )
}
export default AnaliseCarteiraPage
