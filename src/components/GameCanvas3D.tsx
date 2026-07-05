import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Plane, Cylinder, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Frame, MapData } from '../game/Game';

const SCALE = 0.05;
const to3D = (x: number, y: number) => [(x - 400) * SCALE, 0, (y - 400) * SCALE] as [number, number, number];

// Floating geometric indicator for coordinating agents
const CoordIndicator = ({ position, color }: { position: [number, number, number], color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 5) * 0.1;
    }
  });
  return (
    <mesh ref={meshRef} position={position} rotation={[Math.PI/4, Math.PI/4, 0]}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
};

interface SceneProps {
  replay: Frame[];
  isPlaying: boolean;
  onMatchEnd: () => void;
}

function Scene({ replay, isPlaying, onMatchEnd }: SceneProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const frameRef = useRef(0);

  useFrame(() => {
    if (!isPlaying || replay.length === 0) return;
    frameRef.current += 1;
    if (frameRef.current >= replay.length) {
      frameRef.current = 0;
      onMatchEnd();
    }
    setFrameIdx(Math.floor(frameRef.current));
  });

  const frame = replay[frameIdx] || replay[0];
  if (!frame) return null;

  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      
      {/* Ground (Clean minimal white) */}
      <Plane args={[40, 40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </Plane>
      
      {/* Subtle Grid Lines */}
      <gridHelper args={[40, 40, '#000000', '#e2e8f0']} position={[0, 0.01, 0]} />

      {/* Ramp (Sharp slope) */}
      <Box 
        position={[...to3D(MapData.ramp.x + MapData.ramp.w/2, MapData.ramp.y + MapData.ramp.h/2).slice(0, 1), 0.5, ...to3D(MapData.ramp.x + MapData.ramp.w/2, MapData.ramp.y + MapData.ramp.h/2).slice(2)] as [number, number, number]} 
        args={[MapData.ramp.w * SCALE, 0.1, (MapData.ramp.h + 20) * SCALE]}
        rotation={[-Math.PI / 10, 0, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#f1f5f9" roughness={1} />
      </Box>

      {/* Outer Walls */}
      {MapData.outerWalls.map((w, i) => (
        <Box key={`ow-${i}`} position={[...to3D(w.x + w.w/2, w.y + w.h/2).slice(0, 1), 1, ...to3D(w.x + w.w/2, w.y + w.h/2).slice(2)] as [number, number, number]} args={[w.w * SCALE, 2, w.h * SCALE]} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" roughness={1} />
        </Box>
      ))}

      {/* Inner Walls */}
      {MapData.innerWalls.map((w, i) => (
        <Box key={`iw-${i}`} position={[...to3D(w.x + w.w/2, w.y + w.h/2).slice(0, 1), 1, ...to3D(w.x + w.w/2, w.y + w.h/2).slice(2)] as [number, number, number]} args={[w.w * SCALE, 2, w.h * SCALE]} castShadow receiveShadow>
          <meshStandardMaterial color="#334155" roughness={1} />
        </Box>
      ))}

      {/* Dynamic Boxes (Crates) */}
      {frame.boxes && frame.boxes.map((b, i) => (
        <Box 
          key={`box-${i}`} 
          position={[...to3D(b.x + 30, b.y + 30).slice(0, 1), b.isGrabbed ? 1.5 : 1, ...to3D(b.x + 30, b.y + 30).slice(2)] as [number, number, number]} 
          args={[60 * SCALE, 2, 60 * SCALE]} 
          castShadow 
          receiveShadow
        >
          <meshStandardMaterial color={b.isGrabbed ? "#94a3b8" : "#64748b"} roughness={1} />
        </Box>
      ))}

      {/* Seekers (Minecraft-style cubes) */}
      {frame.seekers.map((s, i) => {
        const s3d = to3D(s.x, s.y);
        const elevation = s.jumpTicks > 0 ? 2 : 0.75;
        const laserLen = (s.laserDist || 180) * SCALE;
        const laserRadius = Math.tan(Math.PI / 15) * laserLen;

        return (
          <group key={`seeker-${i}`} position={[s3d[0], elevation, s3d[2]]}>
            <Box args={[1.5, 1.5, 1.5]} castShadow>
              <meshStandardMaterial color={s.jumpTicks > 0 ? "#f87171" : "#dc2626"} roughness={1} />
            </Box>
            
            {/* Eye / Visor block to show facing direction strictly */}
            <Box position={[0, 0.4, 0.8]} args={[1, 0.3, 0.3]} castShadow>
              <meshStandardMaterial color="#000000" roughness={1} />
            </Box>

            <Text 
              position={[0, 2, 0]} 
              fontSize={0.8} 
              color="black" 
              anchorX="center" 
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="white"
            >
              {s.name}
            </Text>

            {s.coordinating && <CoordIndicator position={[0, 1.5, 0]} color="#dc2626" />}

            {/* Sharp Laser Cone */}
            <group rotation={[0, -s.facing + Math.PI / 2, 0]}>
              <Cylinder args={[laserRadius, 0.05, laserLen, 8]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, laserLen / 2]}>
                <meshBasicMaterial color="#ef4444" transparent opacity={0.25} depthWrite={false} blending={THREE.NormalBlending} />
              </Cylinder>
            </group>
          </group>
        );
      })}

      {/* Hiders (Minecraft-style cubes) */}
      {frame.hiders.map((h, i) => {
        if (h.isCaught) return null;
        const h3d = to3D(h.x, h.y);
        return (
          <group key={`hider-${i}`} position={[h3d[0], 0.75, h3d[2]]}>
            <Box args={[1.5, 1.5, 1.5]} castShadow>
              <meshStandardMaterial color="#059669" roughness={1} />
            </Box>
            <Box position={[0, 0.4, 0.8]} args={[1, 0.3, 0.3]} castShadow>
              <meshStandardMaterial color="#064e3b" roughness={1} />
            </Box>
            
            <Text 
              position={[0, 2, 0]} 
              fontSize={0.8} 
              color="black" 
              anchorX="center" 
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="white"
            >
              {h.name}
            </Text>

            {h.coordinating && <CoordIndicator position={[0, 1.5, 0]} color="#059669" />}
          </group>
        );
      })}

      {/* 3D UI Overlay for Kill Feed */}
      {frame.events && frame.events.length > 0 && (
        <Html position={[15, 10, -15]} center>
          <div className="bg-white border-2 border-black p-4 w-64 shadow-[4px_4px_0_0_#000] pointer-events-none">
            <h3 className="font-black text-black mb-2 flex items-center justify-between">
              KILL FEED
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            </h3>
            <div className="flex flex-col gap-1 text-sm font-bold text-black font-mono">
              {frame.events.map((ev, i) => (
                <div key={i} className="border-b-2 border-slate-100 pb-1">{ev}</div>
              ))}
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

export default function GameCanvas3D({ replay, isPlaying, onMatchEnd }: SceneProps) {
  return (
    <div className="w-full h-full bg-white border-2 border-black">
      <Canvas shadows camera={{ position: [0, 45, 30], fov: 45 }}>
        <Scene replay={replay} isPlaying={isPlaying} onMatchEnd={onMatchEnd} />
        <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.1} minDistance={10} maxDistance={60} />
      </Canvas>
    </div>
  );
}

