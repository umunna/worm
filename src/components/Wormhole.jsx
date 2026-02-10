import React from 'react';

const Wormhole = ({ color = 'green', size = '200px', constriction = 0, isCollapsed, phase = 'stable', style: propStyle }) => {
  // Phase: 'offline', 'igniting', 'stable', 'collapsed'

  if (phase === 'offline') {
    return <div className="wormhole-offline" style={{ width: 10, height: 10, background: 'transparent' }} />;
  }

  // Visuals
  // As constriction increases, the wormhole gets more "nervous" (shakes)
  const shakeAmount = isCollapsed ? 0 : Math.pow(constriction, 2) * 5;
  const shake = `translate(${(Math.random() - 0.5) * shakeAmount}px, ${(Math.random() - 0.5) * shakeAmount}px)`;

  const mainColor = isCollapsed ? '#ff0000' : color;

  // As it constricts, the "event horizon" glow gets tighter
  const glowSize = isCollapsed ? 50 : 20 + (1 - constriction) * 10;

  let animation = isCollapsed ? 'none' : `swirl ${Math.max(0.5, 4 * (1 - constriction))}s infinite linear`;
  let transform = `${propStyle?.transform || ''} ${shake}`;
  let opacity = 1;
  let borderRadius = '50%';
  let border = `2px solid ${isCollapsed ? 'red' : 'transparent'}`;
  let boxShadow = `0 0 ${glowSize}px ${mainColor}, inset 0 0 ${glowSize * 2}px ${mainColor}`;

  // Ignition Overrides
  if (phase === 'igniting') {
    animation = 'spin-expand 3s ease-out forwards';
    boxShadow = `0 0 50px ${mainColor}`;
    border = `5px solid ${mainColor}`;
    // Logic: It starts as a dot (scale 0 in keyframe) and spins out to a ring
  }

  const style = {
    ...propStyle,
    width: size,
    height: size,
    // When collapsed, it's a solid singularity. When open, it's a hole.
    backgroundColor: (isCollapsed || phase === 'igniting') ? 'transparent' : 'black',
    boxShadow,
    border,
    borderTopColor: phase === 'igniting' ? mainColor : mainColor,
    borderRightColor: phase === 'igniting' ? mainColor : `rgba(255,255,255, ${0.1 + constriction * 0.5})`,
    borderRadius,
    animation,
    transform,
    transition: 'width 0.2s, height 0.2s, box-shadow 0.1s',
  };

  return (
    <>
      {phase === 'igniting' && (
        <div style={{
          position: 'absolute',
          width: '10px', height: '10px',
          borderRadius: '50%',
          background: '#fff',
          animation: 'singularity-pulse 0.5s infinite',
          zIndex: 20
        }} />
      )}
      <div className="wormhole" style={style}></div>
    </>
  );
};

export default Wormhole;
