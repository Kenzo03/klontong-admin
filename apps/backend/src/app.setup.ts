import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppExceptionFilter } from './common/app-exception.filter';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: errors.flatMap((e) => Object.values(e.constraints ?? {}).map((message) => ({ field: e.property, message }))),
        }),
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
}