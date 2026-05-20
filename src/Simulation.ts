// ═══════════════════════════════════════════════════════════
// Simulation.ts — Project Society: Autonomous A-Life Simulation
// Manages a population of stick-figure agents with energy-driven
// lifecycle, iterated PD interactions, and evolutionary dynamics.
// ═══════════════════════════════════════════════════════════

import { Agent } from './Agent';
import { Renderer } from './Renderer';
import { applySteering } from './SteeringBehavior';
import { Strategy, Action, InteractionEffect, ALL_STRATEGIES, STRATEGY_COLORS } from './types';
import { PAYOFF, AGENT, DEFAULTS } from './constants';

export class Simulation {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;

  /** Living population */
  private agents: Agent[];
  /** Visual interaction effects */
  private effects: InteractionEffect[];

  /** Counters */
  private frame: number;
  private generation: number;
  private totalInteractions: number;
  private totalDeaths: number;

  /** Timing */
  private lastTime: number;
  private paused: boolean;
  private speedMultiplier: number;
  private mutationChance: number;

  /** HUD elements (cached) */
  private elPopulation: HTMLElement;
  private elGeneration: HTMLElement;
  private elDeaths: HTMLElement;
  private elInteractions: HTMLElement;
  private elCountCoop: HTMLElement;
  private elCountDef: HTMLElement;
  private elCountTft: HTMLElement;
  private elCountGrg: HTMLElement;
  private elBarCoop: HTMLElement;
  private elBarDef: HTMLElement;
  private elBarTft: HTMLElement;
  private elBarGrg: HTMLElement;
  private elLeader: HTMLElement;
  private elEventLog: HTMLElement;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error(`Canvas #${canvasId} not found`);

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.renderer = new Renderer(this.canvas);
    this.renderer.resize(this.canvas.width, this.canvas.height);

    this.agents = [];
    this.effects = [];
    this.frame = 0;
    this.generation = 0;
    this.totalInteractions = 0;
    this.totalDeaths = 0;
    this.lastTime = performance.now();
    this.paused = false;
    this.speedMultiplier = DEFAULTS.SPEED_MULTIPLIER;
    this.mutationChance = DEFAULTS.MUTATION_CHANCE;

    // Cache HUD elements
    this.elPopulation = document.getElementById('stat-population')!;
    this.elGeneration = document.getElementById('stat-generation')!;
    this.elDeaths = document.getElementById('stat-deaths')!;
    this.elInteractions = document.getElementById('stat-interactions')!;
    this.elCountCoop = document.getElementById('count-coop')!;
    this.elCountDef = document.getElementById('count-def')!;
    this.elCountTft = document.getElementById('count-tft')!;
    this.elCountGrg = document.getElementById('count-grg')!;
    this.elBarCoop = document.getElementById('bar-coop')!;
    this.elBarDef = document.getElementById('bar-def')!;
    this.elBarTft = document.getElementById('bar-tft')!;
    this.elBarGrg = document.getElementById('bar-grg')!;
    this.elLeader = document.getElementById('leader-name')!;
    this.elEventLog = document.getElementById('event-log')!;

