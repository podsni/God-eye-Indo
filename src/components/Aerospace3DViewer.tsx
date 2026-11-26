import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Maximize2, RotateCcw } from 'lucide-react';
import type {
  Aircraft3DModelType,
  AircraftLivery,
  Satellite3DModelType,
} from '../engine/aerospaceCatalog';

type CameraPreset = 'iso' | 'side' | 'top' | 'front';

interface Aerospace3DViewerProps {
  mode: 'aircraft' | 'satellite';
  aircraftModelType?: Aircraft3DModelType;
  aircraftLivery?: AircraftLivery;
  satelliteModelType?: Satellite3DModelType;
  satelliteAccent?: string;
  title: string;
  subtitle?: string;
  heightClass?: string;
  onExpand?: () => void;
  testId?: string;
}

const DEFAULT_LIVERY: AircraftLivery = {
  fuselage: '#f8fafc',
  belly: '#0c4a6e',
  tail: '#0284c7',
  accent: '#38bdf8',
};

function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '');
      const rendererStr = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(`${vendor} ${rendererStr}`)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function createFuselageWindowTexture(livery: AircraftLivery, isWidebody: boolean): THREE.CanvasTexture {
  // Exact Three.js LatheGeometry UVs after fuseGeo.rotateX(Math.PI / 2):
  //   (x, y, z) = (r*sin(phi), -r*cos(phi), y_orig) where phi = u * 2*PI
  //   u = 0.00 / 1.00 (x = 0 / 512)   -> Belly (-Y)
  //   u = 0.25        (x = 128)       -> Starboard / Right Flank (+X)
  //   u = 0.50        (x = 256)       -> Top Spine (+Y)
  //   u = 0.75        (x = 384)       -> Port / Left Flank (-X)
  //   v = 1 -> 0      (y = 0 -> 512)  -> Nose (+Z) to Tail (-Z)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Upper white/livery body
  ctx.fillStyle = livery.fuselage;
  ctx.fillRect(0, 0, 512, 512);

  // Lower belly paint wrapping u=0..0.16 (x=0..84) and u=0.84..1.0 (x=428..512)
  ctx.fillStyle = livery.belly;
  ctx.fillRect(0, 0, 84, 512);
  ctx.fillRect(428, 0, 84, 512);

  // Airline livery accent cheatlines right above belly along both flanks
  ctx.fillStyle = livery.accent;
  ctx.fillRect(84, 48, 16, 424); // starboard lower cheatline
  ctx.fillRect(412, 48, 16, 424); // port lower cheatline

  // Crisp cabin windows running longitudinally along BOTH right (x=142) and left (x=370) upper-mid flanks
  const count = isWidebody ? 30 : 22;
  const startY = 104;
  const spanY = 304;
  const stepY = spanY / count;

  const drawWindowColumn = (centerX: number) => {
    for (let i = 0; i < count; i++) {
      if (i === 8 || i === 16) continue; // overwing exit spacing
      const wy = startY + i * stepY;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(centerX - 8, wy, 16, isWidebody ? 6.5 : 8, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.fillRect(centerX - 4, wy + 1.5, 5, 2.5);
    }
  };

  drawWindowColumn(142); // starboard / right flank windows
  drawWindowColumn(370); // port / left flank windows

  // Dark cockpit flight-deck brow windows near nose centered on top-front spine (u=0.50 => x=256)
  ctx.fillStyle = '#071324';
  ctx.beginPath();
  ctx.roundRect(202, 58, 48, 18, 4);
  ctx.roundRect(262, 58, 48, 18, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
  ctx.fillRect(208, 61, 28, 4);
  ctx.fillRect(268, 61, 28, 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createSolarPanelTexture(copperTint = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base photovoltaic silicon cell color
  ctx.fillStyle = copperTint ? '#7c3f12' : '#0f2557';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle cell gradient sheen
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, copperTint ? 'rgba(251, 191, 36, 0.25)' : 'rgba(56, 189, 248, 0.28)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  grad.addColorStop(1, copperTint ? 'rgba(180, 83, 9, 0.2)' : 'rgba(30, 64, 175, 0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Individual solar cells grid
  ctx.strokeStyle = copperTint ? 'rgba(254, 243, 199, 0.5)' : 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Fine horizontal busbars
  ctx.strokeStyle = copperTint ? 'rgba(253, 230, 138, 0.25)' : 'rgba(186, 230, 253, 0.22)';
  ctx.lineWidth = 1;
  for (let y = 16; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Structural panel dividers
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, 507, 251);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createGoldFoilBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Deterministic crumpled MLI foil facets
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 180; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 8 + rand() * 22;
    const shade = Math.round(90 + rand() * 115);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r * (rand() - 0.5), y + r * (rand() - 0.5));
    ctx.lineTo(x + r * (rand() - 0.5), y + r * (rand() - 0.5));
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createExtrudedWing(
  rootChord: number,
  tipChord: number,
  span: number,
  sweepZ: number,
  thickness: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -rootChord * 0.5);
  shape.lineTo(span, -tipChord * 0.5 + sweepZ);
  shape.lineTo(span, tipChord * 0.5 + sweepZ);
  shape.lineTo(0, rootChord * 0.5);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.45,
    bevelSize: thickness * 0.65,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

function createVerticalTailFin(baseChord: number, tipChord: number, height: number, sweep: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(baseChord, 0);
  shape.lineTo(baseChord + sweep * 0.35, height);
  shape.lineTo(baseChord + sweep * 0.35 - tipChord, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.04);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildJetlinerModel(
  type: 'narrowbody' | 'widebody',
  livery: AircraftLivery,
  anisotropy: number,
): { group: THREE.Group; spinners: THREE.Object3D[]; textures: THREE.Texture[] } {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const textures: THREE.Texture[] = [];
  const isWide = type === 'widebody';

  const bodyR = isWide ? 0.44 : 0.33;
  const bodyLen = isWide ? 4.9 : 3.9;
  const halfLen = bodyLen / 2;

  const fuseTex = createFuselageWindowTexture(livery, isWide);
  fuseTex.anisotropy = anisotropy;
  textures.push(fuseTex);

  const fuseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: fuseTex,
    roughness: 0.34,
    metalness: 0.22,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.42,
    metalness: 0.38,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: livery.tail,
    roughness: 0.36,
    metalness: 0.2,
  });
  const nacelleMat = new THREE.MeshStandardMaterial({
    color: livery.tail,
    roughness: 0.34,
    metalness: 0.32,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.18,
    metalness: 0.85,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.45,
    metalness: 0.65,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b192c',
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  // 1. Primary sculpted fuselage (LatheGeometry along Y then rotated to Z nose=+Z)
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, -halfLen - 0.55), // tail APU cone
    new THREE.Vector2(bodyR * 0.25, -halfLen - 0.2),
    new THREE.Vector2(bodyR * 0.72, -halfLen + 0.45),
    new THREE.Vector2(bodyR, -halfLen + 1.0),
    new THREE.Vector2(bodyR, halfLen - 0.65),
    new THREE.Vector2(bodyR * 0.88, halfLen - 0.15),
    new THREE.Vector2(bodyR * 0.52, halfLen + 0.3),
    new THREE.Vector2(0.001, halfLen + 0.52), // nose radome
  ];
  const fuseGeo = new THREE.LatheGeometry(pts, 32);
  fuseGeo.rotateX(Math.PI / 2);
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  group.add(fuseMesh);

  // 2. Subtle raised cockpit windshield visor wrap
  const cockpitGeo = new THREE.CylinderGeometry(bodyR * 0.78, bodyR * 0.86, 0.18, 20, 1, false, -Math.PI * 0.34, Math.PI * 0.68);
  cockpitGeo.rotateX(Math.PI / 2);
  const cockpitMesh = new THREE.Mesh(cockpitGeo, glassMat);
  cockpitMesh.position.set(0, bodyR * 0.22, halfLen + 0.04);
  cockpitMesh.rotation.x = 0.24;
  group.add(cockpitMesh);

  // 3. Belly wingbox fairing
  const fairingGeo = new THREE.CapsuleGeometry(bodyR * 0.76, isWide ? 1.5 : 1.15, 8, 14);
  fairingGeo.rotateX(Math.PI / 2);
  const fairingMesh = new THREE.Mesh(fairingGeo, wingMat);
  fairingMesh.position.set(0, -bodyR * 0.45, -0.1);
  fairingMesh.scale.set(1.05, 0.55, 1);
  group.add(fairingMesh);

  // 4. Main swept wings + upturned winglets (port & starboard)
  const wingSpan = isWide ? 2.85 : 2.15;
  const wingRoot = isWide ? 1.25 : 0.92;
  const wingTip = isWide ? 0.32 : 0.24;
  const wingSweep = isWide ? -1.15 : -0.82;
  const rightWingGeo = createExtrudedWing(wingRoot, wingTip, wingSpan, wingSweep, 0.075);

  const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
  rightWing.position.set(bodyR * 0.65, -bodyR * 0.22, 0.08);
  rightWing.rotation.z = 0.07; // realistic dihedral
  group.add(rightWing);

  const leftWing = new THREE.Mesh(rightWingGeo, wingMat);
  leftWing.scale.x = -1;
  leftWing.position.set(-bodyR * 0.65, -bodyR * 0.22, 0.08);
  leftWing.rotation.z = -0.07;
  group.add(leftWing);

  // Winglets + navigation lights
  const wingletGeo = new THREE.BoxGeometry(0.04, 0.42, 0.26);
  const navRedMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.2 });
  const navGreenMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.2 });
  const navSphereGeo = new THREE.SphereGeometry(0.038, 10, 10);

  for (const side of [-1, 1] as const) {
    const wl = new THREE.Mesh(wingletGeo, tailMat);
    const tipX = side * (bodyR * 0.65 + wingSpan - 0.02);
    const tipY = -bodyR * 0.22 + Math.sin(0.07) * wingSpan + 0.18;
    const tipZ = 0.08 + wingSweep;
    wl.position.set(tipX, tipY, tipZ);
    wl.rotation.z = -side * 0.22;
    wl.rotation.x = -0.18;
    group.add(wl);

    const nav = new THREE.Mesh(navSphereGeo, side === -1 ? navRedMat : navGreenMat);
    nav.position.set(tipX + side * 0.03, tipY - 0.16, tipZ + 0.08);
    group.add(nav);
  }

  // 5. Horizontal tail stabilizers
  const hStabGeo = createExtrudedWing(0.55, 0.2, isWide ? 1.05 : 0.82, -0.38, 0.045);
  const rStab = new THREE.Mesh(hStabGeo, wingMat);
  rStab.position.set(bodyR * 0.3, 0.06, -halfLen - 0.02);
  rStab.rotation.z = 0.08;
  group.add(rStab);

  const lStab = new THREE.Mesh(hStabGeo, wingMat);
  lStab.scale.x = -1;
  lStab.position.set(-bodyR * 0.3, 0.06, -halfLen - 0.02);
  lStab.rotation.z = -0.08;
  group.add(lStab);

  // 6. Vertical tail fin
  const vTailGeo = createVerticalTailFin(isWide ? 1.1 : 0.88, isWide ? 0.36 : 0.28, isWide ? 1.25 : 0.98, -0.55);
  const vTail = new THREE.Mesh(vTailGeo, tailMat);
  vTail.position.set(0, bodyR * 0.45, -halfLen + 0.62);
  group.add(vTail);

  // 7. Twin underwing turbofan engines with nacelles, pylons, silver lip rings & spinning fans
  const engRadius = isWide ? 0.25 : 0.19;
  const engLen = isWide ? 0.82 : 0.66;
  const engGeo = new THREE.CylinderGeometry(engRadius * 0.92, engRadius, engLen, 20, 1, true);
  engGeo.rotateX(Math.PI / 2);
  const lipGeo = new THREE.TorusGeometry(engRadius * 0.96, 0.028, 10, 20);
  const coreGeo = new THREE.CylinderGeometry(engRadius * 0.58, engRadius * 0.42, engLen * 0.72, 16);
  coreGeo.rotateX(Math.PI / 2);
  const pylonGeo = new THREE.BoxGeometry(0.08, 0.22, 0.46);
  const fanBladeGeo = new THREE.BoxGeometry(engRadius * 1.65, 0.045, 0.02);
  const coneGeo = new THREE.ConeGeometry(engRadius * 0.26, 0.16, 12);
  coneGeo.rotateX(Math.PI / 2);

  for (const side of [-1, 1] as const) {
    const engGroup = new THREE.Group();
    engGroup.position.set(side * (bodyR + (isWide ? 0.88 : 0.68)), -bodyR * 0.58, isWide ? 0.26 : 0.18);

    const cowl = new THREE.Mesh(engGeo, nacelleMat);
    const lip = new THREE.Mesh(lipGeo, chromeMat);
    lip.position.z = engLen * 0.5;
    const core = new THREE.Mesh(coreGeo, darkMetalMat);
    core.position.z = -engLen * 0.18;
    const pylon = new THREE.Mesh(pylonGeo, wingMat);
    pylon.position.set(0, engRadius + 0.07, -0.1);

    const fanHub = new THREE.Group();
    fanHub.position.z = engLen * 0.32;
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(fanBladeGeo, chromeMat);
      blade.rotation.z = (b * Math.PI) / 6;
      fanHub.add(blade);
    }
    const spinnerCone = new THREE.Mesh(coneGeo, chromeMat);
    spinnerCone.position.z = 0.06;
    fanHub.add(spinnerCone);
    spinners.push(fanHub);

    engGroup.add(cowl, lip, core, pylon, fanHub);
    group.add(engGroup);
  }

  return { group, spinners, textures };
}

