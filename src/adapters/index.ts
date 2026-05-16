import { BinanceAdapter } from "./binance/binance.adapter";
import { BitstampAdapter } from "./bitstamp/bitstamp.adapter";
import { FoxbitAdapter } from "./foxbit/foxbit.adapter";
import { OkexAdapter } from "./okex/okex.adapter";
import type { ExchangeAdapter } from "./types";

export type { ExchangeAdapter, AdapterStatus, ExchangeBookEvent, ExchangeTradeEvent } from "./types";

export const EXCHANGE_ADAPTERS: readonly ExchangeAdapter[] = [
  new BinanceAdapter(),
  new BitstampAdapter(),
  new OkexAdapter(),
  new FoxbitAdapter(),
];

export function findAdapter(id: string): ExchangeAdapter | undefined {
  return EXCHANGE_ADAPTERS.find((a) => a.id === id);
}
