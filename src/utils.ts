/**
 * 유틸리티 함수 모음
 */
import type { Point, RiverSegment, Building, Road } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  RIVER_MIN_WIDTH,
  RIVER_MAX_WIDTH,
  BUILDING_MARGIN,
  MIN_BUILDING_DISTANCE,
  MIN_HOME_OFFICE_DISTANCE,
  BUILDING_COLORS,
  ROAD_OVERLAP_THRESHOLD,
  ROAD_OVERLAP_RATIO,
  LANE_OFFSET,
} from './constants';

// ============ 수학 유틸리티 ============

/** 두 점 사이의 거리 계산 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/** 좌표를 그리드에 스냅 */
export function snapToGrid(point: Point): Point {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}

/** 색상 밝기 조절 */
export function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/** 차선 오프셋 계산 */
export function getLaneOffset(from: Point, to: Point, lane: 'left' | 'right'): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { x: 0, y: 0 };
  const perpX = -dy / length;
  const perpY = dx / length;
  // LANE_OFFSET은 constants에서 import 필요
  const offset = lane === 'right' ? LANE_OFFSET : -LANE_OFFSET;
  return { x: perpX * offset, y: perpY * offset };
}

// ============ 베지어 곡선 유틸리티 ============

/** 베지어 곡선 위의 점 샘플링 */
export function sampleBezierCurve(
  start: Point, 
  control: Point, 
  end: Point, 
  segments: number = 10
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x,
      y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y,
    });
  }
  return points;
}

/** 경로 부드럽게 만들기 (곡선 도로 보간 및 속도 정보 포함) */
export function interpolatePath(path: Point[], roads: Road[]): Point[] {
  if (path.length < 2) return path;
  
  // 첫 포인트 초기화
  const newPath: Point[] = [{ ...path[0], speedMultiplier: 1.0 }];
  
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i+1];
    
    // 두 점을 연결하는 도로 찾기
    const road = roads.find(r => 
      (distance(r.start, p1) < 5 && distance(r.end, p2) < 5) ||
      (distance(r.start, p2) < 5 && distance(r.end, p1) < 5)
    );
    
    const speed = road?.type === 'highway' ? 1.5 : 1.0;

    // 곡선 도로인 경우 샘플링
    if (road && road.controlPoint) {
      const d = distance(p1, p2);
      const segments = Math.max(10, Math.floor(d / 10)); // 10px 단위로 샘플링
      
      const points = sampleBezierCurve(p1, road.controlPoint, p2, segments);
      // 첫 점은 이미 포함되어 있으므로 제외하고 추가
      for (let j = 1; j < points.length; j++) {
        newPath.push({ ...points[j], speedMultiplier: speed });
      }
    } else {
      // 직선인 경우 그냥 다음 점 추가
      newPath.push({ ...p2, speedMultiplier: speed });
    }
  }
  return newPath;
}

// ============ 강 생성 유틸리티 ============

/** Catmull-Rom 스플라인을 통한 부드러운 곡선 보간 */
function catmullRomSpline(
  p0: Point, p1: Point, p2: Point, p3: Point, 
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + 
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + 
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + 
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + 
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  };
}

