import type { FastifyReply } from 'fastify';
import type { ApiResponse, ApiError } from '@k9/shared';

/**
 * Sends a successful JSON response.
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  reply.status(statusCode).send(body);
}

/**
 * Sends an error JSON response.
 */
export function sendError(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
): void {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
  reply.status(statusCode).send(body);
}

/**
 * Sends a 404 Not Found response.
 */
export function sendNotFound(reply: FastifyReply, resource: string): void {
  sendError(reply, 'NOT_FOUND', `${resource} not found`, 404);
}

/**
 * Sends a validation error response.
 */
export function sendValidationError(reply: FastifyReply, details: unknown): void {
  sendError(reply, 'VALIDATION_ERROR', 'Invalid input', 422, details);
}
