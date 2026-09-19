import React, { useState } from 'react'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CarteiraSDCImportRow } from '@/types/carteira-sdc'

interface ImportacaoCarteiraSDCModalProps {
  isOpen: boolean
  onClose: () => void
  onImportar: (rows: CarteiraSDCImportRow[]) => void
}

export const ImportacaoCarteiraSDCModal: React.FC<ImportacaoCarteiraSDCModalProps> = ({
  isOpen,
  onClose,
  onImportar,
}) => {
  const [textoManual, setTextoManual] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [previa, setPrevia] = useState<CarteiraSDCImportRow[]>([])

  const handleCarregarExemplo = () => {
    // Exemplo com o caso contratual do usuário:
    // C1000A360600: Carteira 26,00 t, Estoque 6,84 t
    const exemplo = [
      'Material\tDescricao\tCurvaABC\tCarteira_t\tEstoqueTotal_t\tProgramado_t\tEmProducao_t\tOrigem',
      'C1000A360600\tCantoneira Abas Iguais 1" x 1/8" ASTM A36\tA\t26.00\t6.84\t0.00\t0.00\tSidercentro',
      'BAR-CH-50x6.35-A36\tBarra Chata 2" x 1/4" ASTM A36\tA\t40.00\t10.00\t35.00\t0.00\tSidercentro',
      'BAR-RED-25.4-1020\tBarra Redonda 1" SAE 1020 Laminada\tB\t50.00\t10.00\t20.00\t0.00\tCIAFAL',
      'C1250A360600\tCantoneira Abas Iguais 1.1/4" x 1/8" ASTM A36\tA\t32.00\t5.00\t0.00\t18.00\tSidercentro',
      'BAR-QUAD-19.05-1045\tBarra Quadrada 3/4" SAE 1045\tB\t14.50\t22.00\t0.00\t0.00\tSidercentro',
    ].join('\n')

    setTextoManual(exemplo)
    processarTexto(exemplo)
  }

  const processarTexto = (raw: string) => {
    setErro(null)
    try {
      const linhas = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)

      if (linhas.length < 2) {
        setPrevia([])
        return
      }

      // Identifica delimitador (tabulação ou ponto e vírgula ou vírgula)
      const primeiraLinha = linhas[0]
      const delimitador = primeiraLinha.includes('\t')
        ? '\t'
        : primeiraLinha.includes(';')
          ? ';'
          : ','

      const cabecalhos = primeiraLinha.split(delimitador).map((c) =>
        c
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, ''),
      )

      const idxMat = cabecalhos.findIndex((c) => c.includes('mat') || c.includes('codigo'))
      const idxDesc = cabecalhos.findIndex((c) => c.includes('desc'))
      const idxCurva = cabecalhos.findIndex((c) => c.includes('curva') || c.includes('abc'))
      const idxCart = cabecalhos.findIndex((c) => c.includes('cart') || c.includes('ordem'))
      const idxEst = cabecalhos.findIndex((c) => c.includes('est') || c.includes('saldo'))
      const idxProg = cabecalhos.findIndex((c) => c.includes('prog'))
      const idxProd = cabecalhos.findIndex((c) => c.includes('prod'))
      const idxOrigem = cabecalhos.findIndex((c) => c.includes('origem'))

      if (idxMat === -1 || idxCart === -1 || idxEst === -1) {
        setErro(
          'Campos mínimos obrigatórios não encontrados: Material, Carteira (t) e Estoque Total (t). Nota: O Saldo é sempre calculado automaticamente pelo sistema.',
        )
        setPrevia([])
        return
      }

      const rows: CarteiraSDCImportRow[] = []
      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].split(delimitador).map((c) => c.trim())
        if (colunas.length <= 1) continue

        const material = colunas[idxMat] || `MAT-${i}`
        const descricao = idxDesc !== -1 ? colunas[idxDesc] : material
        const curvaAbc = idxCurva !== -1 ? colunas[idxCurva] : 'B'
        const carteira = parseFloat((colunas[idxCart] || '0').replace(',', '.')) || 0
        const estoque = parseFloat((colunas[idxEst] || '0').replace(',', '.')) || 0
        const programado =
          idxProg !== -1 ? parseFloat((colunas[idxProg] || '0').replace(',', '.')) || 0 : 0
        const emProducao =
          idxProd !== -1 ? parseFloat((colunas[idxProd] || '0').replace(',', '.')) || 0 : 0
        const origemRaw = idxOrigem !== -1 ? colunas[idxOrigem] : 'Sidercentro'
        const origem = origemRaw.toLowerCase().includes('ciafal') ? 'CIAFAL' : 'Sidercentro'

        rows.push({
          material,
          descricao,
          curva_abc: curvaAbc.toUpperCase(),
          carteira_t: carteira,
          estoque_total_t: estoque,
          programado_t: programado,
          em_producao_t: emProducao,
          origem_producao: origem,
          centro_sap: 'SDPL',
        })
      }

      setPrevia(rows)
    } catch (e: any) {
      setErro(`Erro ao processar dados: ${e.message}`)
      setPrevia([])
    }
  }

  const handleConfirmar = () => {
    if (previa.length === 0) {
      setErro('Nenhuma linha válida pronta para importação.')
      return
    }
    onImportar(previa)
    onClose()
  }

  return (
    <AnalyticalModal
      isOpen={isOpen}
      onClose={onClose}
      size="analytical"
      badge="WERKS = SDPL (Sidercentro)"
      title="Importar Carga QAS • Carteira SDC"
      subtitle="Importação controlada de pedidos SDC com classificação e cálculo automático de saldos e coberturas"
      scrollMode="auto"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Fonte: Carga QAS SDC &bull; O saldo é sempre calculado automaticamente pelo sistema
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={previa.length === 0}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirmar Importação QAS ({previa.length} itens)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Cole os dados da planilha (formato Tab, Ponto e Vírgula ou CSV):
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCarregarExemplo}
            className="text-xs text-[#004C97] border-[#004C97]/30 hover:bg-blue-50 font-semibold"
          >
            Carregar Exemplo Homologado (C1000A360600)
          </Button>
        </div>

        <textarea
          value={textoManual}
          onChange={(e) => {
            setTextoManual(e.target.value)
            processarTexto(e.target.value)
          }}
          placeholder="Material&#9;Descricao&#9;CurvaABC&#9;Carteira_t&#9;EstoqueTotal_t&#9;Programado_t&#9;Origem&#10;C1000A360600&#9;Cantoneira 1x1/8&#9;A&#9;26.00&#9;6.84&#9;0&#9;Sidercentro"
          rows={6}
          className="w-full font-mono text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
        />

        {erro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{erro}</span>
          </div>
        )}

        {previa.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Prévia da Validação: {previa.length} itens prontos
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                Filtro Centro SDPL Ativo
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48 text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-1.5">Material</th>
                    <th className="p-1.5">Descrição</th>
                    <th className="p-1.5 text-center">Curva</th>
                    <th className="p-1.5 text-right">Carteira (t)</th>
                    <th className="p-1.5 text-right">Estoque (t)</th>
                    <th className="p-1.5 text-right">Saldo Calculado (t)</th>
                    <th className="p-1.5 text-center">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previa.map((p, idx) => {
                    const saldo = (p.estoque_total_t - p.carteira_t).toFixed(2)
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-mono font-bold text-slate-900">{p.material}</td>
                        <td className="p-1.5 truncate max-w-[200px] text-slate-600">
                          {p.descricao}
                        </td>
                        <td className="p-1.5 text-center">{p.curva_abc || 'B'}</td>
                        <td className="p-1.5 text-right font-mono">{p.carteira_t.toFixed(2)}</td>
                        <td className="p-1.5 text-right font-mono">
                          {p.estoque_total_t.toFixed(2)}
                        </td>
                        <td
                          className={`p-1.5 text-right font-mono font-bold ${
                            parseFloat(saldo) < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {parseFloat(saldo) > 0 ? `+${saldo}` : saldo}
                        </td>
                        <td className="p-1.5 text-center">{p.origem_producao}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AnalyticalModal>
  )
}
export default ImportacaoCarteiraSDCModal
