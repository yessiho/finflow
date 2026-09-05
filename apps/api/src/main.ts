import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /*
   * ==========================================
   * CORS CONFIGURATION
   *
   * Allow the Next.js frontend to communicate
   * with the NestJS API.
   * ==========================================
   */
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

    credentials: true,
  });

  /*
   * ==========================================
   * GLOBAL VALIDATION
   * ==========================================
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
