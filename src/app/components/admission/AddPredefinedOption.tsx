import React from 'react';
import { IoAdd } from 'react-icons/io5';
import styles from '../../dashboard/admission/tables/create-opcion.module.css';

interface AddPredefinedOptionProps {
  onAddOption: (description: string, icon: string) => Promise<void>;
  optionType: string;
  isVisible: boolean;
}

const AddPredefinedOption: React.FC<AddPredefinedOptionProps> = ({
  onAddOption,
  optionType,
  isVisible
}) => {
  const handleAddOption = async () => {
    try {
      let description = '';
      let icon = 'ConfigGral.ico';
      
      // Configurar diferentes tipos de opciones predefinidas
      if (optionType === 'dador-organos') {
        description = 'Dadores de Órganos';
        icon = 'ConfigGral.ico';
      } else if (optionType === 'diagnosticos') {
        description = 'Diagnósticos';
        icon = 'ConfigGral.ico';
      } else if (optionType === 'disposicion-egreso') {
        description = 'Disposición de Egreso';
        icon = 'ConfigGral.ico';
      } else if (optionType === 'estado-ambulatorio') {
        description = 'Estado Ambulatorio';
        icon = 'ConfigGral.ico';
      }
      
      await onAddOption(description, icon);
    } catch (error) {
      console.error(`Error al crear la opción ${optionType}:`, error);
      alert(`Error al crear la opción: ${error}`);
    }
  };

  return (
    <div className={`${styles.buttonContainer} ${!isVisible ? styles.hidden : ''}`}>
      <button
        onClick={handleAddOption}
        className={styles.createButton}
      >
        <IoAdd size={20} />
        Añadir opción &quot;{optionType === 'dador-organos' ? 'Dadores de Órganos' : 
                        optionType === 'diagnosticos' ? 'Diagnósticos' : 
                        optionType === 'disposicion-egreso' ? 'Disposición de Egreso' : 
                        optionType === 'estado-ambulatorio' ? 'Estado Ambulatorio' : ''}&quot;
      </button>
    </div>
  );
};

export default AddPredefinedOption;
