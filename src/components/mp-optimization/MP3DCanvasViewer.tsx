import React, { useRef, useState, useEffect } from 'react'
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  ZoomIn,
  ZoomOut,
  Eye,
  Box,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Dimension3DProps {
  title?: string
  plate?: {
    thickness: number
    width: number
    length: number
    weight?: number
    label?: string
  }
  pieces?: Array<{
    id: string
    x_pos_mm: number
    y_pos_mm: number
    z_pos_mm?: number
    width_mm: number
    length_mm: number
    thickness_mm: number
    target_application: string
    is_reusable_leftover?: boolean
    status?: string
  }>
  envelopeIdeal?: {
    min_thickness: number
    max_thickness: number
    min_width: number
    max_width: number
    min_length: number
    max_length: number
  }
  envelopeAdmissible?: {
    min_thickness: number
    max_thickness: number
    min_width: number
    max_width: number
    min_length: number
    max_length: number
  }
  viewMode?: 'ISOMETRIC' | 'TOP' | 'FRONT' | 'SIDE' | 'TRANSFORMATION'
  showDimensions?: boolean
}

export const MP3DCanvasViewer: React.FC<Dimension3DProps> = ({
  title = 'Projeção 3D do Material e Plano Dimensional',
  plate = { thickness: 150, width: 1200, length: 3000, weight: 4239, label: 'Placa Padrão' },
  pieces = [],
  envelopeIdeal,
  envelopeAdmissible,
  viewMode: initialViewMode = 'ISOMETRIC',
  showDimensions = true,
}) => {
  const [viewMode, setViewMode] = useState<
    'ISOMETRIC' | 'TOP' | 'FRONT' | 'SIDE' | 'TRANSFORMATION'
  >(initialViewMode)
  const [rotationX, setRotationX] = useState(25)
  const [rotationY, setRotationY] = useState(-35)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    setRotationY((prev) => prev + deltaX * 0.5)
    setRotationX((prev) => Math.max(-80, Math.min(80, prev - deltaY * 0.5)))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetView = (mode: 'ISOMETRIC' | 'TOP' | 'FRONT' | 'SIDE' | 'TRANSFORMATION') => {
    setViewMode(mode)
    setZoom(1)
    if (mode === 'ISOMETRIC') {
      setRotationX(25)
      setRotationY(-35)
    } else if (mode === 'TOP') {
      setRotationX(90)
      setRotationY(0)
    } else if (mode === 'FRONT') {
      setRotationX(0)
      setRotationY(0)
    } else if (mode === 'SIDE') {
      setRotationX(0)
      setRotationY(90)
    }
  }

  // Normalização de escala visual
  const maxDim = Math.max(plate.length, plate.width * 2, plate.thickness * 8, 1)
  const scale = 260 / maxDim

  const plateVisualL = Math.max(120, plate.length * scale)
  const plateVisualW = Math.max(60, plate.width * scale)
  const plateVisualT = Math.max(18, plate.thickness * scale * 2)

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Barra de Ferramentas Superior do 3D */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-100/60 text-[#004C97]">
            <Box className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">{title}</span>
        </div>

        {/* Controles de Vista */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          <Button
            size="sm"
            variant={viewMode === 'ISOMETRIC' ? 'default' : 'ghost'}
            className={`h-7 px-2 text-[11px] ${
              viewMode === 'ISOMETRIC' ? 'bg-[#004C97] text-white font-bold' : 'text-slate-600'
            }`}
            onClick={() => resetView('ISOMETRIC')}
          >
            Isométrica
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'TOP' ? 'default' : 'ghost'}
            className={`h-7 px-2 text-[11px] ${
              viewMode === 'TOP' ? 'bg-[#004C97] text-white font-bold' : 'text-slate-600'
            }`}
            onClick={() => resetView('TOP')}
          >
            Superior
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'FRONT' ? 'default' : 'ghost'}
            className={`h-7 px-2 text-[11px] ${
              viewMode === 'FRONT' ? 'bg-[#004C97] text-white font-bold' : 'text-slate-600'
            }`}
            onClick={() => resetView('FRONT')}
          >
            Frontal
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'SIDE' ? 'default' : 'ghost'}
            className={`h-7 px-2 text-[11px] ${
              viewMode === 'SIDE' ? 'bg-[#004C97] text-white font-bold' : 'text-slate-600'
            }`}
            onClick={() => resetView('SIDE')}
          >
            Lateral
          </Button>
        </div>

        {/* Controles de Zoom e Reset */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-slate-200 text-slate-600 hover:text-slate-900"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-slate-200 text-slate-600 hover:text-slate-900"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-slate-200 text-slate-600 hover:text-slate-900"
            onClick={() => resetView('ISOMETRIC')}
            title="Redefinir Ângulo de Visão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Área do Canvas 3D Interativo */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[360px] sm:h-[420px] bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
        style={{ perspective: 1200 }}
      >
        {/* Grid de Piso Industrial */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            transform: 'rotateX(60deg) scale(2) translateY(80px)',
            transformOrigin: 'center bottom',
          }}
        />

        {/* Eixos Dimensionais XYZ */}
        <div className="absolute bottom-4 left-4 p-2 bg-white/90 backdrop-blur border border-slate-200 rounded-md text-[10px] font-mono shadow-xs pointer-events-none flex flex-col gap-0.5">
          <span className="text-emerald-700 font-bold">X: Comprimento ({plate.length} mm)</span>
          <span className="text-[#004C97] font-bold">Y: Largura ({plate.width} mm)</span>
          <span className="text-amber-700 font-bold">Z: Espessura ({plate.thickness} mm)</span>
        </div>

        {/* Overlay de Informação da Placa */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-slate-200 rounded-lg p-2.5 shadow-xs pointer-events-none max-w-xs">
          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#004C97]" />
            {plate.label || 'Bloco Rastreável SAP'}
          </div>
          <div className="text-[11px] text-slate-600 font-mono mt-1">
            {plate.thickness} × {plate.width} × {plate.length} mm &bull;{' '}
            <span className="font-bold text-slate-900">
              {plate.weight ? `${plate.weight} kg` : ''}
            </span>
          </div>
          {pieces.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
              <span className="text-emerald-700 font-bold">
                {pieces.filter((p) => !p.is_reusable_leftover).length} peças úteis
              </span>
              <span>•</span>
              <span className="text-blue-700 font-bold">
                {pieces.filter((p) => p.is_reusable_leftover).length} sobras reutilizáveis
              </span>
            </div>
          )}
        </div>

        {/* Objeto 3D Proporcional Renderizado via CSS 3D Transforms */}
        <div
          style={{
            transform: `scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="relative flex items-center justify-center pointer-events-none"
        >
          {/* Sombra no piso */}
          <div
            style={{
              width: `${plateVisualL}px`,
              height: `${plateVisualW}px`,
              transform: `translateZ(-${plateVisualT / 2 + 15}px)`,
            }}
            className="absolute bg-slate-400/30 rounded-lg blur-md"
          />

          {/* Placa / Bloco Principal */}
          <div
            style={{
              width: `${plateVisualL}px`,
              height: `${plateVisualW}px`,
              transformStyle: 'preserve-3d',
            }}
            className="relative"
          >
            {/* Face Superior (Top) */}
            <div
              style={{
                width: `${plateVisualL}px`,
                height: `${plateVisualW}px`,
                transform: `translateZ(${plateVisualT / 2}px)`,
              }}
              className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 border border-slate-400/80 rounded shadow-inner flex flex-wrap p-1 gap-1 overflow-hidden"
            >
              {pieces.length > 0 ? (
                pieces.map((p, idx) => {
                  const pieceL = Math.max(20, (p.length_mm / plate.length) * plateVisualL)
                  const pieceW = Math.max(15, (p.width_mm / plate.width) * plateVisualW)

                  const isLeftover = p.is_reusable_leftover || p.status === 'SOBRA_REUTILIZAVEL'

                  return (
                    <div
                      key={p.id || idx}
                      style={{
                        width: `${pieceL - 4}px`,
                        height: `${pieceW - 4}px`,
                      }}
                      className={`rounded text-[8px] font-mono flex flex-col items-center justify-center border shadow-xs p-0.5 transition-all ${
                        isLeftover
                          ? 'bg-amber-100 border-amber-400 text-amber-900 border-dashed'
                          : 'bg-[#004C97]/85 border-blue-800 text-white font-bold'
                      }`}
                    >
                      <span className="truncate max-w-full text-center leading-none">
                        {p.target_application || p.id}
                      </span>
                      <span className="text-[7px] opacity-80 leading-none mt-0.5">
                        {p.width_mm}×{p.length_mm}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 font-mono text-[10px]">
                  <span>Área Útil Integral da MP</span>
                  <span className="text-[9px] text-slate-400">100% Disponível</span>
                </div>
              )}
            </div>

            {/* Face Inferior (Bottom) */}
            <div
              style={{
                width: `${plateVisualL}px`,
                height: `${plateVisualW}px`,
                transform: `translateZ(-${plateVisualT / 2}px)`,
              }}
              className="absolute inset-0 bg-slate-400 border border-slate-500 rounded"
            />

            {/* Face Frontal (Front) */}
            <div
              style={{
                width: `${plateVisualL}px`,
                height: `${plateVisualT}px`,
                transform: `rotateX(-90deg) translateZ(${plateVisualW / 2}px)`,
                transformOrigin: 'center center',
              }}
              className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-slate-300 to-slate-400 border border-slate-500 flex items-center justify-center text-[9px] font-mono text-slate-700 font-bold"
            >
              E: {plate.thickness} mm
            </div>

            {/* Face Traseira (Back) */}
            <div
              style={{
                width: `${plateVisualL}px`,
                height: `${plateVisualT}px`,
                transform: `rotateX(90deg) translateZ(${plateVisualW / 2}px)`,
                transformOrigin: 'center center',
              }}
              className="absolute inset-x-0 top-0 bg-slate-300 border border-slate-500"
            />

            {/* Face Lateral Direita (Right) */}
            <div
              style={{
                width: `${plateVisualW}px`,
                height: `${plateVisualT}px`,
                transform: `rotateY(90deg) translateZ(${plateVisualL / 2}px)`,
                transformOrigin: 'center center',
              }}
              className="absolute inset-y-0 right-0 bg-gradient-to-r from-slate-300 to-slate-400 border border-slate-500 flex items-center justify-center text-[8px] font-mono text-slate-700 font-semibold"
            >
              L: {plate.width} mm
            </div>

            {/* Face Lateral Esquerda (Left) */}
            <div
              style={{
                width: `${plateVisualW}px`,
                height: `${plateVisualT}px`,
                transform: `rotateY(-90deg) translateZ(${plateVisualL / 2}px)`,
                transformOrigin: 'center center',
              }}
              className="absolute inset-y-0 left-0 bg-slate-300 border border-slate-500"
            />

            {/* Envelope Dimensional Ideal (Verde) e Admissível (Azul) */}
            {envelopeIdeal && (
              <div
                style={{
                  width: `${plateVisualL * 1.05}px`,
                  height: `${plateVisualW * 1.05}px`,
                  transform: `translateZ(${plateVisualT * 0.7}px) translate(-2.5%, -2.5%)`,
                }}
                className="absolute border-2 border-dashed border-emerald-500/80 bg-emerald-500/10 rounded pointer-events-none flex items-start p-1"
              >
                <span className="text-[8px] font-bold text-emerald-800 bg-emerald-100/90 px-1 rounded">
                  ENVELOPE IDEAL (ZPPMP)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instrução de Interação Discreta */}
        <div className="absolute bottom-3 right-4 text-[10px] text-slate-400 font-sans flex items-center gap-1.5 pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          <span>Arraste com o mouse para girar 360°</span>
        </div>
      </div>

      {/* Barra Inferior com Cotas Dimensionais e Legenda */}
      <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#004C97]" />
            <span className="text-slate-700 font-medium text-[11px]">Peça Conforme</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 border-dashed" />
            <span className="text-slate-700 font-medium text-[11px]">
              Sobra Reutilizável (Estoque)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300 border border-slate-400" />
            <span className="text-slate-700 font-medium text-[11px]">Refile / Kerf da Serra</span>
          </div>
        </div>

        {showDimensions && (
          <div className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            Cotas: <span className="font-bold text-slate-900">{plate.thickness}</span> mm (Esp) ×{' '}
            <span className="font-bold text-slate-900">{plate.width}</span> mm (Larg) ×{' '}
            <span className="font-bold text-slate-900">{plate.length}</span> mm (Comp)
          </div>
        )}
      </div>
    </div>
  )
}
