import React, { useRef, useEffect } from 'react';

const NodeMap = ({ nodes, edges, nodeStates = {}, activePath = [], sourceNode, destNode, onSelectNode }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    const nodeList = Object.values(nodes);
    const nodePositions = {};
    nodeList.forEach(n => {
      nodePositions[n.id] = { x: n.x * W, y: n.y * H };
    });

    // Draw edges
    edges.forEach(({ from, to }) => {
      const a = nodePositions[from];
      const b = nodePositions[to];
      if (!a || !b) return;

      const isActive = activePath.includes(from) && activePath.includes(to) &&
        Math.abs(activePath.indexOf(from) - activePath.indexOf(to)) === 1;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isActive ? '#00ffcc' : 'rgba(100, 160, 220, 0.3)';
      ctx.lineWidth = isActive ? 2.5 : 1;
      ctx.stroke();

      if (isActive) {
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Draw nodes
    nodeList.forEach(n => {
      const pos = nodePositions[n.id];
      const state = nodeStates[n.id] || { heat: 0, load: 0 };
      const isSource = n.id === sourceNode;
      const isDest = n.id === destNode;
      const isOnPath = activePath.includes(n.id);

      const nodeRadius = 14;

      // Heat ring
      if (state.heat > 0.5) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, ${Math.max(0, 180 - state.heat * 18)}, 0, ${Math.min(0.8, state.heat * 0.1)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);

      if (isSource) {
        ctx.fillStyle = '#00aaff';
      } else if (isDest) {
        ctx.fillStyle = '#ff6600';
      } else if (isOnPath) {
        ctx.fillStyle = '#00cc88';
      } else {
        ctx.fillStyle = 'rgba(40, 60, 90, 0.9)';
      }
      ctx.fill();
      ctx.strokeStyle = isOnPath ? '#00ffcc' : 'rgba(100, 160, 220, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, pos.x, pos.y);

      // Gate count below
      const gatesUsed = Math.min(n.gates, Math.ceil(state.load));
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '8px monospace';
      ctx.fillText(`${gatesUsed}/${n.gates}g`, pos.x, pos.y + nodeRadius + 10);
    });
  }, [nodes, edges, nodeStates, activePath, sourceNode, destNode]);

  const handleClick = (e) => {
    if (!onSelectNode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeList = Object.values(nodes);
    for (const n of nodeList) {
      const nx = n.x * rect.width;
      const ny = n.y * rect.height;
      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      if (dist < 20) {
        onSelectNode(n.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        cursor: onSelectNode ? 'pointer' : 'default',
      }}
    />
  );
};

export default NodeMap;
