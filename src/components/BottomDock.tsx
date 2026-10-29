import React, { useState } from 'react';
import { CarSettings, EngineMode, CameraMode, TrackType } from '../types/simulator';
import { Sliders, Map, Eye, Code, ChevronDown, ChevronUp, Copy, Check, Play, Info } from 'lucide-react';

interface BottomDockProps {
  settings: CarSettings;
  onUpdateSettings: (newSettings: Partial<CarSettings>) => void;
  onResetCar: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  settings,
  onUpdateSettings,
  onResetCar,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'tracks' | 'visuals' | 'code'>('inspector');
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeVariant, setCodeVariant] = useState<'original' | 'rigidbody' | 'drift'>('original');

  const carColors = [
    { name: 'Ferrari Red', hex: '#ef4444' },
    { name: 'Electric Cyan', hex: '#06b6d4' },
    { name: 'Cyberpunk Yellow', hex: '#eab308' },
    { name: 'Stealth Black', hex: '#18181b' },
    { name: 'Acid Lime', hex: '#84cc16' },
    { name: 'Ultra Violet', hex: '#8b5cf6' },
  ];

  const originalCSharp = `using UnityEngine;

public class CarController : MonoBehaviour
{
    public float speed = ${settings.speed.toFixed(1)}f;
    public float turnSpeed = ${settings.turnSpeed.toFixed(1)}f;

    void Update()
    {
        float move = Input.GetAxis("Vertical") * speed * Time.deltaTime;
        float turn = Input.GetAxis("Horizontal") * turnSpeed * Time.deltaTime;

        transform.Translate(0, 0, move);
        transform.Rotate(0, turn, 0);
    }
}`;

  const rigidbodyCSharp = `using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class RigidbodyCarController : MonoBehaviour
{
    public float acceleration = ${settings.speed.toFixed(1)}f;
    public float turnSpeed = ${settings.turnSpeed.toFixed(1)}f;
    private Rigidbody rb;

    void Start()
    {
        rb = GetComponent<Rigidbody>();
        rb.centerOfMass = new Vector3(0, -0.5f, 0); // Lower center of mass
    }

    void FixedUpdate()
    {
        float move = Input.GetAxis("Vertical");
        float turn = Input.GetAxis("Horizontal");

        // Apply physical driving force
        rb.AddRelativeForce(Vector3.forward * move * acceleration * 50f);

        // Turn only when car has forward velocity
        float speedFactor = rb.linearVelocity.magnitude / 10f;
        transform.Rotate(0, turn * turnSpeed * Mathf.Clamp01(speedFactor) * Time.fixedDeltaTime, 0);
    }
}`;

  const driftCSharp = `using UnityEngine;

public class ArcadeDriftController : MonoBehaviour
{
    public float maxSpeed = ${settings.speed.toFixed(1)}f;
    public float turnSpeed = ${settings.turnSpeed.toFixed(1)}f;
    public float driftTireSlip = 0.85f;

    private float currentSpeed = 0f;

    void Update()
    {
        float v = Input.GetAxis("Vertical");
        float h = Input.GetAxis("Horizontal");

        currentSpeed = Mathf.Lerp(currentSpeed, v * maxSpeed, Time.deltaTime * 3f);
        transform.Translate(0, 0, currentSpeed * Time.deltaTime);

        if (Mathf.Abs(currentSpeed) > 0.5f)
        {
            transform.Rotate(0, h * turnSpeed * Time.deltaTime, 0);
        }
    }
}`;

  const activeCodeSnippet =
    codeVariant === 'original'
      ? originalCSharp
      : codeVariant === 'rigidbody'
      ? rigidbodyCSharp
      : driftCSharp;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-out"
      style={{
        bottom: isCollapsed ? '-280px' : '16px',
        width: 'min(960px, 95vw)',
      }}
    >
      {/* Collapse / Expand Toggle Button on top edge */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-zinc-900 border-t border-x border-zinc-700/80 text-xs font-mono font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg cursor-pointer select-none"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Inspector & Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>Hide Controls (Zen Mode)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl p-4 text-zinc-200">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'inspector'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>C# Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'tracks'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Arenas & Stunts</span>
            </button>

            <button
              onClick={() => setActiveTab('visuals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'visuals'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Camera & Paint</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>C# Code & Upgrades</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Unity 6 Engine Model</span>
          </div>
        </div>

        {/* Tab 1: C# Inspector */}
        {activeTab === 'inspector' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Column 1: Public float variables */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
                <span className="font-bold text-zinc-100">PUBLIC VARIABLES</span>
                <span className="text-[10px] text-sky-400">Inspector Fields</span>
              </div>

              {/* public float speed */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300">speed</span>
                  <span className="text-sky-400 font-bold">{settings.speed.toFixed(1)}f</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={settings.speed}
                  onChange={(e) => onUpdateSettings({ speed: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 rounded bg-zinc-700"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                  <span>10 (Slow)</span>
                  <span>100 (Default)</span>
                  <span>200 (Hypercar)</span>
                </div>
              </div>

              {/* public float turnSpeed */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300">turnSpeed</span>
                  <span className="text-sky-400 font-bold">{settings.turnSpeed.toFixed(1)}f</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="240"
                  step="5"
                  value={settings.turnSpeed}
                  onChange={(e) => onUpdateSettings({ turnSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 rounded bg-zinc-700"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                  <span>30 (Heavy)</span>
                  <span>100 (Default)</span>
                  <span>240 (Twitchy)</span>
                </div>
              </div>
            </div>

            {/* Column 2: Engine Mode & Kinematics */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
                  <span className="font-bold text-zinc-100">EXECUTION MODEL</span>
                  <span className="text-[10px] text-amber-400">Physics Engine</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => onUpdateSettings({ engineMode: 'direct_unity' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      settings.engineMode === 'direct_unity'
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px] mb-0.5">Direct C# Script</div>
                    <div className="text-[10px] text-zinc-400">Translate/Rotate as written</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ engineMode: 'arcade_physics' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      settings.engineMode === 'arcade_physics'
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px] mb-0.5">Arcade Physics</div>
                    <div className="text-[10px] text-zinc-400">Inertia, Drift, & Braking</div>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  {settings.engineMode === 'direct_unity'
                    ? 'Pure kinematic Translate & Rotate: the car can turn on the spot even at 0 speed.'
                    : 'Enhanced vehicle dynamics: turning responds to momentum, with lateral drift friction.'}
                </span>
              </div>
            </div>

            {/* Column 3: Unity Input Manager Settings */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
                <span className="font-bold text-zinc-100">INPUT MANAGER</span>
                <span className="text-[10px] text-emerald-400">Axis Smoothing</span>
              </div>

              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300">Sensitivity (Ramp-up)</span>
                  <span className="text-emerald-400 font-bold">{settings.inputSensitivity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={settings.inputSensitivity}
                  onChange={(e) => onUpdateSettings({ inputSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded bg-zinc-700"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300">Gravity (Fall-off)</span>
                  <span className="text-emerald-400 font-bold">{settings.inputGravity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={settings.inputGravity}
                  onChange={(e) => onUpdateSettings({ inputGravity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded bg-zinc-700"
                />
              </div>

              <div className="mt-2 text-right">
                <button
                  onClick={onResetCar}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] border border-zinc-700"
                >
                  Reset Position (R)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Arenas & Stunts */}
        {activeTab === 'tracks' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <button
              onClick={() => onUpdateSettings({ trackType: 'proving_grounds' })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.trackType === 'proving_grounds'
                  ? 'bg-sky-950/80 border-sky-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <div className="font-bold text-sm text-sky-400 mb-1">Proving Grounds</div>
              <div className="text-[11px] text-zinc-300 mb-2">
                Slalom cones, jump ramps, knockable crates & oil barrels, and speed radar trap.
              </div>
              <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700">
                Stunt & Sandbox
              </span>
            </button>

            <button
              onClick={() => onUpdateSettings({ trackType: 'neon_circuit' })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.trackType === 'neon_circuit'
                  ? 'bg-sky-950/80 border-sky-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <div className="font-bold text-sm text-emerald-400 mb-1">Grand Prix Circuit</div>
              <div className="text-[11px] text-zinc-300 mb-2">
                Asphalt circuit with glowing checkpoint gates, racing curbs, and automated lap timer.
              </div>
              <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700">
                Lap Time Trial
              </span>
            </button>

            <button
              onClick={() => onUpdateSettings({ trackType: 'open_testbed' })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.trackType === 'open_testbed'
                  ? 'bg-sky-950/80 border-sky-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <div className="font-bold text-sm text-amber-400 mb-1">Unity Dev Grid</div>
              <div className="text-[11px] text-zinc-300 mb-2">
                Infinite flat coordinate testbed with 25m distance markers and radar speed trap.
              </div>
              <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 border border-zinc-700">
                Calibration & Rulers
              </span>
            </button>
          </div>
        )}

        {/* Tab 3: Visuals & Camera */}
        {activeTab === 'visuals' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Camera Modes */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="pb-2 mb-2 border-b border-zinc-800 text-zinc-400 font-bold">
                CAMERA VIEW (Key: C)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['chase', 'interior', 'hood', 'topdown', 'orbit'] as CameraMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateSettings({ cameraMode: mode })}
                    className={`px-2 py-2 rounded-lg border text-center uppercase font-bold text-[10px] transition-all ${
                      settings.cameraMode === mode
                        ? 'bg-sky-600 border-sky-400 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mode === 'interior' ? 'Cockpit' : mode === 'orbit' ? 'Inspect' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Car Paint */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="pb-2 mb-2 border-b border-zinc-800 text-zinc-400 font-bold">
                CAR PAINT FINISH
              </div>
              <div className="grid grid-cols-3 gap-2">
                {carColors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => onUpdateSettings({ carColor: color.hex })}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left ${
                      settings.carColor === color.hex
                        ? 'border-white bg-zinc-800 text-white'
                        : 'border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-black/50 shadow-sm shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[10px] truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gizmos & Debugging */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="pb-2 mb-2 border-b border-zinc-800 text-zinc-400 font-bold">
                  UNITY GIZMOS & COLLIDERS
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showGizmos}
                      onChange={(e) => onUpdateSettings({ showGizmos: e.target.checked })}
                      className="rounded accent-sky-500 w-4 h-4"
                    />
                    <span>Show Coordinate Gizmo (Forward +Z)</span>
                  </label>

                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showColliders}
                      onChange={(e) => onUpdateSettings({ showColliders: e.target.checked })}
                      className="rounded accent-sky-500 w-4 h-4"
                    />
                    <span>Show Bounding Box Collider</span>
                  </label>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 mt-2">
                Blue = +Z (Forward), Green = +Y (Up), Red = +X (Right)
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: C# Code & Upgrades */}
        {activeTab === 'code' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Variant:</span>
                <button
                  onClick={() => setCodeVariant('original')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    codeVariant === 'original'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Your CarController.cs
                </button>
                <button
                  onClick={() => setCodeVariant('rigidbody')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    codeVariant === 'rigidbody'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Rigidbody AddForce
                </button>
                <button
                  onClick={() => setCodeVariant('drift')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    codeVariant === 'drift'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Arcade Drift Script
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs transition-all active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy C# Code'}</span>
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-300">
              <pre>
                <code>{activeCodeSnippet}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
