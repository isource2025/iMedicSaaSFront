export default function EmptyState({ text = 'Sin datos' }: { text?: string }) {
	return <div style={{ color: '#6b7a90' }}>{text}</div>;
}
