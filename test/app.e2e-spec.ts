import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { Connection } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const connection = app.get(Connection);

    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterEach(() => {
    return app.close();
  });

  afterAll(() => {
    const connection = app.get(Connection);
    return connection.close();
  });

  it('should be defined', () => {
    return expect(app).toBeDefined();
  });
});