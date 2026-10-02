import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChecklistFechamentoHeader } from '@/components/production-control/ChecklistFechamentoHeader'
import { ChecklistFechamentoLista } from '@/components/production-control/ChecklistFechamentoLista'
import { ChecklistItemDetailModal } from '@/components/production-control/ChecklistItemDetailModal'
import { AjusteOperacionalModal } from '@/components/production-control/AjusteOperacionalModal'
import { RelatorioPendenciasModal } from '@/components/production-control/RelatorioPendenciasModal'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import { AjusteOperacional } from '@/types/ajuste-operacional'
import { ajusteOperacionalService } from '@/services/ajuste-operacional-service'
import { gestorLinhaService, MENSAGEM_ERRO_SEM_GESTOR } from '@/services/gestor-linha-service'
import { ajusteOperacionalIaService } from '@/services/ajuste-operacional-ia-service'
import { relatorioPendenciasService } from '@/services/relatorio-pendencias-service'

// Mock dos services
vi.mock('@/services/ajuste-operacional-service', () => ({
  ajusteOperacionalService: {
    gerarProximoNumero: vi.fn().mockResolvedValue({
      numero: 'AOP-000010/2026',
      ano: 2026,
      sequencial: 10,
    }),
    verificarAjusteAberto: vi.fn().mockResolvedValue({
      temAjusteAberto: false,
      ajusteAberto: null,
    }),
    criarAjuste: vi.fn().mockResolvedValue({
      sucesso: true,
      ajuste: {
        id: 'ajuste_123',
        numero: 'AOP-000010/2026',
        ano: 2026,
        status: 'Nova',
      },
    }),
    listarPorItem: vi.fn().mockResolvedValue([]),
    listarHistorico: vi.fn().mockResolvedValue([]),
    validarPeloPcp: vi.fn().mockResolvedValue({ sucesso: true }),
  },
}))

vi.mock('@/services/gestor-linha-service', () => ({
  MENSAGEM_ERRO_SEM_GESTOR:
    'Não foi encontrado Gestor da Linha configurado para este Centro. Configure o responsável antes de gerar o Ajuste Operacional.',
  gestorLinhaService: {
    localizarGestor: vi.fn().mockResolvedValue({
      usuario_id: 'usr_gestor_1',
      usuario_nome: 'Carlos Supervisor de Linha',
      usuario_email: 'carlos.supervisor@ciafal.com.br',
      cargo: 'Supervisor Operacional',
      tipo_responsabilidade: 'PRIMARY_MANAGER',
    }),
    obterGestorObrigatorio: vi.fn().mockResolvedValue({
      usuario_id: 'usr_gestor_1',
      usuario_nome: 'Carlos Supervisor de Linha',
      usuario_email: 'carlos.supervisor@ciafal.com.br',
      cargo: 'Supervisor Operacional',
      tipo_responsabilidade: 'PRIMARY_MANAGER',
    }),
  },
}))

vi.mock('@/services/ajuste-operacional-ia-service', () => ({
  ajusteOperacionalIaService: {
    analisarPendencia: vi.fn().mockResolvedValue({
      resumo_ocorrencia: 'Divergência detectada no apontamento de bobinas.',
      descricao_revisada: 'Descrição detalhada e revisada por IA para auditoria.',
      causa_provavel: 'Atraso na confirmação de movimento no SAP.',
      proximos_passos: ['Conferir saldo no pátio', 'Verificar COGI/CO1P'],
      ocorrencias_semelhantes: [
        {
          competencia: '08/2026',
          descricao: 'Divergência similar na linha LAM-01',
          solucao_adotada: 'Reversão de apontamento e reprocessamento.',
        },
      ],
      dados_para_conferir: ['Saldo no posto de trabalho', 'Ordem de produção'],
      restricoes_respeitadas: {
        nao_alterou_status: true,
        nao_concluiu_pendencia: true,
        nao_executou_sap: true,
        nao_enviou_email_sem_confirmacao: true,
      },
    }),
  },
}))

