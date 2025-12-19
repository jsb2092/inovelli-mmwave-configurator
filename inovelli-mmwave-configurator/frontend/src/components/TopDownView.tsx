import { useRef, useEffect, useState, useCallback } from 'react';
import { RoomDimensions, ZoneBounds, UnitSystem, cmToInches, Target, RoomObstacle, FurnitureItem, SensorPosition, HADevice } from '../types';

interface SensorInRoom {
  device: HADevice;
  position: SensorPosition;
  isSelected: boolean;
}

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
  // Multi-sensor support
  sensorsInRoom?: SensorInRoom[];
  onSelectSensor?: (deviceId: string) => void;
}

type DragType =
  | { type: 'zone'; handle: 'left' | 'right' | 'top' | 'bottom' | 'move' }
  | { type: 'obstacle'; id: string; handle: 'move' | 'nw' | 'ne' | 'sw' | 'se' }
  | { type: 'furniture'; id: string }
  | { type: 'sensor'; deviceId: string }
  | null;

export function TopDownView({
  room, zone, onZoneChange, units, targets = [], obstacles = [], furniture = [],
  onObstaclesChange, onFurnitureChange, sensorsInRoom = [], onSelectSensor
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
  // X axis is mirrored so sensor's left (negative X) appears on viewer's right
  const cmToCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      cx: offsetX + (room.width - room.sensorX - x) * scale,
      cy: padding + y * scale,
    };
  }, [room.width, room.sensorX, getScale]);

  // Convert room-absolute cm to canvas pixels (mirrored X)
  const absToCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      cx: offsetX + (room.width - x) * scale,
      cy: padding + y * scale,
    };
  }, [room.width, getScale]);

  const canvasToCm = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    // Inverse of mirrored transform
    return {
      x: room.width - room.sensorX - (cx - offsetX) / scale,
      y: (cy - padding) / scale,
    };
  }, [room.width, room.sensorX, getScale]);

  // Convert canvas to absolute room coordinates (mirrored X)
  const canvasToAbs = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;
    return {
      x: room.width - (cx - offsetX) / scale,
      y: (cy - padding) / scale,
    };
  }, [room.width, getScale]);

  // Get canvas position for a sensor based on wall and position along wall
  const getSensorCanvasPos = useCallback((sensorPos: SensorPosition) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0, rotation: 0 };
    const scale = getScale();
    const roomWidthPx = room.width * scale;
    const roomDepthPx = room.depth * scale;
    const offsetX = (canvas.width - roomWidthPx) / 2;

    switch (sensorPos.wall) {
      case 'top':
        return {
          cx: offsetX + (room.width - sensorPos.position) * scale,
          cy: padding,
          rotation: 0,
        };
      case 'bottom':
        return {
          cx: offsetX + sensorPos.position * scale,
          cy: padding + roomDepthPx,
          rotation: Math.PI,
        };
      case 'left':
        return {
          cx: offsetX + roomWidthPx,
          cy: padding + sensorPos.position * scale,
          rotation: -Math.PI / 2,
        };
      case 'right':
        return {
          cx: offsetX,
          cy: padding + (room.depth - sensorPos.position) * scale,
          rotation: Math.PI / 2,
        };
      default:
        return { cx: offsetX + roomWidthPx / 2, cy: padding, rotation: 0 };
    }
  }, [room.width, room.depth, getScale]);

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

    // Draw sensors
    const drawSensor = (cx: number, cy: number, rotation: number, isSelected: boolean, label?: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Sensor circle
      ctx.fillStyle = isSelected ? '#f59e0b' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, sensorSize, 0, Math.PI * 2);
      ctx.fill();

      // Selection ring for selected sensor
      if (isSelected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, sensorSize + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Direction arrow (pointing into room)
      ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(0, 25);
      ctx.lineTo(-6, 18);
      ctx.moveTo(0, 25);
      ctx.lineTo(6, 18);
      ctx.stroke();

      ctx.restore();

      // Label (drawn without rotation)
      if (label) {
        ctx.fillStyle = isSelected ? '#fbbf24' : '#64748b';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy - 12);
      }
    };

    // If we have multiple sensors, draw them all
    if (sensorsInRoom.length > 0) {
      sensorsInRoom.forEach((sensor) => {
        const pos = getSensorCanvasPos(sensor.position);
        drawSensor(pos.cx, pos.cy, pos.rotation, sensor.isSelected, sensor.device.name);
      });
    } else {
      // Legacy: draw single sensor from room.sensorX
      drawSensor(sensorPos.cx, sensorPos.cy, 0, true);
    }

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
    ctx.fillText("Switch's Right", offsetX + 4, padding + roomDepthPx - 4);
    ctx.textAlign = 'right';
    ctx.fillText("Switch's Left", offsetX + roomWidthPx - 4, padding + roomDepthPx - 4);
  }, [room, zone, getScale, cmToCanvas, absToCanvas, toDisplay, targets, obstacles, furniture, sensorsInRoom, getSensorCanvasPos]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getObjectAtPosition = (cx: number, cy: number): { drag: DragType; cursor: string } => {
    const hitSize = 12;

    // Check sensors first (highest priority for selection)
    for (const sensor of sensorsInRoom) {
      const pos = getSensorCanvasPos(sensor.position);
      const dist = Math.sqrt((cx - pos.cx) ** 2 + (cy - pos.cy) ** 2);
      if (dist < sensorSize + hitSize) {
        return { drag: { type: 'sensor', deviceId: sensor.device.id }, cursor: 'pointer' };
      }
    }

    // Check furniture (on top)
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

    // Check obstacles (note: with mirrored X, pos1.cx may be > pos2.cx)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const pos1 = absToCanvas(obs.x1, obs.y1);
      const pos2 = absToCanvas(obs.x2, obs.y2);
      const obsMinX = Math.min(pos1.cx, pos2.cx);
      const obsMaxX = Math.max(pos1.cx, pos2.cx);
      const obsMinY = Math.min(pos1.cy, pos2.cy);
      const obsMaxY = Math.max(pos1.cy, pos2.cy);

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
      if (cx >= obsMinX && cx <= obsMaxX && cy >= obsMinY && cy <= obsMaxY) {
        return { drag: { type: 'obstacle', id: obs.id, handle: 'move' }, cursor: 'move' };
      }
    }

    // Check zone handles (note: with mirrored X, zoneLeft.cx > zoneRight.cx)
    const zoneLeft = cmToCanvas(zone.xMin, zone.yMin);
    const zoneRight = cmToCanvas(zone.xMax, zone.yMax);
    const zoneMinX = Math.min(zoneLeft.cx, zoneRight.cx);
    const zoneMaxX = Math.max(zoneLeft.cx, zoneRight.cx);
    const zoneMinY = Math.min(zoneLeft.cy, zoneRight.cy);
    const zoneMaxY = Math.max(zoneLeft.cy, zoneRight.cy);
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
    if (cx >= zoneMinX && cx <= zoneMaxX && cy >= zoneMinY && cy <= zoneMaxY) {
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
      // Sensor clicks select the device, not drag
      if (drag.type === 'sensor') {
        if (onSelectSensor) {
          onSelectSensor(drag.deviceId);
        }
        return;
      }

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
