import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { Usuario } from '../auth/usuario.entity';
import { patronBusqueda } from '../common/paginacion';
import {
  CrearHorarioVentaDto,
  CrearVendedorBibliotecaDto,
} from './reservas.dto';
import { HorarioVenta } from './horario-venta.entity';
import {
  esFechaISOValida,
  esRangoHorarioValido,
  fechaYHoraEnSantiago,
  horarioComienzaEnFuturo,
  seSuperponenHorarios,
} from './horarios-venta.util';
import { VendedorBiblioteca } from './vendedor-biblioteca.entity';

const HORARIOS_LOCK_NAMESPACE = 0x55434e48;

@Injectable()
export class HorariosVentaService {
  constructor(private readonly dataSource: DataSource) {}

  async listarVendedores() {
    const vendedores = await this.dataSource
      .getRepository(VendedorBiblioteca)
      .find({
        relations: { usuario: true },
        order: { nombre: 'ASC' },
      });
    return vendedores.map((vendedor) => this.serializarVendedor(vendedor));
  }

  async buscarUsuariosDisponibles(texto: string) {
    const consulta = [...texto]
      .filter((caracter) => {
        const codigo = caracter.charCodeAt(0);
        return codigo >= 32 && codigo !== 127;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (consulta.length < 3) {
      throw new BadRequestException(
        'Ingresa al menos 3 caracteres para buscar',
      );
    }

    const patron = patronBusqueda(consulta);
    if (!patron) {
      throw new BadRequestException('El texto de búsqueda no es válido');
    }

    const usuarios = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('usuario')
      .select(['usuario.uid', 'usuario.nombre', 'usuario.email'])
      .where('usuario.esAdmin = false')
      .andWhere(
        '(usuario.nombre ILIKE :patron OR usuario.email ILIKE :patron)',
        {
          patron,
        },
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM vendedores_biblioteca vendedor WHERE vendedor.uid = usuario.uid)',
      )
      .orderBy('usuario.nombre', 'ASC')
      .addOrderBy('usuario.email', 'ASC')
      .take(10)
      .getMany();

    return usuarios.map(({ uid, nombre, email }) => ({ uid, nombre, email }));
  }

  async crearVendedor(dto: CrearVendedorBibliotecaDto) {
    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager.getRepository(Usuario).findOne({
        where: { uid: dto.uidUsuario },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      if (usuario.esAdmin) {
        throw new BadRequestException(
          'No se puede asignar un administrador como vendedor',
        );
      }

      const repository = manager.getRepository(VendedorBiblioteca);
      const existente = await repository.findOne({
        where: { usuario: { uid: usuario.uid } },
      });
      if (existente) {
        throw new ConflictException(
          'Este usuario ya está registrado como vendedor',
        );
      }

      const vendedor = await repository.save(
        repository.create({
          nombre: usuario.nombre.trim(),
          usuario,
          activo: true,
        }),
      );
      return this.serializarVendedor(vendedor);
    });
  }

  async cambiarEstadoVendedor(idVendedor: number, activo: boolean) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(VendedorBiblioteca);
      const vendedor = await repository.findOne({
        where: { idVendedor },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

      vendedor.activo = activo;
      await repository.save(vendedor);
      if (!activo) {
        await manager
          .getRepository(HorarioVenta)
          .update({ idVendedor, activo: true }, { activo: false });
      }
      return this.serializarVendedor(vendedor);
    });
  }

