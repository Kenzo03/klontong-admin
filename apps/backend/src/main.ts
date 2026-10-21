import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback'); // the Nuxt proxy runs locally: take the client IP from X-Forwarded-For
  configureApp(app);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();