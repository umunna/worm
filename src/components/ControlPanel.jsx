import React from 'react';

const ControlPanel = ({
    radius,
    shapeFunc, // b(r)
    exoticMatter,
    exoticTank,
    metricHistory,
    harvesting,
    onInjectExotic,
    onSendMatter,
    onToggleHarvest,
    onReset,
    isCollapsed,
    transitActive,
    gateStatus
}) => {
    // Metric condition: b(r) < r
    const ratio = shapeFunc / radius;
    const isStable = ratio < 1.0;

    // Graph Logic
    // metricHistory contains b(r) values. We want to plot them relative to r.
    // SVG Height = 50px. Max value = r (10.0).
    const graphPoints = metricHistory ? metricHistory.map((val, i) => {
        const x = (i / 50) * 100; // 0 to 100% width
        const y = 100 - (val / radius) * 100; // 0 to 100% height (inverted, 0 at bottom)
        return `${x},${y}`;
    }).join(' ') : '';

    return (
        <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: 'min(400px, 90%)',
            zIndex: 100,
            maxWidth: '90vw',
            fontFamily: 'monospace'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontFamily: 'Inter, sans-serif' }}>Field Equations</h3>
                <span style={{
                    fontSize: '0.8rem',
                    color: isStable ? '#00ff00' : '#ff0000',
                    border: '1px solid currentColor',
                    padding: '2px 8px',
                    borderRadius: '4px'
                }}>
                    {isCollapsed ? 'SINGULARITY' : 'TRAVERSABLE'}
                </span>
            </div>

            {/* Metric Graph */}
            <div style={{
                height: '60px',
                background: '#111',
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #333'
            }}>
                {/* Limit Line (r) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderBottom: '1px dashed #ff0000', height: '0px' }}></div>
                <span style={{ position: 'absolute', top: '2px', right: '5px', color: '#ff0000', fontSize: '0.6rem' }}>r (Horizon)</span>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <polyline
                        points={graphPoints}
                        fill="none"
                        stroke={ratio > 0.8 ? '#ff0055' : '#00ffff'}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.85rem',
                color: '#ccc',
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '10px',
                borderRadius: '8px'
            }}>
                <div>Throat Radius <br /><strong style={{ color: '#fff', fontSize: '1.1rem' }}>r = {radius.toFixed(2)} m</strong></div>
                <div>Shape Func <br /><strong style={{ color: ratio > 0.8 ? '#ff0055' : '#00ffff', fontSize: '1.1rem' }}>b(r) = {shapeFunc.toFixed(2)} m</strong></div>

                <div style={{ gridColumn: 'span 2', marginTop: '5px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
                    <div style={{ fontSize: '0.75rem', marginTop: '0px', color: '#888' }}>
                        Est. Transit Time: <span style={{ color: '#fff' }}>{((1000 * (1 / Math.max(0.01, 1 - ratio)) + 2000) / 1000).toFixed(2)}s</span>
                    </div>
                </div>
            </div>

            {/* Exotic Tank */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa' }}>
                    <span>Vacuum Energy Density {harvesting && <span style={{ color: '#00ff00', animation: 'pulse 1s infinite' }}>▲ PUMPING</span>}</span>
                    <span style={{ color: exoticTank < 20 ? '#ff0000' : '#00ffff' }}>{exoticTank.toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: '2px' }}>
                    <div style={{
                        width: `${exoticTank}%`,
                        height: '100%',
                        background: exoticTank < 20 ? '#ff0000' : '#00ffff',
                        transition: 'width 0.2s',
                        borderRadius: '2px',
                        boxShadow: harvesting ? '0 0 10px #00ff00' : 'none'
                    }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={onInjectExotic}
                    disabled={exoticMatter || exoticTank <= 0}
                    style={{
                        flex: 2,
                        padding: '12px',
                        backgroundColor: exoticMatter ? '#004444' : exoticTank <= 0 ? '#333' : '#00aaaa',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (exoticMatter || exoticTank <= 0) ? 'default' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s',
                        opacity: exoticMatter ? 0.6 : 1,
                        fontSize: '0.8rem'
                    }}
                >
                    {exoticTank <= 0 ? 'SOURCE DEPLETED' :
                        gateStatus === 'igniting' ? 'IGNITION SEQUENCE...' :
                            gateStatus === 'online' ? 'MODULATORS ACTIVE' :
                                'INITIATE STARTUP'}
                </button>

                <button
                    onClick={onToggleHarvest}
                    style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: harvesting ? '#006622' : '#333',
                        color: 'white',
                        border: harvesting ? '1px solid #00ff00' : '1px solid #555',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        lineHeight: '1.2',
                        transition: 'all 0.2s'
                    }}
                >
                    {harvesting ? 'PUMPS ENGAGED' : 'VACUUM PUMPS'}
                </button>

                <button
                    onClick={onSendMatter}
                    disabled={isCollapsed || transitActive}
                    style={{
                        flex: 2,
                        padding: '12px',
                        backgroundColor: isCollapsed ? '#333' : transitActive ? '#aa00aa' : '#aa00aa',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isCollapsed ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s',
                        fontSize: '0.8rem'
                    }}
                >
                    {transitActive ? 'TRANSITING...' : 'SEND PROBE'}
                </button>
            </div>

            {isCollapsed && (
                <button
                    onClick={onReset}
                    style={{
                        padding: '8px',
                        backgroundColor: 'transparent',
                        border: '1px solid #ff3333',
                        color: '#ff3333',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '5px'
                    }}
                >
                    RESET METRIC
                </button>
            )}
        </div>
    );
};

export default ControlPanel;
