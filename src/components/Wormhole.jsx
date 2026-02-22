import React, { useRef, useEffect, useState } from 'react';

const Wormhole = ({ constriction = 0, isCollapsed, phase = 'offline', side = 'entry', label }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState(320);

  // Responsive sizing - measure container, clamp to reasonable range
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const available = Math.min(rect.width, rect.height, 400);
        setCanvasSize(Math.max(100, available));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
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

      // --- OFFLINE: dormant ring ---
      if (phase === 'offline') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.3, R * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(80, 120, 180, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Faint label hint
        ctx.fillStyle = 'rgba(80, 120, 180, 0.15)';
        ctx.font = `${SIZE * 0.035}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('DORMANT', cx, cy + R * 0.3);

        animRef.current = requestAnimationFrame(render);
        return;
      }

      // --- INJECTING: antimatter particles streaming inward ---
      // Antimatter is invisible. We show it as near-black dark distortions
      // with faint dark indigo shimmer -- you see where space bends, not the matter itself.
      if (phase === 'injecting') {
        // Subtle dark center void that pulses and grows
        const pulseAlpha = 0.06 + Math.sin(t * 3) * 0.03;
        const growRadius = R * 0.35 + Math.sin(t * 1.5) * R * 0.08;
        const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, growRadius);
        centerGrad.addColorStop(0, `rgba(10, 10, 40, ${pulseAlpha + 0.12})`);
        centerGrad.addColorStop(0.4, `rgba(8, 8, 30, ${pulseAlpha})`);
        centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerGrad;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Dark antimatter distortion particles -- near-invisible, just bending light
        const particleCount = 32;
        for (let i = 0; i < particleCount; i++) {
          const baseAngle = (i / particleCount) * Math.PI * 2;
          const speed = 0.4 + (i % 3) * 0.15;
          const progress = ((t * speed + i * 0.37) % 1.0);
          const dist = R * 1.5 * (1 - progress);
          const px = cx + Math.cos(baseAngle + t * 0.08) * dist;
          const py = cy + Math.sin(baseAngle + t * 0.08) * dist * 0.6;
          const pSize = 1.8 + progress * 2.5;

          // Dark core -- the antimatter itself (nearly invisible)
          const coreAlpha = progress * 0.25;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 15, 50, ${coreAlpha})`;
          ctx.fill();

          // Faint indigo edge glow -- the only hint something is there
          const edgeAlpha = progress * 0.12;
          ctx.beginPath();
          ctx.arc(px, py, pSize + 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(40, 30, 90, ${edgeAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Dark trailing wake
          for (let tr = 1; tr <= 2; tr++) {
            const trailProgress = Math.max(0, progress - tr * 0.05);
            const trailDist = R * 1.5 * (1 - trailProgress);
            const tx = cx + Math.cos(baseAngle + t * 0.08) * trailDist;
            const ty = cy + Math.sin(baseAngle + t * 0.08) * trailDist * 0.6;
            ctx.beginPath();
            ctx.arc(tx, ty, pSize * (1 - tr * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(12, 12, 45, ${coreAlpha * (1 - tr * 0.35)})`;
            ctx.fill();
          }
        }

        // Faint ring outline forming where antimatter converges
        const ringAlpha = 0.12 + Math.sin(t * 2.5) * 0.06;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.35, R * 0.18, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(30, 25, 70, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Very faint label
        ctx.fillStyle = `rgba(50, 45, 100, ${0.2 + Math.sin(t * 2.5) * 0.1})`;
        ctx.font = `${SIZE * 0.032}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('INJECTING', cx, cy + R * 0.35);

        animRef.current = requestAnimationFrame(render);
        return;
      }

      // --- RECHARGING: wormhole flickering, unstable, still present ---
      if (phase === 'recharging') {
        const flicker = 0.3 + Math.sin(t * 6) * 0.15 + Math.sin(t * 11) * 0.08;

        // Unstable glow
        const glowR = R * 1.2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        grad.addColorStop(0, `rgba(255, 170, 0, ${0.06 * flicker})`);
        grad.addColorStop(0.5, `rgba(180, 100, 0, ${0.03 * flicker})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Flickering torus outline
        const torusAlpha = flicker * 0.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.8, R * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 170, 0, ${torusAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cx, cy - R * 0.05, R * 0.5, R * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(5, 5, 20, ${0.6 * flicker})`;
        ctx.fill();

        // Warning dots
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.4;
          const dx = cx + Math.cos(a) * R * 0.75;
          const dy = cy + Math.sin(a) * R * 0.35;
          const da = flicker * (0.3 + Math.sin(t * 3 + i) * 0.15);
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 170, 0, ${da})`;
          ctx.fill();
        }

        ctx.fillStyle = `rgba(255, 170, 0, ${0.3 + Math.sin(t * 3) * 0.15})`;
        ctx.font = `${SIZE * 0.03}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('RECHARGING', cx, cy + R * 0.45);

        animRef.current = requestAnimationFrame(render);
        return;
      }

      // --- IGNITING / ONLINE / COLLAPSED: full torus ---
      const ignitionProgress = phase === 'igniting' ? Math.min(1, (t - 0) * 0.33) : 1;
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

      // Magnetic field lines -- sweeping curves extending outward
      const fieldLineCount = 14;
      for (let i = 0; i < fieldLineCount; i++) {
        const angle = (i / fieldLineCount) * Math.PI * 2 + t * 0.15;
        const startX = cx + Math.cos(angle) * R * 0.95;
        const startY = cy + Math.sin(angle) * R * 0.5 * cosA;
        const ext = R * 0.6 + Math.sin(t * 0.8 + i * 0.9) * R * 0.25;
        const endAngle = angle + 0.6;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          cx + Math.cos(angle + 0.3) * (R + ext),
          cy + Math.sin(angle + 0.3) * (R + ext) * 0.5,
          cx + Math.cos(endAngle) * R * 0.95,
          cy + Math.sin(endAngle) * R * 0.5 * cosA
        );
        const lineAlpha = (0.2 + Math.sin(t + i * 0.7) * 0.08) * ignitionProgress;
        ctx.strokeStyle = isCollapsed
          ? `rgba(255, 68, 68, ${lineAlpha})`
          : `rgba(138, 184, 255, ${lineAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Glowing dots along field lines
      const dotCount = 20;
      for (let i = 0; i < dotCount; i++) {
        const dotAngle = (i / dotCount) * Math.PI * 2 + t * 0.3;
        const wobble = Math.sin(t * 1.5 + i * 1.1) * R * 0.15;
        const dotR = R * 1.0 + wobble;
        const dx = cx + Math.cos(dotAngle) * dotR;
        const dy = cy + Math.sin(dotAngle) * dotR * 0.48 * cosA;
        const dotAlpha = (0.3 + Math.sin(t * 2.5 + i * 0.8) * 0.25) * ignitionProgress;
        const dotSize = 1.5 + Math.sin(t * 2 + i) * 0.8;

        ctx.beginPath();
        ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = isCollapsed
          ? `rgba(255, 100, 80, ${dotAlpha})`
          : `rgba(150, 210, 255, ${dotAlpha})`;
        ctx.fill();
      }

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

      // Bright accent spots -- magnetic hotspots
      if (!isCollapsed && (phase === 'online' || phase === 'igniting')) {
        const spotCount = phase === 'online' ? 3 : 2;
        for (let i = 0; i < spotCount; i++) {
          const spotAngle = t * 0.25 + i * (Math.PI * 2 / spotCount);
          const sx = cx + Math.cos(spotAngle) * R * 1.05;
          const sy = cy + Math.sin(spotAngle) * R * 0.5 * cosA;
          const spotSize = 10 + Math.sin(t * 3 + i) * 3;
          const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotSize);
          spotGrad.addColorStop(0, 'rgba(255, 220, 255, 0.95)');
          spotGrad.addColorStop(0.25, 'rgba(200, 120, 255, 0.5)');
          spotGrad.addColorStop(0.6, 'rgba(100, 60, 220, 0.15)');
          spotGrad.addColorStop(1, 'rgba(60, 30, 160, 0)');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(sx - spotSize, sy - spotSize, spotSize * 2, spotSize * 2);
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
