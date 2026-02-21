import React, { useState, useEffect, useCallback } from 'react';
import Wormhole from './components/Wormhole';
import StarField from './components/StarField';
import ControlPanel from './components/ControlPanel';
import Probe from './components/Probe';
import {
  findShortestPath,
  calculateTraversalTime,
  applyTraversalLoad,
  cooldownNodes,
  getNodes,
  getEdges,
} from './lib/nodeNetwork';

const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;
const ANTIMATTER_INTAKE_RATE = 0.15; // Auto-harvested once wormhole is open

function App() {
  // Wormhole physics
  const [radius] = useState(INITIAL_RADIUS);
  const [curvature, setCurvature] = useState(0.0);
  const [stabilized, setStabilized] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(50.0);
  const [gateStatus, setGateStatus] = useState('offline');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stabilityHistory, setStabilityHistory] = useState([]);

  // Transit state
  const [transitActive, setTransitActive] = useState(false);
  const [probePhase, setProbePhase] = useState('idle');

  // Node network
  const [nodeStates, setNodeStates] = useState({});
  const [sourceNode, setSourceNode] = useState('A');
  const [destNode, setDestNode] = useState('D');
  const [activePath, setActivePath] = useState([]);
  const [lastPathResult, setLastPathResult] = useState(null);

  const nodes = getNodes();
  const edges = getEdges();

  // Physics simulation - auto energy injection once wormhole opens
  useEffect(() => {
    if (isCollapsed) return;

    const tickRate = 50;
    const interval = setInterval(() => {
      // Energy: consumed by stabilizer, auto-replenished by antimatter intake when open
      setEnergyLevel(tank => {
        let change = 0;
        if (stabilized) change -= 0.2; // Stabilizer consumption
        // Auto antimatter intake once wormhole is active (no manual recharge)
        if (gateStatus === 'online' || gateStatus === 'igniting') {
          change += ANTIMATTER_INTAKE_RATE;
        }
        const newLevel = Math.max(0, Math.min(100, tank + change));
        if (newLevel <= 0 && stabilized) setStabilized(false);
        return newLevel;
      });

      // Curvature dynamics - antimatter creates curvature for stabilization
      setCurvature(c => {
        let delta = DECAY_RATE; // Natural gravitational decay
        if (stabilized) delta -= STABILIZE_FLUX; // Stabilizer pushes back
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

      // Cooldown node heat and load over time
      setNodeStates(prev => cooldownNodes(prev));
    }, tickRate);

    return () => clearInterval(interval);
  }, [stabilized, transitActive, radius, isCollapsed, gateStatus]);

  // Open the wormhole - energy starts being injected, antimatter is sucked in
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

  // Send probe through the node network using shortest path
  const handleSendProbe = useCallback(() => {
    if (isCollapsed || probePhase !== 'idle' || gateStatus !== 'online') return;
    if (sourceNode === destNode) return;

    // Find shortest path considering node heat/load
    const pathResult = findShortestPath(sourceNode, destNode, nodeStates);
    if (pathResult.path.length === 0) return;

    setLastPathResult(pathResult);
    setActivePath(pathResult.path);

    // Apply load to nodes on the path
    setNodeStates(prev => applyTraversalLoad(pathResult.path, prev));

    // Calculate traversal time with curvature dilation
    const ratio = curvature / radius;
    const totalTime = calculateTraversalTime(pathResult, ratio);

    const ENTRY_DURATION = 1000;
    const EXIT_DURATION = 1000;
    const traverseDuration = Math.min(10000, totalTime);

    setProbePhase('entering');
    setTransitActive(true);

    setTimeout(() => setProbePhase('traversing'), ENTRY_DURATION);
    setTimeout(() => setProbePhase('exiting'), ENTRY_DURATION + traverseDuration);
    setTimeout(() => {
      setProbePhase('idle');
      setTransitActive(false);
      setActivePath([]);
      setLastPathResult(null);
    }, ENTRY_DURATION + traverseDuration + EXIT_DURATION);
  }, [isCollapsed, probePhase, gateStatus, sourceNode, destNode, nodeStates, curvature, radius]);

  // Node selection for routing
  const handleSelectNode = useCallback((nodeId) => {
    if (transitActive) return; // Can't change route during transit
    // If clicking the source, swap with dest
    if (nodeId === sourceNode) {
      setSourceNode(destNode);
      setDestNode(sourceNode);
    } else if (nodeId === destNode) {
      setSourceNode(destNode);
      setDestNode(sourceNode);
    } else {
      // Set as new destination
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
          label={`Gate ${sourceNode}`}
        />

        <Wormhole
          constriction={constrictionRatio}
          isCollapsed={isCollapsed}
          phase={wormholePhase}
          side="exit"
          label={`Gate ${destNode}`}
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
        // Node network props
        nodes={nodes}
        edges={edges}
        nodeStates={nodeStates}
        activePath={activePath}
        sourceNode={sourceNode}
        destNode={destNode}
        onSelectNode={handleSelectNode}
        lastPathResult={lastPathResult}
      />
    </div>
  );
}

export default App;
