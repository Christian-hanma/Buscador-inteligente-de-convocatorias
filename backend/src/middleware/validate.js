import { HttpError } from '../utils/httpError.js';

function formatZodError(error) {
  return error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`);
}

/** Valida req.body con un esquema de Zod. El resultado queda en req.validated. */
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', formatZodError(parsed.error));
    }
    req.validated = parsed.data;
    next();
  };
}