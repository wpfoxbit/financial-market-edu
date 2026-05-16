export type TickListener = (now: number, tickIndex: number) => void;

export interface ClockOptions {
  intervalMs?: number;
  speed?: number;
  startTime?: number;
}

export class VirtualClock {
  private _intervalMs: number;
  private _speed: number;
  private _now: number;
  private _tickIndex = 0;
  private _running = false;
  private _handle: ReturnType<typeof setInterval> | null = null;
  private readonly _listeners = new Set<TickListener>();

  constructor(opts: ClockOptions = {}) {
    this._intervalMs = opts.intervalMs ?? 100;
    this._speed = opts.speed ?? 1.0;
    this._now = opts.startTime ?? 0;
  }

  get now(): number {
    return this._now;
  }
  get tickIndex(): number {
    return this._tickIndex;
  }
  get running(): boolean {
    return this._running;
  }
  get speed(): number {
    return this._speed;
  }
  get intervalMs(): number {
    return this._intervalMs;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._schedule();
  }

  pause(): void {
    if (!this._running) return;
    this._running = false;
    if (this._handle !== null) {
      clearInterval(this._handle);
      this._handle = null;
    }
  }

  reset(): void {
    this.pause();
    this._now = 0;
    this._tickIndex = 0;
  }

  step(): void {
    this._tick();
  }

  setSpeed(speed: number): void {
    if (speed <= 0) throw new Error(`VirtualClock.setSpeed: speed must be > 0, got ${speed}`);
    this._speed = speed;
    if (this._running && this._handle !== null) {
      clearInterval(this._handle);
      this._schedule();
    }
  }

  onTick(listener: TickListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _schedule(): void {
    const realInterval = this._intervalMs / this._speed;
    this._handle = setInterval(() => this._tick(), realInterval);
  }

  private _tick(): void {
    this._now += this._intervalMs;
    this._tickIndex += 1;
    for (const l of this._listeners) l(this._now, this._tickIndex);
  }
}
