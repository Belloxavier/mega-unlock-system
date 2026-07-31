// Formato de montos en pesos chilenos: punto como separador de miles, sin
// decimales — el peso chileno no usa centavos en la práctica. Si algún monto
// trae fracción real (poco común), se redondea al peso más cercano en vez
// de mostrar centavos, para que el formato sea siempre consistente.
const formateador = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
});

export const formatearNumero = (valor: number) => formateador.format(valor);

export const formatearMonto = (valor: number) => `$${formatearNumero(valor)}`;
