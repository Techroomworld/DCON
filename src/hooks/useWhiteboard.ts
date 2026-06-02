import { useRef, useCallback, useState, useEffect } from 'react';

type UseWhiteboardProps = {
  incomingSnapshot?: string | null;
  onSnapshot?: (snapshot: string) => void;
};

export const useWhiteboard = ({ incomingSnapshot, onSnapshot }: UseWhiteboardProps = {}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#3b82f6');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth] = useState(4);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    if (contextRef.current) tempCtx.drawImage(canvas, 0, 0);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (tempCanvas.width > 0) {
      ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const captureSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  const pushSnapshot = useCallback(() => {
    const snapshot = captureSnapshot();
    if (snapshot && onSnapshot) {
      onSnapshot(snapshot);
    }
  }, [captureSnapshot, onSnapshot]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const coords = getCoordinates(e);
    contextRef.current.lineTo(coords.x, coords.y);
    contextRef.current.strokeStyle = tool === 'eraser' ? '#0f172a' : drawColor;
    contextRef.current.lineWidth = tool === 'eraser' ? 25 : lineWidth;
    contextRef.current.stroke();
  };

  const finishDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
    pushSnapshot();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      pushSnapshot();
    }
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!incomingSnapshot || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = incomingSnapshot;
  }, [incomingSnapshot]);

  return {
    canvasRef,
    drawColor,
    setDrawColor,
    tool,
    setTool,
    startDrawing,
    draw,
    finishDrawing,
    clearCanvas,
  };
};
