migrate(
  (app) => {
    // 1. Adicionar campos tipo_requisito e tags_secundarias na coleção mto_requirements de forma idempotente
    const col = app.findCollectionByNameOrId('mto_requirements')
    if (!col) return

    let alterado = false
    if (!col.fields.getByName('tipo_requisito')) {
      col.fields.add(
        new SelectField({
          name: 'tipo_requisito',
          required: false,
          maxSelect: 1,
          values: [
            'Composição Química',
            'Comprimento',
            'Dimensões e Tolerâncias',
            'Garantias Específicas',
            'Temperabilidade',
          ],
        }),
      )
      alterado = true
    }

    if (!col.fields.getByName('tags_secundarias')) {
      col.fields.add(
        new JSONField({
          name: 'tags_secundarias',
          required: false,
        }),
      )
      alterado = true
    }

    if (alterado) {
      app.save(col)
    }

    // 2. Classificação idempotente e retroativa dos registros existentes
    // Função auxiliar de classificação goja/ES5 compatível
    function classificarRequisito(rec) {
      var tiposDetectados = []

      // 1) Composição Química: elementos com min != null ou max != null
      var comp = rec.get('composicao_quimica')
      if (comp && comp.elementos && Array.isArray(comp.elementos)) {
        var temComp = false
        for (var i = 0; i < comp.elementos.length; i++) {
          var el = comp.elementos[i]
          if (
            el &&
            ((el.min !== null && el.min !== undefined && el.min !== '') ||
              (el.max !== null && el.max !== undefined && el.max !== ''))
          ) {
            temComp = true
            break
          }
        }
        if (temComp) tiposDetectados.push('Composição Química')
      }

      // 2) Temperabilidade: pontos mm com valor preenchido ou escala 16
      var garEsp = rec.get('garantias_especificas')
      if (garEsp && garEsp.temperabilidade) {
        var temp = garEsp.temperabilidade
        var temTemp = false
        if (temp.pontos_mm && Array.isArray(temp.pontos_mm)) {
          for (var j = 0; j < temp.pontos_mm.length; j++) {
            var p = temp.pontos_mm[j]
            if (p && p.valor !== null && p.valor !== undefined && p.valor !== '') {
              temTemp = true
              break
            }
          }
        }
        if (!temTemp && temp.escala_polegada_16 && Array.isArray(temp.escala_polegada_16)) {
          for (var k = 0; k < temp.escala_polegada_16.length; k++) {
            var pol = temp.escala_polegada_16[k]
            if (pol && pol.valor !== null && pol.valor !== undefined && pol.valor !== '') {
              temTemp = true
              break
            }
          }
        }
        if (temTemp) tiposDetectados.push('Temperabilidade')
      }

      // 3) Garantias Específicas: tração, dureza, charpy, microinclusões, grão, descarbonetação
      if (garEsp) {
        var temGarantias = false
        if (garEsp.ensaio_tracao) {
          var tr = garEsp.ensaio_tracao
          if (
            (tr.lr_mpa !== null && tr.lr_mpa !== undefined && tr.lr_mpa !== '') ||
            (tr.le_mpa !== null && tr.le_mpa !== undefined && tr.le_mpa !== '') ||
            (tr.alongamento_pct !== null &&
              tr.alongamento_pct !== undefined &&
              tr.alongamento_pct !== '')
          ) {
            temGarantias = true
          }
        }
        if (!temGarantias && garEsp.dureza) {
          var d = garEsp.dureza
          if (
            (d.tipo_dureza &&
              String(d.tipo_dureza).trim() !== '' &&
              String(d.tipo_dureza).trim() !== '—') ||
            (d.maximo !== null && d.maximo !== undefined && d.maximo !== '') ||
            (d.minimo !== null && d.minimo !== undefined && d.minimo !== '')
          ) {
            temGarantias = true
          }
        }
        if (!temGarantias && garEsp.ensaio_charpy) {
          var ch = garEsp.ensaio_charpy
          if (
            (ch.valor_minimo_j !== null &&
              ch.valor_minimo_j !== undefined &&
              ch.valor_minimo_j !== '') ||
            (ch.orientacao &&
              String(ch.orientacao).trim() !== '' &&
              String(ch.orientacao).trim() !== '—')
          ) {
            temGarantias = true
          }
        }
        if (!temGarantias && garEsp.caracterizacao_metalurgica) {
          var cm = garEsp.caracterizacao_metalurgica
          if (
            (cm.tamanho_grao_austenitico &&
              String(cm.tamanho_grao_austenitico).trim() !== '' &&
              String(cm.tamanho_grao_austenitico).trim() !== '—') ||
            (cm.descarbonetacao &&
              String(cm.descarbonetacao).trim() !== '' &&
              String(cm.descarbonetacao).trim() !== '—')
          ) {
            temGarantias = true
          }
          if (!temGarantias && cm.microinclusoes_astm_e45_a) {
            var mi = cm.microinclusoes_astm_e45_a
            var chaves = ['af', 'bf', 'cf', 'df', 'ag', 'bg', 'cg', 'dg']
            for (var m = 0; m < chaves.length; m++) {
              var val = mi[chaves[m]]
              if (val !== null && val !== undefined && val !== '') {
                temGarantias = true
                break
              }
            }
          }
        }
        if (temGarantias) tiposDetectados.push('Garantias Específicas')
      }

      // 4) Comprimento: comprimento_principal preenchido
      var compObj = rec.get('comprimento')
      if (
        compObj &&
        compObj.comprimento_principal !== null &&
        compObj.comprimento_principal !== undefined &&
        compObj.comprimento_principal !== '' &&
        Number(compObj.comprimento_principal) > 0
      ) {
        tiposDetectados.push('Comprimento')
      }

      // 5) Dimensões e Tolerâncias: raio, romboidade, altura, largura preenchidos
      var dim = rec.get('dimensoes_tolerancias')
      if (dim) {
        var temDim = false
        var camposDim = ['raio_canto', 'romboidade', 'altura', 'largura']
        for (var dIdx = 0; dIdx < camposDim.length; dIdx++) {
          var v = dim[camposDim[dIdx]]
          if (v !== null && v !== undefined && v !== '' && v !== '—') {
            temDim = true
            break
          }
        }
        if (temDim) tiposDetectados.push('Dimensões e Tolerâncias')
      }

      if (tiposDetectados.length === 0) {
        return { principal: 'Comprimento', secundarias: [] }
      }

      // Para a massa de homologação e regras de domínio:
      // O documento original destaca o comprimento como característica primária do item,
      // acompanhado de Garantias Específicas (tração) no Requisito 01.
      var principal =
        tiposDetectados.indexOf('Comprimento') >= 0 ? 'Comprimento' : tiposDetectados[0]
      var secundarias = []
      for (var s = 0; s < tiposDetectados.length; s++) {
        if (tiposDetectados[s] !== principal) {
          secundarias.push(tiposDetectados[s])
        }
      }

      return { principal: principal, secundarias: secundarias }
    }

    try {
      const allRecords = app.findRecordsByFilter('mto_requirements', 'id != ""', '-created', 500)
      for (let r = 0; r < allRecords.length; r++) {
        const rec = allRecords[r]
        const classif = classificarRequisito(rec)
        const tipoAtual = rec.getString('tipo_requisito')
        if (!tipoAtual) {
          rec.set('tipo_requisito', classif.principal)
          rec.set('tags_secundarias', classif.secundarias)
          app.save(rec)

          // Registrar log de auditoria
          try {
            if (app.hasTable('mto_requirements_logs')) {
              const logCol = app.findCollectionByNameOrId('mto_requirements_logs')
              const auditLog = new Record(logCol, {
                pedido_numero: rec.getString('pedido_numero'),
                item_pedido: rec.getString('item_pedido'),
                requisito_id: rec.getString('requisito_id'),
                acao: 'EDICAO',
                origem: 'MIGRATION_1774000114_CLASSIFICACAO_TIPO',
                usuario: 'sistema.migracao@ciafal.com.br',
                valores_anteriores: { tipo_requisito: null, tags_secundarias: null },
                valores_posteriores: {
                  tipo_requisito: classif.principal,
                  tags_secundarias: classif.secundarias,
                },
                data_hora: new Date().toISOString(),
              })
              app.save(auditLog)
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter de forma segura
    try {
      const col = app.findCollectionByNameOrId('mto_requirements')
      if (col) {
        if (col.fields.getByName('tipo_requisito')) {
          col.fields.removeByName('tipo_requisito')
        }
        if (col.fields.getByName('tags_secundarias')) {
          col.fields.removeByName('tags_secundarias')
        }
        app.save(col)
      }
    } catch (_) {}
  },
)
