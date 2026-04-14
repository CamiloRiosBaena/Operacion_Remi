import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MenuModule } from './modules/menu/menu.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { AuthModule } from './modules/auth/auth.module';
import { CocinaModule } from './modules/cocina/cocina.module';
import { MesasModule } from './modules/mesas/mesas.module';

// Entidades
import { Categoria } from './modules/menu/entities/categoria.entity';
import { Plato } from './modules/menu/entities/plato.entity';
import { Ingrediente } from './modules/menu/entities/ingrediente.entity';
import { Extra } from './modules/menu/entities/extra.entity';
import { UserStaff } from './modules/auth/entities/user-staff.entity';
import { Cliente } from './modules/auth/entities/cliente.entity';
import { SesionCliente } from './modules/auth/entities/sesion-cliente.entity';
import { Mesa } from './modules/mesas/entities/mesa.entity';
import { Pedido } from './modules/pedidos/entities/pedido.entity';
import { DetallePedido } from './modules/pedidos/entities/detalle-pedido.entity';
import { Pago } from './modules/pedidos/entities/pago.entity';
import { HistorialEstado } from './modules/pedidos/entities/historial-estado.entity';
import { TokenQr } from './modules/pedidos/entities/token-qr.entity';

@Module({
  imports: [
    // Carga variables de entorno desde .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get<string>('DB_HOST',     'localhost'),
        port:     cfg.get<number>('DB_PORT',     5432),
        database: cfg.get<string>('DB_NAME',     'operacion_remi'),
        username: cfg.get<string>('DB_USER',     'postgres'),
        password: cfg.get<string>('DB_PASSWORD', ''),
        // SSL requerido por Neon y otros proveedores cloud.
        // En local (DB_SSL no definida) queda desactivado.
        ssl: cfg.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        entities: [
          Categoria, Plato, Ingrediente, Extra,
          UserStaff, Cliente, SesionCliente,
          Mesa,
          Pedido, DetallePedido, Pago, HistorialEstado, TokenQr,
        ],
        synchronize: cfg.get<string>('NODE_ENV') !== 'production',
        logging: cfg.get<string>('NODE_ENV') === 'development',
      }),
    }),

    MenuModule,
    PedidosModule,
    AuthModule,
    CocinaModule,
    MesasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
