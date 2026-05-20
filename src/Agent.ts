// ═══════════════════════════════════════════════════════════
// Agent.ts — Autonomous stick-figure agent for Project Society
// Energy-driven lifecycle: wander, interact, reproduce, die.
// Renders as an animated 2D stick figure with strategy colors.
// ═══════════════════════════════════════════════════════════

import { Vector2D } from './Vector2D';
import { Strategy, Action, AnimState, STRATEGY_COLORS, STRATEGY_GLOWS, STRATEGY_LABELS } from './types';
import { AGENT, ANIM } from './constants';

let nextId = 0;

export class Agent {
  readonly id: number;
  position: Vector2D;
  velocity: Vector2D;
  private acceleration: Vector2D;

  strategy: Strategy;
  /** Energy replaces score — drives lifecycle */
  energy: number;
  alive: boolean;
  /** Set to true when the agent should be removed next frame */
  markedForRemoval: boolean;

  /** Base color derived from strategy */
  color: string;
  glowColor: string;
  /** Current rendered color (can flash during gestures) */
  renderColor: string;

  /** Walk cycle phase */
  walkPhase: number;
  /** Current animation state */
  animState: AnimState;
  /** Remaining frames for the current animation */
  animTimer: number;
  /** Facing direction: 1 = right, -1 = left */
  facing: number;
  /** Whether movement is paused (during gesture) */
  paused: boolean;
  /** Wander angle for steering */
  wanderAngle: number;
  /** Global alpha for fade-in / fade-out */
  alpha: number;

  // ── Memory for strategy logic ──
  /** Opponent ID → their last action towards us (for TFT) */
  private lastActionFrom: Map<number, Action>;
  /** Set of opponent IDs that have defected against us (for Grudger) */
  private betrayers: Set<number>;
  /** Frame number of last interaction (global cooldown) */
  lastInteractionFrame: number;

  constructor(x: number, y: number, strategy: Strategy, energy?: number) {
    this.id = nextId++;
    this.position = new Vector2D(x, y);
    this.velocity = Vector2D.random().scale(AGENT.MAX_SPEED * 0.4);
    this.acceleration = new Vector2D();

    this.strategy = strategy;
    this.energy = energy ?? AGENT.INITIAL_ENERGY;
    this.alive = true;
    this.markedForRemoval = false;

    this.color = STRATEGY_COLORS[strategy];
    this.glowColor = STRATEGY_GLOWS[strategy];
    this.renderColor = this.color;

    this.walkPhase = Math.random() * Math.PI * 2;
    this.animState = AnimState.Spawning;
    this.animTimer = ANIM.SPAWN_DURATION;
    this.facing = Math.random() < 0.5 ? 1 : -1;
    this.paused = false;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.alpha = 0; // Starts invisible, fades in during spawn

    this.lastActionFrom = new Map();
    this.betrayers = new Set();
    this.lastInteractionFrame = -9999;
  }

  /** Reset the global ID counter */
  static resetIdCounter(): void {
    nextId = 0;
  }

  /** Apply a force */
  applyForce(force: Vector2D): void {
    this.acceleration.add(force);
  }

  /** Update physics, animation, and energy */
  update(canvasWidth: number, canvasHeight: number): void {
    // Handle animation timers
    if (this.animTimer > 0) {
      this.animTimer--;

      // Spawn: fade in
      if (this.animState === AnimState.Spawning) {
        this.alpha = 1 - (this.animTimer / ANIM.SPAWN_DURATION);
        if (this.animTimer <= 0) {
          this.animState = AnimState.Walking;
          this.alpha = 1;
        }
        return; // Don't move during spawn
      }

      // Dying: fade out
      if (this.animState === AnimState.Dying) {
        this.alpha = this.animTimer / ANIM.DEATH_DURATION;
        if (this.animTimer <= 0) {
          this.markedForRemoval = true;
        }
        return; // Don't move during death
      }

      // Gesture: stay still
      if (this.animState === AnimState.Cooperating || this.animState === AnimState.Defecting) {
        if (this.animTimer <= 0) {
          this.animState = AnimState.Walking;
          this.paused = false;
          this.renderColor = this.color;
        }
        return;
      }
    }

    if (this.paused) return;

    // Physics
    this.velocity.add(this.acceleration);
    this.velocity.limit(AGENT.MAX_SPEED);
    this.position.add(this.velocity);
    this.acceleration.x = 0;
    this.acceleration.y = 0;

    // Facing direction
    if (Math.abs(this.velocity.x) > 0.08) {
      this.facing = this.velocity.x > 0 ? 1 : -1;
    }

    // Clamp to arena
    const margin = AGENT.FIGURE_SCALE * 30 + 35;
    this.position.x = Math.max(margin, Math.min(canvasWidth - margin, this.position.x));
    this.position.y = Math.max(margin, Math.min(canvasHeight - margin, this.position.y));

    // Walk cycle
    const speed = this.velocity.mag();
    this.walkPhase += ANIM.WALK_CYCLE_SPEED * (speed / AGENT.MAX_SPEED);
  }

