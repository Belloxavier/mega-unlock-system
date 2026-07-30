// Escapa texto antes de interpolarlo en un string de HTML crudo
// (ventana.document.write, plantillas de correo). Sin esto, un nombre de
// cliente o modelo de equipo con "<script>" quedaría como HTML ejecutable
// en el ticket/reporte impreso — es la única parte de la app que no pasa
// por el escapado automático de JSX.
export const escapeHtml = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
