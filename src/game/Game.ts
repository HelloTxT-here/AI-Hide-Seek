import { raycastAABB, raycastCircle } from './MathUtils';
import { NeuralNet } from './NeuralNet';

export const MapData = {
  outerWalls: [
    {x: 0, y: 0, w: 800, h: 20},
    {x: 0, y: 780, w: 800, h: 20},
    {x: 0, y: 0, w: 20, h: 800},
    {x: 780, y: 0, w: 20, h: 800}
  ],
  innerWalls: [
    {x: 200, y: 200, w: 20, h: 400},
    {x: 580, y: 200, w: 20, h: 400},
    {x: 220, y: 200, w: 130, h: 20},
    {x: 450, y: 200, w: 130, h: 20},
    {x: 220, y: 580, w: 130, h: 20},
    {x: 450, y: 580, w: 130, h: 20}
  ],
  ramp: {x: 120, y: 350, w: 80, h: 100}
};

export interface Box {
  x: number; y: number; w: number; h: number;
  grabbedBy: Agent | null;
}

export class Agent {
  x: number; y: number;
  vx: number = 0; vy: number = 0;
  radius: number = 15;
  speed: number;
  brain: NeuralNet;
  isSeeker: boolean;
  isCaught: boolean = false;
  jumpTicks: number = 0;
  facing: number = 0;
  fitness: number = 0;
  grabbedBoxIndex: number | null = null;
  name: string;

  constructor(x: number, y: number, isSeeker: boolean, brain: NeuralNet, name: string) {
    this.x = x; this.y = y; this.isSeeker = isSeeker; this.brain = brain; this.name = name;
    // Hiders are faster than single seekers to enforce teamwork/flanking
    this.speed = isSeeker ? 2.2 : 2.4; 
  }
}

export interface Frame {
  seekers: {x: number, y: number, facing: number, jumpTicks: number, laserDist: number, coordinating: boolean, name: string}[];
  hiders: {x: number, y: number, isCaught: boolean, coordinating: boolean, name: string}[];
  boxes: {x: number, y: number, isGrabbed: boolean}[];
  events: string[];
}

export class Game {
  seekers: Agent[];
  hiders: Agent[];
  boxes: Box[];
  ticks: number = 0;
  maxTicks: number = 1800;
  events: string[] = [];

  constructor(seekerBrain: NeuralNet, hiderBrain: NeuralNet) {
    this.seekers = [
      new Agent(100, 100, true, seekerBrain, "Seeker 1"),
      new Agent(150, 100, true, seekerBrain, "Seeker 2") // Spawned close together to encourage working as a team
    ];
    this.hiders = [
      new Agent(300, 400, false, hiderBrain, "Hider 1"),
      new Agent(500, 400, false, hiderBrain, "Hider 2")
    ];
    this.boxes = [
      {x: 280, y: 280, w: 60, h: 60, grabbedBy: null},
      {x: 460, y: 460, w: 60, h: 60, grabbedBy: null}
    ];
  }

  checkCoord(a1: Agent, a2: Agent, isSeeker: boolean) {
    if (a1.isCaught || a2.isCaught) return false;
    let dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
    if (!isSeeker) return dist < 120;
    let dot = Math.cos(a1.facing) * Math.cos(a2.facing) + Math.sin(a1.facing) * Math.sin(a2.facing);
    return dist > 80 && dist < 350 && dot < 0.5;
  }

  getState(): Frame {
    let seekersCoordinating = this.checkCoord(this.seekers[0], this.seekers[1], true);
    let hidersCoordinating = this.checkCoord(this.hiders[0], this.hiders[1], false);

    return {
      seekers: this.seekers.map((s) => {
        let lDist = 180;
        let rDir = { x: Math.cos(s.facing), y: Math.sin(s.facing) };
        for (let w of [...MapData.outerWalls, ...MapData.innerWalls, ...this.boxes]) {
            let t = raycastAABB(s, rDir, w);
            if (t !== null && t < lDist) lDist = t;
        }
        return {x: s.x, y: s.y, facing: s.facing, jumpTicks: s.jumpTicks, laserDist: lDist, coordinating: seekersCoordinating, name: s.name};
      }),
      hiders: this.hiders.map(h => ({x: h.x, y: h.y, isCaught: h.isCaught, coordinating: hidersCoordinating, name: h.name})),
      boxes: this.boxes.map(b => ({x: b.x, y: b.y, isGrabbed: b.grabbedBy !== null})),
      events: [...this.events]
    };
  }

