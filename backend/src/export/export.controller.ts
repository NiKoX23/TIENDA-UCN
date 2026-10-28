import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExportService } from './export.service';

@Controller('export/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('inventario')
  async exportarInventario(@Res() res: Response) {
    const buffer = await this.exportService.exportarInventario();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TiendaUCN_Inventario_${fecha}.xlsx"`);
    res.send(buffer);
  }

  @Get('ventas')
  async exportarVentas(@Res() res: Response) {
    const buffer = await this.exportService.exportarVentas();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TiendaUCN_Ventas_${fecha}.xlsx"`);
    res.send(buffer);
  }

  @Get('tac')
  async exportarTac(@Res() res: Response) {
    const buffer = await this.exportService.exportarTac();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TiendaUCN_TAC_${fecha}.xlsx"`);
    res.send(buffer);
  }

  @Get('usuarios')
  async exportarUsuarios(@Res() res: Response) {
    const buffer = await this.exportService.exportarUsuarios();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TiendaUCN_Usuarios_${fecha}.xlsx"`);
    res.send(buffer);
  }

  @Get('todo')
  async exportarTodo(@Res() res: Response) {
    const buffer = await this.exportService.exportarTodo();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TiendaUCN_Reporte_Unificado_${fecha}.xlsx"`);
    res.send(buffer);
  }
}
