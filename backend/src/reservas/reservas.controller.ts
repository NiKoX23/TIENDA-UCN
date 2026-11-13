import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ActualizarDisponibilidadHorarioDto,
  ActualizarEstadoReservaDto,
  BuscarUsuariosVendedoresQueryDto,
  CrearHorarioVentaDto,
  CrearReservaDto,
  CrearVendedorBibliotecaDto,
} from './reservas.dto';
import { HorariosVentaService } from './horarios-venta.service';
import { ReservasService } from './reservas.service';

type AuthenticatedRequest = Request & {
  user: { uid: number };
};

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservasController {
  constructor(
    private readonly reservasService: ReservasService,
    private readonly horariosVentaService: HorariosVentaService,
  ) {}

  @Post()
  crear(@Req() request: AuthenticatedRequest, @Body() dto: CrearReservaDto) {
    return this.reservasService.crear(request.user.uid, dto);
  }

  @Get('mias')
  listarPropias(@Req() request: AuthenticatedRequest) {
    return this.reservasService.listarPropias(request.user.uid);
  }

  @Get('horarios-disponibles')
  listarHorariosDisponibles(@Query('fecha') fecha: string) {
    return this.horariosVentaService.listarDisponibles(fecha);
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

  @Get('admin/vendedores')
  @Roles('admin')
  listarVendedores() {
    return this.horariosVentaService.listarVendedores();
  }

  @Post('admin/vendedores')
  @Roles('admin')
  crearVendedor(@Body() dto: CrearVendedorBibliotecaDto) {
    return this.horariosVentaService.crearVendedor(dto);
  }

  @Delete('admin/vendedores/:idVendedor')
  @Roles('admin')
  eliminarVendedor(@Param('idVendedor', ParseIntPipe) idVendedor: number) {
    return this.horariosVentaService.eliminarVendedor(idVendedor);
  }

  @Get('admin/vendedores/usuarios')
  @Roles('admin')
  buscarUsuariosVendedores(@Query() query: BuscarUsuariosVendedoresQueryDto) {
    return this.horariosVentaService.buscarUsuariosDisponibles(query.q);
  }

  @Patch('admin/vendedores/:idVendedor/estado')
  @Roles('admin')
  cambiarEstadoVendedor(
    @Param('idVendedor', ParseIntPipe) idVendedor: number,
    @Body() dto: ActualizarDisponibilidadHorarioDto,
  ) {
    return this.horariosVentaService.cambiarEstadoVendedor(
      idVendedor,
      dto.activo,
    );
  }

  @Get('admin/horarios')
  @Roles('admin')
  listarHorarios() {
    return this.horariosVentaService.listarHorarios();
  }

  @Get('mis-turnos')
  listarMisTurnos(@Req() request: AuthenticatedRequest) {
    return this.horariosVentaService.listarMisTurnos(request.user.uid);
  }

  @Post('admin/horarios')
  @Roles('admin')
  crearHorario(@Body() dto: CrearHorarioVentaDto) {
    return this.horariosVentaService.crearHorario(dto);
  }

  @Patch('admin/horarios/:idHorario/disponibilidad')
  @Roles('admin')
  cambiarDisponibilidadHorario(
    @Param('idHorario', ParseIntPipe) idHorario: number,
    @Body() dto: ActualizarDisponibilidadHorarioDto,
  ) {
    return this.horariosVentaService.cambiarDisponibilidad(
      idHorario,
      dto.activo,
    );
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
