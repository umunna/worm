import React, { useState } from 'react';
import NodeMap from './NodeMap';
import { D_GATE, TE_KM, NODES_PER_GATE, NODE_SPACING_KM } from '../lib/nodeNetwork';

const ControlPanel = ({
  radius,
  curvature,
  stabilized,
  energyLevel,
  stabilityHistory,
  gateStatus,
  isCollapsed,
  transitActive,
  onOpenWormhole,
  onSendProbe,
  onReset,
  nodes,
  edges,
  nodeStates,
  activePath,
  sourceNode,
  destNode,
  onSelectNode,
  lastPathResult,
  lastTravelEnergy,
}) => {
  const [expanded, setExpanded] = useState(false);
  const ratio = curvature / radius;
  const isStable = ratio < 1.0;
  const isOnline = gateStatus === 'online';

  const graphPoints = stabilityHistory
    ? stabilityHistory
        .map((val, i) => {
          const x = (i / 50) * 100;
          const y = 100 - (val / radius) * 100;
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  return (
    <div className="control-panel">
      {/* Header */}
      <div className="cp-header">
        <h3 className="cp-title">Controls</h3>
        <div className="cp-header-right">
          <span
            className="cp-status"
            style={{ color: isStable && !isCollapsed ? '#00ff88' : '#ff4444' }}
          >
            {isCollapsed ? 'COLLAPSED' : isOnline ? 'STABLE' : gateStatus === 'igniting' ? 'OPENING' : gateStatus === 'injecting' ? 'INJECTING' : 'OFFLINE'}
          </span>
          <button className="cp-expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {/* Energy bar */}
      <div className="cp-energy-section">
        <div className="cp-energy-labels">
          <span>
            Energy
            {(gateStatus === 'injecting' || gateStatus === 'igniting' || gateStatus === 'online') && (
              <span className="cp-intake-badge">
                {gateStatus === 'injecting' ? 'ANTIMATTER INJECTING' : 'INTAKE ACTIVE'}
              </span>
            )}
          </span>
          <span style={{ color: energyLevel < 20 ? '#ff4444' : '#00ccff' }}>
            {energyLevel.toFixed(0)}%
          </span>
        </div>
        <div className="cp-energy-track">
          <div
            className="cp-energy-fill"
            style={{
              width: `${energyLevel}%`,
              background: energyLevel < 20 ? '#ff4444' : '#00ccff',
              boxShadow: gateStatus === 'online' ? '0 0 8px rgba(0, 204, 255, 0.6)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="cp-actions">
        <button
          className="cp-btn cp-btn-primary"
          onClick={onOpenWormhole}
          disabled={gateStatus !== 'offline' || energyLevel <= 0}
        >
          {energyLevel <= 0
            ? 'NO ENERGY'
            : gateStatus === 'injecting'
              ? 'INJECTING...'
              : gateStatus === 'igniting'
                ? 'OPENING...'
                : gateStatus === 'online'
                  ? 'STABILIZED'
                  : 'OPEN WORMHOLE'}
        </button>

        <button
          className="cp-btn cp-btn-send"
          onClick={onSendProbe}
          disabled={isCollapsed || transitActive || gateStatus !== 'online'}
        >
          {transitActive ? 'IN TRANSIT...' : `SEND ${sourceNode} \u2192 ${destNode}`}
        </button>
      </div>

      {/* Travel energy readout (shows after a send) */}
      {lastTravelEnergy && (
        <div className="cp-travel-energy">
          <div className="cp-te-row">
            <span className="cp-te-label">Distance</span>
            <span className="cp-te-value">{lastTravelEnergy.distanceKm} km</span>
          </div>
          <div className="cp-te-row">
            <span className="cp-te-label">Travel Energy</span>
            <span className="cp-te-value">{lastTravelEnergy.energyMJ.toFixed(0)} MJ</span>
          </div>
          <div className="cp-te-row">
            <span className="cp-te-label">Household Equiv.</span>
            <span className="cp-te-value">{lastTravelEnergy.householdDays.toFixed(1)} days</span>
          </div>
          <div className="cp-te-row">
            <span className="cp-te-label">Efficiency (CEE)</span>
            <span className="cp-te-value">{lastTravelEnergy.cee.toFixed(5)}</span>
          </div>
          {lastTravelEnergy.costPercent != null && (
            <div className="cp-te-row cp-te-cost">
              <span className="cp-te-label">Energy Cost</span>
              <span className="cp-te-value" style={{ color: '#ff8844' }}>
                -{lastTravelEnergy.costPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="cp-expanded">
          {/* Graph */}
          <div className="cp-graph">
            <span className="cp-graph-limit">Collapse Limit</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="cp-graph-svg">
              <polyline
                points={graphPoints}
                fill="none"
                stroke={ratio > 0.8 ? '#ff4444' : '#00ccff'}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Stats */}
          <div className="cp-stats">
            <div className="cp-stat">
              <span className="cp-stat-label">Opening</span>
              <span className="cp-stat-value">{radius.toFixed(1)}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Curvature</span>
              <span className="cp-stat-value" style={{ color: ratio > 0.8 ? '#ff4444' : '#00ccff' }}>
                {curvature.toFixed(2)}
              </span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Route</span>
              <span className="cp-stat-value">{sourceNode} {'\u2192'} {destNode}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Path Hops</span>
              <span className="cp-stat-value">{lastPathResult ? lastPathResult.hops : '-'}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Gate Coverage</span>
              <span className="cp-stat-value">{D_GATE} km</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">TE Constant</span>
              <span className="cp-stat-value">{TE_KM} MJ/km</span>
            </div>
          </div>

          {/* Network topology info */}
          <div className="cp-topology-info">
            <span>{NODES_PER_GATE} nodes/gate</span>
            <span>{NODE_SPACING_KM} km spacing</span>
            <span>D = {D_GATE} km</span>
          </div>

          {/* Node Map */}
          <div className="cp-nodemap">
            <div className="cp-nodemap-header">
              <span>Transport Network</span>
              <span className="cp-nodemap-hint">Tap node to set destination</span>
            </div>
            <div className="cp-nodemap-canvas">
              <NodeMap
                nodes={nodes}
                edges={edges}
                nodeStates={nodeStates}
                activePath={activePath}
                sourceNode={sourceNode}
                destNode={destNode}
                onSelectNode={onSelectNode}
              />
            </div>
          </div>
        </div>
      )}

      {isCollapsed && (
        <button className="cp-btn cp-btn-reset" onClick={onReset}>
          RESTART
        </button>
      )}
    </div>
  );
};

export default ControlPanel;
