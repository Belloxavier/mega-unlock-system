import { useEffect, useState } from 'react';
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
  clientes?: Cliente;
}

const ZONA_HORARIA = 'America/Santiago';

// Devuelve la fecha en formato YYYY-MM-DD según la hora LOCAL de Chile,
// en vez de usar toISOString() que trabaja en UTC y desfasa el "Hoy".
const getFechaLocal = (fecha: Date | string) => {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(d);
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

  // Filtros y Buscador
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos', 'hoy', 'mes'
  const [mostrarMontos, setMostrarMontos] = useState(false);

  // Estados del formulario y Modo Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteIdAsociado, setClienteIdAsociado] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [tipoContacto, setTipoContacto] = useState<'tecnico' | 'cliente'>('tecnico');
  const [sugerenciasVisibles, setSugerenciasVisibles] = useState(false);
  const [modelo, setModelo] = useState('');
  const [imeiSerie, setImeiSerie] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState('Cuenta Mi');
  const [tipoTrabajoOtro, setTipoTrabajoOtro] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  useEffect(() => {
    fetchServicios();
    fetchClientes();
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select(`*, clientes ( id, nombre, telefono, tipo_contacto )`)
      .order('created_at', { ascending: false });

    if (!error && data) setServicios(data);
    setLoading(false);
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre');
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

  const handleCambiarNombre = (valor: string) => {
    setNombreCliente(valor);
    setClienteIdAsociado(null);
    setSugerenciasVisibles(true);
  };

  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelo || !monto || !nombreCliente) return;
    if (tipoTrabajo === 'Otros' && !tipoTrabajoOtro.trim()) {
      alert('Escribe el tipo de servicio en "Otros"');
      return;
    }

    const tipoTrabajoFinal = tipoTrabajo === 'Otros' ? tipoTrabajoOtro.trim() : tipoTrabajo;
    let clienteId = clienteIdAsociado;

    if (editandoId) {
      if (clienteId) {
        await supabase
          .from('clientes')
          .update({ nombre: nombreCliente, telefono: telefonoCliente || null, tipo_contacto: tipoContacto })
          .eq('id', clienteId);
      }

      const { error: servicioError } = await supabase
        .from('servicios')
        .update({
          modelo_equipo: modelo,
          imei_serie: imeiSerie || null,
          tipo_trabajo: tipoTrabajoFinal,
          monto: parseFloat(monto),
          metodo_pago: metodoPago,
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

    const { error: servicioError } = await supabase.from('servicios').insert([
      {
        cliente_id: clienteId,
        modelo_equipo: modelo,
        imei_serie: imeiSerie || null,
        tipo_trabajo: tipoTrabajoFinal,
        folio: generarFolio(tipoTrabajoFinal, servicios),
        monto: parseFloat(monto),
        estado: 'PENDIENTE',
        metodo_pago: metodoPago,
      },
    ]);

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
    setModelo(s.modelo_equipo);
    setImeiSerie(s.imei_serie || '');
    if (TIPOS_ESTANDAR.includes(s.tipo_trabajo)) {
      setTipoTrabajo(s.tipo_trabajo);
      setTipoTrabajoOtro('');
    } else {
      setTipoTrabajo('Otros');
      setTipoTrabajoOtro(s.tipo_trabajo);
    }
    setMonto(s.monto.toString());
    setMetodoPago(s.metodo_pago || 'Efectivo');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setClienteIdAsociado(null);
    setNombreCliente('');
    setTelefonoCliente('');
    setTipoContacto('tecnico');
    setModelo('');
    setImeiSerie('');
    setTipoTrabajo('Cuenta Mi');
    setTipoTrabajoOtro('');
    setMonto('');
    setMetodoPago('Efectivo');
  };

  const limpiarNumero = (tel: string) => tel.replace(/\D/g, '');

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    if (estadoActual === 'NO REALIZADO') return; 
    const estados = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO', 'ENTREGADO'];
    const idx = estados.indexOf(estadoActual);
    const siguienteEstado = estados[(idx === -1 ? 0 : idx + 1) % estados.length];

    const servicioActual = servicios.find((s) => s.id === id);
    const tieneWhatsApp = !!servicioActual?.clientes?.telefono;
    let ventanaWhatsApp: Window | null = null;
    if (siguienteEstado === 'COMPLETADO' && tieneWhatsApp) {
      ventanaWhatsApp = window.open('', '_blank');
    }

    const { error } = await supabase.from('servicios').update({ estado: siguienteEstado }).eq('id', id);

    if (error) {
      ventanaWhatsApp?.close();
      return;
    }

    fetchServicios();

    if (siguienteEstado === 'COMPLETADO' && servicioActual && ventanaWhatsApp) {
      const numero = limpiarNumero(servicioActual.clientes?.telefono || '');
      const mensaje = `Hola ${servicioActual.clientes?.nombre || ''}, tu equipo ${servicioActual.modelo_equipo}${servicioActual.folio ? ` (folio ${servicioActual.folio})` : ''} ya está listo. Puedes pasar a retirarlo.`;
      ventanaWhatsApp.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    } else {
      ventanaWhatsApp?.close();
    }
  };

  const handleMarcarNoRealizado = async (id: string) => {
    if (!window.confirm('¿Marcar este trabajo como NO REALIZADO?')) return;
    const { error } = await supabase.from('servicios').update({ estado: 'NO REALIZADO' }).eq('id', id);
    if (!error) fetchServicios();
  };

  const handleReactivar = async (id: string) => {
    const { error } = await supabase.from('servicios').update({ estado: 'PENDIENTE' }).eq('id', id);
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

  const serviciosFiltrados = servicios.filter((s) => {
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

  const hoyStr = getFechaLocal(new Date());
  const mesActualStr = hoyStr.slice(0, 7);

  const esDeEstaSemana = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diffDays = Math.abs(hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const cajaHoy = servicios
    .filter((s) => getFechaLocal(s.created_at) === hoyStr && s.estado === 'ENTREGADO')
    .reduce((acc, c) => acc + (c.monto || 0), 0);
  const cajaSemana = servicios
    .filter((s) => esDeEstaSemana(s.created_at) && s.estado === 'ENTREGADO')
    .reduce((acc, c) => acc + (c.monto || 0), 0);
  const cajaMes = servicios
    .filter((s) => getFechaLocal(s.created_at).slice(0, 7) === mesActualStr && s.estado === 'ENTREGADO')
    .reduce((acc, c) => acc + (c.monto || 0), 0);

  const enTallerEstados = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO'];
  const porCobrarHoy = servicios
    .filter((s) => getFechaLocal(s.created_at) === hoyStr && enTallerEstados.includes(s.estado))
    .reduce((acc, c) => acc + (c.monto || 0), 0);
  const porCobrarSemana = servicios
    .filter((s) => esDeEstaSemana(s.created_at) && enTallerEstados.includes(s.estado))
    .reduce((acc, c) => acc + (c.monto || 0), 0);
  const porCobrarMes = servicios
    .filter((s) => getFechaLocal(s.created_at).slice(0, 7) === mesActualStr && enTallerEstados.includes(s.estado))
    .reduce((acc, c) => acc + (c.monto || 0), 0);

  const rankingClientesObj = serviciosFiltrados.reduce(
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
  const rankingClientesPorDinero = Object.values(rankingClientesObj)
    .sort((a, b) => b.dinero - a.dinero)
    .slice(0, 4);

  const rankingServiciosObj = serviciosFiltrados.reduce(
    (acc: { [key: string]: { dinero: number; trabajos: number } }, curr) => {
      const tipo = curr.tipo_trabajo || 'General';
      if (!acc[tipo]) acc[tipo] = { dinero: 0, trabajos: 0 };
      acc[tipo].dinero += curr.monto || 0;
      acc[tipo].trabajos += 1;
      return acc;
    },
    {}
  );
  const rankingServiciosByVolumen = Object.entries(rankingServiciosObj)
    .sort((a, b) => b[1].trabajos - a[1].trabajos)
    .slice(0, 4);

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
      case 'COMPLETADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ENTREGADO': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'NO REALIZADO': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const fmt = (valor: number) => (mostrarMontos ? `$${valor.toFixed(2)}` : '••••••');

  return (
    // Se añadió p-4 en móvil y padding-bottom especial para el Safe Area del iPhone
    <div className="min-h-screen bg-[#070B19] text-slate-100 p-4 md:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-cyan-900/40 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              MEGA UNLOCK MANAGER
            </h1>
            <p className="text-xs uppercase tracking-widest text-cyan-400/70 font-semibold mt-1">
              // Neural Software & Hardware Terminal
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
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

        {/* Tarjetas Financieras Clave */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Caja (Cobrado)</p>
              <p className="text-[10px] text-slate-400 mb-3">Solo trabajos ENTREGADOS (pagados)</p>
            </div>
            <div className="space-y-2 border-t border-emerald-500/20 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Hoy:</span>
                <span className="font-black text-emerald-300 text-sm">{fmt(cajaHoy)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Semana:</span>
                <span className="font-black text-emerald-300 text-sm">{fmt(cajaSemana)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Mes:</span>
                <span className="font-black text-emerald-300 text-sm">{fmt(cajaMes)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Por Cobrar / En Taller</p>
              <p className="text-[10px] text-slate-400 mb-3">Pendiente, en proceso o completado</p>
            </div>
            <div className="space-y-2 border-t border-amber-500/20 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Hoy:</span>
                <span className="font-black text-amber-300 text-sm">{fmt(porCobrarHoy)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Semana:</span>
                <span className="font-black text-amber-300 text-sm">{fmt(porCobrarSemana)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Mes:</span>
                <span className="font-black text-amber-300 text-sm">{fmt(porCobrarMes)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-cyan-500/20 p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Filtrar Rankings / Tabla</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setFiltroFecha('todos')} className={`py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${filtroFecha === 'todos' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Todos</button>
              <button onClick={() => setFiltroFecha('hoy')} className={`py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${filtroFecha === 'hoy' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Hoy</button>
              <button onClick={() => setFiltroFecha('mes')} className={`py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${filtroFecha === 'mes' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Este Mes</button>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-3">💎 Top Clientes</h3>
            <div className="space-y-2">
              {rankingClientesPorDinero.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
              ) : (
                rankingClientesPorDinero.map((data, idx) => (
                  <div key={data.nombre} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-slate-300">#{idx + 1} {data.nombre} <span className="text-[10px] text-slate-500">({data.visitas} t.)</span></span>
                    <span className="font-black text-cyan-400">{fmt(data.dinero)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-blue-500/20 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-3">🔧 Qué más hacemos</h3>
            <div className="space-y-2">
              {rankingServiciosByVolumen.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
              ) : (
                rankingServiciosByVolumen.map(([tipo, data], idx) => (
                  <div key={tipo} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-slate-300">#{idx + 1} {tipo}</span>
                    <span className="font-black text-blue-400">{data.trabajos} eq. ({fmt(data.dinero)})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Formulario */}
          <div className="bg-slate-900/80 border border-cyan-500/20 p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
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
                  <button type="button" onClick={() => setTipoContacto('tecnico')} className={`py-2.5 text-xs font-bold rounded-xl transition-all ${tipoContacto === 'tecnico' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Técnico</button>
                  <button type="button" onClick={() => setTipoContacto('cliente')} className={`py-2.5 text-xs font-bold rounded-xl transition-all ${tipoContacto === 'cliente' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}>Cliente normal</button>
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
                {sugerenciasVisibles && sugerencias.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-slate-950 border border-cyan-500/30 rounded-xl overflow-hidden shadow-xl">
                    {sugerencias.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSeleccionarCliente(c)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-cyan-500/10 transition-colors flex justify-between items-center"
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Modelo del Equipo</label>
                <input 
                  type="text" 
                  value={modelo} 
                  onChange={(e) => setModelo(e.target.value)} 
                  required 
                  placeholder="Ej. Xiaomi Redmi Note 12" 
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">IMEI o N° de Serie (S/N)</label>
                <input 
                  type="text" 
                  value={imeiSerie} 
                  onChange={(e) => setImeiSerie(e.target.value)} 
                  placeholder="Ej. 864521049382101" 
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all font-mono" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Servicio</label>
                <select 
                  value={tipoTrabajo} 
                  onChange={(e) => setTipoTrabajo(e.target.value)} 
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                >
                  <option value="Cuenta Mi">Cuenta Mi</option>
                  <option value="Reparación IMEI">Reparación IMEI</option>
                  <option value="FRP">FRP</option>
                  <option value="Desbloqueo Red">Desbloqueo Red</option>
                  <option value="iCloud">iCloud</option>
                  <option value="Software General">Software General</option>
                  <option value="Otros">Otros</option>
                </select>
                {tipoTrabajo === 'Otros' && (
                  <input
                    type="text"
                    value={tipoTrabajoOtro}
                    onChange={(e) => setTipoTrabajoOtro(e.target.value)}
                    placeholder="Escribe el tipo de servicio"
                    className="w-full mt-2 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={monto} 
                  onChange={(e) => setMonto(e.target.value)} 
                  required 
                  placeholder="0.00" 
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Método de Pago</label>
                <select 
                  value={metodoPago} 
                  onChange={(e) => setMetodoPago(e.target.value)} 
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <button type="submit" className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all mt-2 ${editandoId ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]'}`}>
                {editandoId ? 'Actualizar Cambios' : 'Guardar Servicio'}
              </button>
            </form>
          </div>

          {/* Tabla / Lista de Registros */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-cyan-500/20 p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
              <h2 className="text-base font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
                Historial de Trabajos
              </h2>
              <div className="w-full md:w-72">
                <input 
                  type="text" 
                  value={busqueda} 
                  onChange={(e) => setBusqueda(e.target.value)} 
                  placeholder="🔍 Buscar folio, cliente, IMEI..." 
                  className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none focus:border-cyan-400 transition-all" 
                />
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Cargando base de datos...</p>
            ) : serviciosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No se encontraron registros que coincidan con la búsqueda.</p>
            ) : (
              <div className="w-full">
                
                {/* VISTA MÓVIL (Tarjetas - Optimizadas para iPhone) */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {serviciosFiltrados.map((s) => (
                    <div key={s.id} className={`p-4 rounded-2xl bg-slate-950/60 border ${editandoId === s.id ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-800'} flex flex-col gap-3 relative`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-base">
                            {s.folio && <span className="text-cyan-400/70 font-mono text-xs mr-2">{s.folio}</span>}
                            {s.clientes?.nombre || 'General'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">{getFechaLocal(s.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-cyan-400 text-lg">{fmt(s.monto)}</div>
                          <div className="text-[10px] uppercase text-cyan-500/70 mt-1">{s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}</div>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                        <span className="text-slate-200 block font-semibold text-sm">{s.modelo_equipo}</span>
                        <span className="text-[11px] text-cyan-400/80 font-mono tracking-tight block mb-3">{s.imei_serie ? `IMEI/SN: ${s.imei_serie}` : 'Sin IMEI registrado'}</span>
                        <div className="text-cyan-300 font-medium text-sm flex items-center justify-between">
                          <div className="flex flex-col">
                            <span>{s.tipo_trabajo}</span>
                            {s.metodo_pago && <span className="text-[10px] text-slate-500">{s.metodo_pago}</span>}
                          </div>
                          <button onClick={() => handleToggleEstado(s.id, s.estado)} className={`border px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm ${getBadgeColor(s.estado, s.created_at)}`}>
                            {s.estado} {s.estado !== 'NO REALIZADO' && '🔄'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-1">
                        <button onClick={() => handleIniciarEdicion(s)} className="flex-1 text-cyan-400 bg-cyan-500/10 py-2.5 rounded-xl text-xs font-semibold">✏️ Editar</button>
                        {s.folio && (
                          <button onClick={() => handleImprimirFolio(s)} className="flex-1 text-slate-300 bg-slate-700/30 py-2.5 rounded-xl text-xs font-semibold">🖨️ Ticket</button>
                        )}
                        {s.estado === 'NO REALIZADO' ? (
                          <button onClick={() => handleReactivar(s.id)} className="flex-1 text-amber-400 bg-amber-500/10 py-2.5 rounded-xl text-xs font-semibold">↺ Activar</button>
                        ) : (
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
                        <th className="py-3 px-3 text-right">Monto</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {serviciosFiltrados.map((s) => (
                        <tr key={s.id} className={`hover:bg-slate-950/40 transition-colors ${editandoId === s.id ? 'bg-cyan-950/20 border border-cyan-500/30' : ''}`}>
                          <td className="py-3.5 px-3 font-medium">
                            <span className="text-white">
                              {s.folio && <span className="text-cyan-400/70 font-mono text-[10px] mr-1.5">{s.folio}</span>}
                              {s.clientes?.nombre || 'General'}
                            </span>
                            <span className="block text-[9px] uppercase text-cyan-500/70">{s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}</span>
                            <span className="block text-[10px] text-slate-400">{getFechaLocal(s.created_at)}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-slate-200 block font-semibold">{s.modelo_equipo}</span>
                            <span className="text-[10px] text-cyan-400/80 font-mono tracking-tight block">{s.imei_serie ? `IMEI/SN: ${s.imei_serie}` : 'Sin IMEI registrado'}</span>
                          </td>
                          <td className="py-3.5 px-3 text-cyan-300 font-medium">
                            {s.tipo_trabajo}
                            {s.metodo_pago && <span className="block text-[10px] text-slate-500">{s.metodo_pago}</span>}
                          </td>
                          <td className="py-3.5 px-3">
                            <button onClick={() => handleToggleEstado(s.id, s.estado)} title="Haz clic para cambiar el estado" className={`border px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm hover:opacity-80 ${getBadgeColor(s.estado, s.created_at)}`}>
                              {s.estado} {s.estado !== 'NO REALIZADO' && '🔄'}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-cyan-400">{fmt(s.monto)}</td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handleIniciarEdicion(s)} title="Editar registro" className="text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">✏️</button>
                              {s.folio && (
                                <button onClick={() => handleImprimirFolio(s)} title="Imprimir folio" className="text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">🖨️</button>
                              )}
                              {s.estado === 'NO REALIZADO' ? (
                                <button onClick={() => handleReactivar(s.id)} title="Reactivar trabajo" className="text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">↺</button>
                              ) : (
                                <button onClick={() => handleMarcarNoRealizado(s.id)} title="Marcar como no realizado" className="text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors">✕</button>
                              )}
                              <button onClick={() => handleDeleteServicio(s.id)} title="Eliminar registro" className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors">Borrar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}