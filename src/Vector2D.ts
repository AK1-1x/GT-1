// ═══════════════════════════════════════════════════════════
// Vector2D.ts — Lightweight 2D vector math
// ═══════════════════════════════════════════════════════════

export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  /** Create a copy of this vector */
  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /** Add another vector (mutates this) */
  add(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Subtract another vector (mutates this) */
  sub(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** Scale by a scalar (mutates this) */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** Get the magnitude/length */
  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Get the squared magnitude (avoids sqrt for comparisons) */
  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Normalize to unit length (mutates this). Returns zero vector if magnitude is 0. */
  normalize(): this {
    const m = this.mag();
    if (m > 0.0001) {
      this.x /= m;
      this.y /= m;
    }
    return this;
  }

  /** Limit magnitude to a maximum (mutates this) */
  limit(max: number): this {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.normalize().scale(max);
    }
    return this;
  }

  /** Set magnitude (mutates this) */
  setMag(m: number): this {
    return this.normalize().scale(m);
  }

  /** Distance to another vector */
  dist(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Squared distance (avoids sqrt) */
  distSq(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /** Dot product */
  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Get angle in radians */
  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate by angle (radians) */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  /** Linearly interpolate towards another vector */
  lerp(v: Vector2D, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /** Create a vector from an angle */
  static fromAngle(angle: number, magnitude: number = 1): Vector2D {
    return new Vector2D(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  /** Create a random unit vector */
  static random(): Vector2D {
    const angle = Math.random() * Math.PI * 2;
    return new Vector2D(Math.cos(angle), Math.sin(angle));
  }

  /** Static subtraction (does not mutate either vector) */
  static sub(a: Vector2D, b: Vector2D): Vector2D {
    return new Vector2D(a.x - b.x, a.y - b.y);
  }

  /** Static addition */
  static add(a: Vector2D, b: Vector2D): Vector2D {
    return new Vector2D(a.x + b.x, a.y + b.y);
  }
}
