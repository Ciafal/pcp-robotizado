import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Settings, Shield, History, Plus, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MPIndustrializerContract, MPIndustrializerMatrixItem } from '@/types/mp-optimization'

interface IndustrializerParametersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contracts: MPIndustrializerContract[]
  matrixItems: MPIndustrializerMatrixItem[]
  onRefresh?: () => void
}

export const IndustrializerParametersModal: React.FC<IndustrializerParametersModalProps> = ({
  open,
  onOpenChange,
  contracts,
  matrixItems,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'CONTRATOS' | 'MATRIZ' | 'GOVERNANCA'>('CONTRATOS')

  // Exemplo de parâmetros centralizados e versionados
  const parametersList = [
    {
      code: 'PAR-YIELD-ARCELOR',
      title: 'Rendimento Metálico Arcelor (L1)',
      currentValue: '93,0% (0,93)',
      unit: '%',
      sourceDoc: 'Contrato CIAFAL-Arcelor 2026',
      responsible: 'Engenharia de Processos',
      approver: 'Gerência de Operações PCP',
      validFrom: '01/01/2026',
      version: 'v2.0',
      status: 'ATIVO',
    },
    {
      code: 'PAR-TB002-META',
      title: 'Meta de Produtividade TB-002 (Corte de Elegibilidade 150x150)',
      currentValue: '18,0',
      unit: 't/h',
      sourceDoc: 'Norma Técnica Operacional TB-002 Rev.05',
      responsible: 'PCP Central / Qualidade',
      approver: 'Diretoria Industrial',
      validFrom: '15/01/2026',
      version: 'v5.1',
      status: 'ATIVO',
    },
    {
      code: 'PAR-ROUTINE-DAYS',
      title: 'Frequência do Acompanhamento Operacional',
      currentValue: 'Segunda, Quarta e Sexta (Seg/Qua/Sex)',
      unit: 'dias/sem',
      sourceDoc: 'Manual Operacional de PCP CIAFAL',
      responsible: 'PCP L1',
      approver: 'Coordenação PCP',
      validFrom: '01/02/2026',
      version: 'v1.0',
      status: 'ATIVO',
    },
    {
      code: 'PAR-SOBRA-LIMITE',
      title: 'Limite Máximo de Sobra de Tarugo sem Aplicação',
      currentValue: '0,35',
      unit: 't',
      sourceDoc: 'Manual de Otimização ZPP86/ZPP88',
      responsible: 'PCP Matéria-Prima',
      approver: 'Gerência PCP',
      validFrom: '01/01/2026',
      version: 'v1.2',
      status: 'ATIVO',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Parâmetros e Regras Centralizadas — Matéria-Prima
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Governança, versionamento imutável e documentos de autoridade contratual/técnica.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold flex items-center gap-1">
              <Shield className="w-3 h-3" /> Governança Versionada
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tabs de navegação dos parâmetros */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('CONTRATOS')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'CONTRATOS'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Parâmetros Contratuais & Técnicos
            </button>
            <button
              onClick={() => setActiveTab('MATRIZ')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'MATRIZ'
                  ? 'border-[#004C97] text-[#004C97]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Matriz de Materiais SAP (130x130 / 150x150)
            </button>
          </div>

          {activeTab === 'CONTRATOS' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Parâmetro / Código</TableHead>
                    <TableHead className="font-bold text-slate-700">Valor Atual</TableHead>
                    <TableHead className="font-bold text-slate-700">Documento Fonte</TableHead>
                    <TableHead className="font-bold text-slate-700">
                      Responsável / Aprovador
                    </TableHead>
                    <TableHead className="font-bold text-slate-700">Versão & Vigência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parametersList.map((param) => (
                    <TableRow key={param.code} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-900">
                        <div>{param.title}</div>
                        <span className="text-[10px] text-slate-500 font-mono">{param.code}</span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-[#004C97]">
                        {param.currentValue}
                      </TableCell>
                      <TableCell className="text-slate-700 text-[11px]">
                        {param.sourceDoc}
                      </TableCell>
                      <TableCell className="text-slate-600 text-[11px]">
                        <div>Resp: {param.responsible}</div>
                        <div className="text-[10px] text-slate-500">Apr: {param.approver}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                            {param.version}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            desde {param.validFrom}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'MATRIZ' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Código SAP</TableHead>
                    <TableHead className="font-bold text-slate-700">Seção Dimensional</TableHead>
                    <TableHead className="font-bold text-slate-700">Aço / Família</TableHead>
                    <TableHead className="font-bold text-slate-700">Depósito Padrão</TableHead>
                    <TableHead className="font-bold text-slate-700">
                      Regra de Elegibilidade
                    </TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixItems.length > 0 ? (
                    matrixItems.map((mat) => (
                      <TableRow key={mat.id || mat.sap_material_code} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-slate-900">
                          {mat.sap_material_code}
                        </TableCell>
                        <TableCell className="font-bold text-[#004C97]">
                          {mat.dimension_section}
                        </TableCell>
                        <TableCell>{mat.steel_grade}</TableCell>
                        <TableCell className="font-mono">
                          {mat.standard_depot || 'DP18/DP07'}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          {mat.eligibility_rule_text ||
                            (mat.dimension_section === '150x150'
                              ? 'Meta > 18,0 t/h (TB-002)'
                              : 'Universal L1')}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            {mat.status || 'ATIVO'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      <TableRow className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-slate-900">
                          ST930*AI (ST930001AI)
                        </TableCell>
                        <TableCell className="font-bold text-[#004C97]">130x130</TableCell>
                        <TableCell>1020 / Arcelor AI</TableCell>
                        <TableCell className="font-mono">DP18 / DP07</TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          Universal na Linha Leve L1 (TB-002)
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            ATIVO
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-slate-900">
                          ST950*AI (ST950001AI)
                        </TableCell>
                        <TableCell className="font-bold text-[#004C97]">150x150</TableCell>
                        <TableCell>1020 / Arcelor AI</TableCell>
                        <TableCell className="font-mono">DP18 / DP07</TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          Elegível apenas se Meta Produtividade &gt; 18,0 t/h (TB-002)
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            ATIVO
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-[11px] text-slate-500">
            * Alterações de parâmetros geram nova versão imutável auditável.
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Concluir Visualização
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IndustrializerParametersModal
