import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ArchivosController } from './archivos.controller';
import { ArchivosService, leerConfiguracionArchivos } from './archivos.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { maxSizeMB } = leerConfiguracionArchivos(config);
        return {
          limits: { fileSize: Math.ceil(maxSizeMB * 1024 * 1024) },
        };
      },
    }),
  ],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService, MulterModule],
})
export class ArchivosModule {}
