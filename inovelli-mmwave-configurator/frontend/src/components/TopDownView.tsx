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
  onObstaclesChange?: (obstacles: RoomObstacle[]) => void;
  onFurnitureChange?: (furniture: FurnitureItem[]) => void;
}

type DragType =
  | { type: 'zone'; handle: 'left' | 'right' | 'top' | 'bottom' | 'move' }
  | { type: 'obstacle'; id: string; handle: 'move' | 'nw' | 'ne' | 'sw' | 'se' }
  | { type: 'furniture'; id: string }
  | null;

export function TopDownView({
  room, zone, onZoneChange, units, targets = [], obstacles = [], furniture = [],
  onObstaclesChange, onFurnitureChange
}: TopDownViewProps) {
  const isImperial = units === 'imperial';
  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm)) : cm;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialZone, setInitialZone] = useState<ZoneBounds | null>(null);
  const [initialObstacle, setInitialObstacle] = useState<RoomObstacle | null>(null);
  const [initialFurniture, setInitialFurniture] = useState<FurnitureItem | null>(null);

  const padding = 40;
  const sensorSize = 8;
  const handleSize = 8;

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    return Math.min(availableWidth / room.width, availableHeight / room.depth);
  }, [room.width, room.depth]);

  // Convert room-relative cm to canvas pixels (x is relative to sensor)
  const cmToCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      cx: offsetX + (room.sensorX + x) * scale,
      cy: padding + y * scale,
    };
  }, [room.width, room.sensorX, getScale]);

  // Convert room-absolute cm to canvas pixels
  const absToCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      cx: offsetX + x * scale,
      cy: padding + y * scale,
    };
  }, [room.width, getScale]);

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

  // Convert canvas to absolute room coordinates
  const canvasToAbs = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      x: (cx - offsetX) / scale,
      y: (cy - padding) / scale,
    };
  }, [room.width, getScale]);

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
    const gridStep = 100;
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

    // Draw zone drag handles
    ctx.fillStyle = '#10b981';
    ctx.fillRect(zoneLeft.cx - handleSize / 2, (zoneLeft.cy + zoneRight.cy) / 2 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(zoneRight.cx - handleSize / 2, (zoneLeft.cy + zoneRight.cy) / 2 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect((zoneLeft.cx + zoneRight.cx) / 2 - handleSize / 2, zoneLeft.cy - handleSize / 2, handleSize, handleSize);
    ctx.fillRect((zoneLeft.cx + zoneRight.cx) / 2 - handleSize / 2, zoneRight.cy - handleSize / 2, handleSize, handleSize);

    // Draw obstacles with resize handles
    obstacles.forEach((obstacle) => {
      const pos1 = absToCanvas(obstacle.x1, obstacle.y1);
      const pos2 = absToCanvas(obstacle.x2, obstacle.y2);
      const w = pos2.cx - pos1.cx;
      const h = pos2.cy - pos1.cy;

      if (obstacle.type === 'wall') {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
        ctx.strokeStyle = '#64748b';
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.strokeStyle = '#ef4444';
      }
      ctx.lineWidth = 2;
      ctx.fillRect(pos1.cx, pos1.cy, w, h);
      ctx.strokeRect(pos1.cx, pos1.cy, w, h);

      // Resize handles (corners)
      const handleColor = obstacle.type === 'wall' ? '#94a3b8' : '#fca5a5';
      ctx.fillStyle = handleColor;
      ctx.fillRect(pos1.cx - handleSize / 2, pos1.cy - handleSize / 2, handleSize, handleSize); // NW
      ctx.fillRect(pos2.cx - handleSize / 2, pos1.cy - handleSize / 2, handleSize, handleSize); // NE
      ctx.fillRect(pos1.cx - handleSize / 2, pos2.cy - handleSize / 2, handleSize, handleSize); // SW
      ctx.fillRect(pos2.cx - handleSize / 2, pos2.cy - handleSize / 2, handleSize, handleSize); // SE

      // Label
      ctx.fillStyle = handleColor;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obstacle.name, pos1.cx + w / 2, pos1.cy + h / 2 + 3);
    });

    // Draw furniture with drag indicator
    furniture.forEach((item) => {
      const rad = (item.rotation * Math.PI) / 180;
      const itemCenter = absToCanvas(item.x, item.y);

      ctx.save();
      ctx.translate(itemCenter.cx, itemCenter.cy);
      ctx.rotate(rad);

      const itemWidthPx = item.width * scale;
      const itemDepthPx = item.depth * scale;

      ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.fillRect(-itemWidthPx / 2, -itemDepthPx / 2, itemWidthPx, itemDepthPx);
      ctx.strokeRect(-itemWidthPx / 2, -itemDepthPx / 2, itemWidthPx, itemDepthPx);

      // Move handle in center
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-rad);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || item.type, 0, -8);

      ctx.restore();
    });

    // Draw detected targets
    targets.forEach((target) => {
      const targetPos = cmToCanvas(target.x, target.y);
      const gradient = ctx.createRadialGradient(targetPos.cx, targetPos.cy, 0, targetPos.cx, targetPos.cy, 20);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 6, 0, Math.PI * 2);
      ctx.fill();

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
    for (let x = 0; x <= room.width; x += gridStep) {
      const relativeX = x - room.sensorX;
      const { cx } = cmToCanvas(relativeX, 0);
      ctx.fillText(`${toDisplay(relativeX)}`, cx, padding - 8);
    }
    ctx.textAlign = 'right';
    for (let y = 0; y <= room.depth; y += gridStep) {
      const { cy } = cmToCanvas(0, y);
      ctx.fillText(`${toDisplay(y)}`, offsetX - 8, cy + 4);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Switch's Left", offsetX + 4, padding + roomDepthPx - 4);
    ctx.textAlign = 'right';
    ctx.fillText("Switch's Right", offsetX + roomWidthPx - 4, padding + roomDepthPx - 4);
  }, [room, zone, getScale, cmToCanvas, absToCanvas, toDisplay, targets, obstacles, furniture]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getObjectAtPosition = (cx: number, cy: number): { drag: DragType; cursor: string } => {
    const hitSize = 12;

    // Check furniture first (on top)
    for (let i = furniture.length - 1; i >= 0; i--) {
      const item = furniture[i];
      const center = absToCanvas(item.x, item.y);
      const scale = getScale();
      const halfW = (item.width * scale) / 2;
      const halfD = (item.depth * scale) / 2;

      // Simple bounding box check (ignoring rotation for simplicity)
      if (cx >= center.cx - halfW && cx <= center.cx + halfW &&
          cy >= center.cy - halfD && cy <= center.cy + halfD) {
        return { drag: { type: 'furniture', id: item.id }, cursor: 'move' };
      }
    }

    // Check obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const pos1 = absToCanvas(obs.x1, obs.y1);
      const pos2 = absToCanvas(obs.x2, obs.y2);

      // Check corner handles
      if (Math.abs(cx - pos1.cx) < hitSize && Math.abs(cy - pos1.cy) < hitSize) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'nw' }, cursor: 'nwse-resize' };
      }
      if (Math.abs(cx - pos2.cx) < hitSize && Math.abs(cy - pos1.cy) < hitSize) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'ne' }, cursor: 'nesw-resize' };
      }
      if (Math.abs(cx - pos1.cx) < hitSize && Math.abs(cy - pos2.cy) < hitSize) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'sw' }, cursor: 'nesw-resize' };
      }
      if (Math.abs(cx - pos2.cx) < hitSize && Math.abs(cy - pos2.cy) < hitSize) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'se' }, cursor: 'nwse-resize' };
      }

      // Check inside for move
      if (cx >= pos1.cx && cx <= pos2.cx && cy >= pos1.cy && cy <= pos2.cy) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'move' }, cursor: 'move' };
      }
    }

    // Check zone handles
    const zoneLeft = cmToCanvas(zone.xMin, zone.yMin);
    const zoneRight = cmToCanvas(zone.xMax, zone.yMax);
    const midX = (zoneLeft.cx + zoneRight.cx) / 2;
    const midY = (zoneLeft.cy + zoneRight.cy) / 2;

    if (Math.abs(cx - zoneLeft.cx) < hitSize && Math.abs(cy - midY) < hitSize) {
      return { drag: { type: 'zone', handle: 'left' }, cursor: 'ew-resize' };
    }
    if (Math.abs(cx - zoneRight.cx) < hitSize && Math.abs(cy - midY) < hitSize) {
      return { drag: { type: 'zone', handle: 'right' }, cursor: 'ew-resize' };
    }
    if (Math.abs(cx - midX) < hitSize && Math.abs(cy - zoneLeft.cy) < hitSize) {
      return { drag: { type: 'zone', handle: 'top' }, cursor: 'ns-resize' };
    }
    if (Math.abs(cx - midX) < hitSize && Math.abs(cy - zoneRight.cy) < hitSize) {
      return { drag: { type: 'zone', handle: 'bottom' }, cursor: 'ns-resize' };
    }
    if (cx >= zoneLeft.cx && cx <= zoneRight.cx && cy >= zoneLeft.cy && cy <= zoneRight.cy) {
      return { drag: { type: 'zone', handle: 'move' }, cursor: 'move' };
    }

    return { drag: null, cursor: 'default' };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { drag } = getObjectAtPosition(cx, cy);
    if (drag) {
      setDragType(drag);
      setDragStart({ x: cx, y: cy });

      if (drag.type === 'zone') {
        setInitialZone({ ...zone });
      } else if (drag.type === 'obstacle') {
        const obs = obstacles.find(o => o.id === drag.id);
        if (obs) setInitialObstacle({ ...obs });
      } else if (drag.type === 'furniture') {
        const item = furniture.find(f => f.id === drag.id);
        if (item) setInitialFurniture({ ...item });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (!dragType) {
      const { cursor } = getObjectAtPosition(cx, cy);
      canvas.style.cursor = cursor;
      return;
    }

    if (dragType.type === 'zone' && initialZone) {
      const startCm = canvasToCm(dragStart.x, dragStart.y);
      const currentCm = canvasToCm(cx, cy);
      const dx = Math.round(currentCm.x - startCm.x);
      const dy = Math.round(currentCm.y - startCm.y);

      const newZone = { ...initialZone };
      switch (dragType.handle) {
        case 'left': newZone.xMin = Math.min(initialZone.xMin + dx, initialZone.xMax - 10); break;
        case 'right': newZone.xMax = Math.max(initialZone.xMax + dx, initialZone.xMin + 10); break;
        case 'top': newZone.yMin = Math.max(0, Math.min(initialZone.yMin + dy, initialZone.yMax - 10)); break;
        case 'bottom': newZone.yMax = Math.max(initialZone.yMax + dy, initialZone.yMin + 10); break;
        case 'move':
          newZone.xMin = initialZone.xMin + dx;
          newZone.xMax = initialZone.xMax + dx;
          newZone.yMin = Math.max(0, initialZone.yMin + dy);
          newZone.yMax = initialZone.yMax + dy;
          break;
      }
      onZoneChange(newZone);
    } else if (dragType.type === 'obstacle' && initialObstacle && onObstaclesChange) {
      const startAbs = canvasToAbs(dragStart.x, dragStart.y);
      const currentAbs = canvasToAbs(cx, cy);
      const dx = Math.round(currentAbs.x - startAbs.x);
      const dy = Math.round(currentAbs.y - startAbs.y);

      const newObs = { ...initialObstacle };
      switch (dragType.handle) {
        case 'move':
          newObs.x1 = initialObstacle.x1 + dx;
          newObs.x2 = initialObstacle.x2 + dx;
          newObs.y1 = initialObstacle.y1 + dy;
          newObs.y2 = initialObstacle.y2 + dy;
          break;
        case 'nw':
          newObs.x1 = Math.min(initialObstacle.x1 + dx, initialObstacle.x2 - 10);
          newObs.y1 = Math.min(initialObstacle.y1 + dy, initialObstacle.y2 - 10);
          break;
        case 'ne':
          newObs.x2 = Math.max(initialObstacle.x2 + dx, initialObstacle.x1 + 10);
          newObs.y1 = Math.min(initialObstacle.y1 + dy, initialObstacle.y2 - 10);
          break;
        case 'sw':
          newObs.x1 = Math.min(initialObstacle.x1 + dx, initialObstacle.x2 - 10);
          newObs.y2 = Math.max(initialObstacle.y2 + dy, initialObstacle.y1 + 10);
          break;
        case 'se':
          newObs.x2 = Math.max(initialObstacle.x2 + dx, initialObstacle.x1 + 10);
          newObs.y2 = Math.max(initialObstacle.y2 + dy, initialObstacle.y1 + 10);
          break;
      }
      onObstaclesChange(obstacles.map(o => o.id === newObs.id ? newObs : o));
    } else if (dragType.type === 'furniture' && initialFurniture && onFurnitureChange) {
      const startAbs = canvasToAbs(dragStart.x, dragStart.y);
      const currentAbs = canvasToAbs(cx, cy);
      const dx = Math.round(currentAbs.x - startAbs.x);
      const dy = Math.round(currentAbs.y - startAbs.y);

      const newItem = {
        ...initialFurniture,
        x: initialFurniture.x + dx,
        y: initialFurniture.y + dy,
      };
      onFurnitureChange(furniture.map(f => f.id === newItem.id ? newItem : f));
    }
  };

  const handleMouseUp = () => {
    setDragType(null);
    setInitialZone(null);
    setInitialObstacle(null);
    setInitialFurniture(null);
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
