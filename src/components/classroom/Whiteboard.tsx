'use client';
import { useWhiteboard } from '@/hooks/useWhiteboard';
import { PenTool, Eraser, Trash2 } from 'lucide-react';
import ToolButton from '../ui/ToolButton';

type WhiteboardProps = {
  incomingSnapshot?: string | null;
  onSnapshot?: (snapshot: string) => void;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff', '#000000', '#8b5cf6', '#ec4899'];

export default function Whiteboard({ incomingSnapshot, onSnapshot }: WhiteboardProps) {
  const { 
    canvasRef, 
    drawColor, 
    setDrawColor, 
    tool, 
    setTool, 
    startDrawing, 
    draw, 
    finishDrawing, 
    clearCanvas 
  } = useWhiteboard({ incomingSnapshot, onSnapshot });

  return (
    <div className="flex-1 relative flex flex-col bg-slate-950">
      {/* Whiteboard Toolbar */}
      <div className="absolute top-6 left-6 z-30 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <ToolButton 
              icon={<PenTool size={22} />} 
              active={tool === 'pen'} 
              onClick={() => setTool('pen')} 
            />
            <ToolButton 
              icon={<Eraser size={22} />} 
              active={tool === 'eraser'} 
              onClick={() => setTool('eraser')} 
            />
          </div>

          <div className="h-px bg-slate-700" />

          <div className="flex flex-wrap gap-3">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => { setDrawColor(color); setTool('pen'); }}
                className={`w-9 h-9 rounded-xl border-2 border-slate-600 transition-all hover:scale-110 ${drawColor === color ? 'ring-2 ring-cyan-400 scale-110' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 text-red-400 hover:text-red-500 transition-colors pt-2"
          >
            <Trash2 size={20} /> Clear Board
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-6 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          className="bg-[#0f172a] rounded-3xl shadow-2xl max-w-full max-h-full cursor-crosshair"
        />
      </div>
    </div>
  );
}