function buildTurbopropModel(
  type: 'turboprop' | 'military',
  livery: AircraftLivery,
  anisotropy: number,
): { group: THREE.Group; spinners: THREE.Object3D[]; textures: THREE.Texture[] } {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const textures: THREE.Texture[] = [];
  const isMil = type === 'military';

  const bodyR = isMil ? 0.42 : 0.3;
  const bodyLen = isMil ? 3.8 : 3.35;
  const halfLen = bodyLen / 2;

  const fuseTex = !isMil ? createFuselageWindowTexture(livery, false) : null;
  if (fuseTex) {
    fuseTex.anisotropy = anisotropy;
    textures.push(fuseTex);
  }

  const fuseMat = new THREE.MeshStandardMaterial({
    color: isMil ? livery.fuselage : 0xffffff,
    map: fuseTex ?? undefined,
    roughness: isMil ? 0.72 : 0.36,
    metalness: isMil ? 0.18 : 0.2,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: isMil ? '#64748b' : '#e2e8f0',
    roughness: isMil ? 0.7 : 0.42,
    metalness: isMil ? 0.22 : 0.35,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: livery.tail,
    roughness: isMil ? 0.68 : 0.36,
    metalness: 0.2,
  });
  const propMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.35,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b192c',
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
  });

  // 1. Sculpted fuselage
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, -halfLen - 0.5),
    new THREE.Vector2(bodyR * 0.3, -halfLen - 0.05),
    new THREE.Vector2(bodyR * 0.85, -halfLen + 0.55),
    new THREE.Vector2(bodyR, -halfLen + 0.9),
    new THREE.Vector2(bodyR, halfLen - 0.55),
    new THREE.Vector2(bodyR * 0.84, halfLen - 0.1),
    new THREE.Vector2(bodyR * 0.45, halfLen + 0.28),
    new THREE.Vector2(0.001, halfLen + 0.44),
  ];
  const fuseGeo = new THREE.LatheGeometry(pts, 28);
  fuseGeo.rotateX(Math.PI / 2);
  group.add(new THREE.Mesh(fuseGeo, fuseMat));

  // Cockpit glazing
  const cockpitGeo = new THREE.CylinderGeometry(bodyR * 0.82, bodyR * 0.9, 0.22, 16, 1, false, -Math.PI * 0.36, Math.PI * 0.72);
  cockpitGeo.rotateX(Math.PI / 2);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, bodyR * 0.28, halfLen - 0.02);
  cockpit.rotation.x = 0.22;
  group.add(cockpit);

  // Sponson landing gear pods along lower flanks
  const podGeo = new THREE.CapsuleGeometry(bodyR * 0.28, 1.0, 6, 12);
  podGeo.rotateX(Math.PI / 2);
  for (const side of [-1, 1] as const) {
    const pod = new THREE.Mesh(podGeo, wingMat);
    pod.position.set(side * (bodyR * 0.86), -bodyR * 0.48, -0.05);
    group.add(pod);
  }

  // 2. High-mounted straight-tapered wings
  const wingSpan = isMil ? 2.85 : 2.35;
  const wingGeo = createExtrudedWing(isMil ? 0.88 : 0.62, isMil ? 0.38 : 0.28, wingSpan, -0.14, 0.065);
  const rWing = new THREE.Mesh(wingGeo, wingMat);
  rWing.position.set(0, bodyR * 0.72, 0.08);
  group.add(rWing);

  const lWing = new THREE.Mesh(wingGeo, wingMat);
  lWing.scale.x = -1;
  lWing.position.set(0, bodyR * 0.72, 0.08);
  group.add(lWing);

  // 3. Vertical tail + T-tail (ATR) or low tailplane (C-130J)
  const vTailHeight = isMil ? 1.25 : 1.02;
  const vTailGeo = createVerticalTailFin(isMil ? 0.96 : 0.78, 0.34, vTailHeight, -0.35);
  const vTail = new THREE.Mesh(vTailGeo, tailMat);
  vTail.position.set(0, bodyR * 0.48, -halfLen + 0.45);
  group.add(vTail);

  // Indonesian Red-White flash on military vertical tail
  if (isMil) {
    const redFlag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.24), new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }));
    redFlag.position.set(0, bodyR * 0.48 + vTailHeight * 0.68, -halfLen - 0.14);
    const whiteFlag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.24), new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 }));
    whiteFlag.position.set(0, bodyR * 0.48 + vTailHeight * 0.68 - 0.11, -halfLen - 0.14);
    group.add(redFlag, whiteFlag);
  }

  const hStabGeo = createExtrudedWing(0.46, 0.22, isMil ? 1.02 : 0.78, -0.14, 0.042);
  const hStabY = isMil ? bodyR * 0.32 : bodyR * 0.48 + vTailHeight - 0.06;
  const hStabZ = isMil ? -halfLen - 0.04 : -halfLen - 0.28;
  const rStab = new THREE.Mesh(hStabGeo, isMil ? wingMat : tailMat);
  rStab.position.set(0, hStabY, hStabZ);
  const lStab = new THREE.Mesh(hStabGeo, isMil ? wingMat : tailMat);
  lStab.scale.x = -1;
  lStab.position.set(0, hStabY, hStabZ);
  group.add(rStab, lStab);

  // 4. Two (turboprop) or Four (C-130J military) wing-mounted turboprop engines + spinning 6-blade props
  const engineXs = isMil ? [-1.72, -0.92, 0.92, 1.72] : [-0.88, 0.88];
  const nacGeo = new THREE.CapsuleGeometry(0.125, 0.46, 8, 14);
  nacGeo.rotateX(Math.PI / 2);
  const bladeGeo = new THREE.BoxGeometry(0.74, 0.055, 0.015);
  const hubConeGeo = new THREE.ConeGeometry(0.085, 0.18, 12);
  hubConeGeo.rotateX(Math.PI / 2);

  for (const ex of engineXs) {
    const eg = new THREE.Group();
    eg.position.set(ex, bodyR * 0.66, 0.28);
    const nac = new THREE.Mesh(nacGeo, isMil ? wingMat : tailMat);
    eg.add(nac);

    const propGroup = new THREE.Group();
    propGroup.position.z = 0.36;
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, propMat);
      blade.rotation.z = (b * Math.PI) / 3;
      propGroup.add(blade);
    }
    const cone = new THREE.Mesh(hubConeGeo, propMat);
    cone.position.z = 0.08;
    propGroup.add(cone);
    spinners.push(propGroup);
    eg.add(propGroup);
    group.add(eg);
  }

  return { group, spinners, textures };
}

