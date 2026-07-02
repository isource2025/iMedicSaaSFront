'use client';

import { useCallback, useState } from 'react';
import { admissionSearchService } from '@/app/services/admissionSearchService';
import type { VisitDetailPayload, VisitDetailTabId } from '@/app/components/admission/AdmissionVisitDetailModal';

export function useAdmissionVisitDetail() {
	const [selectedVisit, setSelectedVisit] = useState<number | null>(null);
	const [detailData, setDetailData] = useState<VisitDetailPayload | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [detailInitialTab, setDetailInitialTab] = useState<VisitDetailTabId | undefined>();
	const [detailError, setDetailError] = useState('');

	const openVisitDetail = useCallback(async (numeroVisita: number, initialTab?: VisitDetailTabId) => {
		setSelectedVisit(numeroVisita);
		setDetailInitialTab(initialTab);
		setDetailModalOpen(true);
		setDetailData(null);
		try {
			setLoadingDetail(true);
			setDetailError('');
			const data = await admissionSearchService.detalle(numeroVisita);
			setDetailData(data as VisitDetailPayload);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setDetailError(
				err?.response?.data?.message || err?.message || 'No se pudo cargar el detalle de la visita',
			);
		} finally {
			setLoadingDetail(false);
		}
	}, []);

	const closeVisitDetail = useCallback(() => {
		setDetailModalOpen(false);
		setSelectedVisit(null);
		setDetailData(null);
		setDetailInitialTab(undefined);
	}, []);

	return {
		selectedVisit,
		detailData,
		loadingDetail,
		detailModalOpen,
		detailInitialTab,
		detailError,
		setDetailError,
		openVisitDetail,
		closeVisitDetail,
	};
}
