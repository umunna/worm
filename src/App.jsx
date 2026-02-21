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
} from './lib/nodeNetwork';

// Physics constants
const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;
const ANTIMATTER_INTAKE_RATE = 0.15;

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
  const [sourceNode, setSourceNode] = useState('A');
  const [destNode, setDestNode] = useState('F');
  const [activePath, setActivePath] = useState([]);
  const [lastPathResult, setLastPathResult] = useState(null);
  const [lastTravelEnergy, setLastTravelEnergy] = useState(null);

  const nodes = getNodes();
  const edges = getEdges();

  // Physics loop: once wormhole opens, antimatter is sucked in from atmosphere
  // creating curvature for stabilization. No manual recharge.
  useEffect(() => {
    if (isCollapsed) return;

    const interval = setInterval(() => {
      setEnergyLevel(tank => {
        let change = 0;
        if (stabilized) change -= 0.2;
        // Antimatter auto-intake once wormhole is active
        if (gateStatus === 'online' || gateStatus === 'igniting') {
          change += ANTIMATTER_INTAKE_RATE;
        }
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

      setNodeStates(prev => cooldownNodes(prev));
    }, 50);

    return () => clearInterval(interval);
  }, [stabilized, transitActive, radius, isCollapsed, gateStatus]);

  const handleOpenWormhole = useCallback(() => {
    if (energyLevel > 0 && !stabilized) {
      setStabilized(true);
      if (gateStatus === 'offline') {
        setGateStatus('igniting');
        setCurvature(radius * 0.9);
        setTimeout(() => {
          setGateStatus(current => current === 'igniting' ? 'online' : current);
        }, 3000);
      }
    }
  }, [energyLevel, stabilized, gateStatus, radius]);

  const handleSendProbe = useCallback(() => {
    if (isCollapsed || probePhase !== 'idle' || gateStatus !== 'online') return;
    if (sourceNode === destNode) return;

    const pathResult = findShortestPath(sourceNode, destNode, nodeStates);
    if (pathResult.path.length === 0) return;

    // Calculate travel energy from PDF formula: E_total = TE_km * D
    const ratio = curvature / radius;
    const travelEnergy = calculateTravelEnergy(pathResult.distanceKm, ratio);

    setLastPathResult(pathResult);
    setLastTravelEnergy(travelEnergy);
    setActivePath(pathResult.path);
    setNodeStates(prev => applyTraversalLoad(pathResult.path, prev));

    const totalTime = calculateTraversalTime(pathResult, ratio);
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