/** 랜덤 강 생성 (부드러운 곡선) - 맵 크기 반영 */
export function generateRandomRiver(width: number = CANVAS_WIDTH, height: number = CANVAS_HEIGHT): RiverSegment[] {
  const direction = Math.floor(Math.random() * 3);
  
  const controlPoints: { x: number; y: number; width: number }[] = [];
  
  if (direction === 0) {
    // 수평 강
    const baseY = height * 0.25 + Math.random() * (height * 0.5);
    let currentY = baseY;
    
    const numPoints = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * width;
      currentY += (Math.random() - 0.5) * 80;
      currentY = Math.max(80, Math.min(height - 80, currentY));
      controlPoints.push({ 
        x, 
        y: currentY, 
        width: RIVER_MIN_WIDTH + Math.random() * (RIVER_MAX_WIDTH - RIVER_MIN_WIDTH) 
      });
    }
  } else if (direction === 1) {
    // 수직 강
    const baseX = width * 0.25 + Math.random() * (width * 0.5);
    let currentX = baseX;
    
    const numPoints = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i <= numPoints; i++) {
      const y = (i / numPoints) * height;
      currentX += (Math.random() - 0.5) * 80;
      currentX = Math.max(80, Math.min(width - 80, currentX));
      controlPoints.push({ 
        x: currentX, 
        y, 
        width: RIVER_MIN_WIDTH + Math.random() * (RIVER_MAX_WIDTH - RIVER_MIN_WIDTH) 
      });
    }
  } else {
    // 대각선 강
    const startTop = Math.random() > 0.5;
    const numPoints = 5 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      let x = t * width;
      let y: number;
      
      if (startTop) {
        y = 50 + t * (height - 100);
        y += Math.sin(t * Math.PI * 2) * 80;
      } else {
        y = height - 50 - t * (height - 100);
        y += Math.sin(t * Math.PI * 2) * 80;
      }
      
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      
      x = Math.max(0, Math.min(width, x));
      y = Math.max(50, Math.min(height - 50, y));
      
      controlPoints.push({ 
        x, 
        y, 
        width: RIVER_MIN_WIDTH + Math.random() * (RIVER_MAX_WIDTH - RIVER_MIN_WIDTH) 
      });
    }
  }
  
  if (controlPoints.length < 3) {
    return [
      { x: 0, y: height/2, width: 50 }, 
      { x: width/2, y: height/2 + 20, width: 55 },
      { x: width, y: height/2 - 20, width: 50 }
    ];
  }
  
  const segments: RiverSegment[] = [];
  const samplesPerSegment = 5; 
  
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p0 = controlPoints[Math.max(0, i - 1)];
    const p1 = controlPoints[i];
    const p2 = controlPoints[Math.min(controlPoints.length - 1, i + 1)];
    const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];
    
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const point = catmullRomSpline(p0, p1, p2, p3, t);
      const widthSeg = p1.width + (p2.width - p1.width) * t;
      
      segments.push({ x: point.x, y: point.y, width: widthSeg });
    }
  }
  
  const last = controlPoints[controlPoints.length - 1];
  segments.push({ x: last.x, y: last.y, width: last.width });
  
  return segments;
}

/** 점이 강 위에 있는지 확인 (정적 - 건물 배치용) */
export function isPointInRiverStatic(point: Point, riverSegments: RiverSegment[]): boolean {
  // 건물 여백 (강에서 최소 50px 떨어져야 함)
  const buildingBuffer = 50;
  
  for (let i = 0; i < riverSegments.length - 1; i++) {
    const seg1 = riverSegments[i];
    const seg2 = riverSegments[i + 1];
    
    // 세그먼트 길이
    const segDx = seg2.x - seg1.x;
    const segDy = seg2.y - seg1.y;
    const segLength = Math.sqrt(segDx * segDx + segDy * segDy);
    
    if (segLength === 0) continue;
    
    // 점에서 세그먼트까지의 투영 위치 계산
    const t = Math.max(0, Math.min(1, 
      ((point.x - seg1.x) * segDx + (point.y - seg1.y) * segDy) / (segLength * segLength)
    ));
    
    // 가장 가까운 점
    const closestX = seg1.x + t * segDx;
    const closestY = seg1.y + t * segDy;
    
    // 해당 위치에서의 강 너비
    const riverWidth = seg1.width + (seg2.width - seg1.width) * t;
    
    // 거리 계산
    const distToRiver = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
    
    // 강 너비의 절반 + 건물 여백 이내이면 충돌
    if (distToRiver < riverWidth / 2 + buildingBuffer) {
      return true;
    }
  }
  return false;
}

/** 점과 도로 사이의 거리 체크 */
function isTooCloseToRoads(point: Point, roads: Road[], minDistance: number): boolean {
  if (roads.length === 0) return false;

  for (const road of roads) {
    // 1. 끝점과의 거리
    if (distance(point, road.start) < minDistance) return true;
    if (distance(point, road.end) < minDistance) return true;

    // 2. 도로 선분/곡선과의 거리
    const steps = road.controlPoint ? 10 : 5;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let rx, ry;
        if (road.controlPoint) {
             rx = (1 - t) * (1 - t) * road.start.x + 2 * (1 - t) * t * road.controlPoint.x + t * t * road.end.x;
             ry = (1 - t) * (1 - t) * road.start.y + 2 * (1 - t) * t * road.controlPoint.y + t * t * road.end.y;
        } else {
             rx = road.start.x + (road.end.x - road.start.x) * t;
             ry = road.start.y + (road.end.y - road.start.y) * t;
        }
        
        if (distance(point, { x: rx, y: ry }) < minDistance) return true;
    }
  }
  return false;
}

