/**
 * Scalable Node Network -- Transport Topology
 *
 * Architecture:
 *   7 nodes = 1 gate (heptagonal mesh).
 *   Gates connect to each other through boundary nodes.
 *   Scales from 1 gate (7 nodes) to 7000+ gates (49,000+ nodes).
 *
 * From the Travel Energy Model (PDF):
 *   n = 7 nodes per gate
 *   d_node = 10 km spacing between nodes
 *   g = gate count
 *   D = n * d_node * g  (total spatial coverage distance)
 *   TE_km = 130 MJ/km = 1.3e8 J/km
 *   E_total = TE_km * D
 *   1 km ~ 1 household-day of energy
 *   CEE = 1 / TE_km
 *
 * Pathfinding: Dijkstra with min-heap (O((V+E) log V)).
 * Supports dynamic heat/load penalties to balance traffic.
 */

// ---------- Constants from PDF ----------
const NODES_PER_GATE = 7;
const NODE_SPACING_KM = 10;
const TE_KM = 130;
const TE_KM_JOULES = 1.3e8;
const TIME_MULTIPLIER = 1.5;
const TAU = Math.PI * 2;

// ---------- Min-Heap (priority queue for Dijkstra) ----------
class MinHeap {
  constructor() { this.data = []; }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].priority < this.data[parent].priority) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.data[left].priority < this.data[smallest].priority) smallest = left;
      if (right < n && this.data[right].priority < this.data[smallest].priority) smallest = right;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

// ---------- Network generation ----------

/**
 * Generate a multi-gate network.
 *   gateCount = 1  -->  7 nodes (demo)
 *   gateCount = 7000 --> 49,000 nodes
 *
 * Layout: gates arranged in a grid-like topology.
 * Each gate's 7 nodes form a heptagonal mesh.
 * Adjacent gates share boundary connections.
 */
function generateNetwork(gateCount) {
  const nodes = {};
  const edges = [];
  const nodeIds = [];
  const gateMap = {}; // gateIndex -> [nodeIds]

  for (let g = 0; g < gateCount; g++) {
    const gateNodes = [];

    // Create 7 nodes for this gate
    for (let n = 0; n < NODES_PER_GATE; n++) {
      const id = gateCount === 1 ? `N${n + 1}` : `G${g + 1}_N${n + 1}`;
      const angle = (n / NODES_PER_GATE) * TAU - Math.PI / 2;

      // Position within a virtual grid cell
      const gridCols = Math.ceil(Math.sqrt(gateCount));
      const gCol = g % gridCols;
      const gRow = Math.floor(g / gridCols);
      const cellCx = (gCol + 0.5) / gridCols;
      const cellCy = (gRow + 0.5) / Math.ceil(gateCount / gridCols);
      const cellR = 0.3 / gridCols;

      nodes[id] = {
        id,
        label: gateCount === 1 ? `N${n + 1}` : `G${g + 1}:${n + 1}`,
        x: cellCx + Math.cos(angle) * cellR,
        y: cellCy + Math.sin(angle) * cellR,
        gate: g,
        localIndex: n,
        heat: 0,
        load: 0,
      };

      nodeIds.push(id);
      gateNodes.push(id);
    }

    gateMap[g] = gateNodes;

    // Intra-gate edges: ring + skip-1 cross-links
    for (let n = 0; n < NODES_PER_GATE; n++) {
      const from = gateNodes[n];
      const toRing = gateNodes[(n + 1) % NODES_PER_GATE];
      edges.push({ from, to: toRing, weight: NODE_SPACING_KM });

      const toCross = gateNodes[(n + 2) % NODES_PER_GATE];
      edges.push({ from, to: toCross, weight: 18 });
    }
  }

  // Inter-gate edges: connect boundary nodes of adjacent gates
  if (gateCount > 1) {
    const gridCols = Math.ceil(Math.sqrt(gateCount));
    const INTER_GATE_KM = NODE_SPACING_KM * 2; // 20km between gates

    for (let g = 0; g < gateCount; g++) {
      const gCol = g % gridCols;
      const gRow = Math.floor(g / gridCols);

      // Right neighbor
      if (gCol + 1 < gridCols && g + 1 < gateCount) {
        const rightGate = g + 1;
        // Connect node 2 of this gate to node 6 of right gate (east-facing to west-facing)
        edges.push({
          from: gateMap[g][2],
          to: gateMap[rightGate][5],
          weight: INTER_GATE_KM,
        });
        edges.push({
          from: gateMap[g][3],
          to: gateMap[rightGate][6],
          weight: INTER_GATE_KM,
        });
      }

      // Bottom neighbor
      const bottomGate = g + gridCols;
      if (bottomGate < gateCount) {
        // Connect node 4 of this gate to node 0 of bottom gate
        edges.push({
          from: gateMap[g][3],
          to: gateMap[bottomGate][0],
          weight: INTER_GATE_KM,
        });
        edges.push({
          from: gateMap[g][4],
          to: gateMap[bottomGate][1],
          weight: INTER_GATE_KM,
        });
      }
    }
  }

  return { nodes, edges, nodeIds, gateMap, gateCount };
}

