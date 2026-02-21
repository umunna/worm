import React, { useRef, useEffect, useState } from 'react';

const Wormhole = ({ constriction = 0, isCollapsed, phase = 'offline', side = 'entry', label }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState(320);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const s = Math.min(rect.width, rect.height, 400);
        setCanvasSize(Math.max(160, s));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const SIZE = canvasSize;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    const R = SIZE * 0.3;
    const r = SIZE * 0.12;

    const render = () => {
      timeRef.current += 0.015;
      const t = timeRef.current;

      ctx.clearRect(0, 0, SIZE, SIZE);

      if (phase === 'offline') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.3, R * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(80, 120, 180, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const ignitionProgress = phase === 'igniting' ? Math.min(1, t * 0.33) : 1;
      const collapseGlow = isCollapsed ? 0.3 + Math.sin(t * 8) * 0.2 : 0;

      const tiltAngle = 0.4;
      const cosA = Math.cos(tiltAngle);
      const sinA = Math.sin(tiltAngle);

      // Background glow
      const glowRadius = R * 1.6 * ignitionProgress;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      if (isCollapsed) {
        grad.addColorStop(0, 'rgba(255, 30, 30, 0.15)');
        grad.addColorStop(0.5, 'rgba(180, 0, 0, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(60, 120, 220, 0.2)');
        grad.addColorStop(0.4, 'rgba(40, 80, 180, 0.08)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Magnetic field lines
      const fieldLineCount = 8;
      ctx.globalAlpha = 0.12 * ignitionProgress;
      for (let i = 0; i < fieldLineCount; i++) {
        const angle = (i / fieldLineCount) * Math.PI * 2 + t * 0.2;
        const startX = cx + Math.cos(angle) * R * 0.9;
        const startY = cy + Math.sin(angle) * R * 0.5 * cosA;
        const ext = R * 0.8 + Math.sin(t + i) * 20;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle) * (R + ext),
          cy + Math.sin(angle) * (R + ext) * 0.5,
          cx + Math.cos(angle + 0.5) * R * 0.9,
          cy + Math.sin(angle + 0.5) * R * 0.5 * cosA
        );
        ctx.strokeStyle = isCollapsed ? '#ff4444' : '#8ab8ff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const ringCount = 48;
      const flowLineCount = 24;

      // Back half
      drawTorusHalf(ctx, cx, cy, R, r, ringCount, flowLineCount, t, cosA, sinA,
        ignitionProgress, constriction, isCollapsed, collapseGlow, 'back', side);

      // Dark center
      const holeW = R * 0.65 * ignitionProgress * (1 - constriction * 0.6);
      const holeH = holeW * 0.55;

      const holeGrad = ctx.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy - R * 0.1, Math.max(holeW, holeH));
      holeGrad.addColorStop(0, isCollapsed ? 'rgba(60, 0, 0, 0.95)' : 'rgba(5, 5, 25, 0.97)');
      holeGrad.addColorStop(0.6, isCollapsed ? 'rgba(40, 0, 0, 0.8)' : 'rgba(10, 15, 45, 0.85)');
      holeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy - R * 0.08, holeW, holeH, 0, 0, Math.PI * 2);
      ctx.fillStyle = holeGrad;
      ctx.fill();
      ctx.restore();

      // Stars inside hole
      if (!isCollapsed) {
        for (let i = 0; i < 6; i++) {
          const sx = cx + Math.cos(i * 1.7 + t * 0.1) * holeW * 0.5;
          const sy = cy - R * 0.08 + Math.sin(i * 2.3 + t * 0.15) * holeH * 0.4;
          const so = 0.2 + Math.sin(t * 2 + i) * 0.15;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 220, 255, ${so})`;
          ctx.fill();
        }
      }

      // Front half
      drawTorusHalf(ctx, cx, cy, R, r, ringCount, flowLineCount, t, cosA, sinA,
        ignitionProgress, constriction, isCollapsed, collapseGlow, 'front', side);

      // Bright spots
      if (!isCollapsed && phase === 'online') {
        for (let i = 0; i < 2; i++) {
          const spotAngle = t * 0.3 + i * Math.PI;
          const sx = cx + Math.cos(spotAngle) * R * 1.05;
          const sy = cy + Math.sin(spotAngle) * R * 0.5 * cosA;
          const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
          spotGrad.addColorStop(0, 'rgba(255, 200, 255, 0.9)');
          spotGrad.addColorStop(0.3, 'rgba(200, 100, 255, 0.4)');
          spotGrad.addColorStop(1, 'rgba(100, 50, 200, 0)');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(sx - 8, sy - 8, 16, 16);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, isCollapsed, constriction, side, canvasSize]);

  return (
    <div ref={containerRef} className="wormhole-wrapper">
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize, height: canvasSize, maxWidth: '100%', maxHeight: '100%' }}
      />
      <span className="wormhole-label">{label || (side === 'entry' ? 'Entry Point' : 'Exit Point')}</span>
    </div>
  );
};

function drawTorusHalf(ctx, cx, cy, R, r, ringCount, flowLineCount, t, cosA, sinA,
  ignitionProgress, constriction, isCollapsed, collapseGlow, half, side) {

  for (let fl = 0; fl < flowLineCount; fl++) {
    const tubeAngle = (fl / flowLineCount) * Math.PI * 2;
    const flowSpeed = side === 'entry' ? 0.4 : -0.4;

    ctx.beginPath();
    let started = false;

    for (let ri = 0; ri <= ringCount; ri++) {
      const torusAngle = (ri / ringCount) * Math.PI * 2;

      const isBack = Math.sin(torusAngle) < 0;
      if (half === 'back' && !isBack) continue;
      if (half === 'front' && isBack) continue;

      const throatFactor = 1 - constriction * 0.5 * (1 - Math.abs(Math.sin(torusAngle)));
      const currentR = r * throatFactor * ignitionProgress;

      const tubeOffset = tubeAngle + t * flowSpeed + torusAngle * 0.3;
      const px = (R + currentR * Math.cos(tubeOffset)) * Math.cos(torusAngle);
      const py = currentR * Math.sin(tubeOffset) * cosA - (R + currentR * Math.cos(tubeOffset)) * Math.sin(torusAngle) * sinA;

      const screenX = cx + px;
      const screenY = cy + py;

      if (!started) {
        ctx.moveTo(screenX, screenY);
        started = true;
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }

    const depth = Math.sin(tubeAngle);
    let alpha;
    if (half === 'back') {
      alpha = (0.08 + depth * 0.04) * ignitionProgress;
    } else {
      alpha = (0.25 + depth * 0.15) * ignitionProgress;
    }

    if (isCollapsed) {
      const rr = 180 + Math.sin(t * 3 + fl) * 60;
      ctx.strokeStyle = `rgba(${rr}, 30, 20, ${alpha + collapseGlow * 0.2})`;
    } else {
      const hue = 200 + Math.sin(tubeAngle + t * 0.5) * 30;
      const sat = 60 + Math.sin(fl * 0.5) * 20;
      const light = 55 + depth * 20 + Math.sin(t + fl * 0.3) * 10;
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    }

    ctx.lineWidth = half === 'front' ? 1.2 : 0.6;
    ctx.stroke();
  }

  if (half === 'front' && !isCollapsed) {
    for (let s = 0; s < 6; s++) {
      const sAngle = (s / 6) * Math.PI * 2 + t * 0.2;
      const sR = R + r * 0.5 * Math.cos(sAngle * 3 + t);
      const sx = cx + sR * Math.cos(sAngle) * 0.95;
      const sy = cy + sR * Math.sin(sAngle) * 0.45 * cosA;

      const hlGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.4);
      hlGrad.addColorStop(0, `rgba(180, 220, 255, ${0.06 * ignitionProgress})`);
      hlGrad.addColorStop(1, 'rgba(100, 160, 220, 0)');
      ctx.fillStyle = hlGrad;
      ctx.fillRect(sx - r * 0.4, sy - r * 0.4, r * 0.8, r * 0.8);
    }
  }
}

export default Wormhole;
