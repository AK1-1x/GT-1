// ═══════════════════════════════════════════════════════════
// main.ts — Project Society entry point
// ═══════════════════════════════════════════════════════════

import { Simulation } from './Simulation';

const sim = new Simulation('simulation-canvas');
sim.start();

console.log(
  '%c🧬 Project Society %c— Simulation Started',
  'color: #6366f1; font-weight: bold; font-size: 14px;',
  'color: #94a3b8; font-size: 12px;'
);
console.log(
  '%c20 stick figures. 4 strategies. Energy-driven survival. Watch them evolve.',
  'color: #64748b; font-size: 11px;'
);
