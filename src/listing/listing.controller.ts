import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { Pagination } from 'nestjs-typeorm-paginate';
import { GetListingsDto } from './dto/get-listings.dto';
import { ListingService } from './listing.service';
import { Listing } from './models/listing.entity';

@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get('/sku/:sku')
  getPrices(
    @Param('sku') sku: string,
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
      },
      sku,
      query.intent,
      query.order,
    );
  }
}