  /** Drain energy (cost of living) — called each frame */
  drainEnergy(amount: number): void {
    if (this.animState === AnimState.Dying || this.animState === AnimState.Spawning) return;
    this.energy -= amount;
    if (this.energy <= AGENT.DEATH_THRESHOLD) {
      this.die();
    }
  }

  /** Trigger death animation */
  die(): void {
    if (this.animState === AnimState.Dying) return;
    this.alive = false;
    this.animState = AnimState.Dying;
    this.animTimer = ANIM.DEATH_DURATION;
    this.paused = true;
  }

  /** Check if agent should reproduce */
  canReproduce(): boolean {
    return this.alive && this.energy >= AGENT.REPRODUCTION_THRESHOLD &&
           this.animState === AnimState.Walking;
  }

  /** Reproduce: create a child, halve parent energy */
  reproduce(mutationChance: number): Agent {
    // Halve parent energy
    this.energy /= 2;

    // Determine child strategy (possible mutation)
    let childStrategy = this.strategy;
    if (Math.random() * 100 < mutationChance) {
      const others = Object.values(Strategy).filter(s => s !== this.strategy) as Strategy[];
      childStrategy = others[Math.floor(Math.random() * others.length)];
    }

    // Spawn child nearby
    const offset = Vector2D.random().scale(25 + Math.random() * 15);
    const child = new Agent(
      this.position.x + offset.x,
      this.position.y + offset.y,
      childStrategy,
      this.energy, // Child gets half of parent's original energy
    );
    return child;
  }

  /** Decide action based on strategy */
  decideAction(opponentId: number): Action {
    switch (this.strategy) {
      case Strategy.Cooperator:
        return Action.Cooperate;
      case Strategy.Defector:
        return Action.Defect;
      case Strategy.TitForTat: {
        const last = this.lastActionFrom.get(opponentId);
        return last === Action.Defect ? Action.Defect : Action.Cooperate;
      }
      case Strategy.Grudger:
        return this.betrayers.has(opponentId) ? Action.Defect : Action.Cooperate;
    }
  }

  /** Record the opponent's action after a round */
  recordOpponentAction(opponentId: number, action: Action, frame: number): void {
    this.lastActionFrom.set(opponentId, action);
    if (action === Action.Defect) {
      this.betrayers.add(opponentId);
    }
    this.lastInteractionFrame = frame;
  }

  /** Check interaction cooldown */
  canInteract(currentFrame: number): boolean {
    return (currentFrame - this.lastInteractionFrame) >= AGENT.INTERACTION_COOLDOWN &&
           this.animState === AnimState.Walking;
  }

  /** Play cooperate gesture */
  playCooperateGesture(): void {
    this.animState = AnimState.Cooperating;
    this.animTimer = ANIM.GESTURE_DURATION;
    this.paused = true;
    this.renderColor = '#4ade80'; // Bright green
  }

  /** Play defect gesture */
  playDefectGesture(): void {
    this.animState = AnimState.Defecting;
    this.animTimer = ANIM.GESTURE_DURATION;
    this.paused = true;
    this.renderColor = '#f87171'; // Bright red
  }

