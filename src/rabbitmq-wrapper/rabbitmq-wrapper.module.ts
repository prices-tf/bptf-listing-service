import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config, RabbitMQConfig } from '../common/config/configuration';
import { RabbitMQService } from './rabbitmq-wrapper.service';

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
              name: 'bptf-event.created',
              type: 'direct',
            },
            {
              name: 'bptf-listing.updated',
              type: 'fanout',
            },
            {
              name: 'bptf-listing.deleted',
              type: 'fanout',
            },
            {
              name: 'bptf-snapshot.created',
              type: 'fanout',
            },
            {
              name: 'bptf-snapshot.handled',
              type: 'fanout',
            },
          ],
          uri: `amqp://${rabbitmqConfig.username}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}/${rabbitmqConfig.vhost}`,
          prefetchCount: rabbitmqConfig.prefetchCount,
          connectionInitOptions: { wait: false },
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
  providers: [RabbitMQService],
})
export class RabbitMQWrapperModule {}
