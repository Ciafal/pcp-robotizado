import { describe, it, expect, beforeAll } from 'vitest'
import { pb } from '@/lib/pocketbase/client'

describe('Smoke Test Real Backend: pcp_line_summary_configs', () => {
  let isAuthed = false

  beforeAll(async () => {
    // Autenticar com credenciais dos usuários seed oficiais CIAFAL
    try {
      if (!pb.authStore.isValid) {
        try {
          await pb
            .collection('users')
            .authWithPassword('programador.pcp@ciafal.com.br', 'Skip@Pass')
        } catch (_) {
          try {
            await pb.collection('users').authWithPassword('ciafal@ciafal.com.br', 'Skip@Pass')
          } catch (_) {
            try {
              await pb.collection('users').authWithPassword('admin@pcp.ciafal.com.br', 'Skip@Pass')
            } catch {
              /* intentionally ignored */
            }
          }
        }
      }
      isAuthed = pb.authStore.isValid
    } catch (e) {
      console.warn('Erro ao autenticar cliente PocketBase para o teste:', e)
      isAuthed = pb.authStore.isValid
    }
  })

  it('deve executar o ciclo completo de create -> getOne -> update -> delete com o payload exato da tela', async () => {
    if (!isAuthed) {
      console.warn(
        'Teste ignorado graciosamente: credenciais de backend não disponíveis no ambiente de teste.',
      )
      return
    }

    // Payload idêntico ao gerado em LineConfigTab.tsx
    const payload = {
      empresa_code: 'CIAFAL',
      linha_id: '',
      linha_code: 'TESTE-SMOKE-L1',
      linha_nome: 'Linha L1 Smoke Test',
      centro_code: 'SDPL',
      centro_nome: 'Sidercentro',
      template_id: '',
      template_code: '',
      template_nome: '',
      tipo_resumo: 'Resumo Mensal PCP',
      responsavel_geracao_id: pb.authStore.record?.id || 's2t7qjmxl2vjgs5',
      responsavel_geracao_nome: (pb.authStore.record as any)?.name || 'Lucas Ferreira (PCP)',
      programador_pcp_id: pb.authStore.record?.id || '',
      programador_pcp_nome: (pb.authStore.record as any)?.name || '',
      programador_substituto_id: '',
      programador_substituto_nome: '',
      supervisor_pcp_id: '',
      supervisor_pcp_nome: '',
      geracao_automatica: true,
      exigir_aprovacao: true,
      envio_automatico_apos_aprovacao: false,
      periodicidade: 'mensal',
      parametros_personalizados: {
        intervalo_dias: 30,
        horario: '08:00',
        dia_do_mes: 1,
      },
      data_referencia_str: '',
      status: 'ATIVO',
      observacoes: 'Registro de smoke test automatizado do backend',
      finalidade: 'Garantir gravação ponta a ponta sem rejeição 400',
    }

    let createdRecord: any = null

    try {
      // 1. CREATE
      createdRecord = await pb.collection('pcp_line_summary_configs').create(payload)
      expect(createdRecord).toBeDefined()
      expect(createdRecord.id).toBeDefined()
      expect(createdRecord.linha_code).toBe('TESTE-SMOKE-L1')
      expect(createdRecord.tipo_resumo).toBe('Resumo Mensal PCP')
      expect(createdRecord.status).toBe('ATIVO')

      // 2. GET ONE
      const fetched = await pb.collection('pcp_line_summary_configs').getOne(createdRecord.id)
      expect(fetched.id).toBe(createdRecord.id)
      expect(fetched.empresa_code).toBe('CIAFAL')
      expect(fetched.periodicidade).toBe('mensal')

      // 3. UPDATE
      const updated = await pb.collection('pcp_line_summary_configs').update(createdRecord.id, {
        status: 'INATIVO',
        observacoes: 'Status atualizado com sucesso no smoke test',
      })
      expect(updated.status).toBe('INATIVO')
      expect(updated.observacoes).toBe('Status atualizado com sucesso no smoke test')

      // 4. DELETE
      await pb.collection('pcp_line_summary_configs').delete(createdRecord.id)
      createdRecord = null

      // Assertar que nada sobra
      let notFound = false
      try {
        await pb.collection('pcp_line_summary_configs').getOne(updated.id)
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) {
          notFound = true
        }
      }
      expect(notFound).toBe(true)
    } catch (err: any) {
      console.error('Smoke test falhou no PocketBase:', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
      })
      throw err
    } finally {
      // Cleanup de segurança caso tenha quebrado antes do delete
      if (createdRecord?.id) {
        try {
          await pb.collection('pcp_line_summary_configs').delete(createdRecord.id)
        } catch {
          /* intentionally ignored */
        }
      }
    }
  })
})
