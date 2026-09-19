import React, { useState } from 'react'
import { EntregasSubmenu } from '@/components/pcp/entregas/EntregasSubmenu'
import {
  CiafalPageHeader,
  CiafalKPICard,
  CiafalDataTable,
} from '@/components/common/CiafalDesignSystem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw, AlertCircle, History, Clock, Filter } from 'lucide-react'

interface RevisionLogItem {
  id: string
  revisionCode: string
  scheduleCode: string
  lineCode: string
  previousVersion: string
  newVersion: string
  author: string
  timestamp: string
  reasonCategory: string
  impactAssessment: string
  affectedTons: number
}

const mockRevisions: RevisionLogItem[] = [
  {
    id: 'REV-01',
    revisionCode: 'REV-L1-2025-W18-V02',
    scheduleCode: 'WS-L1-2025-W18',
    lineCode: 'L1',
    previousVersion: 'V01',
    newVersion: 'V02',
    author: 'Carlos Mendes (PCP)',
    timestamp: '03/05/2025 14:35',
    reasonCategory: 'Reprogramação Comercial (SD)',
    impactAssessment:
      'Deslocamento de 68,0 t de tubos retangulares para atender prioridade urgente de cliente estratégico.',
    affectedTons: 68.0,
  },
  {
    id: 'REV-02',
    revisionCode: 'REV-L2-2025-W19-V02',
    scheduleCode: 'WS-L2-2025-W19',
    lineCode: 'L2',
    previousVersion: 'V01',
    newVersion: 'V02',
    author: 'Carlos Mendes (PCP)',
    timestamp: '07/05/2025 10:15',
    reasonCategory: 'Atraso de Matéria-Prima (DP07)',
    impactAssessment:
      'Atraso de 48h no recebimento de tarugos 130mm da ArcelorMittal. Sequência ajustada para perfis leves.',
    affectedTons: 110.5,
  },
  {
    id: 'REV-03',
    revisionCode: 'REV-SDC-2025-W19-V02',
    scheduleCode: 'WS-SDC-2025-W19',
    lineCode: 'SDC',
    previousVersion: 'V01',
    newVersion: 'V02',
    author: 'Ana Souza (PCP SDC)',
    timestamp: '09/05/2025 16:40',
    reasonCategory: 'Otimização de Pátio / Expedição',
    impactAssessment:
      'Antecipação de 3 ordens para consolidação de frete fechado para região metropolitana.',
    affectedTons: 85.0,
  },
  {
    id: 'REV-04',
    revisionCode: 'REV-L1-2025-W19-V03',
    scheduleCode: 'WS-L1-2025-W19',
    lineCode: 'L1',
    previousVersion: 'V02',
    newVersion: 'V03',
    author: 'Carlos Mendes (PCP)',
    timestamp: '11/05/2025 09:00',
    reasonCategory: 'Manutenção Corretiva (Gargalo)',
    impactAssessment: 'Troca de buchas da desempenadeira com extensão de 3h de parada técnica.',
    affectedTons: 42.0,
  },
]

export const EntregasRevisoesPage: React.FC = () => {
  const [lineFilter, setLineFilter] = useState('ALL')

  const filtered =
    lineFilter === 'ALL' ? mockRevisions : mockRevisions.filter((r) => r.lineCode === lineFilter)

  return (
    <div className="space-y-4 max-w-full min-w-0" data-testid="entregas-revisoes-page">
      <EntregasSubmenu />

      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Revisões de Entregas & Programação"
        subtitle="Registro de revisões formais de grade fabril, motivos de reprogramação, impactos de tonelagem e governança de versões."
        breadcrumbs={[{ label: 'Entregas PCP', href: '/pcp/entregas' }, { label: 'Revisões' }]}
        badge="Governança de Versões"
        dataSource="Trilha de Auditoria PCP / PocketBase"
        lastUpdated={new Date()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CiafalKPICard
          title="Total de Revisões"
          value={filtered.length}
          unit="revisões"
          status="NORMAL"
          icon={RotateCcw}
        />
        <CiafalKPICard
          title="Volume Impactado"
          value={filtered.reduce((acc, i) => acc + i.affectedTons, 0)}
          unit="t"
          decimals={1}
          status="ATENCAO"
          icon={AlertCircle}
        />
        <CiafalKPICard
          title="Causa Mais Frequente"
          value="Comercial (SD)"
          status="NORMAL"
          icon={History}
        />
        <CiafalKPICard
          title="Tempo Médio de Resposta"
          value="1,8"
          unit="dias"
          status="NORMAL"
          icon={Clock}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Filtrar por Linha:</span>
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-700"
          >
            <option value="ALL">Todas as Linhas</option>
            <option value="L1">Linha L1</option>
            <option value="L2">Linha L2</option>
            <option value="SDC">Linha SDC</option>
          </select>
        </div>
      </div>

      <CiafalDataTable
        title="Trilha de Revisões Publicadas"
        subtitle="Rastreabilidade de cada salto de versão com autor, motivo e justificativa."
        columns={[
          { key: 'revisionCode', label: 'Código da Revisão', width: '190px' },
          { key: 'scheduleCode', label: 'Programação Origem', width: '150px' },
          { key: 'lineCode', label: 'Linha', align: 'center', width: '70px' },
          { key: 'versionHop', label: 'Salto', align: 'center', width: '100px' },
          { key: 'reasonCategory', label: 'Motivo / Categoria', width: '220px' },
          { key: 'author', label: 'Responsável', width: '170px' },
          { key: 'timestamp', label: 'Data/Hora', align: 'center', width: '140px' },
          { key: 'impactAssessment', label: 'Impacto Transacional' },
        ]}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderCell={(item, key) => {
          if (key === 'versionHop') {
            return (
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-800 border-slate-300 font-mono text-[11px]"
              >
                {item.previousVersion} &rarr; {item.newVersion}
              </Badge>
            )
          }
          if (key === 'reasonCategory') {
            return <span className="font-semibold text-slate-800">{item.reasonCategory}</span>
          }
          return (item as any)[key]
        }}
      />
    </div>
  )
}
export default EntregasRevisoesPage
