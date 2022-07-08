import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { Pagination } from 'nestjs-typeorm-paginate';
import { CheckListingDto } from './dto/check-listing.dto';
import { GetListingsDto } from './dto/get-listings.dto';
import { SaveListingDto } from './dto/save-listing.dto';
import { ListingService } from './listing.service';
import { Listing } from './models/listing.entity';

@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  getListings(
    @Query(
      new ValidationPipe({
        transform: true,
      }),
    )
    query: GetListingsDto,
  ): Promise<Pagination<Listing>> {
    return this.listingService.paginate(
      {
        page: query.page ?? 1,
        limit: query.limit ?? 100,
        countQueries: false,
      },
      query.intent,
      query.deleted,
      query.order,
      query.orderBy,
    );
  }

  @Get('/sku/:sku')
  getListingsBySKU(
    @Param('sku') sku: string,
    @Query(
      new ValidationPipe({
        transform: true,
      }),
    )
    query: GetListingsDto,
  ): Promise<Pagination<Listing>> {
    return this.listingService.paginateBySKU(
      {
        page: query.page ?? 1,
        limit: query.limit ?? 100,
        countQueries: false,
      },
      sku,
      query.intent,
      query.deleted,
      query.order,
      query.orderBy,
    );
  }

  @Get('/id/:id')
  getListingById(@Param('id') listingId: string): Promise<Listing> {
    return this.listingService.getListingById(listingId);
  }

  @Post('/id/:id/check')
  async enqueueListingCheck(
    @Param('id') id: string,
    @Query(
      new ValidationPipe({
        transform: true,
      }),
    )
    body: CheckListingDto,
  ): Promise<{
    enqueued: boolean;
  }> {
    if (!this.listingService.isValidId(id)) {
      throw new BadRequestException('Invalid id');
    }

    const enqueued = await this.listingService.enqueueCheck(
      id,
      body.delay,
      body.priority,
      body.replace,
    );

    return {
      enqueued,
    };
  }

  @Post()
  async saveListing(
    @Body(
      new ValidationPipe({
        always: true,
        transform: true,
      }),
    )
    saveListing: SaveListingDto,
  ): Promise<{
    saved: boolean;
    listing?: Listing;
  }> {
    const listing = await this.listingService.saveListing(
      saveListing.listing,
      false,
      saveListing.time,
    );

    if (listing === null) {
      return {
        saved: false,
      };
    }

    return {
      saved: true,
      listing,
    };
  }

  @Post('/id/:id/deleted')
  async saveListingAsDeleted(@Param('id') listingId: string): Promise<{
    id: string;
  }> {
    await this.listingService.setListingAsDeleted(listingId);

    return {
      id: listingId,
    };
  }
}
