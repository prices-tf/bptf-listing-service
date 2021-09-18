import { Injectable } from '@nestjs/common';
import { Connection, MoreThanOrEqual, Repository } from 'typeorm';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Listing } from './models/listing.entity';
import {
  AmqpConnection,
  RabbitSubscribe,
  requeueErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { ListingIntent } from './enums/listing-intent.enum';
import { Snapshot } from './models/snapshot.entity';
import { Snapshot as ExchangeSnapshot } from './interfaces/snapshot.interface';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private readonly repository: Repository<Listing>,
    private readonly amqpConnection: AmqpConnection,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  @RabbitSubscribe({
    exchange: 'bptf-snapshot.created',
    routingKey: '*',
    queue: 'saveListingsFromSnapshot',
    queueOptions: {
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: requeueErrorHandler,
  })
  async handleSnapshot(snapshot: ExchangeSnapshot): Promise<void> {
    const snapshotCreatedAt = new Date(snapshot.createdAt);

    const result = await this.connection.transaction(
      async (transactionalEntityManager) => {
        const match = await transactionalEntityManager.findOne(Snapshot, {
          where: {
            sku: snapshot.sku,
            createdAt: MoreThanOrEqual(snapshotCreatedAt),
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (match !== undefined) {
          // Found a snapshot that is newer than the one from the event, skip this one
          return null;
        }

        // The snapshot from the event is newer, save listings
        const listings = snapshot.listings.map((listing) => {
          return this.repository.create({
            sku: snapshot.sku,
            steamid64: listing.steamid64,
            assetid: listing.intent === 'sell' ? listing.item.id : -1,
            item: listing.item,
            intent:
              listing.intent === 'buy' ? ListingIntent.BUY : ListingIntent.SELL,
            isAutomatic: listing.isAutomatic,
            isBuyout: listing.isBuyout,
            isOffers: listing.isOffers,
            details: listing.details,
            currenciesKeys: listing.currenciesKeys,
            currenciesHalfScrap: listing.currenciesHalfScrap,
            createdAt: new Date(listing.createdAt),
            bumpedAt: new Date(listing.bumpedAt),
          });
        });

        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(Listing)
          .values(listings)
          .onConflict(
            `("sku", "steamid64", "assetid") DO UPDATE SET
            "item" = excluded."item",
            "isAutomatic" = excluded."isAutomatic",
            "isBuyout" = excluded."isBuyout",
            "isOffers" = excluded."isOffers",
            "details" = excluded."details",
            "currenciesKeys" = excluded."currenciesKeys",
            "currenciesHalfScrap" = excluded."currenciesHalfScrap",
            "createdAt" = excluded."createdAt",
            "bumpedAt" = excluded."bumpedAt"
          `,
          )
          .execute();

        await transactionalEntityManager.save(
          Snapshot,
          transactionalEntityManager.create(Snapshot, {
            sku: snapshot.sku,
            createdAt: snapshotCreatedAt,
          }),
        );

        return listings;
      },
    );

    if (result !== null) {
      for (let i = 0; i < result.length; i++) {
        const listing = result[i];
        await this.amqpConnection.publish('bptf-listing.updated', '*', listing);
      }

      await this.amqpConnection.publish('bptf-listing.handled', '*', snapshot);
    }
  }
}