vi.mock('@/services/checklist-fechamento-service', () => ({
  checklistFechamentoService: {
    listarOcorrencias: vi.fn().mockResolvedValue([]),
    listarEvidencias: vi.fn().mockResolvedValue([]),
    adicionarEvidencia: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/services/relatorio-pendencias-service', () => ({
  relatorioPendenciasService: {
    gerarRelatorioPendencias: vi.fn().mockResolvedValue({
      competencia: '09/2026',
      totalItens: 3,
      totalPendencias: 2,
      totalErros: 1,
      totalObrigatoriasAbertas: 1,
      totalComAjusteAberto: 1,
      totalSemAjuste: 1,
      itensEnriquecidos: [
        {
          item: {
            id: 'item_2',
            codigo: '1.2',
            titulo: 'Consistência de Saldo de Sucata',
            status: 'ERRO',
            obrigatoria: true,
            descricao_detalhada: 'Divergência apurada no pátio',
          },
          possuiAjuste: true,
          ajusteNumero: 'AOP-000005/2026',
          ajusteId: 'aj_999',
          responsavelNome: 'Carlos Supervisor de Linha',
          prioridade: 'Alta',
          prazoFormatado: '15/09/2026',
          statusMeuDia: 'Em andamento',
          statusAjuste: 'Em andamento',
          destaqueTexto: 'AOP: AOP-000005/2026 (Em andamento)',
        },
        {
          item: {
            id: 'item_3',
            codigo: '1.3',
            titulo: 'Inventário Físico do Almoxarifado',
            status: 'PENDENTE',
            obrigatoria: false,
            descricao_detalhada: 'Aguardando contagem física',
          },
          possuiAjuste: false,
          destaqueTexto: 'Ajuste Operacional não aberto',
        },
      ],
    }),
  },
}))

describe('Check-list Fechamento — Ajuste Operacional (Interface Etapa 2)', () => {
  const itemMockOk: ChecklistFechamentoItem = {
    id: 'item_1',
    execucao_id: 'exec_1',
    codigo: '1.1',
    sequencia: 1,
    titulo: 'Apontamentos do Turno',
    descricao_detalhada: 'Verificar apontamentos no MES e SAP',
    categoria: 'Apontamento',
    linha_centro_relacionado: 'LAM-01 / C100',
    empresa: 'CIAFAL',
    line_code: 'LAM-01',
    line_name: 'Laminação 01',
    center_code: 'C100',
    transacao_sap: 'COGI',
    deposito_sap: 'DP01',
    obrigatoria: true,
    responsavel_padrao: 'Controle de Produção',
    area_responsavel: 'PCP',
    manual_documento_referencia: 'MAN-PCP-001',
    regra_validacao: 'Sem pendências',
    status_regra: 'REGRA_OK',
    fonte_dados: 'MES',
    status: 'OK',
    competencia: '09/2026',
    quantidade_divergencias: 0,
    historico_alteracoes: [],
  }

  const itemMockErro: ChecklistFechamentoItem = {
    ...itemMockOk,
    id: 'item_2',
    codigo: '1.2',
    titulo: 'Consistência de Saldo de Sucata',
    status: 'ERRO',
    quantidade_divergencias: 3,
  }

  const itemMockPendente: ChecklistFechamentoItem = {
    ...itemMockOk,
    id: 'item_3',
    codigo: '1.3',
    titulo: 'Inventário Físico do Almoxarifado',
    status: 'PENDENTE',
  }

  // 1. Filtros no cabeçalho
  it('1. Renderiza filtros em cascata (Empresa, Linha, Centro, Ano, Mês, Datas) e botão Limpar Filtros', () => {
    const handleLimpar = vi.fn()
    const handleChange = vi.fn()

    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{
          empresa: 'CIAFAL',
          linha: 'Laminação 01',
          centro: 'C100',
          ano: '2026',
          mes: '09',
          dataInicio: '2026-09-01',
          dataFim: '2026-09-30',
        }}
        onChangeFiltros={handleChange}
        onLimparFiltros={handleLimpar}
        opcoesEmpresas={['CIAFAL']}
        opcoesLinhas={['Laminação 01', 'Trefila 02']}
        opcoesCentros={['C100', 'C200']}
      />,
    )

    expect(screen.getByText('Filtros do Check-list')).toBeInTheDocument()
    expect(screen.getByText('Limpar filtros')).toBeInTheDocument()

    // Clica em limpar filtros
    fireEvent.click(screen.getByText('Limpar filtros'))
    expect(handleLimpar).toHaveBeenCalledTimes(1)
  })

  // 2. Botão "Ajuste Operacional" por atividade
  it('2. Botão Ajuste Operacional deve estar DESABILITADO quando o status for OK e HABILITADO quando != OK', () => {
    const handleAbrirAjuste = vi.fn()

    render(
      <ChecklistFechamentoLista
        itens={[itemMockOk, itemMockErro, itemMockPendente]}
        onOpenDetalhe={vi.fn()}
        onAtualizarStatusRapido={vi.fn()}
        onSolicitarInventario={vi.fn()}
        onRastrearDivergencia={vi.fn()}
        onAdicionarEvidencia={vi.fn()}
        onNovaAtividade={vi.fn()}
        onGerarRelatorioPendencias={vi.fn()}
        canEdit={true}
        onAbrirAjusteOperacional={handleAbrirAjuste}
      />,
    )

    const botoesAjuste = screen.getAllByRole('button', { name: /Ajuste Operacional/i })
    expect(botoesAjuste).toHaveLength(3)

    // O primeiro item (OK) deve estar desabilitado
    expect(botoesAjuste[0]).toBeDisabled()

    // O segundo item (ERRO) deve estar habilitado
    expect(botoesAjuste[1]).not.toBeDisabled()

    // O terceiro item (PENDENTE) deve estar habilitado
    expect(botoesAjuste[2]).not.toBeDisabled()

    // Clicar no botão habilitado dispara o callback
    fireEvent.click(botoesAjuste[1])
    expect(handleAbrirAjuste).toHaveBeenCalledWith(itemMockErro)
  })

  // 3. Popup/formulário de Ajuste Operacional
  it('3. Popup do formulário de Ajuste Operacional abre com dados da atividade e número sequencial', async () => {
    render(
      <AjusteOperacionalModal
        open={true}
        onClose={vi.fn()}
        item={itemMockErro}
        competencia="09/2026"
        onAjusteCriado={vi.fn()}
      />,
    )

    expect(screen.getByText('Ajuste Operacional')).toBeInTheDocument()
    expect(screen.getByText('1. Identificação da Atividade')).toBeInTheDocument()
    expect(screen.getByText(/Consistência de Saldo de Sucata/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Criar Ajuste Operacional/i })).toBeInTheDocument()
  })

  // 4. Análise com IA no Popup
  it('4. Botão "Analisar Pendência com IA" aciona o service e apresenta diagnóstico com causas e próximos passos', async () => {
    render(
      <AjusteOperacionalModal
        open={true}
        onClose={vi.fn()}
        item={itemMockErro}
        competencia="09/2026"
        onAjusteCriado={vi.fn()}
      />,
    )

    const botaoIa = screen.getByRole('button', { name: /Analisar Pendência com IA/i })
    expect(botaoIa).toBeInTheDocument()
    fireEvent.click(botaoIa)

    await waitFor(() => {
      expect(ajusteOperacionalIaService.analisarPendencia).toHaveBeenCalled()
      expect(screen.getByText('Diagnóstico IA do PCP Robotizado')).toBeInTheDocument()
      expect(screen.getByText(/Atraso na confirmação de movimento no SAP/i)).toBeInTheDocument()
    })
  })

  // 5. Seção de ajustes no detalhe da atividade com tabela estruturada
  it('5. Detalhe da atividade contém a aba de Ajustes Operacionais Vinculados com tabela estruturada', async () => {
    const mockAjuste: AjusteOperacional = {
      id: 'aj_999',
      numero: 'AOP-000005/2026',
      ano: 2026,
      sequencial_ano: 5,
      checklist_item_id: itemMockErro.id,
      competencia: '09/2026',
      status_origem: 'ERRO',
      tipo: 'Divergência de quantidade',
      descricao: 'Divergência de 3 bobinas no pátio',
      acao_necessaria: 'Ajustar apontamento na MIGO',
      prioridade: 'Alta',
      prazo: '2026-09-10T00:00:00Z',
      solicitante_nome: 'PCP Analista',
      responsavel_nome: 'Carlos Supervisor',
      status: 'Em andamento',
      validada_pcp: false,
    }

    vi.mocked(ajusteOperacionalService.listarPorItem).mockResolvedValueOnce([mockAjuste])

    render(
      <ChecklistItemDetailModal
        open={true}
        onClose={vi.fn()}
        item={itemMockErro}
        onSave={vi.fn()}
        onSolicitarInventario={vi.fn()}
        onRastrearDivergencia={vi.fn()}
        canEdit={true}
      />,
    )

    // Clica na aba de ajustes operacionais
    const abaAjustes = screen.getByRole('button', { name: /Ajustes Operacionais/i })
    expect(abaAjustes).toBeInTheDocument()
    fireEvent.click(abaAjustes)

    await waitFor(() => {
      expect(screen.getByText('AOP-000005/2026')).toBeInTheDocument()
      expect(screen.getByText('Carlos Supervisor')).toBeInTheDocument()
      expect(screen.getByText(/Divergência de 3 bobinas no pátio/i)).toBeInTheDocument()
      // Tabela estruturada com cabeçalhos requeridos
      expect(screen.getByText('Status origem')).toBeInTheDocument()
      expect(screen.getByText('Status ajuste')).toBeInTheDocument()
    })
  })

  // 6. Relatório de Pendências enriquecido
  it('6. Relatório de Pendências exibe status do Ajuste Operacional e destaque de não aberto', async () => {
    render(
      <RelatorioPendenciasModal
        open={true}
        onClose={vi.fn()}
        execucao={{
          id: 'exec_1',
          competencia: '09/2026',
          ano: 2026,
          mes: 9,
          empresa: 'CIAFAL',
          responsavel: 'PCP Analista',
          status_geral: 'Em andamento',
          data_inicio: '2026-09-01',
          data_limite: '2026-09-05',
          total_atividades: 3,
          total_ok: 1,
          total_erro: 1,
          total_pendente: 1,
          total_obrigatorias: 1,
          ordens_fechadas: 0,
          ordens_pendentes: 0,
          percentual_concluido: 33,
        }}
        itens={[itemMockOk, itemMockErro, itemMockPendente]}
      />,
    )

    await waitFor(() => {
      expect(relatorioPendenciasService.gerarRelatorioPendencias).toHaveBeenCalled()
      expect(screen.getByText('AOP-000005/2026')).toBeInTheDocument()
      expect(screen.getByText('Ajuste Operacional não aberto')).toBeInTheDocument()
    })
  })
})
