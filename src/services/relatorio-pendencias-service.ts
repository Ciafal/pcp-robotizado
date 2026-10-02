/**
 * Serviço de Relatório de Pendências do Fechamento Mensal
 * Enriquecido com informações de Ajuste Operacional e status no Meu Dia.
 *
 * Itens pendentes/com erro sem ajuste operacional aberto são destacados como:
 * "Ajuste Operacional não aberto"
 */

import { pb } from '@/lib/pocketbase/client'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import { AjusteOperacional, MeuDiaPendencia } from '@/types/ajuste-operacional'

export interface ItemRelatorioPendenciaEnriquecido {
  item: ChecklistFechamentoItem
  possuiAjuste: boolean
  ajusteNumero?: string
  ajusteId?: string
  responsavelNome?: string
  prioridade?: string
  prazoFormatado?: string
  statusMeuDia?: string
  statusAjuste?: string
  destaqueTexto: string // 'Ajuste Operacional não aberto' ou status do ajuste
}

export interface RelatorioPendenciasEnriquecidoResult {
  competencia: string
  totalItens: number
  totalPendencias: number
  totalErros: number
  totalObrigatoriasAbertas: number
  totalComAjusteAberto: number
  totalSemAjuste: number
  itensEnriquecidos: ItemRelatorioPendenciaEnriquecido[]
}

export class RelatorioPendenciasService {
  /**
   * Consolida itens pendentes/erro cruzando com ajustes_operacionais e meu_dia_pendencias
   */
  async gerarRelatorioPendencias(
    itens: ChecklistFechamentoItem[],
    competencia: string,
  ): Promise<RelatorioPendenciasEnriquecidoResult> {
    const pendenciasOuErro = itens.filter((i) => i.status === 'ERRO' || i.status === 'PENDENTE')

    // Carregar todos os ajustes operacionais da competência
    let ajustesPorItem: Record<string, AjusteOperacional> = {}
    let meuDiaMap: Record<string, MeuDiaPendencia> = {}

    try {
      const ajustes = await pb.collection('ajustes_operacionais').getFullList<AjusteOperacional>({
        filter: `competencia = '${competencia}' && excluido != true`,
      })
      ajustes.forEach((a) => {
        // Se houver mais de um, prioriza o mais recente
        if (!ajustesPorItem[a.checklist_item_id]) {
          ajustesPorItem[a.checklist_item_id] = a
        }
      })

      const meuDiaList = await pb.collection('meu_dia_pendencias').getFullList<MeuDiaPendencia>({
        filter: `competencia = '${competencia}'`,
      })
      meuDiaList.forEach((m) => {
        if (m.ajuste_id) {
          meuDiaMap[m.ajuste_id] = m
        }
      })
    } catch {
      // Degradação caso o banco ainda esteja vazio
    }

    let totalComAjusteAberto = 0
    let totalSemAjuste = 0

    const itensEnriquecidos: ItemRelatorioPendenciaEnriquecido[] = pendenciasOuErro.map((item) => {
      const ajuste = ajustesPorItem[item.id]
      const meuDia = ajuste?.id ? meuDiaMap[ajuste.id] : undefined

      if (ajuste) {
        totalComAjusteAberto++
        const prazoFormatado = ajuste.prazo
          ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(ajuste.prazo))
          : '-'

        return {
          item,
          possuiAjuste: true,
          ajusteNumero: ajuste.numero,
          ajusteId: ajuste.id,
          responsavelNome: ajuste.responsavel_nome,
          prioridade: ajuste.prioridade,
          prazoFormatado,
          statusMeuDia: meuDia?.status || ajuste.status,
          statusAjuste: ajuste.status,
          destaqueTexto: `AOP: ${ajuste.numero} (${ajuste.status})`,
        }
      } else {
        totalSemAjuste++
        return {
          item,
          possuiAjuste: false,
          destaqueTexto: 'Ajuste Operacional não aberto',
        }
      }
    })

    return {
      competencia,
      totalItens: itens.length,
      totalPendencias: pendenciasOuErro.length,
      totalErros: itens.filter((i) => i.status === 'ERRO').length,
      totalObrigatoriasAbertas: pendenciasOuErro.filter((i) => i.obrigatoria).length,
      totalComAjusteAberto,
      totalSemAjuste,
      itensEnriquecidos,
    }
  }
}

export const relatorioPendenciasService = new RelatorioPendenciasService()
export default relatorioPendenciasService
