import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MousePointer2 } from "lucide-react";
import type { LibraryBook } from "@/lib/libraryTypes";

type Props = { books: LibraryBook[]; focusBookId?: number; onSelect: (book: LibraryBook) => void };
type SceneControl = { focus: (id: number) => void; selectCenter: () => void };
const SHELF_X = [-8, -5.4, -2.7, 2.7, 5.4, 8];
const BOOK_COLORS = ["#385b69", "#b7634d", "#718064", "#c39c64", "#4d5069", "#b49d7d", "#6b443c", "#527b7c", "#d3c6a1", "#46594c"];
const SHELF_LEVELS = [0.58, 1.12, 1.66, 2.2];

function makeTextTexture(title: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e9dfc6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(16, 0, 17, canvas.height);
  ctx.fillStyle = "#283b3d";
  ctx.font = "bold 30px Georgia";
  const words = title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > 420 && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  const trimmed = lines.slice(0, 4);
  const total = trimmed.length * 38;
  trimmed.forEach((part, i) => ctx.fillText(part, 58, (canvas.height - total) / 2 + i * 38 + 27, 410));
  ctx.fillStyle = "#876f48";
  ctx.fillRect(58, 210, 110, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(scene: THREE.Scene, geometry: THREE.BoxGeometry, material: THREE.Material, x: number, y: number, z: number, castShadow = false, receiveShadow = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

function buildStudyTable(scene: THREE.Scene, x: number, z: number, tone: string, chairTone: string) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 1.3), new THREE.MeshStandardMaterial({ color: tone, roughness: 0.64 }));
  top.position.set(x, 0.76, z);
  top.castShadow = true; top.receiveShadow = true; scene.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: "#4b5050", metalness: 0.25, roughness: 0.55 });
  for (const dx of [-0.83, 0.83]) for (const dz of [-0.44, 0.44]) addBox(scene, new THREE.BoxGeometry(0.08, 0.72, 0.08), legMat, x + dx, 0.36, z + dz, true);
  for (const [dx, dz] of [[-1.7,0],[1.7,0],[0,-1.18],[0,1.18]] as const) {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.11, 0.55), new THREE.MeshStandardMaterial({ color: chairTone, roughness: 0.78 }));
    chair.position.set(x + dx, 0.47, z + dz); chair.castShadow = true; scene.add(chair);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.08), new THREE.MeshStandardMaterial({ color: chairTone, roughness: 0.78 }));
    back.position.set(x + dx, 0.76, z + dz + (dz < 0 ? -0.23 : 0.23)); scene.add(back);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.43, 8), legMat);
    post.position.set(x + dx, 0.23, z + dz); scene.add(post);
  }
  const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.035, 0.38), new THREE.MeshStandardMaterial({ color: "#3d4c51", metalness: 0.35, roughness: 0.4 }));
  laptop.position.set(x - 0.2, 0.84, z - 0.12); scene.add(laptop);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.31, 0.025), new THREE.MeshStandardMaterial({ color: "#566d73", emissive: "#263b40", emissiveIntensity: 0.4, metalness: 0.25 }));
  screen.position.set(x - 0.2, 1.0, z - 0.27); screen.rotation.x = -0.16; scene.add(screen);
}

function addStudent(scene: THREE.Scene, x: number, z: number, palette: number) {
  const colors = ["#637665", "#b76d54", "#526b7b", "#8e805c", "#675d74", "#bd9d70"];
  const torsoMat = new THREE.MeshStandardMaterial({ color: colors[palette % colors.length], roughness: 0.88 });
  const skinMat = new THREE.MeshStandardMaterial({ color: palette % 2 ? "#b9876e" : "#d1a486", roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: palette % 2 ? "#463b36" : "#5a493e", roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 3, 6), torsoMat);
  body.position.set(x, 1.02, z); body.rotation.x = 0.1; body.castShadow = true; scene.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
  head.position.set(x, 1.53, z - 0.03); head.castShadow = true; scene.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.53), hairMat);
  hair.position.set(x, 1.58, z - 0.025); scene.add(hair);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.48, 3, 5), torsoMat);
  arm.position.set(x + 0.18, 1.04, z - 0.2); arm.rotation.set(0.82, 0, 0.35); scene.add(arm);
}

