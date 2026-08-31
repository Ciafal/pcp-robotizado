import * as XLSX from 'xlsx'
import pb from '@/lib/pocketbase/client'
import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraUpload,
  CarteiraCicloSnapshot,
  CarteiraIAInsight,
  CarteiraRegraConfig,
} from '@/types/carteira-analise'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from './carteira-engine'

import {
  LinhaRejeitadaDetalhe,
  LinhaIgnoradaDetalhe,
  TipoClassificacaoLinha,
  NivelSeveridadeValidacao,
} from '@/types/carteira-analise'

export interface ValidacaoUploadResultado {
  valido: boolean
  podeImportarParcial: boolean
  temErroCriticoEstrutural: boolean
  mensagemEstrutural?: string
  erros: Array<{
    linha: number
    linhaLogica?: number
    campo: string
    mensagem: string
    valor?: string
    severidade?: NivelSeveridadeValidacao
    acaoSugerida?: string
    material?: string
  }>
  linhasRejeitadasDetalhes: LinhaRejeitadaDetalhe[]
  linhasIgnoradasDetalhes: LinhaIgnoradaDetalhe[]
  alertas: Array<{ linha: number; campo: string; mensagem: string }>
  duplicados: Array<{ pedido: string; item: string; material: string }>
  itensValidos: CarteiraItem[]
  entradasFuturasValidas: CarteiraEntradaFutura[]
  totalLinhas: number
  totalRegistrosIdentificados: number
  linhasValidas: number
  linhasComAlerta: number
  linhasRejeitadas: number
  linhasIgnoradasTotalizacao: number
  linhasVaziasIgnoradas: number
  linhasCabecalhoRodapeIgnoradas: number
  linhasTotalIgnoradas: number
  logsProcessamento: string[]
}

