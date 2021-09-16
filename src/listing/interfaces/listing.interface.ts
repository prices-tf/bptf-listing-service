export interface Listing {
  id: string;
  steamid64: string;
  item: any;
  intent: string;
  isAutomatic: boolean;
  isBuyout: boolean;
  isOffers: boolean;
  details: string;
  currenciesKeys: number;
  currenciesHalfScrap: number;
  createdAt: string;
  bumpedAt: string;
}
