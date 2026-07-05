# 🕶️ AI Hide-and-Seek (AI-Hide-Seek)

A web-based 2D multi-agent simulation where 4 autonomous AI agents play the classic game of Hide and Seek. Over thousands of generations, the agents evolve their survival and tracking strategies using a combination of **Feedforward Neural Networks** and **Genetic Algorithms**.

---

## ⚙️ How It Works

The simulation pits **Seekers** against **Hiders** in a bounded environment with obstacles. The brain of each agent is controlled by an artificial neural network running in the browser, and their behaviors are optimized over time through evolutionary pressure.

### 🧠 The Core Architecture

1. **Neural Network (The Brain):**
   * **Inputs:** Distance and angle to the nearest walls, obstacles, opponents, and teammates (Raycasting/egocentric vision paths).
   * **Outputs:** Continuous vectors for movement (Linear Velocity, Angular Velocity/Steering direction).
2. **Genetic Algorithm (The Evolution):**
   * **Fitness Function:**
     * **Hiders:** Rewarded for staying unseen, surviving the round, and maintaining distance from Seekers.
     * **Seekers:** Rewarded for catching Hiders quickly, minimizing time taken, and cooperative hunting/pinning strategies.
   * **Selection & Reproduction:** Top-performing agents are selected using evolutionary selection metrics. Their weights are crossed over and subjected to random mutations to form the next generation's brain population.

---

## 🚀 Features

* **Real-time Browser Evolution:** Watch agents transition from completely random movement to complex tactical behaviors right in your browser.
* **Dynamic Environment:** Randomized obstacle and agent spawn points to prevent memorization and enforce generalized spatial learning.
* **Neural Network Visualizer:** Real-time rendering of the active paths, weights, and nodes of the top-performing agent's brain.
* **Customization:** Easily tweak population sizes, mutation rates, game duration, and layer sizes directly via configuration values.

---

## 🛠️ Tech Stack

* **Runtime/Bundler:** Vite + TypeScript
* **Frontend/Rendering:** HTML5 Canvas / WebGL
* **State Management/Math:** Vector mathematics written natively in TypeScript for optimized matrix operations.

---

## 📁 Repository Structure

```text
├── src/                  # Application source code (Components, Simulation, NN, GA)
├── .env.example          # Example environment configuration file
├── .gitignore            # Git ignore file
├── index.html            # Main entrypoint webpage
├── metadata.json         # Project or configuration metadata
├── package.json          # Node dependencies and scripts
├── package-lock.json     # Locked versions of dependencies
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite bundler configuration
└── README.md             # This file
