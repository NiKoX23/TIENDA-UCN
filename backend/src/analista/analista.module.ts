import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalistaController } from './analista.controller';
import { AnalistaService } from './analista.service';

@Module({
  imports: [ConfigModule],
  controllers: [AnalistaController],
  providers: [AnalistaService],
})
export class AnalistaModule {}
