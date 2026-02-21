import React, { useState, useEffect } from 'react';
import Wormhole from './components/Wormhole';
import StarField from './components/StarField';
import ControlPanel from './components/ControlPanel';
import Probe from './components/Probe';
// Gate component no longer needed - wormholes are self-contained

const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;

function App() {
  const [radius, setRadius] = useState(INITIAL_RADIUS);
  const [curvature, setCurvature] = useState(0.0);

  const [stabilized, setStabilized] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(50.0);
  const [harvesting, setHarvesting] = useState(false);
  const [gateStatus, setGateStatus] = useState('offline');

  const [transitActive, setTransitActive] = useState(false);
  const [probePhase, setProbePhase] = useState('idle');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [stabilityHistory, setStabilityHistory] = useState([]);

  // Physics simulation loop
  useEffect(() => {
    if (isCollapsed) return;

    const tickRate = 50;
    const interval = setInterval(() => {
      // Energy management
      setEnergyLevel(tank => {
        let change = 0;
        if (stabilized) change -= 0.2;
        if (harvesting) change += 0.1;
        const newLevel = Math.max(0, Math.min(100, tank + change));
        if (newLevel <= 0 && stabilized) setStabilized(false);
        return newLevel;
      });

      setCurvature(c => {
        let delta = DECAY_RATE;
        if (stabilized) delta -= STABILIZE_FLUX;
        if (transitActive) delta += TRANSIT_STRESS * 0.1;

        let newC = Math.max(0, c + delta);

        if (newC >= radius) {
          setIsCollapsed(true);
          newC = radius;
        }

        setStabilityHistory(prev => {
          const next = [...prev, newC];
          if (next.length > 50) next.shift();
          return next;
        });

        return newC;
      });
    }, tickRate);

    return () => clearInterval(interval);
  }, [stabilized, transitActive, radius, isCollapsed, harvesting]);

  const handleActivateStabilizer = () => {
    if (energyLevel > 0) {
      setStabilized(true);

      if (gateStatus === 'offline') {
        setGateStatus('igniting');
        setCurvature(radius * 0.9);
        setTimeout(() => {
          setGateStatus(current => current === 'igniting' ? 'online' : current);
        }, 3000);
      }
    }
  };

  const handleToggleHarvest = () => {
    setHarvesting(prev => !prev);
  };

  const handleSendProbe = () => {
    if (isCollapsed || probePhase !== 'idle') return;

    const ENTRY_DURATION = 1000;
    const EXIT_DURATION = 1000;

    const ratio = curvature / radius;
    const dilationFactor = 1 / Math.max(0.01, 1 - ratio);
    const traverseDuration = Math.min(10000, 1000 * dilationFactor);

    setProbePhase('entering');
    setTransitActive(true);

    setTimeout(() => setProbePhase('traversing'), ENTRY_DURATION);
    setTimeout(() => setProbePhase('exiting'), ENTRY_DURATION + traverseDuration);
    setTimeout(() => {
      setProbePhase('idle');
      setTransitActive(false);
    }, ENTRY_DURATION + traverseDuration + EXIT_DURATION);
  };

  const handleReset = () => {
    setIsCollapsed(false);
    setCurvature(0.0);
    setRadius(INITIAL_RADIUS);
    setStabilized(false);
    setTransitActive(false);
    setProbePhase('idle');
    setEnergyLevel(50.0);
    setHarvesting(false);
    setGateStatus('offline');
  };

  const constrictionRatio = isCollapsed ? 1 : curvature / radius;
  const wormholePhase = isCollapsed ? 'collapsed' : gateStatus;

  return (
    <>
      <StarField />
      <h1>Wormhole Gateway</h1>

      <div className="wormhole-container">
        <Probe phase={probePhase} />

        <Wormhole
          constriction={constrictionRatio}
          isCollapsed={isCollapsed}
          phase={wormholePhase}
          side="entry"
        />

        <Wormhole
          constriction={constrictionRatio}
          isCollapsed={isCollapsed}
          phase={wormholePhase}
          side="exit"
        />
      </div>

      <ControlPanel
        radius={radius}
        curvature={curvature}
        stabilized={stabilized}
        energyLevel={energyLevel}
        stabilityHistory={stabilityHistory}
        harvesting={harvesting}
        onActivateStabilizer={handleActivateStabilizer}
        onSendProbe={handleSendProbe}
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
