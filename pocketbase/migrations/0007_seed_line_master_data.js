migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const famCol = app.findCollectionByNameOrId('product_families')
    const masterCol = app.findCollectionByNameOrId('line_masters')
    const shiftCol = app.findCollectionByNameOrId('production_shifts')
    const calCol = app.findCollectionByNameOrId('production_calendars')
    const stopCol = app.findCollectionByNameOrId('standard_scheduled_stops')
    const setupCol = app.findCollectionByNameOrId('line_setups')
    const capCol = app.findCollectionByNameOrId('line_capabilities')
    const scCol = app.findCollectionByNameOrId('line_structural_constraints')

    // Obter usuários chave
    let adminUser = null
    let gestorL1 = null
    let gestorL2 = null
    try {
      adminUser = app.findAuthRecordByEmail('users', 'ciafal@ciafal.com.br')
    } catch (_) {}
    try {
      gestorL1 = app.findAuthRecordByEmail('users', 'gestor.l1@ciafal.com.br')
    } catch (_) {}
    try {
      gestorL2 = app.findAuthRecordByEmail('users', 'gestor.l2@ciafal.com.br')
    } catch (_) {}

    // 1. Cadastrar Famílias Produtivas
    const familiesData = [
      {
        code: 'TUB_QUAD',
        name: 'Tubos Quadrados Estruturais',
        description: 'Perfis tubulares quadrados de 20x20 a 100x100mm',
        category: 'Tubos',
      },
      {
        code: 'TUB_RET',
        name: 'Tubos Retangulares',
        description: 'Perfis tubulares retangulares industriais',
        category: 'Tubos',
      },
      {
        code: 'TUB_RED',
        name: 'Tubos Redondos / Conduítes',
        description: 'Tubulações cilíndricas conforme NBR',
        category: 'Tubos',
      },
      {
        code: 'PERF_U',
        name: 'Perfis U Dobrados',
        description: 'Perfis conformados a frio',
        category: 'Perfis',
      },
      {
        code: 'BAR_CHATA',
        name: 'Barras Chatas Laminadas',
        description: 'Barras de alta precisão',
        category: 'Barras',
      },
    ]

    const savedFamilies = {}
    for (const f of familiesData) {
      try {
        const rec = app.findFirstRecordByData('product_families', 'code', f.code)
        savedFamilies[f.code] = rec
      } catch (_) {
        const rec = new Record(famCol)
        rec.set('code', f.code)
        rec.set('name', f.name)
        rec.set('description', f.description)
        rec.set('category', f.category)
        rec.set('active', true)
        app.save(rec)
        savedFamilies[f.code] = rec
      }
    }

    // 2. Criar Ficha Mestre e dados estruturais para as 6 linhas
    const allLines = app.findRecordsByFilter('production_lines', '', 'code', 50, 0)
    const lineMap = {}
    for (const l of allLines) {
      lineMap[l.getString('code')] = l
    }

    // Definições estruturais de cada linha
    const masterConfigs = [
      {
        code: 'L1',
        name: 'Linha de Laminação / Tubos L1',
        resource_type: 'PRODUCTION_LINE',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Conformação & Laminação',
        process_step: 'Conformação Contínua',
        primary_responsible: gestorL1?.id || adminUser?.id,
        substitute_responsible: gestorL2?.id,
        capacity_unit: 't/h',
        nominal_hourly_capacity: 12.5,
        nominal_shift_capacity: 90.0,
        nominal_daily_capacity: 270.0,
        nominal_monthly_capacity: 6500.0,
        planned_efficiency_pct: 92.0,
        max_recommended_utilization_pct: 88.0,
        min_batch_size: 15.0,
        max_batch_size: 120.0,
        capacity_notes:
          'Capacidade nominal estrutural dimensionada para aços carbono 1010/1020 standard.',
        input_buffer_type: 'Pátio de Bobinas Laminadas',
        input_buffer_capacity: 500,
        input_buffer_unit: 't',
        output_buffer_type: 'Pulmão Intermediário L1 -> Enfornamento',
        output_buffer_capacity: 180,
        output_buffer_unit: 't',
        completeness_score: 95,
        ready_for_scheduling: true,
        missing_requirements: [],
        shifts: [
          {
            name: '1º Turno Matutino',
            code: 'T1_L1',
            start: '06:00',
            end: '14:20',
            dur: 8.33,
            brk: 40,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
            midnight: false,
          },
          {
            name: '2º Turno Vespertino',
            code: 'T2_L1',
            start: '14:20',
            end: '22:40',
            dur: 8.33,
            brk: 40,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
            midnight: false,
          },
          {
            name: '3º Turno Noturno',
            code: 'T3_L1',
            start: '22:40',
            end: '06:00',
            dur: 7.33,
            brk: 40,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: true,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 26,
          work_saturdays: true,
          work_sundays: false,
          work_holidays: false,
        },
        scheduled_stops: [
          {
            code: 'MANUT_PREV_L1',
            description: 'Manutenção Preventiva Semanal e Troca de Rolos',
            category: 'PREVENTIVE_MAINTENANCE',
            recurrence: 'WEEKLY',
            duration: 180,
            time: '06:00',
            shift: 'T1_L1',
            days: ['SAB'],
            impact: 'Parada total da linha para inspeção de guias e alinhamento mecânico.',
          },
          {
            code: 'LIMP_L1',
            description: 'Limpeza Operacional de Raspadores e Calhas',
            category: 'CLEANING',
            recurrence: 'DAILY',
            duration: 30,
            time: '14:00',
            shift: 'T1_L1',
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            impact: 'Desobstrução e lavagem das calhas de descarte.',
          },
        ],
        setups: [
          {
            code: 'STP_L1_DIM',
            description: 'Troca de Matriz Dimensional (20x20 para 50x50)',
            category: 'DIMENSION_CHANGE',
            duration: 45,
            resource: 'Mancais de Conformação',
            setup_type: 'COMBINED',
            from_family: 'TUB_QUAD',
            to_family: 'TUB_QUAD',
            notes: 'Substituição do ferramental com alinhamento a laser.',
          },
          {
            code: 'STP_L1_FAM',
            description: 'Transição Família Tubo Quadrado -> Tubo Retangular',
            category: 'TOOL_CHANGE',
            duration: 90,
            resource: 'Cabeçotes de Solda e Roletes',
            setup_type: 'INTERNAL',
            from_family: 'TUB_QUAD',
            to_family: 'TUB_RET',
            notes: 'Ajuste completo do trem de laminação e soldagem HF.',
          },
        ],
        capabilities: [
          {
            family: 'TUB_QUAD',
            p_type: 'Tubo Quadrado',
            section: 'Quadrada',
            status: 'ALLOWED',
            min_d: 20,
            max_d: 100,
            min_t: 1.2,
            max_t: 6.35,
            min_l: 3000,
            max_l: 12000,
            min_w: 5,
            max_w: 80,
            spec_cap: 12.5,
            spec_unit: 't/h',
            notes: 'Processamento padrão homologado.',
          },
          {
            family: 'TUB_RET',
            p_type: 'Tubo Retangular',
            section: 'Retangular',
            status: 'ALLOWED',
            min_d: 30,
            max_d: 120,
            min_t: 1.5,
            max_t: 6.35,
            min_l: 3000,
            max_l: 12000,
            min_w: 8,
            max_w: 100,
            spec_cap: 11.0,
            spec_unit: 't/h',
            notes: 'Requer ajuste na velocidade da serra voadora.',
          },
          {
            family: 'TUB_RED',
            p_type: 'Tubo Redondo',
            section: 'Cilíndrica',
            status: 'RESTRICTED',
            min_d: 19,
            max_d: 76,
            min_t: 1.2,
            max_t: 4.75,
            min_l: 3000,
            max_l: 6000,
            min_w: 3,
            max_w: 50,
            spec_cap: 9.5,
            spec_unit: 't/h',
            notes: 'Restrição em bitolas superiores a 3 polegadas.',
          },
        ],
        constraints: [
          {
            code: 'REST_DIM_ESP',
            title: 'Espessura Máxima de Parede',
            classification: 'DIMENSIONAL_LIMIT',
            param: 'Espessura Máxima',
            unit: 'mm',
            min_v: 1.2,
            max_v: 6.35,
            desc: 'A linha física L1 não traciona e conforma fitas de aço com espessura superior a 6,35mm.',
            impact: 'Risco de sobrecarga no motor redutor e quebra dos roletes.',
          },
          {
            code: 'REST_PESO_BOB',
            title: 'Carga Máxima de Entrada do Desbobinador',
            classification: 'PHYSICAL_LIMIT',
            param: 'Capacidade Ponte Rolante / Desbobinador',
            unit: 't',
            min_v: 2.0,
            max_v: 15.0,
            desc: 'O mandril do desbobinador suporta bobinas de até 15 toneladas.',
            impact: 'Dano estrutural ao eixo principal do desbobinador.',
          },
        ],
      },
      {
        code: 'ENF_L1',
        name: 'Forno Contínuo de Enfornamento L1',
        resource_type: 'FURNACE',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Tratamento Térmico',
        process_step: 'Normalização / Alívio de Tensões',
        primary_responsible: gestorL1?.id || adminUser?.id,
        capacity_unit: 't/h',
        nominal_hourly_capacity: 8.0,
        nominal_shift_capacity: 60.0,
        nominal_daily_capacity: 180.0,
        nominal_monthly_capacity: 4500.0,
        planned_efficiency_pct: 95.0,
        max_recommended_utilization_pct: 90.0,
        min_batch_size: 10.0,
        max_batch_size: 80.0,
        capacity_notes:
          'Capacidade térmica nominal condicionada ao perfil de curva de aquecimento.',
        input_buffer_type: 'Mesa de Carga do Forno',
        input_buffer_capacity: 120,
        input_buffer_unit: 't',
        output_buffer_type: 'Mesa de Resfriamento Lenta',
        output_buffer_capacity: 90,
        output_buffer_unit: 't',
        completeness_score: 92,
        ready_for_scheduling: true,
        missing_requirements: [],
        shifts: [
          {
            name: 'Turno Contínuo 24/7 A',
            code: 'T1_ENF',
            start: '06:00',
            end: '14:00',
            dur: 8.0,
            brk: 30,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
            midnight: false,
          },
          {
            name: 'Turno Contínuo 24/7 B',
            code: 'T2_ENF',
            start: '14:00',
            end: '22:00',
            dur: 8.0,
            brk: 30,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
            midnight: false,
          },
          {
            name: 'Turno Contínuo 24/7 C',
            code: 'T3_ENF',
            start: '22:00',
            end: '06:00',
            dur: 8.0,
            brk: 30,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
            midnight: true,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 30,
          work_saturdays: true,
          work_sundays: true,
          work_holidays: true,
        },
        scheduled_stops: [
          {
            code: 'CALIB_FORNO',
            description: 'Calibração Semanal de Termopares e Queimadores',
            category: 'CALIBRATION',
            recurrence: 'WEEKLY',
            duration: 120,
            time: '05:00',
            shift: 'T1_ENF',
            days: ['DOM'],
            impact: 'Aferição de atmosfera protetora e pirometria.',
          },
        ],
        setups: [
          {
            code: 'STP_ENF_TEMP',
            description: 'Ajuste de Rampa Térmica (Normalização para Alívio)',
            category: 'HEATING_CYCLE',
            duration: 60,
            resource: 'Zona de Queima',
            setup_type: 'INTERNAL',
            from_family: 'TUB_QUAD',
            to_family: 'TUB_RET',
            notes: 'Tempo de estabilização térmica da câmara.',
          },
        ],
        capabilities: [
          {
            family: 'TUB_QUAD',
            p_type: 'Tubo Quadrado Tratado',
            section: 'Quadrada',
            status: 'ALLOWED',
            min_d: 20,
            max_d: 100,
            min_t: 1.5,
            max_t: 6.35,
            min_l: 3000,
            max_l: 9000,
            min_w: 10,
            max_w: 80,
            spec_cap: 8.0,
            spec_unit: 't/h',
            notes: 'Comprimento máximo limitado pela câmara de 9m.',
          },
        ],
        constraints: [
          {
            code: 'REST_TEMP_MAX',
            title: 'Limite Físico Térmico Refratário',
            classification: 'PHYSICAL_LIMIT',
            param: 'Temperatura Máxima Câmara',
            unit: '°C',
            min_v: 600,
            max_v: 950,
            desc: 'A integridade do refratário suporta no máximo 950°C contínuos.',
            impact: 'Degradação térmica do isolamento cerâmico.',
          },
        ],
      },
      {
        code: 'L2',
        name: 'Linha de Laminação Pesada L2',
        resource_type: 'PRODUCTION_LINE',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Conformação Pesada',
        process_step: 'Conformação e Solda Alta Resistência',
        primary_responsible: gestorL2?.id || adminUser?.id,
        capacity_unit: 't/h',
        nominal_hourly_capacity: 18.0,
        nominal_shift_capacity: 130.0,
        nominal_daily_capacity: 390.0,
        nominal_monthly_capacity: 9000.0,
        planned_efficiency_pct: 88.0,
        max_recommended_utilization_pct: 85.0,
        min_batch_size: 25.0,
        max_batch_size: 200.0,
        capacity_notes:
          'Linha de alta tonelagem para perfis industriais pesados e tubulações de grande porte.',
        input_buffer_type: 'Pátio Principal de Matéria-Prima',
        input_buffer_capacity: 800,
        input_buffer_unit: 't',
        output_buffer_type: 'Baia de Transferência L2 -> Acabamento',
        output_buffer_capacity: 250,
        output_buffer_unit: 't',
        completeness_score: 90,
        ready_for_scheduling: true,
        missing_requirements: [],
        shifts: [
          {
            name: '1º Turno Matutino L2',
            code: 'T1_L2',
            start: '06:00',
            end: '14:20',
            dur: 8.33,
            brk: 40,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: false,
          },
          {
            name: '2º Turno Vespertino L2',
            code: 'T2_L2',
            start: '14:20',
            end: '22:40',
            dur: 8.33,
            brk: 40,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: false,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 22,
          work_saturdays: false,
          work_sundays: false,
          work_holidays: false,
        },
        scheduled_stops: [
          {
            code: 'PREV_L2_QUINZ',
            description: 'Inspeção Hidráulica e Elétrica Quinzena',
            category: 'PREVENTIVE_MAINTENANCE',
            recurrence: 'BIWEEKLY',
            duration: 240,
            time: '07:00',
            shift: 'T1_L2',
            days: ['SAB'],
            impact: 'Troca preventiva de fluidos e aperto de carcaças.',
          },
        ],
        setups: [
          {
            code: 'STP_L2_PESADO',
            description: 'Ajuste de Trem Laminador Pesado',
            category: 'TOOL_CHANGE',
            duration: 120,
            resource: 'Mancais L2',
            setup_type: 'INTERNAL',
            from_family: 'PERF_U',
            to_family: 'TUB_QUAD',
            notes: 'Guindaste e equipe mecânica dedicados.',
          },
        ],
        capabilities: [
          {
            family: 'PERF_U',
            p_type: 'Perfil U Industrial',
            section: 'Perfil U',
            status: 'ALLOWED',
            min_d: 50,
            max_d: 200,
            min_t: 2.0,
            max_t: 9.5,
            min_l: 4000,
            max_l: 14000,
            min_w: 15,
            max_w: 250,
            spec_cap: 18.0,
            spec_unit: 't/h',
            notes: 'Perfis estruturais pesados.',
          },
          {
            family: 'TUB_QUAD',
            p_type: 'Tubo Estrutural Pesado',
            section: 'Quadrada',
            status: 'ALLOWED',
            min_d: 80,
            max_d: 200,
            min_t: 3.0,
            max_t: 12.7,
            min_l: 4000,
            max_l: 14000,
            min_w: 20,
            max_w: 300,
            spec_cap: 17.5,
            spec_unit: 't/h',
            notes: 'Aço alta resistência.',
          },
        ],
        constraints: [
          {
            code: 'REST_L2_PESO_MIN',
            title: 'Espessura Mínima Operacional',
            classification: 'OPERATIONAL_LIMIT',
            param: 'Espessura Mínima',
            unit: 'mm',
            min_v: 2.0,
            max_v: 12.7,
            desc: 'A linha pesada L2 não processa chapas finas (< 2.0mm) por risco de deformação no trem de tração.',
            impact: 'Perda imediata de conformidade geométrica.',
          },
        ],
      },
      {
        code: 'ACAB_L2',
        name: 'Célula de Acabamento e Embalagem L2',
        resource_type: 'FINISHING',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Acabamento & Expedição',
        process_step: 'Corte, Rebarbação e Cintamento',
        primary_responsible: gestorL2?.id || adminUser?.id,
        capacity_unit: 'peça',
        nominal_hourly_capacity: 150.0,
        nominal_shift_capacity: 1100.0,
        nominal_daily_capacity: 2200.0,
        nominal_monthly_capacity: 48000.0,
        planned_efficiency_pct: 94.0,
        max_recommended_utilization_pct: 88.0,
        min_batch_size: 50.0,
        max_batch_size: 1000.0,
        capacity_notes: 'Capacidade nominal medida em peças acabadas e cintadas por hora.',
        input_buffer_type: 'Mesa Receptora L2',
        input_buffer_capacity: 200,
        input_buffer_unit: 'peça',
        output_buffer_type: 'Armazém de Produto Acabado',
        output_buffer_capacity: 2000,
        output_buffer_unit: 'peça',
        completeness_score: 88,
        ready_for_scheduling: true,
        missing_requirements: [],
        shifts: [
          {
            name: 'Turno Normal Matutino',
            code: 'T1_ACAB',
            start: '07:00',
            end: '16:48',
            dur: 8.8,
            brk: 60,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: false,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 22,
          work_saturdays: false,
          work_sundays: false,
          work_holidays: false,
        },
        scheduled_stops: [
          {
            code: 'LIMP_SERRA',
            description: 'Troca e Afiação de Disco de Serra',
            category: 'TOOL_CHANGE',
            recurrence: 'PER_BATCH',
            duration: 25,
            time: '12:00',
            shift: 'T1_ACAB',
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            impact: 'Parada momentânea do cabeçote de corte.',
          },
        ],
        setups: [
          {
            code: 'STP_CINTA',
            description: 'Configuração do Cabeçote de Cintamento Automático',
            category: 'DIMENSION_CHANGE',
            duration: 15,
            resource: 'Enfardadeira',
            setup_type: 'EXTERNAL',
            from_family: 'PERF_U',
            to_family: 'TUB_QUAD',
            notes: 'Ajuste de largura de amarração de feixes.',
          },
        ],
        capabilities: [
          {
            family: 'PERF_U',
            p_type: 'Feixe de Perfis U',
            section: 'Feixe',
            status: 'ALLOWED',
            min_d: 50,
            max_d: 200,
            min_t: 2.0,
            max_t: 9.5,
            min_l: 2000,
            max_l: 12000,
            min_w: 100,
            max_w: 2000,
            spec_cap: 140.0,
            spec_unit: 'peça',
            notes: 'Embalagem plástica e fitas de aço.',
          },
        ],
        constraints: [
          {
            code: 'REST_COMP_CORTE',
            title: 'Comprimento Máximo de Corte de Linha',
            classification: 'DIMENSIONAL_LIMIT',
            param: 'Comprimento Útil da Mesa',
            unit: 'mm',
            min_v: 1000,
            max_v: 12000,
            desc: 'A mesa de rolos receptora do acabamento acomoda feixes de até 12 metros.',
            impact: 'Necessidade de corte manual externo se exceder 12m.',
          },
        ],
      },
      {
        code: 'ENDIR',
        name: 'Célula de Endireitamento de Barras e Perfis',
        resource_type: 'STRAIGHTENER',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Conformação de Precisão',
        process_step: 'Desempeno Hiperbólico e Retilineidade',
        primary_responsible: gestorL1?.id || adminUser?.id,
        capacity_unit: 't/h',
        nominal_hourly_capacity: 6.0,
        nominal_shift_capacity: 45.0,
        nominal_daily_capacity: 90.0,
        nominal_monthly_capacity: 2000.0,
        planned_efficiency_pct: 85.0,
        max_recommended_utilization_pct: 80.0,
        min_batch_size: 5.0,
        max_batch_size: 50.0,
        capacity_notes: 'Endireitadeira multieixos de alta precisão geométrica.',
        input_buffer_type: 'Cavalete de Entrada',
        input_buffer_capacity: 40,
        input_buffer_unit: 't',
        output_buffer_type: 'Cavalete de Inspeção Dimensional',
        output_buffer_capacity: 30,
        output_buffer_unit: 't',
        completeness_score: 82,
        ready_for_scheduling: true,
        missing_requirements: [],
        shifts: [
          {
            name: 'Turno Único de Endireitamento',
            code: 'T1_ENDIR',
            start: '07:30',
            end: '17:18',
            dur: 8.8,
            brk: 60,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: false,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 22,
          work_saturdays: false,
          work_sundays: false,
          work_holidays: false,
        },
        scheduled_stops: [
          {
            code: 'LUB_ENDIR',
            description: 'Lubrificação Centralizada e Checagem de Folgas',
            category: 'PREVENTIVE_MAINTENANCE',
            recurrence: 'WEEKLY',
            duration: 60,
            time: '07:30',
            shift: 'T1_ENDIR',
            days: ['SEG'],
            impact: 'Engraxamento dos mancais dos rolos hiperbólicos.',
          },
        ],
        setups: [
          {
            code: 'STP_ROLETES_ENDIR',
            description: 'Ajuste de Ângulo dos Rolos Desempenadores',
            category: 'DIMENSION_CHANGE',
            duration: 30,
            resource: 'Castanhas Guia',
            setup_type: 'COMBINED',
            from_family: 'BAR_CHATA',
            to_family: 'BAR_CHATA',
            notes: 'Conforme bitola da barra.',
          },
        ],
        capabilities: [
          {
            family: 'BAR_CHATA',
            p_type: 'Barras Chatas Retificadas',
            section: 'Retangular',
            status: 'ALLOWED',
            min_d: 10,
            max_d: 100,
            min_t: 3.0,
            max_t: 25.4,
            min_l: 2000,
            max_l: 8000,
            min_w: 10,
            max_w: 150,
            spec_cap: 6.0,
            spec_unit: 't/h',
            notes: 'Garante flecha máxima de 1mm por metro.',
          },
        ],
        constraints: [
          {
            code: 'REST_ENDIR_DUREZA',
            title: 'Dureza Máxima de Material Admissível',
            classification: 'MATERIAL_COMPATIBILITY',
            param: 'Dureza Rockwell',
            unit: 'HRC',
            min_v: 0,
            max_v: 35,
            desc: 'Materiais com dureza acima de 35 HRC causam trincas superficiais durante o desempeno mecânico.',
            impact: 'Risco de fratura frágil do material e quebra de matriz.',
          },
        ],
      },
      {
        code: 'RETRAB',
        name: 'Célula de Retrabalho e Conformidade Técnica',
        resource_type: 'REWORK',
        unit: 'Planta Principal CIAFAL',
        sap_plant_code: '1000',
        sector: 'Qualidade & Retrabalho',
        process_step: 'Recuperação Dimensional e Reinspeção',
        primary_responsible: adminUser?.id,
        capacity_unit: 'peça',
        nominal_hourly_capacity: 25.0,
        nominal_shift_capacity: 180.0,
        nominal_daily_capacity: 360.0,
        nominal_monthly_capacity: 7500.0,
        planned_efficiency_pct: 80.0,
        max_recommended_utilization_pct: 75.0,
        min_batch_size: 1.0,
        max_batch_size: 50.0,
        capacity_notes: 'Posto auxiliar com capacidade sob demanda para não conformidades.',
        input_buffer_type: 'Baia de Quarentena',
        input_buffer_capacity: 100,
        input_buffer_unit: 'peça',
        output_buffer_type: 'Baia Liberada / Reinspecionada',
        output_buffer_capacity: 80,
        output_buffer_unit: 'peça',
        completeness_score: 75,
        ready_for_scheduling: false,
        missing_requirements: [
          'Calendário produtivo dedicado',
          'Vínculo de operadores especializados',
        ],
        shifts: [
          {
            name: 'Turno Diurno de Retrabalho',
            code: 'T1_RETRAB',
            start: '08:00',
            end: '17:00',
            dur: 8.0,
            brk: 60,
            days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
            midnight: false,
          },
        ],
        calendar: {
          year: 2026,
          month: 8,
          operating_days: 22,
          work_saturdays: false,
          work_sundays: false,
          work_holidays: false,
        },
        scheduled_stops: [],
        setups: [],
        capabilities: [
          {
            family: 'TUB_QUAD',
            p_type: 'Ajuste Solda e Dimensional',
            section: 'Universal',
            status: 'UNDER_TEST',
            min_d: 20,
            max_d: 150,
            min_t: 1.2,
            max_t: 8.0,
            min_l: 1000,
            max_l: 12000,
            min_w: 1,
            max_w: 150,
            spec_cap: 25.0,
            spec_unit: 'peça',
            notes: 'Requer avaliação de desvio pelo CQ.',
          },
        ],
        constraints: [
          {
            code: 'REST_RETRAB_SOLDA',
            title: 'Limite de Reparos por Peça',
            classification: 'OPERATIONAL_LIMIT',
            param: 'Pontos de Solda Máximos',
            unit: 'un',
            min_v: 1,
            max_v: 3,
            desc: 'Normas CIAFAL e automotivas proíbem mais de 3 retoques de solda na mesma seção tubular.',
            impact: 'Reprovação final e sucateamento mandatário.',
          },
        ],
      },
    ]

    // Persistir cada configuração versionada
    for (const cfg of masterConfigs) {
      const lineRec = lineMap[cfg.code]
      if (!lineRec) continue

      let masterRec = null
      try {
        masterRec = app.findFirstRecordByData('line_masters', 'line_id', lineRec.id)
      } catch (_) {
        masterRec = new Record(masterCol)
        masterRec.set('line_id', lineRec.id)
        masterRec.set('version', 1)
        masterRec.set('status', 'ACTIVE')
        masterRec.set('code', cfg.code)
        masterRec.set('name', cfg.name)
        masterRec.set('description', 'Ficha técnica mestre homologada no HUB CIAFAL - Versão 1.')
        masterRec.set('resource_type', cfg.resource_type)
        masterRec.set('unit', cfg.unit)
        masterRec.set('sap_plant_code', cfg.sap_plant_code)
        masterRec.set('sector', cfg.sector)
        masterRec.set('process_step', cfg.process_step)
        if (cfg.primary_responsible)
          masterRec.set('primary_responsible_id', cfg.primary_responsible)
        if (cfg.substitute_responsible)
          masterRec.set('substitute_responsible_id', cfg.substitute_responsible)

        masterRec.set('capacity_unit', cfg.capacity_unit)
        masterRec.set('nominal_hourly_capacity', cfg.nominal_hourly_capacity)
        masterRec.set('nominal_shift_capacity', cfg.nominal_shift_capacity)
        masterRec.set('nominal_daily_capacity', cfg.nominal_daily_capacity)
        masterRec.set('nominal_monthly_capacity', cfg.nominal_monthly_capacity)
        masterRec.set('planned_efficiency_pct', cfg.planned_efficiency_pct)
        masterRec.set('max_recommended_utilization_pct', cfg.max_recommended_utilization_pct)
        masterRec.set('min_batch_size', cfg.min_batch_size)
        masterRec.set('max_batch_size', cfg.max_batch_size)
        masterRec.set('capacity_notes', cfg.capacity_notes)

        masterRec.set('input_buffer_type', cfg.input_buffer_type)
        masterRec.set('input_buffer_capacity', cfg.input_buffer_capacity)
        masterRec.set('input_buffer_unit', cfg.input_buffer_unit)
        masterRec.set('output_buffer_type', cfg.output_buffer_type)
        masterRec.set('output_buffer_capacity', cfg.output_buffer_capacity)
        masterRec.set('output_buffer_unit', cfg.output_buffer_unit)

        masterRec.set('valid_from', '2026-01-01 00:00:00.000Z')
        masterRec.set('source_type', 'ENGINEERING')
        if (adminUser) {
          masterRec.set('author_id', adminUser.id)
          masterRec.set('author_email', adminUser.getString('email'))
        }
        masterRec.set(
          'change_reason',
          'Criação da Versão 1 de Ficha Mestre a partir do levantamento de Engenharia Industrial.',
        )
        masterRec.set('completeness_score', cfg.completeness_score)
        masterRec.set('ready_for_scheduling', cfg.ready_for_scheduling)
        masterRec.set('missing_requirements', cfg.missing_requirements)

        app.save(masterRec)
      }

      // Turnos
      for (const sh of cfg.shifts) {
        try {
          app.findFirstRecordByData('production_shifts', 'code', sh.code)
        } catch (_) {
          const sRec = new Record(shiftCol)
          sRec.set('line_id', lineRec.id)
          sRec.set('line_master_id', masterRec.id)
          sRec.set('name', sh.name)
          sRec.set('code', sh.code)
          sRec.set('start_time', sh.start)
          sRec.set('end_time', sh.end)
          sRec.set('duration_hours', sh.dur)
          sRec.set('break_minutes', sh.brk)
          sRec.set('applicable_days', sh.days)
          sRec.set('crosses_midnight', sh.midnight)
          sRec.set('active', true)
          app.save(sRec)
        }
      }

      // Calendário
      try {
        const cals = app.findRecordsByFilter(
          'production_calendars',
          `line_id = '${lineRec.id}' && year = ${cfg.calendar.year}`,
          '',
          1,
          0,
        )
        if (cals.length === 0) {
          const cRec = new Record(calCol)
          cRec.set('line_id', lineRec.id)
          cRec.set('line_master_id', masterRec.id)
          cRec.set('year', cfg.calendar.year)
          cRec.set('month', cfg.calendar.month)
          cRec.set('operating_days_count', cfg.calendar.operating_days)
          cRec.set('work_saturdays', cfg.calendar.work_saturdays)
          cRec.set('work_sundays', cfg.calendar.work_sundays)
          cRec.set('work_holidays', cfg.calendar.work_holidays)
          cRec.set('holidays_dates', [
            '2026-09-07',
            '2026-10-12',
            '2026-11-02',
            '2026-11-15',
            '2026-12-25',
          ])
          cRec.set('active', true)
          app.save(cRec)
        }
      } catch (_) {}

      // Paradas Programadas Padrão
      for (const st of cfg.scheduled_stops) {
        try {
          app.findFirstRecordByData('standard_scheduled_stops', 'code', st.code)
        } catch (_) {
          const stopRec = new Record(stopCol)
          stopRec.set('line_id', lineRec.id)
          stopRec.set('line_master_id', masterRec.id)
          stopRec.set('code', st.code)
          stopRec.set('description', st.description)
          stopRec.set('category', st.category)
          stopRec.set('recurrence', st.recurrence)
          stopRec.set('expected_duration_minutes', st.duration)
          stopRec.set('scheduled_time', st.time)
          stopRec.set('applicable_shift', st.shift)
          stopRec.set('applicable_days', st.days)
          stopRec.set('expected_impact', st.impact)
          stopRec.set('active', true)
          app.save(stopRec)
        }
      }

      // Setups
      for (const stp of cfg.setups) {
        try {
          app.findFirstRecordByData('line_setups', 'code', stp.code)
        } catch (_) {
          const setupRec = new Record(setupCol)
          setupRec.set('line_id', lineRec.id)
          setupRec.set('line_master_id', masterRec.id)
          setupRec.set('code', stp.code)
          setupRec.set('description', stp.description)
          setupRec.set('category', stp.category)
          setupRec.set('standard_duration_minutes', stp.duration)
          setupRec.set('affected_resource', stp.resource)
          setupRec.set('setup_type', stp.setup_type)
          if (savedFamilies[stp.from_family])
            setupRec.set('from_family_id', savedFamilies[stp.from_family].id)
          if (savedFamilies[stp.to_family])
            setupRec.set('to_family_id', savedFamilies[stp.to_family].id)
          setupRec.set('technical_notes', stp.notes)
          setupRec.set('active', true)
          app.save(setupRec)
        }
      }

      // Capabilities
      for (const cap of cfg.capabilities) {
        const famRec = savedFamilies[cap.family]
        if (!famRec) continue
        try {
          const existing = app.findRecordsByFilter(
            'line_capabilities',
            `line_id = '${lineRec.id}' && product_family_id = '${famRec.id}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const capRec = new Record(capCol)
            capRec.set('line_id', lineRec.id)
            capRec.set('line_master_id', masterRec.id)
            capRec.set('product_family_id', famRec.id)
            capRec.set('product_type', cap.p_type)
            capRec.set('section_type', cap.section)
            capRec.set('status', cap.status)
            capRec.set('min_dimension_mm', cap.min_d)
            capRec.set('max_dimension_mm', cap.max_d)
            capRec.set('min_thickness_mm', cap.min_t)
            capRec.set('max_thickness_mm', cap.max_t)
            capRec.set('min_length_mm', cap.min_l)
            capRec.set('max_length_mm', cap.max_l)
            capRec.set('min_weight_kg', cap.min_w)
            capRec.set('max_weight_kg', cap.max_w)
            capRec.set('specific_capacity', cap.spec_cap)
            capRec.set('specific_capacity_unit', cap.spec_unit)
            capRec.set('technical_notes', cap.notes)
            capRec.set('active', true)
            app.save(capRec)
          }
        } catch (_) {}
      }

      // Restrições Estruturais
      for (const c of cfg.constraints) {
        try {
          app.findFirstRecordByData('line_structural_constraints', 'code', c.code)
        } catch (_) {
          const scRec = new Record(scCol)
          scRec.set('line_id', lineRec.id)
          scRec.set('line_master_id', masterRec.id)
          scRec.set('code', c.code)
          scRec.set('title', c.title)
          scRec.set('classification', c.classification)
          scRec.set('parameter_name', c.param)
          scRec.set('unit', c.unit)
          scRec.set('min_value', c.min_v)
          scRec.set('max_value', c.max_v)
          scRec.set('description', c.desc)
          scRec.set('impact', c.impact)
          scRec.set('active', true)
          app.save(scRec)
        }
      }
    }
  },
  (app) => {
    // rollback
  },
)
