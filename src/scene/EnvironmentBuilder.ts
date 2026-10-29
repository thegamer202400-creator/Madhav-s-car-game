import * as THREE from 'three';
import { TrackType } from '../types/simulator';

export interface DynamicObstacle {
  mesh: THREE.Mesh | THREE.Group;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  radius: number;
  initialPos: THREE.Vector3;
  initialRot: THREE.Euler;
  isHit: boolean;
  type: 'cone' | 'crate' | 'barrel';
}

export interface CheckpointGate {
  position: THREE.Vector3;
  radius: number;
  id: number;
  isPassed: boolean;
}

export interface EnvironmentData {
  root: THREE.Group;
  obstacles: DynamicObstacle[];
  checkpoints: CheckpointGate[];
  speedTrap: {
    position: THREE.Vector3;
    width: number;
    textMesh?: THREE.Mesh;
    canvas?: HTMLCanvasElement;
    texture?: THREE.CanvasTexture;
  };
  skidmarkMesh: THREE.InstancedMesh;
  skidmarkIndex: number;
  addSkidmark: (posLeft: THREE.Vector3, posRight: THREE.Vector3, opacity: number) => void;
  smokeParticles: THREE.Points;
  updateParticles: (dt: number, isDrifting: boolean, carPos: THREE.Vector3, carForward: THREE.Vector3) => void;
  resetObstacles: () => void;
}

/**
 * Procedural asphalt texture with subtle road noise & lane markings
 */
function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#27272a';
  ctx.fillRect(0, 0, 512, 512);

  // Noise
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const val = 30 + Math.random() * 25;
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Grid lines
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates dynamic traffic cone
 */
function createTrafficCone(): THREE.Group {
  const group = new THREE.Group();

  // Square base
  const baseGeom = new THREE.BoxGeometry(0.5, 0.05, 0.5);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.6 });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.025;
  base.castShadow = true;
  group.add(base);

  // Orange cone body
  const coneGeom = new THREE.ConeGeometry(0.2, 0.75, 16);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.position.y = 0.4;
  cone.castShadow = true;
  group.add(cone);

  // White reflective collar
  const stripeGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.18, 16);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const stripe = new THREE.Mesh(stripeGeom, stripeMat);
  stripe.position.y = 0.38;
  group.add(stripe);

  return group;
}

/**
 * Creates knockable wooden crate
 */
function createWoodCrate(): THREE.Mesh {
  const geom = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.8,
    metalness: 0.1,
  });
  const crate = new THREE.Mesh(geom, mat);
  crate.position.y = 0.45;
  crate.castShadow = true;
  crate.receiveShadow = true;
  return crate;
}

/**
 * Creates knockable metal oil barrel
 */
function createBarrel(): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(0.38, 0.38, 1.0, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.4,
    metalness: 0.6,
  });
  const barrel = new THREE.Mesh(geom, mat);
  barrel.position.y = 0.5;
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  return barrel;
}

