/**
 * Node Network - Transport Topology
 *
 * 7 nodes (A-G) in a mesh = 1 gate.
 * Each node is spaced d_node = 10 km apart.
 * D_gate = n * d_node * g = 7 * 10 * 1 = 70 km total coverage.
 *
 * Travel Energy Model (from PDF):
 *   TE_km = 130 MJ/km = 1.3e8 J/km
 *   E_total = TE_km * D
 *   1 km ~ 1 household-day of energy
 *   CEE = 1 / TE_km
 *
 * Topology: heptagonal mesh with node D as central hub.
 *   Outer ring: A-B-C-E-F-G  (hexagonal ring)
 *   Hub: D connects to all outer nodes
 */

// ---------- Constants from the PDF ----------
const NODES_PER_GATE = 7;           // n
const NODE_SPACING_KM = 10;         // d_node (km)
const GATE_COUNT = 1;               // g
const TE_KM = 130;                  // Travel Energy per km (MJ/km)
const TE_KM_JOULES = 1.3e8;        // 1.3 * 10^8 J/km
const TIME_MULTIPLIER = 1.5;        // Fixed time multiplier

// Derived
const D_GATE = NODES_PER_GATE * NODE_SPACING_KM * GATE_COUNT; // 70 km

// ---------- 7-Node definitions ----------
// Positions laid out as a heptagon (unit coords 0-1) with D at center
const TAU = Math.PI * 2;
const outerNodes = ['A', 'B', 'C', 'E', 'F', 'G'];

function heptPos(index, total, cx, cy, rx, ry) {
  const angle = (index / total) * TAU - Math.PI / 2;
  return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
}

const NODES = {};
outerNodes.forEach((id, i) => {
  const pos = heptPos(i, 6, 0.5, 0.5, 0.42, 0.42);
  NODES[id] = {
    id,
    label: `Node ${id}`,
    x: pos.x,
    y: pos.y,
    heat: 0,
    load: 0,
  };
});
// D = central hub
NODES['D'] = { id: 'D', label: 'Node D (Hub)', x: 0.5, y: 0.5, heat: 0, load: 0 };

// ---------- Edges ----------
// Weights represent distance in km between adjacent nodes
const EDGES = [
  // Outer ring (each segment ~ d_node km)
  { from: 'A', to: 'B', weight: NODE_SPACING_KM },
  { from: 'B', to: 'C', weight: NODE_SPACING_KM },
  { from: 'C', to: 'E', weight: NODE_SPACING_KM },
  { from: 'E', to: 'F', weight: NODE_SPACING_KM },
  { from: 'F', to: 'G', weight: NODE_SPACING_KM },
  { from: 'G', to: 'A', weight: NODE_SPACING_KM },
  // Hub connections (shorter through center ~7 km)
  { from: 'D', to: 'A', weight: 7 },
  { from: 'D', to: 'B', weight: 7 },
  { from: 'D', to: 'C', weight: 7 },
  { from: 'D', to: 'E', weight: 7 },
  { from: 'D', to: 'F', weight: 7 },
  { from: 'D', to: 'G', weight: 7 },
  // Cross-links for mesh redundancy (reduce overheating / load on single path)
  { from: 'A', to: 'C', weight: 15 },
  { from: 'B', to: 'E', weight: 15 },
  { from: 'C', to: 'F', weight: 15 },
  { from: 'E', to: 'G', weight: 15 },
  { from: 'F', to: 'A', weight: 15 },
  { from: 'G', to: 'B', weight: 15 },
];

// ---------- Graph helpers ----------

function buildAdjacency() {
  const adj = {};
  Object.keys(NODES).forEach(id => { adj[id] = []; });
  EDGES.forEach(({ from, to, weight }) => {
    adj[from].push({ node: to, weight });
    adj[to].push({ node: from, weight });
  });
  return adj;
}

/**
 * Dijkstra shortest path with dynamic heat/load penalties.
 * Returns { path, cost (km), hops, distanceKm }
 */
export function findShortestPath(startId, endId, nodeStates = {}) {
  if (startId === endId) return { path: [startId], cost: 0, hops: 0, distanceKm: 0 };

  const adj = buildAdjacency();
  const dist = {};
  const prev = {};
  const visited = new Set();

  Object.keys(NODES).forEach(id => { dist[id] = Infinity; });
  dist[startId] = 0;

  while (true) {
    let current = null;
    let minDist = Infinity;
    for (const id of Object.keys(NODES)) {
      if (!visited.has(id) && dist[id] < minDist) {
        minDist = dist[id];
        current = id;
      }
    }
    if (current === null || current === endId) break;
    visited.add(current);

    for (const { node: neighbor, weight } of adj[current]) {
      if (visited.has(neighbor)) continue;
      // Dynamic penalty: hot/loaded nodes cost more to traverse
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

  const path = [];
  let node = endId;
  while (node !== undefined) {
    path.unshift(node);
    node = prev[node];
  }

  // Compute raw distance (without penalties) for energy calc
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
 * Travel Energy calculation from PDF:
 *   E_total = TE_km * D  (in MJ)
 *   householdDays ~ D_km
 *
 * With curvature dilation: actual energy scales by dilation factor.
 */
export function calculateTravelEnergy(distanceKm, curvatureRatio) {
  const dilationFactor = 1 / Math.max(0.01, 1 - curvatureRatio);
  const clampedDilation = Math.min(dilationFactor, 5);
  const energyMJ = TE_KM * distanceKm * clampedDilation;
  const householdDays = distanceKm * clampedDilation; // 1 km ~ 1 household-day
  return {
    energyMJ,
    energyGJ: energyMJ / 1000,
    householdDays,
    dilationFactor: clampedDilation,
    distanceKm,
  };
}

/**
 * Calculate traversal time (ms) for animation.
 * Uses path cost, curvature dilation, and fixed time multiplier.
 */
export function calculateTraversalTime(pathResult, curvatureRatio) {
  const { distanceKm, hops } = pathResult;
  const baseDuration = distanceKm * 30;  // 30ms per km
  const hopSwitchTime = hops * 150;      // 150ms per node switch
  const dilationFactor = 1 / Math.max(0.01, 1 - curvatureRatio);
  return (baseDuration + hopSwitchTime) * TIME_MULTIPLIER * Math.min(dilationFactor, 5);
}

/**
 * Apply heat and load to path nodes after traversal.
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
 * Cool down all nodes each tick.
 */
export function cooldownNodes(currentStates = {}) {
  const states = {};
  Object.keys(NODES).forEach(id => {
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

export {
  TIME_MULTIPLIER,
  NODES_PER_GATE,
  NODE_SPACING_KM,
  GATE_COUNT,
  D_GATE,
  TE_KM,
  TE_KM_JOULES,
};
