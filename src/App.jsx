import React, { useState, useEffect, useCallback } from 'react';
import Wormhole from './components/Wormhole';
import StarField from './components/StarField';
import ControlPanel from './components/ControlPanel';
import Probe from './components/Probe';
import {
  findShortestPath,
  calculateTraversalTime,
  calculateTravelEnergy,
  applyTraversalLoad,
  cooldownNodes,
  getNodes,
  getEdges,
  D_GATE,
  TE_KM,
} from './lib/nodeNetwork';

// Physics constants
const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;
const ANTIMATTER_INTAKE_RATE = 0.12; // Slower intake: +2.4%/sec
const STABILIZE_DRAIN = 0.1;          // Constant drain when stabilized: -2%/sec
const INJECTION_DURATION = 2500;       // ms for antimatter injection phase

// Energy scaling: map PDF's E_total = TE_km * D into the 0-100 energy bar.
// Full gate coverage D_GATE = 70 km costs TE_KM * D_GATE = 9100 MJ.
// We define that as 100% of the bar's capacity.
const GATE_ENERGY_CAPACITY_MJ = TE_KM * D_GATE; // 9100 MJ = 100% bar

function App() {
  const [radius] = useState(INITIAL_RADIUS);
  const [curvature, setCurvature] = useState(0.0);
  const [stabilized, setStabilized] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(50.0);
  const [gateStatus, setGateStatus] = useState('offline');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stabilityHistory, setStabilityHistory] = useState([]);

  const [transitActive, setTransitActive] = useState(false);
  const [probePhase, setProbePhase] = useState('idle');

  // Node network
  const [nodeStates, setNodeStates] = useState({});
  const [sourceNode, setSourceNode] = useState('N1');
  const [destNode, setDestNode] = useState('N5');
  const [activePath, setActivePath] = useState([]);
  const [lastPathResult, setLastPathResult] = useState(null);
  const [lastTravelEnergy, setLastTravelEnergy] = useState(null);

  const nodes = getNodes();
  const edges = getEdges();

  // Physics loop: antimatter is drawn from the atmosphere once wormhole is active.
  // This intake creates the curvature needed for stabilization.
  // Energy only drains during active stabilization; intake covers the cost.
  // Transit puts extra stress on the system, temporarily increasing drain.
  useEffect(() => {
    if (isCollapsed) return;

    const interval = setInterval(() => {
      setEnergyLevel(tank => {
        let change = 0;

        // Antimatter auto-intake: draws from atmosphere while gate is active
        // Rate: +0.12/tick = +2.4%/sec  (slow, deliberate accumulation)
        const gateActive = gateStatus === 'injecting' || gateStatus === 'igniting' || gateStatus === 'online';
        if (gateActive) {
          change += ANTIMATTER_INTAKE_RATE;
        }

        // Stabilization constantly drains energy: -0.1/tick = -2%/sec
        if (stabilized) {
          change -= STABILIZE_DRAIN;
        }

        // Transit adds extra continuous drain: -0.15/tick = -3%/sec on top
        if (transitActive) {
          change -= 0.15;
        }

        // Net rates:
        //   Injection only:  +2.4%/sec  (energy climbs)
        //   Online idle:     +0.4%/sec  (barely positive -- intake just covers drain)
        //   Online transit:  -2.6%/sec  (actively dropping during transport)

        const newLevel = Math.max(0, Math.min(100, tank + change));

        // If energy fully depleted, shut everything down
        if (newLevel <= 0 && stabilized) {
          setStabilized(false);
          setGateStatus('offline');
          setCurvature(0);
        }

        return newLevel;
      });

      // Curvature only changes when gate is active
      const gateActive = gateStatus === 'igniting' || gateStatus === 'online';
      if (gateActive) {
        setCurvature(c => {
          let delta = DECAY_RATE; // Natural tendency to close
          if (stabilized) delta -= STABILIZE_FLUX; // Stabilizer counteracts
          if (transitActive) delta += TRANSIT_STRESS * 0.1; // Transit stress

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
      }

      setNodeStates(prev => cooldownNodes(prev));
    }, 50);

    return () => clearInterval(interval);
  }, [stabilized, transitActive, radius, isCollapsed, gateStatus]);

  const handleOpenWormhole = useCallback(() => {
    if (energyLevel <= 0 || stabilized) return;
    if (gateStatus !== 'offline') return;

    // Phase 1: Antimatter injection -- particles drawn in, energy starts accumulating
    setGateStatus('injecting');

    // Phase 2: After injection completes, ignite the wormhole
    setTimeout(() => {
      setGateStatus(current => {
        if (current !== 'injecting') return current;
        setStabilized(true);
        setCurvature(radius * 0.5); // Start at moderate curvature
        return 'igniting';
      });

      // Phase 3: Wormhole fully stabilized and online
      setTimeout(() => {
        setGateStatus(current => current === 'igniting' ? 'online' : current);
      }, 3000);
    }, INJECTION_DURATION);
  }, [energyLevel, stabilized, gateStatus, radius]);

  const handleSendProbe = useCallback(() => {
    if (isCollapsed || probePhase !== 'idle' || gateStatus !== 'online') return;
    if (sourceNode === destNode) return;

    const pathResult = findShortestPath(sourceNode, destNode, nodeStates);
    if (pathResult.path.length === 0) return;

    // Calculate travel energy from PDF formula: E_total = TE_km * D
    const travelEnergy = calculateTravelEnergy(pathResult.distanceKm);

    // Upfront energy cost: convert MJ to bar percentage
    // E_total (MJ) / GATE_CAPACITY (MJ) * 100 = percentage of bar
    const costPercent = (travelEnergy.energyMJ / GATE_ENERGY_CAPACITY_MJ) * 100;

    // Check if there is enough energy for this trip
    if (energyLevel < costPercent) return;

    // Deduct energy immediately
    setEnergyLevel(prev => Math.max(0, prev - costPercent));

    setLastPathResult(pathResult);
    setLastTravelEnergy({ ...travelEnergy, costPercent });
    setActivePath(pathResult.path);
    setNodeStates(prev => applyTraversalLoad(pathResult.path, prev));

    const totalTime = calculateTraversalTime(pathResult);
    const ENTRY_DURATION = 800;
    const EXIT_DURATION = 800;
    const traverseDuration = Math.min(8000, totalTime);

    setProbePhase('entering');
    setTransitActive(true);

    setTimeout(() => setProbePhase('traversing'), ENTRY_DURATION);
    setTimeout(() => setProbePhase('exiting'), ENTRY_DURATION + traverseDuration);
    setTimeout(() => {
      setProbePhase('idle');
      setTransitActive(false);
      setActivePath([]);
    }, ENTRY_DURATION + traverseDuration + EXIT_DURATION);
  }, [isCollapsed, probePhase, gateStatus, sourceNode, destNode, nodeStates, curvature, radius]);

  const handleSelectNode = useCallback((nodeId) => {
    if (transitActive) return;
    if (nodeId === sourceNode) {
      setSourceNode(destNode);
      setDestNode(sourceNode);
    } else {
      setDestNode(nodeId);
    }
  }, [transitActive, sourceNode, destNode]);

  const handleReset = useCallback(() => {
    setIsCollapsed(false);
    setCurvature(0.0);
    setStabilized(false);
    setTransitActive(false);
    setProbePhase('idle');
    setEnergyLevel(50.0);
    setGateStatus('offline');
    setNodeStates({});
    setActivePath([]);
    setLastPathResult(null);
    setLastTravelEnergy(null);
  }, []);

  const constrictionRatio = isCollapsed ? 1 : curvature / radius;
  const wormholePhase = isCollapsed ? 'collapsed' : gateStatus;

  return (
    <div className="app-root">
      <StarField />
      <h1>Wormhole Gateway</h1>

      <div className="wormhole-container">
        <Probe phase={probePhase} />

        <Wormhole
          constriction={constrictionRatio}
          isCollapsed={isCollapsed}
          phase={wormholePhase}
          side="entry"
          label={`Node ${sourceNode}`}
        />

        <div className="wormhole-tunnel">
          <div className="tunnel-line" data-active={transitActive || gateStatus === 'online'} />
        </div>

        <Wormhole
          constriction={constrictionRatio}
          isCollapsed={isCollapsed}
          phase={wormholePhase}
          side="exit"
          label={`Node ${destNode}`}
        />
      </div>

      <ControlPanel
        radius={radius}
        curvature={curvature}
        stabilized={stabilized}
        energyLevel={energyLevel}
        stabilityHistory={stabilityHistory}
        gateStatus={gateStatus}
        isCollapsed={isCollapsed}
        transitActive={transitActive}
        onOpenWormhole={handleOpenWormhole}
        onSendProbe={handleSendProbe}
        onReset={handleReset}
        nodes={nodes}
        edges={edges}
        nodeStates={nodeStates}
        activePath={activePath}
        sourceNode={sourceNode}
        destNode={destNode}
        onSelectNode={handleSelectNode}
        lastPathResult={lastPathResult}
        lastTravelEnergy={lastTravelEnergy}
      />
    </div>
  );
}

export default App;
