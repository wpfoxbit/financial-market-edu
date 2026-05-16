export type PFColumnType = "X" | "O";

export interface PFColumn {
  type: PFColumnType;
  /** Lowest box index in this column. */
  bottomBox: number;
  /** Highest box index in this column. */
  topBox: number;
}

/**
 * Point & Figure stream. Each price is bucketed to a "box" of size `boxSize`.
 * X columns rise on up-moves; O columns drop on down-moves. To switch from one
 * to the other, price must reverse by `reversalThreshold` boxes from the
 * column's extreme.
 */
export class PFStream {
  readonly boxSize: number;
  readonly reversalThreshold: number;
  readonly columns: PFColumn[] = [];

  constructor(boxSize: number, reversalThreshold = 3) {
    if (boxSize <= 0) throw new Error(`PFStream: boxSize must be > 0, got ${boxSize}`);
    if (reversalThreshold < 1)
      throw new Error(`PFStream: reversalThreshold must be >= 1, got ${reversalThreshold}`);
    this.boxSize = boxSize;
    this.reversalThreshold = reversalThreshold;
  }

  feed(price: number): void {
    const box = Math.floor(price / this.boxSize);
    const current = this.columns[this.columns.length - 1];

    if (!current) {
      this.columns.push({ type: "X", bottomBox: box, topBox: box });
      return;
    }

    if (current.type === "X") {
      if (box > current.topBox) {
        current.topBox = box;
      } else if (current.topBox - box >= this.reversalThreshold) {
        this.columns.push({ type: "O", bottomBox: box, topBox: current.topBox - 1 });
      }
    } else {
      if (box < current.bottomBox) {
        current.bottomBox = box;
      } else if (box - current.bottomBox >= this.reversalThreshold) {
        this.columns.push({ type: "X", bottomBox: current.bottomBox + 1, topBox: box });
      }
    }
  }

  /** Min and max box indices across all columns. */
  range(): { minBox: number; maxBox: number } | null {
    if (this.columns.length === 0) return null;
    let min = this.columns[0]!.bottomBox;
    let max = this.columns[0]!.topBox;
    for (const c of this.columns) {
      if (c.bottomBox < min) min = c.bottomBox;
      if (c.topBox > max) max = c.topBox;
    }
    return { minBox: min, maxBox: max };
  }
}
