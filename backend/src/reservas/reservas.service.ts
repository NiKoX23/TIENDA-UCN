import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Usuario } from '../auth/usuario.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { EstadoReserva } from './estado-reserva.enum';
import { ItemReserva } from './item-reserva.entity';
import { HorarioVenta } from './horario-venta.entity';
import { Reserva } from './reserva.entity';
import { CrearReservaDto } from './reservas.dto';
import {
  fechaYHoraEnSantiago,
  horarioComienzaEnFuturo,
} from './horarios-venta.util';

const relacionesReserva = {
  usuario: true,
  horarioVenta: { vendedor: true },
  items: { variante: { producto: true } },
} as const;

const estadosFinales = new Set([
  EstadoReserva.RETIRADA,
  EstadoReserva.CANCELADA,
  EstadoReserva.VENCIDA,
]);

@Injectable()
export class ReservasService {
  constructor(private readonly dataSource: DataSource) {}

  async crear(uid: number, dto: CrearReservaDto) {
    const partesFecha = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const partesPorNombre = Object.fromEntries(
      partesFecha.map((parte) => [parte.type, parte.value]),
    );
    const hoyEnSede = `${partesPorNombre.year}-${partesPorNombre.month}-${partesPorNombre.day}`;
    if (dto.fechaRetiro < hoyEnSede) {
      throw new BadRequestException(
        'La fecha de retiro no puede estar en el pasado',
      );
    }

    const ids = dto.lineas.map((linea) => linea.idVariante);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No se puede repetir una variante en la reserva',
      );
    }

    const idReserva = await this.dataSource.transaction(async (manager) => {
      const usuario = await manager.getRepository(Usuario).findOne({
        where: { uid },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      const horario = await manager.getRepository(HorarioVenta).findOne({
        where: { idHorario: dto.idHorario },
        relations: { vendedor: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !horario ||
        !horario.activo ||
        !horario.vendedor.activo ||
        horario.fecha !== dto.fechaRetiro ||
        !horarioComienzaEnFuturo(
          horario.fecha,
          horario.horaInicio.slice(0, 5),
          fechaYHoraEnSantiago(),
        )
      ) {
        throw new BadRequestException(
          'El horario seleccionado ya no está disponible para esa fecha',
        );
      }

      const variantes = new Map<number, VarianteProducto>();
      for (const idVariante of [...ids].sort((a, b) => a - b)) {
        const variante = await manager.getRepository(VarianteProducto).findOne({
          where: { idVariante },
          relations: { producto: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!variante || !variante.producto.activo) {
          throw new NotFoundException(
            `Producto no encontrado para la variante ${idVariante}`,
          );
        }
        variantes.set(idVariante, variante);
      }

      let total = 0;
      const items = dto.lineas.map((linea) => {
        const variante = variantes.get(linea.idVariante);
        if (!variante) {
          throw new NotFoundException(
            `Variante no encontrada: ${linea.idVariante}`,
          );
        }
        if (variante.stock < linea.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${variante.sku} (disponible: ${variante.stock})`,
          );
        }
        const subtotal = variante.producto.precioVenta * linea.cantidad;
        if (
          !Number.isSafeInteger(subtotal) ||
          !Number.isSafeInteger(total + subtotal) ||
          total + subtotal > 2_147_483_647
        ) {
          throw new BadRequestException(
            'El total de la reserva excede el límite permitido',
          );
        }
        total += subtotal;
        variante.stock -= linea.cantidad;
        return { linea, variante, subtotal };
      });

      const reservaRepository = manager.getRepository(Reserva);
      const reserva = await reservaRepository.save(
        reservaRepository.create({
          codigoReserva: `RES-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`,
          uid: usuario.uid,
          usuario,
          fechaRetiro: horario.fecha,
          idHorario: horario.idHorario,
          horarioVenta: horario,
          bloqueHorario: `${horario.horaInicio.slice(0, 5)}-${horario.horaTermino.slice(0, 5)}`,
          observaciones: dto.observaciones?.trim() || null,
          estado: EstadoReserva.PENDIENTE,
          total,
        }),
      );

      await manager
        .getRepository(VarianteProducto)
        .save(items.map(({ variante }) => variante));

      const itemRepository = manager.getRepository(ItemReserva);
      await itemRepository.save(
        items.map(({ linea, variante, subtotal }) =>
          itemRepository.create({
            reserva,
            variante,
            cantidad: linea.cantidad,
            precioUnitario: variante.producto.precioVenta,
            subtotal,
          }),
        ),
      );

      return reserva.idReserva;
    });

    return this.obtenerDetalle(idReserva);
  }

  async listarPropias(uid: number) {
    const reservas = await this.dataSource.getRepository(Reserva).find({
      where: { uid },
      relations: relacionesReserva,
      order: { fechaCreacion: 'DESC' },
    });
    return reservas.map((reserva) => this.serializar(reserva, false));
  }

  async listarTodas() {
    const reservas = await this.dataSource.getRepository(Reserva).find({
      relations: relacionesReserva,
      order: { fechaCreacion: 'DESC' },
    });
    return reservas.map((reserva) => this.serializar(reserva, true));
  }

  async cancelarPropia(uid: number, idReserva: number) {
    return this.dataSource
      .transaction(async (manager) => {
        const reserva = await manager
          .getRepository(Reserva)
          .createQueryBuilder('reserva')
          .where('reserva.id_reserva = :idReserva', { idReserva })
          .andWhere('reserva.uid = :uid', { uid })
          .setLock('pessimistic_write')
          .getOne();
        if (!reserva) throw new NotFoundException('Reserva no encontrada');
        if (reserva.estado !== EstadoReserva.PENDIENTE) {
          throw new BadRequestException(
            'Solo se pueden cancelar reservas pendientes',
          );
        }

        await this.cambiarEstado(manager, reserva, EstadoReserva.CANCELADA);
        return reserva.idReserva;
      })
      .then((idReserva) => this.obtenerDetalle(idReserva));
  }

  async actualizarEstado(idReserva: number, estado: EstadoReserva) {
    await this.dataSource.transaction(async (manager) => {
      const reserva = await manager
        .getRepository(Reserva)
        .createQueryBuilder('reserva')
        .where('reserva.id_reserva = :idReserva', { idReserva })
        .setLock('pessimistic_write')
        .getOne();
      if (!reserva) throw new NotFoundException('Reserva no encontrada');
      if (reserva.estado === estado) return;

      const permitidos: Record<EstadoReserva, EstadoReserva[]> = {
        [EstadoReserva.PENDIENTE]: [
          EstadoReserva.LISTA_PARA_RETIRO,
          EstadoReserva.CANCELADA,
          EstadoReserva.VENCIDA,
        ],
        [EstadoReserva.LISTA_PARA_RETIRO]: [
          EstadoReserva.RETIRADA,
          EstadoReserva.CANCELADA,
          EstadoReserva.VENCIDA,
        ],
        [EstadoReserva.RETIRADA]: [],
        [EstadoReserva.CANCELADA]: [],
        [EstadoReserva.VENCIDA]: [],
      };
      if (!permitidos[reserva.estado].includes(estado)) {
        throw new BadRequestException(
          `No se puede cambiar una reserva ${reserva.estado} a ${estado}`,
        );
      }

      await this.cambiarEstado(manager, reserva, estado);
    });

    return this.obtenerDetalle(idReserva);
  }

  private async cambiarEstado(
    manager: EntityManager,
    reserva: Reserva,
    estado: EstadoReserva,
  ) {
    if (
      [EstadoReserva.CANCELADA, EstadoReserva.VENCIDA].includes(estado) &&
      !estadosFinales.has(reserva.estado)
    ) {
      await this.devolverStock(manager, reserva.idReserva);
    }
    reserva.estado = estado;
    await manager.getRepository(Reserva).save(reserva);
  }

  private async devolverStock(manager: EntityManager, idReserva: number) {
    const items = await manager.getRepository(ItemReserva).find({
      where: { reserva: { idReserva } },
      relations: { variante: true },
      order: { idItem: 'ASC' },
    });
    const varianteRepository = manager.getRepository(VarianteProducto);
    const variantes = new Map<number, VarianteProducto>();
    for (const item of items) {
      if (variantes.has(item.variante.idVariante)) continue;
      const variante = await varianteRepository.findOne({
        where: { idVariante: item.variante.idVariante },
        lock: { mode: 'pessimistic_write' },
      });
      if (!variante) {
        throw new NotFoundException(
          `No se puede devolver el stock de la variante ${item.variante.idVariante}`,
        );
      }
      variantes.set(variante.idVariante, variante);
    }
    for (const item of items) {
      const variante = variantes.get(item.variante.idVariante);
      if (variante) variante.stock += item.cantidad;
    }
    await varianteRepository.save([...variantes.values()]);
  }

  private async obtenerDetalle(idReserva: number) {
    const reserva = await this.dataSource.getRepository(Reserva).findOne({
      where: { idReserva },
      relations: relacionesReserva,
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return this.serializar(reserva, true);
  }

  private serializar(reserva: Reserva, incluirUsuario: boolean) {
    return {
      idReserva: reserva.idReserva,
      codigoReserva: reserva.codigoReserva,
      uid: reserva.uid,
      ...(incluirUsuario
        ? {
            usuario: {
              uid: reserva.usuario.uid,
              nombre: reserva.usuario.nombre,
              email: reserva.usuario.email,
            },
          }
        : {}),
      fechaRetiro: reserva.fechaRetiro,
      horario: reserva.horarioVenta
        ? {
            idHorario: reserva.horarioVenta.idHorario,
            horaInicio: reserva.horarioVenta.horaInicio.slice(0, 5),
            horaTermino: reserva.horarioVenta.horaTermino.slice(0, 5),
            vendedor: {
              idVendedor: reserva.horarioVenta.vendedor.idVendedor,
              nombre: reserva.horarioVenta.vendedor.nombre,
            },
          }
        : null,
      bloqueHorario: reserva.bloqueHorario,
      observaciones: reserva.observaciones,
      estado: reserva.estado,
      total: reserva.total,
      fechaCreacion: reserva.fechaCreacion,
      items: reserva.items.map((item) => ({
        idItem: item.idItem,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        idVariante: item.variante.idVariante,
        sku: item.variante.sku,
        talla: item.variante.talla,
        color: item.variante.color,
        producto: {
          codigoProducto: item.variante.producto.codigoProducto,
          nombre: item.variante.producto.nombre,
          imagenUrl:
            item.variante.imagenUrl || item.variante.producto.imagenUrl,
        },
      })),
    };
  }
}
