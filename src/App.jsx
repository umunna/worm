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
  getCoverageDistance,
  getGateCount,
  getTotalNodes,
  TE_KM,
  NODES_PER_GATE,
  NODE_SPACING_KM,
} from './lib/nodeNetwork';

// Physics constants
const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;
const INJECTION_DURATION = 2500;

// Energy rates (per 50ms tick, 20 ticks/sec):
//   Intake:          +0.18/tick = +3.6%/sec
//   Stabilize drain: -0.06/tick = -1.2%/sec
//   Transit drain:   -0.08/tick = -1.6%/sec  (on top of stabilize)
//
// Net idle (online):      +0.12/tick = +2.4%/sec  (steady recharge)
// Net transit (online):   +0.04/tick = +0.8%/sec  (still positive but slow)
const ANTIMATTER_INTAKE_RATE = 0.18;
const STABILIZE_DRAIN = 0.06;
const TRANSIT_EXTRA_DRAIN = 0.08;

// Energy cost per probe: percentage of the 100% bar.
// Each km costs TE_KM (130 MJ). We scale so 1 gate (70 km) maps
// to a GENEROUS capacity so you can send ~5-8 probes per full bar.
// 100% bar = 5 * E_total_max_path.  Max single-gate path ~36 km = 4680 MJ.
// So 100% = 5 * 4680 = 23400 MJ.  A 28 km trip costs (130*28/23400)*100 = 15.6%.
const ENERGY_CAPACITY_MJ = 23400;

const RECHARGE_THRESHOLD = 30;

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
  const [probeError, setProbeError] = useState(null);

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

        // Antimatter auto-intake while gate is alive (including recharging)
        const gateAlive = gateStatus === 'injecting' || gateStatus === 'igniting'
          || gateStatus === 'online' || gateStatus === 'recharging';
        if (gateAlive) {
          change += ANTIMATTER_INTAKE_RATE; // +3.6%/sec
        }

        // Stabilization drain (only when actively stabilized)
        if (stabilized) {
          change -= STABILIZE_DRAIN; // -1.2%/sec
        }

        // Transit extra drain
        if (transitActive) {
          change -= TRANSIT_EXTRA_DRAIN; // -1.6%/sec
        }

        const newLevel = Math.max(0, Math.min(100, tank + change));

        // Energy depleted: enter recharging mode (gate stays alive)
        if (newLevel <= 0 && stabilized) {
          setStabilized(false);
          setGateStatus('recharging');
        }

        // Recharging complete: auto-resume
        if (gateStatus === 'recharging' && newLevel >= RECHARGE_THRESHOLD) {
          setStabilized(true);
          setGateStatus('online');
        }

        return newLevel;
      });

      // Curvature changes when gate is active or recharging
      // During recharge, curvature drifts upward (no stabilizer) -- adds urgency
      const gateActive = gateStatus === 'igniting' || gateStatus === 'online' || gateStatus === 'recharging';
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
    setProbeError(null);

    if (isCollapsed) { setProbeError('System collapsed'); return; }
    if (probePhase !== 'idle') { setProbeError('Probe in transit'); return; }
    if (gateStatus !== 'online') { setProbeError('Gate not online'); return; }
    if (sourceNode === destNode) { setProbeError('Same source and destination'); return; }

    const pathResult = findShortestPath(sourceNode, destNode, nodeStates);
    if (pathResult.path.length === 0) { setProbeError('No path found'); return; }

    // Travel energy: E_total = TE_km * D
    const travelEnergy = calculateTravelEnergy(pathResult.distanceKm);

    // Cost as percentage of the energy bar
    const costPercent = (travelEnergy.energyMJ / ENERGY_CAPACITY_MJ) * 100;

    // Check if enough energy (allow it even if tight -- system recharges)
    if (energyLevel < costPercent) {
      setProbeError(`Need ${costPercent.toFixed(0)}% energy (have ${energyLevel.toFixed(0)}%)`);
      return;
    }

    // Deduct upfront cost
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
  }, [isCollapsed, probePhase, gateStatus, sourceNode, destNode, nodeStates, energyLevel]);

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
    setProbeError(null);
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
        probeError={probeError}
        totalNodes={getTotalNodes()}
        gateCount={getGateCount()}
        coverageDistance={getCoverageDistance()}
      />
    </div>
  );
}

export default App;
