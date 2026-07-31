// Tipos compartidos por Dashboard y sus futuras piezas (hooks, componentes
// de pestaña). Antes vivían todos dentro de Dashboard.tsx.

// Los componentes del dashboard (ClientesTab, FinanzasTab, etc.) reciben el
// tema como prop tipado `TemaUI` — es un alias de `Tema` (lib/theme.ts) para
// no duplicar la forma del objeto en dos archivos.
export type { Tema as TemaUI } from './lib/theme';

export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  tipo_contacto?: string; // 'tecnico' | 'cliente'
}

export interface Servicio {
  id: string;
  modelo_equipo: string;
  imei_serie?: string;
  tipo_trabajo: string;
  folio?: string;
  monto: number;
  estado: string;
  metodo_pago?: string;
  created_at: string;
  completado_at?: string | null;
  entregado_at?: string | null;
  pagado: boolean;
  pagado_at?: string | null;
  imei_estado?: string;
  es_revision?: boolean;
  diagnostico?: string | null;
  clientes?: Cliente;
}

export interface EquipoForm {
  modelo: string;
  imeiSerie: string;
  tipoTrabajo: string;
  tipoTrabajoOtro: string;
  monto: string;
  metodoPago: string;
  esRevision: boolean;
}

export const equipoVacio = (): EquipoForm => ({
  modelo: '',
  imeiSerie: '',
  tipoTrabajo: 'Cuenta Mi',
  tipoTrabajoOtro: '',
  monto: '',
  metodoPago: 'Efectivo',
  esRevision: false,
});

export interface Garantia {
  id: string;
  folio: string;
  descripcion: string;
  created_at: string;
  resuelta: boolean;
  resuelta_at?: string | null;
  nota_resolucion?: string | null;
  monto_devuelto?: number | null;
  servicios?: {
    id: string;
    modelo_equipo: string;
    tipo_trabajo: string;
    cliente_id?: string;
    clientes?: { id: string; nombre: string; telefono?: string };
  } | null;
}

export interface CuentaBancaria {
  id: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular: string;
  rut?: string;
  email?: string;
  orden: number;
}

export const cuentaVacia = () => ({
  banco: '',
  tipoCuenta: 'Cuenta Corriente',
  numeroCuenta: '',
  titular: '',
  rut: '',
  email: '',
});
