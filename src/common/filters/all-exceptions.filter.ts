import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      success: false,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = this.formatHttpException(exception);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.formatPrismaError(exception);
      status = mapped.status;
      body = mapped.body;
    } else {
      this.logger.error(`Unhandled exception: ${this.safeError(exception)}`);
      if (process.env.NODE_ENV !== 'production') {
        body = { success: false, message: this.safeError(exception) };
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method} ${request.url}] ${status} - ${this.safeError(exception)}`,
      );
    }

    response.status(status).json(body);
  }

  private formatHttpException(exception: HttpException): Record<string, unknown> {
    const res = exception.getResponse();
    if (typeof res === 'string') {
      return { success: false, message: res };
    }
    const r = (res ?? {}) as Record<string, any>;

    // Already a fully-shaped response envelope (e.g. from the custom
    // ValidationPipe exceptionFactory or a thrown HttpException with our shape).
    if (typeof r === 'object' && 'success' in r) {
      return r;
    }

    // ValidationPipe default: { message: string[], error, statusCode }
    if (Array.isArray(r.message)) {
      return {
        success: false,
        message: 'Validation failed',
        errors: r.message.map((m: string) => ({ message: m })),
      };
    }

    // ValidationPipe object form: { message: { field: string[] } }
    if (r.message && typeof r.message === 'object') {
      const errors = Object.entries(r.message as Record<string, string[]>).flatMap(
        ([field, msgs]) =>
          (Array.isArray(msgs) ? msgs : [msgs]).map((m) => ({ field, message: m })),
      );
      return { success: false, message: 'Validation failed', errors };
    }

    return {
      success: false,
      message: r.message || r.error || 'Request failed',
      errors: r.errors,
    };
  }

  private formatPrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): { status: HttpStatus; body: Record<string, unknown> } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            message: 'A record with this value already exists',
            errors: [
              {
                field: Array.isArray(error.meta?.target)
                  ? (error.meta!.target as string[])[0]
                  : 'value',
                message: 'Must be unique',
              },
            ],
          },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: { success: false, message: 'Resource not found' },
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            message: 'Operation conflicts with existing related data',
          },
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          body: { success: false, message: 'Database operation failed' },
        };
    }
  }

  private safeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