// ============ 건물 생성 유틸리티 ============

/** 단일 집 생성 - 맵 크기 반영 */
export function generateHome(
  index: number,
  existingBuildings: Building[],
  riverSegments: RiverSegment[],
  width: number = CANVAS_WIDTH,
  height: number = CANVAS_HEIGHT,
  roads: Road[] = []
): Building {
  const color = BUILDING_COLORS[index % BUILDING_COLORS.length];
  let homePos: Point | null = null;
  let attempts = 0;

  // 집 위치 찾기
  while (!homePos && attempts < 2000) {
    const x = BUILDING_MARGIN + Math.random() * (width - BUILDING_MARGIN * 2);
    const y = BUILDING_MARGIN + Math.random() * (height - BUILDING_MARGIN * 2);
    const point = { x, y };

    const isOverlapping = existingBuildings.some(b => distance(b.position, point) < MIN_BUILDING_DISTANCE);
    
    if (!isPointInRiverStatic(point, riverSegments) && 
        !isOverlapping && 
        !isTooCloseToRoads(point, roads, 50)) {
      homePos = point;
    }
    attempts++;
  }

  // 실패 시 강제로 겹치지 않는 위치 찾기 (격자 탐색)
  if (!homePos) {
     // 최후의 수단: 맵 전체 그리드 스캔
     for(let x=BUILDING_MARGIN; x<width-BUILDING_MARGIN; x+=50) {
        for(let y=BUILDING_MARGIN; y<height-BUILDING_MARGIN; y+=50) {
            const point = {x, y};
            const isOverlapping = existingBuildings.some(b => distance(b.position, point) < MIN_BUILDING_DISTANCE);
             if (!isPointInRiverStatic(point, riverSegments) && 
                 !isOverlapping && 
                 !isTooCloseToRoads(point, roads, 50)) {
                homePos = point;
                break;
             }
        }
        if(homePos) break;
     }
  }

  // 그래도 없으면... 어쩔 수 없음 (드문 경우)
  if (!homePos) {
      homePos = { x: width/2, y: height/2 }; 
  }
  
  const suffix = Date.now() + Math.floor(Math.random() * 1000);
  const now = Date.now();
  return { 
    id: `color${index}-home-${suffix}`, 
    position: homePos, 
    color, 
    name: '',
    lastActiveTime: now,
    createdAt: now
  };
}

/** 단일 회사 생성 - 맵 크기 반영 */
export function generateOffice(
  index: number,
  existingBuildings: Building[],
  riverSegments: RiverSegment[],
  width: number = CANVAS_WIDTH,
  height: number = CANVAS_HEIGHT,
  roads: Road[] = []
): Building {
  const color = BUILDING_COLORS[index % BUILDING_COLORS.length];
  let officePos: Point | null = null;
  let attempts = 0;

  // 회사 위치 찾기
  while (!officePos && attempts < 2000) {
    const x = BUILDING_MARGIN + Math.random() * (width - BUILDING_MARGIN * 2);
    const y = BUILDING_MARGIN + Math.random() * (height - BUILDING_MARGIN * 2);
    const point = { x, y };
    
    const isOverlapping = existingBuildings.some(b => distance(b.position, point) < MIN_BUILDING_DISTANCE);
    const tooCloseToAnyHome = existingBuildings
      .filter(b => b.id.includes('home'))
      .some(h => distance(h.position, point) < MIN_HOME_OFFICE_DISTANCE);

    if (!isPointInRiverStatic(point, riverSegments) && 
        !isOverlapping &&
        !tooCloseToAnyHome &&
        !isTooCloseToRoads(point, roads, 55)) {
      officePos = point;
    }
    attempts++;
  }

  // 실패 시 격자 탐색
  if (!officePos) {
     for(let x=BUILDING_MARGIN; x<width-BUILDING_MARGIN; x+=50) {
        for(let y=BUILDING_MARGIN; y<height-BUILDING_MARGIN; y+=50) {
            const point = {x, y};
            const isOverlapping = existingBuildings.some(b => distance(b.position, point) < MIN_BUILDING_DISTANCE);
            if (!isPointInRiverStatic(point, riverSegments) && 
                !isOverlapping && 
                !isTooCloseToRoads(point, roads, 55)) {
                officePos = point;
                break;
            }
        }
        if(officePos) break;
     }
  }

  if (!officePos) {
    officePos = { x: width - BUILDING_MARGIN - Math.random() * 100, y: height - BUILDING_MARGIN - Math.random() * 100 };
  }

  const suffix = Date.now() + Math.floor(Math.random() * 1000);
  const now = Date.now();
  return { 
    id: `color${index}-office-${suffix}`, 
    position: officePos, 
    color, 
    name: '',
    lastActiveTime: now,
    createdAt: now
  };
}

