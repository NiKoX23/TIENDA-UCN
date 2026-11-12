import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarEstadoReservaDto, CrearReservaDto } from './reservas.dto';
import { ReservasService } from './reservas.service';

type AuthenticatedRequest = Request & {
  user: { uid: number };
};

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  crear(@Req() request: AuthenticatedRequest, @Body() dto: CrearReservaDto) {
    return this.reservasService.crear(request.user.uid, dto);
  }

  @Get('mias')
  listarPropias(@Req() request: AuthenticatedRequest) {
    return this.reservasService.listarPropias(request.user.uid);
  }

  @Patch(':idReserva/cancelar')
  cancelarPropia(
    @Req() request: AuthenticatedRequest,
    @Param('idReserva', ParseIntPipe) idReserva: number,
  ) {
    return this.reservasService.cancelarPropia(request.user.uid, idReserva);
  }

  @Get('admin')
  @Roles('admin')
  listarTodas() {
    return this.reservasService.listarTodas();
  }

  @Patch('admin/:idReserva/estado')
  @Roles('admin')
  actualizarEstado(
    @Param('idReserva', ParseIntPipe) idReserva: number,
    @Body() dto: ActualizarEstadoReservaDto,
  ) {
    return this.reservasService.actualizarEstado(idReserva, dto.estado);
  }
}
