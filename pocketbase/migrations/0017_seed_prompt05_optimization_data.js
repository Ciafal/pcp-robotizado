migrate(
  (app) => {
    const scenCol = app.findCollectionByNameOrId('optimization_scenarios')
    const runsCol = app.findCollectionByNameOrId('optimization_runs')
    const scenItemsCol = app.findCollectionByNameOrId('scenario_items')

    // 1. Seed Scenarios (Baseline, Cenário A, Cenário B, Cenário C, Cenário D)
    const initialScenarios = [
      {
        code: 'SCN-BASE-001',
        name: 'Plano Base Oficial (Baseline SAP ECC)',
        type: 'BASELINE',
        profile: 'BALANCEADO',
        horizon: 'SEMANAL',
        status: 'COMPLETED',
        is_baseline: true,
        assumptions: 'Sequenciamento nominal importado do SAP ECC. Sem rebalanceamento fino.',
        target_lines: ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR'],
        target_products: ['TUBO_5580', 'PERFIL_U', 'CANTONEIRA_STD', 'BARRA_CHATA'],
        objectives_weights: {
          MAXIMIZE_DEMAND_SERVICE: 30,
          MINIMIZE_SETUP: 20,
          MINIMIZE_DELAY: 20,
          MINIMIZE_INTERMEDIATE_STOCK: 15,
          MAXIMIZE_CAPACITY_UTILIZATION: 10,
          BALANCE_LINES: 5,
        },
        solver_timeout_seconds: 30,
        summary_kpis: {
          demandServicePct: 88.5,
          adherencePct: 84.0,
          totalPlannedTons: 4200,
          unallocatedCount: 3,
          unallocatedTons: 250,
          setupCount: 14,
          setupTimeMinutes: 420,
          intermediateStockTons: 680,
          avgUtilizationPct: 86.4,
          bottlenecksCount: 2,
          criticalBottlenecks: ['ACAB_L1'],
          lostCapacityTons: 540,
        },
      },
      {
        code: 'SCN-OPT-A01',
        name: 'Cenário A — Foco em Atendimento da Carteira (Service Level)',
        type: 'SCENARIO_A',
        profile: 'ATENDIMENTO',
        horizon: 'SEMANAL',
        status: 'COMPLETED',
        is_baseline: false,
        assumptions:
          'Priorização máxima do atendimento aos prazos comerciais e minimização de atrasos.',
        target_lines: ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR'],
        target_products: ['TUBO_5580', 'PERFIL_U', 'CANTONEIRA_STD', 'BARRA_CHATA'],
        objectives_weights: {
          MAXIMIZE_DEMAND_SERVICE: 45,
          MINIMIZE_DELAY: 30,
          MINIMIZE_SETUP: 10,
          MAXIMIZE_CAPACITY_UTILIZATION: 10,
          MINIMIZE_INTERMEDIATE_STOCK: 5,
        },
        solver_timeout_seconds: 30,
        summary_kpis: {
          demandServicePct: 98.2,
          adherencePct: 96.5,
          totalPlannedTons: 4650,
          unallocatedCount: 0,
          unallocatedTons: 0,
          setupCount: 12,
          setupTimeMinutes: 360,
          intermediateStockTons: 520,
          avgUtilizationPct: 91.2,
          bottlenecksCount: 1,
          criticalBottlenecks: ['ACAB_L1'],
          lostCapacityTons: 380,
        },
      },
      {
        code: 'SCN-OPT-B02',
        name: 'Cenário B — Foco em Produtividade Fabril (Minimização de Setup)',
        type: 'SCENARIO_B',
        profile: 'PRODUTIVIDADE',
        horizon: 'SEMANAL',
        status: 'COMPLETED',
        is_baseline: false,
        assumptions:
          'Agrupamento em grandes campanhas para reduzir paradas de setup e maximizar cadência (t/h).',
        target_lines: ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR'],
        target_products: ['TUBO_5580', 'PERFIL_U', 'CANTONEIRA_STD', 'BARRA_CHATA'],
        objectives_weights: {
          MINIMIZE_SETUP: 40,
          MAXIMIZE_CAPACITY_UTILIZATION: 25,
          MAXIMIZE_DEMAND_SERVICE: 20,
          MINIMIZE_DELAY: 10,
          MINIMIZE_INTERMEDIATE_STOCK: 5,
        },
        solver_timeout_seconds: 30,
        summary_kpis: {
          demandServicePct: 94.0,
          adherencePct: 92.0,
          totalPlannedTons: 4910,
          unallocatedCount: 1,
          unallocatedTons: 45,
          setupCount: 6,
          setupTimeMinutes: 180,
          intermediateStockTons: 710,
          avgUtilizationPct: 94.8,
          bottlenecksCount: 2,
          criticalBottlenecks: ['L1', 'ACAB_L1'],
          lostCapacityTons: 220,
        },
      },
      {
        code: 'SCN-OPT-C03',
        name: 'Cenário C — Foco em Minimização de Estoque e Buffers',
        type: 'SCENARIO_C',
        profile: 'ESTOQUE',
        horizon: 'SEMANAL',
        status: 'COMPLETED',
        is_baseline: false,
        assumptions:
          'Produção puxada (JIT) para evitar saturação dos pulmões intermediários e reduzir capital de giro.',
        target_lines: ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR'],
        target_products: ['TUBO_5580', 'PERFIL_U', 'CANTONEIRA_STD', 'BARRA_CHATA'],
        objectives_weights: {
          MINIMIZE_INTERMEDIATE_STOCK: 40,
          MINIMIZE_DELAY: 25,
          MAXIMIZE_DEMAND_SERVICE: 20,
          MINIMIZE_SETUP: 10,
          BALANCE_LINES: 5,
        },
        solver_timeout_seconds: 30,
        summary_kpis: {
          demandServicePct: 91.5,
          adherencePct: 89.0,
          totalPlannedTons: 4100,
          unallocatedCount: 2,
          unallocatedTons: 110,
          setupCount: 16,
          setupTimeMinutes: 480,
          intermediateStockTons: 310,
          avgUtilizationPct: 82.0,
          bottlenecksCount: 0,
          criticalBottlenecks: [],
          lostCapacityTons: 410,
        },
      },
    ]

    for (const sc of initialScenarios) {
      try {
        app.findFirstRecordByData('optimization_scenarios', 'code', sc.code)
      } catch (_) {
        const rec = new Record(scenCol)
        rec.set('code', sc.code)
        rec.set('name', sc.name)
        rec.set('type', sc.type)
        rec.set('profile', sc.profile)
        rec.set('horizon', sc.horizon)
        rec.set('status', sc.status)
        rec.set('is_baseline', sc.is_baseline)
        rec.set('assumptions', sc.assumptions)
        rec.set('target_lines', sc.target_lines)
        rec.set('target_products', sc.target_products)
        rec.set('objectives_weights', sc.objectives_weights)
        rec.set('solver_timeout_seconds', sc.solver_timeout_seconds)
        rec.set('summary_kpis', sc.summary_kpis)
        rec.set('responsible_name', 'Carlos Silva (PCP)')
        app.save(rec)

        // Criar Run associado
        const runRec = new Record(runsCol)
        runRec.set('scenario_id', rec.id)
        runRec.set('engine_name', 'CpSatOptimizationEngine')
        runRec.set('engine_version', 'OR-Tools v9.8 (CP-SAT Model)')
        runRec.set('status', 'COMPLETED')
        runRec.set('solver_solution_status', 'OPTIMAL')
        runRec.set('execution_time_ms', 1420)
        runRec.set(
          'objective_value',
          sc.type === 'SCENARIO_A' ? 942.5 : sc.type === 'SCENARIO_B' ? 978.0 : 890.0,
        )
        runRec.set('variables_count', 342)
        runRec.set('constraints_count', 860)
        runRec.set('gap_pct', 0.0)
        runRec.set('executed_by_name', 'Carlos Silva')
        runRec.set('metrics_result', sc.summary_kpis)
        runRec.set('bottlenecks_result', [
          {
            line_code: 'ACAB_L1',
            line_name: 'Acabamento L1',
            programmable_capacity: 1800,
            planned_load: 1980,
            utilization_pct: 110.0,
            risk_level: 'CRITICAL',
            buffer_status: 'SATURATION_RISK',
          },
          {
            line_code: 'L1',
            line_name: 'Laminação L1',
            programmable_capacity: 2200,
            planned_load: 2150,
            utilization_pct: 97.7,
            risk_level: 'HIGH',
            buffer_status: 'BALANCED',
          },
        ])
        app.save(runRec)

        rec.set('latest_run_id', runRec.id)
        app.save(rec)
      }
    }
  },
  (app) => {
    // Reversão limpa
  },
)
