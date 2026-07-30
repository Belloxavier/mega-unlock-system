import type { Servicio } from '../types';

export const TIPOS_ESTANDAR = ['Cuenta Mi', 'Reparación IMEI', 'FRP', 'Desbloqueo Red', 'iCloud', 'Software General'];

const PREFIJOS_FOLIO: { [tipo: string]: string } = {
  'FRP': 'F',
  'Reparación IMEI': 'I',
  'Cuenta Mi': 'M',
  'Desbloqueo Red': 'R',
  'iCloud': 'IC',
  'Software General': 'S',
};

export const getPrefijo = (tipo: string) => PREFIJOS_FOLIO[tipo] || 'O';

// Genera el siguiente folio (F1, F2, I1...) mirando los folios ya usados
// para ese mismo prefijo entre los servicios ya cargados.
export const generarFolio = (tipo: string, serviciosActuales: Servicio[]) => {
  const prefijo = getPrefijo(tipo);
  const regex = new RegExp(`^${prefijo}(\\d+)$`);
  let max = 0;
  serviciosActuales.forEach((s) => {
    const m = s.folio?.match(regex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  });
  return `${prefijo}${max + 1}`;
};
