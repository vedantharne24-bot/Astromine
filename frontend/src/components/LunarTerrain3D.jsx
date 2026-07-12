import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, useTexture, Sphere, Ring } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const TerrainMesh = ({ missionData, activeLayer, layerHazards }) => {
  // Dynamically swap the physical texture on the 3D mesh
  const textureUrl = 
    activeLayer === 'water' && missionData.map_assets.water_heatmap ? missionData.map_assets.water_heatmap :
    activeLayer === 'minerals' && missionData.map_assets.mineral_profile ? missionData.map_assets.mineral_profile :
    missionData.map_assets.map_image;

  const texture = useTexture(textureUrl);

  // Convert Python's 0-100 A* grid into physical 3D world coordinates
  const pathPoints = useMemo(() => {
    if (!missionData?.navigation?.waypoints) return [];
    return missionData.navigation.waypoints.map(p => 
      new THREE.Vector3((p.x - 50) / 5, 0.15, (p.y - 50) / 5) // Hover slightly lower
    );
  }, [missionData]);

  const startPt = missionData?.navigation ? new THREE.Vector3((missionData.navigation.start.x - 50) / 5, 0.15, (missionData.navigation.start.y - 50) / 5) : null;
  const endPt = missionData?.navigation ? new THREE.Vector3((missionData.navigation.destination.x - 50) / 5, 0.15, (missionData.navigation.destination.y - 50) / 5) : null;

  return (
    <group>
      {/* Tactical Holographic Floor Grid */}
      <gridHelper args={[20, 40, '#333333', '#111111']} position={[0, 0.01, 0]} />

      {/* The Physical Lunar Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20, 128, 128]} />
        {/* Adjusted material to absorb light better and look more cinematic */}
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} transparent={true} opacity={0.8} />
      </mesh>

      {/* The 3D Glowing A* Path */}
      {pathPoints.length > 0 && (
        <Line 
          points={pathPoints} 
          color="#00ffff" 
          lineWidth={3} 
          dashed={true} 
          dashScale={2} 
          dashSize={0.5} 
          toneMapped={false} // Prevents the bloom from washing out the color
        />
      )}

      {/* Glowing Deployment Node */}
      {startPt && (
        <Sphere args={[0.2, 32, 32]} position={startPt}>
          <meshBasicMaterial color="#4ade80" toneMapped={false} />
          <pointLight color="#4ade80" intensity={2} distance={2} />
        </Sphere>
      )}

      {/* Glowing Drill Target Node */}
      {endPt && (
        <Sphere args={[0.2, 32, 32]} position={endPt}>
          <meshBasicMaterial color="#a855f7" toneMapped={false} />
          <pointLight color="#a855f7" intensity={2} distance={2} />
        </Sphere>
      )}

      {/* Sleek Holographic Hazard Zones (Replaced bulky Cylinders) */}
      {layerHazards && missionData?.detections.map((file, fIdx) => 
        file.boxes.map((box, bIdx) => {
          const rx = (Math.random() * 80 + 10 - 50) / 5;
          const rz = (Math.random() * 80 + 10 - 50) / 5;
          const radius = Math.random() * 1.5 + 0.5;
          
          return (
            <group key={`${fIdx}-${bIdx}`} position={[rx, 0.05, rz]} rotation={[-Math.PI / 2, 0, 0]}>
              {/* Outer glowing ring */}
              <Ring args={[radius - 0.05, radius, 32]}>
                <meshBasicMaterial color="#ef4444" transparent opacity={0.6} toneMapped={false} />
              </Ring>
              {/* Inner subtle danger zone fill */}
              <mesh>
                <circleGeometry args={[radius - 0.05, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.1} />
              </mesh>
            </group>
          );
        })
      )}
    </group>
  );
};

const LunarTerrain3D = ({ missionData, activeLayer, layerHazards }) => {
  if (!missionData?.map_assets?.map_image) return null;

  return (
    <div className="w-full h-full relative cursor-move bg-[#020204]">
      <Canvas camera={{ position: [0, 8, 12], fov: 45 }}>
        {/* Darker, moodier lighting setup */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" />
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2} // Let the camera get lower to the ground
          minDistance={2}
          maxDistance={25}
        />

        <Suspense fallback={null}>
          <TerrainMesh missionData={missionData} activeLayer={activeLayer} layerHazards={layerHazards} />
        </Suspense>

        {/* POST PROCESSING: The secret to the Sci-Fi Look */}
        <EffectComposer>
          <Bloom 
            luminanceThreshold={0.2} // What brightness level starts to glow
            luminanceSmoothing={0.9} 
            intensity={1.5} // Strength of the neon glow
          />
        </EffectComposer>
      </Canvas>
      
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1.5 rounded text-[10px] text-gray-400 border border-gray-800 font-mono pointer-events-none backdrop-blur-sm">
        DRAG TO ORBIT • SCROLL TO ZOOM
      </div>
    </div>
  );
};

export default LunarTerrain3D;