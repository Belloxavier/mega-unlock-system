import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  tipo_contacto?: string; // 'tecnico' | 'cliente'
}

interface Servicio {
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
  clientes?: Cliente;
}

interface EquipoForm {
  modelo: string;
  imeiSerie: string;
  tipoTrabajo: string;
  tipoTrabajoOtro: string;
  monto: string;
  metodoPago: string;
}

const equipoVacio = (): EquipoForm => ({
  modelo: '',
  imeiSerie: '',
  tipoTrabajo: 'Cuenta Mi',
  tipoTrabajoOtro: '',
  monto: '',
  metodoPago: 'Efectivo',
});

interface Garantia {
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

const ZONA_HORARIA = 'America/Santiago';
const PAGE_SIZE = 10;
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Estados de progreso de un trabajo. Siempre editable libremente (elegir de
// este menú, sin ciclos automáticos ni orden forzado).
const ESTADOS_PROGRESO = ['PENDIENTE', 'EN PROCESO', 'PAUSADO', 'COMPLETADO', 'ENTREGADO'];

const getDotColor = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-400';
    case 'EN PROCESO': return 'bg-cyan-400';
    case 'PAUSADO': return 'bg-violet-400';
    case 'COMPLETADO': return 'bg-blue-400';
    case 'ENTREGADO': return 'bg-emerald-400';
    case 'NO REALIZADO': return 'bg-rose-400';
    default: return 'bg-slate-400';
  }
};

// URLs oficiales de cada operadora para consultar el estado de un IMEI
// (Base de Datos Centralizada de Subtel / Multibanda-SAE). No hay API
// pública: son formularios pensados para uso manual, uno por uno.
// Verificadas contra el directorio oficial multibanda.cl (jul. 2026).
const OPERADORAS_IMEI = [
  { nombre: 'Movistar', url: 'https://ww2.movistar.cl/terminos-regulaciones/multibanda-sae/', hex: '#019df4' },
  { nombre: 'Entel', url: 'https://www.entel.cl/nueva-normativa', hex: '#00b2a9' },
  { nombre: 'WOM', url: 'https://www.wom.cl/sello-multibandas/', hex: '#7b2ff7' },
  { nombre: 'Claro', url: 'https://www.clarochile.cl/personas/equipos/consulta-imei/', hex: '#e2001a' },
];

// El campo "IMEI o N° de Serie (S/N)" acepta cualquier texto (a veces hasta
// un teléfono, por error). Un IMEI real son 14-15 dígitos numéricos, así
// que solo eso entra a la lista de pendientes de verificar.
const pareceImei = (valor?: string) => {
  if (!valor) return false;
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 14 || digitos.length === 15;
};

const getImeiWarning = (estado?: string) => {
  switch (estado) {
    case 'reportado': return { icono: '⚠️', clase: 'text-red-400', texto: 'IMEI reportado' };
    case 'bloqueado': return { icono: '⚠️', clase: 'text-orange-400', texto: 'IMEI bloqueado' };
    case 'limpio': return { icono: '✅', clase: 'text-emerald-400', texto: 'IMEI limpio' };
    default: return null;
  }
};

// Devuelve la fecha en formato YYYY-MM-DD según la hora LOCAL de Chile,
// en vez de usar toISOString() que trabaja en UTC y desfasa el "Hoy".
const getFechaLocal = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(d);
};

// Nombre del día de la semana (Lunes, Martes...) según la hora LOCAL de Chile.
const getDiaSemana = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const nombre = new Intl.DateTimeFormat('es-CL', { timeZone: ZONA_HORARIA, weekday: 'long' }).format(d);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
};

