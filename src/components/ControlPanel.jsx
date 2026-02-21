import React, { useState } from 'react';
import NodeMap from './NodeMap';

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
      {/* Header - always visible */}
      <div className="cp-header">
        <h3 className="cp-title">Controls</h3>
        <div className="cp-header-right">
          <span
            className="cp-status"
            style={{ color: isStable && !isCollapsed ? '#00ff88' : '#ff4444', borderColor: 'currentColor' }}
          >
            {isCollapsed ? 'COLLAPSED' : isOnline ? 'STABLE' : gateStatus === 'igniting' ? 'OPENING' : 'OFFLINE'}
          </span>
          <button className="cp-expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {/* Energy bar - always visible */}
      <div className="cp-energy-section">
        <div className="cp-energy-labels">
          <span>
            Energy
            {(gateStatus === 'online' || gateStatus === 'igniting') && (
              <span className="cp-intake-badge">INTAKE ACTIVE</span>
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
              boxShadow:
                gateStatus === 'online'
                  ? '0 0 8px rgba(0, 204, 255, 0.6)'
                  : 'none',
            }}
          />
        </div>
      </div>

      {/* Action buttons - always visible */}
      <div className="cp-actions">
        <button
          className="cp-btn cp-btn-primary"
          onClick={onOpenWormhole}
          disabled={stabilized || energyLevel <= 0}
        >
          {energyLevel <= 0
            ? 'NO ENERGY'
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
          {transitActive ? 'IN TRANSIT...' : `SEND ${sourceNode} to ${destNode}`}
        </button>
      </div>

      {/* Expanded section: stats + node map */}
      {expanded && (
        <div className="cp-expanded">
          {/* Stability graph */}
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

          {/* Stats grid */}
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
              <span className="cp-stat-value">{sourceNode} &rarr; {destNode}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Travel</span>
              <span className="cp-stat-value">
                {lastPathResult
                  ? `${lastPathResult.hops} hops`
                  : `${findPreviewHops()} hops`}
              </span>
            </div>
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

  function findPreviewHops() {
    // Quick preview of hop count without full path calc
    if (sourceNode === destNode) return 0;
    // Simple estimate: direct neighbors = 1, through hub = 2
    const directEdge = edges.find(
      (e) =>
        (e.from === sourceNode && e.to === destNode) ||
        (e.from === destNode && e.to === sourceNode)
    );
    return directEdge ? 1 : 2;
  }
};

export default ControlPanel;
