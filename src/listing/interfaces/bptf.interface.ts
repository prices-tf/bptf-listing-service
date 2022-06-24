export type EventType = 'listing-update' | 'listing-delete';

export interface Event {
  id: string;
  event: EventType;
  payload: any;
}

export interface Item {
  appid: number;
  australium?: boolean;
  baseName: string;
  name: string;
  class: string[];
  craftable: boolean;
  crateSeries?: number;
  recipe?: Recipe;
  defindex: number;
  festivized?: boolean;
  id: string;
  imageUrl: string;
  killstreakTier?: number;
  marketName: string;
  origin: { [key: string]: any } | null;
  originalId: string;
  paint?: Paint;
  paintSecondaryHex?: string;
  particle?: Particle;
  price: unknown;
  // Relevant for recipe items and items with effects
  // Eg: Prof Grenade Launcher Fab Kit = 6526-6-206 (6526=kit defindex, 6=quality, 206=item defindex)
  // Eg: Prof Grenade Launcher Kit = 3-206 (3=ks tier, 206=defindex)
  // Eg: Strangifier Chemistry Set = 6522-6-343 (6522=kit defindex tier, 6=quality, 343=item defindex)
  // Eg: Collector's Shortstop Chemistry Set = 220-14 (220=chemistry set, 14=quality)
  priceindex?: string;
  quality: Quality;
  slot: string;
  style?: {
    name: string;
  };
  summary: string;
  texture?: {
    id: number;
    itemDefindex: number;
    rarity: number;
    name: string;
  };
  wearTier?: {
    id: number;
    name: string;
    short: string;
  };
  elevatedQuality?: Quality;
  tag?: null;
  tradable: boolean;
}

interface Recipe {
  inputItems: unknown[];
  outputItem: Item | null;
  targetItem: {
    itemName: string;
    imageUrl: string;
  } | null;
}

interface Particle {
  id: number;
  name: string;
  shortName: string;
  imageUrl: string;
  type: string;
}

interface Quality {
  id: number;
  name: string;
  color: string;
}

interface Paint {
  id: number;
  name: string;
  color: string;
}

export interface Listing {
  appid: number;
  listedAt: number;
  bumpedAt: number;
  buyoutOnly?: boolean;
  count: number;
  currencies: {
    keys?: number;
    metal?: number;
    usd?: number;
  };
  details: string;
  id: string;
  intent: string;
  item: Item;
  source: string;
  status: string;
  tradeOffersPreferred?: boolean;
  userAgent?: {
    client: string;
    lastPulse: number;
  };
  user: {
    id: string;
    tradeOfferUrl: string;
  };
}

export interface ListingEvent extends Event {
  event: 'listing-update' | 'listing-delete';
  payload: Listing;
}
