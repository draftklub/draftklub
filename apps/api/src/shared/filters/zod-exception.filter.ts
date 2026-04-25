import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Mapeia ZodError vazado de DTOs (parse direto em controllers) para 400
 * com payload estruturado, ao inves de 500 (default do Nest).
 */
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    reply.status(HttpStatus.BAD_REQUEST).send({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors: exception.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
      path: request.url,
    });
  }
}