  tick() {
    this.ticks++;

    let seekersCoordinating = this.checkCoord(this.seekers[0], this.seekers[1], true);
    let hidersCoordinating = this.checkCoord(this.hiders[0], this.hiders[1], false);

    // Reward teamwork explicitly
    if (seekersCoordinating) {
      this.seekers[0].fitness += 0.5;
      this.seekers[1].fitness += 0.5;
    }
    if (hidersCoordinating) {
      this.hiders[0].fitness += 0.5;
      this.hiders[1].fitness += 0.5;
    }

    for (let a of [...this.seekers, ...this.hiders]) {
      if (a.isCaught) continue;
      let inputs = this.getInputs(a);
      let outputs = a.brain.predict(inputs);
      a.vx = outputs[0] * a.speed;
      a.vy = outputs[1] * a.speed;
      let wantGrab = outputs[2] > 0;

      if (Math.abs(a.vx) > 0.1 || Math.abs(a.vy) > 0.1) {
        a.facing = Math.atan2(a.vy, a.vx);
      }

      a.x += a.vx;
      a.y += a.vy;

      if (a.jumpTicks > 0) a.jumpTicks--;

      // Grabbing logic
      if (wantGrab && a.grabbedBoxIndex === null) {
        for (let i = 0; i < this.boxes.length; i++) {
          let b = this.boxes[i];
          if (b.grabbedBy === null) {
            let cx = b.x + b.w/2;
            let cy = b.y + b.h/2;
            let dist = Math.hypot(a.x - cx, a.y - cy);
            if (dist < a.radius + b.w/2 + 20) {
              b.grabbedBy = a;
              a.grabbedBoxIndex = i;
              break;
            }
          }
        }
      } else if (!wantGrab && a.grabbedBoxIndex !== null) {
        this.boxes[a.grabbedBoxIndex].grabbedBy = null;
        a.grabbedBoxIndex = null;
      }
      
      if (a.grabbedBoxIndex !== null) {
        let b = this.boxes[a.grabbedBoxIndex];
        b.x = a.x - b.w/2;
        b.y = a.y - b.h/2;
      }
    }

    // Agent-Agent collisions
    let active = [...this.seekers, ...this.hiders].filter(a => !a.isCaught);
    for (let i=0; i<active.length; i++) {
      for (let j=i+1; j<active.length; j++) {
        this.resolveCircleCircle(active[i], active[j]);
      }
    }

    // Agent-Box and Agent-Wall collisions
    for (let a of [...this.seekers, ...this.hiders]) {
      if (a.isCaught) continue;

      // Box collisions first
      for (let b of this.boxes) {
        if (b.grabbedBy !== a) {
          this.resolveCircleRect(a, b);
        }
      }

      // Inner walls next
      if (a.jumpTicks === 0) {
        for (let w of MapData.innerWalls) this.resolveCircleRect(a, w);
      }

      // Outer walls absolute last to secure boundaries
      for (let w of MapData.outerWalls) this.resolveCircleRect(a, w);
    }

    for (let s of this.seekers) {
      let r = MapData.ramp;
      if (s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h) {
        s.jumpTicks = 60;
      }
    }

    for (let s of this.seekers) {
      for (let h of this.hiders) {
        if (!h.isCaught && this.checkVision(s, h)) {
          h.isCaught = true;
          s.fitness += (this.maxTicks - this.ticks) * 2;
          this.events.push(`${s.name} found ${h.name}!`);
        }
      }
    }

    for (let h of this.hiders) {
      if (!h.isCaught) h.fitness += 1;
    }
    for (let s of this.seekers) {
      let minDist = 9999;
      for (let h of this.hiders) {
        if (!h.isCaught) {
          let d = Math.hypot(h.x - s.x, h.y - s.y);
          if (d < minDist) minDist = d;
        }
      }
      if (minDist < 400) {
        s.fitness += (400 - minDist) / 400;
      }
    }
  }

