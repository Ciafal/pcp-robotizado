import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, RotateCcw, Search } from 'lucide-react'
import { FacaFiltrosState } from '@/types/faca-analise'

interface FacaFilterBarProps {
  filtros: FacaFiltrosState
  onChangeFiltros: (novosFiltros: FacaFiltrosState) => void
  onResetFiltros: () => void
  materiaisOpcoes: string[]
  clientesOpcoes: string[]
}

export const FacaFilterBar: React.FC<FacaFilterBarProps> = ({
  filtros,
  onChangeFiltros,
  onResetFiltros,
  materiaisOpcoes,
  clientesOpcoes,
}) => {
  return (
    <Card className="border border-slate-200 bg-white shadow-xs">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 items-end">
          {/* Empresa */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Empresa</Label>
            <Select
              value={filtros.empresa}
              onValueChange={(val) => onChangeFiltros({ ...filtros, empresa: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="CIAFAL">CIAFAL</SelectItem>
                <SelectItem value="SIDERCENTRO">SIDERCENTRO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Centro */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Centro</Label>
            <Select
              value={filtros.centro}
              onValueChange={(val) => onChangeFiltros({ ...filtros, centro: val })}
            >
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="1100">1100 (Matriz)</SelectItem>
                <SelectItem value="1000">1000 (Filial)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Linha</Label>
            <Select
              value={filtros.linha}
              onValueChange={(val) => onChangeFiltros({ ...filtros, linha: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="L1">L1 - Laminação 1</SelectItem>
                <SelectItem value="L2">L2 - Laminação 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Material */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Material FACA</Label>
            <Select
              value={filtros.material}
              onValueChange={(val) => onChangeFiltros({ ...filtros, material: val })}
            >
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Materiais</SelectItem>
                {materiaisOpcoes.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bitola */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Bitola</Label>
            <Input
              placeholder="Ex: 450x12"
              className="h-8 text-xs"
              value={filtros.bitola}
              onChange={(e) => onChangeFiltros({ ...filtros, bitola: e.target.value })}
            />
          </div>

          {/* Tipo Aço */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Aço</Label>
            <Select
              value={filtros.tipo_aco}
              onValueChange={(val) => onChangeFiltros({ ...filtros, tipo_aco: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Aços</SelectItem>
                <SelectItem value="SAE 1045">SAE 1045</SelectItem>
                <SelectItem value="SAE 5160">SAE 5160</SelectItem>
                <SelectItem value="SAE 1070">SAE 1070</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Cliente</Label>
            <Select
              value={filtros.cliente}
              onValueChange={(val) => onChangeFiltros({ ...filtros, cliente: val })}
            >
              <SelectTrigger className="h-8 text-xs truncate">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Clientes</SelectItem>
                {clientesOpcoes.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Carteira */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Status Atend.</Label>
            <Select
              value={filtros.status_carteira}
              onValueChange={(val) => onChangeFiltros({ ...filtros, status_carteira: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="ATENDIDO_ESTOQUE">Atendido Estoque</SelectItem>
                <SelectItem value="PARCIALMENTE_COBERTO">Parcial Coberto</SelectItem>
                <SelectItem value="NECESSITA_PRODUCAO">Necessita Produção</SelectItem>
                <SelectItem value="MP_INSUFICIENTE">MP Insuficiente</SelectItem>
                <SelectItem value="LOTE_MINIMO_PENDENTE">Lote Mínimo Pendente</SelectItem>
                <SelectItem value="SEM_PEDIDO_ESTOQUE_LIVRE">Estoque Sem Pedido</SelectItem>
                <SelectItem value="PEDIDO_CANCELADO">Pedido Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Situação MP */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 uppercase">Situação MP</Label>
            <Select
              value={filtros.situacao_mp}
              onValueChange={(val) => onChangeFiltros({ ...filtros, situacao_mp: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="SUFICIENTE">MP Suficiente</SelectItem>
                <SelectItem value="CRITICO">Déficit / Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Reset */}
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFiltros}
              className="h-8 w-full text-xs font-semibold gap-1 text-slate-600 hover:text-slate-900"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
