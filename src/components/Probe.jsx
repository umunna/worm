import React from 'react';

const Probe = ({ phase }) => {
  if (phase === 'idle' || phase === 'traversing') return null;

  const isEntering = phase === 'entering';

  return (
    <div
      className="probe"
      data-phase={phase}
      style={{
        position: 'absolute',
        width: '14px',
        height: '14px',
        backgroundColor: '#ffffff',
        borderRadius: '50%',
        boxShadow: '0 0 10px #ffffff, 0 0 20px #00ffff, 0 0 30px #0088ff',
        zIndex: 50,
        pointerEvents: 'none',
        top: '50%',
        left: isEntering ? '15%' : '85%',
        transform: 'translate(-50%, -50%)',
        animation: isEntering
          ? 'probe-enter-h 0.8s ease-in forwards'
          : 'probe-exit-h 0.8s ease-out forwards',
      }}
    />
  );
};

export default Probe;
