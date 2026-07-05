import React, { useState, useEffect, useRef } from 'react';
import { Population } from './game/Population';
import { Frame } from './game/Game';
import GameCanvas3D from './components/GameCanvas3D';
import GameCanvas from './components/GameCanvas';
import { Play, Pause, FastForward, Activity, Monitor } from 'lucide-react';

export default function App() {
  const [generation, setGeneration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bestFitness, setBestFitness] = useState(0);
  const [replay, setReplay] = useState<Frame[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [use3D, setUse3D] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  const popRef = useRef(new Population(50));

  useEffect(() => {
    // Check for WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        setUse3D(false);
        console.warn('WebGL not supported, falling back to 2D canvas.');
      }
    } catch (e) {
      setWebGLSupported(false);
      setUse3D(false);
      console.warn('Error checking WebGL support:', e);
    }
  }, []);

  const simulateNextGen = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const { bestReplay, bestFitness } = popRef.current.simulateGeneration();
      setReplay(bestReplay);
      setBestFitness(Math.floor(bestFitness));
      setGeneration(popRef.current.generation);
      setIsSimulating(false);
    }, 10);
  };

  useEffect(() => {
    simulateNextGen();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't') {
        setUiVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMatchEnd = () => {
    if (isPlaying) {
      simulateNextGen();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden font-sans text-black">
      {/* Game Canvas (Background) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-white">
        {use3D && webGLSupported ? (
          <GameCanvas3D 
            replay={replay} 
            isPlaying={isPlaying && !isSimulating} 
            onMatchEnd={handleMatchEnd} 
          />
        ) : (
          <div className="w-full h-full max-w-[800px] max-h-[800px] p-4">
             <GameCanvas 
              replay={replay} 
              isPlaying={isPlaying && !isSimulating} 
              onMatchEnd={handleMatchEnd} 
            />
          </div>
        )}
      </div>

      {/* Simulating Overlay */}
      {isSimulating && (
        <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
          <Activity className="w-16 h-16 text-black mb-6" />
          <h2 className="text-4xl font-black text-black mb-3 tracking-tight border-4 border-black p-4 bg-white shadow-[8px_8px_0_0_#000]">SIMULATING GEN {generation}</h2>
          <p className="text-black text-lg font-bold uppercase mt-4">Running 50 matches in background...</p>
        </div>
      )}

      {/* HUD Overlay */}
      <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
          <div className="bg-white border-2 border-black rounded-none p-5 shadow-[4px_4px_0_0_#000] pointer-events-auto max-w-sm">
            <h1 className="text-3xl font-black text-black mb-1 uppercase tracking-tighter">
              AI Hide & Seek
            </h1>
            <p className="text-xs text-black font-bold tracking-wide mb-4 uppercase">
              Competitive Co-Evolution
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-none p-3 border-2 border-black shadow-[2px_2px_0_0_#000]">
                <div className="text-xs text-black uppercase font-black mb-1">Generation</div>
                <div className="text-2xl font-mono font-black text-black">{generation}</div>
              </div>
              <div className="bg-white rounded-none p-3 border-2 border-black shadow-[2px_2px_0_0_#000]">
                <div className="text-xs text-black uppercase font-black mb-1">Best Fitness</div>
                <div className="text-2xl font-mono font-black text-black">{bestFitness}</div>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isSimulating}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-none font-black text-sm uppercase tracking-wider transition-all border-2 border-black ${
                  isPlaying 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black hover:bg-slate-100 shadow-[2px_2px_0_0_#000] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Auto-Play'}
              </button>

              <button
                onClick={simulateNextGen}
                disabled={isSimulating || isPlaying}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-none font-black text-sm uppercase tracking-wider bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-slate-100 active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FastForward className="w-4 h-4" />
                Skip Gen
              </button>
            </div>

            {webGLSupported && (
              <button
                onClick={() => setUse3D(!use3D)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-none font-black text-xs uppercase tracking-wider bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-slate-100 active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
              >
                <Monitor className="w-3 h-3" />
                Switch to {use3D ? '2D View' : '3D View'}
              </button>
            )}
            {!webGLSupported && (
              <div className="text-xs text-black font-black text-center mt-2 bg-yellow-200 p-2 rounded-none border-2 border-black">
                WebGL not supported. Running in 2D mode.
              </div>
            )}
          </div>

          {/* Controls Hint */}
          <div className="bg-white border-2 border-black rounded-none px-4 py-2 text-xs font-black text-black flex items-center gap-2 shadow-[4px_4px_0_0_#000]">
            <span className="bg-black text-white px-2 py-1 rounded-none font-mono">T</span>
            Toggle UI
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="absolute bottom-6 left-6 bg-white border-2 border-black rounded-none p-4 shadow-[4px_4px_0_0_#000] pointer-events-auto">
          <h3 className="text-xs font-black text-black mb-3 uppercase tracking-widest">Legend</h3>
          <div className="flex gap-6 text-sm font-bold text-black border-2 border-black p-2 shadow-[2px_2px_0_0_#000]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 border-2 border-black"></div>
              <span>Seeker</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-600 border-2 border-black"></div>
              <span>Hider</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-500 border-2 border-black"></div>
              <span>Movable Box</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-200 border-2 border-black"></div>
              <span>Jump Ramp</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


