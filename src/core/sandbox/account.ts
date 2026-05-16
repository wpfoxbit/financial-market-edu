import { EMPTY_POSITION, type Position } from "../pnl";
import type { OrderId } from "../types";

export type AccountId = string;
export type AccountKind = "manual" | "liquidity-bot" | "market-bot";

export interface Account {
  id: AccountId;
  name: string;
  kind: AccountKind;
  position: Position;
  openOrderIds: Set<OrderId>;
}

let accountCounter = 0;

export function nextAccountId(): AccountId {
  return `acc-${++accountCounter}`;
}

export function resetAccountIds(): void {
  accountCounter = 0;
}

export function createAccount(name: string, kind: AccountKind = "manual"): Account {
  return {
    id: nextAccountId(),
    name,
    kind,
    position: { ...EMPTY_POSITION },
    openOrderIds: new Set(),
  };
}
