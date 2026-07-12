import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Globe, Target, ShieldCheck, Loader2, ServerCrash } from 'lucide-react';

const GlobalDashboard = () => {
  // --- REAL-TIME DATABASE STATE ---
  const [stats, setStats] = useState({
    totalScans: 0,
    cratersMapped: 0,
    waterVolumeEst: "0 m³",
    highValueMinerals: "0 Sectors"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Fetch live data from SQLite Database on mount
  useEffect(() => {
    const fetchMissionTelemetry = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/mission-stats');
        if (!response.ok) throw new Error("Server disconnected");
        const data = await response.json();
        
        setStats(data);
        setIsError(false);
      } catch (error) {
        console.error("Database uplink failed:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissionTelemetry();
  }, []);

  return (
    <div className="absolute inset-0 p-10 pt-28 flex flex-col justify-between pointer-events-none h-full">
      
      {/* TOP SECTION: Mission Status & Quick Actions */}
      <div className="flex justify-between items-start pointer-events-auto">
         
         <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 max-w-md backdrop-blur-md bg-black/40">
           <div className="flex items-center gap-3 text-cyan-400 mb-3">
             <Globe className={isError ? "text-red-500" : "animate-pulse"} />
             <h2 className="tracking-[0.2em] font-bold text-xl">ORBITAL COMMAND</h2>
           </div>
           <p className="text-gray-300 font-mono text-sm mb-5 leading-relaxed">
             AstroMine network online. Monitoring lunar surface anomalies and historical GIS database records.
           </p>
           
           {isError ? (
             <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold tracking-widest bg-red-500/10 px-3 py-1.5 rounded-full inline-flex border border-red-500/20">
               <ServerCrash size={16} /> DATABASE UPLINK LOST
             </div>
           ) : (
             <div className="flex items-center gap-2 text-green-400 font-mono text-xs font-bold tracking-widest bg-green-500/10 px-3 py-1.5 rounded-full inline-flex border border-green-500/20">
               <ShieldCheck size={16} /> ALL SYSTEMS NOMINAL
             </div>
           )}
         </div>

         {/* Navigation to Page 2 */}
         <Link 
            to="/batch-analyzer" 
            className="glass-panel px-8 py-5 rounded-xl border border-orange-500/50 hover:bg-orange-500/20 hover:scale-105 transition-all text-orange-400 font-bold tracking-widest flex items-center gap-3 shadow-[0_0_25px_rgba(249,115,22,0.2)] bg-black/50"
         >
           <Target size={24} className="animate-pulse" />
           INITIATE BATCH SCAN
         </Link>
      </div>

      {/* BOTTOM SECTION: Historical Database Stats */}
      <div className="pointer-events-auto mb-4">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-cyan-500/80 font-mono text-sm tracking-[0.2em] flex items-center gap-2 font-bold">
            <Database size={16} /> ARCHIVED MISSION TELEMETRY
          </h3>
          {isLoading && <Loader2 size={14} className="text-cyan-500 animate-spin" />}
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          {/* Stat Card 1 */}
          <div className="glass-panel p-6 rounded-xl border border-cyan-500/20 flex flex-col gap-3 hover:border-cyan-400/50 transition-colors bg-black/40 backdrop-blur-md">
            <span className="text-cyan-600 font-mono text-xs font-bold tracking-widest">TOTAL ORBITAL SCANS</span>
            <span className="text-4xl font-extrabold text-white">{isLoading ? "--" : stats.totalScans}</span>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: stats.totalScans > 0 ? '70%' : '0%' }}></div>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="glass-panel p-6 rounded-xl border border-orange-500/20 flex flex-col gap-3 hover:border-orange-400/50 transition-colors bg-black/40 backdrop-blur-md">
            <span className="text-orange-600 font-mono text-xs font-bold tracking-widest">HAZARDS MAPPED</span>
            <span className="text-4xl font-extrabold text-white">{isLoading ? "--" : stats.cratersMapped}</span>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: stats.cratersMapped > 0 ? '85%' : '0%' }}></div>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="glass-panel p-6 rounded-xl border border-blue-500/20 flex flex-col gap-3 hover:border-blue-400/50 transition-colors bg-black/40 backdrop-blur-md">
            <span className="text-blue-600 font-mono text-xs font-bold tracking-widest">EST. H2O ICE VOLUME</span>
            <span className="text-4xl font-extrabold text-white">{isLoading ? "--" : stats.waterVolumeEst}</span>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: stats.totalScans > 0 ? '60%' : '0%' }}></div>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="glass-panel p-6 rounded-xl border border-purple-500/20 flex flex-col gap-3 hover:border-purple-400/50 transition-colors bg-black/40 backdrop-blur-md">
            <span className="text-purple-600 font-mono text-xs font-bold tracking-widest">MINERAL-RICH SECTORS</span>
            <span className="text-4xl font-extrabold text-white">{isLoading ? "--" : stats.highValueMinerals}</span>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: stats.totalScans > 0 ? '40%' : '0%' }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default GlobalDashboard;