  // ═══════════════════════════════════════════════════════
  // Stick Figure Rendering
  // ═══════════════════════════════════════════════════════

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.markedForRemoval) return;

    const s = AGENT.FIGURE_SCALE;
    const x = this.position.x;
    const y = this.position.y;
    const color = this.renderColor;
    const f = this.facing;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2 * s;

    // Dying shrink effect
    let scale = 1;
    if (this.animState === AnimState.Dying) {
      scale = this.animTimer / ANIM.DEATH_DURATION;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    // Spawning grow effect
    if (this.animState === AnimState.Spawning) {
      scale = 1 - (this.animTimer / ANIM.SPAWN_DURATION);
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    // Walk cycle oscillation
    const walk = Math.sin(this.walkPhase);
    const walkB = Math.sin(this.walkPhase + Math.PI);

    // Dimensions
    const headR = 6 * s;
    const neckY = y - 20 * s;
    const headY = neckY - headR - 1.5 * s;
    const shoulderY = neckY + 3 * s;
    const hipY = y + 3 * s;
    const armLen = 14 * s;
    const legLen = 17 * s;

    // ── Shadow ──
    ctx.beginPath();
    ctx.ellipse(x, y + legLen + 3 * s, 10 * s * scale, 2.5 * s * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    // Calculate limb positions based on animation state
    let leftArmEnd: [number, number];
    let rightArmEnd: [number, number];
    let leftLegEnd: [number, number];
    let rightLegEnd: [number, number];

    switch (this.animState) {
      case AnimState.Walking:
      case AnimState.Spawning:
      default: {
        const armSwing = walk * 6 * s;
        leftArmEnd = [x - armLen * 0.6 * f, shoulderY + armLen * 0.5 + armSwing];
        rightArmEnd = [x + armLen * 0.6 * f, shoulderY + armLen * 0.5 - armSwing];
        leftLegEnd = [x - 7 * s + walk * 5 * s, hipY + legLen];
        rightLegEnd = [x + 7 * s + walkB * 5 * s, hipY + legLen];
        break;
      }
      case AnimState.Cooperating: {
        const progress = Math.min(1, (1 - this.animTimer / ANIM.GESTURE_DURATION) * 3);
        const armUpY = shoulderY - armLen * 0.85 * progress;
        leftArmEnd = [x - armLen * 0.5, armUpY];
        rightArmEnd = [x + armLen * 0.5, armUpY];
        leftLegEnd = [x - 7 * s, hipY + legLen];
        rightLegEnd = [x + 7 * s, hipY + legLen];
        break;
      }
      case AnimState.Defecting: {
        const progress = Math.min(1, (1 - this.animTimer / ANIM.GESTURE_DURATION) * 3);
        const fwdX = x + f * armLen * 1.0 * progress;
        leftArmEnd = [fwdX, shoulderY + 2 * s - 5 * s];
        rightArmEnd = [fwdX, shoulderY + 2 * s + 5 * s];
        leftLegEnd = [x - 10 * s, hipY + legLen];
        rightLegEnd = [x + 10 * s, hipY + legLen];
        break;
      }
      case AnimState.Dying: {
        // Arms droop down
        leftArmEnd = [x - armLen * 0.3, shoulderY + armLen * 0.9];
        rightArmEnd = [x + armLen * 0.3, shoulderY + armLen * 0.9];
        leftLegEnd = [x - 5 * s, hipY + legLen * 0.7];
        rightLegEnd = [x + 5 * s, hipY + legLen * 0.7];
        break;
      }
    }

    // ── Glow ──
    const glowAlpha = this.animState === AnimState.Walking ? 0.06 : 0.15;
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 22 * s);
    glow.addColorStop(0, this.hexToRgba(this.color, glowAlpha));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.strokeStyle = color;

    // ── Legs ──
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(leftLegEnd[0], leftLegEnd[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(rightLegEnd[0], rightLegEnd[1]);
    ctx.stroke();

    // ── Torso ──
    ctx.beginPath();
    ctx.moveTo(x, neckY);
    ctx.lineTo(x, hipY);
    ctx.stroke();

    // ── Arms ──
    ctx.beginPath();
    ctx.moveTo(x, shoulderY);
    ctx.lineTo(leftArmEnd[0], leftArmEnd[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, shoulderY);
    ctx.lineTo(rightArmEnd[0], rightArmEnd[1]);
    ctx.stroke();

    // ── Cooperate: thumbs up fists ──
    if (this.animState === AnimState.Cooperating) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(leftArmEnd[0], leftArmEnd[1] - 2 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightArmEnd[0], rightArmEnd[1] - 2 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(leftArmEnd[0], leftArmEnd[1] - 2 * s);
      ctx.lineTo(leftArmEnd[0], leftArmEnd[1] - 7 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightArmEnd[0], rightArmEnd[1] - 2 * s);
      ctx.lineTo(rightArmEnd[0], rightArmEnd[1] - 7 * s);
      ctx.stroke();
      ctx.lineWidth = 2.2 * s;
    }

    // ── Defect: impact lines ──
    if (this.animState === AnimState.Defecting && this.animTimer > ANIM.GESTURE_DURATION * 0.5) {
      ctx.lineWidth = 1.3 * s;
      for (let i = 0; i < 3; i++) {
        const angle = (i - 1) * 0.4 + (f > 0 ? 0 : Math.PI);
        const len = 6 * s;
        const sx = rightArmEnd[0] + Math.cos(angle) * 3 * s;
        const sy = rightArmEnd[1] + Math.sin(angle) * 3 * s;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.lineWidth = 2.2 * s;
    }

    // ── Head ──
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
    ctx.fill();

    // ── Eyes ──
    ctx.fillStyle = color;
    const eyeX = 2.2 * s;
    const eyeY = headY - 0.5 * s;
    ctx.beginPath();
    ctx.arc(x - eyeX, eyeY, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + eyeX, eyeY, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Mouth ──
    ctx.lineWidth = 1.3 * s;
    ctx.strokeStyle = color;
    const mouthY = headY + 2.8 * s;
    if (this.animState === AnimState.Cooperating) {
      ctx.beginPath();
      ctx.arc(x, mouthY - 0.5 * s, 2.2 * s, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (this.animState === AnimState.Defecting) {
      ctx.beginPath();
      ctx.arc(x, mouthY + 2.5 * s, 2.2 * s, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else if (this.animState === AnimState.Dying) {
      // X eyes
      ctx.lineWidth = 1.2 * s;
      const ex = 2 * s;
      const ey = headY - 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(x - eyeX - ex * 0.4, ey - ex * 0.4);
      ctx.lineTo(x - eyeX + ex * 0.4, ey + ex * 0.4);
      ctx.moveTo(x - eyeX + ex * 0.4, ey - ex * 0.4);
      ctx.lineTo(x - eyeX - ex * 0.4, ey + ex * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + eyeX - ex * 0.4, ey - ex * 0.4);
      ctx.lineTo(x + eyeX + ex * 0.4, ey + ex * 0.4);
      ctx.moveTo(x + eyeX + ex * 0.4, ey - ex * 0.4);
      ctx.lineTo(x + eyeX - ex * 0.4, ey + ex * 0.4);
      ctx.stroke();
      // Open mouth
      ctx.beginPath();
      ctx.arc(x, mouthY + 0.5 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 2 * s, mouthY);
      ctx.lineTo(x + 2 * s, mouthY);
      ctx.stroke();
    }

    // ── Energy bar (small bar below feet) ──
    if (this.animState !== AnimState.Dying && this.animState !== AnimState.Spawning) {
      const barW = 18 * s;
      const barH = 2 * s;
      const barX = x - barW / 2;
      const barY = y + legLen + 6 * s;
      const fill = Math.max(0, Math.min(1, this.energy / AGENT.REPRODUCTION_THRESHOLD));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(barX, barY, barW, barH);

      // Color transitions: red → yellow → green based on energy
      let barColor: string;
      if (fill < 0.3) barColor = '#ef4444';
      else if (fill < 0.6) barColor = '#f59e0b';
      else barColor = '#22c55e';

      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW * fill, barH);
    }

    // ── Strategy label ──
    if (this.animState !== AnimState.Dying) {
      ctx.fillStyle = color;
      ctx.font = `bold ${7 * s}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = this.alpha * 0.6;
      ctx.fillText(STRATEGY_LABELS[this.strategy], x, headY - headR - 4 * s);
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
