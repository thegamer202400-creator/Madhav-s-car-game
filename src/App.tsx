/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulatorScene } from './scene/SimulatorScene';
import { CarSettings, InputState, TelemetryData, CameraMode } from './types/simulator';
import { CockpitHUD } from './components/CockpitHUD';
import { BottomDock } from './components/BottomDock';
import { soundEngine } from './audio/engineAudio';

const defaultSettings: CarSettings = {
  speed: 100.0,
  turnSpeed: 100.0,
  engineMode: 'direct_unity',
  inputGravity: 3.0,
  inputSensitivity: 3.0,
  reverseRatio: 0.5,
  carColor: '#ef4444',
  showGizmos: true,
  showColliders: false,
  soundEnabled: true,
  cameraMode: 'chase',
  trackType: 'proving_grounds',
  driftMultiplier: 1.0,
};

const defaultTelemetry: TelemetryData = {
  speedMps: 0,
  speedKmh: 0,
  speedMph: 0,
  rpm: 800,
  gear: 'N',
  verticalInput: 0,
  horizontalInput: 0,
  deltaTime: 0.016,
  fps: 60,
  position: { x: 0, y: 0, z: 0 },
  headingDeg: 0,
  lapTime: 0,
  bestLap: null,
  speedTrapRecord: 0,
  isColliding: false,
  isDrifting: false,
  driftScore: 0,
  driftMultiplier: 1.0,
  bestDriftScore: 0,
  totalBankedDriftScore: 0,
  collisionAlert: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<SimulatorScene | null>(null);

  const [settings, setSettings] = useState<CarSettings>(defaultSettings);
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [inputs, setInputs] = useState<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
  });

  // Keep a ref of inputs for direct keyboard handler sync
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  // Mount Three.js Simulator once
  useEffect(() => {
    if (!mountRef.current) return;

    const sim = new SimulatorScene(
      mountRef.current,
      defaultSettings,
      (newTelemetry) => {
        setTelemetry(newTelemetry);
      }
    );
    simRef.current = sim;

    return () => {
      sim.dispose();
      simRef.current = null;
    };
  }, []);

  // Update simulation settings when React state changes
  const handleUpdateSettings = useCallback((newSettings: Partial<CarSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (simRef.current) {
        simRef.current.updateSettings(newSettings);
      }
      return updated;
    });
  }, []);

  const handleResetCar = useCallback(() => {
    if (simRef.current) {
      simRef.current.resetCar();
    }
  }, []);

  const handleToggleSound = useCallback(() => {
    handleUpdateSettings({ soundEnabled: !settings.soundEnabled });
  }, [handleUpdateSettings, settings.soundEnabled]);

  const handleCycleCamera = useCallback(() => {
    const modes: CameraMode[] = ['chase', 'interior', 'hood', 'topdown', 'orbit'];
    const currentIdx = modes.indexOf(settings.cameraMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    handleUpdateSettings({ cameraMode: nextMode });
  }, [handleUpdateSettings, settings.cameraMode]);

  const handleHonk = useCallback(() => {
    soundEngine.init();
    if (simRef.current) {
      simRef.current.honk();
    }
  }, []);

  const handleInputPress = useCallback((key: keyof InputState, active: boolean) => {
    soundEngine.init();
    setInputs((prev) => {
      const next = { ...prev, [key]: active };
      if (simRef.current) {
        simRef.current.inputs[key] = active;
      }
      return next;
    });
  }, []);

  // Keyboard Event Listeners (WASD + Arrows + Space + H + R + C + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      let changed = false;
      const current = { ...inputsRef.current };

      if (key === 'w' || key === 'arrowup') {
        if (!current.forward) {
          current.forward = true;
          changed = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (!current.backward) {
          current.backward = true;
          changed = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (!current.left) {
          current.left = true;
          changed = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (!current.right) {
          current.right = true;
          changed = true;
        }
      } else if (key === ' ' || key === 'spacebar') {
        if (!current.handbrake) {
          current.handbrake = true;
          changed = true;
        }
      } else if (key === 'r') {
        handleResetCar();
      } else if (key === 'c') {
        handleCycleCamera();
      } else if (key === 'h') {
        handleHonk();
      } else if (key === 'm') {
        handleToggleSound();
      }

      if (changed) {
        setInputs(current);
        if (simRef.current) {
          simRef.current.inputs = current;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let changed = false;
      const current = { ...inputsRef.current };

      if (key === 'w' || key === 'arrowup') {
        if (current.forward) {
          current.forward = false;
          changed = true;
        }
      } else if (key === 's' || key === 'arrowdown') {
        if (current.backward) {
          current.backward = false;
          changed = true;
        }
      } else if (key === 'a' || key === 'arrowleft') {
        if (current.left) {
          current.left = false;
          changed = true;
        }
      } else if (key === 'd' || key === 'arrowright') {
        if (current.right) {
          current.right = false;
          changed = true;
        }
      } else if (key === ' ' || key === 'spacebar') {
        if (current.handbrake) {
          current.handbrake = false;
          changed = true;
        }
      }

      if (changed) {
        setInputs(current);
        if (simRef.current) {
          simRef.current.inputs = current;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleCycleCamera, handleHonk, handleResetCar, handleToggleSound]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans"
      onPointerDown={() => soundEngine.init()}
    >
      {/* 3D WebGL Canvas Container: Isolated in its own div to avoid re-renders */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Cockpit HUD & Telemetry Overlay */}
      <CockpitHUD
        telemetry={telemetry}
        inputs={inputs}
        cameraMode={settings.cameraMode}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleToggleSound}
        onResetCar={handleResetCar}
        onCycleCamera={handleCycleCamera}
        onHonk={handleHonk}
        onInputPress={handleInputPress}
      />

      {/* Collapsible Unified Bottom Control Dock */}
      <BottomDock
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetCar={handleResetCar}
      />
    </div>
  );
}
