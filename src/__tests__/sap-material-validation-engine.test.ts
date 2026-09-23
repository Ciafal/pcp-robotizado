import { describe, it, expect } from 'vitest'
import { sapValidationService } from '@/services/sap-validation-service'
import { OFFICIAL_VALIDATION_GROUPS } from '@/types/sap-validation'

describe('Motor de Validação de Cadastro SAP (PCP Robotizado CIAFAL)', () => {
  describe('Validação das Regras do Código Modelo', () => {
    it('REGRA 1: Código modelo com menos de 6 meses deve gerar advertência MODEL_LESS_THAN_6_MONTHS e status AMARELO', () => {
      // Data recente: 30 dias atrás
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const result = sapValidationService.evaluateModelCodeRules({
        materialNewCode: '10002941',
        materialModelCode: '10001872',
        modelCreatedDate: recentDate,
        hasMovements: true,
      })

      expect(result.modelStatus).toBe('AMARELO')
      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0].rule).toBe('MODEL_LESS_THAN_6_MONTHS')
      expect(result.warnings[0].message).toContain('menos de 6 meses de utilização')
    })

    it('REGRA 2: Código modelo sem nenhuma movimentação deve gerar advertência MODEL_NO_MOVEMENTS', () => {
      // Data antiga: 1 ano atrás, mas sem movimentações
      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      const result = sapValidationService.evaluateModelCodeRules({
        materialNewCode: '10002941',
        materialModelCode: '10001872',
        modelCreatedDate: oldDate,
        hasMovements: false,
      })

      expect(result.modelStatus).toBe('AMARELO')
      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0].rule).toBe('MODEL_NO_MOVEMENTS')
      expect(result.warnings[0].message).toContain('não possui movimentação registrada')
    })

    it('REGRA 3: Primeiro caractere diferente entre novo e modelo deve gerar advertência FIRST_CHAR_DIFF', () => {
      const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      const result = sapValidationService.evaluateModelCodeRules({
        materialNewCode: '20002941', // Começa com '2'
        materialModelCode: '10001872', // Começa com '1'
        modelCreatedDate: oldDate,
        hasMovements: true,
      })

      expect(result.modelStatus).toBe('AMARELO')
      expect(result.warnings.length).toBe(1)
      expect(result.warnings[0].rule).toBe('FIRST_CHAR_DIFF')
      expect(result.warnings[0].message).toContain('primeiro caractere igual ao código modelo')
    })

    it('Status VERMELHO quando houver 2 ou mais advertências combinadas', () => {
      const recentDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      const result = sapValidationService.evaluateModelCodeRules({
        materialNewCode: '30002941', // Prefixo diferente ('3' vs '1')
        materialModelCode: '10001872',
        modelCreatedDate: recentDate, // Menos de 6 meses
        hasMovements: false, // Sem movimentação
      })

      expect(result.modelStatus).toBe('VERMELHO')
      expect(result.warnings.length).toBe(3)
    })

    it('Status VERDE quando o modelo atende a todas as 3 regras funcionais', () => {
      const oldDate = new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
      const result = sapValidationService.evaluateModelCodeRules({
        materialNewCode: '10002941',
        materialModelCode: '10001872',
        modelCreatedDate: oldDate,
        hasMovements: true,
      })

      expect(result.modelStatus).toBe('VERDE')
      expect(result.warnings.length).toBe(0)
    })
  })

  describe('Arquitetura de Grupos Oficiais e Accordions', () => {
    it('deve contemplar os grupos canônicos especificados', () => {
      const groupIds = OFFICIAL_VALIDATION_GROUPS.map((g) => g.id)
      expect(groupIds).toContain('MM03')
      expect(groupIds).toContain('CS01')
      expect(groupIds).toContain('CA01')
      expect(groupIds).toContain('MMSC')
      expect(groupIds).toContain('CUSTEIO')
      expect(groupIds).toContain('COMPLEMENTARES')
    })

    it('grupo MM03 deve possuir os 24 subgrupos de abas do SAP', () => {
      const mm03 = OFFICIAL_VALIDATION_GROUPS.find((g) => g.id === 'MM03')
      expect(mm03).toBeDefined()
      expect(mm03?.subgroups).toContain('Dados básicos 1')
      expect(mm03?.subgroups).toContain('MRP 1')
      expect(mm03?.subgroups).toContain('Contabilidade 1')
      expect(mm03?.subgroups).toContain('Cálculo do preço 1')
    })
  })

  describe('Conector FCA SAP - Tratamento de Indisponibilidade e Mensagem Funcional', () => {
    it('deve retornar mensagem funcional padrão quando FCA não estiver configurado', async () => {
      // Como o secret SAP_FCA_BASE_URL não está configurado no ambiente, o serviço deve retornar a mensagem funcional padrão
      const res = await sapValidationService.fetchMaterialFromSap('10002941', false)
      expect(res.success).toBe(false)
      expect(res.functional_message).toBe(
        'Não foi possível consultar o SAP. A validação não foi executada.',
      )
    })
  })
})
