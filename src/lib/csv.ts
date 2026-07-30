// Escapa un valor para CSV y evita inyección de fórmulas: si el texto
// empieza con =, +, - o @, Excel/Sheets pueden interpretarlo como una
// fórmula al abrir el archivo (ej. un nombre de cliente "=cmd|...").
// Anteponer una comilla simple fuerza a tratarlo como texto plano.
export const escaparCSV = (valor: string | number | undefined | null) => {
  let texto = String(valor ?? '');
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};
