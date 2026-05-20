// ═══════════════════════════════════════════════════════════
// SteeringBehavior.ts — Autonomous steering for Society agents
// Wander + Separation + Boundary Avoidance
// ═══════════════════════════════════════════════════════════

import { Vector2D } from './Vector2D';
import { STEER, AGENT } from './constants';
import type { Agent } from './Agent';

/**
 * Apply all steering forces to an agent for one frame.
 * Includes wander, separation from nearby agents, and boundary avoidance.
 */
export function applySteering(agent: Agent, neighbors: Agent[], canvasWidth: number, canvasHeight: number): void {
  if (agent.paused) return;

  const force = new Vector2D();

  // ── Wander: smooth random-walk using projected circle ──
  agent.wanderAngle += (Math.random() - 0.5) * STEER.WANDER_JITTER * 2;
  const wanderCircle = agent.velocity.clone().normalize().scale(STEER.WANDER_DISTANCE);
  const displacement = Vector2D.fromAngle(agent.wanderAngle, STEER.WANDER_RADIUS);
  const wander = wanderCircle.add(displacement).limit(AGENT.MAX_FORCE).scale(STEER.WANDER);
  force.add(wander);

  // ── Separation: avoid overlapping with nearby agents ──
  const sepForce = new Vector2D();
  let sepCount = 0;
  for (const other of neighbors) {
    if (other.id === agent.id || other.markedForRemoval) continue;
    const d = agent.position.dist(other.position);
    if (d > 0 && d < STEER.SEPARATION_DISTANCE) {
      const diff = Vector2D.sub(agent.position, other.position);
      diff.normalize().scale(1 / Math.max(d, 0.1));
      sepForce.add(diff);
      sepCount++;
    }
  }
  if (sepCount > 0) {
    sepForce.scale(1 / sepCount);
    sepForce.normalize().scale(AGENT.MAX_SPEED);
    sepForce.sub(agent.velocity);
    sepForce.limit(AGENT.MAX_FORCE);
    force.add(sepForce.scale(STEER.SEPARATION));
  }

  // ── Boundary avoidance: soft turn-back within wall margins ──
  const margin = STEER.BOUNDARY_MARGIN;
  const boundary = new Vector2D();

  if (agent.position.x < margin) {
    boundary.x = AGENT.MAX_SPEED * (1 - agent.position.x / margin);
  } else if (agent.position.x > canvasWidth - margin) {
    boundary.x = -AGENT.MAX_SPEED * (1 - (canvasWidth - agent.position.x) / margin);
  }

  if (agent.position.y < margin) {
    boundary.y = AGENT.MAX_SPEED * (1 - agent.position.y / margin);
  } else if (agent.position.y > canvasHeight - margin) {
    boundary.y = -AGENT.MAX_SPEED * (1 - (canvasHeight - agent.position.y) / margin);
  }

  force.add(boundary.limit(AGENT.MAX_FORCE).scale(STEER.BOUNDARY));

  agent.applyForce(force);
}
