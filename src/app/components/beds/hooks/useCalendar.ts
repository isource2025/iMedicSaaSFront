import { useMemo, useState } from 'react';

export function useCalendar(dateInit = new Date()) {
	const [cursor, setCursor] = useState(new Date(dateInit));
	const monthStart = useMemo(
		() => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
		[cursor],
	);
	const monthEnd = useMemo(
		() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
		[cursor],
	);
	const prev = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
	const next = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
	return { cursor, monthStart, monthEnd, prev, next };
}
