import { useRef, useEffect, useState, useCallback } from 'react';
import { RoomDimensions, ZoneBounds, UnitSystem, cmToInches, Target, RoomObstacle, FurnitureItem } from '../types';

interface TopDownViewProps {
  room: RoomDimensions;
  zone: ZoneBounds;
  onZoneChange: (zone: ZoneBounds) => void;
  units: UnitSystem;
  targets?: Target[];
  obstacles?: RoomObstacle[];
  furniture?: FurnitureItem[];
}

type DragHandle = 'left' | 'right' | 'top' | 'bottom' | 'move' | null;

export function TopDownView({ room, zone, onZoneChange, units, targets = [], obstacles = [], furniture = [] }: TopDownViewProps) {
  const isImperial = units === 'imperial';
  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm)) : cm;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialZone, setInitialZone] = useState<ZoneBounds | null>(null);

  const padding = 40;
  const sensorSize = 8;

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    return Math.min(availableWidth / room.width, availableHeight / room.depth);
  }, [room.width, room.depth]);

  const cmToCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    // x is relative to sensor position, room.sensorX is sensor distance from left wall
    return {
      cx: offsetX + (room.sensorX + x) * scale,
      cy: padding + y * scale,
    };
  }, [room.width, room.sensorX, getScale]);

  const canvasToCm = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      x: (cx - offsetX) / scale - room.sensorX,
      y: (cy - padding) / scale,
    };
  }, [room.width, room.sensorX, getScale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const roomDepthPx = room.depth * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw room outline
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, padding, roomWidthPx, roomDepthPx);

    // Draw grid
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    const gridStep = 100; // 100cm grid
    for (let x = gridStep; x < room.width; x += gridStep) {
      const { cx } = cmToCanvas(x - room.width / 2, 0);
      ctx.beginPath();
      ctx.moveTo(cx, padding);
      ctx.lineTo(cx, padding + roomDepthPx);
      ctx.stroke();
    }
    for (let y = gridStep; y < room.depth; y += gridStep) {
      const { cy } = cmToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(offsetX, cy);
      ctx.lineTo(offsetX + roomWidthPx, cy);
      ctx.stroke();
    }

    const sensorPos = cmToCanvas(0, 0);

    // Draw detection zone
    const zoneLeft = cmToCanvas(zone.xMin, zone.yMin);
    const zoneRight = cmToCanvas(zone.xMax, zone.yMax);
    const zoneWidth = zoneRight.cx - zoneLeft.cx;
    const zoneHeight = zoneRight.cy - zoneLeft.cy;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.fillRect(zoneLeft.cx, zoneLeft.cy, zoneWidth, zoneHeight);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(zoneLeft.cx, zoneLeft.cy, zoneWidth, zoneHeight);

    // Draw drag handles
    const handleSize = 8;
    ctx.fillStyle = '#10b981';

    // Left handle
    ctx.fillRect(zoneLeft.cx - handleSize / 2, (zoneLeft.cy + zoneRight.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Right handle
    ctx.fillRect(zoneRight.cx - handleSize / 2, (zoneLeft.cy + zoneRight.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Top handle (near)
    ctx.fillRect((zoneLeft.cx + zoneRight.cx) / 2 - handleSize / 2, zoneLeft.cy - handleSize / 2, handleSize, handleSize);
    // Bottom handle (far)
    ctx.fillRect((zoneLeft.cx + zoneRight.cx) / 2 - handleSize / 2, zoneRight.cy - handleSize / 2, handleSize, handleSize);

    // Draw obstacles (walls, exclusion zones)
    obstacles.forEach((obstacle) => {
      const obstaclePos1 = cmToCanvas(obstacle.x1 - room.sensorX, obstacle.y1);
      const obstaclePos2 = cmToCanvas(obstacle.x2 - room.sensorX, obstacle.y2);
      const obstacleWidth = obstaclePos2.cx - obstaclePos1.cx;
      const obstacleHeight = obstaclePos2.cy - obstaclePos1.cy;

      if (obstacle.type === 'wall') {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
        ctx.strokeStyle = '#64748b';
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.strokeStyle = '#ef4444';
      }
      ctx.lineWidth = 2;
      ctx.fillRect(obstaclePos1.cx, obstaclePos1.cy, obstacleWidth, obstacleHeight);
      ctx.strokeRect(obstaclePos1.cx, obstaclePos1.cy, obstacleWidth, obstacleHeight);

      // Label
      ctx.fillStyle = obstacle.type === 'wall' ? '#94a3b8' : '#fca5a5';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obstacle.name, obstaclePos1.cx + obstacleWidth / 2, obstaclePos1.cy + obstacleHeight / 2 + 3);
    });

    // Draw furniture
    furniture.forEach((item) => {
      const rad = (item.rotation * Math.PI) / 180;
      const itemCenter = cmToCanvas(item.x - room.sensorX, item.y);

      ctx.save();
      ctx.translate(itemCenter.cx, itemCenter.cy);
      ctx.rotate(rad);

      const itemWidthPx = item.width * scale;
      const itemDepthPx = item.depth * scale;

      // Furniture body
      ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.fillRect(-itemWidthPx / 2, -itemDepthPx / 2, itemWidthPx, itemDepthPx);
      ctx.strokeRect(-itemWidthPx / 2, -itemDepthPx / 2, itemWidthPx, itemDepthPx);

      // Furniture icon/label
      ctx.rotate(-rad);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || item.type, 0, 3);

      ctx.restore();
    });

    // Draw detected targets
    targets.forEach((target) => {
      const targetPos = cmToCanvas(target.x, target.y);

      // Outer glow
      const gradient = ctx.createRadialGradient(
        targetPos.cx, targetPos.cy, 0,
        targetPos.cx, targetPos.cy, 20
      );
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 20, 0, Math.PI * 2);
      ctx.fill();

      // Target point
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Target ID
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${target.id}`, targetPos.cx, targetPos.cy + 3);
    });

    // Draw sensor
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(sensorPos.cx, sensorPos.cy, sensorSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw sensor direction arrow
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sensorPos.cx, sensorPos.cy + 5);
    ctx.lineTo(sensorPos.cx, sensorPos.cy + 25);
    ctx.lineTo(sensorPos.cx - 6, sensorPos.cy + 18);
    ctx.moveTo(sensorPos.cx, sensorPos.cy + 25);
    ctx.lineTo(sensorPos.cx + 6, sensorPos.cy + 18);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // Width labels (relative to sensor position)
    for (let x = 0; x <= room.width; x += gridStep) {
      const relativeX = x - room.sensorX;
      const { cx } = cmToCanvas(relativeX, 0);
      ctx.fillText(`${toDisplay(relativeX)}`, cx, padding - 8);
    }

    // Depth labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= room.depth; y += gridStep) {
      const { cy } = cmToCanvas(0, y);
      ctx.fillText(`${toDisplay(y)}`, offsetX - 8, cy + 4);
    }

    // Direction labels (from switch's perspective)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Switch's Left", offsetX + 4, padding + roomDepthPx - 4);
    ctx.textAlign = 'right';
    ctx.fillText("Switch's Right", offsetX + roomWidthPx - 4, padding + roomDepthPx - 4);
  }, [room, zone, getScale, cmToCanvas, toDisplay, targets, obstacles, furniture]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getHandleAtPosition = (cx: number, cy: number): DragHandle => {
    const handleSize = 12;
    const zoneLeft = cmToCanvas(zone.xMin, zone.yMin);
    const zoneRight = cmToCanvas(zone.xMax, zone.yMax);
    const midX = (zoneLeft.cx + zoneRight.cx) / 2;
    const midY = (zoneLeft.cy + zoneRight.cy) / 2;

    // Check handles
    if (Math.abs(cx - zoneLeft.cx) < handleSize && Math.abs(cy - midY) < handleSize) return 'left';
    if (Math.abs(cx - zoneRight.cx) < handleSize && Math.abs(cy - midY) < handleSize) return 'right';
    if (Math.abs(cx - midX) < handleSize && Math.abs(cy - zoneLeft.cy) < handleSize) return 'top';
    if (Math.abs(cx - midX) < handleSize && Math.abs(cy - zoneRight.cy) < handleSize) return 'bottom';

    // Check if inside zone for move
    if (cx >= zoneLeft.cx && cx <= zoneRight.cx && cy >= zoneLeft.cy && cy <= zoneRight.cy) {
      return 'move';
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const handle = getHandleAtPosition(cx, cy);
    if (handle) {
      setDragHandle(handle);
      setDragStart({ x: cx, y: cy });
      setInitialZone({ ...zone });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (!dragHandle || !initialZone) {
      // Update cursor
      const handle = getHandleAtPosition(cx, cy);
      if (handle === 'left' || handle === 'right') {
        canvas.style.cursor = 'ew-resize';
      } else if (handle === 'top' || handle === 'bottom') {
        canvas.style.cursor = 'ns-resize';
      } else if (handle === 'move') {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    const startCm = canvasToCm(dragStart.x, dragStart.y);
    const currentCm = canvasToCm(cx, cy);
    const dx = Math.round(currentCm.x - startCm.x);
    const dy = Math.round(currentCm.y - startCm.y);

    const newZone = { ...initialZone };

    switch (dragHandle) {
      case 'left':
        newZone.xMin = Math.min(initialZone.xMin + dx, initialZone.xMax - 10);
        break;
      case 'right':
        newZone.xMax = Math.max(initialZone.xMax + dx, initialZone.xMin + 10);
        break;
      case 'top':
        newZone.yMin = Math.max(0, Math.min(initialZone.yMin + dy, initialZone.yMax - 10));
        break;
      case 'bottom':
        newZone.yMax = Math.max(initialZone.yMax + dy, initialZone.yMin + 10);
        break;
      case 'move':
        newZone.xMin = initialZone.xMin + dx;
        newZone.xMax = initialZone.xMax + dx;
        newZone.yMin = Math.max(0, initialZone.yMin + dy);
        newZone.yMax = initialZone.yMax + dy;
        break;
    }

    onZoneChange(newZone);
  };

  const handleMouseUp = () => {
    setDragHandle(null);
    setInitialZone(null);
  };

  return (
    <div className="canvas-container p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Top-Down View (X-Y)</h3>
      <canvas
        ref={canvasRef}
        width={400}
        height={350}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full"
      />
    </div>
  );
}
