/**
 * Node Network - Transport Topology
 * 
 * 5 nodes (A, B, C, D, E) arranged in a mesh with C as the central hub.
 * Each node contains 7 gates. Gates are operated from node command.
 * A->g is node A, n->m is node B.
 * 
 * Topology (from reference diagram):
 *   A --- B
 *   |\ /|
 *   | C  |
 *   |/ \|
 *   E --- D
 * 
 * C connects to all others (central hub).
 * Outer ring: A-B, B-D, D-E, E-A
 */

const GATES_PER_NODE = 7;
const TIME_MULTIPLIER = 1.5; // Fixed time multiplier from notes

// Node definitions with positions for visualization (unit circle layout)
const NODES = {
  A: { id: 'A', label: 'Node A', gates: GATES_PER_NODE, heat: 0, load: 0, x: 0.5, y: 0.05 },
  B: { id: 'B', label: 'Node B', gates: GATES_PER_NODE, heat: 0, load: 0, x: 0.95, y: 0.38 },
  C: { id: 'C', label: 'Node C (Hub)', gates: GATES_PER_NODE, heat: 0, load: 0, x: 0.5, y: 0.42 },
  D: { id: 'D', label: 'Node D', gates: GATES_PER_NODE, heat: 0, load: 0, x: 0.78, y: 0.85 },
  E: { id: 'E', label: 'Node E', gates: GATES_PER_NODE, heat: 0, load: 0, x: 0.22, y: 0.85 },
};

// Edge weights represent traversal cost (distance + load factor)
// Lower weight = faster path
const EDGES = [
  // Outer ring
  { from: 'A', to: 'B', weight: 3 },
  { from: 'B', to: 'D', weight: 3 },
  { from: 'D', to: 'E', weight: 3 },
  { from: 'E', to: 'A', weight: 3 },
  // Hub connections (shorter through center)
  { from: 'C', to: 'A', weight: 2 },
  { from: 'C', to: 'B', weight: 2 },
  { from: 'C', to: 'D', weight: 2 },
  { from: 'C', to: 'E', weight: 2 },
];

/**
 * Build adjacency list from edges (undirected graph)
 */
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
 * Dijkstra's shortest path algorithm
 * Returns { path: string[], cost: number, hops: number }
 */
export function findShortestPath(startId, endId, nodeStates = {}) {
  if (startId === endId) return { path: [startId], cost: 0, hops: 0 };

  const adj = buildAdjacency();
  const dist = {};
  const prev = {};
  const visited = new Set();

  Object.keys(NODES).forEach(id => { dist[id] = Infinity; });
  dist[startId] = 0;

  while (true) {
    // Find unvisited node with smallest distance
    let current = null;
    let minDist = Infinity;
    Object.keys(NODES).forEach(id => {
      if (!visited.has(id) && dist[id] < minDist) {
        minDist = dist[id];
        current = id;
      }
    });

    if (current === null || current === endId) break;
    visited.add(current);

    // Relax neighbors
    adj[current].forEach(({ node: neighbor, weight }) => {
      if (visited.has(neighbor)) return;

      // Dynamic weight: add heat/load penalty to reduce overheating
      const state = nodeStates[neighbor] || { heat: 0, load: 0 };
      const heatPenalty = state.heat * 0.5;
      const loadPenalty = state.load * 0.3;
      const dynamicWeight = weight + heatPenalty + loadPenalty;

      const newDist = dist[current] + dynamicWeight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = current;
      }
    });
  }

  // Reconstruct path
  if (dist[endId] === Infinity) return { path: [], cost: Infinity, hops: 0 };

  const path = [];
  let node = endId;
  while (node !== undefined) {
    path.unshift(node);
    node = prev[node];
  }

  return {
    path,
    cost: dist[endId],
    hops: path.length - 1,
  };
}

/**
 * Calculate traversal time using the fixed time multiplier
 * Accounts for: path cost, curvature dilation, gate switching
 */
export function calculateTraversalTime(pathResult, curvatureRatio) {
  const { cost, hops } = pathResult;
  const baseDuration = cost * 400; // ms per cost unit
  const gateSwitchTime = hops * 200; // 200ms per gate switch
  const dilationFactor = 1 / Math.max(0.01, 1 - curvatureRatio);
  return (baseDuration + gateSwitchTime) * TIME_MULTIPLIER * Math.min(dilationFactor, 5);
}

/**
 * Apply heat and load to nodes along a traversal path
 * Returns updated node states
 */
export function applyTraversalLoad(path, currentStates = {}) {
  const states = { ...currentStates };

  path.forEach((nodeId, i) => {
    const prev = states[nodeId] || { heat: 0, load: 0 };
    states[nodeId] = {
      heat: Math.min(10, prev.heat + 1.5), // Traversal heats up the node
      load: Math.min(10, prev.load + (i === 0 || i === path.length - 1 ? 2 : 1)), // Entry/exit nodes get more load
    };
  });

  return states;
}

/**
 * Cool down nodes over time (call each tick)
 * Returns updated node states
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

export function getNodes() {
  return { ...NODES };
}

export function getEdges() {
  return [...EDGES];
}

export { TIME_MULTIPLIER, GATES_PER_NODE };
