import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config, RabbitMQConfig } from '../common/config/configuration';

@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Config>) => {
        const rabbitmqConfig = configService.get<RabbitMQConfig>('rabbitmq');

        return {
          exchanges: [
            {
              name: 'bptf-snapshot.created',
              type: 'fanout',
            },
            {
              name: 'bptf-listing.updated',
              type: 'fanout',
            },
            {
              name: 'bptf-listing.handled',
              type: 'fanout',
            },
            {
              name: 'bptf-event.created',
              type: 'direct',
            },
          ],
          uri: `amqp://${rabbitmqConfig.username}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}/${rabbitmqConfig.vhost}`,
          prefetchCount: 1,
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitMQWrapperModule {}
