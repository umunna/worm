/**
 * Node Network -- Transport Topology
 *
 * From the Travel Energy Model (PDF):
 *
 *   7 nodes = 1 gate.
 *   n = 7 nodes per gate
 *   d_node = 10 km spacing between nodes
 *   g = 1 gate
 *   D = n * d_node * g = 70 km   (total spatial coverage distance)
 *
 *   TE_km = 130 MJ/km = 1.3e8 J/km
 *   E_total = TE_km * D
 *   1 km ~ 1 household-day of energy
 *   CEE = 1 / TE_km  (Coverage Energy Efficiency)
 *
 * Topology: 7 nodes (N1-N7) in a heptagonal mesh.
 *   - Outer ring connects adjacent nodes.
 *   - Cross-links add redundancy to reduce overheating / load on any single path.
 *   - Dijkstra shortest path with dynamic heat/load penalties.
 */

// ---------- Constants from PDF ----------
const NODES_PER_GATE = 7;           // n
const NODE_SPACING_KM = 10;         // d_node (km)
const GATE_COUNT = 1;               // g
const TE_KM = 130;                  // Travel Energy per km (MJ/km)
const TE_KM_JOULES = 1.3e8;        // 1.3 * 10^8 J/km
const TIME_MULTIPLIER = 1.5;        // Fixed time multiplier from notes

// D = n * d_node * g  (total spatial coverage distance)
const D_GATE = NODES_PER_GATE * NODE_SPACING_KM * GATE_COUNT; // 70 km

// ---------- 7-Node heptagonal layout ----------
const TAU = Math.PI * 2;

function heptPos(index, total, cx, cy, radius) {
  // Offset by -90deg so first node sits at top
  const angle = (index / total) * TAU - Math.PI / 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

const NODE_IDS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'];
const NODES = {};

NODE_IDS.forEach((id, i) => {
  const pos = heptPos(i, 7, 0.5, 0.5, 0.4);
  NODES[id] = {
    id,
    label: id,
    x: pos.x,
    y: pos.y,
    heat: 0,
    load: 0,
  };
});

// ---------- Edges ----------
// Adjacent ring edges: each ~d_node km apart
// Cross-link edges: skip-1 connections for mesh redundancy
const EDGES = [
  // Outer ring (adjacent, 10 km each)
  { from: 'N1', to: 'N2', weight: NODE_SPACING_KM },
  { from: 'N2', to: 'N3', weight: NODE_SPACING_KM },
  { from: 'N3', to: 'N4', weight: NODE_SPACING_KM },
  { from: 'N4', to: 'N5', weight: NODE_SPACING_KM },
  { from: 'N5', to: 'N6', weight: NODE_SPACING_KM },
  { from: 'N6', to: 'N7', weight: NODE_SPACING_KM },
  { from: 'N7', to: 'N1', weight: NODE_SPACING_KM },
  // Cross-links (skip-1, ~18 km -- shorter than going 2 hops on ring)
  { from: 'N1', to: 'N3', weight: 18 },
  { from: 'N2', to: 'N4', weight: 18 },
  { from: 'N3', to: 'N5', weight: 18 },
  { from: 'N4', to: 'N6', weight: 18 },
  { from: 'N5', to: 'N7', weight: 18 },
  { from: 'N6', to: 'N1', weight: 18 },
  { from: 'N7', to: 'N2', weight: 18 },
];

// ---------- Graph helpers ----------

function buildAdjacency() {
  const adj = {};
  NODE_IDS.forEach(id => { adj[id] = []; });
  EDGES.forEach(({ from, to, weight }) => {
    adj[from].push({ node: to, weight });
    adj[to].push({ node: from, weight });
  });
  return adj;
}

/**
 * Dijkstra shortest path with dynamic heat/load penalties.
 * Penalizes hot and loaded nodes so traffic distributes across the mesh,
 * reducing overheating and balancing load.
 *
 * Returns { path, cost, hops, distanceKm }
 */
export function findShortestPath(startId, endId, nodeStates = {}) {
  if (startId === endId) return { path: [startId], cost: 0, hops: 0, distanceKm: 0 };

  const adj = buildAdjacency();
  const dist = {};
  const prev = {};
  const visited = new Set();

  NODE_IDS.forEach(id => { dist[id] = Infinity; });
  dist[startId] = 0;

  while (true) {
    let current = null;
    let minDist = Infinity;
    for (const id of NODE_IDS) {
      if (!visited.has(id) && dist[id] < minDist) {
        minDist = dist[id];
        current = id;
      }
    }
    if (current === null || current === endId) break;
    visited.add(current);

    for (const { node: neighbor, weight } of adj[current]) {
      if (visited.has(neighbor)) continue;
      // Dynamic penalty: hot/loaded nodes cost more
      const state = nodeStates[neighbor] || { heat: 0, load: 0 };
      const heatPenalty = state.heat * 0.8;
      const loadPenalty = state.load * 0.5;
      const dynamicWeight = weight + heatPenalty + loadPenalty;

      const newDist = dist[current] + dynamicWeight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = current;
      }
    }
  }

  if (dist[endId] === Infinity) return { path: [], cost: Infinity, hops: 0, distanceKm: 0 };

  // Reconstruct path
  const path = [];
  let node = endId;
  while (node !== undefined) {
    path.unshift(node);
    node = prev[node];
  }

  // Raw distance in km (without penalties) for energy calculation
  let rawKm = 0;
  const rawAdj = buildAdjacency();
  for (let i = 0; i < path.length - 1; i++) {
    const edge = rawAdj[path[i]].find(e => e.node === path[i + 1]);
    if (edge) rawKm += edge.weight;
  }

  return {
    path,
    cost: dist[endId],
    hops: path.length - 1,
    distanceKm: rawKm,
  };
}

