/**
 * High-DPI Canvas sprite generators for God Eye Indo map icons:
 * - Commercial & military aircraft silhouettes (oriented north = 0° for MapLibre icon-rotate)
 * - GEO & LEO spacecraft / satellite icons with solar arrays & parabolic antenna
 */

function makeCanvas(size: number, dpr: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

/**
 * Generates a crisp top-down aircraft sprite pointing NORTH (0°).
 * MapLibre rotates it smoothly by heading using `icon-rotate`.
 */
export function aircraftSpriteCanvas(
  kind: 'civil' | 'mil',
  dpr = 2,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const size = 36;
  const { canvas, ctx } = makeCanvas(size, dpr);
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Subtle drop shadow for contrast over satellite/light/dark maps
  ctx.shadowColor = 'rgba(15, 23, 42, 0.45)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  if (kind === 'civil') {
    // Sleek commercial airliner (Boeing/Airbus silhouette)
    ctx.beginPath();
    // Nose -> right fuselage -> swept right wing -> rear fuselage -> right stabilizer -> tail -> left mirror
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(2.4, -11, 2.3, -4.5);
    ctx.lineTo(13.5, 2.2);
    ctx.lineTo(13.5, 4.6);
    ctx.lineTo(2.2, 1.4);
    ctx.lineTo(1.8, 9.2);
    ctx.lineTo(6.5, 12.2);
    ctx.lineTo(6.5, 14);
    ctx.lineTo(0, 12.2);
    ctx.lineTo(-6.5, 14);
    ctx.lineTo(-6.5, 12.2);
    ctx.lineTo(-1.8, 9.2);
    ctx.lineTo(-2.2, 1.4);
    ctx.lineTo(-13.5, 4.6);
    ctx.lineTo(-13.5, 2.2);
    ctx.lineTo(-2.3, -4.5);
    ctx.quadraticCurveTo(-2.4, -11, 0, -14);
    ctx.closePath();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, '#38BDF8');
    grad.addColorStop(0.55, '#0284C7');
    grad.addColorStop(1, '#0369A1');
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp cockpit highlight
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, -9.2, 1.15, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Tactical / military delta-wing aircraft silhouette
    ctx.beginPath();
    ctx.moveTo(0, -14.5);
    ctx.lineTo(2.4, -7.5);
    ctx.lineTo(13.2, 4.2);
    ctx.lineTo(11.8, 6.2);
    ctx.lineTo(2.8, 3.8);
    ctx.lineTo(2.5, 9.8);
    ctx.lineTo(6.2, 13.2);
    ctx.lineTo(4.2, 14);
    ctx.lineTo(0, 11.4);
    ctx.lineTo(-4.2, 14);
    ctx.lineTo(-6.2, 13.2);
    ctx.lineTo(-2.5, 9.8);
    ctx.lineTo(-2.8, 3.8);
    ctx.lineTo(-11.8, 6.2);
    ctx.lineTo(-13.2, 4.2);
    ctx.lineTo(-2.4, -7.5);
    ctx.closePath();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, -14, 0, 14);
    grad.addColorStop(0, '#FB7185');
    grad.addColorStop(0.5, '#E11D48');
    grad.addColorStop(1, '#9F1239');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, -8.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return { canvas, width: canvas.width, height: canvas.height };
}

/**
 * Generates a crisp satellite / spacecraft sprite with twin solar arrays,
 * golden/violet core bus, and communications dish.
 */
export function satelliteSpriteCanvas(
  kind: 'geo' | 'leo',
  dpr = 2,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const size = 40;
  const { canvas, ctx } = makeCanvas(size, dpr);
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  // Slight orbital tilt for iconic spacecraft silhouette
  ctx.rotate(kind === 'geo' ? -Math.PI / 8 : -Math.PI / 5);

  ctx.shadowColor = 'rgba(15, 23, 42, 0.5)';
  ctx.shadowBlur = 3.5;
  ctx.shadowOffsetY = 1;

  // White backing silhouette for legibility on dark/satellite basemaps
  ctx.fillStyle = '#FFFFFF';
  // Left & right solar array halos
  ctx.fillRect(-17.5, -5.5, 12.5, 11);
  ctx.fillRect(5, -5.5, 12.5, 11);
  // Central bus halo
  ctx.fillRect(-5.5, -6.5, 11, 13);

  ctx.shadowColor = 'transparent';

  // Left & right solar panel wings
  const panelColor = kind === 'geo' ? '#2563EB' : '#4F46E5';
  ctx.fillStyle = panelColor;
  ctx.fillRect(-16.2, -4.2, 10, 8.4);
  ctx.fillRect(6.2, -4.2, 10, 8.4);

  // Solar panel cell grid lines
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.78)';
  ctx.lineWidth = 0.8;
  for (const x of [-12.8, -9.5, 9.5, 12.8]) {
    ctx.beginPath();
    ctx.moveTo(x, -4.2);
    ctx.lineTo(x, 4.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-16.2, 0);
  ctx.lineTo(-6.2, 0);
  ctx.moveTo(6.2, 0);
  ctx.lineTo(16.2, 0);
  ctx.stroke();

  // Truss arms connecting panels to core bus
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6.2, 0);
  ctx.lineTo(-4.2, 0);
  ctx.moveTo(4.2, 0);
  ctx.lineTo(6.2, 0);
  ctx.stroke();

  // Central spacecraft bus (Gold for GEO Indonesian comms, Violet for LEO)
  ctx.fillStyle = kind === 'geo' ? '#F59E0B' : '#9333EA';
  ctx.fillRect(-4.2, -5.2, 8.4, 10.4);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1;
  ctx.strokeRect(-4.2, -5.2, 8.4, 10.4);

  // Parabolic Earth-facing antenna dish at bottom of bus
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 8.5, 3.6, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  ctx.strokeStyle = kind === 'geo' ? '#D97706' : '#7C3AED';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 8.5, 3.6, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Dish feed dot
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.arc(0, 8.6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return { canvas, width: canvas.width, height: canvas.height };
}
