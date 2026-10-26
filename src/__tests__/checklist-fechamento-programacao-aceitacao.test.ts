import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calcularNthDiaUtilDoMes,
  calcularDiaDoMes,
  calcularProximaExecucao,
  derivarStatusOperacionalItem,
  calcularSegundoDiaUtil,
  calcularProximoCodigoMestre,
  checklistFechamentoService,
} from '@/services/checklist-fechamento-service'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import { pb } from '@/lib/pocketbase/client'

describe('Motor de Programação do Check-list Fechamento (PCP Robotizado)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Cálculo de Dias Úteis (Desconsidera Sábados, Domingos e Feriados)', () => {
    it('1.1 Se o dia 01 for sábado e 02 for domingo, 1º dia útil = dia 03 e 2º dia útil = dia 04', () => {
      // Agosto de 2026: 01/08/2026 é Sábado, 02/08/2026 é Domingo
      const feriadosAgosto2026: string[] = [] // sem feriado
      const primeiroDia = calcularNthDiaUtilDoMes(2026, 8, 1, feriadosAgosto2026)
      const segundoDia = calcularNthDiaUtilDoMes(2026, 8, 2, feriadosAgosto2026)

      expect(primeiroDia.dataIso).toBe('2026-08-03')
      expect(primeiroDia.dataFormatada).toBe('03/08/2026')

      expect(segundoDia.dataIso).toBe('2026-08-04')
      expect(segundoDia.dataFormatada).toBe('04/08/2026')

      // Novembro de 2026: 01/11/2026 é Domingo. Se dia 02 for feriado (Finados):
      const novComFinados = calcularNthDiaUtilDoMes(2026, 11, 1, ['2026-11-02'])
      expect(novComFinados.dataIso).toBe('2026-11-03') // Terça-feira
      const nov2ComFinados = calcularNthDiaUtilDoMes(2026, 11, 2, ['2026-11-02'])
      expect(nov2ComFinados.dataIso).toBe('2026-11-04') // Quarta-feira
    })

    it('1.2 Pula feriado corporativo quando presente no calendário (ex: 07/09 segunda)', () => {
      // Setembro de 2026:
      // 01/09/2026 = Terça (1º dia útil)
      // 02/09/2026 = Quarta (2º dia útil)
      // 03/09/2026 = Quinta (3º dia útil)
      // 04/09/2026 = Sexta (4º dia útil)
      // 05/09 = Sáb, 06/09 = Dom, 07/09 = Feriado (Segunda)
      // 5º dia útil = 08/09 (Terça)
      const feriados = ['2026-09-07']
      const quintoDia = calcularNthDiaUtilDoMes(2026, 9, 5, feriados)
      expect(quintoDia.dataIso).toBe('2026-09-08')
      expect(quintoDia.dataFormatada).toBe('08/09/2026')
    })

    it('1.3 calcularSegundoDiaUtil preserva retrocompatibilidade oficial', () => {
      // Competência 09/2026 -> Segundo dia útil de Outubro/2026
      // 01/10/2026 = Quinta (1º dia útil)
      // 02/10/2026 = Sexta (2º dia útil)
      const res = calcularSegundoDiaUtil(2026, 9, [])
      expect(res.segundoDiaUtilIso).toBe('2026-10-02')
      expect(res.segundoDiaUtilFormatado).toBe('02/10/2026')
    })
  })

  describe('2. Cálculo de Dia do Mês (1 a 31 com fallback seguro para meses menores)', () => {
    it('2.1 Retorna o dia configurado quando válido (ex: dia 15 em qualquer mês)', () => {
      const res = calcularDiaDoMes(2026, 4, 15)
      expect(res.dataIso).toBe('2026-04-15')
      expect(res.dataFormatada).toBe('15/04/2026')
    })

    it('2.2 Dia 31 em mês de 30 dias (ex: Abril) ajusta sem erro para o último dia válido (30)', () => {
      const res = calcularDiaDoMes(2026, 4, 31)
      expect(res.dataIso).toBe('2026-04-30')
      expect(res.dataFormatada).toBe('30/04/2026')
    })

    it('2.3 Dia 31 ou 30 em Fevereiro ajusta para 28 (ou 29 se bissexto)', () => {
      // 2026 não é bissexto -> Fevereiro tem 28 dias
      const res28 = calcularDiaDoMes(2026, 2, 31)
      expect(res28.dataIso).toBe('2026-02-28')
      expect(res28.dataFormatada).toBe('28/02/2026')
    })
  })

  describe('3. Recorrência e Próxima Execução Mensal Automática', () => {
    it('3.1 Dia útil do mês calcula ocorrência e gera texto legível "Todo 2º dia útil do mês"', () => {
      // Em 01/08/2026, o 2º dia útil de agosto (04/08) ainda não passou
      const res = calcularProximaExecucao({
        tipo_programacao: 'dia_util',
        dia_util: 2,
        dataReferenciaIso: '2026-08-01',
      })

      expect(res.regraTexto).toBe('Todo 2º dia útil do mês')
      expect(res.proximaExecucaoIso).toBe('2026-08-04')
      expect(res.proximaExecucaoFormatada).toBe('04/08/2026')
    })

    it('3.2 Se a data do mês corrente já passou, calcula para o próximo mês sem exigir novo cadastro manual', () => {
      // Em 10/08/2026, o 2º dia útil de agosto (04/08) já passou -> Próximo mês = Setembro/2026
      // Setembro/2026: 01/09 terça (1º), 02/09 quarta (2º dia útil)
      const res = calcularProximaExecucao({
        tipo_programacao: 'dia_util',
        dia_util: 2,
        dataReferenciaIso: '2026-08-10',
      })

      expect(res.regraTexto).toBe('Todo 2º dia útil do mês')
      expect(res.proximaExecucaoIso).toBe('2026-09-02')
      expect(res.proximaExecucaoFormatada).toBe('02/09/2026')
    })

    it('3.3 Dia do mês calcula ocorrência e projeta mês seguinte após conclusão do período', () => {
      // Em 15/05/2026 com regra dia 5 -> Ocorrência de maio (05/05) já passou -> Próxima em Junho (05/06/2026)
      const res = calcularProximaExecucao({
        tipo_programacao: 'dia_mes',
        dia_mes: 5,
        dataReferenciaIso: '2026-05-15',
      })

      expect(res.regraTexto).toBe('Todo dia 5 do mês')
      expect(res.proximaExecucaoIso).toBe('2026-06-05')
      expect(res.proximaExecucaoFormatada).toBe('05/06/2026')
    })

    it('3.4 Data específica pontual pt-BR exibe formatação e texto exato', () => {
      const res = calcularProximaExecucao({
        tipo_programacao: 'data_especifica',
        data_especifica: '2026-11-10',
      })

      expect(res.regraTexto).toBe('Execução: 10/11/2026')
      expect(res.proximaExecucaoIso).toBe('2026-11-10')
      expect(res.proximaExecucaoFormatada).toBe('10/11/2026')
    })
  })

  describe('4. Status Operacional Automático (Pendente / Vence hoje / Em atraso / Concluído)', () => {
    const itemBase: ChecklistFechamentoItem = {
      id: 'it-1',
      execucao_id: 'ex-1',
      competencia: '09/2026',
      codigo: '1.27',
      sequencia: 27,
      titulo: 'Validar fechamento SAP',
      descricao_detalhada: 'Teste',
      categoria: 'Processamento SAP',
      linha_centro_relacionado: 'L1',
      empresa: '1000',
      transacao_sap: 'N/A',
      deposito_sap: 'N/A',
      obrigatoria: true,
      responsavel_padrao: 'PCP',
      area_responsavel: 'PCP',
      manual_documento_referencia: 'IT-01',
      regra_validacao: 'OK',
      status_regra: 'Oficial',
      fonte_dados: 'Manual',
      status: 'PENDENTE',
    }

    it('4.1 Status Concluído quando item já executado com OK', () => {
      const derivado = derivarStatusOperacionalItem({ ...itemBase, status: 'OK' }, '2026-09-10')
      expect(derivado.statusDerivado).toBe('Concluído')
    })

    it('4.2 Status Vence hoje quando data_prevista == data atual', () => {
      const derivado = derivarStatusOperacionalItem(
        { ...itemBase, status: 'PENDENTE', proxima_execucao: '2026-09-10' },
        '2026-09-10',
      )
      expect(derivado.statusDerivado).toBe('Vence hoje')
    })

    it('4.3 Status Em atraso quando data prevista já passou e atividade não concluída', () => {
      const derivado = derivarStatusOperacionalItem(
        { ...itemBase, status: 'PENDENTE', proxima_execucao: '2026-09-05' },
        '2026-09-10',
      )
      expect(derivado.statusDerivado).toBe('Em atraso')
    })

    it('4.4 Status Pendente quando dentro do prazo futuro', () => {
      const derivado = derivarStatusOperacionalItem(
        { ...itemBase, status: 'PENDENTE', proxima_execucao: '2026-09-20' },
        '2026-09-10',
      )
      expect(derivado.statusDerivado).toBe('Pendente')
    })
  })

  describe('5. Código Automático, Histórico e Não Reutilização de Código Inativado', () => {
    it('5.1 Padrão histórico 1.24 / 1.25 / 1.26 gera próximo como 1.27', () => {
      const codigos = ['1.1', '1.2', '1.24', '1.25', '1.26']
      expect(calcularProximoCodigoMestre(codigos)).toBe('1.27')
    })

    it('5.2 NÃO reutiliza código de atividade inativada ou existente na base', () => {
      // Suponha que 1.27 foi inativado/cadastrado anteriormente
      const codigosComInativo = ['1.1', '1.24', '1.25', '1.26', '1.27']
      expect(calcularProximoCodigoMestre(codigosComInativo)).toBe('1.28')
    })

    it('5.3 Não corrompe cálculo na presença de subníveis históricos (ex: 1.23.1)', () => {
      const codigos = ['1.22', '1.23', '1.23.1', '1.24', '1.25', '1.26']
      expect(calcularProximoCodigoMestre(codigos)).toBe('1.27')
    })

    it('5.4 Edição preserva estritamente o código original sem alterá-lo', async () => {
      const getOneSpy = vi
        .spyOn(pb.collection('checklist_fechamento_modelos'), 'getOne')
        .mockResolvedValue({
          id: 'mod-124',
          codigo: '1.24',
          titulo: 'Endireitadeira L1 Original',
          werks: '1000',
          line_code: 'L1',
          center_code: 'WC-L1',
        } as any)

      const updateSpy = vi
        .spyOn(pb.collection('checklist_fechamento_modelos'), 'update')
        .mockResolvedValue({
          id: 'mod-124',
          codigo: '1.24',
          titulo: 'Endireitadeira L1 Atualizada',
          werks: '1000',
          line_code: 'L1',
          center_code: 'WC-L1',
        } as any)

      const auditSpy = vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({
        id: 'aud-edit-1',
      } as any)

      // Tentativa de alterar o código para '9.99' na edição
      const resultado = await checklistFechamentoService.salvarModelo({
        id: 'mod-124',
        codigo: '9.99', // tentativa indevida
        titulo: 'Endireitadeira L1 Atualizada',
        tipo_programacao: 'dia_mes',
        dia_mes: 15,
      })

      // O update deve ser chamado mantendo o código '1.24' original
      expect(updateSpy).toHaveBeenCalledWith(
        'mod-124',
        expect.objectContaining({
          codigo: '1.24',
          titulo: 'Endireitadeira L1 Atualizada',
        }),
      )
      expect(resultado.codigo).toBe('1.24')
    })
  })

  describe('6. Auditoria de Criação, Edição e Mudança de Regra', () => {
    it('6.1 Registra log com usuário, data/hora, código, valores anterior/novo e empresa/linha/centro', async () => {
      const auditSpy = vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({
        id: 'aud-log-1',
      } as any)

      await checklistFechamentoService.logAuditoria({
        acao: 'EDITAR_ATIVIDADE',
        descricao: 'Atividade 1.24 alterada',
        competencia: '09/2026',
        valor_anterior: JSON.stringify({ tipo_programacao: 'dia_util', dia_util: 2 }),
        valor_novo: JSON.stringify({ tipo_programacao: 'dia_mes', dia_mes: 10 }),
        detalhes: {
          codigo: '1.24',
          werks: '1000',
          line_code: 'L1',
          center_code: 'WC-L1',
        },
      })

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EDITAR_ATIVIDADE',
          resource: 'CHECKLIST_FECHAMENTO',
          screen: 'Check-list Fechamento',
          company: 'CIAFAL',
          details: expect.objectContaining({
            codigo: '1.24',
            werks: '1000',
            line_code: 'L1',
            center_code: 'WC-L1',
          }),
        }),
      )
    })
  })
})
