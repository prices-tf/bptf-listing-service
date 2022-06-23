import {
  AmqpConnection,
  RabbitSubscribe,
  requeueErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import SKU from '@tf2autobot/tf2-sku';
import { Item, ListingEvent } from './interfaces/bptf.interface';
import { Listing } from './models/listing.entity';
import { ListingIntent } from './enums/listing-intent.enum';
import ObjectID from 'bson-objectid';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly repository: Repository<Listing>,
    private readonly amqpConnection: AmqpConnection,
    private readonly dataSource: DataSource,
  ) {}

  paginate(
    options: IPaginationOptions,
    sku: string,
    intent?: ListingIntent,
    order: 'ASC' | 'DESC' = 'DESC',
  ): Promise<Pagination<Listing>> {
    const where: FindOptionsWhere<Listing> = {
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
    queue: 'saveListingsFromEvents',
    queueOptions: {
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: requeueErrorHandler,
  })
  private saveListingFromEvent(event: ListingEvent): Promise<void> {
    return this.handleListingEvent(event, false);
  }

  @RabbitSubscribe({
    exchange: 'bptf-event.created',
    routingKey: 'listing-delete',
    queue: 'deleteListingsFromEvents',
    queueOptions: {
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: requeueErrorHandler,
  })
  private deleteListingFromEvent(event: ListingEvent): Promise<void> {
    return this.handleListingEvent(event, true);
  }

  /**
   * Handle a listing event.
   * @param event Event object
   * @param isDeleteEvent If true, this is a delete event
   * @returns Promise that resolves when listing is handeled
   */
  private async handleListingEvent(
    event: ListingEvent,
    isDeleteEvent: boolean,
  ): Promise<any> {
    if (event.payload.appid != 440) {
      // Ignore non-TF2 listings
      return;
    } else if (
      event.payload.currencies.keys === undefined &&
      event.payload.currencies.metal === undefined
    ) {
      // We only want items that are listed for keys and metal
      return;
    }

    // Generate the SKU from the item object
    const sku = this.getSKUFromItem(event.payload.item);

    // Get ObjectID from event
    const id = ObjectID(event.id);
    // Get timestamp for when the event was created
    const eventTime = id.getTimestamp();

    // Create entity
    const listing = this.repository.create({
      id: event.payload.id,
      sku,
      steamid64: event.payload.user.id,
      item: event.payload.item,
      intent:
        event.payload.intent === 'buy' ? ListingIntent.BUY : ListingIntent.SELL,
      isAutomatic: event.payload.userAgent !== undefined,
      isBuyout: event.payload.buyoutOnly ?? true,
      isOffers: event.payload.tradeOffersPreffered ?? true,
      currenciesKeys: event.payload.currencies.keys ?? 0,
      currenciesHalfScrap:
        event.payload.currencies.metal === undefined
          ? 0
          : Math.round(event.payload.currencies.metal * 9 * 2),
      comment: event.payload.details
        ? event.payload.details.slice(0, 200)
        : null,
      createdAt: new Date(event.payload.listedAt * 1000),
      bumpedAt: new Date(event.payload.bumpedAt * 1000),
      firstSeenAt: eventTime,
      lastSeenAt: eventTime,
      isDeleted: isDeleteEvent,
    });

    // Create transaction
    const result = await this.dataSource.transaction(async (manager) => {
      // Find existing listing
      const existingListing = await manager.findOne(Listing, {
        where: {
          // Find by id
          id: listing.id,
          // and lastSeenAt is less than the event timestamp
          lastSeenAt: MoreThanOrEqual(listing.lastSeenAt),
        },
        lock: {
          // Lock the row to prevent other processes from querying or updating it
          mode: 'pessimistic_write',
        },
      });

      if (existingListing) {
        // The listing saved in the database is newer than the event, so we can ignore it
        return null;
      }

      // Save the listing, overwrite if it already exists
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(Listing)
        .values(listing)
        // Don't overwrite firstSeenAt
        .orUpdate(
          [
            'item',
            'intent',
            'isAutomatic',
            'isBuyout',
            'isOffers',
            'currenciesKeys',
            'currenciesHalfScrap',
            'comment',
            'createdAt',
            'bumpedAt',
            'lastSeenAt',
            'isDeleted',
          ],
          ['id'],
        )
        .returning(['firstSeenAt'])
        .execute();

      // Update firstSeenAt with the actual value
      listing.firstSeenAt = result.raw[0].firstSeenAt;

      return listing;
    });

    if (result) {
      const exchange = isDeleteEvent
        ? 'bptf-listing.deleted'
        : 'bptf-listing.updated';

      await this.amqpConnection.publish(exchange, '*', result);
    }
  }

  private getSKUFromItem(item: Item): string {
    const parsedItem = {
      defindex: item.defindex,
      quality: item.quality.id,
      craftable: item.craftable === true,
      killstreak: item.killstreakTier ?? 0,
      australium: item.australium ?? false,
      festive: item.festivized ?? false,
      effect: item.particle?.id ?? null,
      paintkit: item.texture?.id ?? null,
      wear: item.wearTier?.id ?? null,
      quality2: item.elevatedQuality?.id ?? null,
      crateseries: item.crateSeries ?? null,
      target: null,
      output: item.recipe?.outputItem?.defindex ?? null,
      outputQuality: item.recipe?.outputItem?.quality.id ?? null,
    };

    if (item.priceindex) {
      if (parsedItem.defindex === 9258) {
        // Unusualifier
        parsedItem.target = parseInt(item.priceindex, 10);
      } else if (item.recipe) {
        const parts = item.priceindex.split('-');
        if (parts.length === 3) {
          parsedItem.target = parseInt(parts.slice(-1)[0], 10);
        }
      }
    }

    // Killstreak Kit Fabricators
    if (parsedItem.defindex === 20003) {
      parsedItem.killstreak = 3;
    } else if (item.defindex === 20002) {
      parsedItem.killstreak = 2;
    }

    return SKU.fromObject(parsedItem);
  }
}
