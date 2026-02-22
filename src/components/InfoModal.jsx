import React, { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  {
    title: 'Transport Network',
    content: [
      {
        heading: 'Why 7 Nodes Per Gate',
        body: 'Each gate contains a cluster of 7 nodes arranged in a heptagonal mesh. Seven was chosen because a 7-sided ring gives each node 4 alternate paths (2 ring neighbours + 2 cross-link shortcuts), so no single node failure can isolate part of the network. This is the fundamental unit of the topology.'
      },
      {
        heading: 'Structure',
        items: [
          '7 nodes (N1-N7) form 1 gate',
          'Heptagonal mesh with ring edges and cross-links',
          'Each node tracks heat and load independently',
          'Designed to reduce overheating and balance load'
        ]
      },
      {
        heading: 'Edge Types',
        table: {
          headers: ['Type', 'Count', 'Distance', 'Purpose'],
          rows: [
            ['Ring edges', '7', '10 km', 'Adjacent node backbone'],
            ['Cross-links', '7', '18 km', 'Skip-1 shortcuts for load balancing'],
          ]
        }
      },
      {
        heading: 'Scaling',
        body: 'The system supports 7,000 gates (49,000+ nodes). Gates connect through boundary nodes with 20 km inter-gate edges. Min-heap Dijkstra runs at O((V+E) log V) for efficient pathfinding at scale.'
      }
    ]
  },
  {
    title: 'Travel Energy Model',
    content: [
      {
        heading: 'Energy Constant',
        formula: 'TE = 130 MJ/km',
        body: 'Derived from aircraft cruise data: ~30 kg fuel per 10 km at 43 MJ/kg energy density. This gives (30 x 43) / 10 = 129 MJ/km, rounded to 130.'
      },
      {
        heading: 'Gate Coverage Distance',
        formula: 'D = n x d_node x g = 7 x 10 x 1 = 70 km',
        body: 'D represents total spatial coverage. Each gate covers n x d_node km. With g gates, coverage scales linearly. At 7,000 gates, D = 490,000 km.'
      },
      {
        heading: 'Total Travel Energy',
        formula: 'E_total = TE x D_path',
        body: 'Energy scales linearly with distance under steady-state conditions. No acceleration/deceleration phases in the model.'
      },
      {
        heading: 'Household Equivalence',
        formula: '1 km of travel ~ 1 household-day of energy',
        body: 'Typical household daily use is 30-36 kWh (108-130 MJ). Since TE = 130 MJ/km, each km costs roughly one household-day. A 20 km trip costs what a household uses in 20 days.'
      },
      {
        heading: 'Coverage Efficiency',
        formula: 'CEE = 1 / TE = 0.00769 km/MJ',
        body: 'Measures how far you travel per unit energy. Constant regardless of distance because scaling is linear.'
      }
    ]
  },
  {
    title: 'Energy System',
    content: [
      {
        heading: 'Antimatter Auto-Intake',
        body: 'Once the wormhole opens, antimatter is drawn from the atmosphere automatically. This intake creates the curvature needed for stabilization. There is no manual recharge -- the source is constant.'
      },
      {
        heading: 'Energy Bar Capacity',
        formula: '100% bar = 23,400 MJ',
        body: 'Calibrated so a single gate supports 5-8 probe transits on a full bar. The longest single-gate path (~36 km) costs ~20% of the bar. Shorter paths cost 5-10%.'
      },
      {
        heading: 'Energy Rates',
        table: {
          headers: ['Rate', 'Per Second', 'When Active'],
          rows: [
            ['Antimatter intake', '+3.6%/sec', 'Gate alive (any state)'],
            ['Stabilisation drain', '-1.2%/sec', 'Stabiliser active'],
            ['Transit extra drain', '-1.6%/sec', 'Probe in transit'],
          ]
        }
      },
      {
        heading: 'Net Rates',
        table: {
          headers: ['State', 'Net/sec', 'Recovery for 20%'],
          rows: [
            ['Online idle', '+2.4%', '~8 seconds'],
            ['During transit', '+0.8%', '~25 seconds'],
            ['Recharging', '+3.6%', '~6 seconds'],
          ]
        }
      },
      {
        heading: 'Upfront Transit Cost',
        formula: 'cost% = (130 x D_path / 23,400) x 100',
        body: 'Example: N1 to N5 (28 km) costs 130 x 28 / 23,400 x 100 = 15.6%. This is the primary drain -- the continuous transit drain is secondary.'
      },
      {
        heading: 'Recharge Cycle',
        body: 'When energy hits 0%, the stabiliser turns off but the wormhole persists. Intake continues at +3.6%/sec with no drain. At 30% energy, the stabiliser auto-resumes. This takes approximately 8 seconds.'
      }
    ]
  },
  {
    title: 'Pathfinding',
    content: [
      {
        heading: 'Dijkstra with Dynamic Penalties',
        formula: 'weight = base + (heat x 0.8) + (load x 0.5)',
        body: 'Heat is weighted higher (0.8) because reducing overheating is the primary concern. A node at heat 10 adds 8 km of penalty, strongly diverting traffic. Load is weighted lower (0.5) because some load is acceptable.'
      },
      {
        heading: 'Traversal Time',
        formula: 'T = (D x 30ms + hops x 150ms) x 1.5',
        body: 'The 1.5x fixed time multiplier comes from the Time Splice configuration. Each km takes 30ms base, each node hop adds 150ms for handoff delay.'
      }
    ]
  },
  {
    title: 'Curvature',
    content: [
      {
        heading: 'Physics Loop',
        items: [
          'Curvature rises +0.05/tick (natural tendency to close)',
          'Stabiliser counteracts at -0.3/tick (net: keeps it open)',
          'Transit stress adds +0.2/tick (mass passing through)',
          'If curvature reaches throat radius (10.0), wormhole collapses'
        ]
      },
      {
        heading: 'Antimatter Injection',
        body: 'Before opening, a 2.5-second injection phase draws dark, near-invisible antimatter particles inward. Antimatter is invisible -- you only see where space bends. After injection, the wormhole ignites into its toroidal form over 3 more seconds.'
      }
    ]
  },
  {
    title: 'Key Formulas',
    content: [
      {
        heading: 'Summary Table',
        table: {
          headers: ['Formula', 'Expression', 'Source'],
          rows: [
            ['Gate coverage', 'D = n x d x g', 'PDF Eq. 7'],
            ['Travel energy', 'E = 130 x D_path', 'PDF Eq. 10'],
            ['Household equiv.', '~1 km = ~1 day', 'PDF Eq. 5'],
            ['Efficiency', 'CEE = 1/130', 'PDF Eq. 22'],
            ['Traversal time', '(D*30 + hops*150) x 1.5', 'Ref notes'],
            ['Edge penalty', 'base + heat*0.8 + load*0.5', 'Ref notes'],
            ['Energy cost', '(130*D / 23,400) x 100%', 'Calibrated'],
          ]
        }
      }
    ]
  }
];

