# Wormhole Gateway -- Documentation

## Overview

Wormhole Gateway is a real-time simulation of wormhole-based transport across a mesh network of nodes. A user opens a wormhole, selects source and destination nodes, and sends probes through the shortest available path. Energy is drawn automatically from atmospheric antimatter once the wormhole activates. The system supports scaling from a single 7-node gate up to 7,000+ gates (49,000+ nodes).

---

## 1. Transport Network Topology

### Why 7 Nodes Per Gate

The reference notes specify that each gate contains a cluster of 7 nodes with individual management. Seven was chosen because:

- A heptagonal mesh (7-sided ring) provides each node with 2 ring neighbours and 2 cross-link shortcuts, giving 4 alternate paths per node. This redundancy means no single node failure can isolate part of the network.
- 7 is the smallest odd prime that produces a fully connected mesh where skip-1 cross-links do not overlap with ring edges. With 5 nodes, cross-links duplicate ring edges. With 6, the network splits into even/odd partitions under load. 7 avoids both problems.
- The reference notes state "each node contains 7 gates" and "7 nodes = 1 gate." This is the fundamental unit of the topology.

### Structure

- **7 nodes** (N1 through N7) form **1 gate**.
- Nodes are arranged in a **heptagonal mesh** with ring edges and skip-1 cross-link shortcuts.
- Each node has individual **heat** and **load** tracking for traffic management.
- The architecture is designed to reduce overheating and reduce load on any single transport node, as specified in the reference notes.

### Edges

| Type        | Count per gate | Distance | Purpose                                    |
|-------------|---------------|----------|--------------------------------------------|
| Ring edges  | 7             | 10 km    | Adjacent node connections (backbone)       |
| Cross-links | 7             | 18 km    | Skip-1 shortcuts (load balancing / bypass) |

Cross-links exist because the reference notes call for reducing overheating and load. When a ring-adjacent node is hot, Dijkstra routes through the 18 km cross-link instead. The 18 km distance is derived from the chord length of a skip-1 connection in a regular heptagon inscribed in a circle of radius `d_node`: approximately `2 * 10 * sin(2*PI/7)` = 17.8 km, rounded to 18 km.

### Scaling: 7,000 Gates and Beyond

The reference notes state the system should handle 7,000 gates (49,000+ nodes). The network engine supports this via `createNetwork(gateCount)`:

- Gates are arranged in a grid topology.
- Adjacent gates connect through boundary nodes with 20 km inter-gate edges.
- The min-heap Dijkstra runs at O((V+E) log V), which handles 49,000 nodes efficiently.
- The current demo runs with 1 gate (7 nodes) for visualisation. The engine can be re-initialised to any scale.

### Node Management

Each node tracks two values that change with traffic:

- **Heat**: Rises when a probe passes through. Adds a routing penalty (`heat * 0.8 km equivalent`) so future probes avoid hot nodes.
- **Load**: Rises with transport activity. Terminal nodes (source/destination) receive more load than pass-through nodes. Adds a routing penalty (`load * 0.5 km equivalent`).

Both decay naturally over time. This implements the reference notes' requirement to "reduce overheating" and "reduce load on transport node."

---

## 2. Travel Energy Model

All formulas come directly from the Travel Energy Model paper (PDF). The reasoning for each:

### Travel Energy Constant

From the paper, Equation 2:

```
TE_km = 130 MJ/km = 1.3 * 10^8 J/km
```

**Why 130 MJ/km:** The paper derives this from empirical aircraft cruise data: ~30 kg fuel per 10 km at 43 MJ/kg energy density. This gives `(30 * 43) / 10 = 129 MJ/km`, rounded to 130. This represents the propulsion energy required to traverse one kilometre under steady-state conditions.

### Gate Coverage Distance (D)

From the paper, Equations 7-9:

```
D = n * d_node * g
D = 7 * 10 * 1 = 70 km  (for 1 gate)
D = 7 * 10 * 7000 = 490,000 km  (for 7,000 gates)
```

**Why this formula:** D represents the total spatial coverage of the gate network. Each gate covers `n * d_node` km of space. With `g` gates, total coverage scales linearly. D is a distance variable, not a node label.

**Why d_node = 10 km:** The paper uses this as the standard spacing between adjacent sensor nodes in the gate topology (Equation 8). It represents the physical distance light or a signal must cross between two adjacent nodes.

### Total Travel Energy

From the paper, Equations 10-11:

```
E_total = TE_km * D_path
```

Where `D_path` is the shortest-path distance between source and destination. **Why linear scaling:** The paper establishes (Equation 17) that under steady-state motion, energy scales linearly with distance: `E_total proportional to D`. There is no quadratic or exponential term because the model assumes constant cruise conditions (no acceleration/deceleration phases).

