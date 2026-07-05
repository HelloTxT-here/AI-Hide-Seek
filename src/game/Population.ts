import { NeuralNet } from './NeuralNet';
import { Game, Frame } from './Game';

export class Population {
  seekerBrains: NeuralNet[] = [];
  hiderBrains: NeuralNet[] = [];
  generation: number = 1;

  constructor(size = 50) {
    for(let i=0; i<size; i++) {
      this.seekerBrains.push(new NeuralNet());
      this.hiderBrains.push(new NeuralNet());
    }
  }

  simulateGeneration(): { bestReplay: Frame[], bestFitness: number } {
    let bestFitness = -1;
    let bestReplay: Frame[] = [];

    let seekerFitnesses = new Array(this.seekerBrains.length).fill(0);
    let hiderFitnesses = new Array(this.hiderBrains.length).fill(0);

    for(let i=0; i<this.seekerBrains.length; i++) {
      let game = new Game(this.seekerBrains[i], this.hiderBrains[i]);
      let replay: Frame[] = [];

      while(game.ticks < game.maxTicks) {
        game.tick();
        replay.push(game.getState());
        if (game.hiders.every(h => h.isCaught)) break;
      }

      let sFit = game.seekers[0].fitness + game.seekers[1].fitness;
      let hFit = game.hiders[0].fitness + game.hiders[1].fitness;

      seekerFitnesses[i] = sFit;
      hiderFitnesses[i] = hFit;

      if (sFit > bestFitness) {
        bestFitness = sFit;
        bestReplay = replay;
      }
    }

    this.seekerBrains = this.evolve(this.seekerBrains, seekerFitnesses);
    this.hiderBrains = this.evolve(this.hiderBrains, hiderFitnesses);

    this.generation++;
    return { bestReplay, bestFitness };
  }

  evolve(brains: NeuralNet[], fitnesses: number[]) {
    let indexed = brains.map((b, i) => ({ b, f: fitnesses[i] }));
    indexed.sort((a, b) => b.f - a.f);

    let nextGen = [];
    let eliteCount = Math.floor(brains.length * 0.1);
    if (eliteCount < 1) eliteCount = 1;

    for(let i=0; i<eliteCount; i++) {
      nextGen.push(indexed[i].b.clone());
    }

    while(nextGen.length < brains.length) {
      let parent = indexed[Math.floor(Math.random() * eliteCount)].b;
      let child = parent.clone();
      child.mutate(0.1, 0.5);
      nextGen.push(child);
    }

    return nextGen;
  }
}
