/**
 * Admin Whiteboard - A drawing area for quick brainstorming
 * Role: Admin Only (Enforced via Sidebar and Client-side check)
 */

"use client"

import React, { useRef, useEffect, useState } from 'react'
import { Eraser, Pencil, Download, Trash2, ArrowLeft, Square, Circle, Minus } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import Header from '@/components/Header'

type Tool = 'pencil' | 'eraser' | 'rect' | 'circle' | 'line'

export default function WhiteboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#3b82f6')
  const [tool, setTool] = useState<Tool>('pencil')
  const [brushSize, setBrushSize] = useState(5)

  // Auth Check
  useEffect(() => {
    if (user && user.role?.toLowerCase() !== 'admin') {
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
      context.strokeStyle = color
      context.lineWidth = brushSize
      contextRef.current = context

      // Set white background
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color
      contextRef.current.lineWidth = brushSize
    }
  }, [color, tool, brushSize])

  const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    let offsetX, offsetY
    if ('offsetX' in nativeEvent) {
      offsetX = nativeEvent.offsetX
      offsetY = nativeEvent.offsetY
    } else {
      const touch = nativeEvent.touches[0]
      const rect = canvasRef.current?.getBoundingClientRect()
      offsetX = touch.clientX - (rect?.left || 0)
      offsetY = touch.clientY - (rect?.top || 0)
    }

    contextRef.current?.beginPath()
    contextRef.current?.moveTo(offsetX, offsetY)
    setIsDrawing(true)
  }

  const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    let offsetX, offsetY
    if ('offsetX' in nativeEvent) {
      offsetX = nativeEvent.offsetX
      offsetY = nativeEvent.offsetY
    } else {
      const touch = nativeEvent.touches[0]
      const rect = canvasRef.current?.getBoundingClientRect()
      offsetX = touch.clientX - (rect?.left || 0)
      offsetY = touch.clientY - (rect?.top || 0)
    }

    contextRef.current?.lineTo(offsetX, offsetY)
    contextRef.current?.stroke()
  }

  const stopDrawing = () => {
    contextRef.current?.closePath()
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas && contextRef.current) {
      contextRef.current.fillStyle = '#ffffff'
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height)
    }
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
      <Header title="Admin Whiteboard" subtitle="Admin Brainstorming Mode • Changes are local" />

      {/* Toolbar */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--card-surface)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Back button removed as we have breadcrumbs/nav in sidebar and header can handle title */}
        </div>

        <div className="flex items-center gap-2 p-1 bg-[var(--background)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setTool('pencil')}
            className={`p-2 rounded-lg transition-all ${tool === 'pencil' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Pencil"
            aria-label="Pencil tool"
            aria-pressed={tool === 'pencil'}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--card-surface)]'}`}
            title="Eraser"
            aria-label="Eraser tool"
            aria-pressed={tool === 'eraser'}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[var(--border)] mx-1" />
          <div className="flex items-center gap-1 px-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pencil'); }}
                className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-black' : ''}`}
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
              className="w-24 accent-[var(--accent)]"
              aria-label="Brush size"
            />
          </div>
          <div className="flex items-center gap-2">
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
          Admin Brainstorming Mode • Changes are local
        </div>
      </div>
    </div>
  )
}
