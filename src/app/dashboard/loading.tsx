import Loader from '@/app/components/Loader/Loader';

/**
 * Fallback de navegación para todo /dashboard/*: mientras se descarga el chunk
 * de la página destino (red del hospital), el usuario ve el loader dentro del
 * shell (sidebar/header siguen montados) en vez de una pantalla congelada.
 */
export default function Loading() {
	return (
		<div style={{ position: 'relative', minHeight: '300px' }}>
			<Loader />
		</div>
	);
}
