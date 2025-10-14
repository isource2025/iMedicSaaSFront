import ClientBedView from './client-view';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

export default function BedPage({
	params,
	searchParams,
}: {
	params: { id: string };
	searchParams: { nf?: string };
}) {
	if (searchParams?.nf === '1') notFound();

	// Este wrapper se estira y cancela el padding del layout
	return (
		<div className={styles.fullBleed}>
			<ClientBedView id={params.id} />
		</div>
	);
}
