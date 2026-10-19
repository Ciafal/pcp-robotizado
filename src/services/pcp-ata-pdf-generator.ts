import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'

/**
 * Utilitário de formatação de nome de arquivo PDF conforme especificação:
 * ATA_PCP_[CodigoATA]_[AAAAMMDD].pdf
 */
export function getAtaPdfFileName(meetingCode: string, meetingDate?: string): string {
  const cleanCode = (meetingCode || 'ATA').replace(/[^a-zA-Z0-9_-]/g, '_')
  let yyyymmdd = ''

  if (meetingDate && meetingDate.includes('/')) {
    // DD/MM/YYYY
    const parts = meetingDate.split('/')
    if (parts.length === 3) {
      yyyymmdd = `${parts[2]}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`
    }
  } else if (meetingDate && meetingDate.includes('-')) {
    // YYYY-MM-DD
    const parts = meetingDate.split('-')
    if (parts.length === 3) {
      yyyymmdd = `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`
    }
  }

  if (!yyyymmdd) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    yyyymmdd = `${y}${m}${d}`
  }

  return `ATA_PCP_${cleanCode}_${yyyymmdd}.pdf`
}

/**
 * Monta o documento HTML completo e estilizado para o PDF Oficial SGQ e corpo de visualização/impressão
 */
