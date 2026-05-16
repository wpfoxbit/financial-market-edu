export interface RenkoBrick {
  side: "up" | "down";
  openPrice: number;
  closePrice: number;
  index: number;
}

/**
 * Simple symmetric Renko: one brick of size `brickSize` per `brickSize` price
 * move. Each brick opens at the previous close. Reversals happen on the next
 * brick boundary in the opposite direction (no 2x absorption rule — easier
 * to reason about pedagogically).
 */
export class RenkoStream {
  readonly brickSize: number;
  private lastClose: number | null = null;
  readonly bricks: RenkoBrick[] = [];

  constructor(brickSize: number) {
    if (brickSize <= 0) throw new Error(`RenkoStream: brickSize must be > 0, got ${brickSize}`);
    this.brickSize = brickSize;
  }

  feed(price: number): RenkoBrick[] {
    const out: RenkoBrick[] = [];

    if (this.lastClose === null) {
      this.lastClose = Math.round(price / this.brickSize) * this.brickSize;
      return out;
    }

    let lastClose: number = this.lastClose;
    while (price >= lastClose + this.brickSize) {
      const openPrice = lastClose;
      const closePrice = openPrice + this.brickSize;
      const brick: RenkoBrick = {
        side: "up",
        openPrice,
        closePrice,
        index: this.bricks.length,
      };
      this.bricks.push(brick);
      out.push(brick);
      lastClose = closePrice;
    }
    while (price <= lastClose - this.brickSize) {
      const openPrice = lastClose;
      const closePrice = openPrice - this.brickSize;
      const brick: RenkoBrick = {
        side: "down",
        openPrice,
        closePrice,
        index: this.bricks.length,
      };
      this.bricks.push(brick);
      out.push(brick);
      lastClose = closePrice;
    }
    this.lastClose = lastClose;

    return out;
  }
}
