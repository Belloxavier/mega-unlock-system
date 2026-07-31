export const TIPOS_ESTANDAR = ['Cuenta Mi', 'Reparación IMEI', 'FRP', 'Desbloqueo Red', 'iCloud', 'Software General'];

const PREFIJOS_FOLIO: { [tipo: string]: string } = {
  'FRP': 'F',
  'Reparación IMEI': 'I',
  'Cuenta Mi': 'M',
  'Desbloqueo Red': 'R',
  'iCloud': 'IC',
  'Software General': 'S',
};

// El número correlativo de cada folio (F1, F2, I1...) lo asigna el servidor
// (función `asignar_folios`, RPC de Postgres) para que sea atómico entre
// dispositivos — este prefijo es lo único que se calcula en el cliente.
export const getPrefijo = (tipo: string) => PREFIJOS_FOLIO[tipo] || 'O';
