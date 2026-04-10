"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MergedTraceStep } from "@/types/prova";

type Props = {
  name: string;
  volume: unknown[][][];
  prevVolume?: unknown[][][] | null;
  traceSteps?: MergedTraceStep[];
  focusIndex?: number;
  bitmaskMode?: boolean;
  bitWidth?: number;
  playbackControls?: {
    isPlaying: boolean;
    currentStep: number;
    totalSteps: number;
    playbackSpeed: number;
    disabled: boolean;
    onPrev: () => void;
    onNext: () => void;
    onTogglePlay: () => void;
    onSeek: (step: number) => void;
    onSpeedChange: (speed: number) => void;
  };
};

const cameraStateByName = new Map<string, {
  position: [number, number, number];
  target: [number, number, number];
}>();

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createTextSprite(text: string, color = "#e6edf3") {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(8,12,20,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(120,160,220,0.85)";
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.fillStyle = color;
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.88, 0.34, 1);
  sprite.renderOrder = 999;
  sprite.frustumCulled = false;
  return sprite;
}

function createAxisSprite(text: string, color: string) {
  const sprite = createTextSprite(text, color);
  if (!sprite) return null;
  sprite.scale.set(1.15, 0.42, 1);
  sprite.renderOrder = 1000;
  return sprite;
}

function buildTickIndices(length: number, maxTicks = 12) {
  if (length <= 0) return [] as number[];
  if (length <= maxTicks) return Array.from({ length }, (_, i) => i);
  const step = Math.max(1, Math.ceil((length - 1) / (maxTicks - 1)));
  const out: number[] = [];
  for (let i = 0; i < length; i += step) out.push(i);
  if (out[out.length - 1] !== length - 1) out.push(length - 1);
  return out;
}

function getLayerWindow(totalLayers: number, focusIndex: number, maxLayers = 24) {
  if (totalLayers <= maxLayers) return { start: 0, end: totalLayers - 1 };
  const half = Math.floor(maxLayers / 2);
  let start = Math.max(0, focusIndex - half);
  let end = Math.min(totalLayers - 1, start + maxLayers - 1);
  if (end - start + 1 < maxLayers) start = Math.max(0, end - maxLayers + 1);
  return { start, end };
}

function toBinary(value: number, bitmaskMode: boolean, bitWidth: number) {
  if (!(bitmaskMode && Number.isInteger(value) && value >= 0)) return String(value);
  return value.toString(2).padStart(Math.max(1, bitWidth), "0");
}

function formatVolumeCellLabel(rawValue: unknown, numericValue: number, bitmaskMode: boolean, bitWidth: number) {
  if (typeof rawValue === "boolean") return rawValue ? "T" : "F";
  if (typeof rawValue === "string") {
    const v = rawValue.trim().toLowerCase();
    if (v === "true" || v === "t" || v === "1") return "T";
    if (v === "false" || v === "f" || v === "0") return "F";
  }
  return toBinary(numericValue, bitmaskMode, bitWidth);
}

function isTruthyFor3DLabel(rawValue: unknown, numericValue: number): boolean {
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "number") return Number.isFinite(rawValue) && rawValue !== 0;
  if (typeof rawValue === "string") {
    const v = rawValue.trim().toLowerCase();
    if (!v) return false;
    if (v === "0" || v === "false" || v === "f" || v === "none" || v === "null") return false;
    return true;
  }
  if (rawValue == null) return false;
  return numericValue !== 0;
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function mapMoveKey(event: KeyboardEvent): "w" | "a" | "s" | "d" | "space" | "ctrl" | null {
  const key = event.key.toLowerCase();
  const code = event.code;
  if (key === "w" || key === "ㅈ" || code === "KeyW") return "w";
  if (key === "a" || key === "ㅁ" || code === "KeyA") return "a";
  if (key === "s" || key === "ㄴ" || code === "KeyS") return "s";
  if (key === "d" || key === "ㅇ" || code === "KeyD") return "d";
  if (key === " " || code === "Space") return "space";
  if (key === "control" || code === "ControlLeft" || code === "ControlRight") return "ctrl";
  return null;
}

const ExpandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 3 9 9 3 9" />
    <polyline points="15 21 15 15 21 15" />
    <line x1="9" y1="9" x2="4" y2="4" />
    <line x1="15" y1="15" x2="20" y2="20" />
  </svg>
);

const ResetViewIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 3 3 9 9 9" />
  </svg>
);

const ClearActiveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="3" x2="21" y2="21" />
    <rect x="5" y="5" width="14" height="14" rx="2" ry="2" />
  </svg>
);