export function renderAtaOfficialHtml(params: {
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
  dataHoraEmissao?: string
}): string {
  const { meeting, ata, dataHoraEmissao = new Date().toLocaleString('pt-BR') } = params

  const isMinuta = (ata as any).is_minuta || ata.status === 'MINUTA' || ata.ata_type === 'PREVIA'
  const tipoDocumento = isMinuta ? 'MINUTA DE ATA DE REUNIÃO PCP' : 'ATA OFICIAL DE REUNIÃO PCP'
  const statusFormatado = ata.status || meeting.status

  // Seções da ATA
  const secoes = ata.structured_content?.secoes || {}

  // Renderiza seções estruturadas dinâmicas
  const secoesHtml = Object.entries(secoes)
    .map(([secKey, sec]) => {
      const itensHtml =
        sec.itens && sec.itens.length > 0
          ? sec.itens
              .map(
                (it) => `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong style="color:#0f172a; font-size:12px;">${escapeHtml(it.topico || 'Tópico')}</strong>
                <span style="background:#e0f2fe; color:#0369a1; font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #bae6fd;">
                  ${escapeHtml(it.responsavel || 'PCP')}
                </span>
              </div>
              <p style="color:#334155; font-size:11px; margin:0; line-height:1.5;">${escapeHtml(it.detalhes || '')}</p>
            </div>
          `,
              )
              .join('')
          : '<p style="color:#94a3b8; font-style:italic; font-size:11px; margin:4px 0;">Sem deliberações registradas para esta seção.</p>'

      return `
        <div style="margin-top:16px; border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#ffffff;">
          <div style="border-bottom:2px solid #004C97; padding-bottom:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="color:#004C97; font-size:13px; font-weight:800; margin:0; text-transform:uppercase; letter-spacing:0.5px;">
              ${escapeHtml(sec.nome || secKey)}
            </h3>
            <span style="font-size:10px; color:#64748b; font-family:monospace;">
              ${sec.itens ? sec.itens.length : 0} deliberação(ões)
            </span>
          </div>
          ${itensHtml}
        </div>
      `
    })
    .join('')

  // Renderiza Paradas Programadas da fonte oficial
  const paradas = (ata.structured_content as any)?.paradas_programadas_snapshot || []
  const paradasHtml =
    paradas.length > 0
      ? `
      <div style="margin-top:16px; border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#ffffff;">
        <div style="border-bottom:2px solid #004C97; padding-bottom:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <h3 style="color:#004C97; font-size:13px; font-weight:800; margin:0; text-transform:uppercase;">
            Paradas Programadas da Semana (Fonte Oficial SGQ)
          </h3>
          <span style="font-size:10px; color:#64748b; font-family:monospace;">
            ${paradas.length} parada(s)
          </span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; color:#334155;">
              <th style="padding:6px 8px;">Linha</th>
              <th style="padding:6px 8px;">Tipo</th>
              <th style="padding:6px 8px;">Início</th>
              <th style="padding:6px 8px;">Fim</th>
              <th style="padding:6px 8px;">Motivo / Escopo</th>
            </tr>
          </thead>
          <tbody>
            ${paradas
              .map(
                (p) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px; font-weight:bold; color:#0f172a;">${escapeHtml(p.line || '—')}</td>
                <td style="padding:6px 8px;">${escapeHtml(p.type || 'PROGRAMADA')}</td>
                <td style="padding:6px 8px; font-family:monospace;">${escapeHtml(p.start_time || '—')}</td>
                <td style="padding:6px 8px; font-family:monospace;">${escapeHtml(p.end_time || '—')}</td>
                <td style="padding:6px 8px; color:#475569;">${escapeHtml(p.reason || '—')}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      : ''

  // Pendências e Ações
  const pendencias = (ata.structured_content as any)?.pendencias_snapshot || []
  const pendenciasHtml =
    pendencias.length > 0
      ? `
      <div style="margin-top:16px; border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#ffffff;">
        <div style="border-bottom:2px solid #004C97; padding-bottom:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <h3 style="color:#004C97; font-size:13px; font-weight:800; margin:0; text-transform:uppercase;">
            Pendências e Ações Pactuadas
          </h3>
          <span style="font-size:10px; color:#64748b; font-family:monospace;">
            ${pendencias.length} ação(ões)
          </span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1; color:#334155;">
              <th style="padding:6px 8px;">Pendência</th>
              <th style="padding:6px 8px;">Responsável</th>
              <th style="padding:6px 8px;">Área</th>
              <th style="padding:6px 8px;">Prazo</th>
              <th style="padding:6px 8px;">Status</th>
              <th style="padding:6px 8px;">Encaminhamento</th>
            </tr>
          </thead>
          <tbody>
            ${pendencias
              .map(
                (p: any) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px; font-weight:bold; color:#0f172a;">${escapeHtml(p.pendency_title || p.title || p.description || '—')}</td>
                <td style="padding:6px 8px;">${escapeHtml(p.responsible_name || p.responsible || 'PCP')}</td>
                <td style="padding:6px 8px;">${escapeHtml(p.area || 'Operação')}</td>
                <td style="padding:6px 8px; font-family:monospace;">${escapeHtml(p.due_date || p.deadline || '—')}</td>
                <td style="padding:6px 8px; font-weight:bold; color:#0369a1;">${escapeHtml(p.status || 'PENDENTE')}</td>
                <td style="padding:6px 8px; color:#475569;">${escapeHtml(p.notes || p.forwarding || p.action_plan || '—')}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      : ''

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(tipoDocumento)} - ${escapeHtml(meeting.meeting_code)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 12mm 14mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .header-box {
      border-bottom: 3px solid #004C97;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }
    .badge-primary {
      background: #004C97;
      color: #ffffff;
    }
    .badge-outline {
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .badge-status {
      background: ${isMinuta ? '#fef3c7' : '#ecfdf5'};
      color: ${isMinuta ? '#92400e' : '#065f46'};
      border: 1px solid ${isMinuta ? '#fde68a' : '#a7f3d0'};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin-top: 10px;
    }
    .meta-item {
      font-size: 10px;
    }
    .meta-label {
      color: #64748b;
      font-weight: bold;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .meta-value {
      color: #0f172a;
      font-weight: 600;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      margin-top: 24px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <span class="badge badge-primary">SGQ 8.1.001-R002 Rev 8</span>
          <span class="badge badge-outline">Versão ${ata.version}.0</span>
          <span class="badge badge-status">${escapeHtml(tipoDocumento)}</span>
        </div>
        <h1 style="color:#004C97; font-size:18px; font-weight:900; margin:0 0 4px 0; letter-spacing:-0.3px;">
          CIAFAL &bull; ${escapeHtml(tipoDocumento)}
        </h1>
        <div style="font-size:12px; font-weight:700; color:#334155;">
          ${escapeHtml(meeting.title || 'Reunião Semanal de Programação e Controle da Produção')}
        </div>
      </div>
      <div style="text-align:right; font-family:monospace; font-size:10px; color:#475569;">
        <div>Código: <strong>${escapeHtml(meeting.meeting_code)}</strong></div>
        <div>Data: <strong>${escapeHtml(meeting.meeting_date)}</strong></div>
        <div>Status: <strong>${escapeHtml(statusFormatado)}</strong></div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Empresa / Unidade</span>
        <span class="meta-value">${escapeHtml(meeting.company || 'CIAFAL')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Semana / Ano</span>
        <span class="meta-value">Semana ${meeting.week} / ${meeting.year}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Horário</span>
        <span class="meta-value">${escapeHtml(meeting.start_time || '—')} às ${escapeHtml(meeting.expected_end_time || '—')}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Emissão SGQ</span>
        <span class="meta-value">${escapeHtml(dataHoraEmissao)}</span>
      </div>
    </div>
  </div>

  ${secoesHtml}
  ${paradasHtml}
  ${pendenciasHtml}

  <div class="footer">
    <div>
      HUB INDUSTRIAL CIAFAL &bull; MÓDULO PCP ROBOTIZADO &bull; DISTRIBUIÇÃO OFICIAL AUDITADA
    </div>
    <div>
      Documento gerado eletronicamente sob controle do SGQ da CIAFAL
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Cria um Blob PDF a partir do HTML oficial SGQ
 */
export function createAtaPdfBlob(params: {
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
  dataHoraEmissao?: string
}): { blob: Blob; fileName: string; html: string; base64DataUrl: string } {
  const html = renderAtaOfficialHtml(params)
  const fileName = getAtaPdfFileName(params.meeting.meeting_code, params.meeting.meeting_date)

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

  // DataURL base64 para anexo e transporte de dados auditados
  let base64DataUrl = ''
  try {
    const encoded = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(html))) : ''
    base64DataUrl = `data:text/html;base64,${encoded}`
  } catch (_) {
    base64DataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  }

  return { blob, fileName, html, base64DataUrl }
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
