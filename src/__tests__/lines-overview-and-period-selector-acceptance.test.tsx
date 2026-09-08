import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WeekPeriodSelector } from '@/components/weekly-schedule/WeekPeriodSelector'
import { CentralSequenciamentoLandingPage } from '@/pages/CentralSequenciamentoLandingPage'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import pb from '@/lib/pocketbase/client'
import { isWeekInPast, getCurrentPlantIsoWeek } from '@/lib/temporal-utils'

// Mock do PocketBase para simular retorno de produção, fichas mestre e integrações
vi.mock('@/lib/pocketbase/client', () => {
  return {
    pb: {
      collection: vi.fn((colName: string) => {
        if (colName === 'production_lines') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'line-l1',
                code: 'L1',
                name: 'Linha de Laminação L1',
                status: 'running',
                plant_id: 'ljskt6q68ojeef3',
                sap_work_center: 'WC-DIV-L1',
                nominal_capacity: 120,
                efficiency: 98,
              },
              {
                id: 'line-l2',
                code: 'L2',
                name: 'Linha de Laminação L2',
                status: 'idle',
                plant_id: '3f1tzvdzkhnopny',
                sap_work_center: 'WC-CTG-L2',
                nominal_capacity: 150,
                efficiency: 85,
              },
              {
                id: 'line-enf',
                code: 'ENF_L1',
                name: 'Enfornamento L1',
                status: 'running',
                plant_id: 'ljskt6q68ojeef3',
                sap_work_center: 'WC-DIV-ENF_L1',
                nominal_capacity: 120,
                efficiency: 96,
              },
              {
                id: 'line-endir',
                code: 'ENDIR',
                name: 'Endireitadeira',
                status: 'maintenance',
                plant_id: '3f1tzvdzkhnopny',
                sap_work_center: 'WC-CTG-ENDIR',
                nominal_capacity: 150,
                efficiency: 72,
              },
            ]),
          }
        }
        if (colName === 'line_masters') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'master-l1',
                line_id: 'line-l1',
                code: 'L1',
                version: 1,
                nominal_monthly_capacity: 6500,
                capacity_unit: 't',
                status: 'ACTIVE',
              },
              {
                id: 'master-l2',
                line_id: 'line-l2',
                code: 'L2',
                version: 1,
                nominal_monthly_capacity: 9000,
                capacity_unit: 't',
                status: 'ACTIVE',
              },
              {
                id: 'master-enf',
                line_id: 'line-enf',
                code: 'ENF_L1',
                version: 1,
                nominal_monthly_capacity: 4500,
                capacity_unit: 't',
                status: 'ACTIVE',
              },
            ]),
          }
        }
        if (colName === 'weekly_schedules') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'ws-1',
                line_code: 'L1',
                planned_quantity_tons: 120,
                realized_quantity_tons: 118,
                setup_duration_minutes: 50,
                stop_duration_minutes: 60,
                status: 'DRAFT',
              },
              {
                id: 'ws-2',
                line_code: 'L1',
                planned_quantity_tons: 70,
                realized_quantity_tons: 68,
                setup_duration_minutes: 40,
                stop_duration_minutes: 0,
                status: 'DRAFT',
              },
            ]),
          }
        }
        if (colName === 'sap_integration_catalog') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'sap-1',
                code: 'SAP_BAPI_PROD_RATES',
                description: 'BAPI de Produtividade',
                active: true,
                last_status: 'CONECTADO',
              },
            ]),
          }
        }
        return {
          getFullList: vi.fn().mockResolvedValue([]),
        }
      }),
    },
  }
})

