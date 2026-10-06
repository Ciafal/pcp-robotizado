import React, { useState } from 'react'
import { MapaLogisticoCargasTab } from '@/components/tms/MapaLogisticoCargasTab'
import { SapSalesOrderItem } from '@/types/tms-mapa-logistico'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  ListFilter,
  CalendarCheck2,
  GitCompare,
  Truck,
  PlusCircle,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from 'lucide-react'

export const PlanejadorCargasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lista' | 'planejamento' | 'mapa' | 'comparacao'>(
    'mapa',
  )
  const [selectedOrdersForPlan, setSelectedOrdersForPlan] = useState<SapSalesOrderItem[]>([])

  const handleNavigateToPlanning = (orders?: SapSalesOrderItem[]) => {
    if (orders && orders.length > 0) {
      setSelectedOrdersForPlan(orders)
    }
    setActiveTab('planejamento')
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-5">
      {/* Cabeçalho do Módulo TMS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Planejador de Cargas
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  TMS Logística Integrada
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Torre Geográfica e Operacional de Otimização de Cargas CIAFAL / Sidercentro
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-xs">
            SAP S/4HANA Conectado
          </Badge>
        </div>
      </div>

      {/* Navegação entre Visões do Planejador de Cargas (Lista | Planejamento | Mapa Logístico | Comparação de Cenários) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-slate-100 p-1 border">
            <TabsTrigger
              value="lista"
              className="text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista de Pedidos</span>
            </TabsTrigger>

            <TabsTrigger
              value="planejamento"
              className="text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Planejamento de Cargas</span>
              {selectedOrdersForPlan.length > 0 && (
                <Badge className="h-4 px-1 text-[10px] bg-blue-600 text-white">
                  {selectedOrdersForPlan.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="mapa"
              className="text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Mapa Logístico</span>
            </TabsTrigger>

            <TabsTrigger
              value="comparacao"
              className="text-xs font-medium flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Comparação de Cenários</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Visão: Lista de Pedidos */}
        <TabsContent value="lista" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Carteira Geral Integrada — Visão em Lista</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('mapa')}
                  className="text-xs h-7"
                >
                  <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Ver no Mapa Logístico
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-slate-600 space-y-3">
              <p>
                A carteira operacional de vendas é alimentada continuamente pela integração oficial
                com SAP S/4HANA (tabela{' '}
                <span className="font-mono text-blue-700">sap_sales_orders</span>).
              </p>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-900 block mb-1">
                  Dica de Operação Logística:
                </span>
                <span>
                  Utilize a aba <strong>"Mapa Logístico"</strong> para visualizar a concentração
                  geográfica de tonelagem por estado e cidade, identificar oportunidades de
                  consolidação da IA e simular cargas diretamente sobre o mapa do Brasil.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Visão: Planejamento */}
        <TabsContent value="planejamento" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Mesa de Formação e Sequenciamento de Cargas</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('mapa')}
                  className="text-xs h-7"
                >
                  <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Voltar ao Mapa Logístico
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              {selectedOrdersForPlan.length > 0 ? (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-semibold text-emerald-900 block mb-1">
                    Pedidos Importados do Mapa Logístico ({selectedOrdersForPlan.length} itens):
                  </span>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {selectedOrdersForPlan.map((o) => (
                      <div key={o.id} className="flex justify-between font-mono text-[11px]">
                        <span>
                          {o.sales_order}/{o.sales_order_item} — {o.customer_name} ({o.city})
                        </span>
                        <span className="font-bold">{o.weight_tons} t</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>
                  Nenhuma simulação aberta no momento. Selecione pedidos no{' '}
                  <strong>Mapa Logístico</strong> e clique em "Simular Carga" para carregar
                  automaticamente a composição nesta mesa.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Visão: Mapa Logístico (TORRE GEOGRÁFICA) */}
        <TabsContent value="mapa" className="space-y-4">
          <MapaLogisticoCargasTab onNavigateToPlanning={handleNavigateToPlanning} />
        </TabsContent>

        {/* 4. Visão: Comparação de Cenários */}
        <TabsContent value="comparacao" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">
                Comparação de Cenários de Frete & Lotação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-slate-600 space-y-2">
              <p>
                Compare alternativas de consolidação de itinerários (e.g., Carreta 32 t vs Bitrem 74
                t, janelas de entrega combinadas e economia de frete por tonelada transportada).
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="font-semibold text-slate-800 block mb-1">
                  Cenário 1: Expedição Fracionada por Pedido
                </span>
                <span className="text-slate-500">
                  Custo médio estimado de R$ 245,00 / tonelada com ociosidade veicular de 38%.
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-900 block mb-1">
                  Cenário 2: Consolidação Recomendada pela IA Logística
                </span>
                <span className="text-blue-800">
                  Custo otimizado de R$ 208,00 / tonelada com aproveitamento veicular de 92% e
                  redução de 4 paradas intermediárias.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
