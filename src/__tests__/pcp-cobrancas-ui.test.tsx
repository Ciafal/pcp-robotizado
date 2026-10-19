import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NovaCobrancaModal } from '@/components/meetings/NovaCobrancaModal'
import { HistoricoCobrancasModal } from '@/components/meetings/HistoricoCobrancasModal'
import { pcpCobrancasService } from '@/services/pcp-cobrancas-service'
import { PCPMeetingPendencyRecord } from '@/types/pcp-meeting'

const mockPendency: PCPMeetingPendencyRecord = {
  id: 'pend_001',
  pendency_code: 'PEND-000001',
  meeting_id: 'meet_001',
  meeting_code: 'RCP-2026-03-001',
  meeting_date: '2026-10-15',
  ata_id: 'ata_001',
  ata_code: 'ATA-RCP-2026-03-001-V1',
  origin_week: 42,
  origin_year: 2026,
  area: 'L1',
  subject: 'Alinhamento de bobinas em quarentena',
  action: 'Efetuar reinspeção com qualidade e liberar para corte',
  responsible: 'Thiago',
  deadline: '2026-10-25',
  priority: 'ALTA',
  status: 'ABERTA',
  created: '2026-10-15T10:00:00Z',
}

describe('NovaCobrancaModal - UI e Confirmação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir os dados de identificação da pendência corretamente', () => {
    render(
      <NovaCobrancaModal
        open={true}
        onClose={vi.fn()}
        pendency={mockPendency}
        onCobrancaSuccess={vi.fn()}
      />,
    )

    expect(screen.getByText('Nova Cobrança da Pendência')).toBeInTheDocument()
    expect(screen.getByText('PEND-000001')).toBeInTheDocument()
    expect(screen.getByText('Alinhamento de bobinas em quarentena')).toBeInTheDocument()
    expect(screen.getByText('Thiago')).toBeInTheDocument()
    expect(screen.getByText('L1')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(
        'Favor atualizar esta pendência antes da próxima reunião semanal de PCP.',
      ),
    ).toBeInTheDocument()
  })

  it('deve solicitar confirmação antes de efetuar o envio da cobrança', async () => {
    const enviarSpy = vi.spyOn(pcpCobrancasService, 'enviarCobranca').mockResolvedValueOnce({
      success: true,
      message: 'Cobrança enviada com sucesso para Thiago pelo Meu Dia e por e-mail.',
      cobranca: {
        id: 'cob_01',
        codigo_cobranca: 'COB-123456',
        sequencial_pendencia: 1,
        status_meu_dia: 'ENVIADO',
        status_email: 'AGUARDANDO_SMTP',
        destinatario_nome: 'Thiago',
        destinatario_email: 'thiago@ciafal.com.br',
        data_hora: '19/10/2026 15:40',
      },
    })

    const onCobrancaSuccessMock = vi.fn()

    render(
      <NovaCobrancaModal
        open={true}
        onClose={vi.fn()}
        pendency={mockPendency}
        onCobrancaSuccess={onCobrancaSuccessMock}
      />,
    )

    // Clicar em "Enviar cobrança"
    const btnPreSubmit = screen.getByRole('button', { name: /enviar cobrança/i })
    fireEvent.click(btnPreSubmit)

    // Modal de confirmação deve aparecer
    expect(screen.getByText('Confirmar Envio da Cobrança')).toBeInTheDocument()
    expect(screen.getByText(/Deseja enviar uma nova cobrança da pendência/i)).toBeInTheDocument()

    // Clicar em "Confirmar envio"
    const btnConfirm = screen.getByRole('button', { name: /confirmar envio/i })
    fireEvent.click(btnConfirm)

    await waitFor(() => {
      expect(enviarSpy).toHaveBeenCalledTimes(1)
      expect(onCobrancaSuccessMock).toHaveBeenCalledTimes(1)
    })
  })
})

describe('HistoricoCobrancasModal - Tabela Cronológica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve listar cobranças com número sequencial e status de canais', async () => {
    vi.spyOn(pcpCobrancasService, 'listarCobrancasPendencia').mockResolvedValueOnce([
      {
        id: 'cob_01',
        codigo_cobranca: 'COB-000001',
        pendencia_id: 'pend_001',
        pendencia_codigo: 'PEND-000001',
        sequencial_pendencia: 1,
        data_hora: '19/10/2026 15:40',
        emissor_id: 'usr_leticia',
        emissor_nome: 'Leticia',
        emissor_email: 'leticia@ciafal.com.br',
        destinatario_id: 'usr_thiago',
        destinatario_nome: 'Thiago',
        destinatario_email: 'thiago@ciafal.com.br',
        mensagem_complementar: 'Favor atualizar antes de sexta-feira.',
        status_meu_dia: 'ENVIADO',
        status_email: 'AGUARDANDO_SMTP',
      },
    ])

    render(<HistoricoCobrancasModal open={true} onClose={vi.fn()} pendency={mockPendency} />)

    await waitFor(() => {
      expect(screen.getByText('Histórico de Cobranças — PEND-000001')).toBeInTheDocument()
      expect(screen.getByText('Cobrança 01')).toBeInTheDocument()
      expect(screen.getByText('Leticia')).toBeInTheDocument()
      expect(screen.getByText('Thiago')).toBeInTheDocument()
      expect(screen.getByText('Aguardando SMTP')).toBeInTheDocument()
    })
  })
})