### Household Energy Equivalence

From the paper, Equations 4-6:

```
Typical household daily consumption: 30-36 kWh = 108-130 MJ
Therefore: 1 km of travel energy ~ 1 household-day
E_household_days = D_km
```

**Why this matters:** It gives an intuitive human-scale reference. A 20 km probe transit costs roughly what a household uses in 20 days. At the 7,000-gate scale, a full-network traversal of 490,000 km would cost ~1,342 household-years of energy.

### Coverage Energy Efficiency (CEE)

From the paper, Equations 21-22:

```
CEE = D / E_total = 1 / TE_km = 1 / 130 = 0.00769 km/MJ
```

**Why this metric:** CEE measures how far you can travel per unit of energy. It is constant regardless of distance because the scaling is linear. A lower TE_km means higher CEE.

---

## 3. Energy System

### Why Antimatter Auto-Intake

The user requirement states: "once wormhole starts, energy is being injected, antimatter from the atmosphere is then sucked in, this then creates the curvature for stabilization." This means:

1. There is no manual recharge button.
2. Energy comes from a constant source (atmospheric antimatter).
3. The intake itself is what creates the curvature needed to keep the wormhole open.

### Energy Bar Mapping

The 0-100% energy bar maps to a fixed MJ capacity:

```
ENERGY_CAPACITY_MJ = 23,400 MJ
```

**Why 23,400 MJ:** This was calibrated so a single gate (7 nodes) can support 5-8 probe transits on a full bar. The longest single-gate path is ~36 km (3 ring hops + cross-link), costing `130 * 36 = 4,680 MJ`. Setting capacity to `5 * 4,680 = 23,400 MJ` means one max-distance probe costs ~20% of the bar. Shorter paths (10-18 km) cost 5-10%. This allows multiple probes before the bar depletes, with antimatter intake continuously replenishing between transits.

### Energy Rates

Per physics tick (50 ms, 20 ticks/sec):

| Rate                | Per tick | Per second | When active                       |
|---------------------|----------|------------|-----------------------------------|
| Antimatter intake   | +0.18    | +3.6%/sec  | Gate alive (any state except off) |
| Stabilisation drain | -0.06    | -1.2%/sec  | Stabiliser active                 |
| Transit extra drain | -0.08    | -1.6%/sec  | Probe in transit                  |

**Net rates:**

| State          | Net/sec  | Time to recover 20% |
|----------------|----------|---------------------|
| Online idle    | +2.4%    | ~8 seconds          |
| During transit | +0.8%    | ~25 seconds         |
| Recharging     | +3.6%    | ~6 seconds          |

**Why these values:** The intake must exceed the stabilisation drain so the system remains sustainable during idle operation (+2.4%/sec net). During transit, the combined drain nearly matches intake (+0.8%/sec net) so energy barely changes -- the upfront cost is what creates the visible drop. During recharging (stabiliser off), pure intake at +3.6%/sec rapidly refills the bar back to the 30% threshold where stabilisation auto-resumes.

### Upfront Transit Cost

When a probe is sent, energy is deducted immediately:

```
costPercent = (E_total / ENERGY_CAPACITY_MJ) * 100
costPercent = (TE_km * D_path / 23,400) * 100
```

Example: N1 to N5 via shortest path (28 km):

```
E_total = 130 * 28 = 3,640 MJ
costPercent = (3,640 / 23,400) * 100 = 15.6%
```

This is the primary energy drain mechanism. The continuous transit drain on top is secondary.

### Recharge Cycle

When energy hits 0% during stabilisation:

1. Stabiliser turns off (curvature starts drifting upward).
2. Gate enters `'recharging'` state (not offline -- the wormhole persists).
3. Antimatter intake continues at +3.6%/sec with no drain.
4. At 30% energy, stabiliser auto-resumes and gate goes back online.
5. This takes approximately 8 seconds.

**Why 30% threshold:** Ensures enough buffer for at least one short probe immediately after recovery, preventing an instant re-collapse cycle.

### Closing the Wormhole

The CLOSE WORMHOLE button allows manual shutdown when:
- Gate is online or recharging
- No probe is currently in transit

On close: gate status returns to offline, stabiliser deactivates, curvature resets to zero, and all active path data clears. The wormhole can be reopened with the standard antimatter injection sequence.

**Why this is needed:** Since energy intake is constant and the system is self-sustaining, without a close button the wormhole would run indefinitely. The close button gives the operator control to shut down after all probes have been sent.

---

## 4. Shortest Path Algorithm

### Why Dijkstra

