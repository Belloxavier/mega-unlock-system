import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import type { Cliente, Servicio, EquipoForm, Garantia, CuentaBancaria, TemaUI } from '../../types';
import { equipoVacio, cuentaVacia } from '../../types';
import { DIAS_SEMANA, getFechaLocal, getDiaSemana } from '../../lib/date';
import { TIPOS_ESTANDAR, getPrefijo } from '../../lib/folio';
import { pareceImei } from '../../lib/imei';
import { escapeHtml } from '../../lib/html';
import { limpiarNumero } from '../../lib/phone';
import { getTema } from '../../lib/theme';
import { formatearMonto } from '../../lib/moneda';
import {
  estaEnRango,
  inicioSemana,
  finSemana,
  inicioSemanaPasada,
  finSemanaPasada,
  inicioMes,
  finMes,
  inicioMesPasado,
  finMesPasado,
} from '../../lib/fechaFinanzas';
import { validarEquipo } from '../../lib/validacion';
import { renderPlantilla } from '../../lib/whatsappPlantillas';
import type { ResumenCierre } from '../../lib/cierreCaja';
import { CuentasTab } from './CuentasTab';
import { ImeiTab } from './ImeiTab';
import { ClientesTab } from './ClientesTab';
import { FinanzasTab } from './FinanzasTab';
import { GarantiasTab } from './GarantiasTab';
import { CierreCajaModal } from './CierreCajaModal';
import { FormularioServicio } from './components/FormularioServicio';
import { HistorialServicios } from './components/HistorialServicios';
import { AlertasAtascados } from './components/AlertasAtascados';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmSheet } from './components/ConfirmSheet';
import { useToast } from './hooks/useToast';
import { useServicios } from '../../hooks/useServicios';
import { useClientes } from '../../hooks/useClientes';
import { useGarantias } from '../../hooks/useGarantias';
import { useCuentasBancarias } from '../../hooks/useCuentasBancarias';
import { useCierresCaja } from '../../hooks/useCierresCaja';

const PAGE_SIZE = 10;

const NIVELES_GARANTIA = [
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-red-600/20 text-red-300 border-red-500/50 shadow-[0_0_8px_rgba(220,38,38,0.4)]',
];

type Vista = 'inicio' | 'clientes' | 'finanzas' | 'garantias' | 'imei' | 'cuentas';

interface ConfirmState {
  titulo: string;
  mensaje: string;
  peligro?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function Dashboard() {
  const { servicios, loading, fetchServicios } = useServicios();
  const { clientesList, fetchClientes } = useClientes();
  const { garantiasList, fetchGarantias } = useGarantias();
  const { cuentasList, fetchCuentas } = useCuentasBancarias();
  const { cierresList, fetchCierres } = useCierresCaja();
  const { toasts, toast, dismiss } = useToast();

  const [vista, setVista] = useState<Vista>('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarMontos, setMostrarMontos] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [temaCalido, setTemaCalido] = useState(false);
  const [estadoMenuAbierto, setEstadoMenuAbierto] = useState<string | null>(null);
  const [imeiCopiadoId, setImeiCopiadoId] = useState<string | null>(null);
  const [editandoFechaPagoId, setEditandoFechaPagoId] = useState<string | null>(null);
  const [fechaPagoInput, setFechaPagoInput] = useState('');
  const [filtroFechaClientes, setFiltroFechaClientes] = useState('todos');
  const [filtroTipoContacto, setFiltroTipoContacto] = useState<'todos' | 'tecnico' | 'cliente'>('todos');

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteIdAsociado, setClienteIdAsociado] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [tipoContacto, setTipoContacto] = useState<'tecnico' | 'cliente'>('tecnico');
  const [sugerenciasVisibles, setSugerenciasVisibles] = useState(false);
  const [equipos, setEquipos] = useState<EquipoForm[]>([equipoVacio()]);
  const [escaneandoImei, setEscaneandoImei] = useState<number | null>(null);

  const [folioGarantia, setFolioGarantia] = useState('');
  const [servicioIdGarantia, setServicioIdGarantia] = useState<string | null>(null);
  const [descripcionGarantia, setDescripcionGarantia] = useState('');
  const [sugerenciasFolioVisibles, setSugerenciasFolioVisibles] = useState(false);

  const [formCuenta, setFormCuenta] = useState(cuentaVacia());
  const [editandoCuentaId, setEditandoCuentaId] = useState<string | null>(null);

  const [accionId, setAccionId] = useState<string | null>(null);
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [guardandoGarantia, setGuardandoGarantia] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [guardandoCierre, setGuardandoCierre] = useState(false);

  useEffect(() => {
    fetchServicios();
    fetchClientes();
    fetchGarantias();
    fetchCuentas();
  }, [fetchServicios, fetchClientes, fetchGarantias, fetchCuentas]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroFecha, filtroEstado]);

  const sugerencias = useMemo(() => {
    const q = nombreCliente.trim().toLowerCase();
    if (!q) return [];
    return clientesList.filter((c) => c.nombre.toLowerCase().includes(q)).slice(0, 6);
  }, [nombreCliente, clientesList]);

  const sugerenciasFolio = useMemo(() => {
    const q = folioGarantia.trim().toLowerCase();
    if (!q) return [];
    return servicios.filter((s) => s.folio?.toLowerCase().includes(q)).slice(0, 6);
  }, [folioGarantia, servicios]);

  const handleSeleccionarCliente = (c: Cliente) => {
    setClienteIdAsociado(c.id);
    setNombreCliente(c.nombre);
    setTelefonoCliente(c.telefono || '');
    setTipoContacto((c.tipo_contacto as 'tecnico' | 'cliente') || 'tecnico');
    setSugerenciasVisibles(false);
  };

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