/** 단일 건물 쌍 생성 (집 + 회사) - 맵 크기 반영 */
export function generateBuildingPair(
  index: number,
  existingBuildings: Building[],
  riverSegments: RiverSegment[],
  width: number = CANVAS_WIDTH,
  height: number = CANVAS_HEIGHT,
  roads: Road[] = []
): Building[] {
  const home = generateHome(index, existingBuildings, riverSegments, width, height, roads);
  const office = generateOffice(index, [...existingBuildings, home], riverSegments, width, height, roads);
  
  if (index < 5) {
      home.id = `color${index}-home`;
      office.id = `color${index}-office`;
  }

  return [home, office];
}

/** 랜덤 건물 배치 (강을 피해서, 맵 크기 반영) */
export function generateRandomBuildings(
  riverSegments: RiverSegment[], 
  count: number = 3, 
  width: number = CANVAS_WIDTH, 
  height: number = CANVAS_HEIGHT,
  roads: Road[] = []
): Building[] {
  const buildings: Building[] = [];
  
  for (let i = 0; i < count; i++) {
    const pair = generateBuildingPair(i, buildings, riverSegments, width, height, roads);
    buildings.push(...pair);
  }
  
  return buildings;
}

// ============ 도로 검사 유틸리티 ============

/** 새 도로가 기존 도로와 겹치는지 확인 (직선 및 커브 도로 모두 지원) */
export function doRoadsOverlap(
  newStart: Point, 
  newEnd: Point, 
  existingRoads: Road[],
  newControlPoint?: Point
): boolean {
  const samplePoints: Point[] = [];
  const steps = 10;
  
  // 새 도로의 샘플 포인트 생성 (커브 도로 지원)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (newControlPoint) {
      // 베지어 곡선
      samplePoints.push({
        x: (1 - t) * (1 - t) * newStart.x + 2 * (1 - t) * t * newControlPoint.x + t * t * newEnd.x,
        y: (1 - t) * (1 - t) * newStart.y + 2 * (1 - t) * t * newControlPoint.y + t * t * newEnd.y,
      });
    } else {
      // 직선
      samplePoints.push({
        x: newStart.x + (newEnd.x - newStart.x) * t,
        y: newStart.y + (newEnd.y - newStart.y) * t,
      });
    }
  }
  
  // 각 기존 도로와 비교
  for (const road of existingRoads) {
    let overlapCount = 0;
    
    for (const point of samplePoints) {
      const roadSteps = 10;
      for (let j = 0; j <= roadSteps; j++) {
        const t = j / roadSteps;
        let roadPoint: Point;
        
        if (road.controlPoint) {
          roadPoint = {
            x: (1 - t) * (1 - t) * road.start.x + 2 * (1 - t) * t * road.controlPoint.x + t * t * road.end.x,
            y: (1 - t) * (1 - t) * road.start.y + 2 * (1 - t) * t * road.controlPoint.y + t * t * road.end.y,
          };
        } else {
          roadPoint = {
            x: road.start.x + (road.end.x - road.start.x) * t,
            y: road.start.y + (road.end.y - road.start.y) * t,
          };
        }
        
        if (distance(point, roadPoint) < ROAD_OVERLAP_THRESHOLD) {
          overlapCount++;
          break;
        }
      }
    }
    
    if (overlapCount > steps * ROAD_OVERLAP_RATIO) {
      return true;
    }
  }
  
  return false;
}
