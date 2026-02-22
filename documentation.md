# Wormhole Gateway -- Documentation

## Overview

Wormhole Gateway is a real-time simulation of wormhole-based transport across a mesh network of nodes. A user opens a wormhole, selects source and destination nodes, and sends a probe through the optimal path. Energy is drawn automatically from atmospheric antimatter once the wormhole activates -- there is no manual recharge.

---

## 1. Transport Network Topology

### Structure

- **7 nodes** (N1 through N7) form **1 gate**.
- Nodes are arranged in a **heptagonal mesh** (7-sided ring) with cross-link shortcuts for redundancy.
- Every node has individual **heat** and **load** tracking.

### Edges

| Type        | Count | Distance                      |
|-------------|-------|-------------------------------|
| Ring edges  | 7     | 10 km each (adjacent nodes)   |
| Cross-links | 7     | 18 km each (skip-1 shortcuts) |

Cross-links provide alternate paths so traffic can be rerouted when a node overheats or becomes overloaded. This reduces strain on any single transport node.

### Node Management

Each node tracks two values that change dynamically:

- **Heat**: Increases when a probe passes through. High heat adds a cost penalty during route calculation, pushing future traffic toward cooler nodes.
- **Load**: Increases with transport activity. Terminal nodes (source and destination) receive more load than pass-through nodes.

Both values decay naturally over time via the cooldown function running every physics tick (50 ms).

---

## 2. Travel Energy Model

All formulas are derived from the Travel Energy Model paper.

### Constants

| Symbol    | Value              | Meaning                        |
|-----------|--------------------|--------------------------------|
| n         | 7                  | Nodes per gate                 |
| d_node    | 10 km              | Spacing between adjacent nodes |
| g         | 1                  | Number of gates                |
| TE_km     | 130 MJ/km          | Travel energy per kilometre    |
| TE_km (J) | 1.3 x 10^8 J/km   | Same value in joules           |

### Gate Coverage Distance (D)

```
D = n * d_node * g
D = 7 * 10 * 1 = 70 km
```

D is the **distance variable** representing the total spatial coverage of one gate. It is not a node label.

### Total Travel Energy (E_total)

```
E_total = TE_km * D_path
```

Where `D_path` is the actual shortest-path distance in km between the source and destination nodes. For example, if the shortest path from N1 to N3 uses the 18 km cross-link:

```
E_total = 130 * 18 = 2,340 MJ
```

### Household Energy Equivalence

```
1 km of travel energy ~ 1 household-day of energy consumption
```

A 20 km traversal consumes roughly the same energy a household uses in 20 days.

### Coverage Energy Efficiency (CEE)

```
CEE = 1 / TE_km = 1 / 130 = 0.00769 km/MJ
```

CEE measures how far you can travel per unit of energy. A lower TE_km means higher efficiency.

---

## 3. Shortest Path Algorithm

Routing uses **Dijkstra's algorithm** with dynamic weight penalties.

### Base Weights

Each edge has a base weight equal to its physical distance in km:
- Ring edges: 10 km
- Cross-links: 18 km

### Dynamic Penalties

When evaluating a neighbour node during pathfinding, the effective weight is:

```
effectiveWeight = baseWeight + (node.heat * 0.8) + (node.load * 0.5)
```

This means:
- A node at heat 5 adds a 4.0 km equivalent penalty.
- A node at load 6 adds a 3.0 km equivalent penalty.
- A hot and loaded node can add up to 12.0 km of penalty, causing the algorithm to route around it.

### Path Result

The algorithm returns:
- **path**: Ordered list of node IDs from source to destination.
- **cost**: Total weighted cost (includes penalties).
- **hops**: Number of edges traversed.
- **distanceKm**: Raw physical distance in km (without penalties), used for energy calculations.

---

## 4. Traversal Time

Traversal animation time is calculated from path distance and a fixed time multiplier:

```
baseDuration   = distanceKm * 30 ms
hopSwitchTime  = hops * 150 ms
totalTime      = (baseDuration + hopSwitchTime) * TIME_MULTIPLIER
```

| Parameter       | Value  |
|-----------------|--------|
| TIME_MULTIPLIER | 1.5    |
| Per-km rate     | 30 ms  |
| Per-hop switch  | 150 ms |

Traversal time scales linearly with distance and hop count. There is no dilation factor.

---

## 5. Energy System

### Antimatter Intake

Once the wormhole opens (gate status is "igniting" or "online"), energy is automatically drawn from atmospheric antimatter at a constant rate:

```
ANTIMATTER_INTAKE_RATE = 0.15 units per tick (50 ms)
```

This provides approximately 3 units/second of passive energy gain. There is no manual recharge -- the antimatter atmosphere is the sole energy source.

### Energy Consumption

The stabilisation field drains energy at:

```
STABILISATION_DRAIN = 0.2 units per tick
```

Net energy flow when active: `+0.15 - 0.20 = -0.05 units/tick`. The wormhole slowly drains but remains open for extended periods before energy runs out.

### Collapse Condition

If energy reaches 0, stabilisation turns off. Without stabilisation, curvature rises toward the radius threshold and the wormhole collapses.

---

## 6. Curvature and Stability

### Physics Loop (50 ms tick)

Each tick:

1. Curvature naturally increases by `DECAY_RATE = 0.05` (gravitational tendency to close).
2. If stabilised, curvature decreases by `STABILISE_FLUX = 0.3` (net: -0.25 per tick).
3. If a probe is in transit, curvature increases by `TRANSIT_STRESS * 0.1 = 0.2` per tick.

### Collapse

When curvature reaches the throat radius (default 10.0), the wormhole collapses. The ratio `curvature / radius` drives the visual constriction:

- **0.0** = fully open
- **1.0** = collapsed

---

## 7. Time Splice Configuration

From the original reference notes:

- The system uses a **fixed time multiplier** (1.5x) and a **manipulative system** for adjusting traversal parameters.
- Transport between nodes happens via teleportation. The routing algorithm distributes traffic to reduce overheating and balance load.
- Each gate contains a cluster of **7 nodes**, each managed individually with their own heat and load state.
- Gates are operated from node commands: the source node initiates transport, the destination node receives it.
- The shortest path algorithm dynamically routes around congested nodes to prevent bottlenecks.

---

## 8. File Structure

```
src/
  App.jsx                  Main app: physics loop, state, event handlers
  main.jsx                 React entry point
  index.css                All styles and responsive breakpoints
  lib/
    nodeNetwork.js         7-node mesh, Dijkstra, energy formulas
  components/
    Wormhole.jsx           Canvas-based toroidal wormhole rendering
    ControlPanel.jsx       Responsive control panel with stats and node map
    NodeMap.jsx            Canvas-based network topology visualisation
    Probe.jsx              Animated probe element
    StarField.jsx          Background star particle system
    Gate.jsx               Legacy gate wrapper (unused)
```

---

## 9. Key Formulas Summary

| Formula              | Expression                          | Result            |
|----------------------|-------------------------------------|--------------------|
| Gate coverage        | D = n * d_node * g                  | 70 km              |
| Travel energy        | E_total = 130 * D_path (MJ)        | Varies by route    |
| Household equivalent | ~1 km = ~1 household-day            | Linear             |
| Coverage efficiency  | CEE = 1 / 130                       | 0.00769 km/MJ     |
| Traversal time       | (D * 30 + hops * 150) * 1.5 ms     | Varies by route    |
| Dynamic edge cost    | base + heat * 0.8 + load * 0.5     | Varies by state    |
