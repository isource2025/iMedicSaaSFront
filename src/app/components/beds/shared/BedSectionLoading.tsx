'use client';

import Loader from '../../Loader/Loader';

export default function BedSectionLoading() {
	return (
		<div style={{ position: 'relative', minHeight: 240 }} aria-busy="true" aria-live="polite">
			<Loader />
		</div>
	);
}
