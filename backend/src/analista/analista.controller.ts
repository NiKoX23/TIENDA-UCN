import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalistaService } from './analista.service';

@Controller('analista')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalistaController {
  constructor(private readonly analistaService: AnalistaService) {}

  @Get('ingresos')
  ingresos(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return this.analistaService.consultar('ingresos', query, request);
  }

  @Get('prediccion')
  prediccion(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return this.analistaService.consultar('prediccion', query, request);
  }

  @Get('resumen')
  resumen(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return this.analistaService.consultar('resumen', query, request);
  }
}
