import './common/load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getUploadRoot } from './common/upload-paths';
import * as fs from 'fs';

async function bootstrap() {
  // Fail fast in production if secrets missing
  const { getJwtSecret, getInternalAuthSecret } = await import('./common/jwt-secret');
  getJwtSecret();
  getInternalAuthSecret();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const origin = process.env.NEXTAUTH_URL || process.env.WEB_ORIGIN || 'http://localhost:3000';

  fs.mkdirSync(getUploadRoot(), { recursive: true });

  app.enableCors({
    origin: [origin, 'http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Uploads are NOT public static assets — served via authenticated /media/:id/file

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
