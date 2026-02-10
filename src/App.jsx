import React, { useState, useEffect } from 'react';
import Wormhole from './components/Wormhole';
import StarField from './components/StarField';
import ControlPanel from './components/ControlPanel';
import Probe from './components/Probe';

// Morris-Thorne Physics Constants
const INITIAL_RADIUS = 10.0; // r_0
const B_GROWTH_RATE = 0.05; // Gravity trying to close the throat
const EXOTIC_FLUX = 0.3; // Negative energy density pushing b(r) down
const MATTER_FLUX = 2.0; // Positive energy density increasing b(r) during transit

function App() {
  // r(t): Throat Radius
  const [radius, setRadius] = useState(INITIAL_RADIUS);
  // b(r): Shape Function value at the throat (b(r_0))
  const [shapeFunc, setShapeFunc] = useState(0.0);

  const [exoticMatter, setExoticMatter] = useState(false);
  const [exoticTank, setExoticTank] = useState(50.0); // Start half full to encourage harvesting
  const [harvesting, setHarvesting] = useState(false); // Casimir Collector state

  const [transitActive, setTransitActive] = useState(false); // Physics impact state
  const [probePhase, setProbePhase] = useState('idle'); // Visual state: idle, entering, traversing, exiting
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Data history for graph
  const [metricHistory, setMetricHistory] = useState([]);

  // Relativistic Physics Loop
  useEffect(() => {
    if (isCollapsed) return;

    const tickRate = 50;
    const interval = setInterval(() => {
      // Resource Management
      setExoticTank(tank => {
        let change = 0;

        // Consumption
        if (exoticMatter) {
          change -= 0.2;
        }

        // Harvesting (Regeneration)
        if (harvesting) {
          change += 0.1; // Net loss if both active (-0.1), Gain if only harvesting (+0.1)
        }

        const newLevel = Math.max(0, Math.min(100, tank + change));

        if (newLevel <= 0 && exoticMatter) {
          setExoticMatter(false); // Forced cutoff
        }

        return newLevel;
      });

      setShapeFunc(b => {
        let delta_b = B_GROWTH_RATE; // Natural gravitational tendency to close

        if (exoticMatter) {
          delta_b -= EXOTIC_FLUX; // Negative energy reduces curvature
        }

        if (transitActive) {
          delta_b += MATTER_FLUX * 0.1; // Mass adds positive curvature
        }

        // Apply change
        let new_b = Math.max(0, b + delta_b);

        // Traversable Constraint: b(r) < r
        // If b(r) >= r, the throat pinches off (horizon forms)
        if (new_b >= radius) {
          setIsCollapsed(true);
          new_b = radius; // Cap at collapse
        }

        // Update history (keep last 50 points)
        setMetricHistory(prev => {
          const next = [...prev, new_b];
          if (next.length > 50) next.shift();
          return next;
        });

        return new_b;
      });

    }, tickRate);

    return () => clearInterval(interval);
  }, [exoticMatter, transitActive, radius, isCollapsed]);

  const handleInjectExotic = () => {
    if (exoticTank > 0) {
      setExoticMatter(true);

      // Ignition Logic
      if (gateStatus === 'offline') {
        setGateStatus('igniting');
        setShapeFunc(radius * 0.9); // Start nearly closed, needing immediate stabilization

        // Sequence: 3 seconds to stabilize
        setTimeout(() => {
          setGateStatus(current => current === 'igniting' ? 'online' : current);
        }, 3000);
      }
    }
  };

  const handleToggleHarvest = () => {
    setHarvesting(prev => !prev);
  };

  const handleSendMatter = () => {
    if (isCollapsed || probePhase !== 'idle') return;

    const ENTRY_DURATION = 1000;
    const EXIT_DURATION = 1000;

    // Time Dilation: As b(r) approaches r, traversal takes longer.
    // Formula: T = T_0 / (1 - b/r)
    const ratio = shapeFunc / radius;
    const dilationFactor = 1 / Math.max(0.01, 1 - ratio);
    const traverseDuration = Math.min(10000, 1000 * dilationFactor); // Cap at 10s for sanity

    // Start Sequence
    setProbePhase('entering');
    setTransitActive(true); // Physics starts impacted immediately upon entry

    // Sequence Timing
    setTimeout(() => {
      setProbePhase('traversing'); // Probe hidden in tunnel
    }, ENTRY_DURATION);

    setTimeout(() => {
      setProbePhase('exiting'); // Probe pops out
    }, ENTRY_DURATION + traverseDuration);

    setTimeout(() => {
      setProbePhase('idle'); // Done
      setTransitActive(false); // Physics impact ends
    }, ENTRY_DURATION + traverseDuration + EXIT_DURATION);
  };

  const handleReset = () => {
    setIsCollapsed(false);
    setShapeFunc(0.0);
    setRadius(INITIAL_RADIUS);
    setExoticMatter(false);
    setTransitActive(false);
    setProbePhase('idle');
    setExoticTank(50.0);
    setHarvesting(false);
    setGateStatus('offline');
  };

  // derived state for visualization
  // ratio = b(r)/r. 0 = safe, 1 = collapse
  const constrictionRatio = isCollapsed ? 1 : shapeFunc / radius;

  // Decide what phase to tell components
  const wormholePhase = isCollapsed ? 'collapsed' : gateStatus;

  return (
    <>
      <StarField />
      <h1>Wormhole Gateway</h1>

      <div className="wormhole-container">
        <Probe phase={probePhase} />

        {/* Left Wormhole */}
        <Gate>
          <Wormhole
            color={isCollapsed ? '#ff0000' : "#08CB00"}
            size={`min(${280 * (1 - constrictionRatio * 0.5)}px, 40vw)`}
            constriction={constrictionRatio}
            isCollapsed={isCollapsed}
            phase={wormholePhase}
          />
        </Gate>

        <Gate>
          <Wormhole
            color={isCollapsed ? '#ff0000' : "#08CB00"}
            size={`min(${280 * (1 - constrictionRatio * 0.5)}px, 40vw)`}
            constriction={constrictionRatio}
            isCollapsed={isCollapsed}
            phase={wormholePhase}
          />
        </Gate>
      </div>

      <ControlPanel
        radius={radius}
        shapeFunc={shapeFunc}
        exoticMatter={exoticMatter}
        exoticTank={exoticTank}
        metricHistory={metricHistory}
        harvesting={harvesting}
        onInjectExotic={handleInjectExotic}
        onSendMatter={handleSendMatter}
        onToggleHarvest={handleToggleHarvest}
        onReset={handleReset}
        isCollapsed={isCollapsed}
        transitActive={transitActive}
        gateStatus={gateStatus}
      />
    </>
  );
}

export default App;
