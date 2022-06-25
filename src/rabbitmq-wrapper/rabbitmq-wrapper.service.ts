import {
  AmqpConnection,
  ConsumerHandler,
  ConsumerTag,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  onModuleDestroy() {
    // Cancel consumers on module destroy

    const consumers: Record<
      ConsumerTag,
      ConsumerHandler<unknown, unknown>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
    > = this.amqpConnection._consumers;

    for (const [consumerTag, consumer] of Object.entries(consumers)) {
      if (consumer.type === 'subscribe') {
        this.amqpConnection.cancelConsumer(consumerTag);
      }
    }
  }
}