function buildHelicopterModel(livery: AircraftLivery): {
  group: THREE.Group;
  spinners: THREE.Object3D[];
  tailSpinners: THREE.Object3D[];
} {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const tailSpinners: THREE.Object3D[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: livery.fuselage, roughness: 0.32, metalness: 0.2 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: livery.belly, roughness: 0.35, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42, metalness: 0.65 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0c1b2e', roughness: 0.08, metalness: 0.1, clearcoat: 1.0 });

  // 1. Sculpted cabin fuselage
  const cabinGeo = new THREE.CapsuleGeometry(0.46, 1.15, 10, 20);
  cabinGeo.rotateX(Math.PI / 2);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.scale.set(0.88, 0.96, 1.05);
  cabin.position.set(0, 0.05, 0.38);
  group.add(cabin);

  // White rescue side band
  const bandGeo = new THREE.BoxGeometry(0.84, 0.3, 0.92);
  const band = new THREE.Mesh(bandGeo, stripeMat);
  band.position.set(0, -0.04, 0.26);
  group.add(band);

  // Panoramic wraparound cockpit glass
  const glassGeo = new THREE.SphereGeometry(0.42, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
  glassGeo.rotateX(Math.PI / 2);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.scale.set(0.88, 0.85, 1.05);
  glass.position.set(0, 0.14, 0.92);
  group.add(glass);

  // Top twin-turbine engine cowling
  const cowlGeo = new THREE.CapsuleGeometry(0.24, 0.75, 8, 14);
  cowlGeo.rotateX(Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, bodyMat);
  cowl.position.set(0, 0.56, 0.2);
  group.add(cowl);

  // Under-nose SAR FLIR sensor gimbal
  const flir = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), darkMat);
  flir.position.set(0, -0.34, 1.12);
  group.add(flir);

  // Landing skids / gear sponsons
  const skidGeo = new THREE.CylinderGeometry(0.032, 0.032, 1.65, 10);
  skidGeo.rotateX(Math.PI / 2);
  const strutGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8);
  for (const side of [-1, 1] as const) {
    const skid = new THREE.Mesh(skidGeo, darkMat);
    skid.position.set(side * 0.48, -0.52, 0.35);
    group.add(skid);
    for (const sz of [0.0, 0.72]) {
      const strut = new THREE.Mesh(strutGeo, darkMat);
      strut.position.set(side * 0.38, -0.36, sz);
      strut.rotation.z = side * 0.38;
      group.add(strut);
    }
  }

  // 2. Slender tapered tail boom + canted vertical fin + stabilizer
  const boomGeo = new THREE.CylinderGeometry(0.12, 0.24, 2.05, 14);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, bodyMat);
  boom.position.set(0, 0.24, -1.15);
  group.add(boom);

  const finGeo = createVerticalTailFin(0.46, 0.22, 0.72, -0.25);
  const fin = new THREE.Mesh(finGeo, bodyMat);
  fin.position.set(0, 0.16, -1.92);
  group.add(fin);

  const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.22), bodyMat);
  tailPlane.position.set(0, 0.24, -1.78);
  group.add(tailPlane);

  // 3. 5-Blade main rotor assembly
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.32, 12), darkMat);
  mast.position.set(0, 0.86, 0.26);
  group.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 1.0, 0.26);
  const rotorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 14), bodyMat);
  mainRotor.add(rotorCap);
  const bladeGeo = new THREE.BoxGeometry(2.15, 0.02, 0.1);
  for (let i = 0; i < 5; i++) {
    const bladeHolder = new THREE.Group();
    bladeHolder.rotation.y = (i * Math.PI * 2) / 5;
    const blade = new THREE.Mesh(bladeGeo, darkMat);
    blade.position.x = 1.08;
    bladeHolder.add(blade);
    mainRotor.add(bladeHolder);
  }
  spinners.push(mainRotor);
  group.add(mainRotor);

  // 4. Tail anti-torque rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.15, 0.72, -2.14);
  const tBladeGeo = new THREE.BoxGeometry(0.02, 0.56, 0.055);
  for (let i = 0; i < 2; i++) {
    const tb = new THREE.Mesh(tBladeGeo, darkMat);
    tb.rotation.x = (i * Math.PI) / 2;
    tailRotor.add(tb);
  }
  tailSpinners.push(tailRotor);
  group.add(tailRotor);

  return { group, spinners, tailSpinners };
}

