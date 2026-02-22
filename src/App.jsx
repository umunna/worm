import React, { useState, useEffect, useCallback } from 'react';
import Wormhole from './components/Wormhole';
import StarField from './components/StarField';
import ControlPanel from './components/ControlPanel';
import Probe from './components/Probe';
import InfoModal from './components/InfoModal';
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
} from './lib/nodeNetwork';

const INITIAL_RADIUS = 10.0;
const DECAY_RATE = 0.05;
const STABILIZE_FLUX = 0.3;
const TRANSIT_STRESS = 2.0;
const INJECTION_DURATION = 2500;

const ANTIMATTER_INTAKE_RATE = 0.18;  // +3.6%/sec
const STABILIZE_DRAIN = 0.06;         // -1.2%/sec
const TRANSIT_EXTRA_DRAIN = 0.08;     // -1.6%/sec

const ENERGY_CAPACITY_MJ = 23400;     // 100% bar = 23,400 MJ
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
  const [infoOpen, setInfoOpen] = useState(false);

  const nodes = getNodes();
  const edges = getEdges();

  useEffect(() => {
    if (isCollapsed) return;

    const interval = setInterval(() => {
      setEnergyLevel(tank => {
        let change = 0;

        const gateAlive = gateStatus === 'injecting' || gateStatus === 'igniting'
          || gateStatus === 'online' || gateStatus === 'recharging';
        if (gateAlive) change += ANTIMATTER_INTAKE_RATE;
        if (stabilized) change -= STABILIZE_DRAIN;
        if (transitActive) change -= TRANSIT_EXTRA_DRAIN;

        const newLevel = Math.max(0, Math.min(100, tank + change));

        if (newLevel <= 0 && stabilized) {
          setStabilized(false);
          setGateStatus('recharging');
        }

        if (gateStatus === 'recharging' && newLevel >= RECHARGE_THRESHOLD) {
          setStabilized(true);
          setGateStatus('online');
        }

        return newLevel;
      });

      const gateActive = gateStatus === 'igniting' || gateStatus === 'online' || gateStatus === 'recharging';
      if (gateActive) {
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
      }

      setNodeStates(prev => cooldownNodes(prev));
    }, 50);

    return () => clearInterval(interval);
  }, [stabilized, transitActive, radius, isCollapsed, gateStatus]);

  const handleOpenWormhole = useCallback(() => {
    if (energyLevel <= 0 || stabilized) return;
    if (gateStatus !== 'offline') return;

    setGateStatus('injecting');
    setTimeout(() => {
      setGateStatus(current => {
        if (current !== 'injecting') return current;
        setStabilized(true);
        setCurvature(radius * 0.5);
        return 'igniting';
      });
      setTimeout(() => {
        setGateStatus(current => current === 'igniting' ? 'online' : current);
      }, 3000);
    }, INJECTION_DURATION);
  }, [energyLevel, stabilized, gateStatus, radius]);

  const handleCloseWormhole = useCallback(() => {
    if (transitActive || gateStatus === 'offline') return;
    setGateStatus('offline');
    setStabilized(false);
    setCurvature(0);
    setActivePath([]);
    setLastPathResult(null);
    setLastTravelEnergy(null);
    setProbeError(null);
  }, [transitActive, gateStatus]);

  const handleSendProbe = useCallback(() => {
    setProbeError(null);

    if (isCollapsed) { setProbeError('System collapsed'); return; }
    if (probePhase !== 'idle') { setProbeError('Probe in transit'); return; }
    if (gateStatus !== 'online') { setProbeError('Gate not online'); return; }
    if (sourceNode === destNode) { setProbeError('Same source and destination'); return; }

    const pathResult = findShortestPath(sourceNode, destNode, nodeStates);
    if (pathResult.path.length === 0) { setProbeError('No path found'); return; }

    const travelEnergy = calculateTravelEnergy(pathResult.distanceKm);
    const costPercent = (travelEnergy.energyMJ / ENERGY_CAPACITY_MJ) * 100;

    if (energyLevel < costPercent) {
      setProbeError(`Need ${costPercent.toFixed(0)}% energy (have ${energyLevel.toFixed(0)}%)`);
      return;
    }

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
      <div className="app-title-bar">
        <h1>Wormhole Gateway</h1>
        <button
          className="info-trigger"
          onClick={() => setInfoOpen(true)}
          aria-label="View documentation"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="7.5" />
            <line x1="9" y1="8" x2="9" y2="13" />
            <circle cx="9" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />

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
        onCloseWormhole={handleCloseWormhole}
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
