import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — permite peticiones del frontend React
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Validación global con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Elimina campos no declarados en el DTO
      forbidNonWhitelisted: true,
      transform: true,          // Convierte tipos automáticamente (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Swagger — panel visual para probar endpoints
  const config = new DocumentBuilder()
    .setTitle('Operación Remi — API')
    .setDescription('Endpoints del restaurante: menú, pedidos, auth, mesas')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Backend corriendo en http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
