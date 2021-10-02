import { ListingIntent } from '../enums/listing-intent.enum';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
@Index(['sku', 'intent', 'lastSeenAt'])
export class Listing {
  @PrimaryColumn()
  sku: string;

  @PrimaryColumn()
  steamid64: string;

  @PrimaryColumn({
    type: 'bigint',
  })
  assetid: string;

  @Column({
    type: 'jsonb',
  })
  item: any;

  @Column({
    type: 'enum',
    enum: ListingIntent,
  })
  intent: ListingIntent;

  @Column()
  isAutomatic: boolean;

  @Column()
  isBuyout: boolean;

  @Column()
  isOffers: boolean;

  @Column({
    type: 'float',
  })
  currenciesKeys: number;

  @Column({
    type: 'int',
  })
  currenciesHalfScrap: number;

  @Column()
  createdAt: Date;

  @Column()
  bumpedAt: Date;

  @Column()
  firstSeenAt: Date;

  @Column()
  lastSeenAt: Date;
}