export default function InfoModal({ isOpen, onClose }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Scroll content to top when tab changes
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab]);

  if (!isOpen) return null;

  const section = SECTIONS[activeTab];

  return (
    <div className="info-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="info-modal" role="dialog" aria-modal="true" aria-label="Wormhole Gateway Documentation">

        {/* Header */}
        <div className="info-header">
          <h2 className="info-title">How It Works</h2>
          <button className="info-close" onClick={onClose} aria-label="Close documentation">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>

        {/* Tab navigation */}
        <div className="info-tabs">
          {SECTIONS.map((s, i) => (
            <button
              key={i}
              className={`info-tab ${i === activeTab ? 'info-tab-active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="info-content" ref={contentRef}>
          {section.content.map((block, i) => (
            <div key={i} className="info-block">
              <h3 className="info-block-heading">{block.heading}</h3>

              {block.formula && (
                <div className="info-formula">{block.formula}</div>
              )}

              {block.body && (
                <p className="info-block-body">{block.body}</p>
              )}

              {block.items && (
                <ul className="info-list">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}

              {block.table && (
                <div className="info-table-wrap">
                  <table className="info-table">
                    <thead>
                      <tr>
                        {block.table.headers.map((h, j) => <th key={j}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {block.table.rows.map((row, j) => (
                        <tr key={j}>
                          {row.map((cell, k) => <td key={k}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="info-footer">
          <p>2026 © nkthediligent</p>
        </div>
      </div>
    </div>
  );
}