  const handleAgregarEquipo = () => setEquipos((prev) => [...prev, equipoVacio()]);
  const handleQuitarEquipo = (idx: number) => setEquipos((prev) => prev.filter((_, i) => i !== idx));
  const handleCambiarEquipo = <K extends keyof EquipoForm>(idx: number, campo: K, valor: EquipoForm[K]) => {
    setEquipos((prev) => prev.map((eq, i) => (i === idx ? { ...eq, [campo]: valor } : eq)));
  };

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
        toast('IMEI leído — revísalo antes de guardar', 'info');
      } else {
        const textoLeido = data.text.trim();
        toast(
          `No encontré secuencia numérica larga. OCR leyó: "${textoLeido || '(vacío)'}". Prueba con más luz.`,
          'warning'
        );
      }
    } catch (err) {
      toast(`Error al leer la imagen: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setEscaneandoImei(null);
    }
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setClienteIdAsociado(null);
    setNombreCliente('');
    setTelefonoCliente('');
    setTipoContacto('tecnico');
    setEquipos([equipoVacio()]);
  };

  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente.trim()) {
      toast('Indica el nombre del cliente', 'warning');
      return;
    }

    if (editandoId) {
      const eq = equipos[0];
      const errEq = validarEquipo(eq, true);
      if (errEq) {
        toast(errEq, 'warning');
        return;
      }
      const tipoTrabajoFinal = eq.tipoTrabajo === 'Otros' ? eq.tipoTrabajoOtro.trim() : eq.tipoTrabajo;
      setGuardandoForm(true);
      try {
        if (clienteIdAsociado) {
          await supabase
            .from('clientes')
            .update({
              nombre: nombreCliente,
              telefono: telefonoCliente || null,
              tipo_contacto: tipoContacto,
            })
            .eq('id', clienteIdAsociado);
        }
        const { error: servicioError } = await supabase
          .from('servicios')
          .update({
            modelo_equipo: eq.modelo,
            imei_serie: eq.imeiSerie || null,
            tipo_trabajo: tipoTrabajoFinal,
            monto: eq.monto ? parseFloat(eq.monto) : 0,
            metodo_pago: eq.metodoPago,
            es_revision: eq.esRevision,
          })
          .eq('id', editandoId);

        if (servicioError) {
          toast('Error al actualizar el servicio', 'error');
          return;
        }
        limpiarFormulario();
        fetchServicios();
        fetchClientes();
        toast('Servicio actualizado', 'success');
      } finally {
        setGuardandoForm(false);
      }
      return;
    }

    const equiposValidos = equipos.filter((eq) => eq.modelo.trim() !== '' || eq.monto.trim() !== '');
    if (equiposValidos.length === 0) {
      toast('Agrega al menos un equipo', 'warning');
      return;
    }
    for (let i = 0; i < equiposValidos.length; i++) {
      const errEq = validarEquipo(equiposValidos[i], i === 0);
      if (errEq) {
        toast(errEq, 'warning');
        return;
      }
    }

    setGuardandoForm(true);
    try {
      let clienteId = clienteIdAsociado;
      let clienteEsNuevo = false;
      if (!clienteId) {
        const existente = clientesList.find(
          (c) => c.nombre.trim().toLowerCase() === nombreCliente.trim().toLowerCase()
        );
        if (existente) {
          clienteId = existente.id;
        } else {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .insert([
              {
                nombre: nombreCliente,
                telefono: telefonoCliente || null,
                tipo_contacto: tipoContacto,
              },
            ])
            .select()
            .single();

          if (clienteError || !clienteData) {
            toast('Error al registrar el cliente', 'error');
            return;
          }
          clienteId = clienteData.id;
          clienteEsNuevo = true;
        }
      }

      if (clienteId && !clienteEsNuevo) {
        await supabase
          .from('clientes')
          .update({
            nombre: nombreCliente,
            telefono: telefonoCliente || null,
            tipo_contacto: tipoContacto,
          })
          .eq('id', clienteId);
      }

      const tiposTrabajoFinal = equiposValidos.map((eq) =>
        eq.tipoTrabajo === 'Otros' ? eq.tipoTrabajoOtro.trim() : eq.tipoTrabajo
      );
      const prefijos = tiposTrabajoFinal.map((tipo) => getPrefijo(tipo));

      const { data: foliosAsignados, error: folioError } = await supabase.rpc('asignar_folios', {
        p_prefijos: prefijos,
      });

      if (folioError || !foliosAsignados) {
        toast(`Error al asignar el folio: ${folioError?.message || 'sin respuesta'}`, 'error');
        return;
      }

      const filas = equiposValidos.map((eq, idx) => ({
        cliente_id: clienteId,
        modelo_equipo: eq.modelo,
        imei_serie: eq.imeiSerie || null,
        tipo_trabajo: tiposTrabajoFinal[idx],
        folio: (foliosAsignados as string[])[idx],
        monto: eq.monto ? parseFloat(eq.monto) : 0,
        estado: 'PENDIENTE',
        metodo_pago: eq.metodoPago,
        es_revision: eq.esRevision,
      }));

      const { error: servicioError } = await supabase.from('servicios').insert(filas);
      if (servicioError) {
        toast('Error al registrar el servicio', 'error');
        return;
      }
      limpiarFormulario();
      fetchServicios();
      fetchClientes();
      toast(
        equiposValidos.length > 1
          ? `${equiposValidos.length} equipos registrados`
          : 'Servicio registrado',
        'success'
      );
    } finally {
      setGuardandoForm(false);
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
        esRevision: s.es_revision || false,
      },
    ]);
    setVista('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordarWhatsApp = (s: Servicio) => {
    const telefono = s.clientes?.telefono;
    if (!telefono) return;
    const nombre = s.clientes?.nombre || 'el cliente';
    setConfirm({
      titulo: 'Recordatorio WhatsApp',
      mensaje: `¿Enviar WhatsApp a ${nombre} recordándole que su equipo ${s.modelo_equipo}${
        s.folio ? ` (folio ${s.folio})` : ''
      } lleva más de 24h sin retirar?`,
      confirmLabel: 'Enviar',
      onConfirm: () => {
        setConfirm(null);
        const numero = limpiarNumero(telefono);
        const mensaje = renderPlantilla('recordatorio24h', {
          nombre: s.clientes?.nombre || '',
          modelo: s.modelo_equipo,
          folio: s.folio || undefined,
        });
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
      },
    });
  };

  const handleCambiarEstado = async (id: string, estadoActual: string, nuevoEstado: string) => {
    if (nuevoEstado === estadoActual) return;

    const servicioActual = servicios.find((s) => s.id === id);
    const tieneWhatsApp = !!servicioActual?.clientes?.telefono;
    let ventanaWhatsApp: Window | null = null;
    let avisarWhatsApp = false;

    let diagnosticoFinal: string | undefined;
    let montoFinal: number | undefined;
    if (nuevoEstado === 'COMPLETADO' && servicioActual?.es_revision) {
      const diagnosticoInput = window.prompt(
        '¿Qué se encontró o se hizo en la revisión?',
        servicioActual.diagnostico || ''
      );
      if (diagnosticoInput === null || !diagnosticoInput.trim()) return;
      const precioInput = window.prompt(
        'Precio final a cobrar:',
        servicioActual.monto ? servicioActual.monto.toString() : ''
      );
      if (precioInput === null) return;
      const precioParseado = parseFloat(precioInput);
      if (isNaN(precioParseado) || precioParseado < 0) {
        toast('Precio inválido', 'error');
        return;
      }
      diagnosticoFinal = diagnosticoInput.trim();
      montoFinal = precioParseado;
    }

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

    const cambios: {
      estado: string;
      completado_at?: string;
      entregado_at?: string;
      pagado?: boolean;
      pagado_at?: string;
      diagnostico?: string;
      monto?: number;
    } = { estado: nuevoEstado };
    if (nuevoEstado === 'COMPLETADO') cambios.completado_at = new Date().toISOString();
    if (diagnosticoFinal !== undefined) cambios.diagnostico = diagnosticoFinal;
    if (montoFinal !== undefined) cambios.monto = montoFinal;
    if (nuevoEstado === 'ENTREGADO') {
      cambios.entregado_at = new Date().toISOString();
      cambios.pagado = true;
      cambios.pagado_at = cambios.entregado_at;
    }

    setAccionId(id);
    const { error } = await supabase.from('servicios').update(cambios).eq('id', id);
    setAccionId(null);

    if (error) {
      ventanaWhatsApp?.close();
      toast(`No se pudo cambiar el estado: ${error.message}`, 'error');
      return;
    }

    fetchServicios();
    toast(`Estado → ${nuevoEstado}`, 'success');

    if (avisarWhatsApp && servicioActual && ventanaWhatsApp) {
      const numero = limpiarNumero(servicioActual.clientes?.telefono || '');
      const linkPago =
        cuentasList.length > 0 ? `\n\nDatos para transferencia: ${window.location.origin}/pago` : '';
      const mensaje =
        diagnosticoFinal !== undefined
          ? renderPlantilla('equipoListoRevision', {
              nombre: servicioActual.clientes?.nombre || '',
              modelo: servicioActual.modelo_equipo,
              folio: servicioActual.folio || undefined,
              diagnostico: diagnosticoFinal,
              monto: montoFinal ?? 0,
              linkPago,
            })
          : renderPlantilla('equipoListo', {
              nombre: servicioActual.clientes?.nombre || '',
              modelo: servicioActual.modelo_equipo,
              folio: servicioActual.folio || undefined,
              monto: servicioActual.monto,
              linkPago,
            });
      ventanaWhatsApp.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    } else {
      ventanaWhatsApp?.close();
    }
  };

  const handleTogglePagado = async (id: string, pagadoActual: boolean) => {
    const aplicar = async () => {
      const cambios = pagadoActual
        ? { pagado: false, pagado_at: null }
        : { pagado: true, pagado_at: new Date().toISOString() };
      setAccionId(id);
      const { error } = await supabase.from('servicios').update(cambios).eq('id', id);
      setAccionId(null);
      if (!error) {
        fetchServicios();
        toast(pagadoActual ? 'Marcado sin pagar' : 'Marcado como pagado', 'success');
      } else {
        toast(`No se pudo actualizar el pago: ${error.message}`, 'error');
      }
    };

    if (pagadoActual) {
      setConfirm({
        titulo: 'Desmarcar pago',
        mensaje: '¿Desmarcar como pagado? Se perderá la fecha real en que se pagó.',
        peligro: true,
        confirmLabel: 'Desmarcar',
        onConfirm: () => {
          setConfirm(null);
          void aplicar();
        },
      });
      return;
    }
    await aplicar();
  };

  const handleAbrirEditorFechaPago = (s: Servicio) => {
    setFechaPagoInput(getFechaLocal(s.pagado_at || new Date()));
    setEditandoFechaPagoId(s.id);
  };

  const handleGuardarFechaPago = async (id: string) => {
    if (!fechaPagoInput) return;
    const pagadoAtIso = new Date(`${fechaPagoInput}T12:00:00`).toISOString();
    setAccionId(id);
    const { error } = await supabase
      .from('servicios')
      .update({ pagado: true, pagado_at: pagadoAtIso })
      .eq('id', id);
    setAccionId(null);
    if (!error) {
      setEditandoFechaPagoId(null);
      fetchServicios();
      toast('Fecha de pago guardada', 'success');
    } else {
      toast(`No se pudo guardar la fecha: ${error.message}`, 'error');
    }
  };

  const handleMarcarNoRealizado = (id: string) => {
    setConfirm({
      titulo: 'No realizado',
      mensaje: '¿Marcar este trabajo como NO REALIZADO?',
      peligro: true,
      confirmLabel: 'Marcar',
      onConfirm: async () => {
        setConfirm(null);
        setAccionId(id);
        const { error } = await supabase.from('servicios').update({ estado: 'NO REALIZADO' }).eq('id', id);
        setAccionId(null);
        if (!error) {
          fetchServicios();
          toast('Marcado como no realizado', 'success');
        } else toast(error.message, 'error');
      },
    });
  };

  const handleReactivar = async (id: string) => {
    setAccionId(id);
    const { error } = await supabase
      .from('servicios')
      .update({ estado: 'PENDIENTE', completado_at: null, entregado_at: null })
      .eq('id', id);
    setAccionId(null);
    if (!error) {
      fetchServicios();
      toast('Trabajo reactivado', 'success');
    }
  };

  const handleDeleteServicio = (id: string) => {
    setConfirm({
      titulo: 'Eliminar registro',
      mensaje: '¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.',
      peligro: true,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirm(null);
        setAccionId(id);
        const { error } = await supabase.from('servicios').delete().eq('id', id);
        setAccionId(null);
        if (!error) {
          if (editandoId === id) limpiarFormulario();
          fetchServicios();
          toast('Registro eliminado', 'success');
        } else toast(error.message, 'error');
      },
    });
  };

  const handleImprimirFolio = (s: Servicio) => {
    const ventana = window.open('', '_blank', 'width=400,height=500');
    if (!ventana) return;
    const fecha = getFechaLocal(s.created_at);
    ventana.document.write(`
      <html>
        <head>
          <title>${escapeHtml(s.folio)}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body { width: 58mm; margin: 0; padding: 4mm; font-family: 'Courier New', monospace; text-align: center; }
            .folio { font-size: 46px; font-weight: 900; letter-spacing: 3px; margin: 2mm 0; }
            .linea { border-top: 1px dashed #000; margin: 2mm 0; }
            .dato { font-size: 12px; text-align: left; margin: 1mm 0; }
            .dato b { display: inline-block; width: 20mm; }
            .monto { font-size: 18px; font-weight: 900; margin-top: 2mm; }
          </style>
        </head>
        <body>
          <div class="folio">${escapeHtml(s.folio)}</div>
          <div class="linea"></div>
          <div class="dato"><b>Cliente:</b> ${escapeHtml(s.clientes?.nombre)}</div>
          <div class="dato"><b>Equipo:</b> ${escapeHtml(s.modelo_equipo)}</div>
          <div class="dato"><b>Servicio:</b> ${escapeHtml(s.tipo_trabajo)}</div>
          <div class="dato"><b>Fecha:</b> ${escapeHtml(fecha)}</div>
          <div class="linea"></div>
          <div class="monto">${formatearMonto(s.monto)}</div>
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
      const match = servicios.find(
        (s) => s.folio?.toLowerCase() === folioGarantia.trim().toLowerCase()
      );
      if (!match) {
        toast('No se encontró ese folio. Selecciónalo de la lista mientras escribes.', 'warning');
        return;
      }
      servicioId = match.id;
    }

    setGuardandoGarantia(true);
    const { error } = await supabase.from('garantias').insert([
      {
        servicio_id: servicioId,
        folio: folioGarantia.trim(),
        descripcion: descripcionGarantia.trim(),
      },
    ]);
    setGuardandoGarantia(false);

    if (!error) {
      limpiarFormularioGarantia();
      fetchGarantias();
      toast('Garantía registrada', 'success');
    } else {
      toast(`Error al registrar la garantía: ${error.message}`, 'error');
    }
  };

  const handleEliminarGarantia = (id: string) => {
    setConfirm({
      titulo: 'Eliminar garantía',
      mensaje: '¿Eliminar este registro de garantía?',
      peligro: true,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase.from('garantias').delete().eq('id', id);
        if (!error) {
          fetchGarantias();
          toast('Garantía eliminada', 'success');
        }
      },
    });
  };

  const handleResolverGarantia = async (g: Garantia) => {
    if (g.resuelta) {
      const { error } = await supabase
        .from('garantias')
        .update({ resuelta: false, resuelta_at: null })
        .eq('id', g.id);
      if (!error) {
        fetchGarantias();
        toast('Garantía reabierta', 'info');
      } else toast(error.message, 'error');
      return;
    }

    const nota = window.prompt(
      '¿Qué se hizo para resolverla? (ej. reparado sin costo, se cambió pieza, se devolvió dinero)'
    );
    if (nota === null) return;

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
      avisarWhatsApp = window.confirm(
        '¿Enviar WhatsApp al cliente avisando que su garantía quedó resuelta?'
      );
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
      toast(`No se pudo actualizar la garantía: ${error.message}`, 'error');
      return;
    }

    fetchGarantias();
    toast('Garantía resuelta', 'success');

    if (avisarWhatsApp && ventanaWhatsApp) {
      const numero = limpiarNumero(telefono || '');
      const mensaje = renderPlantilla('garantiaResuelta', {
        nombre: g.servicios?.clientes?.nombre || '',
        folio: g.folio,
      });
      ventanaWhatsApp.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    } else {
      ventanaWhatsApp?.close();
    }
  };

  const handleAbrirVerificadorImei = (url: string) => {
    const width = 480;
    const height = 720;
    const left = Math.max(0, window.screen.width - width - 20);
    const top = 40;
    window.open(
      url,
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
    );
  };

  const handleCopiarImei = async (id: string, imei: string) => {
    try {
      await navigator.clipboard.writeText(imei);
      setImeiCopiadoId(id);
      setTimeout(() => setImeiCopiadoId((prev) => (prev === id ? null : prev)), 1500);
      toast('IMEI copiado', 'success');
    } catch {
      toast(`No se pudo copiar. Cópialo a mano: ${imei}`, 'warning');
    }
  };

  const handleMarcarImeiEstado = async (
    id: string,
    estado: 'limpio' | 'reportado' | 'bloqueado'
  ) => {
    const { error } = await supabase.from('servicios').update({ imei_estado: estado }).eq('id', id);
    if (!error) {
      fetchServicios();
      toast(`IMEI marcado: ${estado}`, 'success');
    } else toast(`No se pudo guardar: ${error.message}`, 'error');
  };

  const limpiarFormularioCuenta = () => {
    setEditandoCuentaId(null);
    setFormCuenta(cuentaVacia());
  };

  const handleEditarCuenta = (c: CuentaBancaria) => {
    setEditandoCuentaId(c.id);
    setFormCuenta({
      banco: c.banco,
      tipoCuenta: c.tipo_cuenta,
      numeroCuenta: c.numero_cuenta,
      titular: c.titular,
      rut: c.rut || '',
      email: c.email || '',
    });
  };

  const handleGuardarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCuenta.banco.trim() || !formCuenta.numeroCuenta.trim() || !formCuenta.titular.trim()) {
      toast('Banco, número y titular son obligatorios', 'warning');
      return;
    }

    const datos = {
      banco: formCuenta.banco.trim(),
      tipo_cuenta: formCuenta.tipoCuenta,
      numero_cuenta: formCuenta.numeroCuenta.trim(),
      titular: formCuenta.titular.trim(),
      rut: formCuenta.rut.trim() || null,
      email: formCuenta.email.trim() || null,
    };

    const { error } = editandoCuentaId
      ? await supabase.from('cuentas_bancarias').update(datos).eq('id', editandoCuentaId)
      : await supabase.from('cuentas_bancarias').insert([{ ...datos, orden: cuentasList.length }]);

    if (!error) {
      limpiarFormularioCuenta();
      fetchCuentas();
      toast('Cuenta guardada', 'success');
    } else {
      toast(`No se pudo guardar la cuenta: ${error.message}`, 'error');
    }
  };

  const handleEliminarCuenta = (id: string) => {
    setConfirm({
      titulo: 'Eliminar cuenta',
      mensaje: '¿Eliminar esta cuenta bancaria de la página pública?',
      peligro: true,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase.from('cuentas_bancarias').delete().eq('id', id);
        if (!error) {
          if (editandoCuentaId === id) limpiarFormularioCuenta();
          fetchCuentas();
          toast('Cuenta eliminada', 'success');
        }
      },
    });
  };

  const handleAbrirCierreCaja = () => {
    fetchCierres();
    setCierreAbierto(true);
  };

  // Un cierre = un snapshot al momento de guardar; upsert por fecha para
  // que guardar de nuevo el mismo día actualice el registro en vez de
  // duplicarlo.
  const handleGuardarCierre = async (
    resumen: ResumenCierre,
    extra: { efectivoContado: number | null; nota: string }
  ) => {
    setGuardandoCierre(true);
    const fila = {
      fecha: resumen.fecha,
      cerrado_at: new Date().toISOString(),
      cobrado_total: resumen.cobradoTotal,
      efectivo: resumen.efectivo,
      transferencia: resumen.transferencia,
      tarjeta: resumen.tarjeta,
      otros_metodos: resumen.otrosMetodos,
      n_cobros: resumen.nCobros,
      por_cobrar: resumen.porCobrar,
      devuelto_garantias: resumen.devueltoGarantias,
      n_altas: resumen.nAltas,
      efectivo_contado: extra.efectivoContado,
      diferencia_efectivo:
        extra.efectivoContado != null ? extra.efectivoContado - resumen.efectivo : null,
      nota: extra.nota.trim() || null,
      detalle: resumen.cobros,
    };
    const { error } = await supabase.from('cierres_caja').upsert(fila, { onConflict: 'fecha' });
    setGuardandoCierre(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Cierre guardado', 'success');
      fetchCierres();
    }
  };

  const hoyStr = getFechaLocal(new Date());
  const mesActualStr = hoyStr.slice(0, 7);

  const serviciosBase = useMemo(() => {
    return servicios.filter((s) => {
      const q = busqueda.toLowerCase();
      const textoMatch =
        s.modelo_equipo.toLowerCase().includes(q) ||
        (s.imei_serie && s.imei_serie.toLowerCase().includes(q)) ||
        (s.folio && s.folio.toLowerCase().includes(q)) ||
        s.tipo_trabajo.toLowerCase().includes(q) ||
        s.clientes?.nombre?.toLowerCase().includes(q) ||
        s.clientes?.telefono?.includes(busqueda);

      if (!textoMatch) return false;
      if (filtroFecha === 'hoy' && getFechaLocal(s.created_at) !== hoyStr) return false;
      if (filtroFecha === 'mes' && getFechaLocal(s.created_at).slice(0, 7) !== mesActualStr) return false;
      return true;
    });
  }, [servicios, busqueda, filtroFecha, hoyStr, mesActualStr]);

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
  const serviciosPaginados = serviciosFiltrados.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE
  );

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
    porMetodoMes,
    porTipoMes,
  } = useMemo(() => {
    const fechaPago = (s: Servicio) => s.pagado_at || s.entregado_at || s.created_at;
    const ahora = new Date();
    const semIni = inicioSemana(ahora);
    const semFin = finSemana(ahora);
    const semPasIni = inicioSemanaPasada(ahora);
    const semPasFin = finSemanaPasada(ahora);
    const mesIni = inicioMes(ahora);
    const mesFin = finMes(ahora);
    const mesPasIni = inicioMesPasado(ahora);
    const mesPasFin = finMesPasado(ahora);

    const pagados = servicios.filter((s) => s.pagado);

    const cajaHoy = pagados
      .filter((s) => getFechaLocal(fechaPago(s)) === hoyStr)
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaSemana = pagados
      .filter((s) => estaEnRango(fechaPago(s), semIni, semFin))
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaSemanaPasada = pagados
      .filter((s) => estaEnRango(fechaPago(s), semPasIni, semPasFin))
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaMes = pagados
      .filter((s) => estaEnRango(fechaPago(s), mesIni, mesFin))
      .reduce((acc, c) => acc + (c.monto || 0), 0);
    const cajaMesPasado = pagados
      .filter((s) => estaEnRango(fechaPago(s), mesPasIni, mesPasFin))
      .reduce((acc, c) => acc + (c.monto || 0), 0);

    const deltaSemana = cajaSemana - cajaSemanaPasada;
    const deltaMes = cajaMes - cajaMesPasado;

    const porCobrarTotal = servicios
      .filter((s) => !s.pagado && s.estado !== 'NO REALIZADO')
      .reduce((acc, c) => acc + (c.monto || 0), 0);

    const flujoPorDiaObj = pagados.reduce((acc: { [dia: string]: number }, s) => {
      const dia = getDiaSemana(fechaPago(s));
      if (DIAS_SEMANA.includes(dia)) acc[dia] = (acc[dia] || 0) + (s.monto || 0);
      return acc;
    }, {});
    const maxFlujoDia = Math.max(1, ...DIAS_SEMANA.map((d) => flujoPorDiaObj[d] || 0));

    const pagadosMes = pagados.filter((s) => estaEnRango(fechaPago(s), mesIni, mesFin));
    const metodoMap: { [k: string]: number } = {};
    const tipoMap: { [k: string]: number } = {};
    pagadosMes.forEach((s) => {
      const m = s.metodo_pago || 'Sin método';
      metodoMap[m] = (metodoMap[m] || 0) + (s.monto || 0);
      const t = s.tipo_trabajo || 'General';
      tipoMap[t] = (tipoMap[t] || 0) + (s.monto || 0);
    });
    const porMetodoMes = Object.entries(metodoMap)
      .map(([metodo, monto]) => ({ metodo, monto }))
      .sort((a, b) => b.monto - a.monto);
    const porTipoMes = Object.entries(tipoMap)
      .map(([tipo, monto]) => ({ tipo, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 8);

    return {
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
      porMetodoMes,
      porTipoMes,
    };
  }, [servicios, hoyStr]);

  const trabajosAtascados = useMemo(() => {
    const enTallerEstados = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO'];
    return servicios.filter((s) => {
      if (!enTallerEstados.includes(s.estado)) return false;
      const horas = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60);
      return horas > 24;
    });
  }, [servicios]);

  const imeisPendientes = useMemo(
    () =>
      servicios.filter(
        (s) => pareceImei(s.imei_serie) && (s.imei_estado || 'sin_verificar') === 'sin_verificar'
      ),
    [servicios]
  );

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
      if (filtroFechaClientes === 'mes' && getFechaLocal(s.created_at).slice(0, 7) !== mesActualStr)
        return false;
      if (
        filtroTipoContacto !== 'todos' &&
        (s.clientes?.tipo_contacto || 'tecnico') !== filtroTipoContacto
      )
        return false;
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
    const rankingPorDinero = Object.values(rankingClientesTabObj)
      .sort((a, b) => b.dinero - a.dinero)
      .slice(0, 8);
    const rankingPorVisitas = Object.values(rankingClientesTabObj)
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 8);

    const horasReparacion = (s: Servicio) =>
      s.completado_at
        ? (new Date(s.completado_at).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60)
        : null;

    const rankingTipoTrabajoObj = serviciosClientesTab.reduce(
      (
        acc: {
          [key: string]: { dinero: number; trabajos: number; horasTotales: number; conTiempo: number };
        },
        curr
      ) => {
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

    const conTiempoGlobal = serviciosClientesTab
      .map(horasReparacion)
      .filter((h): h is number => h !== null);
    const tiempoPromedioHoras =
      conTiempoGlobal.length > 0
        ? conTiempoGlobal.reduce((a, b) => a + b, 0) / conTiempoGlobal.length
        : null;

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
      return {
        ...g,
        ordinal,
        colorClasses: NIVELES_GARANTIA[Math.min(ordinal, NIVELES_GARANTIA.length) - 1],
      };
    });
    return conOrdinal.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [garantiasList]);

  const rankingClientesGarantiasMes = useMemo(() => {
    const mesActual = hoyStr.slice(0, 7);
    const obj: { [nombre: string]: number } = {};
    garantiasList.forEach((g) => {
      if (g.created_at.slice(0, 7) !== mesActual) return;
      const nombre = g.servicios?.clientes?.nombre || 'Sin cliente';
      obj[nombre] = (obj[nombre] || 0) + 1;
    });
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [garantiasList, hoyStr]);

  const totalDevueltoGarantias = useMemo(
    () => garantiasList.reduce((acc, g) => acc + (g.monto_devuelto || 0), 0),
    [garantiasList]
  );

  const fmt = (valor: number) => (mostrarMontos ? formatearMonto(valor) : '••••••');
  const T = getTema(temaCalido) as TemaUI;
  const botonFiltro = (activo: boolean) =>
    `py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${
      activo ? T.filtroActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'
    }`;

  const handleImprimirReporte = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    const totalDinero = serviciosFiltrados.reduce((acc, s) => acc + (s.monto || 0), 0);
    const filasHtml = serviciosFiltrados
      .map(
        (s) => `
        <tr>
          <td>${escapeHtml(s.folio)}</td>
          <td>${escapeHtml(s.clientes?.nombre || 'General')}</td>
          <td>${escapeHtml(s.modelo_equipo)}</td>
          <td>${escapeHtml(s.tipo_trabajo)}</td>
          <td>${escapeHtml(s.estado)}</td>
          <td>${s.pagado ? 'Pagado' : 'Sin pagar'}</td>
          <td style="text-align:right">${formatearMonto(s.monto)}</td>
          <td>${escapeHtml(getFechaLocal(s.created_at))}</td>
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
          <div class="totales">Total: ${formatearMonto(totalDinero)}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const irAHistorialConFolio = (folio: string) => {
    setVista('inicio');
    setBusqueda(folio);
    setFiltroEstado('todos');
    setFiltroFecha('todos');
    toast(`Filtrado por folio ${folio}`, 'info');
  };

  return (
    <div
      className={`min-h-screen ${T.bgPage} text-slate-100 p-4 md:p-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative overflow-hidden transition-colors`}
    >
      <div className={`absolute top-0 left-1/4 w-96 h-96 ${T.blob1} rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${T.blob2} rounded-full blur-3xl pointer-events-none`} />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <ConfirmSheet
        abierto={!!confirm}
        titulo={confirm?.titulo || ''}
        mensaje={confirm?.mensaje || ''}
        peligro={confirm?.peligro}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
      <CierreCajaModal
        abierto={cierreAbierto}
        T={T}
        servicios={servicios}
        garantias={garantiasList}
        historial={cierresList}
        guardando={guardandoCierre}
        onCerrar={() => setCierreAbierto(false)}
        onGuardar={handleGuardarCierre}
        fmt={fmt}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b ${T.headerBorder} pb-5`}
        >
          <div>
            <h1
              className={`text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${T.titulo} ${T.tituloGlow}`}
            >
              MEGA UNLOCK MANAGER
            </h1>
            <p className={`text-xs uppercase tracking-widest ${T.subtitulo} font-semibold mt-1`}>
              // Neural Software & Hardware Terminal
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => setTemaCalido((v) => !v)}
              className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              {temaCalido ? '🎨 Tema Frío' : '🎨 Tema Cálido'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarMontos((v) => !v)}
              className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              {mostrarMontos ? '🙈 Ocultar' : '👁 Ver montos'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 sm:flex-none bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div
          className={`sticky top-[calc(env(safe-area-inset-top))] z-30 flex gap-2 mb-8 ${T.navBg} backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl w-full sm:w-fit shadow-lg transition-colors overflow-x-auto`}
        >
          {(
            [
              ['inicio', '🏠 Inicio'],
              ['clientes', '👥 Clientes'],
              ['finanzas', '💰 Finanzas'],
              ['garantias', '🛡️ Garantías'],
              ['imei', '📡 IMEI'],
              ['cuentas', '💳 Cuentas'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setVista(tab)}
              className={`flex-shrink-0 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                vista === tab ? T.tabActivo : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {vista === 'inicio' && (
          <>
            <AlertasAtascados trabajos={trabajosAtascados} onRecordar={handleRecordarWhatsApp} />

            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleAbrirCierreCaja}
                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                🧾 Cerrar caja
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Caja de Hoy</p>
                <span className="font-black text-emerald-300 text-2xl">{fmt(cajaHoy)}</span>
              </div>
              <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md flex justify-between items-center">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Por Cobrar (Total)
                </p>
                <span className="font-black text-amber-300 text-2xl">{fmt(porCobrarTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <FormularioServicio
                T={T}
                editandoId={editandoId}
                nombreCliente={nombreCliente}
                telefonoCliente={telefonoCliente}
                tipoContacto={tipoContacto}
                clienteIdAsociado={clienteIdAsociado}
                equipos={equipos}
                sugerencias={sugerencias}
                sugerenciasVisibles={sugerenciasVisibles}
                escaneandoImei={escaneandoImei}
                guardando={guardandoForm}
                onCambiarNombre={handleCambiarNombre}
                onFocusNombre={() => setSugerenciasVisibles(true)}
                onBlurNombre={() => setTimeout(() => setSugerenciasVisibles(false), 150)}
                onSeleccionarCliente={handleSeleccionarCliente}
                onTelefono={setTelefonoCliente}
                onTipoContacto={setTipoContacto}
                onCambiarEquipo={handleCambiarEquipo}
                onAgregarEquipo={handleAgregarEquipo}
                onQuitarEquipo={handleQuitarEquipo}
                onEscanearImei={handleEscanearImei}
                onSubmit={handleGuardarServicio}
                onCancelarEdicion={limpiarFormulario}
              />

              <HistorialServicios
                T={T}
                loading={loading}
                serviciosBase={serviciosBase}
                serviciosFiltrados={serviciosFiltrados}
                serviciosPaginados={serviciosPaginados}
                conteosPorEstado={conteosPorEstado}
                filtroFecha={filtroFecha}
                filtroEstado={filtroEstado}
                busqueda={busqueda}
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                editandoId={editandoId}
                estadoMenuAbierto={estadoMenuAbierto}
                editandoFechaPagoId={editandoFechaPagoId}
                fechaPagoInput={fechaPagoInput}
                accionId={accionId}
                fmt={fmt}
                botonFiltro={botonFiltro}
                onFiltroFecha={setFiltroFecha}
                onFiltroEstado={setFiltroEstado}
                onBusqueda={setBusqueda}
                onPagina={setPaginaActual}
                onImprimirReporte={handleImprimirReporte}
                onToggleEstadoMenu={setEstadoMenuAbierto}
                onCambiarEstado={handleCambiarEstado}
                onTogglePagado={handleTogglePagado}
                onAbrirEditorFecha={handleAbrirEditorFechaPago}
                onCerrarEditorFecha={() => setEditandoFechaPagoId(null)}
                onFechaPagoInput={setFechaPagoInput}
                onGuardarFechaPago={handleGuardarFechaPago}
                onIniciarEdicion={handleIniciarEdicion}
                onImprimirFolio={handleImprimirFolio}
                onMarcarNoRealizado={handleMarcarNoRealizado}
                onReactivar={handleReactivar}
                onDelete={handleDeleteServicio}
              />
            </div>
          </>
        )}

        {vista === 'clientes' && (
          <ClientesTab
            T={T}
            filtroFechaClientes={filtroFechaClientes}
            filtroTipoContacto={filtroTipoContacto}
            rankingPorDinero={rankingPorDinero}
            rankingPorVisitas={rankingPorVisitas}
            rankingPorTipoTrabajo={rankingPorTipoTrabajo}
            totalClientesUnicos={totalClientesUnicos}
            totalTrabajosClientesTab={totalTrabajosClientesTab}
            totalDineroClientesTab={totalDineroClientesTab}
            tiempoPromedioHoras={tiempoPromedioHoras}
            fmt={fmt}
            botonFiltro={botonFiltro}
            onFiltroFecha={setFiltroFechaClientes}
            onFiltroTipo={setFiltroTipoContacto}
          />
        )}

        {vista === 'finanzas' && (
          <FinanzasTab
            T={T}
            cajaSemana={cajaSemana}
            cajaSemanaPasada={cajaSemanaPasada}
            cajaMes={cajaMes}
            cajaMesPasado={cajaMesPasado}
            deltaSemana={deltaSemana}
            deltaMes={deltaMes}
            porCobrarTotal={porCobrarTotal}
            totalDevueltoGarantias={totalDevueltoGarantias}
            flujoPorDiaObj={flujoPorDiaObj}
            maxFlujoDia={maxFlujoDia}
            porMetodoMes={porMetodoMes}
            porTipoMes={porTipoMes}
            fmt={fmt}
          />
        )}

        {vista === 'garantias' && (
          <GarantiasTab
            T={T}
            folioGarantia={folioGarantia}
            descripcionGarantia={descripcionGarantia}
            servicioIdGarantia={servicioIdGarantia}
            sugerenciasFolio={sugerenciasFolio}
            sugerenciasFolioVisibles={sugerenciasFolioVisibles}
            garantiasConIntensidad={garantiasConIntensidad}
            rankingClientesGarantiasMes={rankingClientesGarantiasMes}
            guardando={guardandoGarantia}
            fmt={fmt}
            onFolioChange={(v) => {
              setFolioGarantia(v);
              setServicioIdGarantia(null);
              setSugerenciasFolioVisibles(true);
            }}
            onFocusFolio={() => setSugerenciasFolioVisibles(true)}
            onBlurFolio={() => setTimeout(() => setSugerenciasFolioVisibles(false), 150)}
            onSeleccionarFolio={handleSeleccionarFolio}
            onDescripcion={setDescripcionGarantia}
            onSubmit={handleAgregarGarantia}
            onResolver={handleResolverGarantia}
            onEliminar={handleEliminarGarantia}
            onFiltrarHistorialPorFolio={irAHistorialConFolio}
          />
        )}

        {vista === 'imei' && (
          <ImeiTab
            T={T}
            imeisPendientes={imeisPendientes}
            imeiCopiadoId={imeiCopiadoId}
            handleAbrirVerificadorImei={handleAbrirVerificadorImei}
            handleCopiarImei={handleCopiarImei}
            handleMarcarImeiEstado={handleMarcarImeiEstado}
          />
        )}

        {vista === 'cuentas' && (
          <CuentasTab
            T={T}
            cuentasList={cuentasList}
            formCuenta={formCuenta}
            setFormCuenta={setFormCuenta}
            editandoCuentaId={editandoCuentaId}
            limpiarFormularioCuenta={limpiarFormularioCuenta}
            handleGuardarCuenta={handleGuardarCuenta}
            handleEditarCuenta={handleEditarCuenta}
            handleEliminarCuenta={handleEliminarCuenta}
          />
        )}
      </div>
    </div>
  );
}
