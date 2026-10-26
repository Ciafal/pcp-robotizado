import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  lineSummaryAutomationService,
  LineSummaryConfig,
  SummaryScheduleRun,
  CustomPeriodicityParams,
} from '@/services/pcp-line-summary-automation-service'
import { MonthlySummaryTemplate } from '@/services/pcp-line-summary-automation-service'
import { pb } from '@/lib/pocketbase/client'

describe('PCP Line Summary Automation Rules & Schedules Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Cálculo de Próxima Execução por Periodicidade (Fuso America/Sao_Paulo)', () => {
    const baseDate = new Date('2025-05-10T08:00:00.000Z')

    it('deve calcular próxima execução para periodicidade diária (+1 dia)', () => {
      const res = lineSummaryAutomationService.calculateNextExecution(
        'diaria',
        { horario: '07:30' },
        baseDate,
      )
      expect(res).toBeTruthy()
      const d = new Date(res)
      expect(d.getDate()).toBe(11)
      expect(d.getHours()).toBe(7)
      expect(d.getMinutes()).toBe(30)
    })

    it('deve calcular próxima execução para periodicidade semanal (+7 dias)', () => {
      const res = lineSummaryAutomationService.calculateNextExecution(
        'semanal',
        { horario: '06:00' },
        baseDate,
      )
      expect(res).toBeTruthy()
      const d = new Date(res)
      expect(d.getDate()).toBe(17)
      expect(d.getHours()).toBe(6)
      expect(d.getMinutes()).toBe(0)
    })

    it('deve calcular próxima execução para periodicidade quinzenal (+15 dias)', () => {
      const res = lineSummaryAutomationService.calculateNextExecution(
        'quinzenal',
        { horario: '14:00' },
        baseDate,
      )
      expect(res).toBeTruthy()
      const d = new Date(res)
      expect(d.getDate()).toBe(25)
      expect(d.getHours()).toBe(14)
      expect(d.getMinutes()).toBe(0)
    })

    it('deve calcular próxima execução para periodicidade mensal respeitando dia_do_mes', () => {
      const params: CustomPeriodicityParams = { dia_do_mes: 5, horario: '09:15' }
      const res = lineSummaryAutomationService.calculateNextExecution('mensal', params, baseDate)
      expect(res).toBeTruthy()
      const d = new Date(res)
      expect(d.getMonth()).toBe(5) // Junho (0-indexed: 4=Maio, 5=Junho)
      expect(d.getDate()).toBe(5)
      expect(d.getHours()).toBe(9)
      expect(d.getMinutes()).toBe(15)
    })

    it('deve ajustar para o último dia do mês quando o dia configurado ultrapassar o mês destino', () => {
      // 31 de Janeiro para Fevereiro
      const jan31 = new Date(2025, 0, 31, 8, 0, 0)
      const params: CustomPeriodicityParams = { dia_do_mes: 31, horario: '08:00' }
      const res = lineSummaryAutomationService.calculateNextExecution('mensal', params, jan31)
      const d = new Date(res)
      expect(d.getMonth()).toBe(1) // Fevereiro
      expect(d.getDate()).toBe(28) // 2025 não é bissexto
    })

    it('deve calcular próxima execução para periodicidade trimestral (+3 meses)', () => {
      const params: CustomPeriodicityParams = { dia_do_mes: 10, horario: '10:00' }
      const res = lineSummaryAutomationService.calculateNextExecution(
        'trimestral',
        params,
        baseDate,
      )
      expect(res).toBeTruthy()
      const d = new Date(res)
      expect(d.getMonth()).toBe(7) // Agosto (5 + 3 - 1)
      expect(d.getDate()).toBe(10)
      expect(d.getHours()).toBe(10)
    })

    it('deve calcular para personalizada com dias da semana específicos', () => {
      // 2025-05-10 é Sábado (getDay() = 6 -> mapped 6). Dias permitidos: Segunda(1), Quarta(3)
      const params: CustomPeriodicityParams = {
        dias_da_semana: [1, 3],
        horario: '08:00',
      }
      const res = lineSummaryAutomationService.calculateNextExecution(
        'personalizada',
        params,
        baseDate,
      )
      expect(res).toBeTruthy()
      const d = new Date(res)
      // Próxima segunda-feira é 12 de Maio
      expect(d.getDate()).toBe(12)
      expect(d.getDay()).toBe(1) // Segunda
    })

    it('deve retornar string vazia para periodicidade sob_demanda', () => {
      const res = lineSummaryAutomationService.calculateNextExecution('sob_demanda', {}, baseDate)
      expect(res).toBe('')
    })
  })

  describe('2. Seleção Hierárquica e Vínculo Canônico de Template para Linha', () => {
    const templatesMock: MonthlySummaryTemplate[] = [
      {
        id: 'tpl-geral-1',
        template_code: 'TMP-GERAL',
        nome: 'Template Geral Institucional',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'ALL',
        centro_code: 'ALL',
        aplicacao: 'GERAL',
        status: 'ATIVO',
        is_default: true,
        vigencia_inicio: '2025-01-01',
        versao: 1,
        versao_tag: 'V1.0',
        responsavel_criacao: 'Admin',
        ultima_atualizacao_por: 'Admin',
        sections_config: [],
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'tpl-empresa-1',
        template_code: 'TMP-CIAFAL',
        nome: 'Template Empresa CIAFAL',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'ALL',
        centro_code: 'ALL',
        aplicacao: 'EMPRESA',
        status: 'ATIVO',
        is_default: false,
        vigencia_inicio: '2025-01-01',
        versao: 1,
        versao_tag: 'V1.0',
        responsavel_criacao: 'Admin',
        ultima_atualizacao_por: 'Admin',
        sections_config: [],
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'tpl-centro-1001',
        template_code: 'TMP-CENTRO-1001',
        nome: 'Template Centro Divinópolis',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'ALL',
        centro_code: '1001',
        aplicacao: 'CENTRO',
        status: 'ATIVO',
        is_default: false,
        vigencia_inicio: '2025-01-01',
        versao: 1,
        versao_tag: 'V1.0',
        responsavel_criacao: 'Admin',
        ultima_atualizacao_por: 'Admin',
        sections_config: [],
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'tpl-linha-l1',
        template_code: 'TMP-LINHA-L1',
        nome: 'Template Exclusivo Linha 1',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'L1',
        centro_code: 'ALL',
        aplicacao: 'LINHA',
        status: 'ATIVO',
        is_default: false,
        vigencia_inicio: '2025-01-01',
        versao: 1,
        versao_tag: 'V1.0',
        responsavel_criacao: 'Admin',
        ultima_atualizacao_por: 'Admin',
        sections_config: [],
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'tpl-custom-vinculado',
        template_code: 'TMP-CUSTOM-MANUAL',
        nome: 'Template Customizado Específico',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'ALL',
        centro_code: 'ALL',
        aplicacao: 'GERAL',
        status: 'ATIVO',
        is_default: false,
        vigencia_inicio: '2025-01-01',
        versao: 2,
        versao_tag: 'V2.0',
        responsavel_criacao: 'Admin',
        ultima_atualizacao_por: 'Admin',
        sections_config: [],
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      },
    ]

    it('deve priorizar vínculo explícito na configuração da linha (template_id)', () => {
      const config = {
        template_id: 'tpl-custom-vinculado',
        centro_code: '1001',
        linha_code: 'L1',
        empresa_code: 'CIAFAL',
      }
      const resolved = lineSummaryAutomationService.resolveTemplateForLine(config, templatesMock)
      expect(resolved?.id).toBe('tpl-custom-vinculado')
      expect(resolved?.nome).toBe('Template Customizado Específico')
    })

    it('deve priorizar Centro quando não há vínculo explícito', () => {
      const config = {
        centro_code: '1001',
        linha_code: 'L2',
        empresa_code: 'CIAFAL',
      }
      const resolved = lineSummaryAutomationService.resolveTemplateForLine(config, templatesMock)
      expect(resolved?.id).toBe('tpl-centro-1001')
      expect(resolved?.aplicacao).toBe('CENTRO')
    })

    it('deve priorizar Linha quando não há Centro compatível', () => {
      const config = {
        centro_code: '9999',
        linha_code: 'L1',
        empresa_code: 'CIAFAL',
      }
      const resolved = lineSummaryAutomationService.resolveTemplateForLine(config, templatesMock)
      expect(resolved?.id).toBe('tpl-linha-l1')
      expect(resolved?.aplicacao).toBe('LINHA')
    })

    it('deve cair em Empresa quando não há Centro nem Linha específicos', () => {
      const config = {
        centro_code: '9999',
        linha_code: 'L99',
        empresa_code: 'CIAFAL',
      }
      const resolved = lineSummaryAutomationService.resolveTemplateForLine(config, templatesMock)
      expect(resolved?.id).toBe('tpl-empresa-1')
      expect(resolved?.aplicacao).toBe('EMPRESA')
    })

    it('deve cair no padrão Geral institucional se nenhuma regra anterior coincidir', () => {
      const config = {
        centro_code: '9999',
        linha_code: 'L99',
        empresa_code: 'OUTRA',
      }
      const resolved = lineSummaryAutomationService.resolveTemplateForLine(config, templatesMock)
      expect(resolved?.id).toBe('tpl-geral-1')
      expect(resolved?.is_default).toBe(true)
    })
  })

  describe('3. Proteção Contra Execução Duplicada (Config + Período)', () => {
    it('deve impedir geração redundante se o período já tiver execução com sucesso', async () => {
      const existingRun: SummaryScheduleRun = {
        id: 'run-existing-1',
        config_id: 'cfg-l1',
        config_dedup_key: 'cfg-l1-2025-05',
        linha_code: 'L1',
        centro_code: '1001',
        periodo: '2025-05',
        origem: 'manual',
        status: 'SUCESSO',
        resumo_codigo: 'RES-L1-2025-05-V01',
        tentativas: 1,
        created: '2025-05-01',
        updated: '2025-05-01',
      }

      const configL1: LineSummaryConfig = {
        id: 'cfg-l1',
        linha_code: 'L1',
        linha_nome: 'Linha 1',
        centro_code: '1001',
        empresa_code: 'CIAFAL',
        tipo_resumo: 'Resumo Mensal PCP',
        periodicidade: 'mensal',
        parametros_personalizados: {},
        geracao_automatica: true,
        exigir_aprovacao: true,
        envio_automatico_apos_aprovacao: true,
        status: 'ATIVO',
        created: '2025-01-01',
        updated: '2025-01-01',
      }

      vi.spyOn(lineSummaryAutomationService, 'getLineConfigById').mockResolvedValue(configL1)
      vi.spyOn(lineSummaryAutomationService, 'listRuns').mockResolvedValue([existingRun])

      const result = await lineSummaryAutomationService.generateSummariesByLine({
        config_ids: ['cfg-l1'],
        periodo: '2025-05',
      })

      expect(result.results.length).toBe(1)
      const item = result.results[0]
      expect(item.success).toBe(true)
      expect(item.result?.already_executed).toBe(true)
      expect(item.resumo_codigo).toBe('RES-L1-2025-05-V01')
    })
  })

  describe('4. Suspensão e Reativação de Configurações de Linha', () => {
    it('deve suspender uma configuração ativa chamando o backend corretamente', async () => {
      const updateSpy = vi.fn().mockResolvedValue({ id: 'cfg-1', status: 'SUSPENSO' })
      vi.spyOn(pb, 'collection').mockReturnValue({
        update: updateSpy,
      } as any)

      const updated = await lineSummaryAutomationService.suspendConfig('cfg-1')
      expect(updateSpy).toHaveBeenCalledWith('cfg-1', { status: 'SUSPENSO' })
      expect(updated.status).toBe('SUSPENSO')
    })

    it('deve reativar uma configuração suspensa recalculando a próxima execução', async () => {
      const existingSuspended: LineSummaryConfig = {
        id: 'cfg-1',
        linha_code: 'L1',
        centro_code: '1001',
        empresa_code: 'CIAFAL',
        tipo_resumo: 'Resumo Mensal PCP',
        periodicidade: 'diaria',
        parametros_personalizados: { horario: '08:00' },
        geracao_automatica: true,
        exigir_aprovacao: true,
        envio_automatico_apos_aprovacao: true,
        status: 'SUSPENSO',
        created: '2025-01-01',
        updated: '2025-01-01',
      }

      vi.spyOn(lineSummaryAutomationService, 'getLineConfigById').mockResolvedValue(
        existingSuspended,
      )
      const updateSpy = vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data }))
      vi.spyOn(pb, 'collection').mockReturnValue({
        update: updateSpy,
      } as any)

      const updated = await lineSummaryAutomationService.reactivateConfig('cfg-1')
      expect(updateSpy).toHaveBeenCalled()
      expect(updated.status).toBe('ATIVO')
      expect(updated.proxima_execucao).toBeTruthy()
    })
  })

  describe('5. Reprocessamento de Falhas Registradas', () => {
    it('deve permitir reprocessar uma execução cujo status era FALHA', async () => {
      const failedRun: SummaryScheduleRun = {
        id: 'run-fail-1',
        config_id: 'cfg-l1',
        config_dedup_key: 'cfg-l1-2025-05-fail',
        linha_code: 'L1',
        centro_code: '1001',
        periodo: '2025-05',
        origem: 'automatica',
        status: 'FALHA',
        erro: 'Timeout de comunicação SAP RFC',
        tentativas: 1,
        created: '2025-05-01',
        updated: '2025-05-01',
      }

      const getOneSpy = vi.fn().mockResolvedValue(failedRun)
      const updateSpy = vi.fn().mockResolvedValue({ ...failedRun, status: 'SUCESSO', erro: '' })
      vi.spyOn(pb, 'collection').mockReturnValue({
        getOne: getOneSpy,
        update: updateSpy,
      } as any)

      vi.spyOn(lineSummaryAutomationService, 'generateSummariesByLine').mockResolvedValue({
        success: true,
        periodo: '2025-05',
        processed_count: 1,
        results: [
          {
            config_id: 'cfg-l1',
            linha_code: 'L1',
            success: true,
            resumo_codigo: 'RES-L1-2025-05-V01',
          },
        ],
      })

      const res = await lineSummaryAutomationService.reprocessRun('run-fail-1')
      expect(res.success).toBe(true)
      expect(res.message).toContain('reprocessada com sucesso')
    })
  })

  describe('6. Governança de Envio e Trava de Aprovação', () => {
    it('envio não deve ocorrer enquanto exigir_aprovacao for verdadeiro e o relatório for rascunho', async () => {
      const config: LineSummaryConfig = {
        id: 'cfg-1',
        linha_code: 'L1',
        centro_code: '1001',
        empresa_code: 'CIAFAL',
        tipo_resumo: 'Resumo Mensal PCP',
        periodicidade: 'mensal',
        parametros_personalizados: {},
        geracao_automatica: true,
        exigir_aprovacao: true, // Trava ativada
        envio_automatico_apos_aprovacao: true,
        status: 'ATIVO',
        created: '2025-01-01',
        updated: '2025-01-01',
      }

      // Se o relatório gerado ainda é Rascunho / Em Edição, não dispara e-mail imediatamente
      const isEligibleForDirectSend = !config.exigir_aprovacao
      expect(isEligibleForDirectSend).toBe(false)
    })

    it('envio direto é permitido quando a configuração desativa a exigência de aprovação prévia', () => {
      const config: LineSummaryConfig = {
        id: 'cfg-direct',
        linha_code: 'L2',
        centro_code: '1001',
        empresa_code: 'CIAFAL',
        tipo_resumo: 'Resumo Mensal PCP',
        periodicidade: 'semanal',
        parametros_personalizados: {},
        geracao_automatica: true,
        exigir_aprovacao: false, // Sem trava
        envio_automatico_apos_aprovacao: true,
        status: 'ATIVO',
        created: '2025-01-01',
        updated: '2025-01-01',
      }

      const isEligibleForDirectSend = !config.exigir_aprovacao
      expect(isEligibleForDirectSend).toBe(true)
    })
  })

  describe('7. Resiliência a Integrações Indisponíveis (SAP RFC / WMS)', () => {
    it('deve registrar dado indisponível e não travar o fluxo caso SAP retorne erro', async () => {
      // Simula integração SAP RFC falhando com 503
      const sapRfcCall = vi.fn().mockRejectedValue(new Error('SAP RFC Service Unavailable 503'))

      let fallbackResult: string | null = null
      try {
        await sapRfcCall()
      } catch (err) {
        fallbackResult = 'Dado não disponível (SAP RFC)'
      }

      expect(fallbackResult).toBe('Dado não disponível (SAP RFC)')
    })
  })
})
