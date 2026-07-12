import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MarsGlobe from './components/MarsGlobe';
import GlobalDashboard from './components/GlobalDashboard';
import BatchAnalyzer from './components/BatchAnalyzer';
import MissionPlanner from './components/MissionPlanner';
import ISRUOperations from './components/ISRUOperations';

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full bg-black text-white font-sans overflow-hidden flex flex-col">
        
        {/* Persistent Top Navigation Bar */}
        <nav className="h-16 border-b border-cyan-900/50 bg-black/80 backdrop-blur-md z-50 flex items-center justify-between px-8 absolute top-0 w-full">
          <div className="font-extrabold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            ASTROMINE AI
          </div>
          <div className="flex gap-6 font-mono text-xs tracking-widest">
            <Link to="/" className="text-cyan-500 hover:text-white transition-colors">GLOBAL DASHBOARD</Link>
            <Link to="/batch-analyzer" className="text-cyan-500 hover:text-white transition-colors">BATCH ANALYZER</Link>
          </div>
        </nav>

        {/* The 3D Globe stays active across all pages */}
        <div className="absolute inset-0 z-0">
          <MarsGlobe activeMapLayer="none" />
        </div>

        {/* Page Content Rendering */}
        <div className="relative z-10 pt-16 h-full w-full pointer-events-none flex-1">
          <Routes>
            <Route path="/" element={<GlobalDashboard />} />
            <Route path="/batch-analyzer" element={<BatchAnalyzer />} />
            <Route path="/planner" element={<MissionPlanner />} />
            <Route path="/operations" element={<ISRUOperations />} /> {/* NEW ROUTE */}
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;