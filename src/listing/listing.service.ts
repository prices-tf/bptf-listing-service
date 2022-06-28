import {
  AmqpConnection,
  Nack,
  RabbitSubscribe,
  requeueErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindManyOptions,
  FindOptionsWhere,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import SKU from '@tf2autobot/tf2-sku';
import {
  Item,
  ListingEvent,
  Listing as BptfListing,
} from './interfaces/bptf.interface';
import { Listing } from './models/listing.entity';
import { ListingIntent } from './enums/listing-intent.enum';
import ObjectID from 'bson-objectid';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { InjectQueue } from '@nestjs/bull';
import { JobOptions, Queue } from 'bull';
import { OrderByEnum, OrderEnum } from './dto/get-listings.dto';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    @InjectQueue('listings')
    private readonly queue: Queue<{
      id: string;
    }>,
    @InjectRepository(Listing)
    private readonly repository: Repository<Listing>,
    private readonly amqpConnection: AmqpConnection,
    private readonly dataSource: DataSource,
  ) {}

  paginate(
    options: IPaginationOptions,
    intent?: ListingIntent,
    isDeleted?: boolean,
    order = OrderEnum.DESC,
    orderBy = OrderByEnum.lastSeenAt,
  ): Promise<Pagination<Listing>> {
    const where: FindOptionsWhere<Listing> = {};

    if (intent) {
      where.intent = intent;
    }

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    }

    const searchOptions: FindManyOptions<Listing> = {
      where,
      order: {
        id: order,
      },
    };

    searchOptions.order[orderBy] = order;

    return paginate<Listing>(this.repository, options, searchOptions);
  }

  paginateBySKU(
    options: IPaginationOptions,
    sku: string,
    intent?: ListingIntent,
    isDeleted?: boolean,
    order = OrderEnum.DESC,
    orderBy = OrderByEnum.lastSeenAt,
  ): Promise<Pagination<Listing>> {
    const where: FindOptionsWhere<Listing> = {
      sku,
    };

    if (intent) {
      where.intent = intent;
    }

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    }

    const searchOptions: FindManyOptions<Listing> = {
      where,
      order: {},
    };

    searchOptions.order[orderBy] = order;

    return paginate<Listing>(this.repository, options, searchOptions);
  }

  async getListingById(listingId: string): Promise<Listing> {
    const listing = await this.repository.findOne({
      where: {
        id: listingId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing does not exist');
    }

    return listing;
  }

  async setListingAsDeleted(listingId: string): Promise<void> {
    await this.repository.update(listingId, {
      isDeleted: true,
    });
  }

  async enqueueCheck(
    id: string,
    delay?: number,
    priority?: number,
    replace = true,
  ): Promise<boolean> {
    const jobId = id;

    const job = await this.queue.getJob(jobId);

    if (job) {
      const state = await job.getState();

      if (
        replace === true &&
        state !== 'active' &&
        job.opts.priority !== priority
      ) {
        // Job has a different priority, replace it with new job
        await job.remove();
      } else if (replace === true && state === 'delayed') {
        // Job is delayed, figure out if it should be promoted, removed or ignored
        const now = new Date().getTime();
        const delayEnd = job.timestamp + job.opts.delay;

        if (delay == undefined) {
          if (delayEnd > now) {
            // Job is delayed, promote it to waiting
            await job.promote();
            return false;
          }
        } else if (delayEnd > now + delay) {
          // If job was made again with new delay then it would be processed earlier
          await job.remove();
        } else {
          // Job should not be updated
          return false;
        }
      } else if (state === 'completed' || state === 'failed') {
        // Job is finished, remove it
        await job.remove();
      } else {
        // Job already in the queue
        return false;
      }
    }

    const options: JobOptions = {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    };

    if (delay !== undefined) {
      options.delay = delay;
    }

    if (priority !== undefined) {
      options.priority = priority;
    }

    await this.queue.add(
      {
        id,
      },
      options,
    );

    // Added job to queue

    return true;
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
    return this.handleListingEvent(event, false).catch((err) => {
      this.logger.error('Error handling listing update: ' + event.payload.id);
      console.error(err);
      console.log(JSON.stringify(event));
      return new Nack(true);
    });
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
    return this.handleListingEvent(event, true).catch((err) => {
      this.logger.error('Error handling listing delete: ' + event.payload.id);
      console.error(err);
      console.log(JSON.stringify(event));
      return new Nack(true);
    });
  }

  async saveListing(
    listing: BptfListing,
    isDeleted: boolean,
    time: Date,
  ): Promise<Listing> {
    if (listing.appid != 440) {
      // Ignore non-TF2 listings
      return null;
    } else if (
      listing.currencies.keys === undefined &&
      listing.currencies.metal === undefined
    ) {
      // We only want items that are listed for keys and metal
      return null;
    } else if (listing.item.quality === null) {
      // TODO: Validate listings
      return null;
    }

    // Generate the SKU from the item object
    const sku = this.getSKUFromItem(listing.item);

    // Create entity
    const entity = this.repository.create({
      id: listing.id,
      sku,
      steamid64: listing.user.id,
      item: listing.item,
      intent: listing.intent === 'buy' ? ListingIntent.BUY : ListingIntent.SELL,
      isAutomatic: listing.userAgent !== undefined,
      isBuyout: listing.buyoutOnly ?? true,
      isOffers: listing.tradeOffersPreferred ?? true,
      currenciesKeys: listing.currencies.keys ?? 0,
      currenciesHalfScrap:
        listing.currencies.metal === undefined
          ? 0
          : Math.round(listing.currencies.metal * 9 * 2),
      comment:
        typeof listing.details === 'string'
          ? listing.details.slice(0, 200)
          : null,
      createdAt: new Date(listing.listedAt * 1000),
      bumpedAt: new Date(listing.bumpedAt * 1000),
      firstSeenAt: time,
      lastSeenAt: time,
      lastCheckedAt: time,
      isDeleted,
    });

    if (entity.currenciesHalfScrap > 2147483647) {
      // Don't save if value is greater than 4 byte integer size (postgres integer type)
      return null;
    }

    // Create transaction
    const result = await this.dataSource.transaction(async (manager) => {
      // Find existing listing
      const existingListing = await manager.findOne(Listing, {
        where: {
          // Find by id
          id: listing.id,
          // and lastSeenAt is less than the event timestamp
          lastSeenAt: MoreThanOrEqual(entity.lastSeenAt),
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
        .values(entity)
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
            'lastCheckedAt',
            'isDeleted',
          ],
          ['id'],
        )
        .returning(['firstSeenAt'])
        .execute();

      // Update firstSeenAt with the actual value
      entity.firstSeenAt = result.raw[0].firstSeenAt;

      return entity;
    });

    if (result) {
      const exchange = isDeleted
        ? 'bptf-listing.deleted'
        : 'bptf-listing.updated';

      await this.amqpConnection.publish(exchange, '*', result);
    }

    return result;
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
    // Get ObjectID from event
    const id = ObjectID(event.id);
    // Get timestamp for when the event was created
    const eventTime = id.getTimestamp();

    // Save the listing
    await this.saveListing(event.payload, isDeleteEvent, eventTime);
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

  isValidId(id: string): boolean {
    if (!id.startsWith('440_')) {
      return false;
    }

    const parts = id.split('_');

    if (parts.length === 2) {
      // 440_<number>
      const isNumber = !isNaN(parseInt(parts[1], 10));
      return isNumber;
    } else if (parts.length === 3) {
      // 440_<number>_<md5>
      const isNumber = !isNaN(parseInt(parts[1], 10));
      const isMD5Hash = new RegExp(/^[a-f0-9]{32}$/gi).test(parts[2]);
      return isNumber && isMD5Hash;
    } else {
      return false;
    }
  }
}
