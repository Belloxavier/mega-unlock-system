-- Marca cuándo se avisó al cliente que un equipo Completado está listo, para
-- poder consolidar en un solo WhatsApp los equipos de un mismo cliente que
-- se completan en momentos distintos ("esperar a los demás" en vez de
-- mandar un mensaje por cada equipo). NULL = todavía no se le avisó.
alter table servicios add column if not exists avisado_at timestamptz;
