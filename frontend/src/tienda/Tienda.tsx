import './Tienda.css';
import type { Usuario } from '../services/auth.service';

interface TiendaProps {
	usuario: Usuario;
	onLogout: () => void;
}

const productos = [
	{ nombre: 'Polera UCN', categoria: 'Vestuario', precio: '$12.990', color: 'azul' },
	{ nombre: 'Tazón universitario', categoria: 'Hogar', precio: '$7.990', color: 'amarillo' },
	{ nombre: 'Mochila UCN', categoria: 'Accesorios', precio: '$24.990', color: 'verde' },
];

export default function Tienda({ usuario, onLogout }: TiendaProps) {
	return (
		<main className="tienda">
			<header className="tienda-header">
				<a className="tienda-marca" href="/">Tienda UCN</a>
				<div className="tienda-usuario">
					<span>Hola, {usuario.nombre}</span>
					<button type="button" onClick={onLogout}>Cerrar sesión</button>
				</div>
			</header>

			<section className="tienda-presentacion">
				<div>
					<p className="tienda-etiqueta">Catálogo oficial</p>
					<h1>Productos para llevar tu UCN contigo.</h1>
					<p className="tienda-descripcion">Explora artículos seleccionados para tu vida universitaria.</p>
				</div>
				<div className="tienda-resumen">
					<strong>3</strong>
					<span>productos destacados</span>
				</div>
			</section>

			<section className="tienda-catalogo" aria-labelledby="productos-titulo">
				<div className="tienda-catalogo-header">
					<h2 id="productos-titulo">Productos destacados</h2>
					<label>
						<span className="sr-only">Buscar productos</span>
						<input type="search" placeholder="Buscar producto" />
					</label>
				</div>
				<div className="tienda-productos">
					{productos.map((producto) => (
						<article className="producto" key={producto.nombre}>
							<div className={`producto-imagen producto-imagen-${producto.color}`} aria-hidden="true">UCN</div>
							<div className="producto-info">
								<p>{producto.categoria}</p>
								<h3>{producto.nombre}</h3>
								<strong>{producto.precio}</strong>
							</div>
							<button className="producto-boton" type="button">Ver producto</button>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
