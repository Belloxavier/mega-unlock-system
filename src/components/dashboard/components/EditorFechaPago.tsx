interface Props {
  abierto: boolean;
  fechaPagoInput: string;
  alinear?: 'left' | 'right';
  onAbrir: () => void;
  onCerrar: () => void;
  onChangeFecha: (v: string) => void;
  onGuardar: () => void;
  guardando?: boolean;
}

export function EditorFechaPago({
  abierto,
  fechaPagoInput,
  alinear = 'left',
  onAbrir,
  onCerrar,
  onChangeFecha,
  onGuardar,
  guardando,
}: Props) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => (abierto ? onCerrar() : onAbrir())}
        title="Corregir fecha real de pago"
        aria-label="Corregir fecha real de pago"
        className="flex-shrink-0 px-2 py-1 rounded-lg text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700 transition-all"
      >
        📅
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={onCerrar} aria-hidden />
          <div
            className={`absolute z-40 mt-1.5 ${alinear === 'right' ? 'right-0' : 'left-0'} bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-3 w-56`}
          >
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Fecha real de pago
            </label>
            <input
              type="date"
              value={fechaPagoInput}
              onChange={(e) => onChangeFecha(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 mb-2"
            />
            <button
              type="button"
              disabled={guardando || !fechaPagoInput}
              onClick={onGuardar}
              className="w-full bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition-all disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