export function buildEnvironment(trackType: TrackType): EnvironmentData {
  const root = new THREE.Group();
  root.name = 'Environment_Root';

  const obstacles: DynamicObstacle[] = [];
  const checkpoints: CheckpointGate[] = [];

  // Ground plane (extends 400m to natural horizon fade)
  const groundGeom = new THREE.PlaneGeometry(500, 500);
  groundGeom.rotateX(-Math.PI / 2);

  const groundMat = new THREE.MeshStandardMaterial({
    map: createAsphaltTexture(),
    roughness: 0.85,
    metalness: 0.15,
  });

  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.receiveShadow = true;
  ground.position.y = 0;
  root.add(ground);

  // Outer boundary barriers (concrete blocks around 120m perimeter)
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.7,
    metalness: 0.2,
  });

  const barrierGeom = new THREE.BoxGeometry(6, 1.2, 0.8);
  const barrierDistance = 110;
  const numBarriersPerSide = 36;

  for (let i = 0; i < numBarriersPerSide; i++) {
    const offset = (i - numBarriersPerSide / 2) * 6;
    // North
    const b1 = new THREE.Mesh(barrierGeom, barrierMat);
    b1.position.set(offset, 0.6, barrierDistance);
    b1.castShadow = true;
    root.add(b1);

    // South
    const b2 = new THREE.Mesh(barrierGeom, barrierMat);
    b2.position.set(offset, 0.6, -barrierDistance);
    b2.castShadow = true;
    root.add(b2);

    // East
    const b3 = new THREE.Mesh(barrierGeom, barrierMat);
    b3.rotation.y = Math.PI / 2;
    b3.position.set(barrierDistance, 0.6, offset);
    b3.castShadow = true;
    root.add(b3);

    // West
    const b4 = new THREE.Mesh(barrierGeom, barrierMat);
    b4.rotation.y = Math.PI / 2;
    b4.position.set(-barrierDistance, 0.6, offset);
    b4.castShadow = true;
    root.add(b4);
  }

  // Speed Trap Radar Structure
  const speedTrapPos = new THREE.Vector3(0, 0, 45);
  const trapGantryMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.8, roughness: 0.3 });
  const gantryPillarGeom = new THREE.BoxGeometry(0.4, 5, 0.4);
  const gantryBarGeom = new THREE.BoxGeometry(16, 0.6, 0.6);

  const leftPillar = new THREE.Mesh(gantryPillarGeom, trapGantryMat);
  leftPillar.position.set(-8, 2.5, speedTrapPos.z);
  leftPillar.castShadow = true;
  const rightPillar = new THREE.Mesh(gantryPillarGeom, trapGantryMat);
  rightPillar.position.set(8, 2.5, speedTrapPos.z);
  rightPillar.castShadow = true;
  const topBar = new THREE.Mesh(gantryBarGeom, trapGantryMat);
  topBar.position.set(0, 5, speedTrapPos.z);
  topBar.castShadow = true;

  root.add(leftPillar, rightPillar, topBar);

  // Speed Display LED Board
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 512;
  ledCanvas.height = 128;
  const ledCtx = ledCanvas.getContext('2d')!;
  ledCtx.fillStyle = '#09090b';
  ledCtx.fillRect(0, 0, 512, 128);
  ledCtx.strokeStyle = '#ef4444';
  ledCtx.lineWidth = 4;
  ledCtx.strokeRect(4, 4, 504, 120);
  ledCtx.fillStyle = '#22c55e';
  ledCtx.font = 'bold 36px monospace';
  ledCtx.textAlign = 'center';
  ledCtx.fillText('RADAR SPEED TRAP', 256, 45);
  ledCtx.fillStyle = '#38bdf8';
  ledCtx.font = 'bold 50px monospace';
  ledCtx.fillText('0.0 KM/H', 256, 105);

  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTexture });
  const ledBoardGeom = new THREE.PlaneGeometry(8, 2);
  const ledBoard = new THREE.Mesh(ledBoardGeom, ledMat);
  ledBoard.position.set(0, 4.0, speedTrapPos.z - 0.32);
  root.add(ledBoard);

  // Backward-facing sign as well
  const ledBoardBack = new THREE.Mesh(ledBoardGeom, ledMat);
  ledBoardBack.rotation.y = Math.PI;
  ledBoardBack.position.set(0, 4.0, speedTrapPos.z + 0.32);
  root.add(ledBoardBack);

  const speedTrap = {
    position: speedTrapPos,
    width: 14,
    textMesh: ledBoard,
    canvas: ledCanvas,
    texture: ledTexture,
  };

  // Build Track-Specific Elements
  if (trackType === 'proving_grounds') {
    // 1. Stunt Jump Ramp
    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 0);
    rampShape.lineTo(6, 0);
    rampShape.lineTo(6, 1.8);
    rampShape.lineTo(0, 0);

    const extrudeSettings = { depth: 8, bevelEnabled: false };
    const rampGeom = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
    rampGeom.rotateY(Math.PI / 2);
    rampGeom.translate(4, 0, 15);

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.4,
    });
    const ramp = new THREE.Mesh(rampGeom, rampMat);
    ramp.position.set(0, 0, 20);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    root.add(ramp);

    // Hazard warning stripes on ramp side
    const stripeShape = new THREE.PlaneGeometry(4, 1.2);
    stripeShape.rotateY(Math.PI / 2);

    // 2. Slalom Cones Course
    for (let i = 0; i < 10; i++) {
      const cone = createTrafficCone();
      const z = -10 - i * 8;
      const x = (i % 2 === 0 ? 3.5 : -3.5);
      cone.position.set(x, 0, z);
      root.add(cone);

      obstacles.push({
        mesh: cone,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        radius: 0.5,
        initialPos: cone.position.clone(),
        initialRot: cone.rotation.clone(),
        isHit: false,
        type: 'cone',
      });
    }

    // 3. Wooden Crates Pyramid / Stacks
    const crateLocations = [
      { x: -18, z: 12 }, { x: -17, z: 12 }, { x: -16, z: 12 },
      { x: -17.5, z: 12, y: 0.9 }, { x: -16.5, z: 12, y: 0.9 },
      { x: -17, z: 12, y: 1.8 },
      { x: 18, z: -10 }, { x: 19, z: -10 }, { x: 18.5, z: -10, y: 0.9 },
      { x: 25, z: 30 }, { x: -25, z: 40 },
    ];

    crateLocations.forEach((loc) => {
      const crate = createWoodCrate();
      crate.position.set(loc.x, loc.y ?? 0.45, loc.z);
      root.add(crate);

      obstacles.push({
        mesh: crate,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        radius: 0.65,
        initialPos: crate.position.clone(),
        initialRot: crate.rotation.clone(),
        isHit: false,
        type: 'crate',
      });
    });

    // 4. Metal Oil Barrels
    const barrelLocations = [
      { x: -10, z: -40 }, { x: -8.8, z: -40 }, { x: -9.4, z: -38.8 },
      { x: 12, z: -35 }, { x: 10.8, z: -35 },
      { x: 0, z: 70 }, { x: 2, z: 70 }, { x: -2, z: 70 },
    ];

    barrelLocations.forEach((loc) => {
      const barrel = createBarrel();
      barrel.position.set(loc.x, 0.5, loc.z);
      root.add(barrel);

      obstacles.push({
        mesh: barrel,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        radius: 0.5,
        initialPos: barrel.position.clone(),
        initialRot: barrel.rotation.clone(),
        isHit: false,
        type: 'barrel',
      });
    });
  } else if (trackType === 'neon_circuit') {
    // Grand Prix Road Circuit with Checkpoint Gates
    const cpCoords = [
      { x: 0, z: 0 },
      { x: 0, z: 50 },
      { x: 35, z: 65 },
      { x: 60, z: 30 },
      { x: 50, z: -40 },
      { x: 20, z: -60 },
      { x: -30, z: -60 },
      { x: -50, z: -20 },
      { x: -40, z: 30 },
      { x: -15, z: 15 },
    ];

    cpCoords.forEach((coord, idx) => {
      checkpoints.push({
        position: new THREE.Vector3(coord.x, 0, coord.z),
        radius: 12,
        id: idx,
        isPassed: false,
      });

      // Visual glowing checkpoint gate arch
      const gateGeom = new THREE.TorusGeometry(6, 0.25, 8, 24, Math.PI);
      const gateMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x22c55e : 0x06b6d4,
        emissive: idx === 0 ? 0x22c55e : 0x06b6d4,
        emissiveIntensity: 1.5,
      });
      const gate = new THREE.Mesh(gateGeom, gateMat);
      gate.position.set(coord.x, 0, coord.z);
      root.add(gate);
    });

    // Curbs along main turns
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const curbGeom = new THREE.BoxGeometry(2, 0.2, 0.6);
    for (let a = 0; a < 30; a++) {
      const angle = (a / 30) * Math.PI * 2;
      const curb = new THREE.Mesh(curbGeom, curbMat);
      curb.position.set(Math.cos(angle) * 70, 0.1, Math.sin(angle) * 55);
      curb.rotation.y = angle + Math.PI / 2;
      root.add(curb);
    }
  } else {
    // Open Testbed: Coordinate grid, distance signs every 25m
    for (let d = -100; d <= 100; d += 25) {
      if (d === 0) continue;
      const signGeom = new THREE.BoxGeometry(3, 1, 0.2);
      const signMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const sign = new THREE.Mesh(signGeom, signMat);
      sign.position.set(12, 1, d);
      root.add(sign);

      const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), signMat);
      signPole.position.set(12, 0.5, d);
      root.add(signPole);
    }
  }

  // 5. Tire Skidmarks System (InstancedMesh of 300 quad segments)
  const maxSkidmarks = 300;
  const skidGeom = new THREE.PlaneGeometry(0.35, 1.2);
  skidGeom.rotateX(-Math.PI / 2);
  const skidMat = new THREE.MeshBasicMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const skidmarkMesh = new THREE.InstancedMesh(skidGeom, skidMat, maxSkidmarks);
  skidmarkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  skidmarkMesh.position.y = 0.025; // Sits right above ground
  root.add(skidmarkMesh);

  // Initialize invisible matrices far off
  const dummyMatrix = new THREE.Matrix4();
  dummyMatrix.setPosition(0, -999, 0);
  for (let i = 0; i < maxSkidmarks; i++) {
    skidmarkMesh.setMatrixAt(i, dummyMatrix);
  }
  skidmarkMesh.instanceMatrix.needsUpdate = true;

  let currentSkidIndex = 0;
  const addSkidmark = (posLeft: THREE.Vector3, posRight: THREE.Vector3) => {
    // Add mark for left tire
    const mLeft = new THREE.Matrix4();
    mLeft.setPosition(posLeft.x, 0.025, posLeft.z);
    skidmarkMesh.setMatrixAt(currentSkidIndex % maxSkidmarks, mLeft);
    currentSkidIndex++;

    // Add mark for right tire
    const mRight = new THREE.Matrix4();
    mRight.setPosition(posRight.x, 0.025, posRight.z);
    skidmarkMesh.setMatrixAt(currentSkidIndex % maxSkidmarks, mRight);
    currentSkidIndex++;

    skidmarkMesh.instanceMatrix.needsUpdate = true;
  };

  // 6. Procedural Tire Smoke Particles (BufferGeometry + Points)
  const particleCount = 200;
  const smokePositions = new Float32Array(particleCount * 3);
  const smokeLifetimes = new Float32Array(particleCount);
  const smokeVelocities = new Float32Array(particleCount * 3);

  // Start with dead particles
  for (let i = 0; i < particleCount; i++) {
    smokePositions[i * 3 + 1] = -100;
    smokeLifetimes[i] = 0;
  }

  const smokeGeom = new THREE.BufferGeometry();
  smokeGeom.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

  // Procedural soft circle sprite for smoke
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 64;
  smokeCanvas.height = 64;
  const sCtx = smokeCanvas.getContext('2d')!;
  const radGrad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  radGrad.addColorStop(0, 'rgba(230, 230, 235, 0.8)');
  radGrad.addColorStop(0.5, 'rgba(200, 200, 210, 0.3)');
  radGrad.addColorStop(1, 'rgba(180, 180, 190, 0)');
  sCtx.fillStyle = radGrad;
  sCtx.fillRect(0, 0, 64, 64);

  const smokeTexture = new THREE.CanvasTexture(smokeCanvas);

  const smokeMat = new THREE.PointsMaterial({
    size: 1.8,
    map: smokeTexture,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const smokeParticles = new THREE.Points(smokeGeom, smokeMat);
  root.add(smokeParticles);

  let particleCursor = 0;

  const updateParticles = (dt: number, isDrifting: boolean, carPos: THREE.Vector3, carForward: THREE.Vector3) => {
    const posAttr = smokeGeom.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    // Spawn new particles if drifting
    if (isDrifting) {
      for (let s = 0; s < 3; s++) {
        const idx = particleCursor % particleCount;
        particleCursor++;

        // Spawn near rear tires with jitter
        const sideOffset = (Math.random() - 0.5) * 1.8;
        posArr[idx * 3] = carPos.x - carForward.x * 1.8 + sideOffset;
        posArr[idx * 3 + 1] = 0.35 + Math.random() * 0.2;
        posArr[idx * 3 + 2] = carPos.z - carForward.z * 1.8 + sideOffset;

        smokeLifetimes[idx] = 1.0;
        smokeVelocities[idx * 3] = (Math.random() - 0.5) * 1.5;
        smokeVelocities[idx * 3 + 1] = 1.0 + Math.random() * 1.5; // Upward drift
        smokeVelocities[idx * 3 + 2] = (Math.random() - 0.5) * 1.5;
      }
    }

    // Update active particles
    for (let i = 0; i < particleCount; i++) {
      if (smokeLifetimes[i] > 0) {
        smokeLifetimes[i] -= dt * 1.2;
        posArr[i * 3] += smokeVelocities[i * 3] * dt;
        posArr[i * 3 + 1] += smokeVelocities[i * 3 + 1] * dt;
        posArr[i * 3 + 2] += smokeVelocities[i * 3 + 2] * dt;

        if (smokeLifetimes[i] <= 0) {
          posArr[i * 3 + 1] = -100;
        }
      }
    }
    posAttr.needsUpdate = true;
  };

  const resetObstacles = () => {
    obstacles.forEach((obs) => {
      obs.mesh.position.copy(obs.initialPos);
      obs.mesh.rotation.copy(obs.initialRot);
      obs.velocity.set(0, 0, 0);
      obs.angularVelocity.set(0, 0, 0);
      obs.isHit = false;
    });
  };

  return {
    root,
    obstacles,
    checkpoints,
    speedTrap,
    skidmarkMesh,
    skidmarkIndex: currentSkidIndex,
    addSkidmark,
    smokeParticles,
    updateParticles,
    resetObstacles,
  };
}
