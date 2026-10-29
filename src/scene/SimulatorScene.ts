import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CarSettings, InputState, TelemetryData } from '../types/simulator';
import { createCarModel, CarVisuals } from './CarModel';
import { buildEnvironment, EnvironmentData } from './EnvironmentBuilder';
import { soundEngine } from '../audio/engineAudio';

// Preallocated math objects outside render loop for Zero GC
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3Forward = new THREE.Vector3();
const _vec3Right = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _skidLeft = new THREE.Vector3();
const _skidRight = new THREE.Vector3();

export class SimulatorScene {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private orbitControls!: OrbitControls;
  private isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private isDestroyed: boolean = false;

  private carVisuals!: CarVisuals;
  private envData!: EnvironmentData;

  // Settings
  public settings: CarSettings;
  private onTelemetryUpdate?: (data: TelemetryData) => void;

  // Simulation state
  private inputAxisVertical: number = 0;
  private inputAxisHorizontal: number = 0;
  private currentSpeedMps: number = 0; // Linear speed in units/s
  private lateralVelocity: number = 0;
  private carYawRad: number = 0; // in radians
  private carPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Arcade physics extra state
  private engineRpm: number = 800; // 800 to 7500
  private currentGear: number = 1;
  private isDrifting: boolean = false;
  private driftScore: number = 0;
  private continuousDriftDuration: number = 0;
  private bestDriftScore: number = 0;
  private totalBankedDriftScore: number = 0;
  private collisionAlertTimer: number = 0;
  private driftBankTimer: number = 0;

  // Timing & Telemetry
  private clock: THREE.Clock = new THREE.Clock();
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private lapStartTime: number = 0;
  private currentLapTime: number = 0;
  private bestLapTime: number | null = null;
  private speedTrapRecord: number = 0;

