import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { DetalheCardSDCModal } from '@/components/carteira-views/DetalheCardSDCModal'
import { DetalheOrdemProducaoModal } from '@/components/carteira-views/DetalheOrdemProducaoModal'
import { CarteiraSDCItem, CarteiraSDCKpis } from '@/types/carteira-sdc'

const kpisMock: CarteiraSDCKpis = {
  carteira_total_t: 100.0,
  estoque_total_t: 20.0,
  deficit_atual_t: 80.0,
  itens_com_deficit_count: 2,
  em_producao_total_t: 30.0,
  itens_cobertura_programada_count: 1,
  itens_criticos_count: 1,
  total_itens: 2,
}

const itemComOpMock: CarteiraSDCItem = {
  material: 'C1250A360600',
  descricao: 'Cantoneira Abas Iguais 1.1/4" x 1/8" ASTM A36',
  familia: 'Cantoneiras',
  bitola: '1.1/4" x 1/8"',
  qualidade_aco: 'ASTM A36',
  curva_abc: 'A',
  carteira_t: 32.0,
  estoque_total_t: 5.0,
  saldo_t: -27.0,
  programado_t: 0,
  em_producao_t: 18.0,
  saldo_projetado_t: -9.0,
  cobertura_pct: 15.6,
  status: 'EM PRODUÇÃO',
  situacao_producao: 'Em industrialização SDC',
  origem_producao: 'Sidercentro',
  centro_sap: 'SDPL',
  empresa: 'Sidercentro',
  ordem_producao_detalhe: {
    numero_op: 'OP-4500012338',
    material: 'C1250A360600',
    descricao: 'Cantoneira Abas Iguais 1.1/4" x 1/8" ASTM A36',
    centro_produtivo: 'SDPL',
    quantidade_planejada_t: 18.0,
    quantidade_realizada_t: 12.5,
    quantidade_pendente_t: 5.5,
    data_inicio: '2026-09-01',
    data_fim_prevista: '2026-09-04',
    status_op: 'CONFIRMADA_PARCIAL',
    lote: 'LT-SDC-2026-09',
    corrida: 'CR-884102',
    status_integracao: 'SUCESSO',
  },
}

const itemSemOpMock: CarteiraSDCItem = {
  material: 'C2000A360600',
  descricao: 'Cantoneira 2" x 1/4" ASTM A36',
  familia: 'Cantoneiras',
  bitola: '2" x 1/4"',
  qualidade_aco: 'ASTM A36',
  curva_abc: 'B',
  carteira_t: 20.0,
  estoque_total_t: 0,
  saldo_t: -20.0,
  programado_t: 0,
  em_producao_t: 10.0,
  saldo_projetado_t: -10.0,
  cobertura_pct: 0,
  status: 'EM PRODUÇÃO',
  situacao_producao: 'Em industrialização SDC',
  origem_producao: 'Sidercentro',
  centro_sap: 'SDPL',
  empresa: 'Sidercentro',
  ordem_producao_detalhe: {
    status_integracao: 'INDISPONIVEL',
    mensagem_indisponibilidade: 'Registros de OP não retornados pela BAPI SAP COOIS.',
  },
}

