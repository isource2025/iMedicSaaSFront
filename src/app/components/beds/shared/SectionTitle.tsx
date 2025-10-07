import styles from './SectionTitle.module.css';
export default function SectionTitle({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className={styles.wrap}>
			<h1>{title}</h1>
			{subtitle ? <p>{subtitle}</p> : null}
		</div>
	);
}