  // Inputs
  public inputs: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
  };

  constructor(
    container: HTMLDivElement,
    settings: CarSettings,
    onTelemetryUpdate?: (data: TelemetryData) => void
  ) {
    this.container = container;
    this.settings = { ...settings };
    this.onTelemetryUpdate = onTelemetryUpdate;

    this.init();
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep slate twilight
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0075);

    // Studio Environment Map via PMREMGenerator & RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 500);
    this.camera.position.set(0, 5, -12);

    // Orbit controls for free view mode
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't dip below ground
    this.orbitControls.enabled = false;

    // 4. Lighting Rig (3-Point Studio Rig)
    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(40, 60, 40);
    keyLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 150;
      const d = 50;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cool Sky & Ground Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Rim Fill Light
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.8);
    rimLight.position.set(-30, 20, -40);
    this.scene.add(rimLight);

    // 5. Build Environment
    this.envData = buildEnvironment(this.settings.trackType);
    this.scene.add(this.envData.root);

    // 6. Build Car Model
    this.carVisuals = createCarModel(this.settings.carColor);
    this.carVisuals.setGizmosVisible(this.settings.showGizmos);
    this.carVisuals.setColliderVisible(this.settings.showColliders);
    this.scene.add(this.carVisuals.group);

    // Reset car position
    this.resetCar();

    // Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // Start loop
    this.clock.start();
    this.lapStartTime = performance.now();
    this.tick();
  }

  private onWindowResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public updateSettings(newSettings: Partial<CarSettings>) {
    const oldTrack = this.settings.trackType;
    this.settings = { ...this.settings, ...newSettings };

    if (newSettings.carColor) {
      this.carVisuals.setColor(newSettings.carColor);
    }
    if (newSettings.showGizmos !== undefined) {
      this.carVisuals.setGizmosVisible(newSettings.showGizmos);
    }
    if (newSettings.showColliders !== undefined) {
      this.carVisuals.setColliderVisible(newSettings.showColliders);
    }
    if (newSettings.soundEnabled !== undefined) {
      soundEngine.setMuted(!newSettings.soundEnabled);
    }

    if (newSettings.trackType && newSettings.trackType !== oldTrack) {
      this.scene.remove(this.envData.root);
      this.envData = buildEnvironment(newSettings.trackType);
      this.scene.add(this.envData.root);
      this.resetCar();
    }
  }

  public resetCar() {
    this.carPosition.set(0, 0, 0);
    this.carYawRad = 0;
    this.currentSpeedMps = 0;
    this.lateralVelocity = 0;
    this.inputAxisVertical = 0;
    this.inputAxisHorizontal = 0;
    this.engineRpm = 800;
    this.currentGear = 1;
    this.isDrifting = false;
    this.driftScore = 0;
    this.continuousDriftDuration = 0;
    this.collisionAlertTimer = 0;

    this.carVisuals.group.position.set(0, 0, 0);
    this.carVisuals.group.rotation.set(0, 0, 0);
    this.envData.resetObstacles();
  }

  public honk() {
    soundEngine.playHorn();
  }

  private updateSimulation(dt: number) {
    // 1. Simulate Unity Input.GetAxis("Vertical") and Input.GetAxis("Horizontal")
    // Target inputs from user keys
    let targetVertical = 0;
    if (this.inputs.forward) targetVertical += 1;
    if (this.inputs.backward) targetVertical -= 1;

    let targetHorizontal = 0;
    if (this.inputs.right) targetHorizontal += 1;
    if (this.inputs.left) targetHorizontal -= 1;

    // Apply Unity's Input Manager Gravity & Sensitivity
    const gravity = this.settings.inputGravity || 3.0;
    const sensitivity = this.settings.inputSensitivity || 3.0;

    // Vertical smoothing
    if (targetVertical !== 0) {
      this.inputAxisVertical = THREE.MathUtils.clamp(
        this.inputAxisVertical + Math.sign(targetVertical) * sensitivity * dt,
        -1,
        1
      );
      if (Math.sign(this.inputAxisVertical) !== Math.sign(targetVertical)) {
        this.inputAxisVertical = 0; // Quick snap on reversal
      }
    } else {
      if (Math.abs(this.inputAxisVertical) <= gravity * dt) {
        this.inputAxisVertical = 0;
      } else {
        this.inputAxisVertical -= Math.sign(this.inputAxisVertical) * gravity * dt;
      }
    }

    // Horizontal smoothing
    if (targetHorizontal !== 0) {
      this.inputAxisHorizontal = THREE.MathUtils.clamp(
        this.inputAxisHorizontal + Math.sign(targetHorizontal) * sensitivity * dt,
        -1,
        1
      );
    } else {
      if (Math.abs(this.inputAxisHorizontal) <= gravity * dt) {
        this.inputAxisHorizontal = 0;
      } else {
        this.inputAxisHorizontal -= Math.sign(this.inputAxisHorizontal) * gravity * dt;
      }
    }

    // 2. Execute Vehicle Logic
    let moveDelta = 0;
    let turnDeltaRad = 0;

    if (this.settings.engineMode === 'direct_unity') {
      // EXACT UNITY C# CODE GIVEN IN USER PROMPT:
      // float move = Input.GetAxis("Vertical") * speed * Time.deltaTime;
      // float turn = Input.GetAxis("Horizontal") * turnSpeed * Time.deltaTime;
      // transform.Translate(0, 0, move);
      // transform.Rotate(0, turn, 0);

      // Note on Coordinate System:
      // In Unity (Left-handed), Z is forward.
      // In Three.js (Right-handed), our car model is oriented along +Z forward so transform.Translate(0, 0, move) works identically!
      const move = this.inputAxisVertical * this.settings.speed * dt;
      const turnDeg = this.inputAxisHorizontal * this.settings.turnSpeed * dt;
      const turn = THREE.MathUtils.degToRad(turnDeg);

      moveDelta = move;
      turnDeltaRad = turn;

      // In the exact Unity script, turning happens whether moving or not:
      this.carYawRad += turnDeltaRad;

      // transform.Translate(0, 0, move) translates along local forward:
      _vec3Forward.set(Math.sin(this.carYawRad), 0, Math.cos(this.carYawRad));
      this.carPosition.addScaledVector(_vec3Forward, moveDelta);

      this.currentSpeedMps = this.inputAxisVertical * this.settings.speed;
      const speedRatio = THREE.MathUtils.clamp(Math.abs(this.currentSpeedMps) / Math.max(1, this.settings.speed), 0, 1);
      const isSharpTurn = Math.abs(this.inputAxisHorizontal) > 0.4 && speedRatio > 0.25;
      this.isDrifting = (this.inputs.handbrake || isSharpTurn) && Math.abs(this.currentSpeedMps) > 2.0;
    } else {
      // ARCADE PHYSICS MODE (Enhanced with acceleration curves, braking, drifting friction)
      const maxForwardSpeed = this.settings.speed;
      const maxReverseSpeed = maxForwardSpeed * this.settings.reverseRatio;

      let targetSpeed = 0;
      if (this.inputAxisVertical > 0) {
        targetSpeed = this.inputAxisVertical * maxForwardSpeed;
      } else if (this.inputAxisVertical < 0) {
        targetSpeed = this.inputAxisVertical * maxReverseSpeed;
      }

      // Acceleration / Braking curve
      const accelRate = this.inputAxisVertical !== 0 ? 18.0 : 8.0; // drag deceleration
      if (this.inputs.handbrake) {
        this.currentSpeedMps = THREE.MathUtils.damp(this.currentSpeedMps, 0, 15.0, dt);
      } else {
        this.currentSpeedMps = THREE.MathUtils.damp(this.currentSpeedMps, targetSpeed, accelRate, dt);
      }

      // Turn response depends on forward motion in realistic physics
      const speedRatio = THREE.MathUtils.clamp(Math.abs(this.currentSpeedMps) / Math.max(1, maxForwardSpeed), 0, 1);
      const steerPower = THREE.MathUtils.lerp(0.3, 1.0, speedRatio);
      const turnDirection = this.currentSpeedMps >= 0 ? 1 : -1;

      turnDeltaRad =
        THREE.MathUtils.degToRad(this.inputAxisHorizontal * this.settings.turnSpeed * dt) *
        steerPower *
        turnDirection;

      this.carYawRad += turnDeltaRad;

      // Lateral slip / Drifting
      const isSharpTurn = Math.abs(this.inputAxisHorizontal) > 0.5 && speedRatio > 0.35;
      this.isDrifting = (this.inputs.handbrake || isSharpTurn) && Math.abs(this.currentSpeedMps) > 2.0;

      const friction = this.isDrifting ? 3.0 : 14.0;
      this.lateralVelocity = THREE.MathUtils.damp(this.lateralVelocity, 0, friction, dt);

      _vec3Forward.set(Math.sin(this.carYawRad), 0, Math.cos(this.carYawRad));
      _vec3Right.set(Math.cos(this.carYawRad), 0, -Math.sin(this.carYawRad));

      moveDelta = this.currentSpeedMps * dt;
      this.carPosition.addScaledVector(_vec3Forward, moveDelta);
      this.carPosition.addScaledVector(_vec3Right, this.lateralVelocity * dt);
    }

    // Update car root mesh transform
    this.carVisuals.group.position.copy(this.carPosition);
    this.carVisuals.group.rotation.y = this.carYawRad;

    // Visual Wheel Steering & Roll
    const maxSteerAngle = THREE.MathUtils.degToRad(32);
    const steerAngle = this.inputAxisHorizontal * maxSteerAngle;
    const rollDelta = (moveDelta / 0.36); // roll angle = arc length / radius
    this.carVisuals.updateWheels(steerAngle, rollDelta);

    // Audio Engine Update & Gears
    const absSpeed = Math.abs(this.currentSpeedMps);
    const maxSpeed = Math.max(10, this.settings.speed);
    const normalizedSpeed = THREE.MathUtils.clamp(absSpeed / maxSpeed, 0, 1);

    // Realistic gear calculation (1 to 6)
    if (this.currentSpeedMps < -0.5) {
      this.currentGear = -1; // Reverse
    } else {
      this.currentGear = Math.min(6, Math.max(1, Math.floor(normalizedSpeed * 5.8) + 1));
    }

    // RPM sawtooth simulation across gears
    const gearRatio = ((normalizedSpeed * 6) % 1);
    this.engineRpm = 850 + (gearRatio * 0.75 + Math.abs(this.inputAxisVertical) * 0.25) * 6200;

    soundEngine.update(
      (this.engineRpm - 800) / 6700,
      this.inputAxisVertical,
      this.isDrifting,
      normalizedSpeed
    );

    // Skidmarks and Smoke
    if (this.isDrifting && normalizedSpeed > 0.2) {
      _skidLeft.copy(this.carPosition).addScaledVector(_vec3Right, -0.95);
      _skidRight.copy(this.carPosition).addScaledVector(_vec3Right, 0.95);
      this.envData.addSkidmark(_skidLeft, _skidRight, 0.6);
    }
    this.envData.updateParticles(dt, this.isDrifting, this.carPosition, _vec3Forward);

    // 3. Dynamic Obstacle Collisions
    let isColliding = false;
    const carRadius = 1.6;

    for (const obs of this.envData.obstacles) {
      _vec3A.copy(obs.mesh.position);
      const dist = _vec3A.distanceTo(this.carPosition);

      if (dist < carRadius + obs.radius) {
        isColliding = true;
        if (!obs.isHit) {
          obs.isHit = true;
          soundEngine.playCrash();

          // Apply knock impulse
          _vec3B.subVectors(obs.mesh.position, this.carPosition).normalize();
          const impactForce = Math.max(5, Math.abs(this.currentSpeedMps) * 1.2);
          obs.velocity.copy(_vec3B).multiplyScalar(impactForce);
          obs.velocity.y = 2.5 + Math.random() * 2.0;

          obs.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );
        }
      }

      // Physics integration for knocked obstacles
      if (obs.isHit) {
        obs.mesh.position.addScaledVector(obs.velocity, dt);
        obs.mesh.rotation.x += obs.angularVelocity.x * dt;
        obs.mesh.rotation.y += obs.angularVelocity.y * dt;
        obs.mesh.rotation.z += obs.angularVelocity.z * dt;

        // Gravity
        obs.velocity.y -= 9.8 * dt;

        // Ground rebound
        if (obs.mesh.position.y < (obs.type === 'cone' ? 0.35 : 0.45)) {
          obs.mesh.position.y = obs.type === 'cone' ? 0.35 : 0.45;
          obs.velocity.y *= -0.4;
          obs.velocity.x *= 0.85;
          obs.velocity.z *= 0.85;
          obs.angularVelocity.multiplyScalar(0.85);
        }
      }
    }

    // Boundary barrier collision
    if (Math.abs(this.carPosition.x) > 108 || Math.abs(this.carPosition.z) > 108) {
      isColliding = true;
    }

    // Drift Score: Accumulates points when isDrifting is true, RESETS upon a collision
    if (isColliding) {
      if (this.driftScore > 0) {
        this.collisionAlertTimer = 1.4; // Triggers collision reset visual badge
        this.driftScore = 0;
        this.continuousDriftDuration = 0;
      }
    } else {
      if (this.collisionAlertTimer > 0) {
        this.collisionAlertTimer -= dt;
      }

      const multiplier = Math.min(5.0, 1.0 + Math.floor(this.continuousDriftDuration * 1.2) * 0.5);

      if (this.isDrifting && Math.abs(this.currentSpeedMps) > 2.0) {
        this.continuousDriftDuration += dt;
        this.driftBankTimer = 1.0;
        // Points rate based on vehicle speed & multiplier
        const pointRate = (40 + Math.abs(this.currentSpeedMps) * 20) * multiplier;
        this.driftScore += pointRate * dt;

        if (this.driftScore > this.bestDriftScore) {
          this.bestDriftScore = Math.round(this.driftScore);
        }
      } else if (this.driftScore > 0) {
        // Drift ended safely: bank points after 1s
        this.driftBankTimer -= dt;
        if (this.driftBankTimer <= 0) {
          this.totalBankedDriftScore += Math.round(this.driftScore);
          if (this.driftScore > this.bestDriftScore) {
            this.bestDriftScore = Math.round(this.driftScore);
          }
          this.driftScore = 0;
          this.continuousDriftDuration = 0;
        }
      }
    }

    // 4. Radar Speed Trap Detection
    const speedTrapZ = this.envData.speedTrap.position.z;
    const prevZ = this.carPosition.z - moveDelta;
    if ((prevZ < speedTrapZ && this.carPosition.z >= speedTrapZ) || (prevZ > speedTrapZ && this.carPosition.z <= speedTrapZ)) {
      if (Math.abs(this.carPosition.x) < this.envData.speedTrap.width / 2) {
        const speedKmh = Math.abs(this.currentSpeedMps) * 3.6;
        if (speedKmh > this.speedTrapRecord) {
          this.speedTrapRecord = Math.round(speedKmh * 10) / 10;
        }

        // Flash & update LED Board texture
        const trap = this.envData.speedTrap;
        if (trap.canvas && trap.texture) {
          const ctx = trap.canvas.getContext('2d')!;
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, 512, 128);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, 504, 120);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 34px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SPEED TRAP RECORD', 256, 42);
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 54px monospace';
          ctx.fillText(`${speedKmh.toFixed(1)} KM/H`, 256, 102);
          trap.texture.needsUpdate = true;
        }
        soundEngine.playCheckpoint();
      }
    }

    // 5. Checkpoints & Lap Timing for Neon Circuit
    if (this.settings.trackType === 'neon_circuit') {
      const now = performance.now();
      this.currentLapTime = (now - this.lapStartTime) / 1000;

      for (const cp of this.envData.checkpoints) {
        if (!cp.isPassed && this.carPosition.distanceTo(cp.position) < cp.radius) {
          cp.isPassed = true;
          soundEngine.playCheckpoint();

          // Check if completed full circuit
          const allPassed = this.envData.checkpoints.every((c) => c.isPassed);
          if (allPassed) {
            if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
              this.bestLapTime = this.currentLapTime;
            }
            this.lapStartTime = performance.now();
            this.envData.checkpoints.forEach((c) => (c.isPassed = false));
          }
        }
      }
    }

    // 6. Camera Rig Updating
    this.updateCamera(dt);

    // 7. Telemetry Dispatch
    const speedKmh = Math.abs(this.currentSpeedMps) * 3.6;
    const speedMph = speedKmh * 0.621371;

    let gearStr = '1';
    if (this.currentGear === -1) gearStr = 'R';
    else if (Math.abs(this.currentSpeedMps) < 0.1 && this.inputAxisVertical === 0) gearStr = 'N';
    else gearStr = String(this.currentGear);

    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        speedMps: this.currentSpeedMps,
        speedKmh: Math.round(speedKmh * 10) / 10,
        speedMph: Math.round(speedMph * 10) / 10,
        rpm: Math.round(this.engineRpm),
        gear: gearStr,
        verticalInput: Math.round(this.inputAxisVertical * 100) / 100,
        horizontalInput: Math.round(this.inputAxisHorizontal * 100) / 100,
        deltaTime: Math.round(dt * 1000) / 1000,
        fps: this.currentFps,
        position: {
          x: Math.round(this.carPosition.x * 10) / 10,
          y: Math.round(this.carPosition.y * 10) / 10,
          z: Math.round(this.carPosition.z * 10) / 10,
        },
        headingDeg: Math.round(THREE.MathUtils.radToDeg(this.carYawRad) % 360),
        lapTime: Math.round(this.currentLapTime * 100) / 100,
        bestLap: this.bestLapTime ? Math.round(this.bestLapTime * 100) / 100 : null,
        speedTrapRecord: this.speedTrapRecord,
        isColliding,
        isDrifting: this.isDrifting,
        driftScore: Math.round(this.driftScore),
        driftMultiplier: Math.min(5.0, 1.0 + Math.floor(this.continuousDriftDuration * 1.2) * 0.5),
        bestDriftScore: this.bestDriftScore,
        totalBankedDriftScore: this.totalBankedDriftScore,
        collisionAlert: this.collisionAlertTimer > 0,
      });
    }
  }

  private updateCamera(dt: number) {
    if (this.settings.cameraMode === 'orbit') {
      this.orbitControls.enabled = true;
      this.orbitControls.target.copy(this.carPosition).add(new THREE.Vector3(0, 0.8, 0));
      this.orbitControls.update();
      return;
    }

    this.orbitControls.enabled = false;

    if (this.settings.cameraMode === 'interior') {
      // REALISTIC CAR INTERIOR COCKPIT CAMERA
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();

      // Driver's eye position in left seat with subtle G-force head sway
      const swayLateral = -this.inputAxisHorizontal * 0.04;
      const swayPitch = -(this.inputAxisVertical) * 0.03;

      const driverLocalX = -0.38 + swayLateral;
      const driverLocalY = 1.02 + swayPitch;
      const driverLocalZ = -0.15;

      // Transform local driver position by car yaw
      const cosYaw = Math.cos(this.carYawRad);
      const sinYaw = Math.sin(this.carYawRad);

      const worldCamX = this.carPosition.x + (driverLocalX * cosYaw + driverLocalZ * sinYaw);
      const worldCamY = this.carPosition.y + driverLocalY;
      const worldCamZ = this.carPosition.z + (-driverLocalX * sinYaw + driverLocalZ * cosYaw);

      _targetCamPos.set(worldCamX, worldCamY, worldCamZ);

      // Target lookAt point looking forward through the windshield over the dashboard
      const lookDist = 18.0;
      const lookLocalX = -0.38 + swayLateral * 0.5;
      const lookLocalY = 0.98;
      const lookLocalZ = lookDist;

      const worldLookX = this.carPosition.x + (lookLocalX * cosYaw + lookLocalZ * sinYaw);
      const worldLookY = this.carPosition.y + lookLocalY;
      const worldLookZ = this.carPosition.z + (-lookLocalX * sinYaw + lookLocalZ * cosYaw);

      _targetLookAt.set(worldLookX, worldLookY, worldLookZ);

      // Direct responsive tracking inside cockpit
      this.camera.position.copy(_targetCamPos);
      this.camera.lookAt(_targetLookAt);
    } else {
      if (this.camera.fov !== 58) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }

      if (this.settings.cameraMode === 'chase') {
        // Smooth dynamic chase camera behind the car
        const camDistance = 8.5;
        const camHeight = 3.6;

        const backX = this.carPosition.x - Math.sin(this.carYawRad) * camDistance;
        const backZ = this.carPosition.z - Math.cos(this.carYawRad) * camDistance;

        _targetCamPos.set(backX, this.carPosition.y + camHeight, backZ);
        _targetLookAt.set(
          this.carPosition.x + Math.sin(this.carYawRad) * 4.0,
          this.carPosition.y + 0.8,
          this.carPosition.z + Math.cos(this.carYawRad) * 4.0
        );

        // Frame-rate independent exponential damping
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _targetCamPos.x, 8.0, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _targetCamPos.y, 8.0, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _targetCamPos.z, 8.0, dt);

        this.camera.lookAt(_targetLookAt);
      } else if (this.settings.cameraMode === 'hood') {
        // Cockpit / Hood View
        _targetCamPos.set(
          this.carPosition.x + Math.sin(this.carYawRad) * 0.4,
          this.carPosition.y + 1.1,
          this.carPosition.z + Math.cos(this.carYawRad) * 0.4
        );
        _targetLookAt.set(
          this.carPosition.x + Math.sin(this.carYawRad) * 20.0,
          this.carPosition.y + 1.0,
          this.carPosition.z + Math.cos(this.carYawRad) * 20.0
        );

        this.camera.position.copy(_targetCamPos);
        this.camera.lookAt(_targetLookAt);
      } else if (this.settings.cameraMode === 'topdown') {
        // Top-Down Arcade View
        _targetCamPos.set(this.carPosition.x, this.carPosition.y + 28.0, this.carPosition.z - 4.0);
        _targetLookAt.copy(this.carPosition);

        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _targetCamPos.x, 10.0, dt);
        this.camera.position.y = _targetCamPos.y;
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _targetCamPos.z, 10.0, dt);

        this.camera.lookAt(_targetLookAt);
      }
    }
  }

  private tick = () => {
    if (this.isDestroyed) return;

    let dt = this.clock.getDelta();
    // Clamp dt to avoid big jump spikes on tab switch
    if (dt > 0.1) dt = 0.1;

    // FPS calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.updateSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    // Software WebGL pacing as per Three.js skill
    if (this.isSoftwareGl) {
      this.afterDrawSoftware(() => {
        if (!this.isDestroyed) this.animFrameId = window.setTimeout(this.tick, 50);
      });
    } else {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDrawSoftware(cb: () => void) {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          cb();
        }
      };
      window.setTimeout(poll, 5);
    } catch {
      cb();
    }
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    soundEngine.dispose();
    this.orbitControls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
