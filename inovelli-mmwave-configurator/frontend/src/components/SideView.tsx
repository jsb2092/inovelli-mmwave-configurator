import { useRef, useEffect, useState, useCallback } from 'react';
import { RoomDimensions, ZoneBounds, UnitSystem, cmToInches } from '../types';

interface SideViewProps {
  room: RoomDimensions;
  zone: ZoneBounds;
  onZoneChange: (zone: ZoneBounds) => void;
  units: UnitSystem;
}

type DragHandle = 'left' | 'right' | 'top' | 'bottom' | 'move' | null;

export function SideView({ room, zone, onZoneChange, units }: SideViewProps) {
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
  }, [room.depth, room.height, room.sensorHeight, getScale]);

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

    // Draw drag handles
    const handleSize = 8;
    ctx.fillStyle = '#10b981';

    // Left handle (near/yMin)
    ctx.fillRect(zoneNear.cx - handleSize / 2, (zoneNear.cy + zoneFar.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Right handle (far/yMax)
    ctx.fillRect(zoneFar.cx - handleSize / 2, (zoneNear.cy + zoneFar.cy) / 2 - handleSize / 2, handleSize, handleSize);
    // Top handle (ceiling/zMax)
    ctx.fillRect((zoneNear.cx + zoneFar.cx) / 2 - handleSize / 2, zoneNear.cy - handleSize / 2, handleSize, handleSize);
    // Bottom handle (floor/zMin)
    ctx.fillRect((zoneNear.cx + zoneFar.cx) / 2 - handleSize / 2, zoneFar.cy - handleSize / 2, handleSize, handleSize);

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
  }, [room, zone, getScale, cmToCanvas, toDisplay]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getHandleAtPosition = (cx: number, cy: number): DragHandle => {
    const handleSize = 12;
    const zoneNear = cmToCanvas(zone.yMin, zone.zMax);
    const zoneFar = cmToCanvas(zone.yMax, zone.zMin);
    const midX = (zoneNear.cx + zoneFar.cx) / 2;
    const midY = (zoneNear.cy + zoneFar.cy) / 2;

    // Check handles
    if (Math.abs(cx - zoneNear.cx) < handleSize && Math.abs(cy - midY) < handleSize) return 'left';
    if (Math.abs(cx - zoneFar.cx) < handleSize && Math.abs(cy - midY) < handleSize) return 'right';
    if (Math.abs(cx - midX) < handleSize && Math.abs(cy - zoneNear.cy) < handleSize) return 'top';
    if (Math.abs(cx - midX) < handleSize && Math.abs(cy - zoneFar.cy) < handleSize) return 'bottom';

    // Check if inside zone for move
    if (cx >= zoneNear.cx && cx <= zoneFar.cx && cy >= zoneNear.cy && cy <= zoneFar.cy) {
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
    const dy = Math.round(currentCm.y - startCm.y);
    const dz = Math.round(currentCm.z - startCm.z);

    const newZone = { ...initialZone };

    switch (dragHandle) {
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
  };

  const handleMouseUp = () => {
    setDragHandle(null);
    setInitialZone(null);
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
