import Link from 'next/link';

export default function NotFound() {
	return (
		<div style={{ padding: 16 }}>
			<h2>No se encontró la cama</h2>
			<Link href='/dashboard/beds'>Volver a la lista</Link>
		</div>
	);
}
