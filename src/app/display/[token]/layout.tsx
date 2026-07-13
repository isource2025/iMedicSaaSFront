export default function DisplayLayout({ children }: { children: React.ReactNode }) {
	return <div style={{ minHeight: '100vh', margin: 0 }}>{children}</div>;
}