  getInputs(agent: Agent) {
    let inputs = [];
    inputs.push(agent.x / 800);
    inputs.push(agent.y / 800);
    inputs.push(agent.vx / agent.speed);
    inputs.push(agent.vy / agent.speed);
    inputs.push(agent.grabbedBoxIndex !== null ? 1 : 0);

    let angles = [0, 45, 90, 135, 180, 225, 270, 315].map(a => a * Math.PI / 180);
    for (let angle of angles) {
      let dir = { x: Math.cos(angle), y: Math.sin(angle) };

      let minWallDist = 800;
      for (let w of [...MapData.outerWalls, ...MapData.innerWalls, ...this.boxes]) {
        let t = raycastAABB(agent, dir, w);
        if (t !== null && t < minWallDist) minWallDist = t;
      }
      inputs.push(minWallDist / 800);

      let minSeekerDist = 800;
      for (let s of this.seekers) {
        if (s === agent) continue;
        let t = raycastCircle(agent, dir, s);
        if (t !== null && t < minSeekerDist) minSeekerDist = t;
      }
      inputs.push(minSeekerDist / 800);

      let minHiderDist = 800;
      for (let h of this.hiders) {
        if (h === agent || h.isCaught) continue;
        let t = raycastCircle(agent, dir, h);
        if (t !== null && t < minHiderDist) minHiderDist = t;
      }
      inputs.push(minHiderDist / 800);

      let minRampDist = 800;
      let t = raycastAABB(agent, dir, MapData.ramp);
      if (t !== null && t < minRampDist) minRampDist = t;
      inputs.push(minRampDist / 800);
    }

    return inputs;
  }

  resolveCircleRect(circle: Agent, rect: any) {
    let testX = circle.x;
    let testY = circle.y;

    if (circle.x < rect.x) testX = rect.x;
    else if (circle.x > rect.x + rect.w) testX = rect.x + rect.w;

    if (circle.y < rect.y) testY = rect.y;
    else if (circle.y > rect.y + rect.h) testY = rect.y + rect.h;

    let distX = circle.x - testX;
    let distY = circle.y - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));

    if (distance < circle.radius) {
      let overlap = circle.radius - distance;
      if (distance === 0) {
         circle.x += overlap;
      } else {
         circle.x += (distX / distance) * overlap;
         circle.y += (distY / distance) * overlap;
      }
    }
  }

  resolveCircleCircle(c1: Agent, c2: Agent) {
    let dx = c1.x - c2.x;
    let dy = c1.y - c2.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < c1.radius + c2.radius) {
      let overlap = (c1.radius + c2.radius - dist) / 2;
      if (dist === 0) { c1.x += overlap; c2.x -= overlap; return; }
      c1.x += (dx/dist) * overlap;
      c1.y += (dy/dist) * overlap;
      c2.x -= (dx/dist) * overlap;
      c2.y -= (dy/dist) * overlap;
    }
  }

  checkVision(s: Agent, h: Agent) {
    let dx = h.x - s.x;
    let dy = h.y - s.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 180) return false;

    let angle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angle - s.facing);
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    angleDiff = Math.abs(angleDiff);

    if (angleDiff > Math.PI / 15) return false;

    let rayDir = { x: dx/dist, y: dy/dist };
    let hitDist = dist;

    for (let w of MapData.outerWalls) {
      let t = raycastAABB(s, rayDir, w);
      if (t !== null && t < hitDist) return false;
    }
    for (let w of MapData.innerWalls) {
      let t = raycastAABB(s, rayDir, w);
      if (t !== null && t < hitDist) return false;
    }
    for (let b of this.boxes) {
      let t = raycastAABB(s, rayDir, b);
      if (t !== null && t < hitDist) return false;
    }

    return true;
  }
}