describe('Detalhamento para OP no Card Em Produção - Carteira SDC', () => {
  it('1. Deve renderizar o botão e expansão de OP na listagem do card Em Produção', () => {
    const onClose = vi.fn()
    render(
      <DetalheCardSDCModal
        isOpen={true}
        onClose={onClose}
        tipoCard="EM_PRODUCAO"
        itens={[itemComOpMock]}
        kpis={kpisMock}
        dataAtualizacao="2026-09-01T12:00:00.000Z"
      />,
    )

    // O card Em Produção exibe a coluna e botão de OP
    expect(screen.getByTestId('btn-expandir-op-C1250A360600')).toBeInTheDocument()
    expect(screen.getByTestId('btn-abrir-modal-op-C1250A360600')).toBeInTheDocument()
    expect(screen.getByText('OP-4500012338')).toBeInTheDocument()

    // Clica para expandir a linha (segundo nível)
    fireEvent.click(screen.getByTestId('btn-expandir-op-C1250A360600'))

    // A linha expansível aparece com planejada, realizada, pendente, status, centro e datas no formato XX,XXX t
    expect(screen.getByTestId('linha-expandida-op-C1250A360600')).toBeInTheDocument()
    expect(screen.getByText('18,000 t')).toBeInTheDocument()
    expect(screen.getByText('12,500 t')).toBeInTheDocument()
    expect(screen.getByText('5,500 t')).toBeInTheDocument()
    expect(screen.getByText('CONFIRMADA_PARCIAL')).toBeInTheDocument()
    expect(screen.getByText(/LT-SDC-2026-09/)).toBeInTheDocument()
  })

  it('2. Deve abrir o modal de detalhe individual da OP com todas as informações requeridas', () => {
    const onClose = vi.fn()
    render(<DetalheOrdemProducaoModal isOpen={true} onClose={onClose} item={itemComOpMock} />)

    expect(screen.getByTestId('modal-detalhe-ordem-producao')).toBeInTheDocument()
    expect(screen.getByTestId('op-qtd-planejada')).toHaveTextContent('18,000 t')
    expect(screen.getByTestId('op-qtd-realizada')).toHaveTextContent('12,500 t')
    expect(screen.getByTestId('op-qtd-pendente')).toHaveTextContent('5,500 t')
    expect(screen.getByTestId('op-numero')).toHaveTextContent('OP-4500012338')
    expect(screen.getByTestId('op-centro')).toHaveTextContent('SDPL')
    expect(screen.getByTestId('op-status')).toHaveTextContent('CONFIRMADA_PARCIAL')
    expect(screen.getByTestId('op-data-inicio')).toHaveTextContent('01/09/2026')
    expect(screen.getByTestId('op-data-fim')).toHaveTextContent('04/09/2026')
    expect(screen.getByTestId('op-lote')).toHaveTextContent('LT-SDC-2026-09')
    expect(screen.getByTestId('op-corrida')).toHaveTextContent('CR-884102')
  })

  it('3. Quando o SAP não retornar registros por OP, deve mostrar indicação clara de indisponibilidade sem números fictícios e sem travar', () => {
    const onClose = vi.fn()
    render(<DetalheOrdemProducaoModal isOpen={true} onClose={onClose} item={itemSemOpMock} />)

    expect(screen.getByTestId('aviso-op-indisponivel')).toBeInTheDocument()
    expect(
      screen.getByText(/Dados de detalhamento da OP indisponíveis no SAP ECC/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId('op-qtd-planejada')).toHaveTextContent('Não disponível')
    expect(screen.getByTestId('op-qtd-realizada')).toHaveTextContent('Não disponível')
    expect(screen.getByTestId('op-qtd-pendente')).toHaveTextContent('Não disponível')
    expect(screen.getByTestId('op-lote')).toHaveTextContent('Não disponível')
    expect(screen.getByTestId('op-corrida')).toHaveTextContent('Não disponível')
  })

  it('4. Fechar o detalhe da OP retorna ao modal do card preservando os filtros', () => {
    const onCloseModalPai = vi.fn()
    render(
      <DetalheCardSDCModal
        isOpen={true}
        onClose={onCloseModalPai}
        tipoCard="EM_PRODUCAO"
        itens={[itemComOpMock]}
        kpis={kpisMock}
        dataAtualizacao="2026-09-01T12:00:00.000Z"
      />,
    )

    // Clica no botão Detalhe OP para abrir o modal filho
    fireEvent.click(screen.getByTestId('btn-detalhe-op-C1250A360600'))
    expect(screen.getByTestId('modal-detalhe-ordem-producao')).toBeInTheDocument()

    // Fecha o modal da OP
    const btnFecharOp = screen.getByText('Fechar Detalhe da OP')
    fireEvent.click(btnFecharOp)

    // Modal filho fecha, modal pai continua aberto (onCloseModalPai não foi chamado)
    expect(onCloseModalPai).not.toHaveBeenCalled()
  })
})
