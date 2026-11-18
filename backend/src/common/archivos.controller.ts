import { Controller, Get } from '@nestjs/common';
import { ArchivosService } from './archivos.service';

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Get('config')
  obtenerConfiguracion() {
    return this.archivosService.obtenerConfiguracion();
  }
}
