/**
 * Admin Whiteboard - A drawing area for quick brainstorming
 * Role: Admin Only (Enforced via Sidebar and Client-side check)
 */

"use client"

import React, { useCallback, useRef, useEffect, useState } from 'react'
import { Circle, Download, Eraser, Minus, Pencil, Square, Trash2, Undo2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import Header from '@/components/Header'
import { hasFullAccess } from '@/lib/role-access'

type Tool = 'pencil' | 'eraser' | 'rect' | 'circle' | 'line'
const INITIAL_COLOR = '#3b82f6'
const INITIAL_BRUSH_SIZE = 5
const WHITEBOARD_STORAGE_KEY = 'deskii-admin-whiteboard-draft'
const MAX_HISTORY = 24

function resetCanvasBackground(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.restore()
}

function restoreCanvasSnapshot(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  snapshot: string,
  onRestored?: () => void,
) {
  const image = new Image()
  image.onload = () => {
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    context.restore()
    onRestored?.()
  }
  image.src = snapshot
}

export default function WhiteboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const historyRef = useRef<string[]>([])
  const draftImageDataRef = useRef<ImageData | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(INITIAL_COLOR)
  const [tool, setTool] = useState<Tool>('pencil')
  const [brushSize, setBrushSize] = useState(INITIAL_BRUSH_SIZE)
  const [hasUndo, setHasUndo] = useState(false)

  const updateUndoState = useCallback(() => {
    setHasUndo(historyRef.current.length > 1)
  }, [])

  const saveDraft = useCallback((snapshot?: string) => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    const nextSnapshot = snapshot || canvas?.toDataURL('image/png')
    if (!nextSnapshot) return
    localStorage.setItem(WHITEBOARD_STORAGE_KEY, nextSnapshot)
  }, [])

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const snapshot = canvas.toDataURL('image/png')
    const lastSnapshot = historyRef.current[historyRef.current.length - 1]
    if (snapshot === lastSnapshot) return
    historyRef.current = [...historyRef.current, snapshot].slice(-MAX_HISTORY)
    saveDraft(snapshot)
    updateUndoState()
  }, [saveDraft, updateUndoState])

  const getPointerPosition = useCallback((nativeEvent: MouseEvent | TouchEvent) => {
    if ('offsetX' in nativeEvent) {
      return { x: nativeEvent.offsetX, y: nativeEvent.offsetY }
    }

    const touch = nativeEvent.touches[0] || nativeEvent.changedTouches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    return {
      x: touch.clientX - (rect?.left || 0),
      y: touch.clientY - (rect?.top || 0),
    }
  }, [])

  const drawShapePreview = useCallback((endPoint: { x: number; y: number }) => {
    const canvas = canvasRef.current
    const context = contextRef.current
    const startPoint = startPointRef.current
    const draftImageData = draftImageDataRef.current
    if (!canvas || !context || !startPoint || !draftImageData) return

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.putImageData(draftImageData, 0, 0)
    context.restore()
    context.beginPath()
    context.strokeStyle = color
    context.lineWidth = brushSize
    if (tool === 'line') {
      context.moveTo(startPoint.x, startPoint.y)
      context.lineTo(endPoint.x, endPoint.y)
    } else if (tool === 'rect') {
      context.rect(startPoint.x, startPoint.y, endPoint.x - startPoint.x, endPoint.y - startPoint.y)
    } else if (tool === 'circle') {
      const radius = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
      context.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2)
    }
    context.stroke()
  }, [brushSize, color, tool])

  // Auth Check
  useEffect(() => {
    if (user && !hasFullAccess(user)) {
      router.push('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set display size
    const parent = canvas.parentElement
    if (!parent) return

    canvas.width = parent.clientWidth * 2
    canvas.height = (window.innerHeight - 250) * 2 // Increased offset for double headers
    canvas.style.width = `${parent.clientWidth}px`
    canvas.style.height = `${window.innerHeight - 250}px`

    const context = canvas.getContext('2d')
    if (context) {
      context.scale(2, 2)
      context.lineCap = 'round'
      context.strokeStyle = INITIAL_COLOR
      context.lineWidth = INITIAL_BRUSH_SIZE
      contextRef.current = context

      const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(WHITEBOARD_STORAGE_KEY) : null
      if (savedDraft) {
        restoreCanvasSnapshot(context, canvas, savedDraft, () => {
          historyRef.current = [savedDraft]
          updateUndoState()
        })
      } else {
        resetCanvasBackground(context, canvas)
        window.requestAnimationFrame(pushHistory)
      }
    }
  }, [pushHistory, updateUndoState])

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color
      contextRef.current.lineWidth = brushSize
    }
  }, [color, tool, brushSize])

  const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    nativeEvent.preventDefault?.()
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    const point = getPointerPosition(nativeEvent)
    startPointRef.current = point
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      draftImageDataRef.current = context.getImageData(0, 0, canvas.width, canvas.height)
    } else {
      context.beginPath()
      context.moveTo(point.x, point.y)
    }
    setIsDrawing(true)
  }

  const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    nativeEvent.preventDefault?.()

    const point = getPointerPosition(nativeEvent)
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      drawShapePreview(point)
      return
    }

    contextRef.current?.lineTo(point.x, point.y)
    contextRef.current?.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    contextRef.current?.closePath()
    setIsDrawing(false)
    startPointRef.current = null
    draftImageDataRef.current = null
    pushHistory()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas && contextRef.current) {
      resetCanvasBackground(contextRef.current, canvas)
      pushHistory()
    }
  }

  const undoCanvas = () => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context || historyRef.current.length <= 1) return

    historyRef.current = historyRef.current.slice(0, -1)
    const previousSnapshot = historyRef.current[historyRef.current.length - 1]
    restoreCanvasSnapshot(context, canvas, previousSnapshot, () => {
      saveDraft(previousSnapshot)
      updateUndoState()
    })
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const COLORS = [
    '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ffffff'
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] bg-[var(--background)] overflow-hidden">
      <Header title="Admin Whiteboard" subtitle="Admin brainstorming mode - autosaves locally" />

      {/* Toolbar */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--card-surface)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Back button removed as we have breadcrumbs/nav in sidebar and header can handle title */}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1 bg-[var(--background)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setTool('pencil')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${tool === 'pencil' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Pencil"
            aria-label="Pencil tool"
            aria-pressed={tool === 'pencil'}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${tool === 'eraser' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Eraser"
            aria-label="Eraser tool"
            aria-pressed={tool === 'eraser'}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${tool === 'line' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Line"
            aria-label="Line tool"
            aria-pressed={tool === 'line'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${tool === 'rect' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Rectangle"
            aria-label="Rectangle tool"
            aria-pressed={tool === 'rect'}
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${tool === 'circle' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Circle"
            aria-label="Circle tool"
            aria-pressed={tool === 'circle'}
          >
            <Circle className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[var(--border)] mx-1" />
          <div className="flex items-center gap-1 px-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pencil'); }}
              className={`h-10 w-10 rounded-full border border-black/10 transition-transform hover:scale-105 ${color === c ? 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-black' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Size</span>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="h-10 w-32 accent-[var(--accent)]"
              aria-label="Brush size"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={undoCanvas} disabled={!hasUndo} icon={<Undo2 className="w-4 h-4" />}>
              Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={clearCanvas} icon={<Trash2 className="w-4 h-4" />}>
              Clear
            </Button>
            <Button variant="primary" size="sm" onClick={downloadImage} icon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative p-4 bg-gray-100 dark:bg-black/20 overflow-hidden">
        <div className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="touch-none"
          />
        </div>

        {/* Floating Hint */}
        <div className="absolute bottom-8 right-8 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full pointer-events-none">
          Autosaved locally
        </div>
      </div>
    </div>
  )
}
