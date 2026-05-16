import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSimulation } from "../../../ui/context/simulation-context";

const SPEEDS = [0.25, 0.5, 1, 2, 5] as const;

export function Controls() {
  const { t } = useTranslation();
  const sim = useSimulation();
  const isRunning = sim.isRunning;
  const speed = sim.speed;
  const start = sim.start;
  const pause = sim.pause;
  const step = sim.step;
  const setSpeed = sim.setSpeed;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-neutral-800 bg-neutral-950">
      {!isRunning ? (
        <Btn onClick={start} variant="primary">
          {t("controls.play")}
        </Btn>
      ) : (
        <Btn onClick={pause}>{t("controls.pause")}</Btn>
      )}
      <Btn onClick={step} disabled={isRunning}>
        {t("controls.step")}
      </Btn>
      <div className="text-xs text-neutral-500 ml-4 mr-1">{t("controls.speed")}</div>
      {SPEEDS.map((s) => (
        <Btn key={s} onClick={() => setSpeed(s)} active={speed === s}>
          {s}×
        </Btn>
      ))}
    </div>
  );
}

interface BtnProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "primary" | "default";
}

function Btn({ children, onClick, disabled, active, variant }: BtnProps) {
  const base = "px-3 py-1 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const palette =
    variant === "primary"
      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
      : active
        ? "bg-emerald-700 text-white"
        : "bg-neutral-800 hover:bg-neutral-700";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${palette}`}>
      {children}
    </button>
  );
}
