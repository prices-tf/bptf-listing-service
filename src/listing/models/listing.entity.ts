import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { ListingIntent } from '../enums/listing-intent.enum';
import { Item } from '../interfaces/bptf.interface';

@Entity()
@Index(['sku', 'intent'])
export class Listing {
  @PrimaryColumn()
  id: string;

  @Column()
  sku: string;

  @Column({
    type: 'bigint',
  })
  steamid64: string;

  @Column({
    type: 'enum',
    enum: ListingIntent,
  })
  intent: ListingIntent;

  @Column({
    type: 'jsonb',
    select: false,
  })
  item: Item;

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
    type: 'bigint',
  })
  currenciesHalfScrap: number;

  /**
   * Text comment on the listing
   */
  @Column({
    nullable: true,
    select: false,
  })
  comment: string;

  @Column()
  createdAt: Date;

  @Column()
  bumpedAt: Date;

  /**
   * When the listing was first seen
   */
  @Column()
  firstSeenAt: Date;

  /**
   * When the listing was last seen
   */
  @Column()
  lastSeenAt: Date;

  /**
   * Whether the listing is deleted or not
   */
  @Column()
  isDeleted: boolean;
}
