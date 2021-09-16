import { Listing } from './listing.interface';

export interface Snapshot {
  id: string;
  sku: string;
  listings: Listing[];
  createdAt: string;
}
