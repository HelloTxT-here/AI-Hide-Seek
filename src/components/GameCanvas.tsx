import React, { useEffect, useRef } from 'react';
import { Frame, MapData } from '../game/Game';
import { raycastAABB } from '../game/MathUtils';

interface GameCanvasProps {
  replay: Frame[];
  isPlaying: boolean;
  onMatchEnd: () => void;
}

export default function GameCanvas({ replay, isPlaying, onMatchEnd }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayRef = useRef(replay);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    replayRef.current = replay;
  }, [replay]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    let reqId: number;
    let currentFrame = 0;

    const drawFrame = (ctx: CanvasRenderingContext2D, frame: Frame) => {
      ctx.clearRect(0, 0, 800, 800);

      // Bare-bones, clean architectural background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 800, 800);
      
      // Subtle Grid
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 800); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
      }

      // Draw Ramp
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.fillRect(MapData.ramp.x, MapData.ramp.y, MapData.ramp.w, MapData.ramp.h);
      ctx.strokeRect(MapData.ramp.x, MapData.ramp.y, MapData.ramp.w, MapData.ramp.h);
      // Draw ramp direction lines (slope indicator)
      ctx.beginPath();
      ctx.moveTo(MapData.ramp.x, MapData.ramp.y + MapData.ramp.h / 2);
      ctx.lineTo(MapData.ramp.x + MapData.ramp.w, MapData.ramp.y + MapData.ramp.h / 2);
      ctx.stroke();

      // Draw Outer Walls
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let w of MapData.outerWalls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // Draw Inner Walls
      ctx.fillStyle = '#334155';
      for (let w of MapData.innerWalls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // Draw Boxes (Dynamic)
      if (frame.boxes) {
        for (let b of frame.boxes) {
          ctx.fillStyle = b.isGrabbed ? '#94a3b8' : '#64748b'; 
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.fillRect(b.x, b.y, 60, 60);
          ctx.strokeRect(b.x, b.y, 60, 60);
          
          // Cross pattern on box to make it look like a crate
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + 60, b.y + 60);
          ctx.moveTo(b.x + 60, b.y);
          ctx.lineTo(b.x, b.y + 60);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.3)';
          ctx.stroke();
        }
      }

      // Draw Coordination Indicators (Hiders)
      if (frame.hiders.length === 2 && !frame.hiders[0].isCaught && !frame.hiders[1].isCaught && frame.hiders[0].coordinating) {
        ctx.beginPath();
        ctx.moveTo(frame.hiders[0].x, frame.hiders[0].y);
        ctx.lineTo(frame.hiders[1].x, frame.hiders[1].y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Seekers & Lasers
      for (let s of frame.seekers) {
        // Laser (shorter and narrower)
        ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        let numRays = 20;
        let startAngle = s.facing - Math.PI/15; // PI/15 (24 degrees total)
        for(let i=0; i<=numRays; i++) {
          let angle = startAngle + (i/numRays) * (Math.PI/7.5); 
          let dir = { x: Math.cos(angle), y: Math.sin(angle) };
          let dist = 180; // shorter max distance

          // Check static walls
          for (let w of [...MapData.outerWalls, ...MapData.innerWalls]) {
            let t = raycastAABB(s, dir, w);
            if (t !== null && t < dist) dist = t;
          }
          
          // Check dynamic boxes
          if (frame.boxes) {
            for (let b of frame.boxes) {
              let boxRect = { x: b.x, y: b.y, w: 60, h: 60 };
              let t = raycastAABB(s, dir, boxRect);
              if (t !== null && t < dist) dist = t;
            }
          }

          ctx.lineTo(s.x + dir.x * dist, s.y + dir.y * dist);
        }
        ctx.closePath();
        ctx.fill();

        // Draw Coordination Indicators (Seekers)
        if (s.coordinating) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, 18, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Seeker Body (Blocky/Cube style representations from top down -> squares)
        ctx.fillStyle = s.jumpTicks > 0 ? '#f87171' : '#dc2626';
        ctx.fillRect(s.x - 12, s.y - 12, 24, 24);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 12, s.y - 12, 24, 24);

        // Facing indicator
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(s.facing) * 16, s.y + Math.sin(s.facing) * 16);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x, s.y - 18);
      }

      // Draw Hiders (Squares from top down)
      for (let h of frame.hiders) {
        if (h.isCaught) continue;
        ctx.fillStyle = '#059669';
        ctx.fillRect(h.x - 10, h.y - 10, 20, 20);
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x - 10, h.y - 10, 20, 20);

        if (h.coordinating) {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 16, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.5)';
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(h.name, h.x, h.y - 18);
      }

      // Draw Event Log
      if (frame.events && frame.events.length > 0) {
        const ew = 200;
        const eh = 30 + frame.events.length * 20;
        const ex = 800 - ew - 20;
        const ey = 20;
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex, ey, ew, eh);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(ex, ey, ew, eh);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('KILL FEED', ex + 10, ey + 20);

        ctx.font = 'bold 12px monospace';
        frame.events.forEach((ev, i) => {
          ctx.fillText(ev, ex + 10, ey + 40 + i * 20);
        });
      }
    };

    const loop = () => {
      if (!isPlayingRef.current || replayRef.current.length === 0) {
        reqId = requestAnimationFrame(loop);
        return;
      }

      if (currentFrame >= replayRef.current.length) {
        currentFrame = 0;
        onMatchEnd();
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            drawFrame(ctx, replayRef.current[currentFrame]);
          }
        }
        currentFrame += 1;
      }
      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [onMatchEnd]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      className="w-full h-full object-contain bg-white rounded-none border-2 border-black"
    />
  );
}

