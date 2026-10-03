// Parámetros graficables de controles frecuentes.
// Vive en un archivo propio (sin dependencias de recharts) para que el modal
// pueda usarlos sin cargar la librería de gráficos hasta que haga falta.
export const CHART_PARAMS = [
  { value: "pulso", label: "Pulso" },
  { value: "maximo", label: "Presión Máxima" },
  { value: "minimo", label: "Presión Mínima" },
  { value: "pam", label: "PAMedia" },
  { value: "frecResp", label: "Frec. Resp." },
  { value: "axilar", label: "Temp. Axilar" },
  { value: "saturometria", label: "Saturometría" },
  { value: "glucemia", label: "Glucemia" }
];