// Desplaza un string "YYYY-MM" por `offset` meses (puede ser negativo).
const sumarMeses = (mesStr: string, offset: number) => {
  const [y, m] = mesStr.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const TIPOS_ESTANDAR = ['Cuenta Mi', 'Reparación IMEI', 'FRP', 'Desbloqueo Red', 'iCloud', 'Software General'];

const PREFIJOS_FOLIO: { [tipo: string]: string } = {
  'FRP': 'F',
  'Reparación IMEI': 'I',
  'Cuenta Mi': 'M',
  'Desbloqueo Red': 'R',
  'iCloud': 'IC',
  'Software General': 'S',
};

const getPrefijo = (tipo: string) => PREFIJOS_FOLIO[tipo] || 'O';

// Genera el siguiente folio (F1, F2, I1...) mirando los folios ya usados
// para ese mismo prefijo entre los servicios ya cargados.
const generarFolio = (tipo: string, serviciosActuales: Servicio[]) => {
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

export function Dashboard() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegación por pestañas
  const [vista, setVista] = useState<'inicio' | 'clientes' | 'finanzas' | 'garantias' | 'imei'>('inicio');

  // Filtros y Buscador (pestaña Inicio)
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos', 'hoy', 'mes'
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | estado exacto
  const [mostrarMontos, setMostrarMontos] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [temaCalido, setTemaCalido] = useState(false);
  const [estadoMenuAbierto, setEstadoMenuAbierto] = useState<string | null>(null);
  const [imeiCopiadoId, setImeiCopiadoId] = useState<string | null>(null);

  // Filtros (pestaña Clientes)
  const [filtroFechaClientes, setFiltroFechaClientes] = useState('todos'); // 'todos', 'hoy', 'mes'
  const [filtroTipoContacto, setFiltroTipoContacto] = useState<'todos' | 'tecnico' | 'cliente'>('todos');

  // Estados del formulario y Modo Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteIdAsociado, setClienteIdAsociado] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [tipoContacto, setTipoContacto] = useState<'tecnico' | 'cliente'>('tecnico');
  const [sugerenciasVisibles, setSugerenciasVisibles] = useState(false);
  const [equipos, setEquipos] = useState<EquipoForm[]>([equipoVacio()]);
  const [escaneandoImei, setEscaneandoImei] = useState<number | null>(null);

  // Pestaña Garantías
  const [garantiasList, setGarantiasList] = useState<Garantia[]>([]);
  const [folioGarantia, setFolioGarantia] = useState('');
  const [servicioIdGarantia, setServicioIdGarantia] = useState<string | null>(null);
  const [descripcionGarantia, setDescripcionGarantia] = useState('');
  const [sugerenciasFolioVisibles, setSugerenciasFolioVisibles] = useState(false);

  useEffect(() => {
    fetchServicios();
    fetchClientes();
    fetchGarantias();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroFecha, filtroEstado]);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select(`*, clientes ( id, nombre, telefono, tipo_contacto )`)
      .order('created_at', { ascending: false });

    if (!error && data) setServicios(data);
    setLoading(false);
  };

  const fetchGarantias = async () => {
    const { data, error } = await supabase
      .from('garantias')
      .select('id, folio, descripcion, created_at, resuelta, resuelta_at, nota_resolucion, monto_devuelto, servicios ( id, modelo_equipo, tipo_trabajo, cliente_id, clientes ( id, nombre, telefono ) )')
      .order('created_at', { ascending: false });
    if (!error && data) setGarantiasList(data as unknown as Garantia[]);
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, tipo_contacto')
      .order('nombre');
    if (!error && data) setClientesList(data);
  };

  // ---- Autocompletado ----
  const sugerencias = nombreCliente.trim()
    ? clientesList.filter((c) =>
        c.nombre.toLowerCase().includes(nombreCliente.trim().toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSeleccionarCliente = (c: Cliente) => {
    setClienteIdAsociado(c.id);
    setNombreCliente(c.nombre);
    setTelefonoCliente(c.telefono || '');
    setTipoContacto((c.tipo_contacto as 'tecnico' | 'cliente') || 'tecnico');
    setSugerenciasVisibles(false);
  };

  // ---- Autocompletado de folio (pestaña Garantías) ----
  const sugerenciasFolio = folioGarantia.trim()
    ? servicios.filter((s) => s.folio?.toLowerCase().includes(folioGarantia.trim().toLowerCase())).slice(0, 6)
    : [];

  const handleSeleccionarFolio = (s: Servicio) => {
    setServicioIdGarantia(s.id);
    setFolioGarantia(s.folio || '');
    setSugerenciasFolioVisibles(false);
  };

  const handleCambiarNombre = (valor: string) => {
    setNombreCliente(valor);
    setClienteIdAsociado(null);
    setSugerenciasVisibles(true);
  };

  const handleAgregarEquipo = () => {
    setEquipos((prev) => [...prev, equipoVacio()]);
  };

  const handleQuitarEquipo = (idx: number) => {
    setEquipos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCambiarEquipo = (idx: number, campo: keyof EquipoForm, valor: string) => {
    setEquipos((prev) => prev.map((eq, i) => (i === idx ? { ...eq, [campo]: valor } : eq)));
  };

  // Lee el IMEI/serie de una foto con OCR (Tesseract.js, 100% en el navegador,
  // no toca el servidor). Se carga solo al usarse, para no pesar la carga
  // inicial de la página. El resultado se deja en el campo para revisar, no
  // se guarda solo — el OCR se puede equivocar en un dígito.
  const handleEscanearImei = async (idx: number, file: File) => {
    setEscaneandoImei(idx);
    try {
      const { default: Tesseract } = await import('tesseract.js');
      const { data } = await Tesseract.recognize(file, 'eng');
      const secuencias = data.text.match(/\d[\d\s-]{8,}\d/g) || [];
      const mejor = secuencias
        .map((s) => s.replace(/[^0-9]/g, ''))
        .sort((a, b) => b.length - a.length)[0];
      if (mejor) {
        handleCambiarEquipo(idx, 'imeiSerie', mejor);
      } else {
        const textoLeido = data.text.trim();
        alert(
          `No encontré una secuencia larga de números.\n\nEsto fue lo que se leyó de la foto:\n"${textoLeido || '(no se reconoció texto)'}"\n\nPrueba con más luz/de más cerca, o escríbelo a mano.`
        );
      }
    } catch (err) {
      alert(`Error al leer la imagen: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEscaneandoImei(null);
    }
  };

  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente) return;

    if (editandoId) {
      const eq = equipos[0];
      if (!eq.modelo || !eq.monto) return;
      if (eq.tipoTrabajo === 'Otros' && !eq.tipoTrabajoOtro.trim()) {
        alert('Escribe el tipo de servicio en "Otros"');
        return;
      }
      const tipoTrabajoFinal = eq.tipoTrabajo === 'Otros' ? eq.tipoTrabajoOtro.trim() : eq.tipoTrabajo;

      if (clienteIdAsociado) {
        await supabase
          .from('clientes')
          .update({ nombre: nombreCliente, telefono: telefonoCliente || null, tipo_contacto: tipoContacto })
          .eq('id', clienteIdAsociado);
      }

      const { error: servicioError } = await supabase
        .from('servicios')
        .update({
          modelo_equipo: eq.modelo,
          imei_serie: eq.imeiSerie || null,
          tipo_trabajo: tipoTrabajoFinal,
          monto: parseFloat(eq.monto),
          metodo_pago: eq.metodoPago,
        })
        .eq('id', editandoId);

      if (!servicioError) {
        limpiarFormulario();
        fetchServicios();
        fetchClientes();
      } else {
        alert('Error al actualizar el servicio');
      }
      return;
    }

    // Alta nueva: puede traer varios equipos del mismo cliente en un solo envío.
    const equiposValidos = equipos.filter((eq) => eq.modelo.trim() !== '' || eq.monto.trim() !== '');
    if (equiposValidos.length === 0) return;
    for (const eq of equiposValidos) {
      if (!eq.modelo || !eq.monto) {
        alert('Cada equipo necesita al menos el modelo y el monto.');
        return;
      }
      if (eq.tipoTrabajo === 'Otros' && !eq.tipoTrabajoOtro.trim()) {
        alert('Escribe el tipo de servicio en "Otros"');
        return;
      }
    }

    let clienteId = clienteIdAsociado;
    if (!clienteId) {
      const existente = clientesList.find(
        (c) => c.nombre.trim().toLowerCase() === nombreCliente.trim().toLowerCase()
      );
      if (existente) {
        clienteId = existente.id;
      } else {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .insert([{ nombre: nombreCliente, telefono: telefonoCliente || null, tipo_contacto: tipoContacto }])
          .select()
          .single();

        if (clienteError || !clienteData) {
          alert('Error al registrar el cliente');
          return;
        }
        clienteId = clienteData.id;
      }
    }

    // Genera folios en secuencia dentro del mismo lote (dos equipos del mismo
    // tipo en un envío no pueden compartir número de folio).
    const contadorFolios: { [prefijo: string]: number } = {};
    const siguienteFolio = (tipo: string) => {
      const prefijo = getPrefijo(tipo);
      if (contadorFolios[prefijo] === undefined) {
        const actual = generarFolio(tipo, servicios);
        contadorFolios[prefijo] = parseInt(actual.slice(prefijo.length), 10) - 1;
      }
      contadorFolios[prefijo] += 1;
      return `${prefijo}${contadorFolios[prefijo]}`;
    };

    const filas = equiposValidos.map((eq) => {
      const tipoTrabajoFinal = eq.tipoTrabajo === 'Otros' ? eq.tipoTrabajoOtro.trim() : eq.tipoTrabajo;
      return {
        cliente_id: clienteId,
        modelo_equipo: eq.modelo,
        imei_serie: eq.imeiSerie || null,
        tipo_trabajo: tipoTrabajoFinal,
        folio: siguienteFolio(tipoTrabajoFinal),
        monto: parseFloat(eq.monto),
        estado: 'PENDIENTE',
        metodo_pago: eq.metodoPago,
      };
    });

    const { error: servicioError } = await supabase.from('servicios').insert(filas);

    if (!servicioError) {
      limpiarFormulario();
      fetchServicios();
      fetchClientes();
    } else {
      alert('Error al registrar el servicio');
    }
  };

  const handleIniciarEdicion = (s: Servicio) => {
    setEditandoId(s.id);
    setClienteIdAsociado(s.clientes?.id || null);
    setNombreCliente(s.clientes?.nombre || '');
    setTelefonoCliente(s.clientes?.telefono || '');
    setTipoContacto((s.clientes?.tipo_contacto as 'tecnico' | 'cliente') || 'tecnico');
    setEquipos([
      {
        modelo: s.modelo_equipo,
        imeiSerie: s.imei_serie || '',
        tipoTrabajo: TIPOS_ESTANDAR.includes(s.tipo_trabajo) ? s.tipo_trabajo : 'Otros',
        tipoTrabajoOtro: TIPOS_ESTANDAR.includes(s.tipo_trabajo) ? '' : s.tipo_trabajo,
        monto: s.monto.toString(),
        metodoPago: s.metodo_pago || 'Efectivo',
      },
    ]);
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setClienteIdAsociado(null);
    setNombreCliente('');
    setTelefonoCliente('');
    setTipoContacto('tecnico');
    setEquipos([equipoVacio()]);
  };

  const limpiarNumero = (tel: string) => tel.replace(/\D/g, '');

  const handleCambiarEstado = async (id: string, estadoActual: string, nuevoEstado: string) => {
    if (nuevoEstado === estadoActual) return;

    const servicioActual = servicios.find((s) => s.id === id);
    const tieneWhatsApp = !!servicioActual?.clientes?.telefono;
    let ventanaWhatsApp: Window | null = null;
    let avisarWhatsApp = false;

    if (nuevoEstado === 'COMPLETADO' && tieneWhatsApp) {
      const otrosPendientes = servicios.filter(
        (s) =>
          s.id !== id &&
          s.clientes?.id &&
          s.clientes.id === servicioActual?.clientes?.id &&
          !['COMPLETADO', 'ENTREGADO', 'NO REALIZADO'].includes(s.estado)
      ).length;
      avisarWhatsApp = window.confirm(
        otrosPendientes > 0
          ? `Este cliente tiene ${otrosPendientes} equipo(s) más sin completar todavía.\n\n¿Enviar WhatsApp avisando que este equipo ya está listo?`
          : '¿Enviar WhatsApp avisando que el equipo está listo para retirar?'
      );
      if (avisarWhatsApp) ventanaWhatsApp = window.open('', '_blank');
    }

    const cambios: { estado: string; completado_at?: string; entregado_at?: string; pagado?: boolean; pagado_at?: string } = { estado: nuevoEstado };
    if (nuevoEstado === 'COMPLETADO') cambios.completado_at = new Date().toISOString();
    if (nuevoEstado === 'ENTREGADO') {
      // Por defecto se asume pagado al entregar; si no fue así, se destilda
      // manualmente con el botón Pagado/Sin Pagar.
      cambios.entregado_at = new Date().toISOString();
      cambios.pagado = true;
      cambios.pagado_at = cambios.entregado_at;
    }

    const { error } = await supabase.from('servicios').update(cambios).eq('id', id);

    if (error) {
      ventanaWhatsApp?.close();
      alert(`No se pudo cambiar el estado: ${error.message}`);
      return;
    }

    fetchServicios();

    if (avisarWhatsApp && servicioActual && ventanaWhatsApp) {
      const numero = limpiarNumero(servicioActual.clientes?.telefono || '');
      const mensaje = `Hola ${servicioActual.clientes?.nombre || ''}, tu equipo ${servicioActual.modelo_equipo}${servicioActual.folio ? ` (folio ${servicioActual.folio})` : ''} ya está listo. Puedes pasar a retirarlo.`;
      ventanaWhatsApp.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    } else {
      ventanaWhatsApp?.close();
    }
  };

  const handleTogglePagado = async (id: string, pagadoActual: boolean) => {
    const cambios = pagadoActual
      ? { pagado: false, pagado_at: null }
      : { pagado: true, pagado_at: new Date().toISOString() };
    const { error } = await supabase.from('servicios').update(cambios).eq('id', id);
    if (!error) {
      fetchServicios();
    } else {
      alert(`No se pudo actualizar el pago: ${error.message}`);
    }
  };

  const handleMarcarNoRealizado = async (id: string) => {
    if (!window.confirm('¿Marcar este trabajo como NO REALIZADO?')) return;
    const { error } = await supabase.from('servicios').update({ estado: 'NO REALIZADO' }).eq('id', id);
    if (!error) fetchServicios();
  };

  const handleReactivar = async (id: string) => {
    const { error } = await supabase
      .from('servicios')
      .update({ estado: 'PENDIENTE', completado_at: null, entregado_at: null })
      .eq('id', id);
    if (!error) fetchServicios();
  };

  const handleDeleteServicio = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    const { error } = await supabase.from('servicios').delete().eq('id', id);
    if (!error) {
      if (editandoId === id) limpiarFormulario();
      fetchServicios();
    }
  };

  const handleImprimirFolio = (s: Servicio) => {
    const ventana = window.open('', '_blank', 'width=400,height=500');
    if (!ventana) return;
    const fecha = getFechaLocal(s.created_at);
    ventana.document.write(`
      <html>
        <head>
          <title>${s.folio}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              width: 58mm;
              margin: 0;
              padding: 4mm;
              font-family: 'Courier New', monospace;
              text-align: center;
            }
            .folio { font-size: 46px; font-weight: 900; letter-spacing: 3px; margin: 2mm 0; }
            .linea { border-top: 1px dashed #000; margin: 2mm 0; }
            .dato { font-size: 12px; text-align: left; margin: 1mm 0; }
            .dato b { display: inline-block; width: 20mm; }
            .monto { font-size: 18px; font-weight: 900; margin-top: 2mm; }
          </style>
        </head>
        <body>
          <div class="folio">${s.folio}</div>
          <div class="linea"></div>
          <div class="dato"><b>Cliente:</b> ${s.clientes?.nombre || ''}</div>
          <div class="dato"><b>Equipo:</b> ${s.modelo_equipo}</div>
          <div class="dato"><b>Servicio:</b> ${s.tipo_trabajo}</div>
          <div class="dato"><b>Fecha:</b> ${fecha}</div>
          <div class="linea"></div>
          <div class="monto">$${s.monto.toFixed(2)}</div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const limpiarFormularioGarantia = () => {
    setFolioGarantia('');
    setServicioIdGarantia(null);
    setDescripcionGarantia('');
  };

  const handleAgregarGarantia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioGarantia.trim() || !descripcionGarantia.trim()) return;

    let servicioId = servicioIdGarantia;
    if (!servicioId) {
      const match = servicios.find((s) => s.folio?.toLowerCase() === folioGarantia.trim().toLowerCase());
      if (!match) {
        alert('No se encontró ese folio. Selecciónalo de la lista mientras escribes.');
        return;
      }
      servicioId = match.id;
    }

    const { error } = await supabase.from('garantias').insert([
      { servicio_id: servicioId, folio: folioGarantia.trim(), descripcion: descripcionGarantia.trim() },
    ]);

    if (!error) {
      limpiarFormularioGarantia();
      fetchGarantias();
    } else {
      alert(`Error al registrar la garantía: ${error.message}`);
    }
  };

  const handleEliminarGarantia = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de garantía?')) return;
    const { error } = await supabase.from('garantias').delete().eq('id', id);
    if (!error) fetchGarantias();
  };

  const handleResolverGarantia = async (g: Garantia) => {
    if (g.resuelta) {
      // Reabrir: se deja la nota/monto anteriores por si se vuelve a resolver.
      const { error } = await supabase.from('garantias').update({ resuelta: false, resuelta_at: null }).eq('id', g.id);
      if (!error) fetchGarantias();
      else alert(`No se pudo actualizar la garantía: ${error.message}`);
      return;
    }

    const nota = window.prompt('¿Qué se hizo para resolverla? (ej. reparado sin costo, se cambió pieza, se devolvió dinero)');
    if (nota === null) return; // canceló

    let montoDevuelto: number | null = null;
    if (window.confirm('¿Hubo que devolver dinero al cliente?')) {
      const montoTexto = window.prompt('¿Cuánto se devolvió? ($)');
      const parsed = montoTexto ? parseFloat(montoTexto) : NaN;
      if (!isNaN(parsed) && parsed > 0) montoDevuelto = parsed;
    }

    const telefono = g.servicios?.clientes?.telefono;
    let avisarWhatsApp = false;
    let ventanaWhatsApp: Window | null = null;
    if (telefono) {
      avisarWhatsApp = window.confirm('¿Enviar WhatsApp al cliente avisando que su garantía quedó resuelta?');
      if (avisarWhatsApp) ventanaWhatsApp = window.open('', '_blank');
    }

    const cambios = {
      resuelta: true,
      resuelta_at: new Date().toISOString(),
      nota_resolucion: nota.trim() || null,
      monto_devuelto: montoDevuelto,
    };
    const { error } = await supabase.from('garantias').update(cambios).eq('id', g.id);

    if (error) {
      ventanaWhatsApp?.close();
      alert(`No se pudo actualizar la garantía: ${error.message}`);
      return;
    }

    fetchGarantias();

    if (avisarWhatsApp && ventanaWhatsApp) {
      const numero = limpiarNumero(telefono || '');
      const mensaje = `Hola ${g.servicios?.clientes?.nombre || ''}, tu garantía del folio ${g.folio} quedó resuelta. Cualquier cosa, avísanos.`;
      ventanaWhatsApp.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    } else {
      ventanaWhatsApp?.close();
    }
  };

  // Abre el sitio de la operadora en una ventana aparte, angostada y pegada
  // al lado derecho, para poder ver la lista de pendientes al mismo tiempo.
  // En iPhone/Android no hay "ventanas": Safari/Chrome simplemente abren una
  // pestaña nueva y listo, no hay nada que romper.
  const handleAbrirVerificadorImei = (url: string) => {
    const width = 480;
    const height = 720;
    const left = Math.max(0, window.screen.width - width - 20);
    const top = 40;
    window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`);
  };

  const handleCopiarImei = async (id: string, imei: string) => {
    try {
      await navigator.clipboard.writeText(imei);
      setImeiCopiadoId(id);
      setTimeout(() => setImeiCopiadoId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      alert(`No se pudo copiar automáticamente. Cópialo a mano: ${imei}`);
    }
  };

  const handleMarcarImeiEstado = async (id: string, estado: 'limpio' | 'reportado' | 'bloqueado') => {
    const { error } = await supabase.from('servicios').update({ imei_estado: estado }).eq('id', id);
    if (!error) fetchServicios();
    else alert(`No se pudo guardar: ${error.message}`);
  };

  // Todo lo derivado de `servicios` recorre listas potencialmente largas con
  // .filter/.reduce; se memoiza para que escribir en el formulario (que no
  // cambia estos datos) no dispare esos cálculos en cada tecla.
  const serviciosBase = useMemo(() => {
    return servicios.filter((s) => {
      const textoMatch =
        s.modelo_equipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (s.imei_serie && s.imei_serie.toLowerCase().includes(busqueda.toLowerCase())) ||
        (s.folio && s.folio.toLowerCase().includes(busqueda.toLowerCase())) ||
        s.tipo_trabajo.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.clientes?.telefono?.includes(busqueda);

      if (!textoMatch) return false;

      if (filtroFecha === 'hoy') {
        if (getFechaLocal(s.created_at) !== getFechaLocal(new Date())) return false;
      } else if (filtroFecha === 'mes') {
        if (getFechaLocal(s.created_at).slice(0, 7) !== getFechaLocal(new Date()).slice(0, 7)) return false;
      }

      return true;
    });
  }, [servicios, busqueda, filtroFecha]);

  const conteosPorEstado = useMemo(() => {
    const counts: { [estado: string]: number } = {};
    serviciosBase.forEach((s) => {
      counts[s.estado] = (counts[s.estado] || 0) + 1;
    });
    return counts;
  }, [serviciosBase]);

  const serviciosFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return serviciosBase;
    return serviciosBase.filter((s) => s.estado === filtroEstado);
  }, [serviciosBase, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(serviciosFiltrados.length / PAGE_SIZE));
  const serviciosPaginados = serviciosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const hoyStr = getFechaLocal(new Date());
  const mesActualStr = hoyStr.slice(0, 7);

  const {
    cajaHoy,
    cajaSemana,
    cajaMes,
    cajaSemanaPasada,
    cajaMesPasado,
    deltaSemana,
    deltaMes,
    porCobrarTotal,
    flujoPorDiaObj,
    maxFlujoDia,
  } = useMemo(() => {
    // La caja se cuenta por la fecha en que se COBRÓ (pagado_at), no por
    // cuándo se registró el trabajo — si no, un trabajo del lunes cobrado
    // el martes no aparecía en la caja de ningún día.
    const fechaPago = (s: Servicio) => s.pagado_at || s.entregado_at || s.created_at;

    const esDeEstaSemana = (fechaStr: string) => {
      const fecha = new Date(fechaStr);
      const hoy = new Date();
      const diffDays = Math.abs(hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    };

    const esDeSemanaPasada = (fechaStr: string) => {
      const fecha = new Date(fechaStr);
      const hoy = new Date();
      const diffDays = (hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 7 && diffDays <= 14;
    };

    const pagados = servicios.filter((s) => s.pagado);

    const cajaHoy = pagados
      .filter((s) => getFechaLocal(fechaPago(s)) === hoyStr)
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaSemana = pagados
      .filter((s) => esDeEstaSemana(fechaPago(s)))
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaMes = pagados
      .filter((s) => getFechaLocal(fechaPago(s)).slice(0, 7) === mesActualStr)
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaSemanaPasada = pagados
      .filter((s) => esDeSemanaPasada(fechaPago(s)))
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const mesPasadoStr = sumarMeses(mesActualStr, -1);
    const cajaMesPasado = pagados
      .filter((s) => getFechaLocal(fechaPago(s)).slice(0, 7) === mesPasadoStr)
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const deltaSemana = cajaSemana - cajaSemanaPasada;
    const deltaMes = cajaMes - cajaMesPasado;

    // Por Cobrar: total acumulado de todo lo no pagado, sin importar cuándo
    // se registró — no se resetea con los días, solo baja cuando se cobra.
    const porCobrarTotal = servicios
      .filter((s) => !s.pagado && s.estado !== 'NO REALIZADO')
      .reduce((acc, c) => acc + (c.monto || 0), 0);

    const flujoPorDiaObj = pagados.reduce((acc: { [dia: string]: number }, s) => {
      const dia = getDiaSemana(fechaPago(s));
      if (DIAS_SEMANA.includes(dia)) acc[dia] = (acc[dia] || 0) + (s.monto || 0);
      return acc;
    }, {});
    const maxFlujoDia = Math.max(1, ...DIAS_SEMANA.map((d) => flujoPorDiaObj[d] || 0));

    return {
      cajaHoy, cajaSemana, cajaMes, cajaSemanaPasada, cajaMesPasado, deltaSemana, deltaMes,
      porCobrarTotal, flujoPorDiaObj, maxFlujoDia,
    };
  }, [servicios, hoyStr, mesActualStr]);

  // Trabajos "atascados": llevan más de 24h en el taller sin llegar a ENTREGADO.
  const trabajosAtascados = useMemo(() => {
    const enTallerEstados = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO'];
    return servicios.filter((s) => {
      if (!enTallerEstados.includes(s.estado)) return false;
      const horas = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60);
      return horas > 24;
    });
  }, [servicios]);

  // ---- Pestaña IMEI: trabajos con un IMEI real (14-15 dígitos) sin verificar ----
  const imeisPendientes = useMemo(
    () => servicios.filter((s) => pareceImei(s.imei_serie) && (s.imei_estado || 'sin_verificar') === 'sin_verificar'),
    [servicios]
  );

  // ---- Pestaña Clientes: dataset filtrado por periodo + tipo de contacto ----
  const {
    rankingPorDinero,
    rankingPorVisitas,
    rankingPorTipoTrabajo,
    totalClientesUnicos,
    totalTrabajosClientesTab,
    totalDineroClientesTab,
    tiempoPromedioHoras,
  } = useMemo(() => {
    const serviciosClientesTab = servicios.filter((s) => {
      if (filtroFechaClientes === 'hoy' && getFechaLocal(s.created_at) !== hoyStr) return false;
      if (filtroFechaClientes === 'mes' && getFechaLocal(s.created_at).slice(0, 7) !== mesActualStr) return false;
      if (filtroTipoContacto !== 'todos' && (s.clientes?.tipo_contacto || 'tecnico') !== filtroTipoContacto) return false;
      return true;
    });

    const rankingClientesTabObj = serviciosClientesTab.reduce(
      (acc: { [key: string]: { nombre: string; dinero: number; visitas: number } }, curr) => {
        const nombreOriginal = curr.clientes?.nombre || 'General';
        const clave = nombreOriginal.trim().toLowerCase();
        if (!acc[clave]) acc[clave] = { nombre: nombreOriginal.trim(), dinero: 0, visitas: 0 };
        acc[clave].dinero += curr.monto || 0;
        acc[clave].visitas += 1;
        return acc;
      },
      {}
    );
    const rankingPorDinero = Object.values(rankingClientesTabObj).sort((a, b) => b.dinero - a.dinero).slice(0, 8);
    const rankingPorVisitas = Object.values(rankingClientesTabObj).sort((a, b) => b.visitas - a.visitas).slice(0, 8);

    // Tiempo de reparación = desde que se registra hasta que pasa a COMPLETADO.
    const horasReparacion = (s: Servicio) =>
      s.completado_at ? (new Date(s.completado_at).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60) : null;

    const rankingTipoTrabajoObj = serviciosClientesTab.reduce(
      (acc: { [key: string]: { dinero: number; trabajos: number; horasTotales: number; conTiempo: number } }, curr) => {
        const tipo = curr.tipo_trabajo || 'General';
        if (!acc[tipo]) acc[tipo] = { dinero: 0, trabajos: 0, horasTotales: 0, conTiempo: 0 };
        acc[tipo].dinero += curr.monto || 0;
        acc[tipo].trabajos += 1;
        const horas = horasReparacion(curr);
        if (horas !== null) {
          acc[tipo].horasTotales += horas;
          acc[tipo].conTiempo += 1;
        }
        return acc;
      },
      {}
    );
    const rankingPorTipoTrabajo = Object.entries(rankingTipoTrabajoObj)
      .sort((a, b) => b[1].trabajos - a[1].trabajos)
      .slice(0, 8)
      .map(([tipo, data]) => ({
        tipo,
        dinero: data.dinero,
        trabajos: data.trabajos,
        avgHoras: data.conTiempo > 0 ? data.horasTotales / data.conTiempo : null,
      }));

    const conTiempoGlobal = serviciosClientesTab.map(horasReparacion).filter((h): h is number => h !== null);
    const tiempoPromedioHoras =
      conTiempoGlobal.length > 0 ? conTiempoGlobal.reduce((a, b) => a + b, 0) / conTiempoGlobal.length : null;

    return {
      rankingPorDinero,
      rankingPorVisitas,
      rankingPorTipoTrabajo,
      totalClientesUnicos: Object.keys(rankingClientesTabObj).length,
      totalTrabajosClientesTab: serviciosClientesTab.length,
      totalDineroClientesTab: serviciosClientesTab.reduce((acc, s) => acc + (s.monto || 0), 0),
      tiempoPromedioHoras,
    };
  }, [servicios, filtroFechaClientes, filtroTipoContacto, hoyStr, mesActualStr]);

  // ---- Pestaña Garantías: intensidad de color según cuántas trae ese
  // cliente en el mes (1ra = suave, va subiendo hasta rojo). ----
  const NIVELES_GARANTIA = [
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'bg-red-600/20 text-red-300 border-red-500/50 shadow-[0_0_8px_rgba(220,38,38,0.4)]',
  ];

  const garantiasConIntensidad = useMemo(() => {
    const ordenadasAsc = [...garantiasList].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const contadorPorClienteMes: { [clave: string]: number } = {};
    const conOrdinal = ordenadasAsc.map((g) => {
      const clienteId = g.servicios?.clientes?.id || g.servicios?.cliente_id || 'sin-cliente';
      const mes = g.created_at.slice(0, 7);
      const clave = `${clienteId}-${mes}`;
      contadorPorClienteMes[clave] = (contadorPorClienteMes[clave] || 0) + 1;
      const ordinal = contadorPorClienteMes[clave];
      return { ...g, ordinal, colorClasses: NIVELES_GARANTIA[Math.min(ordinal, NIVELES_GARANTIA.length) - 1] };
    });
    return conOrdinal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [garantiasList]);

  const rankingClientesGarantiasMes = useMemo(() => {
    const mesActual = hoyStr.slice(0, 7);
    const obj: { [nombre: string]: number } = {};
    garantiasList.forEach((g) => {
      if (g.created_at.slice(0, 7) !== mesActual) return;
      const nombre = g.servicios?.clientes?.nombre || 'Sin cliente';
      obj[nombre] = (obj[nombre] || 0) + 1;
    });
    return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [garantiasList, hoyStr]);

  const totalDevueltoGarantias = useMemo(
    () => garantiasList.reduce((acc, g) => acc + (g.monto_devuelto || 0), 0),
    [garantiasList]
  );

  const getBadgeColor = (estado: string, createdAt?: string) => {
    if (estado === 'PENDIENTE' && createdAt) {
      const horas = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
      if (horas < 1) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
      if (horas < 2) return 'bg-yellow-500/40 text-yellow-100 border-yellow-500/60';
      if (horas < 6) return 'bg-orange-500/60 text-orange-50 border-orange-500/70';
      if (horas < 24) return 'bg-orange-600 text-white border-orange-400 shadow-[0_0_8px_rgba(234,88,12,0.5)]';
      return 'bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.6)]';
    }
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'EN PROCESO': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'PAUSADO': return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
      case 'COMPLETADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ENTREGADO': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'NO REALIZADO': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Menú de estado hecho a mano en vez de un <select> nativo: en iPhone un
  // <select> abre el picker de rueda del sistema, que ignora por completo
  // el diseño de la app. Esto se ve igual (y se controla igual) en iOS y en
  // escritorio. `alinear` evita que el menú se salga de la pantalla según
  // dónde esté el botón (tarjeta móvil = derecha, tabla = izquierda).
  const renderEstadoControl = (s: Servicio, alinear: 'left' | 'right' = 'left') => {
    const badge = (
      <span className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-sm ${getBadgeColor(s.estado, s.created_at)}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(s.estado)}`}></span>
        {s.estado}
      </span>
    );

    if (s.estado === 'NO REALIZADO') return badge;

    const abierto = estadoMenuAbierto === s.id;

    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setEstadoMenuAbierto(abierto ? null : s.id)}
          className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm ${getBadgeColor(s.estado, s.created_at)}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(s.estado)}`}></span>
          {s.estado}
          <span className="text-[8px] opacity-70">▾</span>
        </button>
        {abierto && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setEstadoMenuAbierto(null)}></div>
            <div className={`absolute z-40 mt-1.5 ${alinear === 'right' ? 'right-0' : 'left-0'} bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-2xl min-w-[150px]`}>
              {ESTADOS_PROGRESO.filter((op) => op !== s.estado).map((op) => (
                <button
                  type="button"
                  key={op}
                  onClick={() => {
                    handleCambiarEstado(s.id, s.estado, op);
                    setEstadoMenuAbierto(null);
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-800/80 active:bg-slate-800 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${getDotColor(op)}`}></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">{op}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const fmt = (valor: number) => (mostrarMontos ? `$${valor.toFixed(2)}` : '••••••');

  // Paleta de marca: "frío" (cian/azul, el look por defecto) vs "cálido"
  // (ámbar/rosa/fucsia sobre negro tibio). Los colores semánticos (verde=caja,
  // ámbar=por cobrar, rosa=peligro, badges de estado) NO cambian con el tema.
  const T = temaCalido
    ? {
        bgPage: 'bg-[#170B08]',
        blob1: 'bg-orange-500/10',
        blob2: 'bg-rose-600/10',
        headerBorder: 'border-amber-900/40',
        titulo: 'from-amber-400 via-orange-400 to-rose-400',
        tituloGlow: 'drop-shadow-[0_0_15px_rgba(251,146,60,0.3)]',
        subtitulo: 'text-amber-400/70',
        navBg: 'bg-[#1f130a]/95',
        tabActivo: 'bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 shadow-[0_0_15px_rgba(251,146,60,0.4)]',
        borde: 'border-amber-500/20',
        borde2: 'border-rose-500/20',
        borde3: 'border-fuchsia-500/20',
        texto: 'text-amber-300',
        texto2: 'text-rose-300',
        texto3: 'text-fuchsia-300',
        fuerte: 'text-amber-400',
        fuerte2: 'text-rose-400',
        fuerte3: 'text-fuchsia-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        dot2: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
        focoInput: 'focus:border-amber-400',
        toggleActivo: 'bg-amber-500 text-slate-950',
        filtroActivo: 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        submit: 'bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
        sugerenciaBorde: 'border-amber-500/30',
        sugerenciaHover: 'hover:bg-amber-500/10',
        filaMovilResaltada: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        filaEscritorioResaltada: 'bg-amber-950/20 border border-amber-500/30',
        accionEditar: 'text-amber-400 bg-amber-500/10',
        accionEditarHover: 'hover:text-amber-300 hover:bg-amber-500/20',
        barraGradiente: 'from-amber-500 to-rose-500',
        searchBorde: 'border-amber-500/30',
        financeCard2: 'bg-gradient-to-br from-slate-900/90 to-rose-950/40 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.07)]',
      }
    : {
        bgPage: 'bg-[#070B19]',
        blob1: 'bg-cyan-500/10',
        blob2: 'bg-blue-600/10',
        headerBorder: 'border-cyan-900/40',
        titulo: 'from-cyan-400 via-blue-400 to-indigo-400',
        tituloGlow: 'drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]',
        subtitulo: 'text-cyan-400/70',
        navBg: 'bg-[#0b1024]/95',
        tabActivo: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
        borde: 'border-cyan-500/20',
        borde2: 'border-blue-500/20',
        borde3: 'border-indigo-500/20',
        texto: 'text-cyan-300',
        texto2: 'text-blue-300',
        texto3: 'text-indigo-300',
        fuerte: 'text-cyan-400',
        fuerte2: 'text-blue-400',
        fuerte3: 'text-indigo-400',
        dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
        dot2: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
        focoInput: 'focus:border-cyan-400',
        toggleActivo: 'bg-cyan-500 text-slate-950',
        filtroActivo: 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]',
        submit: 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
        sugerenciaBorde: 'border-cyan-500/30',
        sugerenciaHover: 'hover:bg-cyan-500/10',
        filaMovilResaltada: 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]',
        filaEscritorioResaltada: 'bg-cyan-950/20 border border-cyan-500/30',
        accionEditar: 'text-cyan-400 bg-cyan-500/10',
        accionEditarHover: 'hover:text-cyan-300 hover:bg-cyan-500/20',
        barraGradiente: 'from-cyan-500 to-blue-500',
        searchBorde: 'border-cyan-500/30',
        financeCard2: 'bg-gradient-to-br from-slate-900/90 to-blue-950/40 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.07)]',
      };

  const botonFiltro = (activo: boolean) =>
    `py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activo ? T.filtroActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`;

  const escaparCSV = (valor: string | number | undefined | null) => {
    const texto = String(valor ?? '');
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const handleExportarCSV = () => {
    const columnas = ['Folio', 'Cliente', 'Tipo Contacto', 'Equipo', 'IMEI/Serie', 'Servicio', 'Estado', 'Pagado', 'Metodo Pago', 'Monto', 'Fecha'];
    const filas = serviciosFiltrados.map((s) => [
      s.folio,
      s.clientes?.nombre || 'General',
      s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico',
      s.modelo_equipo,
      s.imei_serie,
      s.tipo_trabajo,
      s.estado,
      s.pagado ? 'Si' : 'No',
      s.metodo_pago,
      s.monto.toFixed(2),
      getFechaLocal(s.created_at),
    ]);
    const csv = [columnas, ...filas].map((fila) => fila.map(escaparCSV).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mega-unlock-historial-${hoyStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImprimirReporte = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const totalDinero = serviciosFiltrados.reduce((acc, s) => acc + (s.monto || 0), 0);
    const filasHtml = serviciosFiltrados
      .map(
        (s) => `
        <tr>
          <td>${s.folio || ''}</td>
          <td>${s.clientes?.nombre || 'General'}</td>
          <td>${s.modelo_equipo}</td>
          <td>${s.tipo_trabajo}</td>
          <td>${s.estado}</td>
          <td>${s.pagado ? 'Pagado' : 'Sin pagar'}</td>
          <td style="text-align:right">$${s.monto.toFixed(2)}</td>
          <td>${getFechaLocal(s.created_at)}</td>
        </tr>`
      )
      .join('');
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte Mega Unlock - ${hoyStr}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 0; }
            p.sub { color: #555; font-size: 12px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #eee; }
            .totales { margin-top: 12px; font-weight: bold; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>MEGA UNLOCK — Reporte de Trabajos</h1>
          <p class="sub">Generado el ${hoyStr} · ${serviciosFiltrados.length} registros</p>
          <table>
            <thead>
              <tr><th>Folio</th><th>Cliente</th><th>Equipo</th><th>Servicio</th><th>Estado</th><th>Pagado</th><th>Monto</th><th>Fecha</th></tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
          <div class="totales">Total: $${totalDinero.toFixed(2)}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    // Se añadió p-4 en móvil y padding-bottom especial para el Safe Area del iPhone
    <div className={`min-h-screen ${T.bgPage} text-slate-100 p-4 md:p-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative overflow-hidden transition-colors`}>
      <div className={`absolute top-0 left-1/4 w-96 h-96 ${T.blob1} rounded-full blur-3xl pointer-events-none`}></div>
      <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${T.blob2} rounded-full blur-3xl pointer-events-none`}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Cabecera */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b ${T.headerBorder} pb-5`}>
          <div>
            <h1 className={`text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${T.titulo} ${T.tituloGlow}`}>
              MEGA UNLOCK MANAGER
            </h1>
            <p className={`text-xs uppercase tracking-widest ${T.subtitulo} font-semibold mt-1`}>
              // Neural Software & Hardware Terminal
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => setTemaCalido((v) => !v)}
              className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              {temaCalido ? '🎨 Tema Frío' : '🎨 Tema Cálido'}
            </button>
            <button
              onClick={() => setMostrarMontos((v) => !v)}
              className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              {mostrarMontos ? '🙈 Ocultar' : '👁 Ver montos'}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Navegación de pestañas (sticky, con scroll horizontal en iPhone en vez de achicar los botones) */}
        <div className={`sticky top-[calc(env(safe-area-inset-top))] z-30 flex gap-2 mb-8 ${T.navBg} backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl w-full sm:w-fit shadow-lg transition-colors overflow-x-auto`}>
          {(['inicio', 'clientes', 'finanzas', 'garantias', 'imei'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setVista(tab)}
              className={`flex-shrink-0 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                vista === tab ? T.tabActivo : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'inicio' ? '🏠 Inicio' : tab === 'clientes' ? '👥 Clientes' : tab === 'finanzas' ? '💰 Finanzas' : tab === 'garantias' ? '🛡️ Garantías' : '📡 IMEI'}
            </button>
          ))}
        </div>

        {/* ===================== PESTAÑA: INICIO ===================== */}
        {vista === 'inicio' && (
          <>
            {/* Alerta de trabajos atascados */}
            {trabajosAtascados.length > 0 && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-rose-400 font-black text-sm">⚠️ {trabajosAtascados.length} trabajo{trabajosAtascados.length > 1 ? 's' : ''} lleva{trabajosAtascados.length > 1 ? 'n' : ''} más de 24h sin entregarse</span>
                <span className="text-rose-300/70 text-xs truncate">
                  {trabajosAtascados.slice(0, 3).map((s) => s.folio || s.modelo_equipo).join(' · ')}
                  {trabajosAtascados.length > 3 ? ` · +${trabajosAtascados.length - 3} más` : ''}
                </span>
              </div>
            )}

            {/* Flujo de Hoy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Caja de Hoy</p>
                <span className="font-black text-emerald-300 text-2xl">{fmt(cajaHoy)}</span>
              </div>
              <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Por Cobrar (Total)</p>
                <span className="font-black text-amber-300 text-2xl">{fmt(porCobrarTotal)}</span>
              </div>
            </div>

            {/* Contenido Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Formulario */}
              <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit transition-colors`}>
                <div className="flex justify-between items-center mb-5">
                  <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
                    <span className={`w-2 h-2 rounded-full ${T.dot}`}></span>
                    {editandoId ? 'Modificar Registro' : 'Registrar Trabajo'}
                  </h2>
                  {editandoId && (
                    <button onClick={limpiarFormulario} className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-slate-700 transition-colors">Cancelar</button>
                  )}
                </div>

                <form onSubmit={handleGuardarServicio} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de contacto</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setTipoContacto('tecnico')} className={`py-2.5 text-xs font-bold rounded-xl transition-all ${tipoContacto === 'tecnico' ? T.toggleActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Técnico</button>
                      <button type="button" onClick={() => setTipoContacto('cliente')} className={`py-2.5 text-xs font-bold rounded-xl transition-all ${tipoContacto === 'cliente' ? T.toggleActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Cliente normal</button>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Cliente/Técnico</label>
                    <input
                      type="text"
                      value={nombreCliente}
                      onChange={(e) => handleCambiarNombre(e.target.value)}
                      onFocus={() => setSugerenciasVisibles(true)}
                      onBlur={() => setTimeout(() => setSugerenciasVisibles(false), 150)}
                      required
                      autoComplete="off"
                      placeholder="Ej. Carlos / Willy"
                      // iOS Safari zoom fix: text-base en móviles
                      className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                    />
                    {sugerenciasVisibles && sugerencias.length > 0 && (
                      <div className={`absolute z-20 mt-1 w-full bg-slate-950 border ${T.sugerenciaBorde} rounded-xl overflow-hidden shadow-xl`}>
                        {sugerencias.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleSeleccionarCliente(c)}
                            className={`w-full text-left px-4 py-3 text-sm text-slate-200 ${T.sugerenciaHover} transition-colors flex justify-between items-center`}
                          >
                            <span>{c.nombre}</span>
                            <span className="text-xs text-slate-500">{c.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {clienteIdAsociado && (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ Cliente existente seleccionado</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp (Opcional)</label>
                    <input
                      type="tel" // iOS teclado numérico
                      value={telefonoCliente}
                      onChange={(e) => setTelefonoCliente(e.target.value)}
                      placeholder="Ej. +56912345678"
                      className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                    />
                  </div>
                  {equipos.map((eq, idx) => (
                    <div key={idx} className="border border-slate-800 rounded-xl p-3 space-y-3 relative">
                      {equipos.length > 1 && (
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipo {idx + 1}</p>
                          <button type="button" onClick={() => handleQuitarEquipo(idx)} className="text-rose-400 hover:text-rose-300 text-xs font-bold">✕ Quitar</button>
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Modelo del Equipo</label>
                        <input
                          type="text"
                          value={eq.modelo}
                          onChange={(e) => handleCambiarEquipo(idx, 'modelo', e.target.value)}
                          required={idx === 0}
                          placeholder="Ej. Xiaomi Redmi Note 12"
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">IMEI o N° de Serie (S/N)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={eq.imeiSerie}
                            onChange={(e) => handleCambiarEquipo(idx, 'imeiSerie', e.target.value)}
                            placeholder="Ej. 864521049382101"
                            className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all font-mono`}
                          />
                          <label
                            title="Escanear IMEI con la cámara"
                            className="flex-shrink-0 flex items-center justify-center w-12 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer active:bg-slate-800 transition-all"
                          >
                            {escaneandoImei === idx ? (
                              <span className="text-xs animate-pulse">⏳</span>
                            ) : (
                              <span className="text-lg">📷</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              disabled={escaneandoImei !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) handleEscanearImei(idx, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Servicio</label>
                        <select
                          value={eq.tipoTrabajo}
                          onChange={(e) => handleCambiarEquipo(idx, 'tipoTrabajo', e.target.value)}
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                        >
                          <option value="Cuenta Mi">Cuenta Mi</option>
                          <option value="Reparación IMEI">Reparación IMEI</option>
                          <option value="FRP">FRP</option>
                          <option value="Desbloqueo Red">Desbloqueo Red</option>
                          <option value="iCloud">iCloud</option>
                          <option value="Software General">Software General</option>
                          <option value="Otros">Otros</option>
                        </select>
                        {eq.tipoTrabajo === 'Otros' && (
                          <input
                            type="text"
                            value={eq.tipoTrabajoOtro}
                            onChange={(e) => handleCambiarEquipo(idx, 'tipoTrabajoOtro', e.target.value)}
                            placeholder="Escribe el tipo de servicio"
                            className={`w-full mt-2 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monto ($)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={eq.monto}
                          onChange={(e) => handleCambiarEquipo(idx, 'monto', e.target.value)}
                          required={idx === 0}
                          placeholder="0.00"
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Método de Pago</label>
                        <select
                          value={eq.metodoPago}
                          onChange={(e) => handleCambiarEquipo(idx, 'metodoPago', e.target.value)}
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta">Tarjeta</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {!editandoId && (
                    <button
                      type="button"
                      onClick={handleAgregarEquipo}
                      className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-dashed border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
                    >
                      + Agregar otro equipo (mismo cliente)
                    </button>
                  )}
                  <button type="submit" className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all mt-2 ${editandoId ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : T.submit}`}>
                    {editandoId ? 'Actualizar Cambios' : 'Guardar Servicio'}
                  </button>
                </form>
              </div>

              {/* Tabla / Lista de Registros */}
              <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                  <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
                    <span className={`w-2 h-2 rounded-full ${T.dot2}`}></span>
                    Historial de Trabajos
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="grid grid-cols-3 gap-1.5 w-full sm:w-44">
                      <button onClick={() => setFiltroFecha('todos')} className={botonFiltro(filtroFecha === 'todos')}>Todos</button>
                      <button onClick={() => setFiltroFecha('hoy')} className={botonFiltro(filtroFecha === 'hoy')}>Hoy</button>
                      <button onClick={() => setFiltroFecha('mes')} className={botonFiltro(filtroFecha === 'mes')}>Mes</button>
                    </div>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="🔍 Buscar folio, cliente, IMEI..."
                      className={`w-full sm:w-72 bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                    />
                    <div className="flex gap-1.5">
                      <button onClick={handleExportarCSV} title="Exportar a Excel/CSV" className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all whitespace-nowrap">⬇️ CSV</button>
                      <button onClick={handleImprimirReporte} title="Imprimir o guardar como PDF" className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all whitespace-nowrap">🖨️ PDF</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {(['todos', 'PENDIENTE', 'EN PROCESO', 'PAUSADO', 'COMPLETADO', 'ENTREGADO', 'NO REALIZADO'] as const).map((est) => {
                    const cantidad = est === 'todos' ? serviciosBase.length : conteosPorEstado[est] || 0;
                    const activo = filtroEstado === est;
                    return (
                      <button
                        key={est}
                        onClick={() => setFiltroEstado(est)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          activo ? T.filtroActivo + ' border-transparent' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {est === 'todos' ? 'Todos' : est} ({cantidad})
                      </button>
                    );
                  })}
                </div>

                {loading ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Cargando base de datos...</p>
                ) : serviciosFiltrados.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No se encontraron registros que coincidan con la búsqueda.</p>
                ) : (
                  <div className="w-full">

                    {/* VISTA MÓVIL (Tarjetas - Optimizadas para iPhone) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                      {serviciosPaginados.map((s) => (
                        <div key={s.id} className={`p-4 rounded-2xl bg-slate-950/60 border ${editandoId === s.id ? T.filaMovilResaltada : 'border-slate-800'} flex flex-col gap-3 relative`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-white text-base">
                                {s.folio && <span className={`${T.fuerte}/70 font-mono text-xs mr-2`}>{s.folio}</span>}
                                {s.clientes?.nombre || 'General'}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">{getFechaLocal(s.created_at)}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-black ${T.fuerte} text-lg`}>{fmt(s.monto)}</div>
                              <div className={`text-[10px] uppercase ${T.fuerte}/70 mt-1`}>{s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}</div>
                            </div>
                          </div>

                          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                            <span className="text-slate-200 block font-semibold text-sm mb-1">{s.modelo_equipo}</span>
                            {s.imei_serie && (
                              <span className={`text-[11px] ${T.fuerte}/80 font-mono tracking-tight block mb-2`}>
                                {s.imei_serie}
                                {getImeiWarning(s.imei_estado) && (
                                  <span title={getImeiWarning(s.imei_estado)!.texto} className={`ml-1.5 ${getImeiWarning(s.imei_estado)!.clase}`}>
                                    {getImeiWarning(s.imei_estado)!.icono}
                                  </span>
                                )}
                              </span>
                            )}
                            <div className={`${T.texto} font-medium text-sm flex items-center justify-between gap-2`}>
                              <div className="flex flex-col">
                                <span>{s.tipo_trabajo}</span>
                                {s.metodo_pago && <span className="text-[10px] text-slate-500">{s.metodo_pago}</span>}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                {renderEstadoControl(s, 'right')}
                                <button onClick={() => handleTogglePagado(s.id, s.pagado)} className={`border px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${s.pagado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-400 border-slate-700'}`}>
                                  {s.pagado ? '💰 Pagado' : 'Sin Pagar'}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-1">
                            <button onClick={() => handleIniciarEdicion(s)} className={`flex-1 ${T.accionEditar} py-2.5 rounded-xl text-xs font-semibold`}>✏️ Editar</button>
                            {s.folio && (
                              <button onClick={() => handleImprimirFolio(s)} className="flex-1 text-slate-300 bg-slate-700/30 py-2.5 rounded-xl text-xs font-semibold">🖨️ Ticket</button>
                            )}
                            {s.estado === 'NO REALIZADO' ? (
                              <button onClick={() => handleReactivar(s.id)} className="flex-1 text-amber-400 bg-amber-500/10 py-2.5 rounded-xl text-xs font-semibold">↺ Activar</button>
                            ) : s.estado !== 'ENTREGADO' && (
                              <button onClick={() => handleMarcarNoRealizado(s.id)} className="flex-1 text-orange-400 bg-orange-500/10 py-2.5 rounded-xl text-xs font-semibold">✕ Canc</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* VISTA ESCRITORIO (Tabla Original - Mac/PC) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-3">Cliente / Fecha</th>
                            <th className="py-3 px-3">Equipo / IMEI</th>
                            <th className="py-3 px-3">Servicio</th>
                            <th className="py-3 px-3">Estado</th>
                            <th className="py-3 px-3">Pagado</th>
                            <th className="py-3 px-3 text-right">Monto</th>
                            <th className="py-3 px-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {serviciosPaginados.map((s) => (
                            <tr key={s.id} className={`hover:bg-slate-950/40 transition-colors ${editandoId === s.id ? T.filaEscritorioResaltada : ''}`}>
                              <td className="py-3.5 px-3 font-medium">
                                <span className="text-white block">{s.clientes?.nombre || 'General'}</span>
                                <span className="block text-[10px] text-slate-400">{getFechaLocal(s.created_at)}</span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="text-slate-200 block font-semibold">{s.modelo_equipo}</span>
                                {s.imei_serie && (
                                  <span className={`text-[10px] ${T.fuerte}/80 font-mono tracking-tight block`}>
                                    {s.imei_serie}
                                    {getImeiWarning(s.imei_estado) && (
                                      <span title={getImeiWarning(s.imei_estado)!.texto} className={`ml-1.5 ${getImeiWarning(s.imei_estado)!.clase}`}>
                                        {getImeiWarning(s.imei_estado)!.icono}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className={`py-3.5 px-3 ${T.texto} font-medium`}>
                                {s.tipo_trabajo}
                                {s.metodo_pago && <span className="block text-[10px] text-slate-500">{s.metodo_pago}</span>}
                              </td>
                              <td className="py-3.5 px-3">
                                {renderEstadoControl(s, 'left')}
                              </td>
                              <td className="py-3.5 px-3">
                                <button onClick={() => handleTogglePagado(s.id, s.pagado)} title="Haz clic para marcar pagado/sin pagar" className={`border px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${s.pagado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-400 border-slate-700'}`}>
                                  {s.pagado ? '💰 Pagado' : 'Sin Pagar'}
                                </button>
                              </td>
                              <td className={`py-3.5 px-3 text-right font-black ${T.fuerte}`}>{fmt(s.monto)}</td>
                              <td className="py-3.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {s.folio && (
                                    <span className={`${T.fuerte}/70 font-mono text-[10px] mr-0.5`}>{s.folio}</span>
                                  )}
                                  <button onClick={() => handleIniciarEdicion(s)} title="Editar registro" className={`${T.accionEditar} ${T.accionEditarHover} px-2 py-1 rounded-lg text-xs font-semibold transition-colors`}>✏️</button>
                                  {s.folio && (
                                    <button onClick={() => handleImprimirFolio(s)} title="Imprimir folio" className="text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">🖨️</button>
                                  )}
                                  {s.estado === 'NO REALIZADO' ? (
                                    <button onClick={() => handleReactivar(s.id)} title="Reactivar trabajo" className="text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">↺</button>
                                  ) : s.estado !== 'ENTREGADO' && (
                                    <button onClick={() => handleMarcarNoRealizado(s.id)} title="Marcar como no realizado" className="text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">✕</button>
                                  )}
                                  <button onClick={() => handleDeleteServicio(s.id)} title="Eliminar registro" className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/60">
                        <span className="text-[11px] text-slate-500">
                          Página {paginaActual} de {totalPaginas} · {serviciosFiltrados.length} registros
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                            disabled={paginaActual === 1}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                          >
                            ← Anterior
                          </button>
                          <button
                            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                            disabled={paginaActual === totalPaginas}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===================== PESTAÑA: CLIENTES ===================== */}
        {vista === 'clientes' && (
          <div className="space-y-6">
            <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
              <div className="flex flex-col md:flex-row gap-5 md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Periodo</p>
                  <div className="grid grid-cols-3 gap-2 w-full md:w-72">
                    <button onClick={() => setFiltroFechaClientes('todos')} className={botonFiltro(filtroFechaClientes === 'todos')}>Todos</button>
                    <button onClick={() => setFiltroFechaClientes('hoy')} className={botonFiltro(filtroFechaClientes === 'hoy')}>Hoy</button>
                    <button onClick={() => setFiltroFechaClientes('mes')} className={botonFiltro(filtroFechaClientes === 'mes')}>Este Mes</button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de contacto</p>
                  <div className="grid grid-cols-3 gap-2 w-full md:w-80">
                    <button onClick={() => setFiltroTipoContacto('todos')} className={botonFiltro(filtroTipoContacto === 'todos')}>Todos</button>
                    <button onClick={() => setFiltroTipoContacto('tecnico')} className={botonFiltro(filtroTipoContacto === 'tecnico')}>Técnicos</button>
                    <button onClick={() => setFiltroTipoContacto('cliente')} className={botonFiltro(filtroTipoContacto === 'cliente')}>Clientes</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md text-center transition-colors`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Clientes Únicos</p>
                <p className={`text-2xl font-black ${T.texto}`}>{totalClientesUnicos}</p>
              </div>
              <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md text-center transition-colors`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trabajos Realizados</p>
                <p className={`text-2xl font-black ${T.texto}`}>{totalTrabajosClientesTab}</p>
              </div>
              <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md text-center transition-colors`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dinero Generado</p>
                <p className={`text-2xl font-black ${T.texto}`}>{fmt(totalDineroClientesTab)}</p>
              </div>
              <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md text-center transition-colors`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tiempo Promedio Reparación</p>
                <p className={`text-2xl font-black ${T.texto}`}>{tiempoPromedioHoras !== null ? `${tiempoPromedioHoras.toFixed(1)}h` : '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-3`}>💎 Top por Dinero</h3>
                <div className="space-y-2">
                  {rankingPorDinero.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
                  ) : (
                    rankingPorDinero.map((data, idx) => (
                      <div key={data.nombre} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                        <span className="font-semibold text-slate-300">#{idx + 1} {data.nombre} <span className="text-[10px] text-slate-500">({data.visitas} t.)</span></span>
                        <span className={`font-black ${T.fuerte}`}>{fmt(data.dinero)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-3`}>🔁 Top por Cantidad de Trabajos</h3>
                <div className="space-y-2">
                  {rankingPorVisitas.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
                  ) : (
                    rankingPorVisitas.map((data, idx) => (
                      <div key={data.nombre} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                        <span className="font-semibold text-slate-300">#{idx + 1} {data.nombre}</span>
                        <span className={`font-black ${T.fuerte2}`}>{data.visitas} t. ({fmt(data.dinero)})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`bg-slate-900/80 border ${T.borde3} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <h3 className={`text-xs font-bold ${T.texto3} uppercase tracking-widest mb-3`}>🔧 Por Tipo de Trabajo</h3>
                <div className="space-y-2">
                  {rankingPorTipoTrabajo.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
                  ) : (
                    rankingPorTipoTrabajo.map((data, idx) => (
                      <div key={data.tipo} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                        <span className="font-semibold text-slate-300">#{idx + 1} {data.tipo}</span>
                        <span className="text-right">
                          <span className={`font-black ${T.fuerte3} block`}>{data.trabajos} eq. ({fmt(data.dinero)})</span>
                          {data.avgHoras !== null && (
                            <span className="text-[10px] text-slate-500">⏱ {data.avgHoras.toFixed(1)}h promedio</span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== PESTAÑA: FINANZAS ===================== */}
        {vista === 'finanzas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Semana Actual vs Anterior</p>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Esta semana</p>
                    <p className="text-xl font-black text-emerald-300">{fmt(cajaSemana)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Semana anterior</p>
                    <p className="text-sm font-bold text-slate-400">{fmt(cajaSemanaPasada)}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold pt-2 border-t border-emerald-500/20 ${deltaSemana >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {deltaSemana >= 0 ? '▲' : '▼'} {fmt(Math.abs(deltaSemana))} {deltaSemana >= 0 ? 'más' : 'menos'} que la semana anterior
                </div>
              </div>

              <div className={`${T.financeCard2} p-5 md:p-6 rounded-2xl backdrop-blur-md transition-colors`}>
                <p className={`text-xs font-bold ${T.fuerte2} uppercase tracking-widest mb-3`}>Mes Actual vs Anterior</p>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Este mes</p>
                    <p className={`text-xl font-black ${T.texto2}`}>{fmt(cajaMes)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Mes anterior</p>
                    <p className="text-sm font-bold text-slate-400">{fmt(cajaMesPasado)}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold pt-2 border-t ${T.borde2} ${deltaMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {deltaMes >= 0 ? '▲' : '▼'} {fmt(Math.abs(deltaMes))} {deltaMes >= 0 ? 'más' : 'menos'} que el mes anterior
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Por Cobrar (Total)</p>
                <span className="font-black text-amber-300 text-2xl">{fmt(porCobrarTotal)}</span>
              </div>
              <div className="bg-gradient-to-br from-slate-900/90 to-rose-950/40 border border-rose-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Devuelto por Garantías</p>
                <span className="font-black text-rose-300 text-2xl">{fmt(totalDevueltoGarantias)}</span>
              </div>
            </div>

            <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
              <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-4`}>📅 Flujo por Día de la Semana (Histórico)</h3>
              <div className="space-y-3">
                {DIAS_SEMANA.map((dia) => {
                  const valor = flujoPorDiaObj[dia] || 0;
                  const pct = Math.round((valor / maxFlujoDia) * 100);
                  return (
                    <div key={dia} className="flex items-center gap-3">
                      <span className="w-16 text-[11px] font-semibold text-slate-400 uppercase">{dia.slice(0, 3)}</span>
                      <div className="flex-1 h-6 bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800">
                        <div className={`h-full bg-gradient-to-r ${T.barraGradiente} rounded-lg transition-all`} style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className={`w-24 text-right text-xs font-black ${T.texto}`}>{fmt(valor)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== PESTAÑA: GARANTÍAS ===================== */}
        {vista === 'garantias' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-6 lg:col-span-1">
              {/* Formulario */}
              <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit transition-colors`}>
                <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
                  <span className={`w-2 h-2 rounded-full ${T.dot}`}></span>
                  Registrar Garantía
                </h2>
                <form onSubmit={handleAgregarGarantia} className="space-y-4">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Folio del trabajo</label>
                    <input
                      type="text"
                      value={folioGarantia}
                      onChange={(e) => {
                        setFolioGarantia(e.target.value);
                        setServicioIdGarantia(null);
                        setSugerenciasFolioVisibles(true);
                      }}
                      onFocus={() => setSugerenciasFolioVisibles(true)}
                      onBlur={() => setTimeout(() => setSugerenciasFolioVisibles(false), 150)}
                      required
                      autoComplete="off"
                      placeholder="Ej. F13"
                      className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all font-mono`}
                    />
                    {sugerenciasFolioVisibles && sugerenciasFolio.length > 0 && (
                      <div className={`absolute z-20 mt-1 w-full bg-slate-950 border ${T.sugerenciaBorde} rounded-xl overflow-hidden shadow-xl`}>
                        {sugerenciasFolio.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => handleSeleccionarFolio(s)}
                            className={`w-full text-left px-4 py-3 text-sm text-slate-200 ${T.sugerenciaHover} transition-colors flex justify-between items-center gap-2`}
                          >
                            <span className="font-mono">{s.folio}</span>
                            <span className="text-xs text-slate-500 truncate">{s.clientes?.nombre} · {s.modelo_equipo}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {servicioIdGarantia && (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ Trabajo encontrado y enlazado</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción del problema</label>
                    <textarea
                      value={descripcionGarantia}
                      onChange={(e) => setDescripcionGarantia(e.target.value)}
                      required
                      rows={3}
                      placeholder="Ej. No quitó la cuenta"
                      className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all resize-none`}
                    />
                  </div>
                  <button type="submit" className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all ${T.submit}`}>
                    + Registrar Garantía
                  </button>
                </form>
              </div>

              {/* Ranking de clientes con más garantías este mes */}
              <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-3`}>⚠️ Más Garantías Este Mes</h3>
                <div className="space-y-2">
                  {rankingClientesGarantiasMes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Sin garantías este mes.</p>
                  ) : (
                    rankingClientesGarantiasMes.map(([nombre, cantidad], idx) => (
                      <div key={nombre} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                        <span className="font-semibold text-slate-300">#{idx + 1} {nombre}</span>
                        <span className={`font-black ${T.fuerte2}`}>{cantidad}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Lista de garantías */}
            <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
              <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
                <span className={`w-2 h-2 rounded-full ${T.dot2}`}></span>
                Historial de Garantías
              </h2>
              {garantiasConIntensidad.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No hay garantías registradas.</p>
              ) : (
                <div className="space-y-3">
                  {garantiasConIntensidad.map((g) => (
                    <div key={g.id} className={`border rounded-xl p-4 ${g.colorClasses}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="font-mono font-black text-sm">{g.folio}</div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            {g.servicios?.clientes?.nombre || 'Cliente desconocido'} · {g.servicios?.modelo_equipo} ({g.servicios?.tipo_trabajo})
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{g.ordinal}ª este mes</span>
                          <button
                            onClick={() => handleResolverGarantia(g)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${g.resuelta ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-300 border-slate-700'}`}
                          >
                            {g.resuelta ? '✓ Resuelta' : 'Pendiente'}
                          </button>
                          <button onClick={() => handleEliminarGarantia(g.id)} className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors">Eliminar</button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 mt-2">{g.descripcion}</p>
                      {g.resuelta && g.nota_resolucion && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                          <span className="text-slate-400">✓ {g.nota_resolucion}</span>
                          {g.monto_devuelto ? (
                            <span className="block font-bold text-rose-300 mt-0.5">Devuelto: {fmt(g.monto_devuelto)}</span>
                          ) : null}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 mt-2">{getFechaLocal(g.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== PESTAÑA: VERIFICADOR IMEI ===================== */}
        {vista === 'imei' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-6 lg:col-span-1">
              <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
                <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-3`}>
                  <span className={`w-2 h-2 rounded-full ${T.dot}`}></span>
                  Verificador IMEI
                </h2>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  No existe una API pública en Chile para esto — cada operadora tiene su propio formulario manual. Abre el sitio, copia el IMEI de la lista y pégalo allá.
                </p>
                <div className="space-y-2.5">
                  {OPERADORAS_IMEI.map((op) => (
                    <button
                      key={op.nombre}
                      type="button"
                      onClick={() => handleAbrirVerificadorImei(op.url)}
                      className="group w-full flex items-center gap-3 bg-slate-950/60 border border-slate-800 hover:border-slate-600 p-3 rounded-xl transition-all active:scale-[0.98] hover:bg-slate-950"
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: op.hex, boxShadow: `0 0 12px ${op.hex}66` }}
                      >
                        {op.nombre[0]}
                      </span>
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-bold text-slate-100">{op.nombre}</span>
                        <span className="block text-[10px] text-slate-500">Consultar IMEI</span>
                      </span>
                      <span className="text-slate-600 group-hover:text-slate-300 transition-colors text-base flex-shrink-0">↗</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                  En computador se abren a un lado de la pantalla. En el celular se abren en una pestaña nueva — la barra de direcciones no se puede ni se debe ocultar (por seguridad del navegador).
                </p>
              </div>
            </div>

            <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
              <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
                <span className={`w-2 h-2 rounded-full ${T.dot2}`}></span>
                Pendientes de Verificar ({imeisPendientes.length})
              </h2>

              {imeisPendientes.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No hay IMEI pendientes de verificar. 🎉</p>
              ) : (
                <div className="space-y-3">
                  {imeisPendientes.map((s) => (
                    <div key={s.id} className="border border-slate-800 bg-slate-950/60 rounded-xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-400">
                            {s.folio && <span className={`${T.fuerte} font-mono mr-1.5`}>{s.folio}</span>}
                            {s.clientes?.nombre || 'General'} · {s.modelo_equipo}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono font-black text-white text-base tracking-wide break-all">{s.imei_serie}</span>
                            <button
                              type="button"
                              onClick={() => handleCopiarImei(s.id, s.imei_serie || '')}
                              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${imeiCopiadoId === s.id ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-300 border-slate-700'}`}
                            >
                              {imeiCopiadoId === s.id ? '✓ Copiado' : '📋 Copiar'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMarcarImeiEstado(s.id, 'limpio')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                          >
                            Limpio
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarcarImeiEstado(s.id, 'reportado')}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                          >
                            Reportado
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarcarImeiEstado(s.id, 'bloqueado')}
                            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                          >
                            Bloqueado
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
