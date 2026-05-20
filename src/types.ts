// ═══════════════════════════════════════════════════════════
// types.ts — Core type definitions for Project Society
// ═══════════════════════════════════════════════════════════

/** The four main agent strategies */
export enum Strategy {
  Cooperator = 'Cooperator',
  Defector = 'Defector',
  TitForTat = 'Tit-for-Tat',
  Grudger = 'Grudger',
}

/** All strategy values as an array for random selection */
export const ALL_STRATEGIES: Strategy[] = [
  Strategy.Cooperator,
  Strategy.Defector,
  Strategy.TitForTat,
  Strategy.Grudger,
];

/** Possible actions in a Prisoner's Dilemma round */
export enum Action {
  Cooperate = 'Cooperate',
  Defect = 'Defect',
}

/** Animation state for stick figure */
export enum AnimState {
  Walking = 'Walking',
  Cooperating = 'Cooperating',
  Defecting = 'Defecting',
  Dying = 'Dying',
  Spawning = 'Spawning',
}

/** Strategy → color mapping */
export const STRATEGY_COLORS: Record<Strategy, string> = {
  [Strategy.Cooperator]: '#22c55e', // Green
  [Strategy.Defector]:   '#ef4444', // Red
  [Strategy.TitForTat]:  '#3b82f6', // Blue
  [Strategy.Grudger]:    '#a855f7', // Purple
};

/** Strategy → glow mapping */
export const STRATEGY_GLOWS: Record<Strategy, string> = {
  [Strategy.Cooperator]: 'rgba(34, 197, 94, 0.4)',
  [Strategy.Defector]:   'rgba(239, 68, 68, 0.4)',
  [Strategy.TitForTat]:  'rgba(59, 130, 246, 0.4)',
  [Strategy.Grudger]:    'rgba(168, 85, 247, 0.4)',
};

/** Strategy short labels for display */
export const STRATEGY_LABELS: Record<Strategy, string> = {
  [Strategy.Cooperator]: 'COOP',
  [Strategy.Defector]:   'DEF',
  [Strategy.TitForTat]:  'TFT',
  [Strategy.Grudger]:    'GRG',
};

/** Visual effect data for interaction bursts */
export interface InteractionEffect {
  x: number;
  y: number;
  actionA: Action;
  actionB: Action;
  alpha: number;
  createdAt: number;
}
