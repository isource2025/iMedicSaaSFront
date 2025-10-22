import React from "react";
import styles from "./ConfirmationModal.module.css";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
};

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
}: Props) {
    if (!isOpen) {
        return null;
    }

    // Detiene la propagación para que al hacer clic en el modal
    // no se cierre (solo al hacer clic en el fondo).
    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        // El fondo (backdrop) que al hacer clic llama a onClose
        <div className={styles.backdrop}>
            {/* El contenido del modal */}
            <div className={styles.modal} onClick={handleModalClick}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button
                        className={`${styles.btn} ${styles.btnCancel}`}
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`${styles.btn} ${styles.btnConfirm}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