function buildSatelliteModel(
  type: Satellite3DModelType,
  accentHex: string,
  anisotropy: number,
): { group: THREE.Group; textures: THREE.Texture[] } {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];

  const goldBump = createGoldFoilBumpTexture();
  textures.push(goldBump);

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    metalness: 0.86,
    roughness: 0.26,
    bumpMap: goldBump,
    bumpScale: 0.04,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.78,
    roughness: 0.24,
  });
  const whiteCeramicMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    metalness: 0.14,
    roughness: 0.38,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.65,
    roughness: 0.42,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.5,
  });

  const solarTex = createSolarPanelTexture(type === 'space_station');
  solarTex.anisotropy = anisotropy;
  textures.push(solarTex);
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: solarTex,
    roughness: 0.22,
    metalness: 0.48,
  });

  if (type === 'geo_comms') {
    // 1. Hexagonal Gold MLI Spacecraft Bus
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.38, 8), goldFoilMat);
    group.add(bus);

    // Top & bottom silver adapter rings
    const ringGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.08, 16);
    const topRing = new THREE.Mesh(ringGeo, silverMat);
    topRing.position.y = 0.7;
    const botRing = new THREE.Mesh(ringGeo, silverMat);
    botRing.position.y = -0.7;
    group.add(topRing, botRing);

    // Apogee engine thruster nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.26, 0.34, 16, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, darkMetalMat);
    nozzle.position.y = -0.9;
    group.add(nozzle);

    // 2. Twin sculpted parabolic Ka/C-band reflector dishes (LatheGeometry)
    const dishPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const r = (i / 10) * 0.56;
      dishPts.push(new THREE.Vector2(r, r * r * 0.42));
    }
    const dishGeo = new THREE.LatheGeometry(dishPts, 24);
    const hornGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.34, 10);

    for (const side of [-1, 1] as const) {
      const dishGroup = new THREE.Group();
      dishGroup.position.set(side * 0.54, 0.1, 0.72);
      dishGroup.rotation.x = Math.PI * 0.5;
      dishGroup.rotation.z = -side * 0.32;

      const dish = new THREE.Mesh(dishGeo, whiteCeramicMat);
      const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.024, 8, 24), silverMat);
      dishRim.rotation.x = Math.PI / 2;
      dishRim.position.y = 0.13;
      const horn = new THREE.Mesh(hornGeo, silverMat);
      horn.position.y = 0.24;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), accentMat);
      tip.position.y = 0.42;
      dishGroup.add(dish, dishRim, horn, tip);
      group.add(dishGroup);
    }

    // Top telemetry antenna tower
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.65, 10), silverMat);
    mast.position.set(0, 1.0, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), accentMat);
    beacon.position.set(0, 1.34, 0);
    group.add(mast, beacon);

    // 3. Large dual 3-segment photovoltaic solar array wings
    const boomGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    boomGeo.rotateZ(Math.PI / 2);
    const panelGeo = new THREE.BoxGeometry(0.88, 0.86, 0.035);

    for (const side of [-1, 1] as const) {
      const wingGroup = new THREE.Group();
      wingGroup.rotation.x = 0.26;
      const boom = new THREE.Mesh(boomGeo, silverMat);
      boom.position.x = side * 0.92;
      wingGroup.add(boom);

      for (let seg = 0; seg < 3; seg++) {
        const panel = new THREE.Mesh(panelGeo, solarMat);
        panel.position.x = side * (1.42 + seg * 0.94);
        wingGroup.add(panel);
      }
      group.add(wingGroup);
    }
  } else if (type === 'space_station') {
    // 1. Main horizontal aluminum truss backbone
    const truss = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 0.18), silverMat);
    group.add(truss);

    // 2. Pressurized cylindrical habitat & laboratory modules perpendicular to truss
    const coreMod = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 2.55, 20), whiteCeramicMat);
    coreMod.rotation.x = Math.PI / 2;
    group.add(coreMod);

    const labGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.15, 16);
    labGeo.rotateZ(Math.PI / 2);
    const labLeft = new THREE.Mesh(labGeo, whiteCeramicMat);
    labLeft.position.set(-0.68, -0.05, 0.42);
    const labRight = new THREE.Mesh(labGeo, whiteCeramicMat);
    labRight.position.set(0.68, -0.05, 0.42);
    group.add(labLeft, labRight);

    // Docking node rings & observation cupola
    for (const zPos of [-1.25, -0.45, 0.45, 1.25]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 20), darkMetalMat);
      ring.position.z = zPos;
      group.add(ring);
    }
    const cupola = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), accentMat);
    cupola.position.set(0, 0.26, 0.35);
    group.add(cupola);

    // Thermal radiator panels
    const radGeo = new THREE.BoxGeometry(0.32, 0.025, 0.95);
    for (const rx of [-1.15, 1.15]) {
      const rad = new THREE.Mesh(radGeo, whiteCeramicMat);
      rad.position.set(rx, 0.08, -0.68);
      group.add(rad);
    }

    // 3. Four pairs of expansive copper-gold solar array wings
    const wingGeo = new THREE.BoxGeometry(0.56, 0.03, 2.25);
    for (const sx of [-2.45, -1.78, 1.78, 2.45]) {
      const wTop = new THREE.Mesh(wingGeo, solarMat);
      wTop.position.set(sx, 0, 1.32);
      wTop.rotation.y = 0.06;
      const wBot = new THREE.Mesh(wingGeo, solarMat);
      wBot.position.set(sx, 0, -1.32);
      wBot.rotation.y = 0.06;
      group.add(wTop, wBot);
    }
  } else {
    // LEO Earth Observation / Weather Satellite (LAPAN-A2/A3, NOAA-20)
    const bus = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), goldFoilMat);
    group.add(bus);

    // Structural aluminum corner rails
    const railGeo = new THREE.BoxGeometry(1.1, 0.07, 1.1);
    const topRail = new THREE.Mesh(railGeo, silverMat);
    topRail.position.y = 0.54;
    const botRail = new THREE.Mesh(railGeo, silverMat);
    botRail.position.y = -0.54;
    group.add(topRail, botRail);

    // Prominent nadir multispectral optical payload telescope + sapphire lens
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.52, 20), darkMetalMat);
    barrel.position.set(0, -0.76, 0.14);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#0ea5e9',
      roughness: 0.06,
      metalness: 0.2,
      clearcoat: 1.0,
    });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20), lensMat);
    lens.position.set(0, -1.02, 0.14);
    group.add(barrel, lens);

    // S-Band / AIS helical & whip antennas
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.72, 10), silverMat);
    ant.position.set(0.32, 0.88, -0.22);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), accentMat);
    beacon.position.set(0.32, 1.24, -0.22);
    group.add(ant, beacon);

    // Dual deployed solar array wings
    const wingGeo = new THREE.BoxGeometry(1.85, 0.78, 0.035);
    for (const side of [-1, 1] as const) {
      const panel = new THREE.Mesh(wingGeo, solarMat);
      panel.position.set(side * 1.56, 0.08, 0);
      panel.rotation.x = 0.34;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), silverMat);
      strut.rotation.z = Math.PI / 2;
      strut.position.set(side * 0.64, 0.08, 0);
      group.add(panel, strut);
    }
  }

  return { group, textures };
}