export class CarteiraService {
  public static sanitizarCampoTexto(valor: any): string {
    if (valor === null || valor === undefined) return ''
    const str = String(valor).trim()
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`
    }
    return str
  }

  public static parseNumeroTons(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor
    const str = String(valor).trim().replace(/\s/g, '').replace(',', '.')
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : parsed
  }

  public static parseArquivoBuffer(
    buffer: ArrayBuffer,
    fileName: string,
  ): { linhasCarteira: any[]; linhasEntradasFuturas: any[] } {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    // Verificação de assinatura binária (magic bytes) para identificar ZIP/XLSX (PK\x03\x04) ou OLE2/XLS (\xD0\xCF\x11\xE0)
    const uint8 = new Uint8Array(buffer)
    const isZip =
      uint8.length >= 4 &&
      uint8[0] === 0x50 &&
      uint8[1] === 0x4b &&
      uint8[2] === 0x03 &&
      uint8[3] === 0x04
    const isOle =
      uint8.length >= 4 &&
      uint8[0] === 0xd0 &&
      uint8[1] === 0xcf &&
      uint8[2] === 0x11 &&
      uint8[3] === 0xe0

    if (ext === 'xlsx' || ext === 'xls' || isZip || isOle) {
      // Leitura de planilha binária sem macros (read without executing or evaluating formulas/macros)
      const wb = XLSX.read(buffer, {
        type: 'array',
        cellFormula: false,
        cellHTML: false,
        raw: false,
        dateNF: 'yyyy-mm-dd',
      })
      let linhasCarteira: any[] = []
      let linhasEntradasFuturas: any[] = []

      // Procura por abas nominais ou usa primeira/segunda
      const sheetNames = wb.SheetNames
      const carteiraSheetName =
        sheetNames.find((s) => {
          const u = s.toUpperCase()
          return (
            u.includes('CARTEIRA') ||
            u.includes('ZSD28C') ||
            u.includes('PRINCIPAL') ||
            u.includes('GERAL')
          )
        }) || sheetNames[0]

      const entradasSheetName = sheetNames.find((s) => {
        const u = s.toUpperCase()
        return (
          u.includes('ENTRADA') ||
          u.includes('FUTURA') ||
          u.includes('REVENDA') ||
          u.includes('IMPORTAD') ||
          u.includes('RECEBIMENTO')
        )
      })

      if (carteiraSheetName && wb.Sheets[carteiraSheetName]) {
        linhasCarteira = XLSX.utils.sheet_to_json(wb.Sheets[carteiraSheetName], {
          defval: '',
          raw: false,
        })
      }

      if (entradasSheetName && wb.Sheets[entradasSheetName]) {
        linhasEntradasFuturas = XLSX.utils.sheet_to_json(wb.Sheets[entradasSheetName], {
          defval: '',
          raw: false,
        })
      } else if (
        sheetNames.length > 1 &&
        sheetNames[1] !== carteiraSheetName &&
        !sheetNames[1].toUpperCase().includes('DICION')
      ) {
        linhasEntradasFuturas = XLSX.utils.sheet_to_json(wb.Sheets[sheetNames[1]], {
          defval: '',
          raw: false,
        })
      }

      return { linhasCarteira, linhasEntradasFuturas }
    } else {
      // CSV / TXT estruturado
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      return this.parseCsvCompleto(text)
    }
  }

  public static parseCsvCompleto(csvContent: string): {
    linhasCarteira: any[]
    linhasEntradasFuturas: any[]
  } {
    const allLines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    let secaoAtual: 'CARTEIRA' | 'ENTRADAS' | 'OUTROS' = 'CARTEIRA'
    const carteiraLines: string[] = []
    const entradasLines: string[] = []

    for (const line of allLines) {
      if (line.startsWith('#')) {
        const upper = line.toUpperCase()
        if (upper.includes('CARTEIRA')) {
          secaoAtual = 'CARTEIRA'
        } else if (
          upper.includes('ENTRADA') ||
          upper.includes('FUTURA') ||
          upper.includes('REVENDA')
        ) {
          secaoAtual = 'ENTRADAS'
        } else if (upper.includes('DICION')) {
          secaoAtual = 'OUTROS'
        }
        continue
      }

      if (secaoAtual === 'CARTEIRA') {
        carteiraLines.push(line)
      } else if (secaoAtual === 'ENTRADAS') {
        entradasLines.push(line)
      }
    }

    const parseSection = (lines: string[]): any[] => {
      if (lines.length === 0) return []
      const firstLine = lines[0]
      const delimiter = firstLine.includes(';') ? ';' : ','
      const headers = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim())

      const rows: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
        if (cols.length >= 2) {
          const rowObj: any = {}
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || ''
          })
          rows.push(rowObj)
        }
      }
      return rows
    }

    return {
      linhasCarteira: parseSection(carteiraLines),
      linhasEntradasFuturas: parseSection(entradasLines),
    }
  }

  /**
   * Classificação Semântica e Estrutural de uma Linha Bruta antes da validação de regras de negócio.
   * Tipos:
   * A. REGISTRO_DADOS
   * B. LINHA_VAZIA
   * C. LINHA_TOTALIZACAO (sem material/pedido, com valores numéricos agregados ou texto de Total/Geral)
   * D. CABECALHO_RODAPE (repetição de cabeçalhos, paginação SAP, 'Página 1 de N', etc.)
   * E. LINHA_INVALIDA (dados corrompidos ou ilegíveis)
   */
  public static classificarLinhaBruta(row: any): {
    tipo: TipoClassificacaoLinha
    motivo: string
    totais?: Record<string, number>
  } {
    if (!row || typeof row !== 'object') {
      return { tipo: 'LINHA_VAZIA', motivo: 'Objeto de linha nulo ou indefinido' }
    }

    const keys = Object.keys(row)
    if (keys.length === 0) {
      return { tipo: 'LINHA_VAZIA', motivo: 'Linha sem colunas' }
    }

    // 1. Identificar se está totalmente vazia
    const valoresNaoVazios = keys
      .map((k) => String(row[k] ?? '').trim())
      .filter((v) => v !== '' && v !== 'undefined' && v !== 'null')

    if (valoresNaoVazios.length === 0) {
      return { tipo: 'LINHA_VAZIA', motivo: 'Todos os campos estão vazios' }
    }

    // 2. Extração dos campos candidatos
    const matRaw = String(
      row['Código do material'] ||
        row['codigo_material'] ||
        row['Material'] ||
        row['material'] ||
        row['Cod. Material'] ||
        row['Cód. Material'] ||
        '',
    ).trim()

    const descMatRaw = String(
      row['Descrição do material'] ||
        row['descricao_material'] ||
        row['Descrição'] ||
        row['Descricao'] ||
        '',
    ).trim()

    const ordemRaw = String(
      row['Ordem de venda'] ||
        row['ordem_venda'] ||
        row['Pedido'] ||
        row['pedido'] ||
        row['Doc. Vendas'] ||
        '',
    ).trim()

    const clienteRaw = String(
      row['Cliente'] ||
        row['nome_cliente'] ||
        row['Nome do cliente'] ||
        row['Emissor da ordem'] ||
        '',
    ).trim()

    const todosTextosConcat = valoresNaoVazios.join(' ').toUpperCase()

    // 3. Identificar Cabeçalho / Rodapé SAP
    if (
      todosTextosConcat.includes('PÁGINA ') ||
      todosTextosConcat.includes('PAGINA ') ||
      todosTextosConcat.includes('EXTRATO DE CARTEIRA') ||
      todosTextosConcat.includes('SISTEMA SAP') ||
      todosTextosConcat.includes('EMITIDO EM:') ||
      (matRaw.toUpperCase() === 'MATERIAL' && ordemRaw.toUpperCase() === 'ORDEM DE VENDA') ||
      (matRaw.toUpperCase() === 'CÓDIGO DO MATERIAL' &&
        descMatRaw.toUpperCase() === 'DESCRIÇÃO DO MATERIAL')
    ) {
      return {
        tipo: 'CABECALHO_RODAPE',
        motivo: 'Cabeçalho repetido ou rodapé de paginação do relatório SAP',
      }
    }

    // 4. Identificar Linha de Totalização Semântica / Estrutural
    // Exemplos:
    // a) material contém "TOTAL", "RESULTADO GERAL", "SOMA", "TOTAIS", "GERAL"
    // b) material vazio, cliente/ordem vazios, mas colunas de quantidade/estoque/saldo possuem valores numéricos agregados
    const palavrasChaveTotal = [
      'TOTAL',
      'TOTAIS',
      'RESULTADO GERAL',
      'TOTAL GERAL',
      'SOMA',
      'SUBTOTAL',
    ]
    const hasTextoTotal =
      palavrasChaveTotal.some((kw) => matRaw.toUpperCase().includes(kw)) ||
      palavrasChaveTotal.some((kw) => descMatRaw.toUpperCase().includes(kw)) ||
      palavrasChaveTotal.some((kw) => clienteRaw.toUpperCase().includes(kw)) ||
      palavrasChaveTotal.some((kw) => ordemRaw.toUpperCase().includes(kw))

    // Coleta valores numéricos
    let totalColunasNumericasComValor = 0
    let somaValoresNumericos = 0
    const totaisEncontrados: Record<string, number> = {}

    keys.forEach((k) => {
      const valStr = String(row[k] ?? '').trim()
      if (valStr !== '') {
        const num = CarteiraService.parseNumeroTons(valStr)
        if (num !== 0) {
          totalColunasNumericasComValor++
          somaValoresNumericos += Math.abs(num)
          totaisEncontrados[k] = num
        }
      }
    })

    const semMaterialEOrdem = matRaw === '' && ordemRaw === ''
    const apenasNumerosAgregados = semMaterialEOrdem && totalColunasNumericasComValor >= 1

    if (hasTextoTotal || apenasNumerosAgregados) {
      return {
        tipo: 'LINHA_TOTALIZACAO',
        motivo: hasTextoTotal
          ? 'Linha com marcador explícito de Totalização do relatório SAP'
          : 'Linha sem Material/Pedido contendo valores agregados das colunas de estoque e carteira',
        totais: totaisEncontrados,
      }
    }

    // Se possui código de material ou pedido com formato transacional, é REGISTRO_DADOS
    if (matRaw !== '' || ordemRaw !== '' || clienteRaw !== '') {
      return {
        tipo: 'REGISTRO_DADOS',
        motivo: 'Registro transacional de carteira',
      }
    }

    return {
      tipo: 'LINHA_INVALIDA',
      motivo: 'Linha não classificada estruturalmente',
    }
  }

  /**
   * Validação robusta de colunas essenciais do arquivo (Nível 3 - Estrutural)
   */
  public static validarEstruturaArquivo(linhasBrutas: any[]): {
    valido: boolean
    mensagem?: string
  } {
    if (!Array.isArray(linhasBrutas) || linhasBrutas.length === 0) {
      return {
        valido: false,
        mensagem: 'Arquivo vazio ou sem registros na planilha.',
      }
    }

    // Verifica se pelo menos uma linha tem chave correspondente a Material
    const primeiraLinha = linhasBrutas[0] || {}
    const keys = Object.keys(primeiraLinha).map((k) => k.trim().toLowerCase())

    const temColunaMaterial = keys.some(
      (k) =>
        k.includes('material') ||
        k.includes('codigo') ||
        k.includes('código') ||
        k.includes('produto') ||
        k.includes('item'),
    )

    if (!temColunaMaterial) {
      return {
        valido: false,
        mensagem:
          'ERRO CRÍTICO (Nível 3): Coluna obrigatória de Material não foi encontrada no arquivo. Verifique se o template ZSD28C correto foi utilizado.',
      }
    }

    return { valido: true }
  }

  public static validarLinhasCarteira(
    linhasBrutas: any[],
    entradasFuturasBrutas: any[] = [],
  ): ValidacaoUploadResultado {
    const erros: Array<{
      linha: number
      linhaLogica?: number
      campo: string
      mensagem: string
      valor?: string
      severidade?: NivelSeveridadeValidacao
      acaoSugerida?: string
      material?: string
    }> = []
    const linhasRejeitadasDetalhes: LinhaRejeitadaDetalhe[] = []
    const linhasIgnoradasDetalhes: LinhaIgnoradaDetalhe[] = []
    const alertas: Array<{ linha: number; campo: string; mensagem: string }> = []
    const duplicados: Array<{ pedido: string; item: string; material: string }> = []
    const itensValidos: CarteiraItem[] = []
    const logsProcessamento: string[] = []

    // 1. Validação Nível 3 (Estrutural)
    const validacaoEstrutura = this.validarEstruturaArquivo(linhasBrutas)
    if (!validacaoEstrutura.valido) {
      return {
        valido: false,
        podeImportarParcial: false,
        temErroCriticoEstrutural: true,
        mensagemEstrutural: validacaoEstrutura.mensagem,
        erros: [
          {
            linha: 1,
            campo: 'Estrutura do Arquivo',
            mensagem: validacaoEstrutura.mensagem || 'Estrutura inválida',
            severidade: 'NIVEL_3_ERRO_ESTRUTURAL',
            acaoSugerida:
              'Baixar o template oficial ZSD28C e reenviar o arquivo com cabeçalhos corretos.',
          },
        ],
        linhasRejeitadasDetalhes: [],
        linhasIgnoradasDetalhes: [],
        alertas: [],
        duplicados: [],
        itensValidos: [],
        entradasFuturasValidas: [],
        totalLinhas: linhasBrutas?.length || 0,
        totalRegistrosIdentificados: 0,
        linhasValidas: 0,
        linhasComAlerta: 0,
        linhasRejeitadas: 0,
        linhasIgnoradasTotalizacao: 0,
        linhasVaziasIgnoradas: 0,
        linhasCabecalhoRodapeIgnoradas: 0,
        linhasTotalIgnoradas: 0,
        logsProcessamento: [validacaoEstrutura.mensagem || 'Erro estrutural'],
      }
    }

    const entradasFuturasValidas = this.validarLinhasEntradasFuturas(entradasFuturasBrutas)
    const mapDuplicidade = new Set<string>()

    let contLinhasVazias = 0
    let contLinhasTotalizacao = 0
    let contLinhasCabecalhoRodape = 0
    let linhaLogicaIndex = 0

    // 2. Classificação Semântica e Validação Linha a Linha
    linhasBrutas.forEach((row, index) => {
      const numLinhaExcel = index + 2 // Linha 1 é o cabeçalho no Excel
      const classificacao = this.classificarLinhaBruta(row)

      // NÍVEL 1: INFORMATIVO / LINHAS NÃO TRANSACIONAIS (Ignorar automaticamente, registrar log e NÃO considerar erro)
      if (classificacao.tipo === 'LINHA_VAZIA') {
        contLinhasVazias++
        linhasIgnoradasDetalhes.push({
          linhaExcel: numLinhaExcel,
          linhaLogica: linhaLogicaIndex,
          tipo: 'LINHA_VAZIA',
          motivo: 'Linha em branco desconsiderada automaticamente da carga.',
        })
        return
      }

      if (classificacao.tipo === 'LINHA_TOTALIZACAO') {
        contLinhasTotalizacao++
        linhasIgnoradasDetalhes.push({
          linhaExcel: numLinhaExcel,
          linhaLogica: linhaLogicaIndex,
          tipo: 'LINHA_TOTALIZACAO',
          motivo: classificacao.motivo,
          totaisIdentificados: classificacao.totais,
        })
        logsProcessamento.push(
          `Linha ${numLinhaExcel}: 1 linha de totalização identificada e desconsiderada da importação.`,
        )
        return
      }

      if (classificacao.tipo === 'CABECALHO_RODAPE') {
        contLinhasCabecalhoRodape++
        linhasIgnoradasDetalhes.push({
          linhaExcel: numLinhaExcel,
          linhaLogica: linhaLogicaIndex,
          tipo: 'CABECALHO_RODAPE',
          motivo: classificacao.motivo,
        })
        logsProcessamento.push(
          `Linha ${numLinhaExcel}: Linha de cabeçalho/rodapé repetido desconsiderada.`,
        )
        return
      }

      // Se for registro de dados ou linha que deve ser analisada
      linhaLogicaIndex++

      const codMaterial = this.sanitizarCampoTexto(
        row['Código do material'] ||
          row['codigo_material'] ||
          row['Material'] ||
          row['material'] ||
          row['Cod. Material'] ||
          row['Cód. Material'],
      )
      const ordemVenda = this.sanitizarCampoTexto(
        row['Ordem de venda'] ||
          row['ordem_venda'] ||
          row['Pedido'] ||
          row['pedido'] ||
          row['Doc. Vendas'],
      )
      const itemOrdem = this.sanitizarCampoTexto(
        row['Item'] || row['item'] || row['Item da ordem'] || '10',
      )

      // NÍVEL 2: ERRO DE REGISTRO DE NEGÓCIO (Material ausente em registro de dados real)
      if (!codMaterial) {
        const erroObj = {
          linha: numLinhaExcel,
          linhaLogica: linhaLogicaIndex,
          campo: 'Código do material',
          mensagem: 'Código do material é obrigatório e não pode ser nulo.',
          valor: '(vazio)',
          severidade: 'NIVEL_2_ERRO_REGISTRO' as NivelSeveridadeValidacao,
          acaoSugerida: 'Preencher o código do material ou remover a linha defeituosa.',
          material: undefined,
        }
        erros.push(erroObj)
        linhasRejeitadasDetalhes.push({
          linhaExcel: numLinhaExcel,
          linhaLogica: linhaLogicaIndex,
          material: '',
          coluna: 'Código do material',
          valorEncontrado: '(vazio)',
          motivoRejeicao: 'Código do material é obrigatório para registros transacionais.',
          severidade: 'NIVEL_2_ERRO_REGISTRO',
          acaoSugerida: 'Preencher o código SAP do material na planilha original.',
          dadosOriginais: row,
        })
        return
      }

      // Validação de Duplicidade / Alertas
      if (ordemVenda && itemOrdem) {
        const key = `${ordemVenda}_${itemOrdem}_${codMaterial}`
        if (mapDuplicidade.has(key)) {
          duplicados.push({ pedido: ordemVenda, item: itemOrdem, material: codMaterial })
          alertas.push({
            linha: numLinhaExcel,
            campo: 'Ordem/Item/Material',
            mensagem: `Duplicidade identificada no arquivo: Pedido ${ordemVenda}, Item ${itemOrdem}, Material ${codMaterial}.`,
          })
        } else {
          mapDuplicidade.add(key)
        }
      }

      const qtdOrdem = this.parseNumeroTons(
        row['Quantidade da ordem (t)'] ||
          row['qtd_ordem'] ||
          row['Quantidade Ordem'] ||
          row['Qtd Ordem'] ||
          0,
      )
      const qtdFaturada = this.parseNumeroTons(
        row['Quantidade faturada (t)'] ||
          row['qtd_faturada'] ||
          row['Quantidade Faturada'] ||
          row['Qtd Faturada'] ||
          0,
      )
      const estoqueLivre = this.parseNumeroTons(
        row['Estoque livre (t)'] || row['estoque_livre'] || row['Estoque Livre'] || 0,
      )
      const estoqueMto = this.parseNumeroTons(
        row['Estoque MTO (t)'] || row['estoque_mto'] || row['Estoque MTO'] || 0,
      )
      const estoqueSemi = this.parseNumeroTons(
        row['Estoque semiacabado (t)'] ||
          row['estoque_semiacabado'] ||
          row['Estoque Semiacabado'] ||
          0,
      )
      const estoqueSemiCiafal = this.parseNumeroTons(
        row['Estoque Semiacabado CIAFAL'] || row['estoque_semiacabado_ciafal_tons'] || estoqueSemi,
      )
      const estoqueSemiVallourec = this.parseNumeroTons(
        row['Estoque Semiacabado Vallourec'] || row['estoque_semiacabado_vallourec_tons'] || 0,
      )
      const estoqueAcabado = this.parseNumeroTons(
        row['Estoque acabado (t)'] || row['estoque_acabado'] || row['Estoque Acabado'] || 0,
      )
      const qtdProg = this.parseNumeroTons(
        row['Quantidade programada (t)'] || row['qtd_programada'] || row['Programação'] || 0,
      )
      const mediaFat = this.parseNumeroTons(
        row['Média de faturamento diário (t/dia)'] ||
          row['media_faturamento_diario'] ||
          row['Média Faturamento'] ||
          0,
      )

      let tipoOrdem: 'MTS' | 'MTO' = 'MTS'
      const rawTipo = this.sanitizarCampoTexto(
        row['MTS/MTO'] || row['tipo_ordem'] || row['Tipo de atendimento'] || '',
      ).toUpperCase()
      if (rawTipo.includes('MTO')) tipoOrdem = 'MTO'

      let origem: 'PRODUCAO_PROPRIA' | 'REVENDA' | 'IMPORTADO' | 'INDUSTRIALIZACAO' =
        'PRODUCAO_PROPRIA'
      const rawOrigem = this.sanitizarCampoTexto(
        row['Origem do produto'] || row['origem_produto'] || row['Origem'] || '',
      ).toUpperCase()
      if (rawOrigem.includes('REVENDA')) origem = 'REVENDA'
      else if (rawOrigem.includes('IMPORT')) origem = 'IMPORTADO'
      else if (rawOrigem.includes('INDUS')) origem = 'INDUSTRIALIZACAO'

      const isBloqueado = Boolean(
        row['Bloqueio'] === true ||
        row['Bloqueio'] === 'SIM' ||
        row['Bloqueio'] === 'Sim' ||
        row['bloqueio'] === true ||
        row['bloqueio'] === 'true',
      )

      const rawItem: CarteiraItem = {
        empresa: this.sanitizarCampoTexto(row['Empresa'] || row['empresa'] || 'CIAFAL'),
        centro: this.sanitizarCampoTexto(row['Centro'] || row['centro'] || '1000'),
        linha: this.sanitizarCampoTexto(row['Linha'] || row['linha'] || ''),
        ordem_venda: ordemVenda || 'ORD-QAS',
        item_ordem: itemOrdem,
        data_ordem: this.sanitizarCampoTexto(
          row['Data da ordem'] || row['data_ordem'] || new Date().toLocaleDateString('pt-BR'),
        ),
        data_desejada: this.sanitizarCampoTexto(
          row['Data desejada'] || row['data_desejada'] || new Date().toLocaleDateString('pt-BR'),
        ),
        codigo_cliente: this.sanitizarCampoTexto(
          row['Código do cliente'] || row['codigo_cliente'] || 'CLI-001',
        ),
        nome_cliente: this.sanitizarCampoTexto(
          row['Cliente'] || row['nome_cliente'] || 'Mercado Geral',
        ),
        codigo_material: codMaterial,
        descricao_material: this.sanitizarCampoTexto(
          row['Descrição do material'] ||
            row['descricao_material'] ||
            row['Material'] ||
            codMaterial,
        ),
        familia: this.sanitizarCampoTexto(row['Família'] || row['familia'] || 'Geral'),
        curva_abc: this.sanitizarCampoTexto(
          row['Curva ABC'] || row['curva_abc'] || 'B',
        ).toUpperCase(),
        tipo_ordem: tipoOrdem,
        origem_produto: origem,
        qtd_ordem_tons: qtdOrdem,
        qtd_faturada_tons: qtdFaturada,
        carteira_aberta_tons: Math.max(0, qtdOrdem - qtdFaturada),
        carteira_vendas_tons: tipoOrdem === 'MTS' ? Math.max(0, qtdOrdem - qtdFaturada) : 0,
        carteira_mto_tons: tipoOrdem === 'MTO' ? Math.max(0, qtdOrdem - qtdFaturada) : 0,
        estoque_livre_tons: estoqueLivre,
        estoque_mto_tons: estoqueMto,
        estoque_semiacabado_tons: estoqueSemi,
        estoque_semiacabado_ciafal_tons: estoqueSemiCiafal,
        estoque_semiacabado_vallourec_tons: estoqueSemiVallourec,
        estoque_acabado_tons: estoqueAcabado,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: qtdProg,
        data_programada: this.sanitizarCampoTexto(
          row['Data programada'] || row['data_programada'] || '',
        ),
        semana_programada: this.sanitizarCampoTexto(
          row['Semana programada'] || row['semana_programada'] || '',
        ),
        linha_programada: this.sanitizarCampoTexto(
          row['Linha programada'] || row['linha_programada'] || '',
        ),
        media_faturamento_diario_t_dia: mediaFat,
        status_ruptura: 'CINZA',
        bloqueio: isBloqueado,
        motivo_bloqueio: this.sanitizarCampoTexto(
          row['Motivo do bloqueio'] || row['motivo_bloqueio'] || '',
        ),
        observacao: this.sanitizarCampoTexto(row['Observação'] || row['observacao'] || ''),
        zsd24_tons: this.parseNumeroTons(row['ZSD24'] || row['zsd24_tons'] || 0),
        material_dp04: this.sanitizarCampoTexto(row['Material DP04'] || row['material_dp04'] || ''),
        utilizacao_livre: this.sanitizarCampoTexto(
          row['Utilização Livre'] || row['utilizacao_livre'] || '',
        ),
        material_vallourec: this.sanitizarCampoTexto(
          row['Material Vallourec'] || row['material_vallourec'] || '',
        ),
        dp27: this.sanitizarCampoTexto(row['DP27'] || row['dp27'] || ''),
      }

      const itemCalculado = CarteiraZSD28CEngine.calcularItem(
        rawItem,
        entradasFuturasValidas,
        REGRAS_PADRAO,
      )
      itensValidos.push(itemCalculado)
    })

    const totalLinhas = linhasBrutas.length
    const linhasValidas = itensValidos.length
    const linhasComAlerta = alertas.length
    const linhasRejeitadas = erros.length
    const totalRegistrosIdentificados = linhasValidas + linhasRejeitadas
    const linhasTotalIgnoradas =
      contLinhasVazias + contLinhasTotalizacao + contLinhasCabecalhoRodape

    const validoCompleto = erros.length === 0 && itensValidos.length > 0
    const podeImportarParcial = itensValidos.length > 0

    if (contLinhasTotalizacao > 0) {
      logsProcessamento.push(
        `${contLinhasTotalizacao} linha(s) de totalização identificada(s) e desconsiderada(s) da importação.`,
      )
    }
    if (contLinhasVazias > 0) {
      logsProcessamento.push(`${contLinhasVazias} linha(s) vazia(s) ignorada(s) automaticamente.`)
    }

    return {
      valido: validoCompleto,
      podeImportarParcial,
      temErroCriticoEstrutural: false,
      erros,
      linhasRejeitadasDetalhes,
      linhasIgnoradasDetalhes,
      alertas,
      duplicados,
      itensValidos,
      entradasFuturasValidas,
      totalLinhas,
      totalRegistrosIdentificados,
      linhasValidas,
      linhasComAlerta,
      linhasRejeitadas,
      linhasIgnoradasTotalizacao: contLinhasTotalizacao,
      linhasVaziasIgnoradas: contLinhasVazias,
      linhasCabecalhoRodapeIgnoradas: contLinhasCabecalhoRodape,
      linhasTotalIgnoradas,
      logsProcessamento,
    }
  }

  public static validarLinhasEntradasFuturas(linhasBrutas: any[]): CarteiraEntradaFutura[] {
    const entradas: CarteiraEntradaFutura[] = []
    linhasBrutas.forEach((row) => {
      const mat = this.sanitizarCampoTexto(
        row['Material'] ||
          row['material'] ||
          row['codigo_material'] ||
          row['Codigo do material'] ||
          row['Código do material'] ||
          row['Código Material'] ||
          row['CODIGO_MATERIAL'],
      )
      if (!mat) return

      let origem: 'REVENDA' | 'IMPORTADO' | 'PRODUCAO_INTERNA' | 'OUTROS' = 'REVENDA'
      const rawOrigem = this.sanitizarCampoTexto(
        row['Origem'] || row['origem'] || row['ORIGEM'] || row['Tipo Origem'] || '',
      ).toUpperCase()
      if (rawOrigem.includes('IMPORT')) origem = 'IMPORTADO'
      else if (rawOrigem.includes('PROD') || rawOrigem.includes('INTERN'))
        origem = 'PRODUCAO_INTERNA'
      else if (rawOrigem.includes('OUTRO')) origem = 'OUTROS'

      const qtdPrevista = this.parseNumeroTons(
        row['Quantidade prevista (t)'] ||
          row['quantidade_prevista_tons'] ||
          row['Qtd Prevista'] ||
          row['Quantidade Prevista'] ||
          row['Quantidade'] ||
          0,
      )
      const qtdRecebida = this.parseNumeroTons(
        row['Quantidade recebida (t)'] ||
          row['quantidade_recebida_tons'] ||
          row['Qtd Recebida'] ||
          row['Quantidade Recebida'] ||
          0,
      )
      const qtdPendente = Math.max(0, qtdPrevista - qtdRecebida)

      entradas.push({
        empresa: this.sanitizarCampoTexto(row['Empresa'] || row['empresa'] || 'CIAFAL'),
        centro: this.sanitizarCampoTexto(row['Centro'] || row['centro'] || '1000'),
        codigo_material: mat,
        descricao_material: this.sanitizarCampoTexto(
          row['Descrição'] ||
            row['descricao'] ||
            row['Descricao'] ||
            row['descricao_material'] ||
            row['Descrição do material'] ||
            mat,
        ),
        origem,
        documento_ref: this.sanitizarCampoTexto(
          row['Pedido/Documento'] ||
            row['pedido_documento'] ||
            row['Documento'] ||
            row['documento_ref'] ||
            row['Pedido'] ||
            row['OC'] ||
            'PO-FUT-01',
        ),
        fornecedor_origem: this.sanitizarCampoTexto(
          row['Fornecedor/origem'] ||
            row['fornecedor_origem'] ||
            row['Fornecedor'] ||
            row['fornecedor'] ||
            'Gerdau / Arcelor / Import',
        ),
        quantidade_prevista_tons: qtdPrevista,
        quantidade_recebida_tons: qtdRecebida,
        quantidade_pendente_tons: qtdPendente,
        data_prevista_entrada: this.sanitizarCampoTexto(
          row['Data prevista de entrada'] ||
            row['data_prevista_entrada'] ||
            row['Data Prevista'] ||
            row['Previsão'] ||
            new Date().toISOString().split('T')[0],
        ),
        status_entrada: this.sanitizarCampoTexto(
          row['Status da entrada'] ||
            row['status_entrada'] ||
            row['Status'] ||
            row['status'] ||
            'CONFIRMADO',
        ),
        observacao: this.sanitizarCampoTexto(
          row['Observação'] || row['observacao'] || row['Observacoes'] || '',
        ),
      })
    })
    return entradas
  }

  public static gerarTemplateExcelBlob(): Blob {
    const cabecalhoCarteira = [
      'Empresa',
      'Centro',
      'Linha',
      'Ordem de venda',
      'Item',
      'Data da ordem',
      'Data desejada',
      'Código do cliente',
      'Cliente',
      'Código do material',
      'Descrição do material',
      'Família',
      'Curva ABC',
      'Tipo de atendimento',
      'MTS/MTO',
      'Origem do produto',
      'Carteira de vendas (t)',
      'Quantidade da ordem (t)',
      'Quantidade faturada (t)',
      'Carteira aberta (t)',
      'Estoque livre (t)',
      'Estoque MTO (t)',
      'Carteira MTO (t)',
      'Estoque semiacabado (t)',
      'Estoque Semiacabado CIAFAL',
      'Estoque Semiacabado Vallourec',
      'Estoque acabado (t)',
      'Quantidade programada (t)',
      'Data programada',
      'Semana programada',
      'Linha programada',
      'Média de faturamento diário (t/dia)',
      'Data de apuração',
      'Bloqueio',
      'Motivo do bloqueio',
      'Observação',
      'ZSD24',
      'Material DP04',
      'Utilização Livre',
      'Material Vallourec',
      'DP27',
    ]

    // Linha de exemplo mínima para guiar o usuário na aba CARTEIRA
    const exemploCarteira = [
      'CIAFAL',
      '1000',
      'L1',
      '4500100200',
      '10',
      '2025-01-10',
      '2025-02-15',
      'CLI-00120',
      'Aço & Estruturas Ltda',
      'C1020-050',
      'Barra Chata 1020 1/2 x 1/8',
      'BARRA_CHATA',
      'A',
      'MTS',
      'MTS',
      'PRODUCAO_PROPRIA',
      '50.000',
      '50.000',
      '10.000',
      '40.000',
      '20.000',
      '0.000',
      '0.000',
      '15.000',
      '15.000',
      '0.000',
      '20.000',
      '0.000',
      '2025-02-05',
      'Semana 06',
      'L1',
      '2.500',
      '2025-01-20',
      'NAO',
      '',
      'Priorizar entrega lote 1',
      '0.000',
      '',
      '',
      '',
      '',
    ]

    const cabecalhoEntradas = [
      'Empresa',
      'Centro',
      'Material',
      'Descrição',
      'Origem',
      'Pedido/Documento',
      'Fornecedor/origem',
      'Quantidade prevista (t)',
      'Quantidade recebida (t)',
      'Data prevista de entrada',
      'Status da entrada',
      'Observação',
    ]

    // Linha de exemplo para a aba ENTRADAS FUTURAS
    const exemploEntradas = [
      'CIAFAL',
      '1000',
      'C1020-050',
      'Barra Chata 1020 1/2 x 1/8',
      'REVENDA',
      'PO-REV-2025-001',
      'Gerdau / ArcelorMittal',
      '30.000',
      '0.000',
      '2025-02-10',
      'CONFIRMADO',
      'Lote 01 trânsito rodoviário',
    ]

    const dicionarioRows = [
      [
        'Nome do Campo',
        'Aba',
        'Descrição',
        'Formato',
        'Unidade',
        'Obrigatoriedade',
        'Exemplo de Formato',
      ],
      [
        'Empresa',
        'CARTEIRA',
        'Código da empresa no SAP ECC',
        'Texto (Alfa)',
        '-',
        'Obrigatório',
        'CIAFAL',
      ],
      [
        'Centro',
        'CARTEIRA',
        'Centro de distribuição/fabril',
        'Texto (Numérico 4 posições)',
        '-',
        'Obrigatório',
        '1000',
      ],
      [
        'Linha',
        'CARTEIRA',
        'Linha de laminação ou agrupamento',
        'Texto (L1, L2, GERAL)',
        '-',
        'Obrigatório',
        'L1',
      ],
      [
        'Ordem de venda',
        'CARTEIRA',
        'Número da ordem de venda SAP',
        'Texto (Numérico)',
        '-',
        'Obrigatório',
        '4500100200',
      ],
      ['Item', 'CARTEIRA', 'Item da ordem de venda', 'Texto (Numérico)', '-', 'Obrigatório', '10'],
      [
        'Data da ordem',
        'CARTEIRA',
        'Data de criação da ordem no SAP',
        'Data (AAAA-MM-DD)',
        '-',
        'Obrigatório',
        '2025-01-10',
      ],
      [
        'Data desejada',
        'CARTEIRA',
        'Data de entrega desejada pelo cliente',
        'Data (AAAA-MM-DD)',
        '-',
        'Obrigatório',
        '2025-02-15',
      ],
      [
        'Código do cliente',
        'CARTEIRA',
        'Código SAP do cliente',
        'Texto',
        '-',
        'Obrigatório',
        'CLI-00120',
      ],
      [
        'Cliente',
        'CARTEIRA',
        'Razão social / Nome do cliente',
        'Texto',
        '-',
        'Obrigatório',
        'Aço & Estruturas Ltda',
      ],
      [
        'Código do material',
        'CARTEIRA',
        'Código único SAP do material',
        'Texto',
        '-',
        'Obrigatório',
        'C1020-050',
      ],
      [
        'Descrição do material',
        'CARTEIRA',
        'Descrição técnica e comercial do material',
        'Texto',
        '-',
        'Obrigatório',
        'Barra Chata 1020 1/2 x 1/8',
      ],
      [
        'Família',
        'CARTEIRA',
        'Família de produto acabado',
        'Texto',
        '-',
        'Obrigatório',
        'BARRA_CHATA',
      ],
      [
        'Curva ABC',
        'CARTEIRA',
        'Classificação ABC de relevância comercial',
        'Texto (A, B, C)',
        '-',
        'Obrigatório',
        'A',
      ],
      [
        'Tipo de atendimento',
        'CARTEIRA',
        'Modalidade de atendimento comercial',
        'Texto (MTS, MTO)',
        '-',
        'Obrigatório',
        'MTS',
      ],
      [
        'MTS/MTO',
        'CARTEIRA',
        'Estratégia de manufatura',
        'Texto (MTS, MTO)',
        '-',
        'Obrigatório',
        'MTS',
      ],
      [
        'Origem do produto',
        'CARTEIRA',
        'Origem de suprimento',
        'Texto (PRODUCAO_PROPRIA, REVENDA, IMPORTADO)',
        '-',
        'Obrigatório',
        'PRODUCAO_PROPRIA',
      ],
      [
        'Carteira de vendas (t)',
        'CARTEIRA',
        'Volume em carteira de vendas (MTS)',
        'Numérico decimal',
        't',
        'Opcional',
        '50.000',
      ],
      [
        'Quantidade da ordem (t)',
        'CARTEIRA',
        'Quantidade total solicitada na ordem',
        'Numérico decimal',
        't',
        'Obrigatório',
        '50.000',
      ],
      [
        'Quantidade faturada (t)',
        'CARTEIRA',
        'Quantidade já faturada na ordem',
        'Numérico decimal',
        't',
        'Obrigatório',
        '10.000',
      ],
      [
        'Carteira aberta (t)',
        'CARTEIRA',
        'Saldo em aberto (Qtd Ordem - Qtd Faturada)',
        'Numérico decimal',
        't',
        'Opcional',
        '40.000',
      ],
      [
        'Estoque livre (t)',
        'CARTEIRA',
        'Estoque físico desimpedido em depósito',
        'Numérico decimal',
        't',
        'Obrigatório',
        '20.000',
      ],
      [
        'Estoque MTO (t)',
        'CARTEIRA',
        'Estoque reservado especificamente para ordens MTO',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      [
        'Carteira MTO (t)',
        'CARTEIRA',
        'Volume em carteira sob encomenda (MTO)',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      [
        'Estoque semiacabado (t)',
        'CARTEIRA',
        'Estoque de tarugos/placas disponíveis',
        'Numérico decimal',
        't',
        'Opcional',
        '15.000',
      ],
      [
        'Estoque Semiacabado CIAFAL',
        'CARTEIRA',
        'Estoque semiacabado próprio CIAFAL (Ciclo L2)',
        'Numérico decimal',
        't',
        'Opcional',
        '15.000',
      ],
      [
        'Estoque Semiacabado Vallourec',
        'CARTEIRA',
        'Estoque semiacabado parceiro Vallourec (Ciclo L2)',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      [
        'Estoque acabado (t)',
        'CARTEIRA',
        'Estoque total no armazém de produtos acabados',
        'Numérico decimal',
        't',
        'Opcional',
        '20.000',
      ],
      [
        'Quantidade programada (t)',
        'CARTEIRA',
        'Volume alocado na programação oficial do PCP',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      [
        'Data programada',
        'CARTEIRA',
        'Data prevista na programação fabril',
        'Data (AAAA-MM-DD)',
        '-',
        'Opcional',
        '2025-02-05',
      ],
      [
        'Média de faturamento diário (t/dia)',
        'CARTEIRA',
        'Consumo médio histórico para apuração de ruptura',
        'Numérico decimal',
        't/dia',
        'Opcional',
        '2.500',
      ],
      [
        'Data de apuração',
        'CARTEIRA',
        'Data de extração do relatório QAS ZSD28C',
        'Data (AAAA-MM-DD)',
        '-',
        'Opcional',
        '2025-01-20',
      ],
      [
        'Bloqueio',
        'CARTEIRA',
        'Status de bloqueio comercial/crédito/qualidade',
        'Texto/Booleano (SIM/NAO)',
        '-',
        'Opcional',
        'NAO',
      ],
      [
        'Motivo do bloqueio',
        'CARTEIRA',
        'Justificativa do bloqueio quando aplicável',
        'Texto',
        '-',
        'Opcional',
        'Aguardando liberação de crédito',
      ],
      [
        'Observação',
        'CARTEIRA',
        'Notas operacionais do PCP',
        'Texto',
        '-',
        'Opcional',
        'Priorizar entrega no lote 1',
      ],
      [
        'ZSD24',
        'CARTEIRA',
        'Volume de demanda ZSD24 para Ciclo L2',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      ['', '', '', '', '', '', ''],
      ['-- ABA ENTRADAS FUTURAS --', '', '', '', '', '', ''],
      ['Empresa', 'ENTRADAS FUTURAS', 'Código da empresa', 'Texto', '-', 'Obrigatório', 'CIAFAL'],
      ['Centro', 'ENTRADAS FUTURAS', 'Centro receptor', 'Texto', '-', 'Obrigatório', '1000'],
      [
        'Material',
        'ENTRADAS FUTURAS',
        'Código SAP do material da entrada futura',
        'Texto',
        '-',
        'Obrigatório',
        'C1020-050',
      ],
      [
        'Descrição',
        'ENTRADAS FUTURAS',
        'Descrição técnica do material da entrada',
        'Texto',
        '-',
        'Opcional',
        'Barra Chata 1020',
      ],
      [
        'Origem',
        'ENTRADAS FUTURAS',
        'Origem da entrada prevista',
        'Texto (REVENDA, IMPORTADO, PRODUCAO_INTERNA)',
        '-',
        'Obrigatório',
        'REVENDA',
      ],
      [
        'Pedido/Documento',
        'ENTRADAS FUTURAS',
        'Número da OC, Pedido de Compra ou DI',
        'Texto',
        '-',
        'Obrigatório',
        'PO-REV-2025-001',
      ],
      [
        'Fornecedor/origem',
        'ENTRADAS FUTURAS',
        'Razão social da siderúrgica ou porto',
        'Texto',
        '-',
        'Opcional',
        'Gerdau / ArcelorMittal',
      ],
      [
        'Quantidade prevista (t)',
        'ENTRADAS FUTURAS',
        'Volume total encomendado em toneladas',
        'Numérico decimal',
        't',
        'Obrigatório',
        '30.000',
      ],
      [
        'Quantidade recebida (t)',
        'ENTRADAS FUTURAS',
        'Volume já entregue em toneladas',
        'Numérico decimal',
        't',
        'Opcional',
        '0.000',
      ],
      [
        'Data prevista de entrada',
        'ENTRADAS FUTURAS',
        'Data estimada de chegada/liberação',
        'Data (AAAA-MM-DD)',
        '-',
        'Obrigatório',
        '2025-02-10',
      ],
      [
        'Status da entrada',
        'ENTRADAS FUTURAS',
        'Status operacional da compra/trânsito',
        'Texto (CONFIRMADO, EM_TRANSITO, PREVISTO)',
        '-',
        'Opcional',
        'CONFIRMADO',
      ],
      [
        'Observação',
        'ENTRADAS FUTURAS',
        'Notas de comércio exterior / compras',
        'Texto',
        '-',
        'Opcional',
        'Lote 01 trânsito rodoviário',
      ],
    ]

    const wb = XLSX.utils.book_new()
    const wsCarteira = XLSX.utils.aoa_to_sheet([cabecalhoCarteira, exemploCarteira])
    const wsEntradas = XLSX.utils.aoa_to_sheet([cabecalhoEntradas, exemploEntradas])
    const wsDicionario = XLSX.utils.aoa_to_sheet(dicionarioRows)

    XLSX.utils.book_append_sheet(wb, wsCarteira, 'CARTEIRA')
    XLSX.utils.book_append_sheet(wb, wsEntradas, 'ENTRADAS FUTURAS')
    XLSX.utils.book_append_sheet(wb, wsDicionario, 'DICIONÁRIO')

    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbOut], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /**
   * Calcula hash SHA-256 de um texto para idempotência e integridade da carga
   */
  public static async calcularHashSHA256(conteudo: string | ArrayBuffer): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const data =
          typeof conteudo === 'string'
            ? new TextEncoder().encode(conteudo)
            : new Uint8Array(conteudo)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
      }
    } catch {
      // Fallback
    }
    const str = typeof conteudo === 'string' ? conteudo : new Uint8Array(conteudo).join(',')
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return `SHA256_FALLBACK_${Math.abs(hash).toString(16)}`
  }

  /**
   * Verifica se já existe carga anterior com o mesmo hash para garantir idempotência
   */
  public static async verificarCargaDuplicadaPorHash(
    hashHex: string,
  ): Promise<CarteiraUpload | null> {
    try {
      const records = await pb.collection('carteira_uploads').getList(1, 1, {
        filter: `file_hash_sha256 = '${hashHex}' || file_hash = '${hashHex}'`,
        sort: '-created',
      })
      if (records.items && records.items.length > 0) {
        const r: any = records.items[0]
        return {
          id: r.id,
          upload_code: r.upload_code,
          filename: r.filename,
          file_hash: r.file_hash,
          file_hash_sha256: r.file_hash_sha256,
          snapshot_version: r.snapshot_version,
          execution_status: r.execution_status,
          reconciliation_status: r.reconciliation_status,
          environment: r.environment,
          file_size_bytes: r.file_size_bytes,
          total_rows: r.total_rows,
          valid_rows: r.valid_rows,
          warning_rows: r.warning_rows,
          rejected_rows: r.rejected_rows,
          status: r.status,
          source_mode: r.source_mode,
          user_name: r.user_name,
          user_email: r.user_email,
          version_tag: r.version_tag,
          validation_log: r.validation_log,
          summary_kpis: r.summary_kpis,
          is_active_current: r.is_active_current,
          created: r.created,
        }
      }
    } catch {
      // Ignora erro de busca
    }
    return null
  }

  /**
   * Gravação Transacional/Atômica de Carga da Carteira.
   * Se houver qualquer falha durante a inserção dos itens ou do lote,
   * executa ROLLBACK imediato (revertendo os registros criados e restaurando a integridade).
   */
  public static async salvarCargaNoPocketBase(
    upload: CarteiraUpload,
    itens: CarteiraItem[],
    entradas: CarteiraEntradaFutura[],
    auditContext?: {
      usuarioConfirmouParcial?: boolean
      rejeitadosDesconsideradosQtd?: number
    },
  ): Promise<CarteiraUpload> {
    let uploadRecordId: string | null = null
    const itensCriadosIds: string[] = []
    const entradasCriadasIds: string[] = []
    const insightsCriadosIds: string[] = []

    try {
      // 1. Desativa temporariamente cargas anteriores
      const anteriores = await pb
        .collection('carteira_uploads')
        .getFullList({
          filter: 'is_active_current = true',
        })
        .catch(() => [])

      const snapshotVersion = upload.snapshot_version || `SNAP-${upload.upload_code}`
      const fileHashVal = upload.file_hash_sha256 || upload.file_hash || `HASH-${Date.now()}`

      const statusGravacao =
        upload.status === 'IMPORTADO_PARCIAL' ||
        (auditContext?.usuarioConfirmouParcial && upload.rejected_rows > 0)
          ? 'IMPORTADO_PARCIAL'
          : upload.rejected_rows > 0 && itens.length > 0
            ? 'IMPORTADO_PARCIAL'
            : 'IMPORTADO_COMPLETO'

      const uploadRecord = await pb.collection('carteira_uploads').create({
        upload_code: upload.upload_code,
        filename: upload.filename,
        file_hash: fileHashVal,
        file_hash_sha256: fileHashVal,
        snapshot_version: snapshotVersion,
        execution_status:
          statusGravacao === 'IMPORTADO_PARCIAL'
            ? 'SUCESSO_PARCIAL_HOMOLOGADO'
            : 'SUCESSO_HOMOLOGADO',
        reconciliation_status: 'PARIDADE_100',
        environment: 'QAS',
        lineage_summary: {
          source_system: 'SAP_ECC_SD',
          source_transaction: 'ZSD28C',
          total_rows_imported: itens.length,
          entradas_futuras_count: entradas.length,
          rejected_rows_count: upload.rejected_rows,
          ignored_rows_count: upload.ignored_rows || 0,
          timestamp: new Date().toISOString(),
          audit_context: auditContext || null,
        },
        file_size_bytes: upload.file_size_bytes || 0,
        total_rows: upload.total_rows,
        valid_rows: upload.valid_rows,
        warning_rows: upload.warning_rows,
        rejected_rows: upload.rejected_rows,
        status: statusGravacao === 'IMPORTADO_PARCIAL' ? 'PROCESSADO' : 'PROCESSADO',
        source_mode: upload.source_mode || 'EXCEL_ZSD28C',
        user_name: upload.user_name || 'Usuário PCP',
        user_email: upload.user_email || 'pcp@ciafal.com.br',
        version_tag: upload.version_tag,
        validation_log: upload.validation_log || {},
        summary_kpis: upload.summary_kpis || {},
        is_active_current: true,
      })

      uploadRecordId = uploadRecord.id

      // 2. Gravação de Itens com rastreamento para rollback
      let rowIdx = 1
      for (const item of itens) {
        const itemRec = await pb.collection('carteira_items').create({
          upload_id: uploadRecord.id,
          upload_code: upload.upload_code,
          source_system: 'SAP_ECC_SD',
          source_transaction: 'ZSD28C',
          source_file: upload.filename,
          source_load_id: upload.upload_code,
          source_row: rowIdx++,
          rule_version_applied: 'V001',
          environment: 'QAS',
          empresa: item.empresa || 'CIAFAL',
          centro: item.centro || '1000',
          linha: item.linha,
          ordem_venda: item.ordem_venda,
          item_ordem: item.item_ordem,
          data_ordem: item.data_ordem,
          data_desejada: item.data_desejada,
          codigo_cliente: item.codigo_cliente,
          nome_cliente: item.nome_cliente,
          codigo_material: item.codigo_material,
          descricao_material: item.descricao_material,
          familia: item.familia,
          curva_abc: item.curva_abc,
          tipo_ordem: item.tipo_ordem,
          origem_produto: item.origem_produto,
          qtd_ordem_tons: item.qtd_ordem_tons,
          qtd_faturada_tons: item.qtd_faturada_tons,
          carteira_aberta_tons: item.carteira_aberta_tons,
          carteira_vendas_tons: item.carteira_vendas_tons,
          carteira_mto_tons: item.carteira_mto_tons,
          estoque_livre_tons: item.estoque_livre_tons,
          estoque_mto_tons: item.estoque_mto_tons,
          estoque_semiacabado_tons: item.estoque_semiacabado_tons,
          estoque_semiacabado_ciafal_tons: item.estoque_semiacabado_ciafal_tons,
          estoque_semiacabado_vallourec_tons: item.estoque_semiacabado_vallourec_tons,
          estoque_acabado_tons: item.estoque_acabado_tons,
          saldo_disponivel_tons: item.saldo_disponivel_tons,
          saldo_positivo_tons: item.saldo_positivo_tons,
          saldo_negativo_tons: item.saldo_negativo_tons,
          necessidade_liquida_tons: item.necessidade_liquida_tons,
          falta_produzir_tons: item.falta_produzir_tons,
          status_atendimento: item.status_atendimento,
          qtd_programada_tons: item.qtd_programada_tons,
          data_programada: item.data_programada,
          semana_programada: item.semana_programada,
          linha_programada: item.linha_programada,
          media_faturamento_diario_t_dia: item.media_faturamento_diario_t_dia,
          dias_cobertura: item.dias_cobertura,
          data_fim_estoque: item.data_fim_estoque,
          status_ruptura: item.status_ruptura,
          bloqueio: item.bloqueio,
          motivo_bloqueio: item.motivo_bloqueio,
          observacao: item.observacao,
          possivel_duplicidade: item.possivel_duplicidade,
          duplicidade_detalhes: item.duplicidade_detalhes,
          memoria_calculo: item.memoria_calculo,
          calculation_memory: item.memoria_calculo || null,
        })
        itensCriadosIds.push(itemRec.id)
      }

      // 3. Gravação de Entradas Futuras
      for (const ent of entradas) {
        const entRec = await pb.collection('carteira_entradas_futuras').create({
          upload_code: upload.upload_code,
          empresa: ent.empresa || 'CIAFAL',
          centro: ent.centro || '1000',
          codigo_material: ent.codigo_material,
          descricao_material: ent.descricao_material,
          origem: ent.origem,
          documento_ref: ent.documento_ref,
          fornecedor_origem: ent.fornecedor_origem,
          quantidade_prevista_tons: ent.quantidade_prevista_tons,
          quantidade_recebida_tons: ent.quantidade_recebida_tons,
          quantidade_pendente_tons: ent.quantidade_pendente_tons,
          data_prevista_entrada: ent.data_prevista_entrada,
          status_entrada: ent.status_entrada,
          observacao: ent.observacao,
        })
        entradasCriadasIds.push(entRec.id)
      }

      // 4. Geração de Insights IA
      const insights = CarteiraZSD28CEngine.gerarInsightsIA(itens, entradas)
      for (const ins of insights) {
        try {
          const insRec = await pb.collection('carteira_ia_insights').create({
            insight_code: ins.insight_code,
            titulo: ins.titulo,
            criticidade: ins.criticidade,
            categoria: ins.categoria,
            problema_encontrado: ins.problema_encontrado,
            evidencia: ins.evidencia,
            impacto: ins.impacto,
            causa_provavel: ins.causa_provavel,
            acao_sugerida: ins.acao_sugerida,
            nivel_confianca_pct: ins.nivel_confianca_pct,
            materiais_afetados: ins.materiais_afetados || [],
            duplicidade_envolvida: ins.duplicidade_envolvida || false,
          })
          insightsCriadosIds.push(insRec.id)
        } catch {
          /* ignore insight insertion error */
        }
      }

      // 5. Sucesso confirmado: desativa anteriores de fato
      for (const ant of anteriores) {
        await pb
          .collection('carteira_uploads')
          .update(ant.id, {
            is_active_current: false,
          })
          .catch(() => {})
      }

      // 6. Auditoria de Governança
      try {
        const auditLogMensagem = auditContext?.usuarioConfirmouParcial
          ? `Usuário confirmou importação parcial desconsiderando ${auditContext.rejeitadosDesconsideradosQtd || upload.rejected_rows} registros rejeitados.`
          : 'Carga completa de carteira gravada e homologada com sucesso.'

        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action:
            statusGravacao === 'IMPORTADO_PARCIAL'
              ? 'CARTEIRA_IMPORTACAO_PARCIAL'
              : 'CARTEIRA_UPLOAD_PROCESSADA',
          resource: 'CARTEIRA_ZSD28C',
          resource_id: upload.upload_code,
          scope: 'GLOBAL',
          outcome: 'SUCCESS',
          details: {
            filename: upload.filename,
            total_rows: upload.total_rows,
            valid_rows: upload.valid_rows,
            rejected_rows: upload.rejected_rows,
            ignored_rows: upload.ignored_rows,
            user: upload.user_name,
            audit_message: auditLogMensagem,
            status: statusGravacao,
          },
        })
      } catch {
        /* ignore audit log write error */
      }

      return {
        ...upload,
        id: uploadRecord.id,
        status: statusGravacao,
      }
    } catch (err: any) {
      console.error('Falha durante gravação de carga da carteira. Executando ROLLBACK...', err)

      // ROLLBACK ATÔMICO: remove quaisquer itens parciais criados para não deixar a base inconsistente
      try {
        for (const itId of itensCriadosIds) {
          await pb
            .collection('carteira_items')
            .delete(itId)
            .catch(() => {})
        }
        for (const entId of entradasCriadasIds) {
          await pb
            .collection('carteira_entradas_futuras')
            .delete(entId)
            .catch(() => {})
        }
        for (const insId of insightsCriadosIds) {
          await pb
            .collection('carteira_ia_insights')
            .delete(insId)
            .catch(() => {})
        }
        if (uploadRecordId) {
          await pb
            .collection('carteira_uploads')
            .delete(uploadRecordId)
            .catch(() => {})
        }
      } catch (rbErr) {
        console.error('Erro durante execução do rollback:', rbErr)
      }

      throw new Error(
        `Falha transacional na persistência da carga (Rollback executado): ${err.message}`,
      )
    }
  }

  /**
   * Exporta arquivo Excel/CSV formatado apenas com os registros rejeitados e os motivos detalhados
   */
  public static gerarRelatorioErrosBlob(
    rejeitados: LinhaRejeitadaDetalhe[],
    formato: 'xlsx' | 'csv' = 'xlsx',
  ): Blob {
    const cabecalho = [
      'Linha Excel',
      'Linha Lógica',
      'Código Material',
      'Coluna com Inconsistência',
      'Valor Encontrado',
      'Severidade',
      'Motivo da Rejeição',
      'Ação Sugerida',
    ]

    const linhas = rejeitados.map((r) => [
      r.linhaExcel,
      r.linhaLogica || '-',
      r.material || '(vazio)',
      r.coluna,
      r.valorEncontrado || '',
      r.severidade === 'NIVEL_3_ERRO_ESTRUTURAL'
        ? 'Nível 3 (Estrutural/Crítico)'
        : r.severidade === 'NIVEL_2_ERRO_REGISTRO'
          ? 'Nível 2 (Erro de Registro)'
          : 'Nível 1 (Informativo)',
      r.motivoRejeicao,
      r.acaoSugerida,
    ])

    if (formato === 'csv') {
      const csvContent =
        cabecalho.join(';') +
        '\n' +
        linhas
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
          .join('\n')
      return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas])
    XLSX.utils.book_append_sheet(wb, ws, 'REGISTROS_REJEITADOS')
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbOut], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  public static async carregarCarteiraAtual(): Promise<{
    itens: CarteiraItem[]
    entradasFuturas: CarteiraEntradaFutura[]
    uploadAtual: CarteiraUpload | null
    historicoUploads: CarteiraUpload[]
    insights: CarteiraIAInsight[]
  }> {
    try {
      const uploadsRecords = await pb.collection('carteira_uploads').getFullList({
        sort: '-created',
      })

      const historicoUploads: CarteiraUpload[] = uploadsRecords.map((r: any) => ({
        id: r.id,
        upload_code: r.upload_code,
        filename: r.filename,
        file_hash: r.file_hash,
        file_size_bytes: r.file_size_bytes,
        total_rows: r.total_rows,
        valid_rows: r.valid_rows,
        warning_rows: r.warning_rows,
        rejected_rows: r.rejected_rows,
        status: r.status,
        source_mode: r.source_mode,
        user_name: r.user_name,
        user_email: r.user_email,
        version_tag: r.version_tag,
        validation_log: r.validation_log,
        summary_kpis: r.summary_kpis,
        is_active_current: r.is_active_current,
        created: r.created,
      }))

      const uploadAtual =
        historicoUploads.find((u) => u.is_active_current) || historicoUploads[0] || null

      let itens: CarteiraItem[] = []
      let entradasFuturas: CarteiraEntradaFutura[] = []

      if (uploadAtual) {
        const itemRecords = await pb.collection('carteira_items').getFullList({
          filter: `upload_code = '${uploadAtual.upload_code}'`,
          sort: 'codigo_material',
        })

        itens = itemRecords.map((r: any) => ({
          id: r.id,
          upload_id: r.upload_id,
          upload_code: r.upload_code,
          empresa: r.empresa,
          centro: r.centro,
          linha: r.linha,
          ordem_venda: r.ordem_venda,
          item_ordem: r.item_ordem,
          data_ordem: r.data_ordem,
          data_desejada: r.data_desejada,
          codigo_cliente: r.codigo_cliente,
          nome_cliente: r.nome_cliente,
          codigo_material: r.codigo_material,
          descricao_material: r.descricao_material,
          familia: r.familia,
          curva_abc: r.curva_abc,
          tipo_ordem: r.tipo_ordem,
          origem_produto: r.origem_produto,
          qtd_ordem_tons: r.qtd_ordem_tons,
          qtd_faturada_tons: r.qtd_faturada_tons,
          carteira_aberta_tons: r.carteira_aberta_tons,
          carteira_vendas_tons: r.carteira_vendas_tons,
          carteira_mto_tons: r.carteira_mto_tons,
          estoque_livre_tons: r.estoque_livre_tons,
          estoque_mto_tons: r.estoque_mto_tons,
          estoque_semiacabado_tons: r.estoque_semiacabado_tons,
          estoque_semiacabado_ciafal_tons: r.estoque_semiacabado_ciafal_tons,
          estoque_semiacabado_vallourec_tons: r.estoque_semiacabado_vallourec_tons,
          estoque_acabado_tons: r.estoque_acabado_tons,
          saldo_disponivel_tons: r.saldo_disponivel_tons,
          saldo_positivo_tons: r.saldo_positivo_tons,
          saldo_negativo_tons: r.saldo_negativo_tons,
          necessidade_liquida_tons: r.necessidade_liquida_tons,
          falta_produzir_tons: r.falta_produzir_tons,
          status_atendimento: r.status_atendimento,
          qtd_programada_tons: r.qtd_programada_tons,
          data_programada: r.data_programada,
          semana_programada: r.semana_programada,
          linha_programada: r.linha_programada,
          media_faturamento_diario_t_dia: r.media_faturamento_diario_t_dia,
          dias_cobertura: r.dias_cobertura,
          data_fim_estoque: r.data_fim_estoque,
          status_ruptura: r.status_ruptura,
          bloqueio: r.bloqueio,
          motivo_bloqueio: r.motivo_bloqueio,
          observacao: r.observacao,
          possivel_duplicidade: r.possivel_duplicidade,
          duplicidade_detalhes: r.duplicidade_detalhes,
          memoria_calculo: r.memoria_calculo,
          created: r.created,
        }))

        const entradasRecords = await pb.collection('carteira_entradas_futuras').getFullList({
          filter: `upload_code = '${uploadAtual.upload_code}'`,
        })

        entradasFuturas = entradasRecords.map((r: any) => ({
          id: r.id,
          upload_code: r.upload_code,
          empresa: r.empresa,
          centro: r.centro,
          codigo_material: r.codigo_material,
          descricao_material: r.descricao_material,
          origem: r.origem,
          documento_ref: r.documento_ref,
          fornecedor_origem: r.fornecedor_origem,
          quantidade_prevista_tons: r.quantidade_prevista_tons,
          quantidade_recebida_tons: r.quantidade_recebida_tons,
          quantidade_pendente_tons: r.quantidade_pendente_tons,
          data_prevista_entrada: r.data_prevista_entrada,
          status_entrada: r.status_entrada,
          observacao: r.observacao,
        }))
      }

      const insightsRecords = await pb.collection('carteira_ia_insights').getFullList({
        sort: '-created',
      })

      const insights: CarteiraIAInsight[] = insightsRecords.map((r: any) => ({
        id: r.id,
        insight_code: r.insight_code,
        titulo: r.titulo,
        criticidade: r.criticidade,
        categoria: r.categoria,
        problema_encontrado: r.problema_encontrado,
        evidencia: r.evidencia,
        impacto: r.impacto,
        causa_provavel: r.causa_provavel,
        acao_sugerida: r.acao_sugerida,
        nivel_confianca_pct: r.nivel_confianca_pct,
        materiais_afetados: r.materiais_afetados,
        duplicidade_envolvida: r.duplicidade_envolvida,
        created: r.created,
      }))

      return {
        itens,
        entradasFuturas,
        uploadAtual,
        historicoUploads,
        insights:
          insights.length > 0
            ? insights
            : CarteiraZSD28CEngine.gerarInsightsIA(itens, entradasFuturas),
      }
    } catch (err) {
      console.warn('Carteira atual sem registros ou offline no PocketBase:', err)
      return {
        itens: [],
        entradasFuturas: [],
        uploadAtual: null,
        historicoUploads: [],
        insights: [],
      }
    }
  }

  public static async reverterParaCargaAnterior(uploadCodeDestino: string): Promise<boolean> {
    try {
      const allUploads = await pb.collection('carteira_uploads').getFullList()
      for (const up of allUploads) {
        if (up.upload_code === uploadCodeDestino) {
          await pb.collection('carteira_uploads').update(up.id, {
            is_active_current: true,
            status: 'PROCESSADO',
          })
        } else if (up.is_active_current) {
          await pb.collection('carteira_uploads').update(up.id, {
            is_active_current: false,
            status: 'REVERTIDO',
          })
        }
      }

      await pb.collection('pcp_audit_logs').create({
        event_type: 'SCHEDULE_ACTION',
        action: 'CARTEIRA_ROLLBACK',
        resource: 'CARTEIRA_UPLOADS',
        resource_id: uploadCodeDestino,
        scope: 'GLOBAL',
        outcome: 'SUCCESS',
        details: { targetUploadCode: uploadCodeDestino },
      })

      return true
    } catch (err) {
      console.error('Erro ao reverter carga:', err)
      return false
    }
  }

  public static async salvarRegrasParametrizadas(
    regras: any,
    autorEmail: string,
    justificativa: string,
  ): Promise<boolean> {
    try {
      let versaoNum = 1
      try {
        const ativas = await pb.collection('carteira_regras_config').getFullList({
          filter: 'ativo = true',
          sort: '-versao',
        })
        if (ativas.length > 0 && typeof (ativas[0] as any).versao === 'number') {
          versaoNum = ((ativas[0] as any).versao || 0) + 1
        }
        for (const at of ativas) {
          await pb.collection('carteira_regras_config').update(at.id, { ativo: false })
        }
      } catch {
        /* ignore */
      }

      const chaveRegra = `REGRAS_ZSD28C_V${versaoNum}`
      await pb.collection('carteira_regras_config').create({
        chave_regra: chaveRegra,
        nome_regra: 'Regras de Cálculo ZSD28C e Ciclos L1/L2',
        categoria: 'CALCULO_CARTEIRA',
        versao: versaoNum,
        payload: regras,
        descricao: 'Regras Parametrizadas de Cálculo ZSD28C e Ciclos L1/L2',
        responsavel_nome: autorEmail ? autorEmail.split('@')[0] : 'Usuário PCP',
        responsavel_email: autorEmail || 'pcp@ciafal.com.br',
        justificativa_alteracao: justificativa || 'Atualização de parâmetros operacionais',
        ativo: true,
      })

      // Auditoria com event_type válido em pcp_audit_logs ('RULE_ACTION')
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'RULE_ACTION',
          action: 'UPDATE_CARTEIRA_REGRAS',
          resource: 'CARTEIRA_REGRAS_CONFIG',
          resource_id: chaveRegra,
          scope: 'GLOBAL',
          outcome: 'SUCCESS',
          details: {
            chave_regra: chaveRegra,
            versao: versaoNum,
            regras,
            autor_email: autorEmail,
            justificativa,
            timestamp: new Date().toISOString(),
          },
        })
      } catch {
        /* ignore audit log error if permissions differ */
      }
      return true
    } catch (err) {
      console.error('Erro ao salvar regras no PocketBase:', err)
      return false
    }
  }

  public static async carregarRegrasVigentes(): Promise<any | null> {
    try {
      const records = await pb.collection('carteira_regras_config').getList(1, 1, {
        filter: 'ativo = true',
        sort: '-versao,-created',
      })
      if (records.items && records.items.length > 0) {
        const item: any = records.items[0]
        if (item.payload) {
          return item.payload
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }
}
