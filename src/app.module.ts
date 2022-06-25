import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, {
  DatabaseConfig,
  RedisConfig,
} from './common/config/configuration';
import { validation } from './common/config/validation';
import { HealthModule } from './health/health.module';
import { ListingModule } from './listing/listing.module';
import { Listing } from './listing/models/listing.entity';
import { RabbitMQWrapperModule } from './rabbitmq-wrapper/rabbitmq-wrapper.module';
import { RedisOptions } from 'ioredis';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: process.env.NODE_ENV === 'test' ? '.test.env' : '.env',
      load: [configuration],
      validationSchema: validation,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');

        let redisOptions: RedisOptions;

        if (redisConfig.isSentinel) {
          redisOptions = {
            sentinels: [
              {
                host: redisConfig.host,
                port: redisConfig.port,
              },
            ],
            name: redisConfig.set,
          };
        } else {
          redisOptions = {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
          };
        }

        return {
          redis: redisOptions,
          prefix: 'bull',
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseConfig = configService.get<DatabaseConfig>('database');

        return {
          type: 'postgres',
          host: databaseConfig.host,
          port: databaseConfig.port,
          username: databaseConfig.username,
          password: databaseConfig.password,
          database: databaseConfig.database,
          entities: [Listing],
          autoLoadModels: true,
          synchronize: process.env.TYPEORM_SYNCRONIZE === 'true',
          keepConnectionAlive: true,
        };
      },
    }),
    RabbitMQWrapperModule,
    HealthModule,
    ListingModule,
  ],
})
export class AppModule {}
