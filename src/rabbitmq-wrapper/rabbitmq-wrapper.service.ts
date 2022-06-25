import {
  AmqpConnection,
  ConsumerHandler,
  ConsumerTag,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async onModuleDestroy(): Promise<void> {
    // Cancel consumers on module destroy

    if (!this.amqpConnection.connected) {
      return;
    }

    const consumers: Record<
      ConsumerTag,
      ConsumerHandler<unknown, unknown>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
    > = this.amqpConnection._consumers;

    await Promise.all(
      Object.entries(consumers).map(([consumerTag, consumer]) => {
        if (consumer.type === 'subscribe') {
          return this.amqpConnection.cancelConsumer(consumerTag);
        }
      }),
    );
  }
}
