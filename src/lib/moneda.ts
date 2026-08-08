// Formato de montos en pesos chilenos: punto como separador de miles, sin
// decimales — el peso chileno no usa centavos en la práctica. Si algún monto
// trae fracción real (poco común), se redondea al peso más cercano en vez
// de mostrar centavos, para que el formato sea siempre consistente.
const formateador = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
});

export const formatearNumero = (valor: number) => formateador.format(valor);

export const formatearMonto = (valor: number) => `$${formatearNumero(valor)}`;

// "+20,7%" / "-4,3%" — coma decimal (es-CL) y signo explícito, para
// tendencias de período (Finanzas y Estadísticas comparten este formato).
export const formatearPorcentaje = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`;
