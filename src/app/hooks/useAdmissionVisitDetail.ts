'use client';

import { useCallback, useRef, useState } from 'react';
import {
	admissionApiErrorMessage,
	loadVisitDetailProgressive,
} from '@/app/services/admissionSearchService';
import type { VisitDetailPayload, VisitDetailTabId } from '@/app/components/admission/AdmissionVisitDetailModal';

export function useAdmissionVisitDetail() {
	const [selectedVisit, setSelectedVisit] = useState<number | null>(null);
	const [detailData, setDetailData] = useState<VisitDetailPayload | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [loadingClinico, setLoadingClinico] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [detailInitialTab, setDetailInitialTab] = useState<VisitDetailTabId | undefined>();
	const [detailError, setDetailError] = useState('');
	const loadGen = useRef(0);

	const openVisitDetail = useCallback(async (numeroVisita: number, initialTab?: VisitDetailTabId) => {
		const gen = ++loadGen.current;
		setSelectedVisit(numeroVisita);
		setDetailInitialTab(initialTab);
		setDetailModalOpen(true);
		setDetailData(null);
		setLoadingClinico(false);
		try {
			setLoadingDetail(true);
			setDetailError('');
			await loadVisitDetailProgressive(numeroVisita, (data, meta) => {
				if (gen !== loadGen.current) return;
				setDetailData(data as VisitDetailPayload);
				setLoadingDetail(false);
				setLoadingClinico(meta.clinicoLoading);
				// Solo errores del núcleo; timeouts de labs/prácticas no ensucian la UI.
				setDetailError(meta.batchError || '');
			});
		} catch (e: unknown) {
			if (gen !== loadGen.current) return;
			setDetailError(admissionApiErrorMessage(e, 'No se pudo cargar el detalle de la visita'));
			setLoadingDetail(false);
			setLoadingClinico(false);
		}
	}, []);

	const closeVisitDetail = useCallback(() => {
		loadGen.current += 1;
		setDetailModalOpen(false);
		setSelectedVisit(null);
		setDetailData(null);
		setDetailInitialTab(undefined);
		setLoadingClinico(false);
	}, []);

	const reloadVisitDetail = useCallback(async () => {
		if (selectedVisit == null) return;
		const gen = ++loadGen.current;
		try {
			setLoadingDetail(true);
			setDetailError('');
			setLoadingClinico(false);
			await loadVisitDetailProgressive(selectedVisit, (data, meta) => {
				if (gen !== loadGen.current) return;
				setDetailData(data as VisitDetailPayload);
				setLoadingDetail(false);
				setLoadingClinico(meta.clinicoLoading);
				setDetailError(meta.batchError || '');
			});
		} catch (e: unknown) {
			if (gen !== loadGen.current) return;
			setDetailError(admissionApiErrorMessage(e, 'No se pudo recargar el detalle'));
			setLoadingDetail(false);
			setLoadingClinico(false);
		}
	}, [selectedVisit]);

	return {
		selectedVisit,
		detailData,
		loadingDetail,
		loadingClinico,
		detailModalOpen,
		detailInitialTab,
		detailError,
		setDetailError,
		openVisitDetail,
		closeVisitDetail,
		reloadVisitDetail,
	};
}
