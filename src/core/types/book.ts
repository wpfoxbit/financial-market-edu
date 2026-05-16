export interface Level {
  price: number;
  qty: number;
  orderCount: number;
}

export interface BookSnapshot {
  symbol: string;
  bids: Level[];
  asks: Level[];
  timestamp: number;
}
