export const TIPOS_ESTANDAR = [
  'Cuenta Mi',
  'Reparación IMEI',
  'FRP',
  'Desbloqueo Red',
  'iCloud',
  'Software General',
  'Cambio de Pantalla',
  'Logo Claro',
  'Activación IMEI 2 Xiaomi',
  'Virus',
  'Batería',
  'Mantenimiento',
  'Instalación de repuesto de terceros',
];

// Los prefijos deben ser SOLO LETRAS (A-Z). El servidor arma el folio como
// prefijo + número, así que un prefijo con dígito choca con otro: 'I2' + 1 = 'I21',
// que ya es el folio 21 de Reparación IMEI ('I') → error servicios_folio_unique.
// tests/folio.test.mjs lo verifica.
export const PREFIJOS_FOLIO: { [tipo: string]: string } = {
  'FRP': 'F',
  'Reparación IMEI': 'I',
  'Cuenta Mi': 'M',
  'Desbloqueo Red': 'R',
  'iCloud': 'IC',
  'Software General': 'S',
  'Cambio de Pantalla': 'P',
  'Logo Claro': 'LC',
  'Activación IMEI 2 Xiaomi': 'AX',
  'Virus': 'V',
  'Batería': 'B',
  'Mantenimiento': 'MT',
  'Instalación de repuesto de terceros': 'IT',
};

// El número correlativo de cada folio (F1, F2, I1...) lo asigna el servidor
// (función `asignar_folios`, RPC de Postgres) para que sea atómico entre
// dispositivos — este prefijo es lo único que se calcula en el cliente.
export const getPrefijo = (tipo: string) => PREFIJOS_FOLIO[tipo] || 'O';
