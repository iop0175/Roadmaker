/**
 * Intersection Renderer
 * 교차점 렌더링 함수 (외곽선, 본체, 저지선, 혼잡도 표시)
 */

import type { Intersection, Road, Vehicle, Point } from '../types';
import { distance } from '../utils';

/**
 * 교차점 외곽선 렌더링 (도로보다 먼저 그려야 함)
 */
export function renderIntersectionOutlines(
  ctx: CanvasRenderingContext2D, 
  intersections: Intersection[]
): void {
  intersections.forEach(intersection => {
    if (intersection.isRoundabout) {
      // 원형 교차로: 더 큰 외곽선 (진한 티얼)
      ctx.fillStyle = '#0d7377';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 일반 교차로
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * 교차점 본체 렌더링 (도로 다음에 그려야 함)
 */
export function renderIntersectionBodies(
  ctx: CanvasRenderingContext2D, 
  intersections: Intersection[]
): void {
  intersections.forEach(intersection => {
    if (intersection.isRoundabout) {
      // 원형 교차로: 도로 색상 링
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // 중앙 티얼 색상 원 (섬)
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 14, 0, Math.PI * 2);
      ctx.fill();
      
      // 중앙 원의 외곽선
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 일반 교차로
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * 교차점 전체 렌더링 (중앙 표시, 저지선, 혼잡도 포함)
 */
export function renderIntersections(
  ctx: CanvasRenderingContext2D, 
  intersections: Intersection[],
  vehicles: Vehicle[],
  roads: Road[]
): void {
  // 교차점 혼잡도 계산
  const intersectionCounts = new Map<string, number>();
  vehicles.forEach(v => {
    Object.keys(v.intersectionArrivalTimes).forEach(key => {
       intersectionCounts.set(key, (intersectionCounts.get(key) || 0) + 1);
    });
  });

  // 각 교차점 렌더링
  intersections.forEach(intersection => {
    const key = `${intersection.point.x},${intersection.point.y}`;
    const count = intersectionCounts.get(key) || 0;
    const isHeavyCongested = count >= 8; // 8대 이상이면 심각한 정체
    const isCongested = count >= 4;       // 4대 이상이면 정체

    // 원형 교차로는 별도 렌더링
    if (intersection.isRoundabout) {
      // 원형 교차로 중앙에 회전 화살표 아이콘
      ctx.save();
      ctx.translate(intersection.point.x, intersection.point.y);
      
      // 회전 화살표 (시계 방향)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 원형 화살표 (시계방향 회전 표시)
      ctx.beginPath();
      ctx.arc(0, 0, 8, -Math.PI * 0.7, Math.PI * 0.5);
      ctx.stroke();
      
      // 화살표 머리
      const arrowAngle = Math.PI * 0.5;
      const arrowX = 8 * Math.cos(arrowAngle);
      const arrowY = 8 * Math.sin(arrowAngle);
      ctx.beginPath();
      ctx.moveTo(arrowX + 3, arrowY - 3);
      ctx.lineTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 3, arrowY - 3);
      ctx.stroke();
      
      ctx.restore();
      return; // 원형 교차로는 여기서 종료
    }

    // 정체 시 배경 원 (경고 표시)
    if (isHeavyCongested) {
      // 심각한 정체: 빨간 원
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (isCongested) {
      // 일반 정체: 주황 원
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // 중앙 점 (정체 정도에 따라 색상 변경)
    ctx.fillStyle = isHeavyCongested ? '#dc2626' : isCongested ? '#f97316' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(intersection.point.x, intersection.point.y, isHeavyCongested ? 6 : isCongested ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 외곽 링
    ctx.strokeStyle = isHeavyCongested ? '#dc2626' : isCongested ? '#fb923c' : '#9ca3af';
    ctx.lineWidth = isHeavyCongested ? 3 : isCongested ? 2 : 1;
    ctx.beginPath();
    ctx.arc(intersection.point.x, intersection.point.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    // 정체 표시 (정체시에만)
    if (isHeavyCongested) {
       ctx.fillStyle = '#ffffff';
       ctx.font = 'bold 11px system-ui';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText('!', intersection.point.x, intersection.point.y);
    } else if (isCongested) {
       ctx.fillStyle = '#ffffff';
       ctx.font = 'bold 10px system-ui';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText('!', intersection.point.x, intersection.point.y);
    }
    
    // 저지선 표시 (교차점에 연결된 각 도로에 흰색 선)
    roads.forEach(road => {
      // 이 도로가 교차점에 연결되어 있는지 확인
      const atStart = distance(road.start, intersection.point) < 5;
      const atEnd = distance(road.end, intersection.point) < 5;
      
      if (atStart || atEnd) {
        // 도로 방향 계산
        const roadStart = atStart ? road.start : road.end;
        const roadEnd = atStart ? road.end : road.start;
        const dx = roadEnd.x - roadStart.x;
        const dy = roadEnd.y - roadStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        
        // 정규화된 방향
        const nx = dx / len;
        const ny = dy / len;
        
        // 저지선 위치 (교차점에서 20px 떨어진 곳)
        const stopLineX = intersection.point.x + nx * 20;
        const stopLineY = intersection.point.y + ny * 20;
        
        // 수직 방향
        const perpX = -ny;
        const perpY = nx;
        
        // 저지선 그리기 (흰색)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(stopLineX + perpX * 10, stopLineY + perpY * 10);
        ctx.lineTo(stopLineX - perpX * 10, stopLineY - perpY * 10);
        ctx.stroke();
      }
    });
  });
}