  async eliminarVendedor(idVendedor: number) {
    return this.dataSource.transaction(async (manager) => {
      const vendedores = manager.getRepository(VendedorBiblioteca);
      const vendedor = await vendedores.findOne({
        where: { idVendedor },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

      const horarios = manager.getRepository(HorarioVenta);
      const horariosEliminados = await horarios.countBy({ idVendedor });
      await horarios.delete({ idVendedor });
      await vendedores.delete({ idVendedor });

      return { idVendedor, horariosEliminados };
    });
  }

  async listarHorarios() {
    const horarios = await this.dataSource.getRepository(HorarioVenta).find({
      relations: { vendedor: { usuario: true } },
      order: { fecha: 'ASC', horaInicio: 'ASC' },
    });
    return horarios.map((horario) => this.serializarHorario(horario));
  }

  async listarMisTurnos(uid: number) {
    const vendedor = await this.dataSource
      .getRepository(VendedorBiblioteca)
      .findOne({
        where: { usuario: { uid }, activo: true },
      });
    if (!vendedor) return [];

    const ahora = fechaYHoraEnSantiago();
    const horarios = await this.dataSource
      .getRepository(HorarioVenta)
      .createQueryBuilder('horario')
      .leftJoinAndSelect('horario.vendedor', 'vendedor')
      .leftJoinAndSelect('vendedor.usuario', 'usuario')
      .where('horario.idVendedor = :idVendedor', {
        idVendedor: vendedor.idVendedor,
      })
      .andWhere('horario.activo = true')
      .andWhere(
        '(horario.fecha > :fecha OR (horario.fecha = :fecha AND horario.horaTermino > :hora))',
        { fecha: ahora.fecha, hora: ahora.hora },
      )
      .orderBy('horario.fecha', 'ASC')
      .addOrderBy('horario.horaInicio', 'ASC')
      .getMany();

    return horarios.map((horario) => this.serializarHorario(horario));
  }

  async listarMisHorarios(uid: number) {
    const vendedor = await this.dataSource
      .getRepository(VendedorBiblioteca)
      .findOne({ where: { usuario: { uid } } });
    if (!vendedor) return [];

    const horarios = await this.dataSource.getRepository(HorarioVenta).find({
      where: { idVendedor: vendedor.idVendedor },
      relations: { vendedor: { usuario: true } },
      order: { fecha: 'ASC', horaInicio: 'ASC' },
    });

    return horarios.map((horario) => this.serializarHorario(horario));
  }

  async listarDisponibles(fecha: string) {
    if (!esFechaISOValida(fecha)) {
      throw new BadRequestException('La fecha seleccionada no es válida');
    }

    const ahora = fechaYHoraEnSantiago();
    if (fecha < ahora.fecha) return [];

    const horarios = await this.dataSource.getRepository(HorarioVenta).find({
      where: { fecha, activo: true, vendedor: { activo: true } },
      relations: { vendedor: { usuario: true } },
      order: { horaInicio: 'ASC' },
    });
    return horarios
      .filter((horario) =>
        horarioComienzaEnFuturo(fecha, horario.horaInicio.slice(0, 5), ahora),
      )
      .map((horario) => this.serializarHorario(horario));
  }

  async crearHorario(dto: CrearHorarioVentaDto) {
    if (!esFechaISOValida(dto.fecha)) {
      throw new BadRequestException('La fecha seleccionada no es válida');
    }
    if (!esRangoHorarioValido(dto.horaInicio, dto.horaTermino)) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la hora de inicio',
      );
    }

    const ahora = fechaYHoraEnSantiago();
    if (!horarioComienzaEnFuturo(dto.fecha, dto.horaInicio, ahora)) {
      throw new BadRequestException('El horario debe comenzar en el futuro');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.bloquearFechaHorario(manager, dto.fecha);
      const vendedorRepository = manager.getRepository(VendedorBiblioteca);
      const vendedor = await vendedorRepository.findOne({
        where: { idVendedor: dto.idVendedor },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vendedor || !vendedor.activo) {
        throw new NotFoundException('Vendedor no encontrado o inactivo');
      }

      const seSuperpone = await this.existeSuperposicion(
        manager,
        dto.fecha,
        dto.horaInicio,
        dto.horaTermino,
      );
      if (seSuperpone) {
        throw new ConflictException(
          'El rango se superpone con otro horario activo de venta para esa fecha',
        );
      }

      const horarioRepository = manager.getRepository(HorarioVenta);
      const horario = await horarioRepository.save(
        horarioRepository.create({
          idVendedor: vendedor.idVendedor,
          vendedor,
          fecha: dto.fecha,
          horaInicio: dto.horaInicio,
          horaTermino: dto.horaTermino,
          activo: true,
        }),
      );
      return this.serializarHorario({ ...horario, vendedor });
    });
  }

  async cambiarDisponibilidad(idHorario: number, activo: boolean) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(HorarioVenta);
      const horarioInicial = await repository.findOne({ where: { idHorario } });
      if (!horarioInicial) throw new NotFoundException('Horario no encontrado');

      if (activo && !horarioInicial.activo) {
        await this.bloquearFechaHorario(manager, horarioInicial.fecha);
      }

      const vendedor = await manager.getRepository(VendedorBiblioteca).findOne({
        where: { idVendedor: horarioInicial.idVendedor },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

      const horario = await repository.findOne({
        where: { idHorario },
        relations: { vendedor: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!horario) throw new NotFoundException('Horario no encontrado');

      if (activo && !horario.activo) {
        const ahora = fechaYHoraEnSantiago();
        if (
          !vendedor.activo ||
          !horarioComienzaEnFuturo(
            horario.fecha,
            horario.horaInicio.slice(0, 5),
            ahora,
          )
        ) {
          throw new BadRequestException(
            'Solo se pueden activar horarios futuros de vendedores activos',
          );
        }
        const seSuperpone = await this.existeSuperposicion(
          manager,
          horario.fecha,
          horario.horaInicio.slice(0, 5),
          horario.horaTermino.slice(0, 5),
          horario.idHorario,
        );
        if (seSuperpone) {
          throw new ConflictException(
            'El rango se superpone con otro horario activo de venta para esa fecha',
          );
        }
      }

      horario.activo = activo;
      await repository.save(horario);
      return this.serializarHorario(horario);
    });
  }

  private async bloquearFechaHorario(manager: EntityManager, fecha: string) {
    const claveFecha = Number(fecha.replace(/-/g, ''));
    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
      HORARIOS_LOCK_NAMESPACE,
      claveFecha,
    ]);
  }

  private async existeSuperposicion(
    manager: EntityManager,
    fecha: string,
    horaInicio: string,
    horaTermino: string,
    excluirIdHorario?: number,
  ): Promise<boolean> {
    const horariosActivos = await manager.getRepository(HorarioVenta).find({
      where: { fecha, activo: true },
    });
    return horariosActivos.some(
      (horario) =>
        horario.idHorario !== excluirIdHorario &&
        seSuperponenHorarios(
          horaInicio,
          horaTermino,
          horario.horaInicio.slice(0, 5),
          horario.horaTermino.slice(0, 5),
        ),
    );
  }

  private serializarVendedor(vendedor: VendedorBiblioteca) {
    return {
      idVendedor: vendedor.idVendedor,
      nombre: vendedor.usuario?.nombre ?? vendedor.nombre,
      activo: vendedor.activo,
      fechaCreacion: vendedor.fechaCreacion,
    };
  }

  private serializarHorario(horario: HorarioVenta) {
    return {
      idHorario: horario.idHorario,
      idVendedor: horario.idVendedor,
      fecha: horario.fecha,
      horaInicio: horario.horaInicio.slice(0, 5),
      horaTermino: horario.horaTermino.slice(0, 5),
      activo: horario.activo,
      vendedor: this.serializarVendedor(horario.vendedor),
    };
  }
}
