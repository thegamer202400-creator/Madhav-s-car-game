import * as THREE from 'three';

export interface CarVisuals {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshStandardMaterial;
  frontLeftSteer: THREE.Group;
  frontRightSteer: THREE.Group;
  steeringWheelGroup: THREE.Group;
  wheelRollers: THREE.Object3D[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  contactShadow: THREE.Mesh;
  gizmoGroup: THREE.Group;
  colliderBoxHelper: THREE.Box3Helper;
  updateWheels: (steerAngleRad: number, rollDeltaRad: number) => void;
  setColor: (hexColor: string) => void;
  setGizmosVisible: (visible: boolean) => void;
  setColliderVisible: (visible: boolean) => void;
  box: THREE.Box3;
}

/**
 * Procedural texture generator for tire tread & wheel rim
 */
function createTireTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1d21';
  ctx.fillRect(0, 0, 256, 256);

  // Tread blocks
  ctx.fillStyle = '#111215';
  for (let y = 0; y < 256; y += 16) {
    ctx.fillRect(0, y, 110, 8);
    ctx.fillRect(146, y + 8, 110, 8);
  }

  // Center grooves
  ctx.fillStyle = '#0c0d0f';
  ctx.fillRect(115, 0, 12, 256);
  ctx.fillRect(133, 0, 12, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * Procedural radial gradient texture for soft contact shadow grounding
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Procedural texture for instrument cluster gauges (Speedometer & Tachometer)
 */
function createClusterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 192);

