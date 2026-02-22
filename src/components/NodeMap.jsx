import React, { useRef, useEffect } from 'react';

const NodeMap = ({ nodes, edges, nodeStates = {}, activePath = [], sourceNode, destNode, onSelectNode }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const nodeList = Object.values(nodes);

    const render = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      ctx.clearRect(0, 0, W, H);

      const positions = {};
      nodeList.forEach(n => {
        positions[n.id] = { x: n.x * W, y: n.y * H };
      });

      // Draw edges
      edges.forEach(({ from, to, weight }) => {
        const a = positions[from];
        const b = positions[to];
        if (!a || !b) return;

        const fromIdx = activePath.indexOf(from);
        const toIdx = activePath.indexOf(to);
        const isActive = fromIdx >= 0 && toIdx >= 0 && Math.abs(fromIdx - toIdx) === 1;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isActive) {
          ctx.strokeStyle = '#00ffcc';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#00ffcc';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = 'rgba(80, 140, 200, 0.2)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Distance label on edge midpoint
        if (W > 200) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${weight}km`, mx, my);
        }
      });

      // Draw nodes
      const nodeRadius = Math.min(16, W * 0.06);
      nodeList.forEach(n => {
        const pos = positions[n.id];
        const state = nodeStates[n.id] || { heat: 0, load: 0 };
        const isSource = n.id === sourceNode;
        const isDest = n.id === destNode;
        const isOnPath = activePath.includes(n.id);

        // Heat glow ring
        if (state.heat > 0.5) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, nodeRadius + 4, 0, Math.PI * 2);
          const heatAlpha = Math.min(0.8, state.heat * 0.1);
          ctx.strokeStyle = `rgba(255, ${Math.max(0, 200 - state.heat * 20)}, 50, ${heatAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Active path pulse
        if (isOnPath) {
          const pulse = 0.3 + Math.sin(t * 4) * 0.15;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, nodeRadius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 255, 200, ${pulse})`;
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        if (isSource) {
          ctx.fillStyle = '#0088ff';
        } else if (isDest) {
          ctx.fillStyle = '#ff6600';
        } else {
          ctx.fillStyle = 'rgba(30, 50, 75, 0.9)';
        }
        ctx.fill();

        ctx.strokeStyle = isOnPath ? '#00ffcc' : 'rgba(80, 140, 200, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(12, nodeRadius * 0.8)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.id, pos.x, pos.y);

        // Load indicator below
        if (W > 160) {
          const loadBar = state.load / 10;
          const barW = nodeRadius * 1.4;
          const barH = 3;
          const bx = pos.x - barW / 2;
          const by = pos.y + nodeRadius + 6;
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(bx, by, barW, barH);
          ctx.fillStyle = state.load > 6 ? '#ff4444' : state.load > 3 ? '#ffaa00' : '#00ccff';
          ctx.fillRect(bx, by, barW * loadBar, barH);
        }
      });

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [nodes, edges, nodeStates, activePath, sourceNode, destNode]);

  const handleClick = (e) => {
    if (!onSelectNode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const n of Object.values(nodes)) {
      const nx = n.x * rect.width;
      const ny = n.y * rect.height;
      if (Math.sqrt((x - nx) ** 2 + (y - ny) ** 2) < 22) {
        onSelectNode(n.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: onSelectNode ? 'pointer' : 'default' }}
    />
  );
};

export default NodeMap;
