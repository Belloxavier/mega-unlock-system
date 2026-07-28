import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Servicio {
  id: string;
  modelo_equipo: string;
  imei_serie?: string;
  tipo_trabajo: string;
  monto: number;
  estado: string;
  created_at: string;
  clientes?: {
    id?: string;
    nombre: string;
    telefono: string;
  };
}

export function Dashboard() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros y Buscador
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos', 'hoy', 'mes'

  // Estados del formulario y Modo Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteIdAsociado, setClienteIdAsociado] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [modelo, setModelo] = useState('');
  const [imeiSerie, setImeiSerie] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState('Cuenta Mi');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select(`
        *,
        clientes (
          id,
          nombre,
          telefono
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setServicios(data);
    }
    setLoading(false);
  };

  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelo || !monto || !nombreCliente) return;

    if (editandoId) {
      if (clienteIdAsociado) {
        await supabase
          .from('clientes')
          .update({
            nombre: nombreCliente,
            telefono: telefonoCliente || null,
          })
          .eq('id', clienteIdAsociado);
      }

      const { error: servicioError } = await supabase
        .from('servicios')
        .update({
          modelo_equipo: modelo,
          imei_serie: imeiSerie || null,
          tipo_trabajo: tipoTrabajo,
          monto: parseFloat(monto),
        })
        .eq('id', editandoId);

      if (!servicioError) {
        limpiarFormulario();
        fetchServicios();
      } else {
        alert('Error al actualizar el servicio');
      }

    } else {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert([
          {
            nombre: nombreCliente,
            telefono: telefonoCliente || null,
          },
        ])
        .select()
        .single();

      if (clienteError || !clienteData) {
        alert('Error al registrar el cliente');
        return;
      }

      const { error: servicioError } = await supabase.from('servicios').insert([
        {
          cliente_id: clienteData.id,
          modelo_equipo: modelo,
          imei_serie: imeiSerie || null,
          tipo_trabajo: tipoTrabajo,
          monto: parseFloat(monto),
          estado: 'PENDIENTE',
        },
      ]);

      if (!servicioError) {
        limpiarFormulario();
        fetchServicios();
      } else {
        alert('Error al registrar el servicio');
      }
    }
  };

  const handleIniciarEdicion = (s: Servicio) => {
    setEditandoId(s.id);
    setClienteIdAsociado(s.clientes?.id || null);
    setNombreCliente(s.clientes?.nombre || '');
    setTelefonoCliente(s.clientes?.telefono || '');
    setModelo(s.modelo_equipo);
    setImeiSerie(s.imei_serie || '');
    setTipoTrabajo(s.tipo_trabajo);
    setMonto(s.monto.toString());
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setClienteIdAsociado(null);
    setNombreCliente('');
    setTelefonoCliente('');
    setModelo('');
    setImeiSerie('');
    setMonto('');
  };

  const handleToggleEstado = async (id: string, estadoActual: string) => {
    const estados = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO', 'ENTREGADO'];
    const siguienteEstado = estados[(estados.indexOf(estadoActual) + 1) % estados.length];

    const { error } = await supabase
      .from('servicios')
      .update({ estado: siguienteEstado })
      .eq('id', id);

    if (!error) {
      fetchServicios();
    }
  };

  const handleDeleteServicio = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;

    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);

    if (!error) {
      if (editandoId === id) limpiarFormulario();
      fetchServicios();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Filtrado general por buscador y selector de periodo
  const serviciosFiltrados = servicios.filter(s => {
    const textoMatch = 
      s.modelo_equipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (s.imei_serie && s.imei_serie.toLowerCase().includes(busqueda.toLowerCase())) ||
      s.tipo_trabajo.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.clientes?.telefono?.includes(busqueda);

    if (!textoMatch) return false;

    if (filtroFecha === 'hoy') {
      const hoyStr = new Date().toISOString().split('T')[0];
      const fechaServicio = s.created_at.split('T')[0];
      if (fechaServicio !== hoyStr) return false;
    } else if (filtroFecha === 'mes') {
      const mesActual = new Date().toISOString().slice(0, 7);
      const mesServicio = s.created_at.slice(0, 7);
      if (mesServicio !== mesActual) return false;
    }

    return true;
  });

  // Cálculos de periodos fijos (Hoy, Semana, Mes)
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesActualStr = new Date().toISOString().slice(0, 7);

  const esDeEstaSemana = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  // 1. Total Caja (Cobrado: COMPLETADO o ENTREGADO)
  const cajaHoy = servicios
    .filter(s => s.created_at.split('T')[0] === hoyStr && (s.estado === 'COMPLETADO' || s.estado === 'ENTREGADO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const cajaSemana = servicios
    .filter(s => esDeEstaSemana(s.created_at) && (s.estado === 'COMPLETADO' || s.estado === 'ENTREGADO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const cajaMes = servicios
    .filter(s => s.created_at.slice(0, 7) === mesActualStr && (s.estado === 'COMPLETADO' || s.estado === 'ENTREGADO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  // 2. Por Cobrar / En Taller (PENDIENTE o EN PROCESO)
  const porCobrarHoy = servicios
    .filter(s => s.created_at.split('T')[0] === hoyStr && (s.estado === 'PENDIENTE' || s.estado === 'EN PROCESO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const porCobrarSemana = servicios
    .filter(s => esDeEstaSemana(s.created_at) && (s.estado === 'PENDIENTE' || s.estado === 'EN PROCESO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const porCobrarMes = servicios
    .filter(s => s.created_at.slice(0, 7) === mesActualStr && (s.estado === 'PENDIENTE' || s.estado === 'EN PROCESO'))
    .reduce((acc, curr) => acc + (curr.monto || 0), 0);

  // Ranking por Cliente
  const rankingClientesObj = serviciosFiltrados.reduce((acc: { [key: string]: { dinero: number; visitas: number } }, curr) => {
    const nombre = curr.clientes?.nombre || 'General';
    if (!acc[nombre]) {
      acc[nombre] = { dinero: 0, visitas: 0 };
    }
    acc[nombre].dinero += curr.monto || 0;
    acc[nombre].visitas += 1;
    return acc;
  }, {});

  const rankingClientesPorDinero = Object.entries(rankingClientesObj).sort((a, b) => b[1].dinero - a[1].dinero).slice(0, 4);

  // Ranking por Tipo de Servicio
  const rankingServiciosObj = serviciosFiltrados.reduce((acc: { [key: string]: { dinero: number; trabajos: number } }, curr) => {
    const tipo = curr.tipo_trabajo || 'General';
    if (!acc[tipo]) {
      acc[tipo] = { dinero: 0, trabajos: 0 };
    }
    acc[tipo].dinero += curr.monto || 0;
    acc[tipo].trabajos += 1;
    return acc;
  }, {});

  const rankingServiciosByVolumen = Object.entries(rankingServiciosObj).sort((a, b) => b[1].trabajos - a[1].trabajos).slice(0, 4);

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'EN PROCESO': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'COMPLETADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ENTREGADO': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-8 border-b border-cyan-900/40 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              MEGA UNLOCK MANAGER
            </h1>
            <p className="text-xs uppercase tracking-widest text-cyan-400/70 font-semibold mt-1">
              // Neural Software & Hardware Terminal
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Tarjetas Financieras Clave con desglose de Hoy, Semana y Mes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Caja */}
          <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Caja (Cobrado)</p>
              <p className="text-[10px] text-slate-400 mb-3">Servicios ya pagados y listos/entregados</p>
            </div>
            <div className="space-y-2 border-t border-emerald-500/20 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Hoy:</span>
                <span className="font-black text-emerald-300 text-sm">${cajaHoy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Esta Semana:</span>
                <span className="font-black text-emerald-300 text-sm">${cajaSemana.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Este Mes:</span>
                <span className="font-black text-emerald-300 text-sm">${cajaMes.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Por Cobrar / En Taller */}
          <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Por Cobrar / En Taller</p>
              <p className="text-[10px] text-slate-400 mb-3">Trabajos pendientes o en proceso (Fiado)</p>
            </div>
            <div className="space-y-2 border-t border-amber-500/20 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Hoy:</span>
                <span className="font-black text-amber-300 text-sm">${porCobrarHoy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Esta Semana:</span>
                <span className="font-black text-amber-300 text-sm">${porCobrarSemana.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Este Mes:</span>
                <span className="font-black text-amber-300 text-sm">${porCobrarMes.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Selector de Periodo general */}
          <div className="bg-slate-900/80 border border-cyan-500/20 p-6 rounded-2xl shadow-xl backdrop-blur-md flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Filtrar Rankings / Tabla</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFiltroFecha('todos')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${filtroFecha === 'todos' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroFecha('hoy')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${filtroFecha === 'hoy' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setFiltroFecha('mes')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${filtroFecha === 'mes' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-950/80 text-slate-400 border border-slate-800'}`}
              >
                Este Mes
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-3 text-center">Aplica para los rankings de abajo y el historial</p>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              💎 Top Clientes (Más Ingresos)
            </h3>
            <div className="space-y-2">
              {rankingClientesPorDinero.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
              ) : (
                rankingClientesPorDinero.map(([nombre, data], idx) => (
                  <div key={nombre} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-slate-300">#{idx + 1} {nombre} <span className="text-[10px] text-slate-500">({data.visitas} trabajos)</span></span>
                    <span className="font-black text-cyan-400">${data.dinero.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-blue-500/20 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              🔧 Qué es lo que más hacemos (Ranking de Servicios)
            </h3>
            <div className="space-y-2">
              {rankingServiciosByVolumen.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
              ) : (
                rankingServiciosByVolumen.map(([tipo, data], idx) => (
                  <div key={tipo} className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
                    <span className="font-semibold text-slate-300">#{idx + 1} {tipo}</span>
                    <span className="font-black text-blue-400">{data.trabajos} equipos (${data.dinero.toFixed(2)})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="bg-slate-900/80 border border-cyan-500/20 p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                {editandoId ? 'Modificar Registro' : 'Registrar Nuevo Trabajo'}
              </h2>
              {editandoId && (
                <button
                  onClick={limpiarFormulario}
                  className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarServicio} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Cliente</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  required
                  placeholder="Ej. Carlos / Willy"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Teléfono (Opcional)</label>
                <input
                  type="text"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej. 5551234567"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">IMEI o N° de Serie (S/N)</label>
                <input
                  type="text"
                  value={imeiSerie}
                  onChange={(e) => setImeiSerie(e.target.value)}
                  placeholder="Ej. 864521049382101"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Servicio</label>
                <select
                  value={tipoTrabajo}
                  onChange={(e) => setTipoTrabajo(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                >
                  <option value="Cuenta Mi">Cuenta Mi</option>
                  <option value="Reparación IMEI">Reparación IMEI</option>
                  <option value="FRP">FRP</option>
                  <option value="Desbloqueo Red">Desbloqueo Red</option>
                  <option value="Software General">Software General</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs uppercase tracking-wider font-black transition-all mt-2 ${
                  editandoId 
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                }`}
              >
                {editandoId ? 'Actualizar Cambios' : 'Guardar Servicio'}
              </button>
            </form>
          </div>

          {/* Tabla de Registros y Buscador */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-cyan-500/20 p-6 rounded-2xl shadow-xl backdrop-blur-md">
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
                  placeholder="🔍 Buscar cliente, IMEI, modelo..."
                  className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Cargando base de datos...</p>
            ) : serviciosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No se encontraron registros que coincidan con la búsqueda.</p>
            ) : (
              <div className="overflow-x-auto">
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
                          <span className="text-white">{s.clientes?.nombre || 'General'}</span>
                          <span className="block text-[10px] text-slate-400">{new Date(s.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-slate-200 block font-semibold">{s.modelo_equipo}</span>
                          <span className="text-[10px] text-cyan-400/80 font-mono tracking-tight block">
                            {s.imei_serie ? `IMEI/SN: ${s.imei_serie}` : 'Sin IMEI registrado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-cyan-300 font-medium">{s.tipo_trabajo}</td>
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleToggleEstado(s.id, s.estado)}
                            title="Haz clic para cambiar el estado"
                            className={`border px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer hover:opacity-80 ${getBadgeColor(s.estado)}`}
                          >
                            {s.estado} 🔄
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-cyan-400">${s.monto.toFixed(2)}</td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleIniciarEdicion(s)}
                              title="Editar registro"
                              className="text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteServicio(s.id)}
                              title="Eliminar registro"
                              className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}