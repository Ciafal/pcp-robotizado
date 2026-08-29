/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const coolingCol = app.findCollectionByNameOrId('cooling_times')
    if (!coolingCol) return

    let plantDivId = ''
    let plantCtgId = ''
    let lineL1Id = ''
    let lineL2Id = ''
    let lineEnfId = ''
    let famTubQuadId = ''
    let famTubRetId = ''
    let famPerfUId = ''
    let famBarChataId = ''

    try {
      const pDiv = app.findFirstRecordByData('plants', 'code', 'DIV')
      if (pDiv) plantDivId = pDiv.id
    } catch (e) {}

    try {
      const pCtg = app.findFirstRecordByData('plants', 'code', 'CTG')
      if (pCtg) plantCtgId = pCtg.id
    } catch (e) {}

    try {
      const lL1 = app.findFirstRecordByData('production_lines', 'code', 'L1')
      if (lL1) lineL1Id = lL1.id
    } catch (e) {}

    try {
      const lL2 = app.findFirstRecordByData('production_lines', 'code', 'L2')
      if (lL2) lineL2Id = lL2.id
    } catch (e) {}

    try {
      const lEnf = app.findFirstRecordByData('production_lines', 'code', 'ENF_L1')
      if (lEnf) lineEnfId = lEnf.id
    } catch (e) {}

    try {
      const f1 = app.findFirstRecordByData('product_families', 'code', 'TUB_QUAD')
      if (f1) famTubQuadId = f1.id
    } catch (e) {}

    try {
      const f2 = app.findFirstRecordByData('product_families', 'code', 'TUB_RET')
      if (f2) famTubRetId = f2.id
    } catch (e) {}

    try {
      const f3 = app.findFirstRecordByData('product_families', 'code', 'PERF_U')
      if (f3) famPerfUId = f3.id
    } catch (e) {}

    try {
      const f4 = app.findFirstRecordByData('product_families', 'code', 'BAR_CHATA')
      if (f4) famBarChataId = f4.id
    } catch (e) {}

    const defaultRecords = [
      {
        center_code: '1001',
        plant_id: plantDivId,
        line_id: lineL1Id,
        line_code: 'L1',
        work_center: 'WC-DIV-L1',
        material_code: 'TQ-100x100',
        material_description: 'Tubo Estrutural Quadrado 100x100 mm',
        family_id: famTubQuadId,
        family_code: 'TUB_QUAD',
        gauge_dimension: '100x100 mm #3.00',
        cooling_time_hours: 24,
        rule_condition: 'Resfriamento mínimo obrigatório pós-enfornamento/laminação',
        origin: 'ENGENHARIA',
        status: 'ATIVO',
        responsible_name: 'Metalurgia CIAFAL',
        revision_number: 1,
        notes: 'Tempo de cura e estabilização térmica de tarugo/tubo pesado',
      },
      {
        center_code: '1001',
        plant_id: plantDivId,
        line_id: lineL1Id,
        line_code: 'L1',
        work_center: 'WC-DIV-L1',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado 50x50x2.0mm',
        family_id: famTubQuadId,
        family_code: 'TUB_QUAD',
        gauge_dimension: '50x50 mm #2.00',
        cooling_time_hours: 18,
        rule_condition: 'Resfriamento padrão para seção média',
        origin: 'ENGENHARIA',
        status: 'ATIVO',
        responsible_name: 'Metalurgia CIAFAL',
        revision_number: 1,
        notes: 'Estabilização de têmpera e alívio de tensões',
      },
      {
        center_code: '1001',
        plant_id: plantDivId,
        line_id: lineL1Id,
        line_code: 'L1',
        work_center: 'WC-DIV-L1',
        material_code: 'TR-80x40x2.5',
        material_description: 'Tubo Retangular 80x40x2.5mm',
        family_id: famTubRetId,
        family_code: 'TUB_RET',
        gauge_dimension: '80x40 mm #2.50',
        cooling_time_hours: 23,
        rule_condition: 'Tempo de resfriamento para perfis retangulares',
        origin: 'ENGENHARIA',
        status: 'ATIVO',
        responsible_name: 'Metalurgia CIAFAL',
        revision_number: 1,
        notes: 'Norma técnica CIAFAL N-203',
      },
      {
        center_code: '1002',
        plant_id: plantCtgId,
        line_id: lineL2Id,
        line_code: 'L2',
        work_center: 'WC-CTG-L2',
        material_code: 'PU-150x50x4.75',
        material_description: 'Perfil U Enrijecido 150x50x4.75mm',
        family_id: famPerfUId,
        family_code: 'PERF_U',
        gauge_dimension: '150x50 mm #4.75',
        cooling_time_hours: 36,
        rule_condition: 'Resfriamento para perfil pesado conformação a quente',
        origin: 'ENGENHARIA',
        status: 'ATIVO',
        responsible_name: 'Engenharia de Processos Contagem',
        revision_number: 1,
        notes: 'Exige 36h de leito de resfriamento antes de endireitamento/corte',
      },
      {
        center_code: '1001',
        plant_id: plantDivId,
        line_id: lineEnfId || lineL1Id,
        line_code: 'ENF_L1',
        work_center: 'WC-DIV-ENF_L1',
        material_code: 'TAR-130-1020',
        material_description: 'Tarugo Laminado SAE 1020 130x130mm',
        family_id: famBarChataId,
        family_code: 'TAR_130',
        gauge_dimension: '130x130 mm',
        cooling_time_hours: 24,
        rule_condition: 'Linha anterior (Enfornamento/Aciaria) -> Linha posterior (Laminação)',
        origin: 'ENGENHARIA',
        status: 'ATIVO',
        responsible_name: 'Aciaria & Laminação',
        revision_number: 1,
        notes: 'Transição obrigatória de resfriamento entre processos térmicos',
      },
    ]

    for (const item of defaultRecords) {
      try {
        const record = new Record(coolingCol, item)
        app.save(record)
      } catch (e) {}
    }
  },
  (app) => {
    // down
  },
)
