# Adaptación de CV (`cv-adaptation.service.js`)

Genera un CV **proyectado a la oferta** a partir del CV base del perfil, manteniendo una
regla estricta de integridad.

## Regla de oro

> **No se inventa ni se modifica información**: se reorganiza, se reformula y se resalta
> lo ya existente (`experiencia`, `educacion`, `skills`, `certificaciones`). Cualquier
> ítem nuevo del candidato (empleos, títulos, herramientas) está PROHIBIDO.

- Si el usuario no ha subido un CV base (`perfil.cv_base`) → `400 Curriculum base no configurado`.
- Las `skills` del CV se limitan a las listadas en el perfil.
- Los años de experiencia se toman tal cual del perfil.

## Pipeline

1. `validateBase()` — valida que haya CV base y selecciona `resumen`.
2. Llamar a OpenAI con el template deterministico (`buildPrompt`) que incluye:
   - CV base del perfil;
   - `resumen`/`titulo_profesional` y `skills` del usuario;
   - la oferta completa (`titulo`, requisitos, funciones, «modificar»);
   - regla de **no inventar** en el prompt mismo.
3. Respuesta esperada: JSON `{markdown}`. Si falla o se excede timeout → `mockAdaptCv`
   con fallback a un CV markdown simple (también respeta el CV base).
4. Se guarda `generated_cvs` y se resuelve `cv.id` (+ `content`, `version`) en la respuesta.

## Sobre `version`

Cada generación nueva para una misma oferta incrementa `version` (a partir de 1).
El historial queda en `generated_cvs`.

## Formato

El contenido es **markdown ligero** (encabezados, listas, negritas) para facilitar su uso
posterior en plantillas Word/PDF (LaTeX/`pandoc` propuesto, no implementado aun).