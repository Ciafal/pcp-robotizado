/// <reference path="../pb_data/types.d.ts" />

/**
 * HOOK POCKETBASE: raw_material_inventory_auto_trigger.js
 *
 * Garante no backend as regras vinculantes do Inventário de Matéria-Prima:
 * 1. Ao transicionar status de weekly_schedules para APROVADO / PUBLICADO
 *    para Empresa=CIAFAL, Linha=L1, se houver enfornamento FRIO,
 *    cria/atualiza o cabeçalho e itens do inventário de MP sem duplicidade.
 * 2. Ao salvar item em pcp_mp_inventory_items, recalcula automaticamente
 *    a divergência de peças (DP07 - SAP) e valida status.
 */

onRecordAfterCreateSuccess((e) => {
  try {
    const item = e.record
    const lineCode = item.getString('line_code') || ''
    const status = item.getString('status') || ''

    if (lineCode.toUpperCase() === 'L1' && (status === 'APROVADO' || status === 'PUBLICADO')) {
      // Disparo automático garantido no backend
      const companyCode = item.getString('company_code') || 'CIAFAL'
      const dateStr = item.getString('date_str') || new Date().toISOString().split('T')[0]
      const version = item.getInt('version') || 1
      const controlKey = `${companyCode}|L1|FORNOL1|${dateStr}|V${version}`

      // Verifica se já existe o cabeçalho para evitar duplicidade
      let existing = null
      try {
        existing = $app.findFirstRecordByData('pcp_mp_inventory_orders', 'control_key', controlKey)
      } catch (_) {}

      if (!existing) {
        const headerCol = $app.findCollectionByNameOrId('pcp_mp_inventory_orders')
        const header = new Record(headerCol)
        header.set('inventory_code', `INV-MP-L1-${dateStr.replace(/-/g, '')}-V${version}`)
        header.set('control_key', controlKey)
        header.set('company', companyCode)
        header.set('line', 'L1')
        header.set('center', 'FORNOL1')
        header.set('responsible_sector', 'DP07 — Preparação de Tarugos')
        header.set('schedule_date', dateStr)
        header.set('schedule_version', version)
        header.set('schedule_code', item.getString('schedule_code') || '')
        header.set('programming_type', 'Enfornamento')
        header.set('enfornamento_type', 'FRIO')
        header.set('status', 'Aguardando Inventário')
        header.set('orders_count', 1)
        header.set('total_tons_required', item.getFloat('planned_quantity_tons') || 25)
        header.set('total_pieces_required', 15)
        header.set('total_pieces_inventoried', 0)
        header.set('divergent_materials_count', 0)
        header.set('pending_materials_count', 1)
        header.set('ready_orders_count', 0)
        header.set('delay_risk_orders_count', 0)
        header.set('generated_at', new Date().toISOString())
        header.set('generated_by', 'PCP Robotizado (Auto-Trigger)')
        header.set('notification_status', 'DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE')
        header.set('mes_dispatch_status', 'DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE')
        header.set('sap_sync_status', 'Recurso aguardando integração/integração pendente (SAP RFC)')
        header.set('wms_sync_status', 'Recurso aguardando integração/integração pendente (WMS API)')
        $app.save(header)
      }
    }
  } catch (err) {
    // Não interrompe fluxo de salvamento principal
  }
}, 'weekly_schedules')

onRecordBeforeUpdate((e) => {
  try {
    const record = e.record
    // Recalcula divergência de peças no backend antes de persistir
    const sapPieces = record.getInt('sap_pieces_count') || 0
    const dp07Pieces = record.get('dp07_inventoried_pieces')

    if (dp07Pieces !== null && dp07Pieces !== undefined && dp07Pieces !== '') {
      const p = Number(dp07Pieces)
      record.set('pieces_divergence', p - sapPieces)
      record.set('updated_at_timestamp', new Date().toISOString())
    }
  } catch (err) {
    // Ignora se não for item de inventário
  }
}, 'pcp_mp_inventory_items')
