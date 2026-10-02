import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ajusteOperacionalService,
  gestorLinhaService,
  MENSAGEM_ERRO_SEM_GESTOR,
  ajusteOperacionalIaService,
  relatorioPendenciasService,
} from '@/services/checklist-fechamento-service'
import { pb } from '@/lib/pocketbase/client'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'

describe('Ajuste Operacional & Meu Dia - Suíte de Regras de Negócio e Serviços (Etapa 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // 1. GERAÇÃO DE NÚMERO SEQUENCIAL (AOP-000001/AAAA)
  describe('1. Geração de Número Sequencial Atômico', () => {
    it('deve gerar número sequencial no formato estrito AOP-000001/AAAA quando a collection estiver vazia', async () => {
      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getList: vi.fn().mockResolvedValue({ items: [] }),
          } as any
        }
        return {} as any
      })

      const resultado = await ajusteOperacionalService.gerarProximoNumero(2026)
      expect(resultado.numero).toBe('AOP-000001/2026')
      expect(resultado.ano).toBe(2026)
      expect(resultado.sequencial).toBe(1)
    })

    it('deve incrementar sequencial existente do mesmo ano (ex: de 14 para 15)', async () => {
      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getList: vi.fn().mockResolvedValue({
              items: [{ sequencial_ano: 14, ano: 2026, numero: 'AOP-000014/2026' }],
            }),
          } as any
        }
        return {} as any
      })

      const resultado = await ajusteOperacionalService.gerarProximoNumero(2026)
      expect(resultado.numero).toBe('AOP-000015/2026')
      expect(resultado.sequencial).toBe(15)
    })
  })

  // 2. BLOQUEIO SEM GESTOR CONFIGURADO (MENSAGEM EXATA)
  describe('2. Gestor da Linha Obrigatório', () => {
    it('deve lançar erro de negócio com a MENSAGEM EXATA quando não houver gestor configurado para a Linha/Centro', async () => {
      vi.spyOn(gestorLinhaService, 'localizarGestor').mockResolvedValue(null)

      await expect(
        ajusteOperacionalService.criarAjuste({
          checklist_item_id: 'item_123',
          competencia: '09/2026',
          codigo_atividade: '1.3',
          atividade_titulo: 'ZPP53 / DP06 — Devolvido L2',
          status_origem: 'ERRO',
          tipo: 'Estoque',
          descricao: 'Material devolvido sem tratamento em quarentena',
          acao_necessaria: 'Tratar pendência ou solicitar inventário',
          prioridade: 'Alta',
          prazo: '2026-10-05',
          solicitante_nome: 'Operador PCP',
          linha_code: 'LINHA_SEM_GESTOR',
          centro_code: 'CENTRO_SEM_GESTOR',
        }),
      ).rejects.toThrow(
        'Não foi encontrado Gestor da Linha configurado para este Centro. Configure o responsável antes de gerar o Ajuste Operacional.',
      )
    })

    it('a constante MENSAGEM_ERRO_SEM_GESTOR deve corresponder ao texto exigido pela especificação', () => {
      expect(MENSAGEM_ERRO_SEM_GESTOR).toBe(
        'Não foi encontrado Gestor da Linha configurado para este Centro. Configure o responsável antes de gerar o Ajuste Operacional.',
      )
    })
  })

  // 3. CRIAÇÃO DA PENDÊNCIA NO MEU DIA COM LINK DE ORIGEM E VINCULAÇÃO
  describe('3. Criação da Pendência no Meu Dia', () => {
    it('deve criar ajuste, pendência no Meu Dia com título e link de origem corretos e auditoria', async () => {
      const mockAjusteCriado = {
        id: 'aop_rec_999',
        numero: 'AOP-000001/2026',
        ano: 2026,
        sequencial_ano: 1,
        checklist_item_id: 'item_abc',
        competencia: '09/2026',
        solicitante_nome: 'Carlos PCP',
        responsavel_nome: 'Marcos Gestor L2',
        status: 'Nova',
        prioridade: 'Alta',
        prazo: '2026-10-05T00:00:00.000Z',
        validada_pcp: false,
      }

      const mockMeuDiaCriado = {
        id: 'meu_dia_555',
        titulo: 'PCP | Ajuste Operacional | [1.3 - ZPP53 / DP06 — Devolvido L2] | [L2]',
        link_origem:
          '/pcp/controle-producao/checklist-fechamento?item_id=item_abc&competencia=09%2F2026&ajuste_id=aop_rec_999',
        status: 'Nova',
      }

      let auditLogCriado = false
      let meuDiaPayload: any = null

      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getFullList: vi.fn().mockResolvedValue([]), // sem duplicidade
            getList: vi.fn().mockResolvedValue({ items: [] }),
            create: vi.fn().mockResolvedValue(mockAjusteCriado),
            update: vi.fn().mockResolvedValue({ ...mockAjusteCriado, meu_dia_id: 'meu_dia_555' }),
          } as any
        }
        if (name === 'meu_dia_pendencias') {
          return {
            create: vi.fn().mockImplementation((payload) => {
              meuDiaPayload = payload
              return Promise.resolve(mockMeuDiaCriado)
            }),
          } as any
        }
        if (name === 'ajustes_operacionais_historico') {
          return {
            create: vi.fn().mockResolvedValue({ id: 'hist_1' }),
          } as any
        }
        if (name === 'pcp_audit_logs') {
          return {
            create: vi.fn().mockImplementation(() => {
              auditLogCriado = true
              return Promise.resolve({ id: 'log_1' })
            }),
          } as any
        }
        if (name === 'fechamento_comunicacoes') {
          return {
            create: vi.fn().mockResolvedValue({ id: 'comm_1' }),
          } as any
        }
        return {
          getFullList: vi.fn().mockResolvedValue([]),
        } as any
      })

      const resultado = await ajusteOperacionalService.criarAjuste({
        checklist_item_id: 'item_abc',
        competencia: '09/2026',
        codigo_atividade: '1.3',
        atividade_titulo: 'ZPP53 / DP06 — Devolvido L2',
        status_origem: 'ERRO',
        tipo: 'Estoque',
        descricao: 'Peças em quarentena sem documento de entrada',
        acao_necessaria: 'Executar inventário local',
        prioridade: 'Alta',
        prazo: '2026-10-05',
        solicitante_nome: 'Carlos PCP',
        responsavel_id: 'gestor_l2_id',
        responsavel_nome: 'Marcos Gestor L2',
        responsavel_email: 'gestor.l2@ciafal.com.br',
        linha_code: 'L2',
        linha_name: 'Linha 2 Perfis',
      })

      expect(resultado.sucesso).toBe(true)
      expect(resultado.ajuste.numero).toBe('AOP-000001/2026')
      expect(meuDiaPayload).toBeDefined()
      expect(meuDiaPayload.origem_sistema).toBe('PCP Robotizado')
      expect(meuDiaPayload.modulo).toBe('Controle de Produção')
      expect(meuDiaPayload.funcao).toBe('Check-list Fechamento')
      expect(meuDiaPayload.categoria).toBe('PCP — Ajuste Operacional')
      expect(meuDiaPayload.link_origem).toContain('/pcp/controle-producao/checklist-fechamento')
      expect(auditLogCriado).toBe(true)
    })
  })

  // 4. REGRA ANTI-DUPLICIDADE
  describe('4. Regra Anti-Duplicidade', () => {
    it('deve bloquear abertura de novo ajuste se já houver um ajuste em aberto (Nova/Em andamento), a menos que forçado', async () => {
      const ajusteExistente = {
        id: 'aop_existente',
        numero: 'AOP-000003/2026',
        checklist_item_id: 'item_duplicado',
        status: 'Nova',
      }

      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getFullList: vi.fn().mockResolvedValue([ajusteExistente]),
          } as any
        }
        return {} as any
      })

      // Sem confirmação forçada -> deve lançar erro com aviso
      await expect(
        ajusteOperacionalService.criarAjuste({
          checklist_item_id: 'item_duplicado',
          competencia: '09/2026',
          codigo_atividade: '1.2',
          atividade_titulo: 'CO1P / COGI',
          status_origem: 'ERRO',
          tipo: 'Apontamento',
          descricao: 'Pendência em COGI',
          acao_necessaria: 'Tratar na COGI',
          prioridade: 'Alta',
          prazo: '2026-10-05',
          solicitante_nome: 'Operador PCP',
          responsavel_id: 'user_1',
          responsavel_nome: 'Gestor L1',
        }),
      ).rejects.toThrow('Já existe um Ajuste Operacional em aberto para esta atividade.')
    })
  })

  // 5. REGRA CRÍTICA: CONCLUSÃO NO MEU DIA NÃO ALTERA ATIVIDADE PARA OK
  describe('5. Conclusão no Meu Dia e Validação Humana PCP', () => {
    it('ao concluir no Meu Dia, o ajuste vai para Concluída, mas a atividade original NÃO é alterada para OK', async () => {
      const mockAjuste = {
        id: 'aop_concluir',
        numero: 'AOP-000009/2026',
        checklist_item_id: 'item_fechamento_44',
        competencia: '09/2026',
        status: 'Em andamento',
        meu_dia_id: 'meu_dia_44',
      }

      let atividadeOriginalAlterada = false
      let meuDiaStatusNovo = ''

      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAjuste),
            update: vi.fn().mockResolvedValue({ ...mockAjuste, status: 'Concluída' }),
          } as any
        }
        if (name === 'meu_dia_pendencias') {
          return {
            update: vi.fn().mockImplementation((_id, payload) => {
              meuDiaStatusNovo = payload.status
              return Promise.resolve({ id: 'meu_dia_44', ...payload })
            }),
          } as any
        }
        if (name === 'checklist_fechamento_itens') {
          return {
            update: vi.fn().mockImplementation(() => {
              atividadeOriginalAlterada = true
              return Promise.resolve({})
            }),
          } as any
        }
        if (name === 'ajustes_operacionais_historico' || name === 'pcp_audit_logs') {
          return {
            create: vi.fn().mockResolvedValue({ id: 'log_ok' }),
          } as any
        }
        return {} as any
      })

      const res = await ajusteOperacionalService.concluirNoMeuDia({
        ajusteId: 'aop_concluir',
        usuarioNome: 'Gestor da Linha Operacional',
        observacaoConclusao: 'Estoque físico regularizado na quarentena.',
      })

      expect(res.sucesso).toBe(true)
      expect(res.ajuste.status).toBe('Concluída')
      expect(meuDiaStatusNovo).toBe('Concluída')
      // REGRA CRÍTICA: atividade não pode ter sido alterada para OK automaticamente
      expect(atividadeOriginalAlterada).toBe(false)
    })

    it('apenas a validação final do PCP (validarPeloPcp com flag de autorização) muda a atividade original para OK', async () => {
      const mockAjuste = {
        id: 'aop_validar',
        numero: 'AOP-000009/2026',
        checklist_item_id: 'item_fechamento_44',
        competencia: '09/2026',
        status: 'Concluída',
      }

      let itemStatusNovo = ''

      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAjuste),
            update: vi.fn().mockResolvedValue({ ...mockAjuste, validada_pcp: true }),
          } as any
        }
        if (name === 'checklist_fechamento_itens') {
          return {
            update: vi.fn().mockImplementation((_id, payload) => {
              itemStatusNovo = payload.status
              return Promise.resolve({ id: 'item_fechamento_44', ...payload })
            }),
          } as any
        }
        if (name === 'ajustes_operacionais_historico' || name === 'pcp_audit_logs') {
          return {
            create: vi.fn().mockResolvedValue({ id: 'log_ok' }),
          } as any
        }
        return {} as any
      })

      const res = await ajusteOperacionalService.validarPeloPcp({
        ajusteId: 'aop_validar',
        usuarioNome: 'Especialista PCP Fechamento',
        mudarAtividadeParaOk: true,
      })

      expect(res.sucesso).toBe(true)
      expect(res.ajuste.validada_pcp).toBe(true)
      expect(itemStatusNovo).toBe('OK')
    })
  })

  // 6. IA ANALÍTICA - SUPORTE À DECISÃO SEM EXECUÇÃO
  describe('6. IA Analítica para Ajustes Operacionais', () => {
    it('deve fornecer causa provável, dados para conferir e histórico sem alterar status ou executar SAP', async () => {
      const analise = await ajusteOperacionalIaService.analisarPendencia({
        codigo_atividade: '1.2',
        atividade_titulo: 'CO1P / COGI',
        status_origem: 'ERRO',
        tipo: 'Apontamento',
        descricao: 'Pendência de processamento posterior em CO1P',
        competencia: '09/2026',
        linha: 'L1',
        ordem_sap: '1004523',
      })

      expect(analise.resumo_ocorrencia).toBeDefined()
      expect(analise.descricao_revisada).toContain('CO1P')
      expect(analise.causa_provavel).toBeDefined()
      expect(analise.proximos_passos.length).toBeGreaterThan(0)
      expect(analise.dados_para_conferir.length).toBeGreaterThan(0)
      expect(analise.restricoes_respeitadas.nao_alterou_status).toBe(true)
      expect(analise.restricoes_respeitadas.nao_executou_sap).toBe(true)
    })
  })

  // 7. RELATÓRIO DE PENDÊNCIAS ENRIQUECIDO
  describe('7. Relatório de Pendências com Ajuste Operacional', () => {
    it('deve marcar atividades pendentes sem ajuste como "Ajuste Operacional não aberto"', async () => {
      const itensMock: ChecklistFechamentoItem[] = [
        {
          id: 'item_ok',
          execucao_id: 'exec_1',
          competencia: '09/2026',
          codigo: '1.1',
          sequencia: 1,
          titulo: 'Orientação',
          descricao_detalhada: '',
          categoria: 'Geral',
          linha_centro_relacionado: 'Geral',
          empresa: 'CIAFAL',
          transacao_sap: 'N/A',
          deposito_sap: '',
          obrigatoria: false,
          responsavel_padrao: 'PCP',
          area_responsavel: 'PCP',
          manual_documento_referencia: '',
          regra_validacao: '',
          status_regra: 'Oficial',
          fonte_dados: 'Manual',
          status: 'OK',
        },
        {
          id: 'item_erro_sem_ajuste',
          execucao_id: 'exec_1',
          competencia: '09/2026',
          codigo: '1.3',
          sequencia: 3,
          titulo: 'Devolvido L2',
          descricao_detalhada: '',
          categoria: 'Geral',
          linha_centro_relacionado: 'L2',
          empresa: 'CIAFAL',
          transacao_sap: 'ZPP53',
          deposito_sap: 'DP06',
          obrigatoria: true,
          responsavel_padrao: 'PCP',
          area_responsavel: 'PCP',
          manual_documento_referencia: '',
          regra_validacao: '',
          status_regra: 'Oficial',
          fonte_dados: 'Manual',
          status: 'ERRO',
        },
      ]

      vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
        if (name === 'ajustes_operacionais' || name === 'meu_dia_pendencias') {
          return {
            getFullList: vi.fn().mockResolvedValue([]),
          } as any
        }
        return {} as any
      })

      const relatorio = await relatorioPendenciasService.gerarRelatorioPendencias(
        itensMock,
        '09/2026',
      )
      expect(relatorio.totalPendencias).toBe(1)
      expect(relatorio.totalSemAjuste).toBe(1)
      expect(relatorio.itensEnriquecidos[0].destaqueTexto).toBe('Ajuste Operacional não aberto')
      expect(relatorio.itensEnriquecidos[0].possuiAjuste).toBe(false)
    })
  })
})