The reference notes require an algorithm for "shortest path between nodes." Dijkstra is the standard choice for weighted graphs with non-negative edges. The min-heap implementation runs at O((V+E) log V), which scales to 49,000+ nodes.

### Dynamic Penalties

```
effectiveWeight = baseWeight + (node.heat * 0.8) + (node.load * 0.5)
```

**Why heat * 0.8 and load * 0.5:** Heat is weighted higher because overheating is the primary concern from the reference notes ("reduce overheating"). A node at heat 10 adds 8 km of penalty -- nearly a full ring edge -- which strongly diverts traffic. Load is weighted lower because some load is acceptable; only sustained overload should trigger rerouting.

---

## 5. Traversal Time

```
baseDuration   = distanceKm * 30 ms
hopSwitchTime  = hops * 150 ms
totalTime      = (baseDuration + hopSwitchTime) * TIME_MULTIPLIER
```

| Parameter       | Value | Reasoning                                              |
|-----------------|-------|--------------------------------------------------------|
| TIME_MULTIPLIER | 1.5   | From reference notes: "fixed time multiplier"          |
| Per-km rate     | 30 ms | Visual pacing: 10 km = 300 ms base, perceptible but fast |
| Per-hop switch  | 150 ms| Node handoff delay as probe transfers between nodes    |

---

## 6. Curvature and Stability

### Physics Loop (50 ms tick)

Each tick:

1. Curvature increases by `DECAY_RATE = 0.05` (natural tendency to close).
2. If stabilised, curvature decreases by `STABILIZE_FLUX = 0.3` (net: -0.25 per tick, keeping it open).
3. If a probe is in transit, curvature increases by `TRANSIT_STRESS * 0.1 = 0.2` per tick (mass passing through the throat adds stress).

### Collapse Condition

When curvature reaches the throat radius (10.0), the wormhole collapses:

```
ratio = curvature / radius
0.0 = fully open
1.0 = collapsed
```

---

## 7. Antimatter Injection Phase

Before a wormhole can open, antimatter must be injected. This is a 2.5-second visual phase where:

1. Dark, near-invisible particles stream inward (antimatter is invisible -- you only see where space bends).
2. Energy accumulates from intake with no drain.
3. After injection completes, the wormhole ignites and forms the toroidal shape.
4. After 3 more seconds of ignition, the gate goes fully online.

**Why a separate phase:** The user requirement states "before a wormhole is properly started, antimatter needs to be injected." The injection creates the initial curvature that allows the wormhole to form.

---

## 8. Time Splice Configuration

From the original reference notes:

- **Fixed time multiplier** (1.5x) applied to all traversal calculations.
- **Manipulative system**: Dynamic heat/load penalties adjust routing in real time.
- **Teleportation between transport nodes**: Probes transfer instantly at each node; the time cost comes from distance and hop switching.
- **Nodes have individual management**: Each of the 7 nodes per gate tracks its own heat and load independently.
- **Gates operated from node commands**: Source node initiates, destination receives. Route is computed from source to destination using the full mesh topology.

---

## 9. Key Formulas Summary

| Formula              | Expression                          | Result (1 gate) | Source     |
|----------------------|-------------------------------------|-----------------|------------|
| Gate coverage        | D = n * d_node * g                  | 70 km           | PDF Eq. 7  |
| Travel energy        | E_total = 130 * D_path              | Varies          | PDF Eq. 10 |
| Household equivalent | ~1 km = ~1 household-day            | Linear          | PDF Eq. 5  |
| Coverage efficiency  | CEE = 1 / 130                       | 0.00769 km/MJ   | PDF Eq. 22 |
| Traversal time       | (D*30 + hops*150) * 1.5 ms          | Varies          | Ref notes  |
| Dynamic edge cost    | base + heat*0.8 + load*0.5          | Varies          | Ref notes  |
| Energy bar cost      | (TE_km * D_path / 23,400) * 100 %   | ~15% per trip   | Calibrated |
| Bar capacity         | 23,400 MJ = 100%                    | Fixed           | Calibrated |

---

## 10. File Structure

```
src/
  App.jsx                  Main app: physics loop, state, handlers
  main.jsx                 React entry point
  index.css                All styles and responsive breakpoints
  lib/
    nodeNetwork.js         Scalable mesh generator, min-heap Dijkstra, energy formulas
  components/
    Wormhole.jsx           Canvas toroidal wormhole with injection/recharging phases
    ControlPanel.jsx       Responsive control panel with open/close/send buttons
    NodeMap.jsx            Canvas network topology visualisation
    Probe.jsx              Animated probe element
    StarField.jsx          Background star particle system
documentation.md           This file
```