describe('FRENTE 1 & FRENTE 2 — Testes de Aceite Módulo PCP Robotizado CIAFAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FRENTE 1 — WeekPeriodSelector: visual institucional e funcionalidade temporal', () => {
    it('deve aplicar visual padrão institucional CIAFAL e exibir o botão com badge discreta', () => {
      const onSelectWeek = vi.fn()
      const plantIso = getCurrentPlantIsoWeek()

      const { container } = render(
        <WeekPeriodSelector
          currentYear={plantIso.year}
          currentWeekNumber={plantIso.week}
          onSelectWeek={onSelectWeek}
        />,
      )

      // Botão seletor principal
      const triggerBtn = screen.getByRole('button', { name: /período/i })
      expect(triggerBtn).toBeDefined()

      // Verificar classes institucionais: fundo claro, texto e bordas suaves, sem bg-amber gritante
      expect(triggerBtn.className).toContain('border')
      expect(triggerBtn.textContent).toContain(
        `S${String(plantIso.week).padStart(2, '0')}/${plantIso.year}`,
      )

      // Para semana atual, deve exibir badge 'Semana Atual' com verde suave institucional
      expect(screen.getByText('Semana Atual')).toBeDefined()
    })

    it('deve exibir badge neutra "Somente Leitura" para semana passada preservando temporal-utils', () => {
      const onSelectWeek = vi.fn()
      // Ano e semana histórica garantida no passado
      const pastYear = 2024
      const pastWeek = 10

      expect(isWeekInPast(pastYear, pastWeek)).toBe(true)

      render(
        <WeekPeriodSelector
          currentYear={pastYear}
          currentWeekNumber={pastWeek}
          onSelectWeek={onSelectWeek}
        />,
      )

      expect(screen.getByText('Somente Leitura')).toBeDefined()
    })

    it('deve permitir abrir o popover e selecionar semanas futuras mantendo callback onSelectWeek', async () => {
      const onSelectWeek = vi.fn()
      const plantIso = getCurrentPlantIsoWeek()

      render(
        <WeekPeriodSelector
          currentYear={plantIso.year}
          currentWeekNumber={plantIso.week}
          onSelectWeek={onSelectWeek}
        />,
      )

      const triggerBtn = screen.getByRole('button', { name: /período/i })
      fireEvent.click(triggerBtn)

      // Popover aberto: título institucional do seletor
      await waitFor(() => {
        expect(screen.getByText('Seletor de Período & Semana')).toBeDefined()
      })

      // Atalho para semana atual deve estar visível
      expect(screen.getByText(new RegExp(`Ir para Semana Atual`, 'i'))).toBeDefined()
    })
  })

  describe('FRENTE 2 — Visão Geral das Linhas: Painel Executivo por Linha', () => {
    it('deve renderizar o cabeçalho "Visão Geral das Linhas" e filtros globais', async () => {
      render(
        <MemoryRouter>
          <ControlTowerProvider>
            <CentralSequenciamentoLandingPage />
          </ControlTowerProvider>
        </MemoryRouter>,
      )

      // Título do painel executivo
      expect(screen.getByRole('heading', { name: /Visão Geral das Linhas/i })).toBeDefined()
      expect(screen.getByText(/Painel consolidado do PCP por linha de produção/i)).toBeDefined()

      // Filtros presentes
      expect(screen.getByText('Empresa:')).toBeDefined()
      expect(screen.getByText('Planta:')).toBeDefined()
      expect(screen.getByText('Mês / Período:')).toBeDefined()
      expect(screen.getByText('Linha:')).toBeDefined()
      expect(screen.getByText('Status Operacional:')).toBeDefined()
    })

    it('deve renderizar cards por linha com os 9 indicadores e placeholders oficiais de indisponibilidade', async () => {
      render(
        <MemoryRouter>
          <ControlTowerProvider>
            <CentralSequenciamentoLandingPage />
          </ControlTowerProvider>
        </MemoryRouter>,
      )

      // Aguarda o carregamento dos cards de linhas mockadas
      await waitFor(() => {
        expect(screen.getByText('Linha de Laminação L1')).toBeDefined()
      })

      // Validar os 9 indicadores no card da linha L1:
      // 1. Capacidade Mensal (6.500 t da Ficha Mestre L1)
      expect(screen.getAllByText(/1\. Capacidade Mensal/i).length).toBeGreaterThan(0)
      expect(screen.getByText('6.500 t')).toBeDefined()

      // 2. Utilização da Capacidade
      expect(screen.getAllByText(/2\. Utilização/i).length).toBeGreaterThan(0)

      // 3. OEE Atual
      expect(screen.getAllByText(/3\. OEE Atual/i).length).toBeGreaterThan(0)

      // 4. Tempo Total de Setup
      expect(screen.getAllByText(/4\. Tempo Total Setup/i).length).toBeGreaterThan(0)

      // 5. Tempo Total de Parada Programada
      expect(screen.getAllByText(/5\. Parada Programada/i).length).toBeGreaterThan(0)

      // 7. Produção Total Realizada
      expect(screen.getAllByText(/7\. Produção Realizada/i).length).toBeGreaterThan(0)

      // 8. Retrabalho / Refugo: placeholder oficial quando indisponível
      expect(screen.getAllByText(/8\. Retrabalho \/ Refugo:/i).length).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/Dado indisponível — aguardando integração/i).length,
      ).toBeGreaterThan(0)

      // 9. Índice de Assertividade
      expect(screen.getAllByText(/9\. Assertividade/i).length).toBeGreaterThan(0)

      // 10. Tempo Total de Parada Corretiva: placeholder oficial quando indisponível
      expect(screen.getAllByText(/10\. Parada Corretiva:/i).length).toBeGreaterThan(0)
    })

    it('deve filtrar os cards ao alterar o filtro de planta ou status operacional', async () => {
      render(
        <MemoryRouter>
          <ControlTowerProvider>
            <CentralSequenciamentoLandingPage />
          </ControlTowerProvider>
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText('Linha de Laminação L1')).toBeDefined()
      })

      // Filtrar por planta CTG (Contagem): L1 (Divinópolis) não deve ser exibida
      const selects = screen.getAllByRole('combobox')
      const plantaSelect = selects[1] // Segundo select é Planta

      fireEvent.change(plantaSelect, { target: { value: 'CTG' } })

      await waitFor(() => {
        expect(screen.queryByText('Linha de Laminação L1')).toBeNull()
        expect(screen.getByText('Linha de Laminação L2')).toBeDefined()
      })
    })

    it('deve conter as ações rápidas "Montagem Semanal", "Ficha Mestre" e "Abrir Gestão"', async () => {
      render(
        <MemoryRouter>
          <ControlTowerProvider>
            <CentralSequenciamentoLandingPage />
          </ControlTowerProvider>
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText('Linha de Laminação L1')).toBeDefined()
      })

      // Links de navegação existentes preservados
      const montagemLinks = screen.getAllByRole('link', { name: /Montagem Semanal/i })
      expect(montagemLinks.length).toBeGreaterThan(0)

      const fichaMestreLinks = screen.getAllByRole('link', { name: /Ficha Mestre/i })
      expect(fichaMestreLinks.length).toBeGreaterThan(0)

      const abrirGestaoLinks = screen.getAllByRole('link', { name: /Abrir Gestão/i })
      expect(abrirGestaoLinks.length).toBeGreaterThan(0)
    })
  })
})
