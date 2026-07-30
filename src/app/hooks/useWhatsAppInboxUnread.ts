'use client';

import { useCallback, useEffect, useState } from 'react';
import { botConversacionService } from '@/app/services/botConversacionService';

export const INBOX_UNREAD_EVENT = 'imedic:inbox-unread-changed';

export function useWhatsAppInboxUnread(enabled = true) {
	const [count, setCount] = useState(0);

	const refresh = useCallback(async () => {
		if (!enabled) {
			setCount(0);
			return;
		}
		try {
			const total = await botConversacionService.contarNoLeidos();
			setCount(total);
		} catch {
			setCount(0);
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;
		refresh();
		const onChange = () => refresh();
		let t: number | null = null;
		const start = () => {
			if (t != null) window.clearInterval(t);
			t = window.setInterval(() => {
				if (document.visibilityState === 'visible') void refresh();
			}, 45_000);
		};
		start();
		const onVis = () => {
			if (document.visibilityState === 'visible') {
				void refresh();
				start();
			} else if (t != null) {
				window.clearInterval(t);
				t = null;
			}
		};
		window.addEventListener(INBOX_UNREAD_EVENT, onChange);
		document.addEventListener('visibilitychange', onVis);
		return () => {
			if (t != null) window.clearInterval(t);
			window.removeEventListener(INBOX_UNREAD_EVENT, onChange);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [enabled, refresh]);

	return { count, refresh };
}

export function emitInboxUnreadChanged() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event(INBOX_UNREAD_EVENT));
	}
}
