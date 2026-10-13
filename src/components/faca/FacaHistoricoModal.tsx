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
import {
  History,
  FileText,
  Mail,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react'
import { FacaAnaliseHistoricoItem, FacaEnvioEmailItem } from '@/types/faca-analise'

interface FacaHistoricoModalProps {
  isOpen: boolean
  onClose: () => void
  historicoAnalises: FacaAnaliseHistoricoItem[]
  historicoEnvios: FacaEnvioEmailItem[]
  onVisualizarAnalise: (item: FacaAnaliseHistoricoItem) => void
}

export const FacaHistoricoModal: React.FC<FacaHistoricoModalProps> = ({
  isOpen,
  onClose,
  historicoAnalises,
  historicoEnvios,
  onVisualizarAnalise,
}) => {
  const [activeTab, setActiveTab] = useState<'analises' | 'envios'>('analises')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
      case 'APROVADO':
        return <Badge className="bg-emerald-600 text-white text-[10px]">{status}</Badge>
      case 'REVISADO':
        return <Badge className="bg-blue-600 text-white text-[10px]">{status}</Badge>
      case 'RASCUNHO':
        return (
          <Badge variant="outline" className="text-slate-600 text-[10px]">
            {status}
          </Badge>
        )
      case 'FALHA_ENVIO':
        return <Badge className="bg-rose-700 text-white text-[10px]">Falha Envio</Badge>
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Histórico de Análises & Disparos de E-mail — FACA
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Rastreabilidade de versões geradas, aprovações, comunicados e auditoria de envio
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="analises" className="text-xs font-semibold gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Análises Geradas ({historicoAnalises.length})
            </TabsTrigger>
            <TabsTrigger value="envios" className="text-xs font-semibold gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Disparos de E-mail ({historicoEnvios.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analises" className="space-y-3 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Código</TableHead>
                    <TableHead className="font-bold text-slate-700">Data Ref.</TableHead>
                    <TableHead className="font-bold text-slate-700">Centro</TableHead>
                    <TableHead className="font-bold text-slate-700">Versão</TableHead>
                    <TableHead className="font-bold text-slate-700">Responsável</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center w-16">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoAnalises.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                        Nenhuma análise gravada no histórico até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoAnalises.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-[#004C97]">
                          {item.codigo_analise}
                        </TableCell>
                        <TableCell className="text-slate-600">{item.data_referencia}</TableCell>
                        <TableCell className="font-mono text-slate-700">{item.centro}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          v{item.versao}.0
                        </TableCell>
                        <TableCell className="text-slate-700">{item.responsavel_nome}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onVisualizarAnalise(item)}
                            className="h-7 w-7 text-slate-600 hover:text-[#004C97]"
                            title="Visualizar documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="envios" className="space-y-3 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Código Envio</TableHead>
                    <TableHead className="font-bold text-slate-700">Data/Hora</TableHead>
                    <TableHead className="font-bold text-slate-700">Destinatários</TableHead>
                    <TableHead className="font-bold text-slate-700">Assunto</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">PDF</TableHead>
                    <TableHead className="font-bold text-slate-700 min-w-[200px]">
                      Status & Retorno
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoEnvios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                        Nenhum disparo de e-mail registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoEnvios.map((env) => (
                      <TableRow key={env.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-slate-900">
                          {env.codigo_envio}
                        </TableCell>
                        <TableCell className="text-slate-600 whitespace-nowrap">
                          {env.data_hora_envio}
                        </TableCell>
                        <TableCell
                          className="text-slate-700 max-w-[180px] truncate"
                          title={env.destinatarios_para.join(', ')}
                        >
                          {env.destinatarios_para.join(', ')}
                        </TableCell>
                        <TableCell
                          className="text-slate-800 font-medium max-w-[200px] truncate"
                          title={env.assunto}
                        >
                          {env.assunto}
                        </TableCell>
                        <TableCell className="text-center">
                          {env.anexo_pdf_gerado ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700 text-[11px]">
                          <div className="font-bold text-rose-700">{env.status_envio}</div>
                          <div
                            className="text-slate-500 text-[10px] line-clamp-1"
                            title={env.mensagem_retorno}
                          >
                            {env.mensagem_retorno}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
