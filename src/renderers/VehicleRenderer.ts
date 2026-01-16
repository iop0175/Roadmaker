/**
 * Vehicle Renderer
 * 차량 렌더링 함수
 */

import type { Vehicle } from '../types';
import { VEHICLE_SIZE } from '../constants';
import { shadeColor } from '../utils';

/**
 * 모든 차량 렌더링
 */
export function renderVehicles(ctx: CanvasRenderingContext2D, vehicles: Vehicle[]): void {
  vehicles.forEach(vehicle => {
    // 회사에 도착한 차량은 렌더링하지 않음
    if (vehicle.status === 'at-office') return;
    
    // 차량 본체 (원형)
    ctx.fillStyle = vehicle.color;
    ctx.beginPath();
    ctx.arc(vehicle.position.x, vehicle.position.y, VEHICLE_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // 차량 테두리
    ctx.strokeStyle = shadeColor(vehicle.color, -30);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}