// ---------- Build adjacency list ----------
function buildAdjacency(edges, nodeIds) {
  const adj = {};
  nodeIds.forEach(id => { adj[id] = []; });
  edges.forEach(({ from, to, weight }) => {
    adj[from].push({ node: to, weight });
    adj[to].push({ node: from, weight });
  });
  return adj;
}

// ---------- Dijkstra with min-heap ----------
/**
 * O((V + E) log V) shortest path.
 * Handles 49,000+ nodes efficiently.
 * Dynamic heat/load penalties balance traffic across the mesh.
 */
function dijkstra(startId, endId, adj, nodeIds, nodeStates = {}) {
  if (startId === endId) return { path: [startId], cost: 0, hops: 0, distanceKm: 0 };

  const dist = {};
  const prev = {};
  const visited = new Set();
  nodeIds.forEach(id => { dist[id] = Infinity; });
  dist[startId] = 0;

  const heap = new MinHeap();
  heap.push({ id: startId, priority: 0 });

  while (heap.size > 0) {
    const { id: current } = heap.pop();

    if (current === endId) break;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adj[current] || [];
    for (const { node: neighbor, weight } of neighbors) {
      if (visited.has(neighbor)) continue;

      const state = nodeStates[neighbor] || { heat: 0, load: 0 };
      const heatPenalty = state.heat * 0.8;
      const loadPenalty = state.load * 0.5;
      const dynamicWeight = weight + heatPenalty + loadPenalty;

      const newDist = dist[current] + dynamicWeight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = current;
        heap.push({ id: neighbor, priority: newDist });
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

  // Raw distance (without penalties) for energy calculation
  let rawKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = adj[path[i]].find(e => e.node === path[i + 1]);
    if (edge) rawKm += edge.weight;
  }

  return { path, cost: dist[endId], hops: path.length - 1, distanceKm: rawKm };
}

// ---------- Network instance ----------
// Default: 1 gate = 7 nodes for the demo.
// The engine can be re-initialized with createNetwork(7000) for full scale.
let _network = generateNetwork(1);
let _adj = buildAdjacency(_network.edges, _network.nodeIds);

/**
 * Initialize (or re-initialize) the network with a given gate count.
 * Call this to scale up: createNetwork(7000) for 49,000 nodes.
 */
export function createNetwork(gateCount) {
  _network = generateNetwork(gateCount);
  _adj = buildAdjacency(_network.edges, _network.nodeIds);
  return _network;
}

// ---------- Public API ----------

export function findShortestPath(startId, endId, nodeStates = {}) {
  return dijkstra(startId, endId, _adj, _network.nodeIds, nodeStates);
}

/**
 * Travel Energy: E_total = TE_km * D
 * Pure linear scaling.
 */
export function calculateTravelEnergy(distanceKm) {
  const energyMJ = TE_KM * distanceKm;
  const energyGJ = energyMJ / 1000;
  const householdDays = distanceKm;
  const cee = 1 / TE_KM;
  return { distanceKm, energyMJ, energyGJ, householdDays, cee };
}

/**
 * Traversal animation time (ms). Distance-based with fixed multiplier.
 */
export function calculateTraversalTime(pathResult) {
  const { distanceKm, hops } = pathResult;
  const baseDuration = distanceKm * 30;
  const hopSwitchTime = hops * 150;
  return (baseDuration + hopSwitchTime) * TIME_MULTIPLIER;
}

/**
 * Apply heat and load to traversed nodes.
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
 * Cool down nodes each tick.
 */
export function cooldownNodes(currentStates = {}) {
  const states = {};
  for (const id of _network.nodeIds) {
    const prev = currentStates[id] || { heat: 0, load: 0 };
    states[id] = {
      heat: Math.max(0, prev.heat - 0.02),
      load: Math.max(0, prev.load - 0.015),
    };
  }
  return states;
}

// Accessors
export function getNodes() { return _network.nodes; }
export function getEdges() { return _network.edges; }
export function getNodeIds() { return _network.nodeIds; }
export function getGateMap() { return _network.gateMap; }
export function getGateCount() { return _network.gateCount; }
export function getTotalNodes() { return _network.nodeIds.length; }

/**
 * Get the D (coverage distance) for the current network.
 */
export function getCoverageDistance() {
  return NODES_PER_GATE * NODE_SPACING_KM * _network.gateCount;
}

export {
  TIME_MULTIPLIER,
  NODES_PER_GATE,
  NODE_SPACING_KM,
  TE_KM,
  TE_KM_JOULES,
};
