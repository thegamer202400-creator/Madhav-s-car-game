export type EngineMode = 'direct_unity' | 'arcade_physics';

export type CameraMode = 'chase' | 'interior' | 'hood' | 'topdown' | 'orbit';

export type TrackType = 'proving_grounds' | 'neon_circuit' | 'open_testbed';

export interface CarSettings {
  speed: number;
  turnSpeed: number;
  engineMode: EngineMode;
  inputGravity: number;
  inputSensitivity: number;
  reverseRatio: number;
  carColor: string;
  showGizmos: boolean;
  showColliders: boolean;
  soundEnabled: boolean;
  cameraMode: CameraMode;
  trackType: TrackType;
  driftMultiplier: number;
}

export interface TelemetryData {
  speedMps: number;
  speedKmh: number;
  speedMph: number;
  rpm: number;
  gear: string;
  verticalInput: number;
  horizontalInput: number;
  deltaTime: number;
  fps: number;
  position: { x: number; y: number; z: number };
  headingDeg: number;
  lapTime: number;
  bestLap: number | null;
  speedTrapRecord: number;
  isColliding: boolean;
  isDrifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  bestDriftScore: number;
  totalBankedDriftScore: number;
  collisionAlert: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}