export default function ThreeLibrary({ books, focusBookId, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneControl = useRef<SceneControl | null>(null);
  const onSelectRef = useRef(onSelect);
  const [sceneError, setSceneError] = useState("");
  const [locked, setLocked] = useState(false);
  const [contextHelp, setContextHelp] = useState(false);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setSceneError("This browser could not start WebGL. The accessible book catalogue is still available from the navigation above.");
      return;
    }
    setSceneError("");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "library-canvas";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D university library. Use W, A, S and D to walk, mouse to look, and click a labeled book to inspect it.");
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d9e2e2");
    scene.fog = new THREE.Fog("#d9e2e2", 24, 62);
    const camera = new THREE.PerspectiveCamera(72, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100);
    camera.position.set(9.2, 1.65, 11.8);
    let yaw = -0.52;
    let pitch = -0.035;
    camera.rotation.order = "YXZ";
    const hemisphere = new THREE.HemisphereLight("#fff9e9", "#747c77", 2.2);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight("#fff2d6", 3.1);
    sun.position.set(-7, 12, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const windowGlow = new THREE.PointLight("#d8ebf0", 3.2, 27, 1.8);
    windowGlow.position.set(9, 4.7, 0); scene.add(windowGlow);

    const floorMat = new THREE.MeshStandardMaterial({ color: "#a8aaa0", roughness: 0.86 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(25, 31), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.5); floor.receiveShadow = true; scene.add(floor);
    const tileGrid = new THREE.GridHelper(24, 32, "#9b9d95", "#c4c5bc");
    tileGrid.position.set(0, 0.008, -0.5); (tileGrid.material as THREE.Material).transparent = true; (tileGrid.material as THREE.Material).opacity = 0.24; scene.add(tileGrid);
    const wallMat = new THREE.MeshStandardMaterial({ color: "#e9e8df", roughness: 0.95 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 0.28), wallMat);
    backWall.position.set(0, 3.5, -16.15); backWall.receiveShadow = true; scene.add(backWall);
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 0.28), wallMat);
    frontWall.position.set(0, 3.5, 15.15); scene.add(frontWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7, 31.5), wallMat);
    leftWall.position.set(-12.1, 3.5, -0.5); leftWall.receiveShadow = true; scene.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7, 31.5), wallMat);
    rightWall.position.set(12.1, 3.5, -0.5); rightWall.receiveShadow = true; scene.add(rightWall);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(24, 31.5), new THREE.MeshStandardMaterial({ color: "#f4f1e8", roughness: 0.97 }));
    ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 6.95, -0.5); scene.add(ceiling);
    const trimMat = new THREE.MeshStandardMaterial({ color: "#d0cfc4", roughness: 0.82 });
    for (const z of [-15.8, 14.9]) addBox(scene, new THREE.BoxGeometry(24, 0.12, 0.2), trimMat, 0, 3.05, z);
    for (const x of [-11.85, 11.85]) addBox(scene, new THREE.BoxGeometry(0.2, 0.12, 31), trimMat, x, 3.05, -0.5);

    // Full-height glass along the east side recreates the airy window wall in the reference photo.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: "#bdd5dc", roughness: 0.13, metalness: 0.02, transmission: 0.12, transparent: true, opacity: 0.56, side: THREE.DoubleSide });
    const mullionMat = new THREE.MeshStandardMaterial({ color: "#657a80", metalness: 0.38, roughness: 0.35 });
    for (let i = 0; i < 8; i++) {
      const z = -13.8 + i * 3.7;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.055, 4.0, 3.5), glassMat);
      pane.position.set(11.93, 3.42, z); scene.add(pane);
      addBox(scene, new THREE.BoxGeometry(0.1, 4.5, 0.09), mullionMat, 11.85, 3.42, z - 1.83);
      addBox(scene, new THREE.BoxGeometry(0.1, 4.5, 0.09), mullionMat, 11.85, 3.42, z + 1.83);
    }
    addBox(scene, new THREE.BoxGeometry(0.2, 0.16, 31), mullionMat, 11.8, 5.72, -0.5);
    addBox(scene, new THREE.BoxGeometry(0.28, 0.18, 31), new THREE.MeshStandardMaterial({ color: "#e5e3d8", roughness: 0.8 }), 11.55, 1.13, -0.5, false, true);
    // Soft daylight panels and quiet circular vents in the ceiling.
    const lampMat = new THREE.MeshStandardMaterial({ color: "#fffdf3", emissive: "#fff1c9", emissiveIntensity: 1.05, roughness: 0.3 });
    for (const x of [-8, -3, 3, 8]) for (const z of [-12, -5, 2, 9]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.065, 1.12), lampMat);
      lamp.position.set(x, 6.83, z); scene.add(lamp);
      const light = new THREE.PointLight("#fff0d2", 0.58, 7, 1.8); light.position.set(x, 6.35, z); scene.add(light);
    }
    const ventMat = new THREE.MeshStandardMaterial({ color: "#8d9795", metalness: 0.55, roughness: 0.55 });
    for (const [vx, vz] of [[-8,-2],[2,-12],[7,6]] as const) {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.045, 32), ventMat);
      vent.position.set(vx, 6.89, vz); scene.add(vent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.055, 16), new THREE.MeshStandardMaterial({ color: "#566766", metalness: 0.45 }));
      hub.position.set(vx, 6.89, vz); scene.add(hub);
    }

    // A long, pale-oak study table zone on the window side, like the supplied photo.
    for (const [x, z] of [[7.3,-9.5],[7.1,-3.2],[7.2,3.3],[7.2,9.4],[-9.5,-10],[-9.3,0],[-9.4,9.2]] as const) {
      buildStudyTable(scene, x, z, "#b99468", "#57686a");
    }
    [[6.0,-9.5,1],[8.5,-9.5,3],[6.0,-3.2,2],[8.5,-3.2,5],[6.0,3.3,4],[8.5,3.3,0],[6.0,9.4,3],[8.5,9.4,1],[-9.5,-10,0],[-9.3,0,5],[-9.4,9.2,2]].forEach(([x,z,palette]) => addStudent(scene, x, z, palette));

    const wood = new THREE.MeshStandardMaterial({ color: "#b68e62", roughness: 0.8 });
    const deepWood = new THREE.MeshStandardMaterial({ color: "#70543b", roughness: 0.84 });
    const rack = new THREE.Group(); scene.add(rack);
    const reusableBoard = new THREE.BoxGeometry(0.78, 0.1, 18.5);
    const reusableUpright = new THREE.BoxGeometry(0.72, 2.85, 0.12);
    const shelfXByRow: number[] = [];
    for (let row = 0; row < 6; row++) {
      const x = SHELF_X[row]; shelfXByRow.push(x);
      for (const level of [0.43, 0.98, 1.53, 2.08, 2.63]) {
        const board = new THREE.Mesh(reusableBoard, wood); board.position.set(x, level, -0.5); board.receiveShadow = true; board.castShadow = true; rack.add(board);
      }
      for (const z of [-9.68, -0.5, 8.68]) {
        const upright = new THREE.Mesh(reusableUpright, deepWood); upright.position.set(x, 1.48, z); upright.castShadow = true; rack.add(upright);
      }
      const endLabel = document.createElement("canvas"); endLabel.width = 256; endLabel.height = 128;
      const labelCtx = endLabel.getContext("2d");
      if (labelCtx) {
        labelCtx.fillStyle = "#edf0e8"; labelCtx.fillRect(0, 0, 256, 128);
        labelCtx.fillStyle = "#324f63"; labelCtx.font = "bold 54px Georgia"; labelCtx.fillText(String.fromCharCode(65 + row), 21, 70);
        labelCtx.fillStyle = "#737e78"; labelCtx.font = "20px monospace"; labelCtx.fillText("THE STACKS", 96, 70);
        const texture = new THREE.CanvasTexture(endLabel); texture.colorSpace = THREE.SRGBColorSpace;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
        sign.position.set(x + (row < 3 ? 0.43 : -0.43), 2.82, 8.83); sign.rotation.y = row < 3 ? Math.PI / 2 : -Math.PI / 2; rack.add(sign);
      }
    }

    const catalogLocations = new Map<number, THREE.Vector3>();
    const selectable: THREE.Object3D[] = [];
    const positionsTaken = new Set<string>();
    const spineBase = new THREE.BoxGeometry(0.21, 0.39, 0.52);
    const backBookGeometry = new THREE.BoxGeometry(0.2, 0.33, 0.48);
    const sharedBackMaterials = BOOK_COLORS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const backMeshes: THREE.InstancedMesh[] = [];
    for (let row = 0; row < 6; row++) for (let level = 0; level < SHELF_LEVELS.length; level++) {
      const freePositions: Array<{ z: number; y: number; color: number; rotation: number }> = [];
      for (let slot = 0; slot < 30; slot++) {
        const z = -9 + slot * 0.58;
        if (z > 8.35) break;
        const occupiedByCatalogueBook = books.some((book, bookIndex) => {
          const bookZ = -8.1 + Math.max(0, Math.min(15, book.shelfSlot)) * 1.08;
          return book.shelfRow === row && bookIndex % SHELF_LEVELS.length === level && Math.abs(bookZ - z) < 0.4;
        });
        if (occupiedByCatalogueBook) continue;
        freePositions.push({ z, y: SHELF_LEVELS[level] + 0.2, color: (slot * 7 + row * 3 + level * 2) % BOOK_COLORS.length, rotation: ((slot % 3) - 1) * 0.055 });
      }
      const perColor = sharedBackMaterials.map(() => [] as Array<{ z: number; y: number; rotation: number }>);
      freePositions.forEach((point) => perColor[point.color].push(point));
      perColor.forEach((points, colorIndex) => {
        if (points.length === 0) return;
        const instanced = new THREE.InstancedMesh(backBookGeometry, sharedBackMaterials[colorIndex], points.length);
        const dummy = new THREE.Object3D();
        points.forEach((point, index) => {
          dummy.position.set(SHELF_X[row] + (row < 3 ? 0.03 : -0.03), point.y, point.z);
          dummy.rotation.y = point.rotation; dummy.updateMatrix(); instanced.setMatrixAt(index, dummy.matrix);
        });
        instanced.instanceMatrix.needsUpdate = true; instanced.castShadow = false; instanced.receiveShadow = false; rack.add(instanced); backMeshes.push(instanced);
      });
    }

    books.forEach((book, index) => {
      const row = Math.max(0, Math.min(5, book.shelfRow));
      const z = -8.1 + Math.max(0, Math.min(15, book.shelfSlot)) * 1.08;
      const levelIndex = index % SHELF_LEVELS.length;
      const y = SHELF_LEVELS[levelIndex] + 0.2;
      const side = row < 3 ? 1 : -1;
      const spineMat = new THREE.MeshStandardMaterial({ color: book.coverColor, roughness: 0.76 });
      const bookMesh = new THREE.Mesh(spineBase, spineMat);
      bookMesh.position.set(SHELF_X[row] + side * 0.06, y, z);
      bookMesh.rotation.y = ((index % 3) - 1) * 0.045;
      bookMesh.castShadow = true;
      bookMesh.userData.bookId = book.id;
      rack.add(bookMesh); selectable.push(bookMesh);
      const texture = makeTextTexture(book.title, book.accentColor);
      if (texture) {
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 0.37), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
        label.position.set(SHELF_X[row] + side * 0.171, y, z);
        label.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        label.userData.bookId = book.id;
        rack.add(label); selectable.push(label);
      }
      const position = new THREE.Vector3(SHELF_X[row], y, z);
      catalogLocations.set(book.id, position);
      positionsTaken.add(`${row}-${Math.round(z * 10)}-${levelIndex}`);
      const shelfLabel = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: "#e7d7af", roughness: 0.8 }));
      shelfLabel.position.set(SHELF_X[row] + side * 0.34, y - 0.26, z);
      rack.add(shelfLabel);
    });

    const beacon = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 40), new THREE.MeshBasicMaterial({ color: "#d1ad67", transparent: true, opacity: 0.96, side: THREE.DoubleSide }));
    beacon.visible = false; scene.add(beacon);
    const beaconLight = new THREE.PointLight("#f3d590", 2.4, 5, 2); beaconLight.visible = false; scene.add(beaconLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const keyState = { forward: false, backward: false, left: false, right: false };
    const rendererCanvas = renderer.domElement;
    let priorTime = performance.now();
    let frameId = 0;
    let focusPosition: THREE.Vector3 | null = null;
    const setFocus = (id: number) => {
      const position = catalogLocations.get(id);
      if (!position) return;
      focusPosition = position.clone();
      const side = position.x < 0 ? 1 : -1;
      const aisleOffset = Math.abs(position.x) < 3 ? 2.7 : 1.35;
      camera.position.set(position.x + side * aisleOffset, 1.58, position.z + 2.8);
      const dx = position.x - camera.position.x;
      const dz = position.z - camera.position.z;
      yaw = Math.atan2(-dx, -dz);
      pitch = THREE.MathUtils.clamp(Math.atan2(position.y - camera.position.y, Math.hypot(dx, dz)), -0.62, 0.55);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      beacon.position.set(position.x + side * 0.23, position.y, position.z);
      beacon.lookAt(camera.position.x, position.y, camera.position.z);
      beacon.visible = true; beaconLight.position.copy(position).setY(position.y + 0.35); beaconLight.visible = true;
      setContextHelp(true);
      window.setTimeout(() => setContextHelp(false), 4200);
    };
    const selectAt = (nx: number, ny: number) => {
      mouse.set(nx, ny); raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObjects(selectable, false);
      const id = intersections[0]?.object.userData.bookId as number | undefined;
      if (id) {
        const book = books.find((item) => item.id === id);
        if (book) onSelectRef.current(book);
        return true;
      }
      return false;
    };
    sceneControl.current = { focus: setFocus, selectCenter: () => selectAt(0, 0) };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (document.pointerLockElement === rendererCanvas) {
        if (!selectAt(0, 0)) setContextHelp((v) => !v);
        return;
      }
      const rect = rendererCanvas.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (selectAt(nx, ny)) return;
      setContextHelp(true);
      if (rendererCanvas.requestPointerLock) rendererCanvas.requestPointerLock();
    };
    const onPointerLockChange = () => setLocked(document.pointerLockElement === rendererCanvas);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== rendererCanvas) return;
      yaw -= event.movementX * 0.0023;
      pitch -= event.movementY * 0.0019;
      pitch = Math.max(-0.78, Math.min(0.66, pitch));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      if (key === "w" || key === "arrowup") keyState.forward = true;
      if (key === "s" || key === "arrowdown") keyState.backward = true;
      if (key === "a" || key === "arrowleft") keyState.left = true;
      if (key === "d" || key === "arrowright") keyState.right = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") keyState.forward = false;
      if (key === "s" || key === "arrowdown") keyState.backward = false;
      if (key === "a" || key === "arrowleft") keyState.left = false;
      if (key === "d" || key === "arrowright") keyState.right = false;
    };
    const onBlur = () => { keyState.forward = keyState.backward = keyState.left = keyState.right = false; };
    rendererCanvas.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const resize = () => {
      if (!host || host.clientWidth === 0) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const moveMobile = (direction: keyof typeof keyState, pressed: boolean) => { keyState[direction] = pressed; };
    host.dataset.mobileControl = "ready";

    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min((time - priorTime) / 1000, 0.045); priorTime = time;
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      const forward = Number(keyState.forward) - Number(keyState.backward);
      const strafe = Number(keyState.right) - Number(keyState.left);
      if (forward || strafe) {
        const speed = (keyState.forward || keyState.backward ? 3.4 : 0) * delta;
        const sideSpeed = (keyState.left || keyState.right ? 3.2 : 0) * delta;
        const dx = Math.sin(yaw) * forward * speed + Math.cos(yaw) * strafe * sideSpeed;
        const dz = -Math.cos(yaw) * forward * speed + Math.sin(yaw) * strafe * sideSpeed;
        let nextX = THREE.MathUtils.clamp(camera.position.x + dx, -10.6, 10.6);
        let nextZ = THREE.MathUtils.clamp(camera.position.z + dz, -14.6, 14.2);
        // Keep the stacks solid; the end openings let the visitor move around rows.
        for (const shelfX of shelfXByRow) {
          if (nextZ > -9.4 && nextZ < 8.8 && Math.abs(nextX - shelfX) < 0.72) nextX = camera.position.x;
        }
        camera.position.x = nextX;
        camera.position.z = nextZ;
      }
      if (focusPosition && beacon.visible) {
        const pulse = 1 + Math.sin(time * 0.0032) * 0.08;
        beacon.scale.setScalar(pulse);
        beaconLight.intensity = 1.9 + (Math.sin(time * 0.0032) + 1) * 0.45;
      }
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    // Expose simple tap-and-hold directions to the overlaid controls.
    (host as HTMLDivElement & { setMobileMove?: (direction: keyof typeof keyState, pressed: boolean) => void }).setMobileMove = moveMobile;
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      rendererCanvas.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (document.pointerLockElement === rendererCanvas) document.exitPointerLock();
      sceneControl.current = null;
      while (scene.children.length) {
        const child = scene.children[0]; scene.remove(child);
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            const map = (material as THREE.MeshStandardMaterial).map;
            map?.dispose(); material.dispose();
          });
        }
      });
      sharedBackMaterials.forEach((material) => material.dispose());
      renderer.dispose(); rendererCanvas.remove();
    };
  }, [books]);

  useEffect(() => {
    if (focusBookId) sceneControl.current?.focus(focusBookId);
  }, [focusBookId, books]);

  const moveBy = (direction: string, pressed: boolean) => {
    const host = hostRef.current as (HTMLDivElement & { setMobileMove?: (direction: "forward" | "backward" | "left" | "right", pressed: boolean) => void }) | null;
    const map: Record<string, "forward" | "backward" | "left" | "right"> = { forward: "forward", backward: "backward", left: "left", right: "right" };
    if (map[direction]) host?.setMobileMove?.(map[direction], pressed);
  };

  return <div className="three-library-host" ref={hostRef}>
    {sceneError && <div className="scene-fallback"><div className="fallback-card"><span className="eyebrow">ACCESSIBLE BROWSING</span><h2>Browse without the 3D view</h2><p>{sceneError}</p><p>Search, inspect, borrow, or locate any title from Browse books.</p><a className="button button-primary" href="/browse-books">Browse books</a></div></div>}
    <div className="scene-crosshair" aria-hidden="true" />
    {contextHelp && <div className="scene-pointer-help"><MousePointer2 size={13} /> Look around · center a title and click to inspect</div>}
    <div className="mobile-pad" aria-label="Touch navigation controls">
      <button type="button" aria-label="Walk forward" onPointerDown={(e) => { e.preventDefault(); moveBy("forward", true); }} onPointerUp={() => moveBy("forward", false)} onPointerLeave={() => moveBy("forward", false)} onPointerCancel={() => moveBy("forward", false)}><ArrowUp size={17} /></button>
      <button type="button" aria-label="Walk left" onPointerDown={(e) => { e.preventDefault(); moveBy("left", true); }} onPointerUp={() => moveBy("left", false)} onPointerLeave={() => moveBy("left", false)} onPointerCancel={() => moveBy("left", false)}><ArrowLeft size={17} /></button>
      <button type="button" aria-label="Walk backward" onPointerDown={(e) => { e.preventDefault(); moveBy("backward", true); }} onPointerUp={() => moveBy("backward", false)} onPointerLeave={() => moveBy("backward", false)} onPointerCancel={() => moveBy("backward", false)}><ArrowDown size={17} /></button>
      <button type="button" aria-label="Walk right" onPointerDown={(e) => { e.preventDefault(); moveBy("right", true); }} onPointerUp={() => moveBy("right", false)} onPointerLeave={() => moveBy("right", false)} onPointerCancel={() => moveBy("right", false)}><ArrowRight size={17} /></button>
    </div>
    {locked && <div className="scene-pointer-help"><MousePointer2 size={13} /> Mouse look on · Esc to release · click a book to select</div>}
  </div>;
}
