export const limpiarNumero = (tel: string) => tel.replace(/\D/g, '');

// Un teléfono chileno real tiene al menos 8 dígitos (fijo antiguo) — menos
// que eso es basura (ej. "abc", "-", "123"). Sin este chequeo, los botones
// de WhatsApp se mostraban igual y generaban un link wa.me sin número, que
// no hace nada al hacer clic — confuso para quien lo usa.
export function tieneTelefonoValido(tel?: string | null): tel is string {
  return limpiarNumero(tel || '').length >= 8;
}