    this.setupEvents();
    this.spawnInitialPopulation();
  }

  // ═══════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════

  private spawnInitialPopulation(): void {
    Agent.resetIdCounter();
    this.agents = [];
    const perStrategy = Math.floor(DEFAULTS.INITIAL_POPULATION / ALL_STRATEGIES.length);
    const margin = 90;

    for (const strat of ALL_STRATEGIES) {
      for (let i = 0; i < perStrategy; i++) {
        const x = margin + Math.random() * (this.canvas.width - margin * 2);
        const y = margin + Math.random() * (this.canvas.height - margin * 2);
        this.agents.push(new Agent(x, y, strat));
      }
    }
  }

  reset(): void {
    this.frame = 0;
    this.generation = 0;
    this.totalInteractions = 0;
    this.totalDeaths = 0;
    this.effects = [];
    this.elEventLog.innerHTML = '';
    this.spawnInitialPopulation();
    this.updateHUD();
  }

  // ═══════════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════════

  private setupEvents(): void {
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.renderer.resize(this.canvas.width, this.canvas.height);
    });

    // Pause
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.paused = !this.paused;
      document.getElementById('pause-icon')!.textContent = this.paused ? '▶' : '⏸';
      document.getElementById('pause-text')!.textContent = this.paused ? 'PLAY' : 'PAUSE';
    });

    // Reset
    document.getElementById('btn-reset')?.addEventListener('click', () => this.reset());

    // Spawn
    document.getElementById('btn-spawn')?.addEventListener('click', () => {
      this.spawnRandom(1);
    });
    document.getElementById('btn-spawn-5')?.addEventListener('click', () => {
      this.spawnRandom(5);
    });

    // Speed slider
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedVal = document.getElementById('speed-value')!;
    speedSlider?.addEventListener('input', () => {
      this.speedMultiplier = parseFloat(speedSlider.value);
      speedVal.textContent = this.speedMultiplier.toFixed(1) + '×';
    });

    // Mutation slider
    const mutSlider = document.getElementById('mutation-slider') as HTMLInputElement;
    const mutVal = document.getElementById('mutation-value')!;
    mutSlider?.addEventListener('input', () => {
      this.mutationChance = parseFloat(mutSlider.value);
      mutVal.textContent = this.mutationChance.toFixed(0) + '%';
    });
  }

  /** Spawn N random agents */
  private spawnRandom(count: number): void {
    const margin = 90;
    for (let i = 0; i < count; i++) {
      if (this.agents.length >= AGENT.MAX_POPULATION) break;
      const strat = ALL_STRATEGIES[Math.floor(Math.random() * ALL_STRATEGIES.length)];
      const x = margin + Math.random() * (this.canvas.width - margin * 2);
      const y = margin + Math.random() * (this.canvas.height - margin * 2);
      this.agents.push(new Agent(x, y, strat));
    }
  }

  // ═══════════════════════════════════════════════════════
  // Game Loop
  // ═══════════════════════════════════════════════════════

  start(): void {
    this.lastTime = performance.now();
    this.updateHUD();
    this.tick(this.lastTime);
  }

  private tick = (timestamp: number): void => {
    requestAnimationFrame(this.tick);

    if (this.paused) {
      this.renderer.render(this.agents, this.effects, performance.now());
      return;
    }

    const dt = Math.min((timestamp - this.lastTime) / 16.667, 3);
    this.lastTime = timestamp;
    const steps = Math.max(1, Math.round(dt * this.speedMultiplier));

    for (let s = 0; s < steps; s++) {
      this.step();
    }

    this.renderer.render(this.agents, this.effects, performance.now());

    // Update HUD every ~8 frames
    if (this.frame % 8 === 0) {
      this.updateHUD();
    }
  };

  private step(): void {
    this.frame++;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // ── 1. Get living agents ──
    const living = this.agents.filter(a => a.alive && !a.markedForRemoval);

    // ── 2. Steering & Physics ──
    for (const agent of living) {
      if (agent.paused) continue;

      // Find nearby agents for separation (simple O(n²) — fine for ≤60 agents)
      const nearby: Agent[] = [];
      for (const other of living) {
        if (other.id === agent.id) continue;
        if (agent.position.distSq(other.position) < 80 * 80) {
          nearby.push(other);
        }
      }

      applySteering(agent, nearby, w, h);
    }

    // Update all agents (including dying/spawning ones for animations)
    for (const agent of this.agents) {
      agent.update(w, h);
    }

    // ── 3. Cost of Living ──
    for (const agent of living) {
      agent.drainEnergy(AGENT.COST_OF_LIVING);
    }

    // ── 4. Interactions (PD rounds) ──
    const interacted = new Set<string>();

    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      if (!a.alive || !a.canInteract(this.frame)) continue;

      for (let j = i + 1; j < living.length; j++) {
        const b = living[j];
        if (!b.alive || !b.canInteract(this.frame)) continue;

        const dist = a.position.dist(b.position);
        if (dist >= AGENT.INTERACTION_DISTANCE) continue;

        const key = `${a.id}-${b.id}`;
        if (interacted.has(key)) continue;
        interacted.add(key);

        this.runInteraction(a, b);
      }
    }

    // ── 5. Reproduction ──
    const newborns: Agent[] = [];
    for (const agent of living) {
      if (agent.canReproduce() && this.agents.length + newborns.length < AGENT.MAX_POPULATION) {
        const child = agent.reproduce(this.mutationChance);
        newborns.push(child);
        this.generation++;

        if (child.strategy !== agent.strategy) {
          this.logEvent(`🧬 Mutation! ${STRATEGY_COLORS[agent.strategy] === STRATEGY_COLORS[child.strategy] ? '' : ''}${agent.strategy} → ${child.strategy}`, STRATEGY_COLORS[child.strategy]);
        }
      }
    }
    for (const child of newborns) {
      this.agents.push(child);
    }

    // ── 6. Remove dead agents ──
    for (let i = this.agents.length - 1; i >= 0; i--) {
      if (this.agents[i].markedForRemoval) {
        this.agents.splice(i, 1);
        this.totalDeaths++;
      }
    }

    // ── 7. Prune old effects ──
    const now = performance.now();
    this.effects = this.effects.filter(e => (now - e.createdAt) < 900);
  }

  /** Run a Prisoner's Dilemma round between two agents */
  private runInteraction(a: Agent, b: Agent): void {
    const actionA = a.decideAction(b.id);
    const actionB = b.decideAction(a.id);

    let payoffA: number;
    let payoffB: number;

    if (actionA === Action.Cooperate && actionB === Action.Cooperate) {
      payoffA = PAYOFF.MUTUAL_COOPERATE;
      payoffB = PAYOFF.MUTUAL_COOPERATE;
    } else if (actionA === Action.Defect && actionB === Action.Defect) {
      payoffA = PAYOFF.MUTUAL_DEFECT;
      payoffB = PAYOFF.MUTUAL_DEFECT;
    } else if (actionA === Action.Defect && actionB === Action.Cooperate) {
      payoffA = PAYOFF.TEMPTATION;
      payoffB = PAYOFF.SUCKER;
    } else {
      payoffA = PAYOFF.SUCKER;
      payoffB = PAYOFF.TEMPTATION;
    }

    a.energy += payoffA;
    b.energy += payoffB;

    a.recordOpponentAction(b.id, actionB, this.frame);
    b.recordOpponentAction(a.id, actionA, this.frame);

    // Play gestures
    if (actionA === Action.Cooperate) a.playCooperateGesture();
    else a.playDefectGesture();
    if (actionB === Action.Cooperate) b.playCooperateGesture();
    else b.playDefectGesture();

    // Visual effect at midpoint
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    this.effects.push({
      x: mx, y: my,
      actionA, actionB,
      alpha: 1,
      createdAt: performance.now(),
    });

    this.totalInteractions++;
  }

  // ═══════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════

  private updateHUD(): void {
    const counts: Record<Strategy, number> = {
      [Strategy.Cooperator]: 0,
      [Strategy.Defector]: 0,
      [Strategy.TitForTat]: 0,
      [Strategy.Grudger]: 0,
    };

    let totalAlive = 0;
    for (const agent of this.agents) {
      if (agent.alive && !agent.markedForRemoval) {
        counts[agent.strategy]++;
        totalAlive++;
      }
    }

    this.elPopulation.textContent = totalAlive.toString();
    this.elGeneration.textContent = this.generation.toString();
    this.elDeaths.textContent = this.totalDeaths.toString();
    this.elInteractions.textContent = this.fmtNum(this.totalInteractions);

    this.elCountCoop.textContent = counts[Strategy.Cooperator].toString();
    this.elCountDef.textContent = counts[Strategy.Defector].toString();
    this.elCountTft.textContent = counts[Strategy.TitForTat].toString();
    this.elCountGrg.textContent = counts[Strategy.Grudger].toString();

    // Population bars (relative to total)
    const max = Math.max(1, ...Object.values(counts));
    this.elBarCoop.style.width = ((counts[Strategy.Cooperator] / max) * 100) + '%';
    this.elBarDef.style.width = ((counts[Strategy.Defector] / max) * 100) + '%';
    this.elBarTft.style.width = ((counts[Strategy.TitForTat] / max) * 100) + '%';
    this.elBarGrg.style.width = ((counts[Strategy.Grudger] / max) * 100) + '%';

    // Dominant strategy
    let leader = Strategy.Cooperator;
    let leaderCount = 0;
    for (const [strat, count] of Object.entries(counts)) {
      if (count > leaderCount) {
        leaderCount = count;
        leader = strat as Strategy;
      }
    }
    this.elLeader.textContent = leaderCount > 0 ? leader : '—';
    this.elLeader.style.color = STRATEGY_COLORS[leader];

    // Hide "waiting" message once we have events
    const emptyMsg = document.getElementById('event-empty');
    if (emptyMsg && this.elEventLog.children.length > 1) {
      emptyMsg.style.display = 'none';
    }
  }

  /** Log an event to the event feed */
  private logEvent(text: string, color: string = '#94a3b8'): void {
    const div = document.createElement('div');
    div.className = 'event-entry event-entry-new';
    div.style.color = color;
    div.textContent = text;

    if (this.elEventLog.firstChild) {
      this.elEventLog.insertBefore(div, this.elEventLog.firstChild);
    } else {
      this.elEventLog.appendChild(div);
    }

    // Limit log entries
    while (this.elEventLog.children.length > 30) {
      this.elEventLog.removeChild(this.elEventLog.lastChild!);
    }

    requestAnimationFrame(() => div.classList.remove('event-entry-new'));
  }

  private fmtNum(n: number): string {
    return n >= 10000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  }
}
