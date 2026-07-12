import React, { useState, useRef, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, ShieldAlert, Droplets, Play, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, useTexture, Sphere, Ring } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ==========================================
// 1. WEBGL 3D ENGINE COMPONENTS
// ==========================================

// --- ULTIMATE SIMULATION: ROVER + ORBITAL GATEWAY SATELLITE ---
const RoverSimulation = ({ pathPoints, isDriving }) => {
  const { camera } = useThree();
  const roverRef = useRef();
  const headlightTarget = useRef(new THREE.Object3D()); 
  const satelliteRef = useRef();
  const satLightRef = useRef();
  const laserRef = useRef();
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    if (headlightTarget.current) {
      headlightTarget.current.position.set(0, 0, 1);
    }
  }, []);

  useFrame((state, delta) => {
    if (!pathPoints || pathPoints.length < 2) return;

    if (!isDriving) {
      setProgress(0);
      if (laserRef.current) laserRef.current.visible = false;
      return;
    }

    // 1. ROVER MOVEMENT (Ultra-Slow Crawl)
    const speed = 0.4; 
    let nextProgress = progress + speed * delta;

    if (nextProgress >= pathPoints.length - 1) {
      nextProgress = pathPoints.length - 1.01; 
    } else {
      setProgress(nextProgress);
    }

    const currentIndex = Math.floor(nextProgress);
    const nextIndex = Math.min(currentIndex + 1, pathPoints.length - 1);
    const t = nextProgress - currentIndex;

    const currentPos = pathPoints[currentIndex];
    const nextPos = pathPoints[nextIndex];

    const pos = new THREE.Vector3().lerpVectors(currentPos, nextPos, t);
    
    if (roverRef.current) {
      roverRef.current.position.copy(pos);
      roverRef.current.lookAt(nextPos); 
    }

    // 2. CHASE CAMERA
    if (isDriving && currentIndex < pathPoints.length - 2) {
      const dir = new THREE.Vector3().subVectors(nextPos, currentPos).normalize();
      const camPos = pos.clone().sub(dir.multiplyScalar(1.8)).add(new THREE.Vector3(0, 0.8, 0));
      camera.position.lerp(camPos, 0.1);
      
      const lookTarget = pos.clone().add(dir.multiplyScalar(1.0));
      camera.lookAt(lookTarget);
    }

    // 3. ORBITAL SATELLITE MECHANICS
    if (satelliteRef.current && satLightRef.current) {
      const elapsedTime = state.clock.getElapsedTime();
      // Satellite orbits in a massive circle above the map
      const satX = Math.cos(elapsedTime * 0.3) * 15;
      const satZ = Math.sin(elapsedTime * 0.3) * 15;
      const satY = 8;
      
      satelliteRef.current.position.set(satX, satY, satZ);

      // 4. TRANSMISSION WINDOW LOGIC
      const dist = new THREE.Vector2(satX, satZ).distanceTo(new THREE.Vector2(pos.x, pos.z));
      const uplinkActive = dist < 8.5 && isDriving;

      // Change satellite color based on connection status
      satelliteRef.current.material.color.set(uplinkActive ? "#4ade80" : "#333333");
      satLightRef.current.color.set(uplinkActive ? "#4ade80" : "#ef4444");
      satLightRef.current.intensity = uplinkActive ? 2 : 0.5;

      // 5. DYNAMIC COMM-LINK LASER
      if (laserRef.current) {
        laserRef.current.visible = uplinkActive;
        if (uplinkActive) {
          const positions = laserRef.current.geometry.attributes.position.array;
          positions[0] = pos.x; positions[1] = pos.y + 0.2; positions[2] = pos.z;
          positions[3] = satX; positions[4] = satY; positions[5] = satZ;
          laserRef.current.geometry.attributes.position.needsUpdate = true;
        }
      }
    }
  });

  return (
    <group>
      {/* --- THE ROVER --- */}
      <group ref={roverRef} position={pathPoints[0] || [0,0,0]}>
        <group scale={2}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.25, 0.12, 0.35]} />
            <meshStandardMaterial color="#e5e5e5" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.17, -0.05]}>
            <boxGeometry args={[0.2, 0.02, 0.2]} />
            <meshStandardMaterial color="#1e3a8a" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.15, 0.06, 0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          <mesh position={[0.15, 0.06, 0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          <mesh position={[-0.15, 0.06, -0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          <mesh position={[0.15, 0.06, -0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.05, 16]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          <primitive object={headlightTarget.current} position={[0, 0, 1]} />
          <spotLight position={[0, 0.15, 0.18]} angle={0.6} penumbra={0.8} intensity={3.0} color="#00ffff" target={headlightTarget.current} />
          <pointLight color="#00ffff" intensity={0.8} distance={2.0} position={[0, 0.2, 0]} />
        </group>
      </group>

      {/* --- THE LUNAR GATEWAY SATELLITE --- */}
      <mesh ref={satelliteRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#333333" wireframe={true} />
        <pointLight ref={satLightRef} color="#ef4444" intensity={0.5} distance={15} />
      </mesh>

      {/* --- THE COMM-LINK LASER --- */}
      <line ref={laserRef} visible={false}>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array(6)} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color="#4ade80" linewidth={2} transparent opacity={0.6} />
      </line>
    </group>
  );
};

const TerrainMesh = ({ missionData, activeLayer, layerHazards, minConfidence, isDriving }) => {
  const textureUrl = 
    activeLayer === 'water' && missionData.map_assets.water_heatmap ? missionData.map_assets.water_heatmap :
    activeLayer === 'minerals' && missionData.map_assets.mineral_profile ? missionData.map_assets.mineral_profile :
    missionData.map_assets.map_image;

  const texture = useTexture(textureUrl);

  const pathPoints = useMemo(() => {
    if (!missionData?.navigation?.waypoints) return [];
    return missionData.navigation.waypoints.map(p => 
      new THREE.Vector3((p.x - 50) / 5, 0.15, (p.y - 50) / 5)
    );
  }, [missionData]);

  const startPt = missionData?.navigation ? new THREE.Vector3((missionData.navigation.start.x - 50) / 5, 0.15, (missionData.navigation.start.y - 50) / 5) : null;
  const endPt = missionData?.navigation ? new THREE.Vector3((missionData.navigation.destination.x - 50) / 5, 0.15, (missionData.navigation.destination.y - 50) / 5) : null;

  return (
    <group>
      <gridHelper args={[20, 40, '#333333', '#111111']} position={[0, 0.01, 0]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20, 128, 128]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} />
      </mesh>

      {pathPoints.length > 0 && (
        <Line points={pathPoints} color="#00ffff" lineWidth={3} dashed={true} dashScale={2} dashSize={0.5} toneMapped={false} />
      )}

      {startPt && (
        <Sphere args={[0.2, 32, 32]} position={startPt}>
          <meshBasicMaterial color="#4ade80" toneMapped={false} />
          <pointLight color="#4ade80" intensity={2} distance={2} />
        </Sphere>
      )}

      {endPt && (
        <Sphere args={[0.2, 32, 32]} position={endPt}>
          <meshBasicMaterial color="#a855f7" toneMapped={false} />
          <pointLight color="#a855f7" intensity={2} distance={2} />
        </Sphere>
      )}

      {layerHazards && missionData?.detections.map((file, fIdx) => 
        file.boxes
          .filter(box => box.confidence >= minConfidence)
          .map((box, bIdx) => {
            const rx = (Math.random() * 80 + 10 - 50) / 5;
            const rz = (Math.random() * 80 + 10 - 50) / 5;
            const radius = Math.random() * 1.5 + 0.5;
            
            return (
              <group key={`${fIdx}-${bIdx}`} position={[rx, 0.05, rz]} rotation={[-Math.PI / 2, 0, 0]}>
                <Ring args={[radius - 0.05, radius, 32]}>
                  <meshBasicMaterial color="#ef4444" transparent opacity={0.6} toneMapped={false} />
                </Ring>
                <mesh>
                  <circleGeometry args={[radius - 0.05, 32]} />
                  <meshBasicMaterial color="#ef4444" transparent opacity={0.1} />
                </mesh>
              </group>
            );
        })
      )}

      <RoverSimulation pathPoints={pathPoints} isDriving={isDriving} />
    </group>
  );
};

const LunarTerrain3D = ({ missionData, activeLayer, layerHazards, minConfidence, isDriving }) => {
  if (!missionData?.map_assets?.map_image) return null;

  return (
    <div className="w-full h-full relative cursor-move bg-[#020204]">
      <Canvas camera={{ position: [0, 8, 12], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" />
        
        <OrbitControls 
          enablePan={true} enableZoom={true} enableRotate={true}
          maxPolarAngle={Math.PI / 2.2} minDistance={2} maxDistance={25}
        />

        <Suspense fallback={null}>
          <TerrainMesh missionData={missionData} activeLayer={activeLayer} layerHazards={layerHazards} minConfidence={minConfidence} isDriving={isDriving} />
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
        </EffectComposer>
      </Canvas>
      
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1.5 rounded text-[10px] text-gray-400 border border-gray-800 font-mono pointer-events-none backdrop-blur-sm flex flex-col items-end gap-1">
        <span>{isDriving ? "FPV ACTIVE • MOUSE DISABLED" : "DRAG TO ORBIT • SCROLL TO ZOOM"}</span>
        {isDriving && <span className="text-[#4ade80] animate-pulse">SATELLITE RELAY SYSTEM ONLINE</span>}
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN BATCH ANALYZER APPLICATION
// ==========================================
const BatchAnalyzer = () => {
  const [scanQueue, setScanQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [mapRevealed, setMapRevealed] = useState(false); 
  const [missionData, setMissionData] = useState(null);
  
  // Controls State
  const [layerHazards, setLayerHazards] = useState(true);
  const [layerWater, setLayerWater] = useState(false);
  const [layerMinerals, setLayerMinerals] = useState(false);
  const [minConfidence, setMinConfidence] = useState(50);
  const [isDriving, setIsDriving] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleMultipleUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newQueue = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      telemetry: null
    }));

    setScanQueue(prev => [...prev, ...newQueue]);
    setAnalysisComplete(false);
    setMapRevealed(false);
    setMissionData(null);
    setIsDriving(false);
  };

  const runBatchAnalysis = async () => {
    if (scanQueue.length === 0) return;
    setIsProcessing(true);
    setScanQueue(prev => prev.map(item => ({ ...item, status: 'analyzing' })));

    const formData = new FormData();
    scanQueue.forEach(item => formData.append('files', item.file));

    try {
      const response = await fetch('http://localhost:8000/api/predict/batch', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.status === 'success') {
        setScanQueue(prev => prev.map(item => {
          const fileData = data.detections.find(d => d.filename === item.name) || { craters: 0, water: 40 };
          return {
            ...item,
            status: 'complete',
            telemetry: { craters: fileData.craters, waterPct: Math.floor(fileData.water) }
          };
        }));
        
        setMissionData(data);
        setAnalysisComplete(true); 
      }
    } catch (error) {
      setScanQueue(prev => prev.map(item => ({ ...item, status: 'error' })));
    } finally {
      setIsProcessing(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }) => (
    <div 
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${checked ? 'bg-cyan-500' : 'bg-gray-700'}`}
      onClick={onChange}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : ''}`} />
    </div>
  );

  // ==========================================
  // SCREEN 2: 3D MAP COMMAND CENTER
  // ==========================================
  if (mapRevealed) {
    return (
      <div className="absolute inset-0 bg-[#0a0a0f] text-white p-8 pt-24 flex flex-col items-center pointer-events-auto overflow-y-auto font-sans z-50 custom-scrollbar">
        <div className="w-full max-w-6xl flex flex-col h-full min-h-[800px]">
          
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-3xl font-light tracking-wide text-cyan-400">3D Lunar Terrain Explorer</h2>
            
            <div className="flex gap-4 items-center">
              <Link 
                to="/planner" 
                className="px-6 py-2.5 bg-cyan-500/10 text-cyan-400 rounded-full hover:bg-cyan-500/30 border border-cyan-500/50 transition-all font-bold tracking-[0.2em] text-xs flex items-center shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                PROCEED TO LOGISTICS PLANNER
              </Link>
              
              <button 
                onClick={() => { setMapRevealed(false); setIsDriving(false); }} 
                className="p-3 bg-[#1a1a24] rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all border border-gray-700 shadow-lg"
                title="Return to Scanner"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          <div className="w-full flex-1 rounded-2xl relative overflow-hidden mb-8 border border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[450px]">
            <LunarTerrain3D 
              missionData={missionData} 
              activeLayer={layerWater ? 'water' : layerMinerals ? 'minerals' : 'path'}
              layerHazards={layerHazards}
              minConfidence={minConfidence}
              isDriving={isDriving}
            />

            <div className="absolute bottom-4 left-4 bg-black/80 px-5 py-3 rounded-xl border border-gray-800 flex gap-6 text-xs text-gray-300 z-40 shadow-lg pointer-events-none backdrop-blur-md">
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div> Rover/Target</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div> Hazards</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }}></div> Spectral Heatmap</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-center px-10 mb-8 border-b border-gray-800 pb-8 shrink-0">
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm mb-2 tracking-wide font-mono">ROVER POS</span>
              <span className="font-mono text-2xl text-cyan-50">{missionData?.navigation ? `0.${missionData.navigation.start.x}, 0.${missionData.navigation.start.y}` : '--, --'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm mb-2 tracking-wide font-mono">TOTAL HAZARDS SCANNED</span>
              <span className="font-mono text-2xl text-orange-400">{missionData?.craters_found || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm mb-2 tracking-wide font-mono">EST. PATH LENGTH</span>
              <span className="font-mono text-2xl text-cyan-400">{missionData?.navigation ? `${(missionData.navigation.waypoints.length * 42.6).toFixed(2)}km` : '--'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-6 px-10 shrink-0 pb-10">
            <div className="flex justify-between items-center bg-[#111] p-4 rounded-xl border border-gray-800 shadow-inner">
              <span className="text-gray-400 text-base font-mono">SOURCE PATCHES</span>
              <span className="text-white font-mono text-xl">{missionData?.files_processed || scanQueue.length}</span>
            </div>
            
            <div className="flex justify-between items-center px-4 py-2 glass-panel rounded-xl">
              <span className="text-gray-200 text-base tracking-wide">YOLOv8 Crater Hazards</span>
              <ToggleSwitch checked={layerHazards} onChange={() => setLayerHazards(!layerHazards)} />
            </div>

            <div className="flex justify-between items-center px-4 py-2 glass-panel rounded-xl border border-cyan-500/30">
              <span className="text-cyan-400 font-bold tracking-widest text-sm animate-pulse">FPV SIMULATION</span>
              <ToggleSwitch checked={isDriving} onChange={() => setIsDriving(!isDriving)} />
            </div>

            <div className="flex justify-between items-center px-4 py-2 glass-panel rounded-xl">
              <span className="text-gray-200 text-base tracking-wide">Mineral Density</span>
              <ToggleSwitch checked={layerMinerals} onChange={() => { setLayerMinerals(!layerMinerals); setLayerWater(false); }} />
            </div>
            
            <div className="flex justify-between items-center px-4 py-2 glass-panel rounded-xl">
              <span className="text-gray-200 text-base tracking-wide">H2O Ice Heatmap</span>
              <ToggleSwitch checked={layerWater} onChange={() => { setLayerWater(!layerWater); setLayerMinerals(false); }} />
            </div>

            <div className="col-span-2 flex justify-between items-center px-6 py-4 glass-panel rounded-xl border border-cyan-500/20">
              <div className="flex flex-col w-full">
                <div className="flex justify-between text-gray-300 text-sm tracking-wide mb-3">
                  <span>Filter Hazards by AI Confidence</span>
                  <span className="font-mono text-cyan-400 font-bold">{minConfidence}%+</span>
                </div>
                <input 
                  type="range" min="10" max="95" 
                  value={minConfidence} 
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-gray-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 1: BATCH UPLOAD & QUEUE
  // ==========================================
  return (
    <div className="absolute inset-0 p-10 pt-24 pointer-events-none flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8 pointer-events-auto shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="glass-panel p-3 rounded-full hover:bg-cyan-500/20 text-cyan-500 transition-colors border border-cyan-500/30 bg-black/50">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-cyan-400">BATCH ANALYZER</h1>
            <p className="text-gray-400 font-mono text-xs tracking-widest">MULTI-SECTOR PROCESSING ENGINE</p>
          </div>
        </div>

        <div className="flex gap-4">
          <input type="file" multiple ref={fileInputRef} onChange={handleMultipleUpload} accept="image/*" className="hidden" />
          <button onClick={() => fileInputRef.current.click()} disabled={isProcessing} className="glass-panel px-6 py-3 rounded-xl border border-gray-600 hover:border-cyan-500/50 hover:text-cyan-400 text-white font-bold tracking-widest flex items-center gap-2 transition-all disabled:opacity-50">
            <UploadCloud size={18} /> SELECT SECTORS
          </button>
          <button onClick={runBatchAnalysis} disabled={isProcessing || scanQueue.length === 0} className="glass-panel px-6 py-3 rounded-xl border border-orange-500/50 hover:bg-orange-500/20 text-orange-400 font-bold tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {isProcessing ? "PROCESSING..." : "ENGAGE TENSOR CORES"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 pointer-events-auto shrink-0">
        {scanQueue.map((item) => (
          <div key={item.id} className="glass-panel p-4 rounded-2xl flex flex-col gap-3 transition-all duration-500 border border-gray-800 hover:border-cyan-500/30">
            <div className="flex justify-between items-center text-xs font-mono font-bold tracking-widest text-gray-400">
              <span className="truncate w-32 text-cyan-100">{item.name}</span>
              {item.status === 'pending' && <span className="text-gray-600">QUEUED</span>}
              {item.status === 'error' && <span className="text-red-500">FAILED</span>}
              {item.status === 'analyzing' && <span className="text-orange-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> SCANNING</span>}
              {item.status === 'complete' && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={14} /> SECURE</span>}
            </div>
            <div className="w-full h-40 bg-black/90 rounded-xl border border-gray-800 relative overflow-hidden flex items-center justify-center">
              <img src={item.previewUrl} alt="Sector" className={`w-full h-full object-cover transition-all duration-1000 ${item.status === 'analyzing' ? 'scale-110 opacity-50' : 'grayscale opacity-80'}`} />
              {item.status === 'analyzing' && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent w-full h-[10%] animate-scan"></div>}
            </div>
            <div className={`flex justify-between text-[10px] font-mono tracking-wider transition-opacity duration-500 ${item.status === 'complete' ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-1 text-orange-400"><ShieldAlert size={12} /> {item.telemetry?.craters} HAZARDS</div>
              <div className="flex items-center gap-1 text-blue-400"><Droplets size={12} /> EST {item.telemetry?.waterPct}% H2O</div>
            </div>
          </div>
        ))}
      </div>

      {analysisComplete && !mapRevealed && (
        <div className="flex justify-center mb-12 pointer-events-auto shrink-0 animate-in fade-in zoom-in duration-700">
          <button 
            onClick={() => setMapRevealed(true)} 
            className="glass-panel px-12 py-6 rounded-full border-2 border-cyan-500 hover:bg-cyan-500/20 text-cyan-300 font-bold tracking-[0.2em] transition-all hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
          >
            INITIALIZE 3D CARTOGRAPHY
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchAnalyzer;