import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface CuentaBancaria {
  id: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular: string;
  rut?: string;
  email?: string;
}

// Página pública (sin login) enlazada desde el WhatsApp de "equipo listo".
// Solo lee de Supabase con la clave anónima — nunca escribe nada aquí.
export function PagoPublico() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('cuentas_bancarias')
      .select('id, banco, tipo_cuenta, numero_cuenta, titular, rut, email')
      .order('orden', { ascending: true })
      .then(({ data }) => {
        if (data) setCuentas(data);
        setLoading(false);
      });
  }, []);

  const copiar = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      alert(`No se pudo copiar automáticamente:\n\n${texto}`);
    }
  };

  const textoCompleto = (c: CuentaBancaria) =>
    `Banco: ${c.banco}\nTipo de cuenta: ${c.tipo_cuenta}\nN° de cuenta: ${c.numero_cuenta}\nTitular: ${c.titular}` +
    (c.rut ? `\nRUT: ${c.rut}` : '') +
    (c.email ? `\nEmail: ${c.email}` : '');

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 p-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md mx-auto relative z-10">
        <div className="text-center mb-8 pt-4">
          <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            MEGA UNLOCK
          </h1>
          <p className="text-xs uppercase tracking-widest text-cyan-400/70 font-semibold mt-1">Datos para transferencia</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Cargando...</p>
        ) : cuentas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No hay cuentas configuradas todavía.</p>
        ) : (
          <div className="space-y-4">
            {cuentas.map((c) => (
              <div key={c.id} className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl shadow-xl backdrop-blur-md p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-black text-white">{c.banco}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                    {c.tipo_cuenta}
                  </span>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">N° de Cuenta</p>
                    <p className="font-mono font-black text-lg text-white break-all">{c.numero_cuenta}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Titular</p>
                    <p className="text-sm text-slate-200">{c.titular}</p>
                  </div>
                  {c.rut && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">RUT</p>
                      <p className="text-sm text-slate-200">{c.rut}</p>
                    </div>
                  )}
                  {c.email && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Email</p>
                      <p className="text-sm text-slate-200 break-all">{c.email}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copiar(`${c.id}-num`, c.numero_cuenta)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      copiado === `${c.id}-num` ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-500 text-slate-950'
                    }`}
                  >
                    {copiado === `${c.id}-num` ? '✓ Copiado' : '📋 Copiar N° Cuenta'}
                  </button>
                  <button
                    onClick={() => copiar(`${c.id}-todo`, textoCompleto(c))}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      copiado === `${c.id}-todo` ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-300 border-slate-700'
                    }`}
                  >
                    {copiado === `${c.id}-todo` ? '✓' : 'Todo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-8">Mega Unlock Manager</p>
      </div>
    </div>
  );
}
