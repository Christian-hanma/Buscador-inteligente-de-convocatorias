import { env } from '../config/env.js';

// Middleware central de errores. Nunca expone stack traces en producción.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isHttp = err && typeof err.status === 'number';
  const status = isHttp ? err.status : 500;
  const message = isHttp ? err.message : 'Error interno del servidor';

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body = { error: message };
  if (!env.IS_PRODUCTION && status >= 500 && err && err.message) {
    body.detail = err.message;
  }
  if (err && err.details) {
    body.details = err.details;
  }

  res.status(status).json(body);
}