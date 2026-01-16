/**
 * Road Renderer
 * 도로 렌더링 함수 (외곽선, 본체, 중앙선)
 */

import type { Road, Point } from '../types';
import { ROAD_WIDTH, ROAD_OUTLINE_WIDTH } from '../constants';

/**
 * 도로 외곽선 렌더링
 */
function renderRoadOutlines(ctx: CanvasRenderingContext2D, roads: Road[]): void {
  ctx.lineWidth = ROAD_OUTLINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 고가차도 외곽선은 본체에서 처리하므로 제외
  roads.filter(r => !r.isOverpass).forEach(road => {
    ctx.strokeStyle = road.isBridge ? '#8b4513' : '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
  });
}

/**
 * 도로 본체 렌더링
 */
function renderRoadBodies(ctx: CanvasRenderingContext2D, roads: Road[]): void {
  ctx.lineWidth = ROAD_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 일반 도로 먼저 렌더링 (고가차도/다리 제외)
  roads.filter(r => !r.isBridge && !r.isOverpass).forEach(road => {
    ctx.strokeStyle = road.type === 'highway' ? '#93c5fd' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
  });
  
  // 다리 렌더링
  roads.filter(r => r.isBridge).forEach(road => {
    ctx.strokeStyle = '#d4a373';
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
    
    // 다리 끝점에 연결부 (원형) 렌더링 - 자연스러운 전환
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.arc(road.start.x, road.start.y, ROAD_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(road.end.x, road.end.y, ROAD_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 고가차도는 맨 마지막에 렌더링 (위에 그려짐)
  roads.filter(r => r.isOverpass).forEach(road => {
    // 그림자 (아래에 그려짐)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = ROAD_WIDTH + 6;
    ctx.beginPath();
    ctx.moveTo(road.start.x + 4, road.start.y + 4);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x + 4, road.controlPoint.y + 4, road.end.x + 4, road.end.y + 4);
    } else {
      ctx.lineTo(road.end.x + 4, road.end.y + 4);
    }
    ctx.stroke();
    ctx.restore();
    
    // 고가차도 기둥 (양 끝과 중간)
    const pillarColor = '#6b7280';
    ctx.fillStyle = pillarColor;
    
    // 시작 기둥
    ctx.beginPath();
    ctx.arc(road.start.x, road.start.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 끝 기둥
    ctx.beginPath();
    ctx.arc(road.end.x, road.end.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 중간 기둥들
    const dx = road.end.x - road.start.x;
    const dy = road.end.y - road.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const pillarCount = Math.max(1, Math.floor(length / 50)); // 50px마다 기둥
    for (let i = 1; i < pillarCount; i++) {
      const t = i / pillarCount;
      let px, py;
      if (road.controlPoint) {
        px = (1 - t) * (1 - t) * road.start.x + 2 * (1 - t) * t * road.controlPoint.x + t * t * road.end.x;
        py = (1 - t) * (1 - t) * road.start.y + 2 * (1 - t) * t * road.controlPoint.y + t * t * road.end.y;
      } else {
        px = road.start.x + t * dx;
        py = road.start.y + t * dy;
      }
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 고가차도 외곽선
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = ROAD_OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
    
    // 고가차도 본체 (진한 보라색 계열)
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = ROAD_WIDTH;
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
    
    // 고가차도 끝점에 연결부 (원형) 렌더링
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(road.start.x, road.start.y, ROAD_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(road.end.x, road.end.y, ROAD_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * 도로 중앙선 렌더링
 */
function renderRoadCenterLines(ctx: CanvasRenderingContext2D, roads: Road[]): void {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  roads.forEach(road => {
    // 고가차도는 연한 보라색 중앙선 (진한 보라색 도로와 대비)
    ctx.strokeStyle = road.isOverpass ? '#c4b5fd' : '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(road.start.x, road.start.y);
    if (road.controlPoint) {
      ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
    } else {
      ctx.lineTo(road.end.x, road.end.y);
    }
    ctx.stroke();
  });
}

/**
 * 모든 도로 렌더링 (외곽선 + 본체 + 중앙선)
 */
export function renderRoads(ctx: CanvasRenderingContext2D, roads: Road[]): void {
  renderRoadOutlines(ctx, roads);
  renderRoadBodies(ctx, roads);
  renderRoadCenterLines(ctx, roads);
}

/**
 * 선택된 도로 하이라이트 렌더링
 */
export function renderSelectedRoad(ctx: CanvasRenderingContext2D, road: Road): void {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#06b6d4'; // Cyan
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
  ctx.lineWidth = ROAD_WIDTH + 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(road.start.x, road.start.y);
  if (road.controlPoint) {
    ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
  } else {
    ctx.lineTo(road.end.x, road.end.y);
  }
  ctx.stroke();
  ctx.restore();
}

interface RoadPreviewOptions {
  drawStart: Point;
  currentEnd: Point;
  controlPoint?: Point | null;
  isInvalid: boolean;
  crossesRiver: boolean;
  hasBridge: boolean;
  cost: number;          // 건설 비용
  isBridgeMode: boolean; // 다리 모드인지
  isHighwayMode: boolean; // 고속도로 모드인지
}

/**
 * 도로 프리뷰 렌더링
 */
export function renderRoadPreview(ctx: CanvasRenderingContext2D, options: RoadPreviewOptions): void {
  const { drawStart, currentEnd, controlPoint, isInvalid, crossesRiver, hasBridge, isBridgeMode, isHighwayMode } = options;
  
  let previewColor = 'rgba(66, 133, 244, 0.5)'; // 기본: 파란색
  
  if (isInvalid) {
    previewColor = 'rgba(239, 68, 68, 0.6)'; // 유효하지 않음: 빨간색
  } else if (crossesRiver) {
    // 강을 건너는 경우
    if (isBridgeMode && hasBridge) {
      previewColor = 'rgba(210, 180, 140, 0.8)'; // 다리 모드이고 아이템 있음: 갈색
    } else if (isBridgeMode && !hasBridge) {
      previewColor = 'rgba(239, 68, 68, 0.6)'; // 다리 모드지만 아이템 없음: 빨간색
    } else {
      previewColor = 'rgba(239, 68, 68, 0.6)'; // 일반 모드에서 강 건너기: 빨간색
    }
  } else if (isHighwayMode) {
    previewColor = 'rgba(147, 197, 253, 0.8)'; // 고속도로 모드: 하늘색
  } else if (isBridgeMode) {
    previewColor = 'rgba(210, 180, 140, 0.8)'; // 다리 모드 (강 안건넘): 갈색
  }

  ctx.strokeStyle = previewColor;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(drawStart.x, drawStart.y);
  if (controlPoint) {
    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, currentEnd.x, currentEnd.y);
  } else {
    ctx.lineTo(currentEnd.x, currentEnd.y);
  }
  ctx.stroke();

  // 컨트롤 포인트 표시
  if (controlPoint) {
    ctx.fillStyle = 'rgba(66, 133, 244, 0.8)';
    ctx.beginPath();
    ctx.arc(controlPoint.x, controlPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 비용 표시는 React 오버레이로 처리 (previewCost)
}
