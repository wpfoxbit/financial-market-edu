import { useMemo } from "react";
import { PFStream } from "@core/charts";
import { useSimulation } from "../../../ui/context/simulation-context";

const CELL_W = 14;
const CELL_H = 12;
const PADDING_X = 56;
const PADDING_Y = 12;

export function PFChart() {
  const sim = useSimulation();
  const tradeLog = sim.tradeLog;
  const boxSize = sim.pfBoxSize;
  const reversal = sim.pfReversal;

  const { columns, range } = useMemo(() => {
    const stream = new PFStream(boxSize, reversal);
    for (const t of tradeLog) stream.feed(t.price);
    return { columns: stream.columns, range: stream.range() };
  }, [tradeLog, boxSize, reversal]);

  if (!range || columns.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-neutral-500 text-xs">
        No bricks yet — play the scenario for a few seconds.
      </div>
    );
  }

  const rows = range.maxBox - range.minBox + 1;
  const cols = columns.length;
  const width = PADDING_X + cols * CELL_W + 8;
  const height = PADDING_Y * 2 + rows * CELL_H;

  return (
    <div className="relative h-full w-full overflow-auto bg-neutral-950">
      <svg width={width} height={height} className="block">
        {Array.from({ length: rows }, (_, i) => {
          const boxIdx = range.maxBox - i;
          const y = PADDING_Y + i * CELL_H + CELL_H / 2;
          return (
            <g key={`row-${boxIdx}`}>
              <line
                x1={PADDING_X}
                y1={y}
                x2={width - 8}
                y2={y}
                stroke="#1f1f1f"
                strokeDasharray="2 4"
              />
              {boxIdx % 5 === 0 && (
                <text x={PADDING_X - 6} y={y + 3} fontSize={9} textAnchor="end" fill="#737373">
                  {(boxIdx * boxSize).toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
        {columns.map((col, ci) => {
          const isX = col.type === "X";
          const color = isX ? "#22c55e" : "#ef4444";
          const x = PADDING_X + ci * CELL_W + CELL_W / 2;
          const cells: React.ReactNode[] = [];
          for (let b = col.bottomBox; b <= col.topBox; b++) {
            const y = PADDING_Y + (range.maxBox - b) * CELL_H + CELL_H / 2;
            if (isX) {
              cells.push(
                <g key={`${ci}-${b}`}>
                  <line
                    x1={x - 4}
                    y1={y - 4}
                    x2={x + 4}
                    y2={y + 4}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <line
                    x1={x - 4}
                    y1={y + 4}
                    x2={x + 4}
                    y2={y - 4}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                </g>,
              );
            } else {
              cells.push(
                <circle
                  key={`${ci}-${b}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                />,
              );
            }
          }
          return <g key={`col-${ci}`}>{cells}</g>;
        })}
      </svg>
      <div className="absolute top-2 right-2 text-[10px] text-neutral-500 bg-neutral-900/80 px-2 py-0.5 rounded">
        {columns.length} cols · box {boxSize} · rev {reversal}
      </div>
    </div>
  );
}
