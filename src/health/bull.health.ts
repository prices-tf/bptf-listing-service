import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Queue } from 'bull';

@Injectable()
export class BullHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue('listings')
    private readonly queue: Queue,
  ) {
    super();
  }

  isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.queue.client
      .ping()
      .then(() => {
        return this.getStatus(key, true);
      })
      .catch((err) => {
        throw new HealthCheckError(
          'Bull check failed',
          this.getStatus(key, false, { message: err.message }),
        );
      });
  }
}
