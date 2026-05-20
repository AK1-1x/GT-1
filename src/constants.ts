// ═══════════════════════════════════════════════════════════
// constants.ts — Tunable parameters for Project Society
// ═══════════════════════════════════════════════════════════

/** Prisoner's Dilemma payoff values (applied to energy) */
export const PAYOFF = {
  MUTUAL_COOPERATE: 4,    // CC — both gain well
  MUTUAL_DEFECT: 0,       // DD — nothing
  TEMPTATION: 5,          // Defector exploits cooperator
  SUCKER: -1,             // Cooperator gets exploited
} as const;

/** Agent physics & lifecycle */
export const AGENT = {
  MAX_SPEED: 1.2,
  MAX_FORCE: 0.05,
  /** Starting energy for all new agents */
  INITIAL_ENERGY: 30,
  /** Energy drained per frame (cost of living / starvation) */
  COST_OF_LIVING: 0.008,
  /** Energy threshold for death */
  DEATH_THRESHOLD: 0,
  /** Energy threshold for reproduction */
  REPRODUCTION_THRESHOLD: 40,
  /** How close agents must be to interact (px) */
  INTERACTION_DISTANCE: 65,
  /** Cooldown frames between interactions with any agent */
  INTERACTION_COOLDOWN: 90,
  /** Stick figure visual scale */
  FIGURE_SCALE: 1.1,
  /** Hard cap on population to keep things readable */
  MAX_POPULATION: 60,
} as const;

/** Steering behavior weights */
export const STEER = {
  WANDER: 0.45,
  WANDER_DISTANCE: 22,
  WANDER_RADIUS: 10,
  WANDER_JITTER: 0.3,
  BOUNDARY: 2.5,
  BOUNDARY_MARGIN: 65,
  /** Separation force to avoid overlapping stick figures */
  SEPARATION: 1.6,
  SEPARATION_DISTANCE: 40,
} as const;

/** Animation durations in frames */
export const ANIM = {
  GESTURE_DURATION: 60,
  WALK_CYCLE_SPEED: 0.09,
  /** Death fade-out duration (frames) */
  DEATH_DURATION: 40,
  /** Spawn grow-in duration (frames) */
  SPAWN_DURATION: 30,
} as const;

/** Arena visual constants */
export const ARENA = {
  WALL_THICKNESS: 28,
} as const;

/** Default values */
export const DEFAULTS = {
  INITIAL_POPULATION: 20,
  MUTATION_CHANCE: 5, // percent
  SPEED_MULTIPLIER: 1,
} as const;