export function ThreeDVolumePanel({
  name,
  volume,
  prevVolume,
  traceSteps = [],
  focusIndex = 0,
  bitmaskMode = false,
  bitWidth = 1,
  playbackControls
}: Props) {
  const isPlaybackRunning = !!playbackControls?.isPlaying;
  const floatingPanelWidth = 420;
  const floatingPanelMargin = 20;
  const cellKey = (y: number, x: number, z: number) => `${y}:${x}:${z}`;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"slices" | "three">("slices");
  const [sliceAxis, setSliceAxis] = useState<"z" | "x" | "y">("z");
  const [isExpanded, setIsExpanded] = useState(false);
  const [floatingPos, setFloatingPos] = useState(() => ({
    x: typeof window !== "undefined"
      ? Math.max(8, window.innerWidth - floatingPanelWidth - floatingPanelMargin)
      : 20,
    y: typeof window !== "undefined" ? Math.max(8, window.innerHeight - 148 - floatingPanelMargin) : 20
  }));
  const [activeCells, setActiveCells] = useState<Set<string>>(() => new Set());
  const drawModeRef = useRef<"activate" | "deactivate" | null>(null);
  const rectAnchorRef = useRef<{ r: number; c: number; s: number } | null>(null);
  const draggingCellsRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const dragNextPosRef = useRef<{ x: number; y: number } | null>(null);
  const resetViewReqRef = useRef(0);
  const draggingRef = useRef<{
    active: boolean;
    pointerStartX: number;
    pointerStartY: number;
    startX: number;
    startY: number;
  }>({ active: false, pointerStartX: 0, pointerStartY: 0, startX: 0, startY: 0 });
  const dims = useMemo(
    () => [volume.length, volume[0]?.length ?? 0, volume[0]?.[0]?.length ?? 0] as const,
    [volume],
  );
  const activeCellsKey = useMemo(() => Array.from(activeCells).sort().join("|"), [activeCells]);
  const validStepRange = useMemo(() => {
    if (!playbackControls || traceSteps.length === 0) return null;
    const existsAt = traceSteps.map((s) => s?.vars?.[name] !== undefined);
    const current = Math.max(0, Math.min(playbackControls.currentStep, traceSteps.length - 1));
    if (!existsAt[current]) return { start: current, end: current };
    let start = current;
    let end = current;
    while (start - 1 >= 0 && existsAt[start - 1]) start -= 1;
    while (end + 1 < existsAt.length && existsAt[end + 1]) end += 1;
    return { start, end };
  }, [name, playbackControls, traceSteps]);

  useEffect(() => {
    if (viewMode !== "three") return;
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 420;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d1117");

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 2000);
    const saved = cameraStateByName.get(name);
    if (saved) {
      camera.position.set(saved.position[0], saved.position[1], saved.position[2]);
    } else {
      camera.position.set(0, 26, 42);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const targetPixelRatio = isPlaybackRunning
      ? Math.min(window.devicePixelRatio, 1.3)
      : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor("#0d1117", 1);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("data-prova-3d-nav", "true");
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = false;
    controls.rotateSpeed = 0;
    controls.zoomSpeed = 0.95;
    controls.panSpeed = 0.7;

    scene.add(new THREE.AmbientLight("#9bbcff", 0.6));
    const keyLight = new THREE.DirectionalLight("#c9d1d9", 0.85);
    keyLight.position.set(16, 30, 18);
    scene.add(keyLight);

    const rows = dims[0];
    const cols = dims[1];
    const layers = dims[2];
    const clampedFocus = Math.max(0, Math.min(Math.trunc(focusIndex), Math.max(0, layers - 1)));
    const { start: layerStart, end: layerEnd } = getLayerWindow(layers, clampedFocus, 24);

    const cellSize = 1;
    const layerSpacing = 1.25;
    const xSpan = cols * cellSize;
    const ySpan = rows * cellSize;
    const layerCount = layerEnd - layerStart + 1;
    const zSpan = Math.max(1, layerCount * layerSpacing);
    const zOffsetBase = -((layerCount - 1) * layerSpacing) / 2;
    const center = new THREE.Vector3(0, 0, 0);
    const zMin = zOffsetBase;

    const gridLineMaterial = new THREE.LineBasicMaterial({ color: "#2f3b4f", transparent: true, opacity: 0.62 });
    const layerTint = new THREE.MeshBasicMaterial({
      color: "#111b2a",
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const changedMaterial = new THREE.MeshStandardMaterial({
      color: "#f2cc60",
      emissive: "#785700",
      emissiveIntensity: 0.45,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const valueMaterial = new THREE.MeshStandardMaterial({
      color: "#58a6ff",
      emissive: "#143661",
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.86,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const activeMaterial = new THREE.MeshStandardMaterial({
      color: "#3fb950",
      emissive: "#1f7a3d",
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const focusLayerMaterial = new THREE.LineBasicMaterial({ color: "#8ecbff", transparent: true, opacity: 0.92 });

    const textCandidates: Array<{
      r: number;
      c: number;
      k: number;
      changed: boolean;
      raw: unknown;
      value: number;
      x: number;
      y: number;
      z: number;
    }> = [];
    const clickableLabelSprites: THREE.Object3D[] = [];

    for (let k = layerStart; k <= layerEnd; k += 1) {
      const local = k - layerStart;
      const z = zOffsetBase + local * layerSpacing;

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(xSpan, ySpan), layerTint);
      plane.position.set(0, 0, z);
      scene.add(plane);

      const points: number[] = [];
      for (let x = 0; x <= cols; x += 1) {
        const px = -xSpan / 2 + x * cellSize;
        points.push(px, -ySpan / 2, z, px, ySpan / 2, z);
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = -ySpan / 2 + y * cellSize;
        points.push(-xSpan / 2, py, z, xSpan / 2, py, z);
      }
      const gridGeometry = new THREE.BufferGeometry();
      gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      const gridLines = new THREE.LineSegments(gridGeometry, k === clampedFocus ? focusLayerMaterial : gridLineMaterial);
      scene.add(gridLines);

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const raw = volume[r]?.[c]?.[k];
          const value = toNumber(raw);
          const prev = toNumber(prevVolume?.[r]?.[c]?.[k]);
          const changed = !!prevVolume && value !== prev;
          const isActive = activeCells.has(cellKey(r, c, k));
          if (value === 0 && !changed && !isActive) continue;
          const h = isActive
            ? Math.max(0.28, Math.min(0.72, 0.18 + Math.min(Math.abs(value), 1_000_000) / 1_000_000))
            : Math.min(0.72, 0.18 + Math.min(Math.abs(value), 1_000_000) / 1_000_000);
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(cellSize * 0.78, cellSize * 0.78, h),
            isActive ? activeMaterial : (changed ? changedMaterial : valueMaterial),
          );
          box.position.set(
            -xSpan / 2 + c * cellSize + cellSize / 2,
            -ySpan / 2 + r * cellSize + cellSize / 2,
            z + h / 2 + 0.02,
          );
          scene.add(box);
          textCandidates.push({
            r,
            c,
            k,
            changed,
            raw,
            value,
            x: -xSpan / 2 + c * cellSize + cellSize / 2,
            y: -ySpan / 2 + r * cellSize + cellSize / 2,
            z: z + h + 0.18,
          });
        }
      }
    }

    // Axis guides and index labels in 3D space.
    const axisOrigin = new THREE.Vector3(-xSpan / 2 - 1.2, -ySpan / 2 - 1.2, zMin - 0.9);
    const xAxisLen = xSpan + 1.6;
    const yAxisLen = ySpan + 1.6;
    const zAxisLen = zSpan + 1.8;
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), axisOrigin, xAxisLen, 0x7dd3fc, 0.42, 0.2));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), axisOrigin, yAxisLen, 0x86efac, 0.42, 0.2));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), axisOrigin, zAxisLen, 0xfde68a, 0.42, 0.2));

    const axisXLabel = createAxisSprite("x", "#7dd3fc");
    if (axisXLabel) {
      axisXLabel.position.set(axisOrigin.x + xAxisLen + 0.65, axisOrigin.y, axisOrigin.z);
      scene.add(axisXLabel);
    }
    const axisYLabel = createAxisSprite("y", "#86efac");
    if (axisYLabel) {
      axisYLabel.position.set(axisOrigin.x, axisOrigin.y + yAxisLen + 0.65, axisOrigin.z);
      scene.add(axisYLabel);
    }
    const axisZLabel = createAxisSprite("z", "#fde68a");
    if (axisZLabel) {
      axisZLabel.position.set(axisOrigin.x, axisOrigin.y, axisOrigin.z + zAxisLen + 0.65);
      scene.add(axisZLabel);
    }

    const xTicks = buildTickIndices(cols, 11);
    xTicks.forEach((c) => {
        const label = createAxisSprite(toBinary(c, bitmaskMode, bitWidth), "#93c5fd");
      if (!label) return;
      const x = -xSpan / 2 + c * cellSize + cellSize / 2;
      label.position.set(x, -ySpan / 2 - 0.8, zMin - 0.55);
      scene.add(label);
    });

    const yTicks = buildTickIndices(rows, 11);
    yTicks.forEach((r) => {
      const label = createAxisSprite(toBinary(r, bitmaskMode, bitWidth), "#86efac");
      if (!label) return;
      const y = -ySpan / 2 + r * cellSize + cellSize / 2;
      label.position.set(-xSpan / 2 - 0.95, y, zMin - 0.55);
      scene.add(label);
    });

    const zTicks = buildTickIndices(layerCount, 10);
    zTicks.forEach((localIdx) => {
      const k = layerStart + localIdx;
      const label = createAxisSprite(toBinary(k, bitmaskMode, bitWidth), "#fde68a");
      if (!label) return;
      const z = zOffsetBase + localIdx * layerSpacing;
      label.position.set(-xSpan / 2 - 0.95, -ySpan / 2 - 0.95, z);
      scene.add(label);
    });

    textCandidates
      .sort((a, b) => {
        const scoreA = (a.changed ? 10_000 : 0) + (a.k === clampedFocus ? 1_000 : 0) + Math.abs(a.value);
        const scoreB = (b.changed ? 10_000 : 0) + (b.k === clampedFocus ? 1_000 : 0) + Math.abs(b.value);
        return scoreB - scoreA;
      })
      .filter((cell) => activeCells.has(cellKey(cell.r, cell.c, cell.k)) || isTruthyFor3DLabel(cell.raw, cell.value))
      .slice(0, isPlaybackRunning ? 120 : 260)
      .forEach((cell) => {
        const sprite = createTextSprite(
          formatVolumeCellLabel(cell.raw, cell.value, bitmaskMode, bitWidth),
          activeCells.has(cellKey(cell.r, cell.c, cell.k))
            ? "#b6f0c2"
            : (cell.changed ? "#ffcf6e" : "#dbe9ff")
        );
        if (!sprite) return;
        sprite.position.set(cell.x, cell.y, cell.z);
        sprite.userData = { cellCoord: { y: cell.r, x: cell.c, z: cell.k } };
        scene.add(sprite);
        clickableLabelSprites.push(sprite);
      });

    const bbox = new THREE.Box3(
      new THREE.Vector3(-xSpan / 2, -ySpan / 2, zOffsetBase - 0.2),
      new THREE.Vector3(xSpan / 2, ySpan / 2, zOffsetBase + (layerCount - 1) * layerSpacing + 0.2),
    );
    const helper = new THREE.Box3Helper(bbox, new THREE.Color("#4b5563"));
    scene.add(helper);

    if (saved) controls.target.set(saved.target[0], saved.target[1], saved.target[2]);
    else controls.target.copy(center);
    controls.update();

    let frameId = 0;
    let lastTickMs = performance.now();
    let fpsLookDragging = false;
    let lookLastX = 0;
    let lookLastY = 0;
    const lookSensitivity = 0.0022;
    let lookYaw = 0;
    let lookPitch = 0;
    let lookYawTarget = 0;
    let lookPitchTarget = 0;
    let consumedResetReq = resetViewReqRef.current;
    let lookTargetDistance = Math.max(6, Math.min(18, Math.max(dims[0], dims[1], dims[2]) * 0.9));
    const keyPressed = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      ctrl: false,
    };
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const worldUpVec = new THREE.Vector3(0, 1, 0);
    const moveDelta = new THREE.Vector3();
    const desiredVelocity = new THREE.Vector3();
    const moveVelocity = new THREE.Vector3();
    const moveSpeedPerSecond = 14;
    const moveAccelPerSecond = 18;
    const moveDampingPerSecond = 14;
    const fitCenter = new THREE.Vector3();
    const fitSize = new THREE.Vector3();
    const occupiedBounds = (() => {
      if (textCandidates.length === 0) return bbox.clone();
      const pts = textCandidates.map((c) => new THREE.Vector3(c.x, c.y, c.z));
      return new THREE.Box3().setFromPoints(pts);
    })();
    occupiedBounds.getCenter(fitCenter);
    occupiedBounds.getSize(fitSize);

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event)) return;
      const moveKey = mapMoveKey(event);
      if (!moveKey) return;
      if (moveKey === "w") keyPressed.w = true;
      else if (moveKey === "a") keyPressed.a = true;
      else if (moveKey === "s") keyPressed.s = true;
      else if (moveKey === "d") keyPressed.d = true;
      else if (moveKey === "space") keyPressed.space = true;
      else if (moveKey === "ctrl") keyPressed.ctrl = true;
      // Prevent browser default handling (scroll/focus shortcuts) from eating inputs.
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const moveKey = mapMoveKey(event);
      if (!moveKey) return;
      if (moveKey === "w") keyPressed.w = false;
      else if (moveKey === "a") keyPressed.a = false;
      else if (moveKey === "s") keyPressed.s = false;
      else if (moveKey === "d") keyPressed.d = false;
      else if (moveKey === "space") keyPressed.space = false;
      else if (moveKey === "ctrl") keyPressed.ctrl = false;
    };

    const syncYawPitchFromCamera = () => {
      camera.getWorldDirection(forwardVec);
      lookYaw = Math.atan2(forwardVec.x, forwardVec.z);
      lookPitch = Math.asin(Math.max(-0.99, Math.min(0.99, forwardVec.y)));
      lookYawTarget = lookYaw;
      lookPitchTarget = lookPitch;
    };

    const resetView = () => {
      const radius = Math.max(1.2, Math.max(fitSize.x, fitSize.y, fitSize.z) * 0.5);
      const fitDist = (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.45;
      const currentViewDir = camera.position.clone().sub(controls.target).normalize();
      const viewDir = currentViewDir.lengthSq() > 0.0001
        ? currentViewDir
        : new THREE.Vector3(0.9, 0.62, 1).normalize();
      lookTargetDistance = fitDist;
      camera.position.copy(fitCenter).addScaledVector(viewDir, fitDist);
      controls.target.copy(fitCenter);
      camera.lookAt(fitCenter);
      syncYawPitchFromCamera();
      controls.update();
    };

    const applyLookTarget = (yaw: number, pitch: number) => {
      const cosPitch = Math.cos(pitch);
      const dir = new THREE.Vector3(
        Math.sin(yaw) * cosPitch,
        Math.sin(pitch),
        Math.cos(yaw) * cosPitch,
      ).normalize();
      controls.target.copy(camera.position).addScaledVector(dir, lookTargetDistance);
    };

    const onMouseDownLook = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (shouldIgnoreKeyboardEvent(event as unknown as KeyboardEvent)) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const pointer = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(clickableLabelSprites, false)[0];
        const coord = hit?.object?.userData?.cellCoord as { y: number; x: number; z: number } | undefined;
        if (coord) {
          const key = cellKey(coord.y, coord.x, coord.z);
          setActiveCells((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
          event.preventDefault();
          return;
        }
      }

      renderer.domElement.focus();
      fpsLookDragging = true;
      lookLastX = event.clientX;
      lookLastY = event.clientY;
      syncYawPitchFromCamera();
      renderer.domElement.style.cursor = "grabbing";
      event.preventDefault();
    };

    const onMouseMoveLook = (event: MouseEvent) => {
      if (!fpsLookDragging) return;
      const dx = event.clientX - lookLastX;
      const dy = event.clientY - lookLastY;
      lookLastX = event.clientX;
      lookLastY = event.clientY;
      lookYawTarget -= dx * lookSensitivity;
      lookPitchTarget -= dy * lookSensitivity;
      const pitchLimit = Math.PI / 2 - 0.06;
      lookPitchTarget = Math.max(-pitchLimit, Math.min(pitchLimit, lookPitchTarget));
    };

    const onMouseUpLook = (event: MouseEvent) => {
      if (event.button !== 0) return;
      fpsLookDragging = false;
      renderer.domElement.style.cursor = "";
    };

    const onWindowBlur = () => {
      keyPressed.w = false;
      keyPressed.a = false;
      keyPressed.s = false;
      keyPressed.d = false;
      keyPressed.space = false;
      keyPressed.ctrl = false;
      fpsLookDragging = false;
      renderer.domElement.style.cursor = "";
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("mousedown", onMouseDownLook);
    window.addEventListener("mousemove", onMouseMoveLook);
    window.addEventListener("mouseup", onMouseUpLook);
    window.addEventListener("blur", onWindowBlur);

    if (!saved) resetView();
    else syncYawPitchFromCamera();

    const animate = () => {
      if (consumedResetReq !== resetViewReqRef.current) {
        consumedResetReq = resetViewReqRef.current;
        resetView();
      }
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTickMs) / 1000));
      lastTickMs = now;

      // Smoothly approach mouse look target to avoid jerky camera rotation.
      const lookAlpha = 1 - Math.exp(-(isPlaybackRunning ? 30 : 22) * dt);
      lookYaw += (lookYawTarget - lookYaw) * lookAlpha;
      lookPitch += (lookPitchTarget - lookPitch) * lookAlpha;
      applyLookTarget(lookYaw, lookPitch);

      moveDelta.set(0, 0, 0);
      desiredVelocity.set(0, 0, 0);
      if (keyPressed.w || keyPressed.s || keyPressed.a || keyPressed.d || keyPressed.space || keyPressed.ctrl) {
        camera.getWorldDirection(forwardVec);
        forwardVec.y = 0;
        if (forwardVec.lengthSq() === 0) forwardVec.set(0, 0, -1);
        forwardVec.normalize();
        rightVec.crossVectors(forwardVec, worldUpVec).normalize();
        if (keyPressed.w) desiredVelocity.add(forwardVec);
        if (keyPressed.s) desiredVelocity.sub(forwardVec);
        if (keyPressed.d) desiredVelocity.add(rightVec);
        if (keyPressed.a) desiredVelocity.sub(rightVec);
        if (keyPressed.space) desiredVelocity.y += 1;
        if (keyPressed.ctrl) desiredVelocity.y -= 1;
      }
      if (desiredVelocity.lengthSq() > 0) {
        desiredVelocity.normalize().multiplyScalar(moveSpeedPerSecond);
        const alpha = 1 - Math.exp(-moveAccelPerSecond * dt);
        moveVelocity.lerp(desiredVelocity, alpha);
      } else {
        const damp = Math.exp(-moveDampingPerSecond * dt);
        moveVelocity.multiplyScalar(damp);
      }
      if (moveVelocity.lengthSq() > 1e-6) {
        moveDelta.copy(moveVelocity).multiplyScalar(dt);
        camera.position.add(moveDelta);
        applyLookTarget(lookYaw, lookPitch);
      }

      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const observer = new ResizeObserver(() => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    observer.observe(mount);

    // Portal mount completes before browser layout, so clientWidth may be 0
    // when the effect runs. One RAF guarantees we read post-layout dimensions.
    const resizeRafId = requestAnimationFrame(() => {
      if (!mount.isConnected) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("mousedown", onMouseDownLook);
      window.removeEventListener("mousemove", onMouseMoveLook);
      window.removeEventListener("mouseup", onMouseUpLook);
      window.removeEventListener("blur", onWindowBlur);
      cancelAnimationFrame(resizeRafId);
      cameraStateByName.set(name, {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      });
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [volume, prevVolume, dims, focusIndex, name, bitmaskMode, bitWidth, viewMode, isExpanded, activeCells, activeCellsKey, isPlaybackRunning]);

  const rows = dims[0];
  const cols = dims[1];
  const layerCount = dims[2];
  const clampedFocus = Math.max(0, Math.min(Math.trunc(focusIndex), Math.max(0, layerCount - 1)));

  const plane = useMemo(() => {
    const at = (y: number, x: number, z: number) => volume[y]?.[x]?.[z];
    if (sliceAxis === "x") {
      return {
        sliceCount: cols,
        rowCount: rows,
        colCount: layerCount,
        rowLabel: "y",
        colLabel: "z",
        sliceLabel: (s: number) => `yz(x=${s})`,
        valueAt: (r: number, c: number, s: number) => at(r, s, c),
        coordAt: (r: number, c: number, s: number) => ({ y: r, x: s, z: c }),
        titleAt: (r: number, c: number, s: number) => `x${s}, y${r}, z${c}`,
        isFocus: (_s: number) => false
      };
    }
    if (sliceAxis === "y") {
      return {
        sliceCount: rows,
        rowCount: cols,
        colCount: layerCount,
        rowLabel: "x",
        colLabel: "z",
        sliceLabel: (s: number) => `xz(y=${s})`,
        valueAt: (r: number, c: number, s: number) => at(s, r, c),
        coordAt: (r: number, c: number, s: number) => ({ y: s, x: r, z: c }),
        titleAt: (r: number, c: number, s: number) => `x${r}, y${s}, z${c}`,
        isFocus: (_s: number) => false
      };
    }
    return {
      sliceCount: layerCount,
      rowCount: rows,
      colCount: cols,
      rowLabel: "y",
      colLabel: "x",
      sliceLabel: (s: number) => `xy(z=${s})`,
      valueAt: (r: number, c: number, s: number) => at(r, c, s),
      coordAt: (r: number, c: number, s: number) => ({ y: r, x: c, z: s }),
      titleAt: (r: number, c: number, s: number) => `x${c}, y${r}, z${s}`,
      isFocus: (s: number) => s === clampedFocus
    };
  }, [sliceAxis, cols, rows, layerCount, volume, clampedFocus]);

  const toggleExpand = () => setIsExpanded((v) => !v);

  const applyRectDrag = (
    planeCoordAt: (r: number, c: number, s: number) => { y: number; x: number; z: number },
    s: number,
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    forceMode?: "activate" | "deactivate"
  ) => {
    setActiveCells((prev) => {
      const next = new Set(prev);
      const mode = forceMode ?? drawModeRef.current ?? "activate";
      const minR = Math.min(r0, r1);
      const maxR = Math.max(r0, r1);
      const minC = Math.min(c0, c1);
      const maxC = Math.max(c0, c1);
      for (let rr = minR; rr <= maxR; rr += 1) {
        for (let cc = minC; cc <= maxC; cc += 1) {
          const coord = planeCoordAt(rr, cc, s);
          const key = cellKey(coord.y, coord.x, coord.z);
          if (mode === "activate") next.add(key);
          else next.delete(key);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isExpanded) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    setFloatingPos({
      x: Math.max(8, window.innerWidth - floatingPanelWidth - floatingPanelMargin),
      y: Math.max(8, window.innerHeight - 148 - floatingPanelMargin)
    });
  }, [isExpanded]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current.active) return;
      const dx = e.clientX - draggingRef.current.pointerStartX;
      const dy = e.clientY - draggingRef.current.pointerStartY;
      dragNextPosRef.current = {
        x: Math.max(8, draggingRef.current.startX + dx),
        y: Math.max(8, draggingRef.current.startY + dy)
      };
      if (dragRafRef.current == null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          if (!dragNextPosRef.current) return;
          setFloatingPos(dragNextPosRef.current);
        });
      }
    };
    const onUp = () => {
      draggingRef.current.active = false;
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      if (dragNextPosRef.current) {
        setFloatingPos(dragNextPosRef.current);
        dragNextPosRef.current = null;
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const stopDrag = () => {
      draggingCellsRef.current = false;
      drawModeRef.current = null;
      rectAnchorRef.current = null;
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  const panelNode = (
    <div
      className={isExpanded
        ? "fixed left-0 top-0 z-[2147483647] w-screen h-[100dvh] bg-[#0b1119] p-3 overflow-hidden flex flex-col gap-2"
        : "relative flex-1 min-h-[360px] p-3 flex flex-col gap-2"}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-prova-muted font-mono">
        <span>{name} [y:{dims[0]}, x:{dims[1]}, z:{dims[2]}]</span>
        <div className="inline-flex items-center gap-1">
          <div className="inline-flex rounded border border-prova-line overflow-hidden text-[10px]">
            <button
              type="button"
              className={`px-2 py-1 ${viewMode === "slices" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
              onClick={() => setViewMode("slices")}
            >
              SLICES
            </button>
            <button
              type="button"
              className={`px-2 py-1 border-l border-prova-line ${viewMode === "three" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
              onClick={() => setViewMode("three")}
            >
              3D
            </button>
          </div>
          <button
            type="button"
            className="h-7 w-7 grid place-items-center rounded border border-prova-line text-prova-muted hover:text-[#c9d1d9]"
            onClick={() => {
              if (viewMode !== "three") return;
              resetViewReqRef.current += 1;
            }}
            title="Reset view"
            aria-label="Reset view"
          >
            <ResetViewIcon />
          </button>
          <button
            type="button"
            className="h-7 w-7 grid place-items-center rounded border border-prova-line text-prova-muted hover:text-[#c9d1d9]"
            onClick={() => setActiveCells(new Set())}
            title="Clear active cells"
            aria-label="Clear active cells"
          >
            <ClearActiveIcon />
          </button>
          <button
            type="button"
            className="h-7 w-7 grid place-items-center rounded border border-prova-line text-prova-muted hover:text-[#c9d1d9]"
            onClick={toggleExpand}
            title={isExpanded ? "Restore" : "Expand"}
            aria-label={isExpanded ? "Restore" : "Expand"}
          >
            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>
      {viewMode === "three" ? (
        <div ref={mountRef} className={`w-full rounded border border-[#1f2937] overflow-hidden ${isExpanded ? "flex-1 min-h-0" : "h-full min-h-[320px]"}`} />
      ) : (
        <div
          className={`rounded border border-[#1f2937] bg-[#0b1119] p-2 overflow-auto space-y-3 ${isExpanded ? "flex-1 min-h-0" : "max-h-[520px]"}`}
          onMouseLeave={() => {
            draggingCellsRef.current = false;
            drawModeRef.current = null;
            rectAnchorRef.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-mono text-[#9ac7ff]">
              {sliceAxis === "z" ? `xy(z=0..${Math.max(0, layerCount - 1)})` : sliceAxis === "x" ? `yz(x=0..${Math.max(0, cols - 1)})` : `xz(y=0..${Math.max(0, rows - 1)})`}
            </div>
            <div className="inline-flex rounded border border-prova-line overflow-hidden text-[10px] font-mono">
              <button type="button" className={`px-2 py-1 ${sliceAxis === "z" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`} onClick={() => setSliceAxis("z")}>fix z</button>
              <button type="button" className={`px-2 py-1 border-l border-prova-line ${sliceAxis === "x" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`} onClick={() => setSliceAxis("x")}>fix x</button>
              <button type="button" className={`px-2 py-1 border-l border-prova-line ${sliceAxis === "y" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`} onClick={() => setSliceAxis("y")}>fix y</button>
            </div>
          </div>
          {Array.from({ length: plane.sliceCount }, (_, s) => (
            <div key={`${name}-slice-${sliceAxis}-${s}`} className={`rounded border overflow-hidden ${plane.isFocus(s) ? "border-[#3b82f6]" : "border-[#263142]"} p-2`}>
              <div className="text-[10px] font-mono text-[#9ac7ff] mb-1">{plane.sliceLabel(s)}{plane.isFocus(s) ? "  [focus]" : ""}</div>
              <div className="overflow-auto max-w-full">
                <div className="inline-grid gap-1 min-w-max" style={{ gridTemplateColumns: `26px repeat(${Math.max(1, plane.colCount)}, minmax(28px, auto))` }}>
                  <div />
                  {Array.from({ length: plane.colCount }, (_, c) => (
                    <div key={`${name}-head-${sliceAxis}-${s}-${c}`} className="text-[10px] text-prova-muted text-center font-mono">{plane.colLabel}{c}</div>
                  ))}
                  {Array.from({ length: plane.rowCount }, (_, r) => (
                    <div key={`${name}-row-${sliceAxis}-${s}-${r}`} className="contents">
                      <div className="text-[10px] text-prova-muted text-right pr-1 font-mono self-center">{plane.rowLabel}{r}</div>
                      {Array.from({ length: plane.colCount }, (_, c) => {
                        const value = plane.valueAt(r, c, s);
                        const coord = plane.coordAt(r, c, s);
                        const active = activeCells.has(cellKey(coord.y, coord.x, coord.z));
                        const prev = (() => {
                          if (!prevVolume) return undefined;
                          if (sliceAxis === "z") return prevVolume[r]?.[c]?.[s];
                          if (sliceAxis === "x") return prevVolume[r]?.[s]?.[c];
                          return prevVolume[s]?.[r]?.[c];
                        })();
                        const changed = !!prevVolume && JSON.stringify(value) !== JSON.stringify(prev);
                        const isBool = typeof value === "boolean";
                        const boolTone = isBool ? (value ? "border-[#2d7ad1] bg-[#17406a] text-[#dbeafe]" : "border-[#2a3548] bg-[#0f1621] text-[#64748b]") : "";
                        return (
                          <div
                            key={`${name}-cell-${sliceAxis}-${s}-${r}-${c}`}
                            className={`min-w-7 h-7 px-1 rounded border text-[10px] font-mono grid place-items-center ${
                              active
                                ? "border-[#3fb950] bg-[#103220] text-[#b6f0c2]"
                                : isBool
                                ? boolTone
                                : changed
                                ? "border-[#e3b341] bg-[#3d2b00]/45 text-[#f2cc60]"
                                : "border-[#2a3548] bg-[#0f1621] text-[#c9d1d9]"
                            }`}
                            title={plane.titleAt(r, c, s)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              draggingCellsRef.current = true;
                              rectAnchorRef.current = { r, c, s };
                              const mode: "activate" | "deactivate" = active ? "deactivate" : "activate";
                              drawModeRef.current = mode;
                              applyRectDrag(plane.coordAt, s, r, c, r, c, mode);
                            }}
                            onMouseEnter={() => {
                              if (!draggingCellsRef.current) return;
                              const anchor = rectAnchorRef.current;
                              if (!anchor || anchor.s !== s) return;
                              applyRectDrag(plane.coordAt, s, anchor.r, anchor.c, r, c);
                            }}
                          >
                            {typeof value === "boolean"
                              ? (value ? "T" : "F")
                              : (typeof value === "number" && bitmaskMode && Number.isInteger(value) && value >= 0)
                                ? value.toString(2).padStart(Math.max(1, bitWidth), "0")
                                : String(value ?? "")}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isExpanded && playbackControls ? (
        <div
          className="absolute z-[95] w-[420px] rounded border border-prova-line bg-[#0f141a]/95 backdrop-blur px-3 py-2 space-y-2 shadow-lg"
          style={{ left: floatingPos.x, top: floatingPos.y }}
        >
          <div
            className="flex items-center justify-between cursor-move select-none"
            onMouseDown={(e) => {
              e.preventDefault();
              draggingRef.current = {
                active: true,
                pointerStartX: e.clientX,
                pointerStartY: e.clientY,
                startX: floatingPos.x,
                startY: floatingPos.y
              };
            }}
          >
            <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
              Debug Controls
            </span>
            <span className="text-[10px] text-prova-muted font-mono">
              Step {playbackControls.totalSteps > 0 ? playbackControls.currentStep + 1 : 0} / {playbackControls.totalSteps}
            </span>
          </div>
          <input
            type="range"
            min={validStepRange ? validStepRange.start : 0}
            max={validStepRange ? validStepRange.end : Math.max(playbackControls.totalSteps - 1, 0)}
            value={Math.min(
              Math.max(playbackControls.currentStep, validStepRange ? validStepRange.start : 0),
              validStepRange ? validStepRange.end : Math.max(playbackControls.totalSteps - 1, 0)
            )}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!validStepRange) {
                playbackControls.onSeek(next);
                return;
              }
              const clamped = Math.max(validStepRange.start, Math.min(validStepRange.end, next));
              playbackControls.onSeek(clamped);
            }}
            disabled={playbackControls.disabled}
            className="w-full accent-[#58a6ff] disabled:opacity-40"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
              onClick={() => {
                const prev = playbackControls.currentStep - 1;
                if (!validStepRange) {
                  playbackControls.onPrev();
                  return;
                }
                if (prev < validStepRange.start) return;
                playbackControls.onSeek(prev);
              }}
              disabled={
                playbackControls.disabled
                || (validStepRange ? playbackControls.currentStep <= validStepRange.start : playbackControls.currentStep === 0)
              }
              aria-label="Previous step"
            >
              Prev
            </button>
            <button
              type="button"
              className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
              onClick={playbackControls.onTogglePlay}
              disabled={playbackControls.disabled}
              aria-label={playbackControls.isPlaying ? "Pause" : "Play"}
            >
              {playbackControls.isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={`h-7 px-2 flex items-center justify-center rounded border transition-colors text-[10px] font-mono ${
                playbackControls.disabled
                || playbackControls.currentStep >= (validStepRange ? validStepRange.end : playbackControls.totalSteps - 1)
                  ? "border-prova-line bg-[#161b22] text-prova-muted opacity-30 cursor-not-allowed"
                  : "border-prova-green/45 bg-[#12301f] text-prova-green hover:bg-[#184329] hover:text-[#7ee787]"
              }`}
              onClick={() => {
                const next = playbackControls.currentStep + 1;
                if (!validStepRange) {
                  playbackControls.onNext();
                  return;
                }
                if (next > validStepRange.end) return;
                playbackControls.onSeek(next);
              }}
              disabled={
                playbackControls.disabled
                || playbackControls.currentStep >= (validStepRange ? validStepRange.end : playbackControls.totalSteps - 1)
              }
              aria-label="Next step"
            >
              Next
            </button>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] text-prova-muted">Speed</span>
              <select
                className="h-7 rounded border border-prova-line bg-[#161b22] text-[10px] text-[#c9d1d9] px-1 focus:outline-none disabled:opacity-40"
                value={playbackControls.playbackSpeed}
                onChange={(e) => playbackControls.onSpeedChange(Number(e.target.value))}
                disabled={playbackControls.disabled}
              >
                <option value={0.5}>×0.5</option>
                <option value={1}>×1</option>
                <option value={1.5}>×1.5</option>
                <option value={2}>×2</option>
                <option value={10}>×10</option>
                <option value={20}>×20</option>
                <option value={100}>×100</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (isExpanded && typeof document !== "undefined") {
    return createPortal(panelNode, document.body);
  }
  return panelNode;
}

