import React from 'react';

const Gate = ({ size = '300px', children }) => {
    return (
        <div style={{
            position: 'relative',
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Outer Ring */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: '50%',
                border: '15px solid #2a2a2a',
                boxShadow: '0 0 15px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.8)',
                background: 'linear-gradient(135deg, #333 0%, #111 100%)',
                zIndex: 10
            }}>
                {/* Chevron-like details */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                    <div key={deg} style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: '20px', height: '40px',
                        background: '#444',
                        border: '1px solid #555',
                        transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-140px)`, // Pushes to edge
                        boxShadow: '0 0 5px #000'
                    }} />
                ))}
            </div>

            {/* Inner Content (Wormhole) */}
            <div style={{ zIndex: 5, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </div>
        </div>
    );
};

export default Gate;
