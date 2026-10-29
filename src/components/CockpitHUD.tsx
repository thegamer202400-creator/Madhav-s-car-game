import React from 'react';
import { TelemetryData, InputState, CameraMode } from '../types/simulator';
import { Camera, RotateCcw, Volume2, VolumeX, Gauge, Zap, Compass, Flag, Flame, Trophy, AlertTriangle } from 'lucide-react';

interface CockpitHUDProps {
  telemetry: TelemetryData;
  inputs: InputState;
  cameraMode: CameraMode;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetCar: () => void;
  onCycleCamera: () => void;
  onHonk: () => void;
  onInputPress: (key: keyof InputState, active: boolean) => void;
}

export const CockpitHUD: React.FC<CockpitHUDProps> = ({
  telemetry,
  inputs,
  cameraMode,
  soundEnabled,
  onToggleSound,
  onResetCar,
  onCycleCamera,
  onHonk,
  onInputPress,
}) => {
  const maxSpeedKmh = 360;
  const speedPercent = Math.min(100, (telemetry.speedKmh / maxSpeedKmh) * 100);
  const rpmPercent = Math.min(100, (telemetry.rpm / 8000) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-white font-sans">
      {/* Top Header: Unity Info Badge & Records */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2.5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-zinc-900/90 px-3.5 py-2 border border-zinc-800 shadow-xl backdrop-blur-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-100">
            CarController.cs
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Δt {telemetry.deltaTime.toFixed(3)}s • {telemetry.fps} FPS
          </span>
        </div>

        {telemetry.bestDriftScore > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-orange-950/85 px-3 py-1.5 border border-orange-600/60 text-orange-300 text-xs font-mono shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            <span>BEST DRIFT: {telemetry.bestDriftScore.toLocaleString()} PTS</span>
          </div>
        )}

        {telemetry.speedTrapRecord > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-950/80 px-3 py-1.5 border border-amber-600/50 text-amber-300 text-xs font-mono shadow-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>RADAR TRAP: {telemetry.speedTrapRecord.toFixed(1)} km/h</span>
          </div>
        )}

        {telemetry.lapTime > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-cyan-950/80 px-3 py-1.5 border border-cyan-600/50 text-cyan-300 text-xs font-mono shadow-lg">
            <Flag className="w-3.5 h-3.5 text-cyan-400" />
            <span>LAP: {telemetry.lapTime.toFixed(1)}s {telemetry.bestLap ? `(Best: ${telemetry.bestLap.toFixed(1)}s)` : ''}</span>
          </div>
        )}
      </div>

      {/* Center-Top Arcade Drift Score Display */}
      {telemetry.driftScore > 0 && !telemetry.collisionAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-subtle pointer-events-none z-20">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-950/95 via-amber-950/95 to-rose-950/95 border-2 border-orange-500 shadow-2xl shadow-orange-500/30">
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono font-black tracking-widest text-orange-300 uppercase">
                DRIFT SCORE
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight drop-shadow-md">
                  +{telemetry.driftScore.toLocaleString()}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/60">
                  x{telemetry.driftMultiplier.toFixed(1)}
                </span>
              </div>
            </div>
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono font-semibold text-orange-300/80 mt-1 bg-black/60 px-2 py-0.5 rounded-full">
            {telemetry.isDrifting ? 'HOLD DRIFT FOR COMBO • AVOID WALLS' : 'BANKING SCORE...'}
          </span>
        </div>
      )}

      {/* Collision Alert: Drift Score Reset Notification */}
      {telemetry.collisionAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-950/95 border-2 border-red-500 text-red-200 shadow-2xl shadow-red-500/40 pointer-events-none z-20">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-black tracking-wider text-red-100 uppercase">
              DRIFT FAILED • COLLISION!
            </span>
            <span className="text-[11px] font-mono text-red-300">
              Drift Score Reset to 0 PTS
            </span>
          </div>
        </div>
      )}

      {/* Top Right Quick Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onHonk}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors shadow-md active:scale-95"
          title="Honk horn (Key: H)"
        >
          <span className="font-mono text-amber-400">H</span>
          <span>Horn</span>
        </button>

        <button
          onClick={onCycleCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors shadow-md active:scale-95"
          title="Cycle camera (Key: C)"
        >
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span className="uppercase text-[11px] font-mono">{cameraMode}</span>
        </button>

        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg border text-xs font-medium transition-colors shadow-md ${
            soundEnabled
              ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200 hover:bg-zinc-800'
              : 'bg-red-950/80 border-red-800 text-red-300 hover:bg-red-900'
          }`}
          title="Toggle audio (Key: M)"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>

        <button
          onClick={onResetCar}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors shadow-md active:scale-95"
          title="Reset car position (Key: R)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset (R)</span>
        </button>
      </div>

      {/* Center Left: Live Unity Input Matrix */}
      <div className="absolute left-4 top-20 flex flex-col gap-2 pointer-events-none">
        <div className="rounded-xl bg-zinc-900/85 p-3 border border-zinc-800 text-xs font-mono shadow-xl w-60">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
            <span className="font-semibold text-zinc-200 text-[11px] tracking-wide">UNITY INPUT AXES</span>
            <span className="text-[10px] text-zinc-500">Input.GetAxis()</span>
          </div>

          {/* Vertical Axis */}
          <div className="mb-2.5">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400">Vertical (W/S)</span>
              <span className={`font-bold ${telemetry.verticalInput > 0 ? 'text-emerald-400' : telemetry.verticalInput < 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                {telemetry.verticalInput >= 0 ? `+${telemetry.verticalInput.toFixed(2)}` : telemetry.verticalInput.toFixed(2)}
              </span>
            </div>
            <div className="h-2 rounded bg-zinc-800 overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-600" />
              {telemetry.verticalInput > 0 ? (
                <div
                  className="h-full bg-emerald-500 absolute left-1/2 transition-all duration-75"
                  style={{ width: `${(telemetry.verticalInput / 1) * 50}%` }}
                />
              ) : (
                <div
                  className="h-full bg-amber-500 absolute right-1/2 transition-all duration-75"
                  style={{ width: `${(Math.abs(telemetry.verticalInput) / 1) * 50}%` }}
                />
              )}
            </div>
          </div>

          {/* Horizontal Axis */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400">Horizontal (A/D)</span>
              <span className={`font-bold ${telemetry.horizontalInput > 0 ? 'text-sky-400' : telemetry.horizontalInput < 0 ? 'text-sky-400' : 'text-zinc-400'}`}>
                {telemetry.horizontalInput >= 0 ? `+${telemetry.horizontalInput.toFixed(2)}` : telemetry.horizontalInput.toFixed(2)}
              </span>
            </div>
            <div className="h-2 rounded bg-zinc-800 overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-600" />
              {telemetry.horizontalInput > 0 ? (
                <div
                  className="h-full bg-sky-500 absolute left-1/2 transition-all duration-75"
                  style={{ width: `${(telemetry.horizontalInput / 1) * 50}%` }}
                />
              ) : (
                <div
                  className="h-full bg-sky-500 absolute right-1/2 transition-all duration-75"
                  style={{ width: `${(Math.abs(telemetry.horizontalInput) / 1) * 50}%` }}
                />
              )}
            </div>
          </div>

          {/* Heading and Position */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-zinc-500" />
              {telemetry.headingDeg}° Y-Yaw
            </span>
            <span>
              Pos: ({telemetry.position.x}, {telemetry.position.z})
            </span>
          </div>
        </div>

        {/* Keyboard Visualizer */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-zinc-900/85 border border-zinc-800 w-36 shadow-lg">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
              inputs.forward
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 shadow-md'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            W
          </div>
          <div className="flex gap-1">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                inputs.left
                  ? 'bg-sky-600 border-sky-400 text-white shadow-sky-500/30 shadow-md'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              A
            </div>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                inputs.backward
                  ? 'bg-amber-600 border-amber-400 text-white shadow-amber-500/30 shadow-md'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              S
            </div>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                inputs.right
                  ? 'bg-sky-600 border-sky-400 text-white shadow-sky-500/30 shadow-md'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              D
            </div>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono mt-0.5">WASD or ARROWS</span>
        </div>
      </div>

      {/* Speedometer & Tachometer Cluster */}
      <div className="absolute right-4 bottom-24 flex flex-col items-end gap-2 pointer-events-none">
        <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 shadow-2xl backdrop-blur-none w-56 flex flex-col">
          {/* Speed Number */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-4xl font-extrabold font-mono text-zinc-50 tracking-tighter">
              {Math.abs(telemetry.speedKmh).toFixed(0)}
            </span>
            <div className="text-right">
              <span className="text-xs font-bold text-sky-400 font-mono block">KM/H</span>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {Math.abs(telemetry.speedMph).toFixed(0)} MPH
              </span>
            </div>
          </div>

          {/* Speed Bar */}
          <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-rose-500 transition-all duration-75"
              style={{ width: `${speedPercent}%` }}
            />
          </div>

          {/* Gear & RPM */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-mono uppercase">GEAR</span>
              <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-base text-amber-400">
                {telemetry.gear}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-zinc-300 font-bold block">
                {telemetry.rpm} <span className="text-[9px] text-zinc-500">RPM</span>
              </span>
              <div className="w-20 h-1.5 rounded bg-zinc-800 overflow-hidden mt-0.5">
                <div
                  className={`h-full ${rpmPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${rpmPercent}%` }}
                />
              </div>
            </div>
          </div>

          {telemetry.collisionAlert ? (
            <div className="mt-2 text-center py-1 rounded bg-red-950/80 border border-red-700 text-[10px] font-bold text-red-300 tracking-wider">
              💥 COLLISION! DRIFT RESET
            </div>
          ) : telemetry.isDrifting || telemetry.driftScore > 0 ? (
            <div className="mt-2 flex items-center justify-between px-2 py-1 rounded bg-gradient-to-r from-orange-950/90 to-amber-950/90 border border-orange-600/70 text-[10px] font-bold text-orange-300">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" />
                DRIFT
              </span>
              <span className="text-white font-mono">
                +{telemetry.driftScore.toLocaleString()} pts (x{telemetry.driftMultiplier.toFixed(1)})
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile / Touch Pedals & Steering (Only visible on small screens / mobile or pointer interaction) */}
      <div className="md:hidden absolute bottom-24 left-4 flex gap-2 pointer-events-auto">
        <button
          onPointerDown={() => onInputPress('left', true)}
          onPointerUp={() => onInputPress('left', false)}
          onPointerLeave={() => onInputPress('left', false)}
          className="w-14 h-14 rounded-xl bg-zinc-900/90 active:bg-sky-600 border border-zinc-700 text-lg font-bold flex items-center justify-center active:scale-95 shadow-xl"
        >
          ◀
        </button>
        <button
          onPointerDown={() => onInputPress('right', true)}
          onPointerUp={() => onInputPress('right', false)}
          onPointerLeave={() => onInputPress('right', false)}
          className="w-14 h-14 rounded-xl bg-zinc-900/90 active:bg-sky-600 border border-zinc-700 text-lg font-bold flex items-center justify-center active:scale-95 shadow-xl"
        >
          ▶
        </button>
      </div>

      <div className="md:hidden absolute bottom-24 right-4 flex gap-2 pointer-events-auto">
        <button
          onPointerDown={() => onInputPress('backward', true)}
          onPointerUp={() => onInputPress('backward', false)}
          onPointerLeave={() => onInputPress('backward', false)}
          className="w-14 h-14 rounded-xl bg-zinc-900/90 active:bg-amber-600 border border-zinc-700 text-xs font-bold flex flex-col items-center justify-center active:scale-95 shadow-xl"
        >
          <span>REV</span>
          <span>▼</span>
        </button>
        <button
          onPointerDown={() => onInputPress('forward', true)}
          onPointerUp={() => onInputPress('forward', false)}
          onPointerLeave={() => onInputPress('forward', false)}
          className="w-16 h-16 rounded-xl bg-emerald-600/90 active:bg-emerald-500 border border-emerald-400 text-sm font-bold flex flex-col items-center justify-center active:scale-95 shadow-xl text-white"
        >
          <span>GAS</span>
          <span>▲</span>
        </button>
      </div>
    </div>
  );
};
