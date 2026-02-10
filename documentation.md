# Wormhole Simulation: Theoretical Physics Documentation

This document outlines the mathematical framework and relativistic physics concepts implemented in the `Wormhole-Simulation` project. The simulation models a traversable wormhole based on the **Morris-Thorne metric**.

## 1. The Morris-Thorne Metric

The spacetime geometry of a static, spherically symmetric wormhole is described by the line element:

$$ ds^2 = -e^{2\Phi(r)}dt^2 + \frac{dr^2}{1 - \frac{b(r)}{r}} + r^2(d\theta^2 + \sin^2\theta d\phi^2) $$

Where:
- **$r$**: The radial coordinate (defined from $-\infty$ to $+\infty$, or from $r_0$ to $\infty$ in our visual model). **Scale: Meters**.
- **$b(r)$**: The **Shape Function**, which determines the spatial shape of the wormhole throat.
- **$\Phi(r)$**: The Redshift Function (assumed constant $\Phi(r)=0$ for simplicity in this simulation to avoid event horizons elsewhere).

## 2. Traversability Constraints

For the wormhole to be traversable (i.e., no event horizon blocking the path), the following condition must strictly hold at the throat ($r_0$) and throughout the tunnel:

$$ b(r) < r $$

If $b(r) \ge r$ at any point, a coordinate singularity (or event horizon) forms, and the wormhole collapses or becomes non-traversable.

### Implementation
In `App.jsx`, this is enforced in the physics loop:
```javascript
const ratio = shapeFunc / radius; // b(r) / r
if (new_b >= radius) {
  setIsCollapsed(true); // Singularity forms
}
```

## 3. Energy Conditions & Dynamics

Einstein's Field Equations, $G_{\mu\nu} = 8\pi T_{\mu\nu}$, imply that holding a wormhole throat open ($b(r) < r$) requires stress-energy tensor components that violate the Null Energy Condition (NEC). This is modeled as **Exotic Matter**.

### dynamics Equation
The simulation updates the shape function $b(r)$ based on energy inputs:

$$ \frac{db}{dt} = \text{Gravity} - \text{ExoticFlux} + \text{MatterFlux} $$

1.  **Gravity ($B\_GROWTH\_RATE$)**:
    *   Natural tendency of spacetime to close the topological opening. This represents the positive energy density of the vacuum or background curvature.
    *   $\Delta b \approx +0.05$ per tick.

2.  **Exotic Matter (Negative Energy)**:
    *   Required to "push" the throat open (decrease $b(r)$).
    *   $\Delta b \approx -0.3$ per tick (when active).
    *   *Constraint*: Must be continuously injected to counteract gravity.

3.  **Normal Matter Transit (Positive Energy)**:
    *   Passing a probe adds positive mass-energy to the throat interactions.
    *   This opposes the exotic matter, increasing $b(r)$ and pushing the wormhole toward collapse.
    *   $\Delta b \approx +0.2$ per tick (during transit).

## 4. Gravitational Time Dilation

As the throat constricts ($b(r) \to r$), the coordinate time $t$ for a traveler traversing the wormhole dilates relative to an observer at infinity. We model the transit time $T$ as:

$$ T = \frac{T_0}{1 - \frac{b(r)}{r}} $$

Where:
- $T_0$: Base transit time (1 second).
- As $b(r)$ approaches $r$, the denominator approaches 0, and $T \to \infty$.

### Implementation
```javascript
const ratio = shapeFunc / radius;
const dilationFactor = 1 / Math.max(0.01, 1 - ratio);
const traverseDuration = 1000 * dilationFactor;
```
This implies that sending a probe through a barely-stable wormhole takes significantly longer than through a well-stabilized one.

## 5. Visual Representation

- **Throat Radius ($r$)**: Represented by the outer bounds of the wormhole component.
- **Constriction ($b(r)$)**: Visualized as the "Event Horizon" glow tightening.
    - When $b(r) \approx 0$: The wormhole is wide open and stable.
    - When $b(r) \to r$: The wormhole visually shrinks/shocked as the throat pinches off.

## 6. Resource Constraints
Maintaining a traversable wormhole requires a constant flux of negative energy to counteract natural gravitational collapse.

- **Exotic Matter Tank**: Represents the finite supply of negative mass-energy.
- **Depletion**: Active stabilization consumes ~0.2% of reserves per tick.
- **Depleted State**: If reserves hit 0%, the stabilization fails, and gravity takes over which leads to inevitable collapse.

## 8. Quantum Vacuum Harvesting (Casimir Effect)
Since exotic matter is not readily available, the system uses a **Casimir Collector** to harvest energy from quantum vacuum fluctuations. 
- **Mechanism**: Conductive plates limit the wavelengths of virtual particles, creating a local negative energy density relative to the surroundings.
- **Harvest Rate**: $\approx +0.1\%$ per tick.
- **Net Energy**: Harvesting (+0.1) is slower than Injection Consumption (-0.2), meaning one must actively manage charging cycles.

## 9. Quantum Field Engineering
To create and sustain the wormhole, the system employs advanced quantum field manipulation technologies:

### Quantum Vacuum Pumps (Harvester)
Devices utilizing **Casimir Cavity Arrays** to extract negative energy from the quantum vacuum state ("Harvesting").
- **Function**: Amplifies micro-fluctuations in the vacuum to generate a usable negative energy flux.
- **Components**: Dense networks of nano-scale Casimir cavities.

### Field Modulators (Stabilizer)
High-energy emitters that focus the harvested negative energy into the wormhole throat.
- **Function**: Counteracts the positive energy density of the throat's gravity to satisfy the constraint $b(r) < r$.
- **Operation**: Requires constant power ("Exotic Matter" consumption) to maintain the field gradient.

## 10. Metric Visualization
The Control Panel features a real-time graph of the **Shape Function** $b(r)$ relative to the **Throat Radius** $r$.
- **Y-Axis**: Represents spatial extent. Top line = $r$ (10.00 m Event Horizon Limit).
- **curve**: The time-evolution of $b(r)$.
- **Constraint**: If the curve touches the top line ($b(r) = r$), the wormhole collapses.
