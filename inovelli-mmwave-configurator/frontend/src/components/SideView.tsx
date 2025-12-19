import { useRef, useEffect, useState, useCallback } from 'react';
import { RoomDimensions, ZoneBounds, UnitSystem, cmToInches, Target, FurnitureItem } from '../types';

interface SideViewProps {
  room: RoomDimensions;
  zone: ZoneBounds;
  onZoneChange: (zone: ZoneBounds) => void;
  units: UnitSystem;
  targets?: Target[];
  furniture?: FurnitureItem[];
  onFurnitureChange?: (furniture: FurnitureItem[]) => void;
}

type DragType =
  | { type: 'zone'; handle: 'left' | 'right' | 'top' | 'bottom' | 'move' }
  | { type: 'furniture'; id: string }
  | null;

export function SideView({ room, zone, onZoneChange, units, targets = [], furniture = [], onFurnitureChange }: SideViewProps) {
  const isImperial = units === 'imperial';
  const toDisplay = (cm: number) => isImperial ? Math.round(cmToInches(cm)) : cm;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialZone, setInitialZone] = useState<ZoneBounds | null>(null);
  const [initialFurniture, setInitialFurniture] = useState<FurnitureItem | null>(null);

  const padding = 40;
  const sensorSize = 8;
  const handleSize = 8;

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;
    return Math.min(availableWidth / room.depth, availableHeight / room.height);
  }, [room.depth, room.height]);

  // Y is depth (horizontal), Z is height relative to sensor (vertical, inverted for canvas)
  const cmToCanvas = useCallback((y: number, z: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomHeightPx = room.height * scale;
    const offsetY = (canvas.height - roomHeightPx) / 2;
    // Convert z (relative to sensor) to absolute height, then to canvas coords
    const absoluteZ = room.sensorHeight + z;
    return {
      cx: padding + y * scale,
      cy: offsetY + (room.height - absoluteZ) * scale, // Invert Y for canvas
    };
  }, [room.height, room.sensorHeight, getScale]);

  const canvasToCm = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { y: 0, z: 0 };
    const scale = getScale();
    const roomHeightPx = room.height * scale;
    const offsetY = (canvas.height - roomHeightPx) / 2;
    const absoluteZ = room.height - (cy - offsetY) / scale;
    return {
      y: (cx - padding) / scale,
      z: absoluteZ - room.sensorHeight,
    };
  }, [room.height, room.sensorHeight, getScale]);

  // Convert absolute room coords to canvas (for furniture which uses absolute Y position)
  const absToCanvas = useCallback((y: number, zAbs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomHeightPx = room.height * scale;
    const offsetY = (canvas.height - roomHeightPx) / 2;
    return {
      cx: padding + y * scale,
      cy: offsetY + (room.height - zAbs) * scale,
    };
  }, [room.height, getScale]);

  const canvasToAbs = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { y: 0, z: 0 };
    const scale = getScale();
    const roomHeightPx = room.height * scale;
    const offsetY = (canvas.height - roomHeightPx) / 2;
    return {
      y: (cx - padding) / scale,
      z: room.height - (cy - offsetY) / scale,
    };
  }, [room.height, getScale]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = getScale();
    const roomDepthPx = room.depth * scale;
    const roomHeightPx = room.height * scale;
    const offsetY = (canvas.height - roomHeightPx) / 2;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw room outline
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, offsetY, roomDepthPx, roomHeightPx);

    // Draw floor
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(padding, offsetY + roomHeightPx - 5, roomDepthPx, 5);

    // Draw grid
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    const gridStep = 100; // 100cm grid
    for (let y = gridStep; y < room.depth; y += gridStep) {
      const { cx } = cmToCanvas(y, 0);
      ctx.beginPath();
      ctx.moveTo(cx, offsetY);
      ctx.lineTo(cx, offsetY + roomHeightPx);
      ctx.stroke();
    }
    for (let z = gridStep; z < room.height; z += gridStep) {
      const { cy } = cmToCanvas(0, z - room.sensorHeight);
      ctx.beginPath();
      ctx.moveTo(padding, cy);
      ctx.lineTo(padding + roomDepthPx, cy);
      ctx.stroke();
    }

    // Draw sensor height line
    const sensorPos = cmToCanvas(0, 0);
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, sensorPos.cy);
    ctx.lineTo(padding + roomDepthPx, sensorPos.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw detection zone
    const zoneNear = cmToCanvas(zone.yMin, zone.zMax);
    const zoneFar = cmToCanvas(zone.yMax, zone.zMin);
    const zoneWidth = zoneFar.cx - zoneNear.cx;
    const zoneHeight = zoneFar.cy - zoneNear.cy;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.fillRect(zoneNear.cx, zoneNear.cy, zoneWidth, zoneHeight);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(zoneNear.cx, zoneNear.cy, zoneWidth, zoneHeight);

    // Draw zone drag handles
    ctx.fillStyle = '#10b981';
    // Left handle (near/yMin)
    ctx.fillRect(zoneNear.cx - handleSize / 2, (zoneNear.cy + zoneFar.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Right handle (far/yMax)
    ctx.fillRect(zoneFar.cx - handleSize / 2, (zoneNear.cy + zoneFar.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Top handle (ceiling/zMax)
    ctx.fillRect((zoneNear.cx + zoneFar.cx) / 2 - handleSize / 2, zoneNear.cy - handleSize / 2, handleSize, handleSize);
    // Bottom handle (floor/zMin)
    ctx.fillRect((zoneNear.cx + zoneFar.cx) / 2 - handleSize / 2, zoneFar.cy - handleSize / 2, handleSize, handleSize);

    // Draw furniture (side view - shows depth and height)
    furniture.forEach((item) => {
      const itemTop = absToCanvas(item.y - item.depth / 2, item.height);
      const itemBottom = absToCanvas(item.y + item.depth / 2, 0);

      const itemWidthPx = itemBottom.cx - itemTop.cx;
      const itemHeightPx = itemBottom.cy - itemTop.cy;

      ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.fillRect(itemTop.cx, itemTop.cy, itemWidthPx, itemHeightPx);
      ctx.strokeRect(itemTop.cx, itemTop.cy, itemWidthPx, itemHeightPx);

      // Move handle in center
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(itemTop.cx + itemWidthPx / 2, itemTop.cy + itemHeightPx / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || item.type, itemTop.cx + itemWidthPx / 2, itemTop.cy - 8);
    });

    // Draw detected targets
    targets.forEach((target) => {
      const targetPos = cmToCanvas(target.y, target.z);

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

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';

    // Depth labels (bottom)
    ctx.textAlign = 'center';
    for (let y = 0; y <= room.depth; y += gridStep) {
      const { cx } = cmToCanvas(y, 0);
      ctx.fillText(`${toDisplay(y)}`, cx, offsetY + roomHeightPx + 16);
    }

    // Height labels (left side)
    ctx.textAlign = 'right';
    for (let z = 0; z <= room.height; z += gridStep) {
      const { cy } = cmToCanvas(0, z - room.sensorHeight);
      const label = z - room.sensorHeight;
      const displayLabel = toDisplay(label);
      ctx.fillText(`${displayLabel >= 0 ? '+' : ''}${displayLabel}`, padding - 8, cy + 4);
    }

    // Sensor label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('sensor', sensorPos.cx + 12, sensorPos.cy + 4);
  }, [room, zone, getScale, cmToCanvas, absToCanvas, toDisplay, targets, furniture]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getObjectAtPosition = (cx: number, cy: number): { drag: DragType; cursor: string } => {
    const hitSize = 12;

    // Check furniture first (on top)
    for (let i = furniture.length - 1; i >= 0; i--) {
      const item = furniture[i];
      const itemTop = absToCanvas(item.y - item.depth / 2, item.height);
      const itemBottom = absToCanvas(item.y + item.depth / 2, 0);

      if (cx >= itemTop.cx && cx <= itemBottom.cx &&
          cy >= itemTop.cy && cy <= itemBottom.cy) {
        return { drag: { type: 'furniture', id: item.id }, cursor: 'move' };
      }
    }

    // Check zone handles
    const zoneNear = cmToCanvas(zone.yMin, zone.zMax);
    const zoneFar = cmToCanvas(zone.yMax, zone.zMin);
    const midX = (zoneNear.cx + zoneFar.cx) / 2;
    const midY = (zoneNear.cy + zoneFar.cy) / 2;

    if (Math.abs(cx - zoneNear.cx) < hitSize && Math.abs(cy - midY) < hitSize) {
      return { drag: { type: 'zone', handle: 'left' }, cursor: 'ew-resize' };
    }
    if (Math.abs(cx - zoneFar.cx) < hitSize && Math.abs(cy - midY) < hitSize) {
      return { drag: { type: 'zone', handle: 'right' }, cursor: 'ew-resize' };
    }
    if (Math.abs(cx - midX) < hitSize && Math.abs(cy - zoneNear.cy) < hitSize) {
      return { drag: { type: 'zone', handle: 'top' }, cursor: 'ns-resize' };
    }
    if (Math.abs(cx - midX) < hitSize && Math.abs(cy - zoneFar.cy) < hitSize) {
      return { drag: { type: 'zone', handle: 'bottom' }, cursor: 'ns-resize' };
    }
    if (cx >= zoneNear.cx && cx <= zoneFar.cx && cy >= zoneNear.cy && cy <= zoneFar.cy) {
      return { drag: { type: 'zone', handle: 'move' }, cursor: 'move' };
    }

    return { drag: null, cursor: 'default' };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Scale mouse coords to canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const { drag } = getObjectAtPosition(cx, cy);
    if (drag) {
      setDragType(drag);
      setDragStart({ x: cx, y: cy });

      if (drag.type === 'zone') {
        setInitialZone({ ...zone });
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
    // Scale mouse coords to canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    if (!dragType) {
      const { cursor } = getObjectAtPosition(cx, cy);
      canvas.style.cursor = cursor;
      return;
    }

    if (dragType.type === 'zone' && initialZone) {
      const startCm = canvasToCm(dragStart.x, dragStart.y);
      const currentCm = canvasToCm(cx, cy);
      const dy = Math.round(currentCm.y - startCm.y);
      const dz = Math.round(currentCm.z - startCm.z);

      const newZone = { ...initialZone };

      switch (dragType.handle) {
        case 'left': // Near boundary (yMin)
          newZone.yMin = Math.max(0, Math.min(initialZone.yMin + dy, initialZone.yMax - 10));
          break;
        case 'right': // Far boundary (yMax)
          newZone.yMax = Math.max(initialZone.yMax + dy, initialZone.yMin + 10);
          break;
        case 'top': // Ceiling (zMax)
          newZone.zMax = Math.max(initialZone.zMax + dz, initialZone.zMin + 10);
          break;
        case 'bottom': // Floor (zMin)
          newZone.zMin = Math.min(initialZone.zMin + dz, initialZone.zMax - 10);
          break;
        case 'move':
          newZone.yMin = Math.max(0, initialZone.yMin + dy);
          newZone.yMax = initialZone.yMax + dy;
          newZone.zMin = initialZone.zMin + dz;
          newZone.zMax = initialZone.zMax + dz;
          break;
      }

      onZoneChange(newZone);
    } else if (dragType.type === 'furniture' && initialFurniture && onFurnitureChange) {
      const startAbs = canvasToAbs(dragStart.x, dragStart.y);
      const currentAbs = canvasToAbs(cx, cy);
      const dy = Math.round(currentAbs.y - startAbs.y);

      const newItem = {
        ...initialFurniture,
        y: Math.max(initialFurniture.depth / 2, initialFurniture.y + dy),
      };
      onFurnitureChange(furniture.map(f => f.id === newItem.id ? newItem : f));
    }
  };

  const handleMouseUp = () => {
    setDragType(null);
    setInitialZone(null);
    setInitialFurniture(null);
  };

  return (
    <div className="canvas-container p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Side View (Y-Z)</h3>
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
