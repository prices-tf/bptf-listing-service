export interface Listing {
  id: string;
  sku: string;
  steamid64: string;
  item: any;
  intent: string;
  isAutomatic: boolean;
  isBuyout: boolean;
  isOffers: boolean;
  comment: string;
  currenciesKeys: number;
  currenciesHalfScrap: number;
  createdAt: string;
  bumpedAt: string;
}

export interface Snapshot {
  name: string;
  sku: string;
  createdAt: string;
  listings: Listing[];
}
