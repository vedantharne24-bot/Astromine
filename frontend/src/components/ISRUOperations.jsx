import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, Thermometer, Battery, Zap, AlertTriangle, Settings, Power, Database } from 'lucide-react';

const ISRUOperations = () => {
  // --- Physics & Engineering State ---
  const [rpm, setRpm] = useState(0);
  const [thrust, setThrust] = useState(0);
  const [isDrilling, setIsDrilling] = useState(false);
  
  // --- Telemetry State ---
  const [depth, setDepth] = useState(0.0); // Meters
  const [temperature, setTemperature] = useState(-50); // Celsius
  const [yieldH2O, setYieldH2O] = useState(0); // kg
  const [battery, setBattery] = useState(100.0); // %
  const [overload, setOverload] = useState(false);

  // --- Dynamic Physics Engine Loop ---
  useEffect(() => {
    let tick;
    if (isDrilling || temperature > -50) {
      tick = setInterval(() => {
        setTemperature((prevTemp) => {
          let newTemp = prevTemp;
          
          if (isDrilling && !overload) {
            // Heat generation based on friction (RPM * Thrust)
            const heatGenerated = (rpm * thrust) * 0.00004;
            newTemp += heatGenerated;
          } else {
            // Ambient lunar cooling
            newTemp -= 1.5; 
          }

          // Thermal Overload Trigger at 150°C
          if (newTemp >= 150 && !overload) {
            setOverload(true);
            setIsDrilling(false);
            setRpm(0);
            setThrust(0);
          }
          
          // Reset overload when cooled down safely
          if (newTemp <= 50 && overload) {
            setOverload(false);
          }

          return Math.max(-50, newTemp); // Floor at lunar ambient (-50C)
        });

        if (isDrilling && !overload) {
          // Calculate Depth & Yield
          const diggingEfficiency = (rpm * thrust) * 0.000001;
          setDepth((prev) => Math.min(5.0, prev + diggingEfficiency));
          
          // Yield increases faster as you get deeper into the ice layer (past 2.0m)
          if (depth > 2.0) {
            setYieldH2O((prev) => prev + (diggingEfficiency * 850));
          }

          // Battery Drain based on mechanical load
          const powerDraw = (rpm * 0.02) + (thrust * 0.01);
          setBattery((prev) => Math.max(0, prev - (powerDraw * 0.005)));
        }
      }, 100); // Physics calculate 10 times a second
    }

    return () => clearInterval(tick);
  }, [isDrilling, rpm, thrust, depth, overload]);

  // Derived Diagnostics
  const powerConsumption = isDrilling ? ((rpm * 0.05) + (thrust * 0.02)).toFixed(1) : "0.0";
  const torque = isDrilling ? ((thrust * 0.8) + (depth * 10)).toFixed(0) : "0";

  return (
    // FIX 1: Added pointer-events-auto and z-10 to the main wrapper
    <div className="absolute inset-0 bg-[#0a0a0f] text-white p-10 pt-24 overflow-y-auto custom-scrollbar font-sans pointer-events-auto z-10">
      {/* FIX 2: Added relative z-20 to elevate content above any lingering overlays */}
      <div className="max-w-7xl mx-auto flex flex-col gap-8 relative z-20">
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* FIX 3: Elevated the back button */}
            <Link to="/planner" className="glass-panel p-3 rounded-full hover:bg-cyan-500/20 text-cyan-500 transition-colors border border-cyan-500/30 relative z-50 pointer-events-auto cursor-pointer">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-[0.2em] text-cyan-400 flex items-center gap-3">
                <Settings className={`text-gray-500 ${isDrilling ? 'animate-spin' : ''}`} /> ISRU OPERATIONS COMMAND
              </h1>
              <p className="text-gray-400 font-mono text-xs tracking-widest">DEEP CORE EXTRACTION & DIAGNOSTICS</p>
            </div>
          </div>
          
          <div className={`px-6 py-2 rounded-full border text-xs font-mono tracking-widest flex items-center gap-2 ${overload ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : isDrilling ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
            {overload ? <AlertTriangle size={14} /> : <Activity size={14} />}
            {overload ? "THERMAL OVERLOAD - COOLING..." : isDrilling ? "DRILL ACTIVE" : "SYSTEM STANDBY"}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: The Drill Simulator */}
          <div className="col-span-7 glass-panel p-8 rounded-2xl border border-gray-800 flex flex-col gap-8 relative overflow-hidden">
            {overload && <div className="absolute inset-0 bg-red-500/10 pointer-events-none z-10 animate-pulse border-2 border-red-500/50 rounded-2xl"></div>}
            
            <h3 className="text-cyan-400 font-mono text-sm tracking-widest border-b border-cyan-500/30 pb-2 flex items-center gap-2">
              <Database size={16}/> MECHANICAL OVERRIDES
            </h3>

            {/* Drill Controls */}
            <div className="grid grid-cols-2 gap-8 z-20">
              <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-4">
                  <span>ROTATION (RPM)</span>
                  <span className="text-cyan-400 font-bold">{rpm}</span>
                </div>
                {/* FIX 4: Made the RPM slider clickable */}
                <input 
                  type="range" min="0" max="500" value={rpm} 
                  disabled={overload}
                  onChange={(e) => {setRpm(Number(e.target.value)); if(e.target.value > 0) setIsDrilling(true);}} 
                  className="w-full accent-cyan-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30 relative z-50 pointer-events-auto" 
                />
              </div>

              <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-4">
                  <span>THRUST (NEWTONS)</span>
                  <span className="text-orange-400 font-bold">{thrust}</span>
                </div>
                {/* FIX 5: Made the Thrust slider clickable */}
                <input 
                  type="range" min="0" max="1000" value={thrust} 
                  disabled={overload}
                  onChange={(e) => {setThrust(Number(e.target.value)); if(e.target.value > 0) setIsDrilling(true);}} 
                  className="w-full accent-orange-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30 relative z-50 pointer-events-auto" 
                />
              </div>
            </div>

            {/* Visual Drill Representation */}
            <div className="flex-1 min-h-[250px] flex gap-8">
              {/* Soil Cross Section */}
              <div className="w-32 bg-gradient-to-b from-gray-800 via-[#2a1b15] to-[#112233] rounded-xl border border-gray-700 relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[8px] font-mono text-gray-400">REGOLITH</div>
                <div className="absolute top-1/2 left-2 text-[8px] font-mono text-blue-400">PERMAFROST</div>
                
                {/* The Moving Drill Bit */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 w-8 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b-md transition-all duration-100 flex flex-col items-center justify-end shadow-lg"
                  style={{ top: 0, height: `${(depth / 5.0) * 100}%` }}
                >
                  <div className={`w-full h-4 bg-gray-900 rounded-b-sm border-b-2 border-orange-500 ${isDrilling ? 'animate-pulse' : ''}`}></div>
                </div>
              </div>

              {/* Extraction Stats */}
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="bg-black/50 p-5 rounded-xl border border-gray-800 text-center">
                  <span className="text-gray-500 font-mono text-xs tracking-widest block mb-1">DEPTH REACHED</span>
                  <span className="text-4xl font-light font-mono text-white">{depth.toFixed(2)} <span className="text-sm text-gray-500">m</span></span>
                </div>
                <div className="bg-black/50 p-5 rounded-xl border border-gray-800 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/10"></div>
                  <span className="text-gray-500 font-mono text-xs tracking-widest block mb-1 relative z-10">EXTRACTED H2O YIELD</span>
                  <span className="text-4xl font-light font-mono text-blue-400 relative z-10">{yieldH2O.toFixed(1)} <span className="text-sm text-blue-800">kg</span></span>
                </div>
              </div>
            </div>
            
            {/* FIX 6: Made the emergency halt button clickable */}
            <button 
              onClick={() => { setIsDrilling(false); setRpm(0); setThrust(0); }}
              disabled={!isDrilling || overload}
              className="w-full py-4 rounded-xl border border-red-500/50 text-red-400 font-bold tracking-widest hover:bg-red-500/10 transition-all flex justify-center items-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent relative z-50 pointer-events-auto cursor-pointer"
            >
              <Power size={18} /> EMERGENCY HALT
            </button>
          </div>

          {/* RIGHT COLUMN: Engineering Diagnostics */}
          <div className="col-span-5 glass-panel p-8 rounded-2xl border border-gray-800 flex flex-col gap-8">
            <h3 className="text-cyan-400 font-mono text-sm tracking-widest border-b border-cyan-500/30 pb-2 flex items-center gap-2">
              <Activity size={16}/> LIVE TELEMETRY
            </h3>

            {/* Thermal Gauge */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 font-mono text-xs flex items-center gap-2"><Thermometer size={14}/> CORE TEMP</span>
                <span className={`font-mono text-xl ${temperature > 120 ? 'text-red-500' : temperature > 80 ? 'text-orange-400' : 'text-cyan-400'}`}>
                  {temperature.toFixed(1)}°C
                </span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div 
                  className={`h-full transition-all duration-300 ${temperature > 120 ? 'bg-red-500' : temperature > 80 ? 'bg-orange-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, ((temperature + 50) / 200) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Power Draw Gauge */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 font-mono text-xs flex items-center gap-2"><Zap size={14}/> POWER DRAW</span>
                <span className="font-mono text-xl text-yellow-400">{powerConsumption} kW</span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (powerConsumption / 45) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Torque Gauge */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 font-mono text-xs flex items-center gap-2"><Settings size={14}/> DRILL TORQUE</span>
                <span className="font-mono text-xl text-purple-400">{torque} N·m</span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (torque / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Battery Remaining (Large) */}
            <div className="mt-auto bg-[#111] p-6 rounded-xl border border-gray-800 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 font-mono text-xs flex items-center gap-2"><Battery size={16}/> BATTERY RESERVES</span>
                <span className={`font-mono text-3xl ${battery < 20 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                  {battery.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-6 bg-gray-900 rounded-md overflow-hidden border border-gray-800">
                <div 
                  className={`h-full transition-all duration-300 ${battery < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${battery}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ISRUOperations;