export function Aerospace3DViewer({
  mode,
  aircraftModelType = 'narrowbody',
  aircraftLivery = DEFAULT_LIVERY,
  satelliteModelType = 'geo_comms',
  satelliteAccent = '#38bdf8',
  title,
  subtitle,
  heightClass = 'h-56',
  onExpand,
  testId = 'aerospace-3d-viewer',
}: Aerospace3DViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const presetFnRef = useRef<((preset: CameraPreset) => void) | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset>('iso');
  const [contextLost, setContextLost] = useState(false);

  const liveryKey = `${aircraftLivery.fuselage}|${aircraftLivery.belly}|${aircraftLivery.tail}|${aircraftLivery.accent}`;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    const isSoftwareGl = detectSoftwareGl(renderer);
    const width = Math.max(240, container.clientWidth || 320);
    const height = Math.max(180, container.clientHeight || 224);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = mode === 'satellite' ? 1.15 : 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    // Scene & studio PBR environment (RoomEnvironment prevents dark metals on every device)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mode === 'satellite' ? '#050b18' : '#0f1d35');

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Three-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight(
      mode === 'satellite' ? 0xbae6fd : 0xe0f2fe,
      mode === 'satellite' ? 0x0c4a6e : 0x1e293b,
      mode === 'satellite' ? 0.95 : 1.05,
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, mode === 'satellite' ? 2.4 : 2.1);
    keyLight.position.set(6, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-6, 3, -6);
    scene.add(rimLight);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 12;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 0.9;

    // Context backdrop (orbital Earth limb + starfield for satellite; technical altitude radar grid for aircraft)
    const disposableTextures: THREE.Texture[] = [];
    if (mode === 'satellite') {
      const starPos = new Float32Array(360 * 3);
      let s = 1337;
      const rnd = () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };
      for (let i = 0; i < 360; i++) {
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        const rad = 22 + rnd() * 14;
        starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = rad * Math.cos(phi);
        starPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.12, sizeAttenuation: true });
      scene.add(new THREE.Points(starGeo, starMat));

      // Subtle curved blue Earth limb below the satellite
      const earthSphere = new THREE.Mesh(
        new THREE.SphereGeometry(12, 36, 24),
        new THREE.MeshStandardMaterial({
          color: '#0c4a6e',
          emissive: '#0284c7',
          emissiveIntensity: 0.25,
          roughness: 0.85,
          metalness: 0.05,
        }),
      );
      earthSphere.position.set(0, -13.6, -2.5);
      scene.add(earthSphere);
    } else {
      // Clean aviation reference polar ring below aircraft
      const ringGroup = new THREE.Group();
      ringGroup.position.y = -1.35;
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.45, 2.5, 48), ringMat);
      outerRing.rotation.x = -Math.PI / 2;
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.38, 48), ringMat);
      innerRing.rotation.x = -Math.PI / 2;
      ringGroup.add(outerRing, innerRing);
      scene.add(ringGroup);
    }

    // Build subject 3D composite model
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    const spinners: THREE.Object3D[] = [];
    const tailSpinners: THREE.Object3D[] = [];
    let subjectGroup: THREE.Group;

    if (mode === 'aircraft') {
      if (aircraftModelType === 'helicopter') {
        const res = buildHelicopterModel(aircraftLivery);
        subjectGroup = res.group;
        spinners.push(...res.spinners);
        tailSpinners.push(...res.tailSpinners);
      } else if (aircraftModelType === 'turboprop' || aircraftModelType === 'military') {
        const res = buildTurbopropModel(aircraftModelType, aircraftLivery, maxAniso);
        subjectGroup = res.group;
        spinners.push(...res.spinners);
        disposableTextures.push(...res.textures);
      } else {
        const res = buildJetlinerModel(aircraftModelType, aircraftLivery, maxAniso);
        subjectGroup = res.group;
        spinners.push(...res.spinners);
        disposableTextures.push(...res.textures);
      }
      // Slight graceful bank angle so the 3D profile reads immediately
      subjectGroup.rotation.z = -0.08;
      subjectGroup.rotation.x = -0.04;
    } else {
      const res = buildSatelliteModel(satelliteModelType, satelliteAccent, maxAniso);
      subjectGroup = res.group;
      disposableTextures.push(...res.textures);
      subjectGroup.rotation.y = 0.25;
      subjectGroup.rotation.x = 0.1;
    }
    scene.add(subjectGroup);

    // Camera presets
    const dist =
      mode === 'satellite' && satelliteModelType === 'space_station'
        ? 7.8
        : mode === 'satellite' && satelliteModelType === 'geo_comms'
          ? 7.2
          : mode === 'aircraft' && aircraftModelType === 'widebody'
            ? 6.6
            : 5.8;

    const applyPreset = (preset: CameraPreset) => {
      if (preset === 'iso') {
        camera.position.set(dist * 0.72, dist * 0.42, dist * 0.76);
      } else if (preset === 'side') {
        camera.position.set(dist * 1.05, dist * 0.12, 0.01);
      } else if (preset === 'top') {
        camera.position.set(0.01, dist * 1.15, dist * 0.12);
      } else {
        camera.position.set(0.01, dist * 0.22, dist * 1.02);
      }
      controls.target.set(0, 0, 0);
      controls.update();
      requestRender();
    };
    presetFnRef.current = applyPreset;

    // On-demand render + software-WebGL fence pacing
    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let renderPending = false;
    const gl = renderer.getContext();

    const afterDraw = (next: () => void) => {
      if (disposed) return;
      if (!isSoftwareGl) {
        rafId = window.requestAnimationFrame(next);
        return;
      }
      const gl2 = gl as WebGL2RenderingContext;
      if (typeof gl2.fenceSync === 'function') {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          const status = sync ? gl2.clientWaitSync(sync, 0, 0) : gl2.ALREADY_SIGNALED;
          if (status === gl2.TIMEOUT_EXPIRED) {
            timerId = window.setTimeout(poll, 16);
          } else {
            if (sync) gl2.deleteSync(sync);
            timerId = window.setTimeout(next, 80);
          }
        };
        timerId = window.setTimeout(poll, 16);
      } else {
        timerId = window.setTimeout(next, 80);
      }
    };

    const drawFrame = () => {
      if (disposed) return;
      renderPending = false;
      controls.update();
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (disposed || renderPending) return;
      renderPending = true;
      if (isSoftwareGl) {
        afterDraw(drawFrame);
      } else {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    // Initial camera & render
    applyPreset('iso');
    setActivePreset('iso');

    // Continuous smooth turntable & rotor animation only on hardware GPUs
    let lastTimeMs = performance.now();
    const animateGpu = (nowMs: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;
      for (const sp of spinners) {
        if (mode === 'aircraft' && aircraftModelType === 'helicopter') {
          sp.rotation.y += dt * 11;
        } else {
          sp.rotation.z += dt * 14;
        }
      }
      for (const tsp of tailSpinners) {
        tsp.rotation.x += dt * 18;
      }
      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animateGpu);
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
      rafId = window.requestAnimationFrame(animateGpu);
    } else {
      // Immediate first frame draw for software WebGL, then render strictly on OrbitControls change / preset click / resize
      drawFrame();
      controls.addEventListener('change', requestRender);
    }

    const ro = new ResizeObserver(() => {
      if (disposed || !container) return;
      const w = Math.max(200, container.clientWidth);
      const h = Math.max(160, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    ro.observe(container);

    return () => {
      disposed = true;
      presetFnRef.current = null;
      ro.disconnect();
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      for (const tex of disposableTextures) {
        tex.dispose();
      }
      envTarget.dispose();
      renderer.dispose();
    };
  }, [mode, aircraftModelType, liveryKey, satelliteModelType, satelliteAccent]);

  const handlePreset = (p: CameraPreset) => {
    setActivePreset(p);
    presetFnRef.current?.(p);
  };

  return (
    <div
      data-testid={testId}
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-950 select-none`}
    >
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {contextLost && (
        <div className="absolute inset-0 bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 text-center gap-1">
          <p className="text-xs font-semibold">Viewport 3D WebGL tidak tersedia</p>
          <p className="text-[11px] text-slate-400">Gunakan tab Foto di atas untuk melihat visualisasi penuh.</p>
        </div>
      )}

      {/* Top semantic label bar — solid translucent fill (NO backdrop-blur over WebGL) */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-700/80 min-w-0">
          <div className="text-[11px] font-bold text-white truncate">{title}</div>
          {subtitle && (
            <div className="text-[10px] font-mono text-sky-300 truncate">{subtitle}</div>
          )}
        </div>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            data-testid="aerospace-3d-expand-btn"
            aria-label="Perbesar tampilan 3D"
            className="pointer-events-auto px-2 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Perbesar</span>
          </button>
        )}
      </div>

      {/* Bottom camera angle presets — solid translucent fill (NO backdrop-blur over WebGL) */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-950/85 border border-slate-700/80">
          {(
            [
              ['iso', '3/4'],
              ['side', 'Samping'],
              ['top', 'Atas'],
              ['front', 'Depan'],
            ] as [CameraPreset, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handlePreset(id)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                activePreset === id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handlePreset('iso')}
          aria-label="Reset sudut kamera 3D"
          className="pointer-events-auto px-2 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-[10px] font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Putar 360°</span>
        </button>
      </div>
    </div>
  );
}