/**
 * Travel Energy calculation -- directly from PDF formulas:
 *
 *   E_total = TE_km * D          (Eq. 10)
 *   household-days ~ D_km        (Eq. 5-6)
 *   CEE = 1 / TE_km              (Eq. 22)
 *
 * No dilation. Straightforward linear scaling.
 */
export function calculateTravelEnergy(distanceKm) {
  const energyMJ = TE_KM * distanceKm;
  const energyGJ = energyMJ / 1000;
  const householdDays = distanceKm;  // 1 km ~ 1 household-day
  const cee = 1 / TE_KM;            // Coverage Energy Efficiency

  return {
    distanceKm,
    energyMJ,
    energyGJ,
    householdDays,
    cee,
  };
}

/**
 * Calculate traversal animation time (ms).
 * Uses path distance and fixed time multiplier.
 */
export function calculateTraversalTime(pathResult) {
  const { distanceKm, hops } = pathResult;
  const baseDuration = distanceKm * 30;   // 30ms per km
  const hopSwitchTime = hops * 150;       // 150ms per node switch
  return (baseDuration + hopSwitchTime) * TIME_MULTIPLIER;
}

/**
 * Apply heat and load to nodes along the traversal path.
 * Terminal nodes (source/dest) receive more load.
 */
export function applyTraversalLoad(path, currentStates = {}) {
  const states = { ...currentStates };
  path.forEach((nodeId, i) => {
    const prev = states[nodeId] || { heat: 0, load: 0 };
    const isTerminal = i === 0 || i === path.length - 1;
    states[nodeId] = {
      heat: Math.min(10, prev.heat + (isTerminal ? 2.0 : 1.2)),
      load: Math.min(10, prev.load + (isTerminal ? 2.5 : 1.0)),
    };
  });
  return states;
}

/**
 * Cool down all nodes each tick (called in physics loop).
 */
export function cooldownNodes(currentStates = {}) {
  const states = {};
  NODE_IDS.forEach(id => {
    const prev = currentStates[id] || { heat: 0, load: 0 };
    states[id] = {
      heat: Math.max(0, prev.heat - 0.02),
      load: Math.max(0, prev.load - 0.015),
    };
  });
  return states;
}

export function getNodes() { return { ...NODES }; }
export function getEdges() { return [...EDGES]; }
export function getNodeIds() { return [...NODE_IDS]; }

export {
  TIME_MULTIPLIER,
  NODES_PER_GATE,
  NODE_SPACING_KM,
  GATE_COUNT,
  D_GATE,
  TE_KM,
  TE_KM_JOULES,
  NODE_IDS,
};
