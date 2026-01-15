/**
 * City Road Builder - 도시 도로 건설 게임
 * 
 * 게임 규칙:
 * - 마우스 드래그로 도로 건설
 * - Shift + 드래그로 커브 도로 건설
 * - 강 위에는 도로 건설 불가
 * - 기존 도로와 겹치는 도로 건설 불가 (교차점만 허용)
 * - 차량이 집 → 회사 → 집 사이클 완료 시 점수 획득
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Point, Road, Building, Vehicle, Intersection, RiverSegment } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRID_SIZE, 
  VEHICLE_SIZE,
  VEHICLE_SPEED,
  LANE_OFFSET,
  MAX_VEHICLES,
  VEHICLE_SPAWN_INTERVAL,
  OFFICE_WAIT_TIME,
  SCORE_PER_TRIP,
} from '../constants';
import { 
  distance, 
  snapToGrid, 
  shadeColor, 
  generateRandomRiver,
  generateRandomBuildings,
  doRoadsOverlap,
} from '../utils';

// ============ 메인 컴포넌트 ============

const RoadGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 게임 상태
  const [roads, setRoads] = useState<Road[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [score, setScore] = useState(0);
  
  // 도로 그리기 상태
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
  const [controlPoint, setControlPoint] = useState<Point | null>(null);
  const [isCurveMode, setIsCurveMode] = useState(false);
  
  // 강 옵션 상태
  const [hasRiver, setHasRiver] = useState(true);
  
  // 월드 상태 (재생성 가능)
  const [riverSegments, setRiverSegments] = useState<RiverSegment[]>(() => generateRandomRiver());
  const [buildings, setBuildings] = useState<Building[]>(() => generateRandomBuildings(riverSegments));

  // 새 게임 시작 (강 옵션 포함)
  const startNewGame = useCallback((withRiver: boolean) => {
    const newRiver = withRiver ? generateRandomRiver() : [];
    setHasRiver(withRiver);
    setRiverSegments(newRiver);
    setBuildings(generateRandomBuildings(newRiver));
    setRoads([]);
    setVehicles([]);
    setIntersections([]);
    setScore(0);
  }, []);

  // ============ 강 충돌 검사 ============

  /** X 좌표에서 강의 Y 위치와 너비 계산 */
  const getRiverYAtX = useCallback((x: number): { y: number; width: number } | null => {
    // 강이 없으면 null 반환
    if (riverSegments.length === 0) return null;
    
    for (let i = 0; i < riverSegments.length - 1; i++) {
      const seg1 = riverSegments[i];
      const seg2 = riverSegments[i + 1];
      if (x >= seg1.x && x <= seg2.x) {
        const t = (x - seg1.x) / (seg2.x - seg1.x);
        return {
          y: seg1.y + (seg2.y - seg1.y) * t,
          width: seg1.width + (seg2.width - seg1.width) * t,
        };
      }
    }
    if (x < riverSegments[0].x) {
      return { y: riverSegments[0].y, width: riverSegments[0].width };
    }
    const last = riverSegments[riverSegments.length - 1];
    return { y: last.y, width: last.width };
  }, [riverSegments]);

  /** 점이 강 위에 있는지 확인 */
  const isPointInRiver = useCallback((point: Point): boolean => {
    const riverInfo = getRiverYAtX(point.x);
    // 강이 없으면 false 반환
    if (!riverInfo) return false;
    return Math.abs(point.y - riverInfo.y) < riverInfo.width / 2 + 10;
  }, [getRiverYAtX]);

  /** 직선 도로가 강을 건너는지 확인 */
  const doesRoadCrossRiver = useCallback((start: Point, end: Point): boolean => {
    const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (isPointInRiver({ 
        x: start.x + (end.x - start.x) * t, 
        y: start.y + (end.y - start.y) * t 
      })) return true;
    }
    return false;
  }, [isPointInRiver]);

  /** 커브 도로가 강을 건너는지 확인 */
  const doesCurveRoadCrossRiver = useCallback((start: Point, end: Point, control: Point): boolean => {
    for (let t = 0; t <= 1; t += 0.1) {
      const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
      const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
      if (isPointInRiver({ x, y })) return true;
    }
    return false;
  }, [isPointInRiver]);

  // ============ 경로 탐색 ============

  /** 두 선분의 교차점 계산 */
  const getLineIntersection = useCallback((
    p1: Point, p2: Point, p3: Point, p4: Point
  ): Point | null => {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;
    
    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 0.0001) return null; // 평행
    
    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
    
    if (t >= 0.01 && t <= 0.99 && u >= 0.01 && u <= 0.99) {
      return {
        x: Math.round(p1.x + t * d1x),
        y: Math.round(p1.y + t * d1y)
      };
    }
    return null;
  }, []);

  /** 교차점 찾기 (끝점 교차 + 중간 교차) */
  const findIntersections = useCallback((roadList: Road[]): Intersection[] => {
    const points = new Map<string, number>();
    
    // 1. 도로 끝점 교차 (2개 이상의 도로가 같은 점에서 만남)
    roadList.forEach(road => {
      const startKey = `${road.start.x},${road.start.y}`;
      const endKey = `${road.end.x},${road.end.y}`;
      points.set(startKey, (points.get(startKey) || 0) + 1);
      points.set(endKey, (points.get(endKey) || 0) + 1);
    });
    
    const result: Intersection[] = [];
    points.forEach((count, key) => {
      if (count >= 2) {
        const [x, y] = key.split(',').map(Number);
        result.push({ point: { x, y }, vehicleCount: 0 });
      }
    });
    
    // 2. 도로 중간 교차 (두 도로가 중간에서 만남)
    for (let i = 0; i < roadList.length; i++) {
      for (let j = i + 1; j < roadList.length; j++) {
        const road1 = roadList[i];
        const road2 = roadList[j];
        
        // 직선 도로만 중간 교차 계산
        if (!road1.controlPoint && !road2.controlPoint) {
          const intersection = getLineIntersection(
            road1.start, road1.end,
            road2.start, road2.end
          );
          if (intersection) {
            // 이미 추가된 교차점이 아닌 경우만 추가
            if (!result.some(r => 
              Math.abs(r.point.x - intersection.x) < 5 && 
              Math.abs(r.point.y - intersection.y) < 5
            )) {
              result.push({ point: intersection, vehicleCount: 0 });
            }
          }
        }
      }
    }
    
    return result;
  }, [getLineIntersection]);

  /** BFS로 최단 경로 찾기 (교차점 포함) */
  const findPath = useCallback((start: Point, end: Point, roadList: Road[]): Point[] | null => {
    if (roadList.length === 0) return null;

    // 모든 노드 수집 (도로 끝점 + 실제 교차점)
    const allNodes = new Set<string>();
    const nodeConnections = new Map<string, { point: Point; road: Road }[]>();
    
    // 도로 끝점 추가
    roadList.forEach(road => {
      const startKey = `${road.start.x},${road.start.y}`;
      const endKey = `${road.end.x},${road.end.y}`;
      allNodes.add(startKey);
      allNodes.add(endKey);
    });
    
    // 실제 교차점 찾기 (두 도로가 중간에서 만나는 경우)
    const realIntersections: Point[] = [];
    for (let i = 0; i < roadList.length; i++) {
      for (let j = i + 1; j < roadList.length; j++) {
        const road1 = roadList[i];
        const road2 = roadList[j];
        
        // 직선 도로만 교차점 계산 (커브는 끝점만)
        if (!road1.controlPoint && !road2.controlPoint) {
          const intersection = getLineIntersection(
            road1.start, road1.end,
            road2.start, road2.end
          );
          if (intersection) {
            realIntersections.push(intersection);
            allNodes.add(`${intersection.x},${intersection.y}`);
          }
        }
      }
    }
    
    // 그래프 생성 (도로별로 연결)
    roadList.forEach(road => {
      // 이 도로 위에 있는 모든 노드 수집
      const nodesOnRoad: { point: Point; t: number }[] = [
        { point: road.start, t: 0 },
        { point: road.end, t: 1 }
      ];
      
      // 이 도로를 지나는 교차점 추가
      if (!road.controlPoint) {
        realIntersections.forEach(intersection => {
          // 점이 도로 위에 있는지 확인
          const dx = road.end.x - road.start.x;
          const dy = road.end.y - road.start.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return;
          
          const t = ((intersection.x - road.start.x) * dx + (intersection.y - road.start.y) * dy) / (len * len);
          if (t > 0.01 && t < 0.99) {
            const projX = road.start.x + t * dx;
            const projY = road.start.y + t * dy;
            const distToLine = Math.sqrt((intersection.x - projX) ** 2 + (intersection.y - projY) ** 2);
            if (distToLine < 2) {
              nodesOnRoad.push({ point: intersection, t });
            }
          }
        });
      }
      
      // t 값으로 정렬
      nodesOnRoad.sort((a, b) => a.t - b.t);
      
      // 연속된 노드들을 연결
      for (let i = 0; i < nodesOnRoad.length - 1; i++) {
        const from = nodesOnRoad[i].point;
        const to = nodesOnRoad[i + 1].point;
        const fromKey = `${from.x},${from.y}`;
        const toKey = `${to.x},${to.y}`;
        
        if (!nodeConnections.has(fromKey)) nodeConnections.set(fromKey, []);
        if (!nodeConnections.has(toKey)) nodeConnections.set(toKey, []);
        
        nodeConnections.get(fromKey)!.push({ point: to, road });
        nodeConnections.get(toKey)!.push({ point: from, road });
      }
    });

    // 가장 가까운 노드 찾기
    let closestStart: Point | null = null;
    let closestEnd: Point | null = null;
    let closestStartDist = Infinity;
    let closestEndDist = Infinity;

    // 건물과 도로 연결 최대 거리 (건물 근처에 도로가 있어야 함)
    const MAX_BUILDING_TO_ROAD_DISTANCE = 50;

    allNodes.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const point: Point = { x, y };
      const distToStart = distance(point, start);
      const distToEnd = distance(point, end);
      if (distToStart < closestStartDist) {
        closestStartDist = distToStart;
        closestStart = point;
      }
      if (distToEnd < closestEndDist) {
        closestEndDist = distToEnd;
        closestEnd = point;
      }
    });

    // 건물이 도로와 너무 멀리 떨어져 있으면 경로 없음
    if (!closestStart || !closestEnd) return null;
    if (closestStartDist > MAX_BUILDING_TO_ROAD_DISTANCE) return null;
    if (closestEndDist > MAX_BUILDING_TO_ROAD_DISTANCE) return null;

    // BFS 탐색
    const startNode: Point = closestStart;
    const endNode: Point = closestEnd;
    
    const queue: { point: Point; path: Point[]; roads: Road[] }[] = [
      { point: startNode, path: [startNode], roads: [] }
    ];
    const visited = new Set<string>();
    visited.add(`${startNode.x},${startNode.y}`);

    while (queue.length > 0) {
      const { point, path, roads: pathRoads } = queue.shift()!;
      const key = `${point.x},${point.y}`;

      if (point.x === endNode.x && point.y === endNode.y) {
        // 경로는 도로 노드만 포함 (건물 위치 제외)
        return path;
      }

      const neighbors = nodeConnections.get(key) || [];
      for (const { point: neighbor, road } of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push({ 
            point: neighbor, 
            path: [...path, neighbor], 
            roads: [...pathRoads, road] 
          });
        }
      }
    }
    return null;
  }, [getLineIntersection]);

  // ============ 차량 관리 ============

  /** 집에 맞는 회사 찾기 */
  const findOfficeForHome = useCallback((homeBuilding: Building): Building | null => {
    const colorPrefix = homeBuilding.id.split('-')[0];
    return buildings.find(b => b.id === `${colorPrefix}-office`) || null;
  }, [buildings]);

  /** 건물에서 차량 생성 */
  const spawnVehicleFromBuilding = useCallback((fromBuilding: Building) => {
    if (!fromBuilding.id.includes('-home')) return;
    const toBuilding = findOfficeForHome(fromBuilding);
    if (!toBuilding) return;

    const path = findPath(fromBuilding.position, toBuilding.position, roads);
    if (path && path.length >= 2) {
      const newVehicle: Vehicle = {
        id: `vehicle-${Date.now()}-${Math.random()}`,
        position: { ...path[0] },
        targetIndex: 1,
        path,
        speed: VEHICLE_SPEED,
        waitTime: 0,
        color: fromBuilding.color,
        lane: 'right',
        direction: 0,
        fromBuilding: fromBuilding.id,
        toBuilding: toBuilding.id,
        status: 'going-to-office',
        officeArrivalTime: 0,
        intersectionArrivalTimes: {},
      };
      setVehicles(prev => [...prev, newVehicle]);
    }
  }, [findPath, roads, findOfficeForHome]);

  /** 랜덤 집에서 차량 생성 (도로 연결된 집만) */
  const spawnVehicle = useCallback(() => {
    const homeBuildings = buildings.filter(b => b.id.includes('-home'));
    
    // 도로가 연결된 집만 필터링
    const connectedHomes = homeBuildings.filter(home => {
      const office = findOfficeForHome(home);
      if (!office) return false;
      const path = findPath(home.position, office.position, roads);
      return path && path.length >= 2;
    });
    
    if (connectedHomes.length === 0) return;
    
    const randomHome = connectedHomes[Math.floor(Math.random() * connectedHomes.length)];
    spawnVehicleFromBuilding(randomHome);
  }, [buildings, spawnVehicleFromBuilding, findOfficeForHome, findPath, roads]);

  /** 귀가 경로 생성 */
  const createReturnPath = useCallback((vehicle: Vehicle): Point[] | null => {
    const officeBuilding = buildings.find(b => b.id === vehicle.toBuilding);
    const homeBuilding = buildings.find(b => b.id === vehicle.fromBuilding);
    if (!officeBuilding || !homeBuilding) return null;
    return findPath(officeBuilding.position, homeBuilding.position, roads);
  }, [buildings, roads, findPath]);

  // ============ 이벤트 핸들러 ============

  /** 기존 도로 끝점 또는 교차점에 스냅 (거리가 가까우면 스냅) */
  const snapToRoadEndpoint = useCallback((point: Point, snapDistance: number = 15): Point => {
    let closest: Point | null = null;
    let closestDist = Infinity;
    
    // 도로 끝점에 스냅
    roads.forEach(road => {
      const distToStart = distance(point, road.start);
      const distToEnd = distance(point, road.end);
      
      if (distToStart < closestDist && distToStart < snapDistance) {
        closestDist = distToStart;
        closest = road.start;
      }
      if (distToEnd < closestDist && distToEnd < snapDistance) {
        closestDist = distToEnd;
        closest = road.end;
      }
    });
    
    // 교차점에도 스냅
    intersections.forEach(intersection => {
      const distToIntersection = distance(point, intersection.point);
      if (distToIntersection < closestDist && distToIntersection < snapDistance) {
        closestDist = distToIntersection;
        closest = intersection.point;
      }
    });

    // 건물에도 스냅 (건물에서 도로 시작 가능)
    buildings.forEach(building => {
      const distToBuilding = distance(point, building.position);
      // 건물이므로 스냅 거리를 조금 더 여유있게
      if (distToBuilding < closestDist && distToBuilding < snapDistance + 10) {
        closestDist = distToBuilding;
        closest = building.position;
      }
    });
    
    return closest || point;
  }, [roads, intersections, buildings]);

  /** 키보드 이벤트 (Shift로 커브 모드) */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsCurveMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsCurveMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  /** 마우스 다운 - 도로 그리기 시작 */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // 먼저 기존 도로 끝점에 스냅 시도, 없으면 그리드에 스냅
    const snappedToRoad = snapToRoadEndpoint(rawPoint);
    const point = snappedToRoad !== rawPoint ? snappedToRoad : snapToGrid(rawPoint);
    setIsDrawing(true);
    setDrawStart(point);
    setCurrentEnd(point);
    setControlPoint(null);
  };

  /** 마우스 이동 - 도로 프리뷰 */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // 먼저 기존 도로 끝점에 스냅 시도, 없으면 그리드에 스냅
    const snappedToRoad = snapToRoadEndpoint(rawPoint);
    const point = snappedToRoad !== rawPoint ? snappedToRoad : snapToGrid(rawPoint);
    setCurrentEnd(point);

    // 커브 모드: 컨트롤 포인트 계산
    if (isCurveMode && drawStart) {
      const midX = (drawStart.x + point.x) / 2;
      const midY = (drawStart.y + point.y) / 2;
      const dx = point.x - drawStart.x;
      const dy = point.y - drawStart.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const perpX = -dy / length;
        const perpY = dx / length;
        const curveStrength = length * 0.4;
        const mouseToMidX = (e.clientX - rect.left) - midX;
        const mouseToMidY = (e.clientY - rect.top) - midY;
        const dotProduct = mouseToMidX * perpX + mouseToMidY * perpY;
        const side = dotProduct > 0 ? 1 : -1;
        setControlPoint({ 
          x: midX + perpX * curveStrength * side, 
          y: midY + perpY * curveStrength * side 
        });
      }
    } else {
      setControlPoint(null);
    }
  };

  /** 건물을 통과하는 도로인지 검사 */
  const doesRoadIntersectAnyBuilding = useCallback((start: Point, end: Point, control?: Point): boolean => {
    return buildings.some(building => {
      // 시작점이나 끝점이 해당 건물인 경우는 제외 (연결 허용)
      if ((start.x === building.position.x && start.y === building.position.y) ||
          (end.x === building.position.x && end.y === building.position.y)) {
        return false;
      }

      const isHome = building.id.includes('-home');
      const width = isHome ? 36 : 40;
      const height = isHome ? 30 : 50;
      
      const left = building.position.x - width / 2;
      const right = building.position.x + width / 2;
      const top = building.position.y - height / 2;
      const bottom = building.position.y + height / 2;

      // 도로를 따라 샘플링하여 건물과 겹치는지 확인
      const steps = Math.ceil(distance(start, end) / 10);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let pX, pY;
        
        if (control) {
           pX = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
           pY = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
        } else {
           pX = start.x + (end.x - start.x) * t;
           pY = start.y + (end.y - start.y) * t;
        }
        
        // 약간의 여유를 두고 충돌 검사
        if (pX > left - 2 && pX < right + 2 && pY > top - 2 && pY < bottom + 2) {
          return true;
        }
      }
      return false;
    });
  }, [buildings]);

  /** 마우스 업 - 도로 생성 */
  const handleMouseUp = () => {
    if (isDrawing && drawStart && currentEnd) {
      if (distance(drawStart, currentEnd) > GRID_SIZE) {
        // 강 충돌 검사
        const crossesRiver = controlPoint
          ? doesCurveRoadCrossRiver(drawStart, currentEnd, controlPoint)
          : doesRoadCrossRiver(drawStart, currentEnd);
        
        // 도로 중복 검사
        const overlapsRoad = doRoadsOverlap(drawStart, currentEnd, roads, controlPoint || undefined);

        // 건물 충돌 검사
        const overlapsBuilding = doesRoadIntersectAnyBuilding(drawStart, currentEnd, controlPoint || undefined);
        
        // 검사 통과 시 도로 생성
        if (!crossesRiver && !overlapsRoad && !overlapsBuilding) {
          const newRoad: Road = {
            id: `road-${Date.now()}`,
            start: drawStart,
            end: currentEnd,
            controlPoint: controlPoint || undefined,
          };
          setRoads(prev => {
            const updated = [...prev, newRoad];
            setIntersections(findIntersections(updated));
            return updated;
          });
        }
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentEnd(null);
    setControlPoint(null);
  };

  // ============ 게임 루프 ============

  /** 차선 오프셋 계산 */
  const getLaneOffset = (from: Point, to: Point, lane: 'left' | 'right'): Point => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: 0, y: 0 };
    const perpX = -dy / length;
    const perpY = dx / length;
    const offset = lane === 'right' ? LANE_OFFSET : -LANE_OFFSET;
    return { x: perpX * offset, y: perpY * offset };
  };

  /** 메인 게임 루프 */
  useEffect(() => {
    const gameLoop = setInterval(() => {
      const currentTime = Date.now();
      
      setVehicles(prevVehicles => {
        // 1단계: 각 차량의 교차점 도착 시간 업데이트
        const vehiclesWithArrivalTimes = prevVehicles.map(vehicle => {
          if (vehicle.status !== 'going-to-office' && vehicle.status !== 'going-home') {
            return vehicle;
          }
          
          const newArrivalTimes = { ...vehicle.intersectionArrivalTimes };
          
          intersections.forEach(intersection => {
            const key = `${intersection.point.x},${intersection.point.y}`;
            const dist = distance(vehicle.position, intersection.point);
            
            // 교차점 영역(30px) 안에 진입하면 도착 시간 기록
            if (dist < 30) {
              if (!newArrivalTimes[key]) {
                newArrivalTimes[key] = currentTime;
              }
            } else {
              // 교차점 영역을 벗어나면 기록 삭제
              delete newArrivalTimes[key];
            }
          });
          
          return { ...vehicle, intersectionArrivalTimes: newArrivalTimes };
        });

        // 2단계: 교차점별 FIFO 큐 구성
        const intersectionQueues = new Map<string, { id: string; arrivalTime: number }[]>();
        
        vehiclesWithArrivalTimes.forEach(vehicle => {
          if (vehicle.status !== 'going-to-office' && vehicle.status !== 'going-home') {
            return;
          }
          
          Object.entries(vehicle.intersectionArrivalTimes).forEach(([key, arrivalTime]) => {
            if (!intersectionQueues.has(key)) {
              intersectionQueues.set(key, []);
            }
            intersectionQueues.get(key)!.push({ id: vehicle.id, arrivalTime });
          });
        });
        
        // 각 큐를 도착 시간순으로 정렬 (FIFO)
        intersectionQueues.forEach(queue => {
          queue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        });

        let scoreIncrease = 0;
        
        const updatedVehicles = vehiclesWithArrivalTimes.map(vehicle => {
          // 회사 대기 중
          if (vehicle.status === 'at-office') {
            if (currentTime - vehicle.officeArrivalTime >= OFFICE_WAIT_TIME) {
              const returnPath = createReturnPath(vehicle);
              if (returnPath && returnPath.length >= 2) {
                return {
                  ...vehicle,
                  status: 'going-home' as const,
                  path: returnPath,
                  targetIndex: 1,
                  position: { ...returnPath[0] },
                  intersectionArrivalTimes: {}, // 교차점 도착 시간 초기화
                };
              }
            }
            return vehicle;
          }

          // 집에 도착 (제거)
          if (vehicle.status === 'at-home') return null;
          
          // 목적지 도착
          if (vehicle.targetIndex >= vehicle.path.length) {
            if (vehicle.status === 'going-to-office') {
              return { ...vehicle, status: 'at-office' as const, officeArrivalTime: currentTime };
            } else if (vehicle.status === 'going-home') {
              scoreIncrease += SCORE_PER_TRIP;
              return null;
            }
            return vehicle;
          }

          // 이동 처리
          const target = vehicle.path[vehicle.targetIndex];
          const prevPoint = vehicle.path[Math.max(0, vehicle.targetIndex - 1)];
          const laneOffset = getLaneOffset(prevPoint, target, vehicle.lane);
          
          // 타겟에 레인 오프셋 적용
          const adjustedTarget = { x: target.x + laneOffset.x, y: target.y + laneOffset.y };
          
          const dx = adjustedTarget.x - vehicle.position.x;
          const dy = adjustedTarget.y - vehicle.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 대기 판단
          let shouldWait = false;
          
          // 교차점 안에 있는지 확인 (15px 이내)
          const insideIntersection = intersections.some(intersection => 
            distance(vehicle.position, intersection.point) < 15
          );
          
          // 교차점 안에서는 절대 멈추지 않음 - 빠르게 통과
          if (!insideIntersection) {
            // 저지선 FIFO 대기 - 교차점 진입 전(15-35px)에서 대기
            intersections.forEach(intersection => {
              const distToIntersection = distance(vehicle.position, intersection.point);
              // 저지선 영역: 15px~35px (교차점 직전)
              if (distToIntersection >= 15 && distToIntersection < 35) {
                const key = `${intersection.point.x},${intersection.point.y}`;
                const queue = intersectionQueues.get(key);
                
                // 같은 방향 차량만 체크 (반대 방향 차량은 다른 레인이므로 무시)
                const sameDirectionInIntersection = vehiclesWithArrivalTimes.some(other => 
                  other.id !== vehicle.id &&
                  other.status === vehicle.status && // 같은 방향만
                  distance(other.position, intersection.point) < 15
                );
                
                if (sameDirectionInIntersection) {
                  shouldWait = true;
                } else if (queue && queue.length >= 2) {
                  // 같은 방향 차량만 큐에서 체크
                  const sameDirectionQueue = queue.filter(q => {
                    const otherVehicle = vehiclesWithArrivalTimes.find(v => v.id === q.id);
                    return otherVehicle && otherVehicle.status === vehicle.status;
                  });
                  
                  if (sameDirectionQueue.length >= 2 && sameDirectionQueue[0].id !== vehicle.id) {
                    shouldWait = true;
                  }
                }
              }
            });
          }
          
          // 차량 충돌 방지 비활성화
          // 교차점 FIFO 로직만 사용

          if (shouldWait) {
            return { ...vehicle, waitTime: vehicle.waitTime + 0.016 };
          }

          // 이동
          if (dist < vehicle.speed) {
            return {
              ...vehicle,
              position: adjustedTarget,
              targetIndex: vehicle.targetIndex + 1,
              direction: Math.atan2(dy, dx),
              waitTime: Math.max(0, vehicle.waitTime - 0.016),
            };
          } else {
            return {
              ...vehicle,
              position: { 
                x: vehicle.position.x + (dx / dist) * vehicle.speed, 
                y: vehicle.position.y + (dy / dist) * vehicle.speed 
              },
              direction: Math.atan2(dy, dx),
              waitTime: Math.max(0, vehicle.waitTime - 0.016),
            };
          }
        }).filter((v): v is Vehicle => v !== null);

        if (scoreIncrease > 0) {
          setScore(prev => prev + scoreIncrease);
        }
        return updatedVehicles;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [intersections, createReturnPath]);

  /** 자동 차량 생성 */
  useEffect(() => {
    if (roads.length === 0) return;
    const spawnInterval = setInterval(() => {
      if (vehicles.length < MAX_VEHICLES) spawnVehicle();
    }, VEHICLE_SPAWN_INTERVAL);
    return () => clearInterval(spawnInterval);
  }, [roads.length, vehicles.length, spawnVehicle]);

  // ============ 렌더링 ============

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 배경
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 강 렌더링 (강이 있을 때만)
    if (riverSegments.length > 0) {
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.moveTo(riverSegments[0].x, riverSegments[0].y - riverSegments[0].width / 2);
      for (let i = 1; i < riverSegments.length; i++) {
        ctx.lineTo(riverSegments[i].x, riverSegments[i].y - riverSegments[i].width / 2);
      }
      for (let i = riverSegments.length - 1; i >= 0; i--) {
        ctx.lineTo(riverSegments[i].x, riverSegments[i].y + riverSegments[i].width / 2);
      }
      ctx.closePath();
      ctx.fill();

      // 강 하이라이트
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 15]);
      ctx.beginPath();
      ctx.moveTo(riverSegments[0].x + 20, riverSegments[0].y);
      for (let i = 1; i < riverSegments.length; i++) {
        ctx.lineTo(riverSegments[i].x, riverSegments[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 강 테두리
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(riverSegments[0].x, riverSegments[0].y - riverSegments[0].width / 2);
      for (let i = 1; i < riverSegments.length; i++) {
        ctx.lineTo(riverSegments[i].x, riverSegments[i].y - riverSegments[i].width / 2);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(riverSegments[0].x, riverSegments[0].y + riverSegments[0].width / 2);
      for (let i = 1; i < riverSegments.length; i++) {
        ctx.lineTo(riverSegments[i].x, riverSegments[i].y + riverSegments[i].width / 2);
      }
      ctx.stroke();
    }

    // 도로 외곽선
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    roads.forEach(road => {
      ctx.beginPath();
      ctx.moveTo(road.start.x, road.start.y);
      if (road.controlPoint) {
        ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
      } else {
        ctx.lineTo(road.end.x, road.end.y);
      }
      ctx.stroke();
    });

    // 교차점 외곽선 (도로보다 먼저 그려서 도로와 자연스럽게 연결)
    intersections.forEach(intersection => {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 16, 0, Math.PI * 2);
      ctx.fill();
    });

    // 도로 본체
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 24;
    roads.forEach(road => {
      ctx.beginPath();
      ctx.moveTo(road.start.x, road.start.y);
      if (road.controlPoint) {
        ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
      } else {
        ctx.lineTo(road.end.x, road.end.y);
      }
      ctx.stroke();
    });

    // 교차점 본체 (흰색 원형 플랫폼)
    intersections.forEach(intersection => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 14, 0, Math.PI * 2);
      ctx.fill();
    });

    // 중앙선
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    roads.forEach(road => {
      ctx.beginPath();
      ctx.moveTo(road.start.x, road.start.y);
      if (road.controlPoint) {
        ctx.quadraticCurveTo(road.controlPoint.x, road.controlPoint.y, road.end.x, road.end.y);
      } else {
        ctx.lineTo(road.end.x, road.end.y);
      }
      ctx.stroke();
    });

    // 교차점 중앙 표시 (노란색 원)
    intersections.forEach(intersection => {
      // 노란색 중앙 점
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // 외곽 링
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(intersection.point.x, intersection.point.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      
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

    // 도로 프리뷰
    if (isDrawing && drawStart && currentEnd) {
      const crossesRiver = controlPoint
        ? doesCurveRoadCrossRiver(drawStart, currentEnd, controlPoint)
        : doesRoadCrossRiver(drawStart, currentEnd);
      const overlapsRoad = doRoadsOverlap(drawStart, currentEnd, roads, controlPoint || undefined);
      const previewColor = (crossesRiver || overlapsRoad) 
        ? 'rgba(239, 68, 68, 0.5)' 
        : 'rgba(66, 133, 244, 0.3)';

      ctx.strokeStyle = previewColor;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(drawStart.x, drawStart.y);
      if (controlPoint) {
        ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, currentEnd.x, currentEnd.y);
      } else {
        ctx.lineTo(currentEnd.x, currentEnd.y);
      }
      ctx.stroke();

      if (controlPoint) {
        ctx.fillStyle = 'rgba(66, 133, 244, 0.8)';
        ctx.beginPath();
        ctx.arc(controlPoint.x, controlPoint.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 건물 렌더링 (2D)
    buildings.forEach(building => {
      const isHome = building.id.includes('-home');
      const cx = building.position.x;
      const cy = building.position.y;

      if (isHome) {
        // 집 - 2D 사각형 + 삼각형 지붕
        const houseWidth = 36;
        const houseHeight = 30;
        const roofHeight = 15;

        // 집 본체 (사각형)
        ctx.fillStyle = building.color;
        ctx.fillRect(cx - houseWidth/2, cy - houseHeight/2, houseWidth, houseHeight);
        
        // 집 테두리
        ctx.strokeStyle = shadeColor(building.color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - houseWidth/2, cy - houseHeight/2, houseWidth, houseHeight);

        // 지붕 (삼각형)
        ctx.fillStyle = shadeColor(building.color, -20);
        ctx.beginPath();
        ctx.moveTo(cx - houseWidth/2 - 5, cy - houseHeight/2);
        ctx.lineTo(cx, cy - houseHeight/2 - roofHeight);
        ctx.lineTo(cx + houseWidth/2 + 5, cy - houseHeight/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 집 아이콘 (🏠)
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏠', cx, cy);
      } else {
        // 회사 - 2D 사각형
        const buildingWidth = 40;
        const buildingHeight = 50;

        // 건물 본체 (사각형)
        ctx.fillStyle = building.color;
        ctx.fillRect(cx - buildingWidth/2, cy - buildingHeight/2, buildingWidth, buildingHeight);
        
        // 건물 테두리
        ctx.strokeStyle = shadeColor(building.color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - buildingWidth/2, cy - buildingHeight/2, buildingWidth, buildingHeight);

        // 회사 아이콘 (🏢)
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏢', cx, cy - 5);

        // 대기 차량 수
        const waitingCount = vehicles.filter(v => 
          v.status === 'at-office' && v.toBuilding === building.id
        ).length;
        
        if (waitingCount > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx + buildingWidth/2 + 8, cy - buildingHeight/2 + 8, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = building.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = building.color;
          ctx.font = 'bold 10px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(waitingCount.toString(), cx + buildingWidth/2 + 8, cy - buildingHeight/2 + 8);
        }
      }
    });

    // 차량 렌더링
    vehicles.forEach(vehicle => {
      if (vehicle.status === 'at-office') return;
      
      ctx.fillStyle = vehicle.color;
      ctx.beginPath();
      ctx.arc(vehicle.position.x, vehicle.position.y, VEHICLE_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shadeColor(vehicle.color, -30);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 퇴근 중 표시
      if (vehicle.status === 'going-home') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⌂', vehicle.position.x, vehicle.position.y);
      }
    });

  }, [
    roads, vehicles, isDrawing, drawStart, currentEnd, controlPoint, 
    intersections, riverSegments, buildings, doesRoadCrossRiver, doesCurveRoadCrossRiver
  ]);

  // ============ UI ============

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        City Road Builder
      </h1>
      <p className="text-slate-500 mb-6">
        도로를 건설하고 출퇴근 시스템을 구축하세요
        {hasRiver && <span className="ml-2 text-blue-500">🌊 강 있음</span>}
      </p>

      {/* 상태 표시 */}
      <div className="flex gap-6 mb-5">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-6 py-3 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">점수</p>
          <p className="text-2xl font-bold text-indigo-600">{score}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-6 py-3 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">차량</p>
          <p className="text-2xl font-bold text-emerald-600">{vehicles.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl px-6 py-3 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">도로</p>
          <p className="text-2xl font-bold text-blue-600">{roads.length}</p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 mb-5">
        <button 
          onClick={() => startNewGame(true)} 
          className="px-5 py-2.5 bg-white border border-blue-200 rounded-xl font-medium text-blue-600 shadow-sm hover:bg-blue-50"
        >
          🌊 새 게임 (강 O)
        </button>
        <button 
          onClick={() => startNewGame(false)} 
          className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          🏙️ 새 게임 (강 X)
        </button>
        <button 
          onClick={spawnVehicle} 
          disabled={roads.length === 0} 
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-medium text-white shadow-sm disabled:opacity-50"
        >
          차량 추가
        </button>
      </div>

      {/* 도움말 */}
      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-xl px-5 py-3 mb-5 shadow-sm">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
            <span>드래그로 직선 도로</span>
          </div>
          <div className={`flex items-center gap-2 ${isCurveMode ? 'text-purple-600 font-semibold' : ''}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isCurveMode ? 'bg-purple-500 animate-pulse' : 'bg-purple-400'}`}></div>
            <span>Shift + 드래그로 커브 도로</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></div>
            <span>집 → 회사 → 집 사이클</span>
          </div>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="rounded-xl overflow-hidden shadow-xl border border-white/50 ring-1 ring-slate-200/50">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair bg-white"
        />
      </div>

      {/* 교차점 표시 */}
      {intersections.length > 0 && (
        <div className="mt-5 text-sm">
          <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-full px-4 py-1.5 text-amber-600 shadow-sm">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            {intersections.length}개의 교차점 감지됨
          </span>
        </div>
      )}
    </div>
  );
};

export default RoadGame;
