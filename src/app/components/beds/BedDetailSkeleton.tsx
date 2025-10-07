'use client';
import layout from './BedDetailView.module.css';
import sk from './BedDetailSkeleton.module.css';

export default function BedDetailSkeleton() {
	return (
		<div className={layout.root}>
			<aside className={layout.left}>
				<div className={layout.leftInner}>
					<div className={sk.block} style={{ height: 220 }} />
					<div className={sk.block} style={{ height: 260, marginTop: 12 }} />
				</div>
			</aside>

			<section className={layout.right}>
				<header className={layout.header}>
					<div className={sk.lineLg} />
				</header>

				<div className={layout.body}>
					<div className={sk.card} />
					<div className={sk.table}>
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className={sk.row} />
						))}
					</div>
				</div>

				<div className={layout.footer}>
					<div className={sk.btns} />
				</div>
			</section>
		</div>
	);
}
