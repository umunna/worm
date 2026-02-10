import React from 'react';

const Probe = ({ phase }) => {
    if (phase === 'idle' || phase === 'traversing') return null;

    const isEntering = phase === 'entering';

    // Position Logic:
    // Entering: Starts left of Left Wormhole, moves into it.
    // Exiting: Starts inside Right Wormhole, moves right of it.

    // We'll use absolute positioning relative to the container.
    // Assuming Wormholes are at 25% and 75% roughly in flexbox, 
    // but simpler to put Probe inside the container and use percentages.

    const style = {
        position: 'absolute',
        width: '20px',
        height: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '50%',
        boxShadow: '0 0 10px #ffffff, 0 0 20px #00ffff',
        zIndex: 50,
        pointerEvents: 'none',
        animation: isEntering ? 'probe-enter 1s ease-in forwards' : 'probe-exit 1s ease-out forwards',
        // Initial positions before animation takes over roughly
        left: isEntering ? '25%' : '75%',
        top: '50%',
    };

    return <div className="probe" style={style}></div>;
};

export default Probe;
