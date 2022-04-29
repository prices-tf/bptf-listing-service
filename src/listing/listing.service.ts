import { Injectable } from '@nestjs/common';
import {
  Connection,
  FindConditions,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
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
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { ListingUpdateEvent } from './interfaces/bptf-event.interface';
import { TradeOfferUrlService } from '../tradeofferurl/tradeofferurl.service';

@Injectable()
export class ListingService {
  constructor(
    private readonly tradeofferurlService: TradeOfferUrlService,
    @InjectRepository(Listing)
    private readonly repository: Repository<Listing>,
    private readonly amqpConnection: AmqpConnection,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  paginate(
    options: IPaginationOptions,
    sku: string,
    intent?: ListingIntent,
    order: 'ASC' | 'DESC' = 'DESC',
  ): Promise<Pagination<Listing>> {
    const where: FindConditions<Listing> = {
      sku,
    };

    if (intent) {
      where.intent = intent;
    }

    return paginate<Listing>(this.repository, options, {
      where,
      order: {
        lastSeenAt: order,
      },
    });
  }

  @RabbitSubscribe({
    exchange: 'bptf-event.created',
    routingKey: 'listing-update',
    queue: 'saveListingsFromWebsocket',
    queueOptions: {
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: requeueErrorHandler,
  })
  private async handleListingUpdate(event: ListingUpdateEvent): Promise<void> {
    /* const item = {
      defindex: event.payload.item.defindex,
      quality: event.payload.item.quality.id,
      craftable: event.payload.item.craftable === true,
      killstreak: event.payload.item.killstreakTier ?? 0,
      australium: event.payload.item.australium ?? false,
      festive: event.payload.item.festivized ?? false,
      effect: event.payload.item.particle?.id ?? null,
      paintkit: event.payload.item.texture?.id ?? null,
      wear: event.payload.item.wearTier?.id ?? null,
      quality2: event.payload.item.elevatedQuality?.id ?? null,
      crateseries: null,
      target: null,
      output: event.payload.item.recipe?.outputItem?.defindex ?? null,
      outputQuality: event.payload.item.recipe?.outputItem?.quality ?? null,
    }; */

    const url = new URL(event.payload.user.tradeOfferUrl);

    const partner = url.searchParams.get('partner');
    const token = url.searchParams.get('token');

    if (token && partner) {
      const partnerParsed = parseInt(partner);

      return this.tradeofferurlService.saveUrl({
        partner: partnerParsed,
        token,
      });
    }
  }

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
  private async handleSnapshot(snapshot: ExchangeSnapshot): Promise<void> {
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
            currenciesKeys: listing.currenciesKeys,
            currenciesHalfScrap: listing.currenciesHalfScrap,
            createdAt: new Date(listing.createdAt),
            bumpedAt: new Date(listing.bumpedAt),
            firstSeenAt: snapshotCreatedAt,
            lastSeenAt: snapshotCreatedAt,
          });
        });

        const deduplicate: { [key: string]: Listing } = {};

        for (let i = 0; i < listings.length; i++) {
          const element = listings[i];

          const id =
            element.sku + '_' + element.assetid + '_' + element.steamid64;

          if (
            deduplicate[id] === undefined ||
            deduplicate[id].createdAt < element.createdAt
          ) {
            deduplicate[id] = element;
          }
        }

        const deduplicated = Object.values(deduplicate);

        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(Listing)
          .values(deduplicated)
          .onConflict(
            `("sku", "steamid64", "assetid") DO UPDATE SET
              "item" = excluded."item",
              "isAutomatic" = excluded."isAutomatic",
              "isBuyout" = excluded."isBuyout",
              "isOffers" = excluded."isOffers",
              "currenciesKeys" = excluded."currenciesKeys",
              "currenciesHalfScrap" = excluded."currenciesHalfScrap",
              "createdAt" = excluded."createdAt",
              "bumpedAt" = excluded."bumpedAt",
              "lastSeenAt" = excluded."lastSeenAt"
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

        return deduplicated;
      },
    );

    if (result !== null) {
      for (let i = 0; i < result.length; i++) {
        const listing = result[i];
        await this.amqpConnection.publish('bptf-listing.updated', '*', listing);
      }
    }

    await this.amqpConnection.publish('bptf-listing.handled', '*', snapshot);
  }
}
