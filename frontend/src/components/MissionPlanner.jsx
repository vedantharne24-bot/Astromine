import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BatteryCharging, Zap, Gauge, Crosshair, BrainCircuit, Loader2, ShieldAlert } from 'lucide-react';

const MissionPlanner = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Interactive Mission Variables ---
  const [roverSpeed, setRoverSpeed] = useState(50); 
  const [powerRouting, setPowerRouting] = useState(50); 
  const [payloadBias, setPayloadBias] = useState(50); 

  // --- AI Commander State ---
  const [aiManifest, setAiManifest] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Fetch the latest mission data on load
  useEffect(() => {
    fetch('http://localhost:8000/api/missions/latest')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setTelemetry(data.telemetry);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load telemetry", err);
        setLoading(false);
      });
  }, []);

  // --- Dynamic Physics Engine (Calculates Outcomes in Real-Time) ---
  const baseSuccess = 95;
  const speedRisk = roverSpeed > 70 ? (roverSpeed - 70) * (telemetry?.hazards_count * 0.1 || 1) : 0;
  const successProbability = Math.max(10, Math.min(99, baseSuccess - speedRisk)).toFixed(1);

  const baseDurationSols = 14;
  const estDuration = (baseDurationSols * (100 / Math.max(10, roverSpeed)) + (powerRouting * 0.05)).toFixed(1);

  const waterYield = telemetry ? ((100 - payloadBias) * telemetry.water_pct * (powerRouting / 50)).toFixed(0) : 0;
  const mineralYield = telemetry ? (payloadBias * telemetry.mineral_pct * (powerRouting / 50)).toFixed(0) : 0;

  // --- Call the Python LLM Backend ---
  const requestAiManifest = async () => {
    if (!telemetry) return;
    setIsAiThinking(true);
    try {
      const response = await fetch('http://localhost:8000/api/plan/ai-manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry)
      });
      const data = await response.json();
      if (data.status === 'success') setAiManifest(data.manifest);
    } catch (error) {
      console.error("Comm link to AI failed", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Loading States
  if (loading) return <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center text-cyan-400 font-mono tracking-widest pointer-events-auto"><Loader2 className="animate-spin mr-3"/> LINKING TO ORBITAL DB...</div>;
  if (!telemetry) return <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center text-red-400 font-mono tracking-widest pointer-events-auto z-50">NO TELEMETRY FOUND. RUN BATCH SCAN FIRST.</div>;

  return (
    // FIX: pointer-events-auto applied to wrapper so clicks register
    <div className="absolute inset-0 bg-[#0a0a0f] text-white p-10 pt-24 overflow-y-auto custom-scrollbar font-sans pointer-events-auto z-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 relative z-20">
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/" className="glass-panel p-3 rounded-full hover:bg-cyan-500/20 text-cyan-500 transition-colors border border-cyan-500/30 relative z-50 pointer-events-auto cursor-pointer">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-[0.2em] text-cyan-400">ISRU LOGISTICS PLANNER</h1>
              <p className="text-gray-400 font-mono text-xs tracking-widest">MISSION ID: {telemetry.id} | {telemetry.date}</p>
            </div>
          </div>
        </div>

        {/* TOP ROW: Raw Telemetry & Dynamic Predictions */}
        <div className="grid grid-cols-3 gap-6">
          {/* Base Telemetry */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col gap-4">
            <h3 className="text-gray-500 font-mono text-xs tracking-widest border-b border-gray-800 pb-2">TARGET ZONE TELEMETRY</h3>
            <div className="flex justify-between items-center"><span className="text-gray-400">Traverse Vector</span><span className="font-mono text-cyan-300">{telemetry.distance_km} km</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Hazards Detected</span><span className="font-mono text-orange-400">{telemetry.hazards_count}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Water Density</span><span className="font-mono text-blue-400">{telemetry.water_pct}%</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Mineral Density</span><span className="font-mono text-purple-400">{telemetry.mineral_pct}%</span></div>
          </div>

          {/* Real-Time Prediction Output */}
          <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 col-span-2 grid grid-cols-3 gap-8 shadow-[inset_0_0_50px_rgba(6,182,212,0.05)]">
            <div className="flex flex-col justify-center items-center text-center">
              <span className="text-gray-500 font-mono text-xs tracking-widest mb-2">MISSION SUCCESS</span>
              <span className={`text-5xl font-light font-mono ${successProbability > 85 ? 'text-green-400' : successProbability > 50 ? 'text-orange-400' : 'text-red-500'}`}>
                {successProbability}%
              </span>
            </div>
            <div className="flex flex-col justify-center items-center text-center border-l border-r border-gray-800">
              <span className="text-gray-500 font-mono text-xs tracking-widest mb-2">EST. DURATION</span>
              <span className="text-5xl font-light font-mono text-cyan-100">{estDuration}</span>
              <span className="text-gray-500 font-mono text-[10px] mt-1">SOLS</span>
            </div>
            <div className="flex flex-col justify-center items-center text-center">
              <span className="text-gray-500 font-mono text-xs tracking-widest mb-2">PROJECTED YIELD</span>
              <span className="text-3xl font-light font-mono text-blue-400">{waterYield} <span className="text-xs text-gray-500">kg H2O</span></span>
              <span className="text-3xl font-light font-mono text-purple-400 mt-1">{mineralYield} <span className="text-xs text-gray-500">kg MIN</span></span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Controls & AI Manifest */}
        <div className="grid grid-cols-2 gap-6">
          
          {/* Interactive Parameters */}
          <div className="glass-panel p-8 rounded-2xl border border-gray-800 flex flex-col gap-8">
            <h3 className="text-cyan-400 font-mono text-sm tracking-widest border-b border-cyan-500/30 pb-2 flex items-center gap-2"><Gauge size={16}/> OPERATIONAL PARAMETERS</h3>
            
            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-400 mb-3">
                <span>SAFE / SLOW</span><span>ROVER SPEED</span><span className="text-orange-400">RAPID / RISKY</span>
              </div>
              <input 
                type="range" min="10" max="100" value={roverSpeed} 
                onChange={(e) => setRoverSpeed(Number(e.target.value))} 
                className="w-full accent-cyan-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer relative z-50 pointer-events-auto" 
              />
            </div>

            {/* Power Routing Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Zap size={12}/> MOBILITY</span><span>POWER ROUTING</span><span className="flex items-center gap-1">DRILLING <Crosshair size={12}/></span>
              </div>
              <input 
                type="range" min="0" max="100" value={powerRouting} 
                onChange={(e) => setPowerRouting(Number(e.target.value))} 
                className="w-full accent-cyan-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer relative z-50 pointer-events-auto" 
              />
            </div>

            {/* Payload Bias Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-gray-400 mb-3">
                <span className="text-blue-400 text-shadow">H2O TANKS</span><span>PAYLOAD ALLOCATION</span><span className="text-purple-400">MINERAL DRILLS</span>
              </div>
              <input 
                type="range" min="0" max="100" value={payloadBias} 
                onChange={(e) => setPayloadBias(Number(e.target.value))} 
                className="w-full accent-cyan-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer relative z-50 pointer-events-auto" 
              />
            </div>
          </div>

          {/* The AI Commander Panel */}
          <div className="glass-panel p-8 rounded-2xl border border-gray-800 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-transparent pointer-events-none z-0"></div>
            <h3 className="text-cyan-400 font-mono text-sm tracking-widest border-b border-cyan-500/30 pb-2 mb-6 flex items-center gap-2 relative z-10"><BrainCircuit size={16}/> GENERATIVE AI COMMANDER</h3>
            
            {!aiManifest ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-20 gap-4">
                <p className="text-gray-400 text-sm max-w-sm">Deploy the AI to analyze the topography and generate a tactical hardware manifest.</p>
                <button 
                  onClick={requestAiManifest} disabled={isAiThinking}
                  className="px-8 py-4 rounded-xl border border-cyan-500 text-cyan-300 font-bold tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 relative z-50 pointer-events-auto cursor-pointer"
                >
                  {isAiThinking ? <><Loader2 size={18} className="animate-spin" /> ANALYZING...</> : <><BrainCircuit size={18} /> GENERATE MANIFEST</>}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 relative z-20 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
                    <span className="text-gray-500 font-mono text-[10px] tracking-widest block mb-1">CHASSIS REC</span>
                    <span className="text-cyan-100 text-sm">{aiManifest.chassis_recommendation}</span>
                  </div>
                  <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
                    <span className="text-gray-500 font-mono text-[10px] tracking-widest block mb-1">POWER SYSTEM</span>
                    <span className="text-cyan-100 text-sm">{aiManifest.power_system}</span>
                  </div>
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-gray-800 flex-1">
                  <span className="text-gray-500 font-mono text-[10px] tracking-widest block mb-2">REQUIRED PAYLOAD</span>
                  <ul className="list-disc pl-5 text-cyan-50 text-sm space-y-1">
                    {aiManifest.primary_payload.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
                  <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p>{aiManifest.risk_assessment}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- COMMENCE OPERATIONS LINK --- */}
        <div className="mt-4 flex justify-end">
          <Link 
            to="/operations" 
            className="px-12 py-5 rounded-xl border border-green-500/50 bg-green-500/10 text-green-400 font-bold tracking-[0.2em] hover:bg-green-500/20 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(74,222,128,0.15)] relative z-50 pointer-events-auto cursor-pointer"
          >
            <Zap size={20} /> COMMENCE ISRU DRILLING OPERATIONS
          </Link>
        </div>

      </div>
    </div>
  );
};

export default MissionPlanner;