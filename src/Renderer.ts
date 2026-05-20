// ═══════════════════════════════════════════════════════════
// Renderer.ts — Arena environment rendering for Project Society
// Stone walls, dark floor, ambient lighting, interaction effects.
// Agents draw themselves via Agent.draw().
// ═══════════════════════════════════════════════════════════

import type { Agent } from './Agent';
import type { InteractionEffect } from './types';
import { Action } from './types';
import { ARENA } from './constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private wallPattern: CanvasPattern | null = null;
  private wallPatternCanvas: HTMLCanvasElement;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.wallPatternCanvas = document.createElement('canvas');
    this.createWallPattern();
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.wallPatternCanvas.width = w;
    this.wallPatternCanvas.height = h;
    this.createWallPattern();
  }

  /** Generate procedural stone/brick pattern tile */
  private createWallPattern(): void {
    const tile = this.wallPatternCanvas;
    const tileSize = 48;
    tile.width = tileSize;
    tile.height = tileSize;
    const tc = tile.getContext('2d')!;

    tc.fillStyle = '#2a2520';
    tc.fillRect(0, 0, tileSize, tileSize);

    const brickH = 12;
    const brickW = 24;
    const mortarW = 2;

    for (let row = 0; row < 4; row++) {
      const yy = row * brickH;
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < 3; col++) {
        const xx = col * brickW + offset;
        const shade = 28 + Math.floor(Math.random() * 16);
        tc.fillStyle = `rgb(${shade + 8}, ${shade + 2}, ${shade - 4})`;
        tc.fillRect(xx + mortarW, yy + mortarW, brickW - mortarW * 2, brickH - mortarW * 2);
        tc.fillStyle = `rgba(255, 255, 255, ${0.02 + Math.random() * 0.03})`;
        tc.fillRect(xx + mortarW, yy + mortarW, brickW - mortarW * 2, 1);
      }
    }

    tc.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    tc.lineWidth = 1;
    for (let row = 0; row <= 4; row++) {
      tc.beginPath();
      tc.moveTo(0, row * brickH);
      tc.lineTo(tileSize, row * brickH);
      tc.stroke();
    }

    this.wallPattern = this.ctx.createPattern(tile, 'repeat');
  }

  /** Render a full frame */
  render(agents: Agent[], effects: InteractionEffect[], now: number): void {
    const ctx = this.ctx;

    this.drawFloor(ctx);
    this.drawWalls(ctx);
    this.drawEffects(ctx, effects, now);

    // Draw agents (sorted by Y for pseudo-depth)
    const sorted = [...agents].sort((a, b) => a.position.y - b.position.y);
    for (const agent of sorted) {
      agent.draw(ctx);
    }

    this.drawAmbientLight(ctx);
  }

  private drawFloor(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#12110f';
    ctx.fillRect(0, 0, this.width, this.height);

    // Center overhead light
    const cx = this.width / 2;
    const cy = this.height / 2;
    const grad = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy, Math.max(this.width, this.height) * 0.5);
    grad.addColorStop(0, 'rgba(45, 40, 35, 0.35)');
    grad.addColorStop(0.5, 'rgba(25, 22, 18, 0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Floor grain
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.height; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(this.width, i);
      ctx.stroke();
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D): void {
    const t = ARENA.WALL_THICKNESS;

    ctx.fillStyle = this.wallPattern || '#2a2520';

    // Four walls
    ctx.fillRect(0, 0, this.width, t);
    ctx.fillRect(0, this.height - t, this.width, t);
    ctx.fillRect(0, 0, t, this.height);
    ctx.fillRect(this.width - t, 0, t, this.height);

    // Inner edge shadows
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t, t);
    ctx.lineTo(this.width - t, t);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t, t);
    ctx.lineTo(t, this.height - t);
    ctx.stroke();

    // Inner edge highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t, this.height - t);
    ctx.lineTo(this.width - t, this.height - t);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.width - t, t);
    ctx.lineTo(this.width - t, this.height - t);
    ctx.stroke();

    // Corner bolts
    this.drawBolt(ctx, t + 8, t + 8);
    this.drawBolt(ctx, this.width - t - 8, t + 8);
    this.drawBolt(ctx, t + 8, this.height - t - 8);
    this.drawBolt(ctx, this.width - t - 8, this.height - t - 8);
  }

  private drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 70, 55, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.5, 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
  }

  private drawEffects(ctx: CanvasRenderingContext2D, effects: InteractionEffect[], now: number): void {
    for (const effect of effects) {
      const age = now - effect.createdAt;
      const duration = 900;
      if (age >= duration) continue;

      const progress = age / duration;
      const alpha = 1 - progress;

      let hex: string;
      if (effect.actionA === Action.Cooperate && effect.actionB === Action.Cooperate) {
        hex = '#4ade80';
      } else if (effect.actionA === Action.Defect && effect.actionB === Action.Defect) {
        hex = '#f87171';
      } else {
        hex = '#fbbf24';
      }

      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // Burst ring
      const burstR = 15 + progress * 30;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, burstR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
      ctx.lineWidth = 1.5 * (1 - progress);
      ctx.stroke();

      // Label floating up
      const textY = effect.y - 25 - progress * 25;
      ctx.font = `bold 11px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.85})`;

      let label: string;
      if (effect.actionA === Action.Cooperate && effect.actionB === Action.Cooperate) {
        label = '🤝 COOPERATE';
      } else if (effect.actionA === Action.Defect && effect.actionB === Action.Defect) {
        label = '⚔️ DEFECT';
      } else {
        label = '🗡️ BETRAY';
      }
      ctx.fillText(label, effect.x, textY);
    }
  }

  private drawAmbientLight(ctx: CanvasRenderingContext2D): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const vig = ctx.createRadialGradient(cx, cy, maxR * 0.35, cx, cy, maxR);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
