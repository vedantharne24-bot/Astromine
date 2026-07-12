import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

// Notice we accept activeMapLayer as a prop here
const Globe = ({ activeMapLayer }) => {
  const globeRef = useRef();
  const laserRef = useRef();

  useFrame((state) => {
    if (globeRef.current) globeRef.current.rotation.y += 0.001;
    if (laserRef.current) laserRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 2.4;
  });

  // --- DYNAMIC COLOR LOGIC ---
  // Default: Dark slate and cyan
  let coreColor = "#0f172a";
  let wireframeColor = "#00ffff";

  if (activeMapLayer === 'water') {
    coreColor = "#0a192f"; // Deep ocean blue
    wireframeColor = "#3b82f6"; // Bright blue
  } else if (activeMapLayer === 'minerals') {
    coreColor = "#1e102f"; // Deep space purple
    wireframeColor = "#a855f7"; // Neon purple
  }

  return (
    <group>
      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          {/* Color dynamically updates here */}
          <meshStandardMaterial color={coreColor} roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.52, 32, 32]} />
          {/* Wireframe color dynamically updates here */}
          <meshBasicMaterial color={wireframeColor} wireframe={true} transparent opacity={0.15} />
        </mesh>
      </group>

      <mesh ref={laserRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.65, 0.015, 16, 100]} />
        {/* Laser matches the active layer color */}
        <meshBasicMaterial color={wireframeColor} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

const MarsGlobe = ({ activeMapLayer }) => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto transition-colors duration-1000">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={200} color="#ea580c" />
        <pointLight position={[-10, -5, -10]} intensity={150} color="#06b6d4" />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        {/* Pass the layer down to the actual 3D meshes */}
        <Globe activeMapLayer={activeMapLayer} />
        
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default MarsGlobe;