  // Border & carbon pattern
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 184);

  // Left Gauge: Speedometer
  ctx.beginPath();
  ctx.arc(130, 96, 70, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SPEED', 130, 85);
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('KM/H', 130, 120);

  // Right Gauge: Tachometer
  ctx.beginPath();
  ctx.arc(382, 96, 70, 0.75 * Math.PI, 1.9 * Math.PI);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Redline
  ctx.beginPath();
  ctx.arc(382, 96, 70, 1.9 * Math.PI, 2.25 * Math.PI);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('RPM x1000', 382, 85);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('REDLINE', 382, 120);

  // Center display: Gear & Mode
  ctx.fillStyle = '#18181b';
  ctx.fillRect(216, 30, 80, 130);
  ctx.strokeStyle = '#3f3f46';
  ctx.strokeRect(216, 30, 80, 130);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 48px monospace';
  ctx.fillText('4', 256, 95);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SPORT+', 256, 135);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural texture for center infotainment & GPS navigation screen
 */
function createNavScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, 256, 192);

  // Grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 192);
    ctx.stroke();
  }
  for (let y = 0; y < 192; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Cyan route line
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(128, 90);
  ctx.lineTo(190, 40);
  ctx.stroke();

  // Navigation Arrow
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(128, 80);
  ctx.lineTo(118, 105);
  ctx.lineTo(128, 98);
  ctx.lineTo(138, 105);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('TRACKWAY GPS', 10, 25);
  ctx.fillStyle = '#22c55e';
  ctx.font = '14px monospace';
  ctx.fillText('100 KM/H LIMIT', 10, 45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds a multi-part procedural sports car model with realistic detailed interior
 */
export function createCarModel(initialColor: string = '#ef4444'): CarVisuals {
  const carGroup = new THREE.Group();
  carGroup.name = 'Car_Root';

  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: initialColor,
    metalness: 0.75,
    roughness: 0.22,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.35,
    roughness: 0.45,
  });

  const interiorDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x111215,
    metalness: 0.2,
    roughness: 0.75,
  });

  const seatAlcantaraMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.85,
    metalness: 0.1,
  });

  const leatherRedAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.6,
    metalness: 0.2,
  });

  const windshieldGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transmission: 0.92,
    opacity: 0.35,
    transparent: true,
    roughness: 0.05,
    ior: 1.5,
    thickness: 0.05,
    depthWrite: false,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    map: createTireTexture(),
    color: 0x222225,
    roughness: 0.85,
    metalness: 0.1,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.9,
    roughness: 0.2,
  });

  const brakeBremboMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.5,
    roughness: 0.3,
  });

  const brakeDiscMaterial = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    metalness: 0.95,
    roughness: 0.25,
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });

  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0022,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.98,
    roughness: 0.1,
  });

  // 1. Lower Chassis & Aerodynamic Body
  const chassisGeom = new THREE.BoxGeometry(1.85, 0.45, 4.2);
  const chassis = new THREE.Mesh(chassisGeom, bodyMaterial);
  chassis.position.y = 0.48;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carGroup.add(chassis);

  // Front wedge hood
  const hoodGeom = new THREE.BoxGeometry(1.72, 0.22, 1.3);
  const hood = new THREE.Mesh(hoodGeom, bodyMaterial);
  hood.position.set(0, 0.58, 1.3);
  hood.rotation.x = -0.1;
  hood.castShadow = true;
  carGroup.add(hood);

  // Aerodynamic Front Splitter
  const splitterGeom = new THREE.BoxGeometry(1.92, 0.08, 0.8);
  const splitter = new THREE.Mesh(splitterGeom, carbonMaterial);
  splitter.position.set(0, 0.22, 2.0);
  splitter.castShadow = true;
  carGroup.add(splitter);

  // -------------------------------------------------------------
  // 2. REALISTIC COCKPIT INTERIOR
  // -------------------------------------------------------------
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'Car_Interior';

  // Interior floor tub & cabin base
  const floorGeom = new THREE.BoxGeometry(1.42, 0.08, 1.8);
  const floor = new THREE.Mesh(floorGeom, interiorDarkMaterial);
  floor.position.set(0, 0.52, -0.15);
  interiorGroup.add(floor);

  // Interior side door trims & armrests
  const leftDoorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 1.7), interiorDarkMaterial);
  leftDoorTrim.position.set(-0.72, 0.76, -0.15);
  const rightDoorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 1.7), interiorDarkMaterial);
  rightDoorTrim.position.set(0.72, 0.76, -0.15);
  interiorGroup.add(leftDoorTrim, rightDoorTrim);

  // Center transmission tunnel console
  const tunnelGeom = new THREE.BoxGeometry(0.28, 0.24, 1.6);
  const tunnel = new THREE.Mesh(tunnelGeom, carbonMaterial);
  tunnel.position.set(0, 0.64, -0.15);
  interiorGroup.add(tunnel);

  // Gear shifter stick
  const shifterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12), chromeMaterial);
  shifterStem.position.set(0, 0.82, 0.05);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), leatherRedAccentMaterial);
  shifterKnob.position.set(0, 0.9, 0.05);
  interiorGroup.add(shifterStem, shifterKnob);

  // Racing Bucket Seats (Driver Left, Passenger Right)
  function createBucketSeat(xPos: number): THREE.Group {
    const seat = new THREE.Group();
    // Cushion
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.52), seatAlcantaraMaterial);
    cushion.position.set(xPos, 0.62, -0.22);
    seat.add(cushion);

    // Contoured backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.14), seatAlcantaraMaterial);
    backrest.position.set(xPos, 0.88, -0.45);
    backrest.rotation.x = -0.15;
    seat.add(backrest);

    // Headrest
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.1), leatherRedAccentMaterial);
    headrest.position.set(xPos, 1.18, -0.5);
    seat.add(headrest);

    return seat;
  }

  const driverSeat = createBucketSeat(-0.38);
  const passengerSeat = createBucketSeat(0.38);
  interiorGroup.add(driverSeat, passengerSeat);

  // Sculpted Dashboard Shelf
  const dashGeom = new THREE.BoxGeometry(1.44, 0.28, 0.6);
  const dash = new THREE.Mesh(dashGeom, interiorDarkMaterial);
  dash.position.set(0, 0.82, 0.42);
  dash.castShadow = true;
  interiorGroup.add(dash);

  // Gauge Cluster Binnacle (Driver Side)
  const binnacleGeom = new THREE.BoxGeometry(0.48, 0.18, 0.22);
  const binnacle = new THREE.Mesh(binnacleGeom, carbonMaterial);
  binnacle.position.set(-0.38, 0.94, 0.38);
  interiorGroup.add(binnacle);

  // Gauge Cluster Screen Display
  const clusterMat = new THREE.MeshBasicMaterial({
    map: createClusterTexture(),
  });
  const clusterScreenGeom = new THREE.PlaneGeometry(0.44, 0.16);
  const clusterScreen = new THREE.Mesh(clusterScreenGeom, clusterMat);
  clusterScreen.position.set(-0.38, 0.94, 0.268);
  interiorGroup.add(clusterScreen);

  // Infotainment GPS Navigation Screen (Center)
  const navMat = new THREE.MeshBasicMaterial({
    map: createNavScreenTexture(),
  });
  const navScreenGeom = new THREE.PlaneGeometry(0.28, 0.18);
  const navScreen = new THREE.Mesh(navScreenGeom, navMat);
  navScreen.position.set(0.02, 0.86, 0.35);
  navScreen.rotation.x = -0.2;
  interiorGroup.add(navScreen);

  // Interactive 3-Spoke Sports Steering Wheel
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(-0.38, 0.88, 0.16);
  steeringWheelGroup.rotation.x = -0.32; // Angled toward driver

  // Steering Column
  const columnGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12);
  columnGeom.rotateX(Math.PI / 2);
  const column = new THREE.Mesh(columnGeom, carbonMaterial);
  column.position.set(0, 0, 0.08);
  steeringWheelGroup.add(column);

  // Steering Wheel Rim (Flat bottom sports wheel)
  const rimOuterGeom = new THREE.TorusGeometry(0.18, 0.024, 16, 32);
  const rimMesh = new THREE.Mesh(rimOuterGeom, interiorDarkMaterial);
  steeringWheelGroup.add(rimMesh);

  // Wheel Center Hub with red emblem
  const hubGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16);
  hubGeom.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeom, leatherRedAccentMaterial);
  steeringWheelGroup.add(hubMesh);

  // 3 Spokes
  const spokeGeom = new THREE.BoxGeometry(0.03, 0.14, 0.02);
  const spokeLeft = new THREE.Mesh(spokeGeom, carbonMaterial);
  spokeLeft.rotation.z = Math.PI / 2.3;
  spokeLeft.position.set(-0.08, -0.02, 0);
  const spokeRight = new THREE.Mesh(spokeGeom, carbonMaterial);
  spokeRight.rotation.z = -Math.PI / 2.3;
  spokeRight.position.set(0.08, -0.02, 0);
  const spokeBottom = new THREE.Mesh(spokeGeom, carbonMaterial);
  spokeBottom.position.set(0, -0.09, 0);
  steeringWheelGroup.add(spokeLeft, spokeRight, spokeBottom);

  interiorGroup.add(steeringWheelGroup);

  // Rearview Mirror
  const mirrorGeom = new THREE.BoxGeometry(0.24, 0.07, 0.04);
  const mirrorMesh = new THREE.Mesh(mirrorGeom, chromeMaterial);
  mirrorMesh.position.set(0, 1.15, 0.35);
  interiorGroup.add(mirrorMesh);

  carGroup.add(interiorGroup);

  // -------------------------------------------------------------
  // 3. EXTERIOR CABIN PILLARS, ROOF & CLEAR WINDSHIELD
  // -------------------------------------------------------------
  // Cabin roof
  const roofGeom = new THREE.BoxGeometry(1.36, 0.06, 1.4);
  const roof = new THREE.Mesh(roofGeom, bodyMaterial);
  roof.position.set(0, 1.25, -0.22);
  roof.castShadow = true;
  carGroup.add(roof);

  // Front A-Pillars (Left & Right)
  const aPillarGeom = new THREE.BoxGeometry(0.06, 0.45, 0.06);
  const leftAPillar = new THREE.Mesh(aPillarGeom, bodyMaterial);
  leftAPillar.position.set(-0.66, 1.05, 0.4);
  leftAPillar.rotation.x = -0.55;
  const rightAPillar = new THREE.Mesh(aPillarGeom, bodyMaterial);
  rightAPillar.position.set(0.66, 1.05, 0.4);
  rightAPillar.rotation.x = -0.55;
  carGroup.add(leftAPillar, rightAPillar);

  // Slanted Front Windshield Glass
  const windshieldGeom = new THREE.PlaneGeometry(1.32, 0.62);
  const windshield = new THREE.Mesh(windshieldGeom, windshieldGlassMaterial);
  windshield.position.set(0, 1.06, 0.42);
  windshield.rotation.x = -0.58;
  carGroup.add(windshield);

  // Side Windows Glass
  const sideGlassGeom = new THREE.PlaneGeometry(1.3, 0.38);
  const leftSideGlass = new THREE.Mesh(sideGlassGeom, windshieldGlassMaterial);
  leftSideGlass.position.set(-0.69, 1.05, -0.2);
  leftSideGlass.rotation.y = -Math.PI / 2;
  const rightSideGlass = new THREE.Mesh(sideGlassGeom, windshieldGlassMaterial);
  rightSideGlass.position.set(0.69, 1.05, -0.2);
  rightSideGlass.rotation.y = Math.PI / 2;
  carGroup.add(leftSideGlass, rightSideGlass);

  // Rear Window Glass
  const rearGlassGeom = new THREE.PlaneGeometry(1.3, 0.45);
  const rearGlass = new THREE.Mesh(rearGlassGeom, windshieldGlassMaterial);
  rearGlass.position.set(0, 1.05, -0.88);
  rearGlass.rotation.x = 0.55;
  carGroup.add(rearGlass);

  // Side mirrors
  const mirrorHousingGeom = new THREE.BoxGeometry(0.18, 0.1, 0.24);
  const leftMirror = new THREE.Mesh(mirrorHousingGeom, carbonMaterial);
  leftMirror.position.set(-0.85, 0.85, 0.5);
  const rightMirror = new THREE.Mesh(mirrorHousingGeom, carbonMaterial);
  rightMirror.position.set(0.85, 0.85, 0.5);
  carGroup.add(leftMirror, rightMirror);

  // 4. Rear Aerodynamic Wing / Spoiler
  const wingGeom = new THREE.BoxGeometry(1.95, 0.06, 0.45);
  const wing = new THREE.Mesh(wingGeom, carbonMaterial);
  wing.position.set(0, 1.05, -1.9);
  wing.castShadow = true;

  const strutGeom = new THREE.BoxGeometry(0.06, 0.4, 0.25);
  const leftStrut = new THREE.Mesh(strutGeom, carbonMaterial);
  leftStrut.position.set(-0.5, 0.82, -1.9);
  const rightStrut = new THREE.Mesh(strutGeom, carbonMaterial);
  rightStrut.position.set(0.5, 0.82, -1.9);

  carGroup.add(wing, leftStrut, rightStrut);

  // 5. Rear Diffuser & Exhausts
  const diffuserGeom = new THREE.BoxGeometry(1.6, 0.18, 0.3);
  const diffuser = new THREE.Mesh(diffuserGeom, carbonMaterial);
  diffuser.position.set(0, 0.3, -2.12);
  carGroup.add(diffuser);

  const exhaustGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.25, 16);
  exhaustGeom.rotateX(Math.PI / 2);
  const exhaust1 = new THREE.Mesh(exhaustGeom, chromeMaterial);
  exhaust1.position.set(-0.4, 0.32, -2.15);
  const exhaust2 = new THREE.Mesh(exhaustGeom, chromeMaterial);
  exhaust2.position.set(-0.25, 0.32, -2.15);
  const exhaust3 = new THREE.Mesh(exhaustGeom, chromeMaterial);
  exhaust3.position.set(0.25, 0.32, -2.15);
  const exhaust4 = new THREE.Mesh(exhaustGeom, chromeMaterial);
  exhaust4.position.set(0.4, 0.32, -2.15);
  carGroup.add(exhaust1, exhaust2, exhaust3, exhaust4);

  // 6. Lights
  const headlightGeom = new THREE.BoxGeometry(0.35, 0.09, 0.12);
  const leftHeadlight = new THREE.Mesh(headlightGeom, headlightMaterial);
  leftHeadlight.position.set(-0.65, 0.52, 2.06);
  const rightHeadlight = new THREE.Mesh(headlightGeom, headlightMaterial);
  rightHeadlight.position.set(0.65, 0.52, 2.06);
  carGroup.add(leftHeadlight, rightHeadlight);

  const taillightGeom = new THREE.BoxGeometry(1.6, 0.08, 0.08);
  const rearTaillight = new THREE.Mesh(taillightGeom, taillightMaterial);
  rearTaillight.position.set(0, 0.58, -2.11);
  carGroup.add(rearTaillight);

  // 7. Wheels (Front steerable, all 4 rollable)
  const wheelRadius = 0.36;
  const wheelThickness = 0.28;

  function buildWheelMesh(): { container: THREE.Group; roller: THREE.Group } {
    const container = new THREE.Group();
    const roller = new THREE.Group();

    // Tire
    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeom, tireMaterial);
    tire.castShadow = true;
    roller.add(tire);

    // Rim
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelThickness + 0.02, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    roller.add(rim);

    // Rim Spokes
    const spokeGeom = new THREE.BoxGeometry(wheelThickness + 0.025, wheelRadius * 1.3, 0.06);
    const spoke1 = new THREE.Mesh(spokeGeom, rimMaterial);
    const spoke2 = new THREE.Mesh(spokeGeom, rimMaterial);
    spoke2.rotation.x = Math.PI / 3;
    const spoke3 = new THREE.Mesh(spokeGeom, rimMaterial);
    spoke3.rotation.x = -Math.PI / 3;
    roller.add(spoke1, spoke2, spoke3);

    // Brake Disc & Caliper
    const discGeom = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.04, 20);
    discGeom.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeom, brakeDiscMaterial);
    container.add(disc);

    const caliperGeom = new THREE.BoxGeometry(0.12, 0.16, 0.18);
    const caliper = new THREE.Mesh(caliperGeom, brakeBremboMaterial);
    caliper.position.set(0, 0.14, 0.08);
    container.add(caliper);

    container.add(roller);
    return { container, roller };
  }

  const wheelRollers: THREE.Object3D[] = [];

  // Front Left
  const frontLeftSteer = new THREE.Group();
  frontLeftSteer.position.set(-0.95, wheelRadius, 1.35);
  const flWheel = buildWheelMesh();
  frontLeftSteer.add(flWheel.container);
  wheelRollers.push(flWheel.roller);
  carGroup.add(frontLeftSteer);

  // Front Right
  const frontRightSteer = new THREE.Group();
  frontRightSteer.position.set(0.95, wheelRadius, 1.35);
  const frWheel = buildWheelMesh();
  frontRightSteer.add(frWheel.container);
  wheelRollers.push(frWheel.roller);
  carGroup.add(frontRightSteer);

  // Rear Left
  const rearLeftGroup = new THREE.Group();
  rearLeftGroup.position.set(-0.95, wheelRadius, -1.35);
  const rlWheel = buildWheelMesh();
  rearLeftGroup.add(rlWheel.container);
  wheelRollers.push(rlWheel.roller);
  carGroup.add(rearLeftGroup);

  // Rear Right
  const rearRightGroup = new THREE.Group();
  rearRightGroup.position.set(0.95, wheelRadius, -1.35);
  const rrWheel = buildWheelMesh();
  rearRightGroup.add(rrWheel.container);
  wheelRollers.push(rrWheel.roller);
  carGroup.add(rearRightGroup);

  // 8. Ground Contact Shadow
  const shadowPlaneGeom = new THREE.PlaneGeometry(2.8, 5.0);
  shadowPlaneGeom.rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowPlaneGeom, shadowMaterial);
  contactShadow.position.y = 0.02;
  carGroup.add(contactShadow);

  // 9. Unity Gizmo Indicators (Forward +Z, Right +X, Up +Y)
  const gizmoGroup = new THREE.Group();
  gizmoGroup.name = 'Unity_Gizmo';

  const forwardArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0.6, 2.1),
    1.8,
    0x38bdf8,
    0.4,
    0.2
  );
  gizmoGroup.add(forwardArrow);

  const upArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1.2, 0),
    1.0,
    0x4ade80,
    0.3,
    0.15
  );
  gizmoGroup.add(upArrow);

  const rightArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0.95, 0.6, 0),
    1.0,
    0xf87171,
    0.3,
    0.15
  );
  gizmoGroup.add(rightArrow);

  carGroup.add(gizmoGroup);
  gizmoGroup.visible = true;

  // 10. Bounding Collider Box
  const box = new THREE.Box3();
  box.setFromCenterAndSize(new THREE.Vector3(0, 0.65, 0), new THREE.Vector3(2.0, 1.2, 4.4));
  const colliderBoxHelper = new THREE.Box3Helper(box, new THREE.Color(0x22c55e));
  colliderBoxHelper.visible = false;
  carGroup.add(colliderBoxHelper);

  return {
    group: carGroup,
    bodyMesh: chassis,
    bodyMaterial,
    frontLeftSteer,
    frontRightSteer,
    steeringWheelGroup,
    wheelRollers,
    headlights: [leftHeadlight, rightHeadlight],
    taillights: [rearTaillight],
    contactShadow,
    gizmoGroup,
    colliderBoxHelper,
    updateWheels: (steerAngleRad: number, rollDeltaRad: number) => {
      // Exterior wheels steer
      frontLeftSteer.rotation.y = steerAngleRad;
      frontRightSteer.rotation.y = steerAngleRad;

      // Interior sports steering wheel turns in sync with steering (amplified like real 540-deg rack)
      steeringWheelGroup.rotation.z = -steerAngleRad * 2.2;

      for (let i = 0; i < wheelRollers.length; i++) {
        wheelRollers[i].rotation.x += rollDeltaRad;
      }
    },
    setColor: (hexColor: string) => {
      bodyMaterial.color.set(hexColor);
      roof.material = bodyMaterial;
      hood.material = bodyMaterial;
      leftAPillar.material = bodyMaterial;
      rightAPillar.material = bodyMaterial;
    },
    setGizmosVisible: (visible: boolean) => {
      gizmoGroup.visible = visible;
    },
    setColliderVisible: (visible: boolean) => {
      colliderBoxHelper.visible = visible;
    },
    box,
  };
}
