# Verificación de garantías

- `node --test tests/garantia.test.mjs`: valores permitidos, independencia de equipos y límite exacto del vencimiento.
- `tests/garantia.sql`: ejecutar después de la migración; prueba el trigger real sobre una tabla temporal y termina con rollback. No modifica trabajos del taller.
- Con `npm run dev`, abrir `/tests/garantia-browser.html`: Dashboard real con API simulada en memoria. Todas las llamadas externas se interceptan; no guarda nada en Supabase. La página no se incluye en `dist`.

Flujo móvil comprobado: registrar dos equipos (0 y 6 meses), confirmar los valores del POST mediante `window.garantiaQA.escrituras`, editar el primero a 1 mes y confirmar el PATCH. Comprobar que el siguiente registro vuelve a 3 meses y que Cobertura distingue sin garantía, sin dato y vencida.

La emulación de iPhone en Chromium comprueba tamaño, interacción y ausencia de desbordamiento a 393, 375 y 320 px; no sustituye una prueba física en Safari/iOS.
