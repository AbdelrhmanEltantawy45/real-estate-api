import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';
import { Paginated } from '@/common/types/pagination';
import { normalizePayload } from '@/common/utils/serialize.util';

/**
 * Wraps every successful controller return value in the standard envelope:
 * { success: true, message, data?, meta? }
 */
@Injectable()
export class ResponseInterceptor<T = any> implements NestInterceptor<T, any> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const message =
      this.reflector.get(RESPONSE_MESSAGE_KEY, context.getHandler()) ?? 'Success';
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof Paginated) {
          return {
            success: true,
            message,
            data: normalizePayload(payload.data),
            meta: payload.meta,
          };
        }
        const normalized = normalizePayload(payload);
        if (normalized === undefined || normalized === null) {
          return { success: true, message };
        }
        if (typeof normalized === 'object' && normalized !== null && 'success' in normalized) {
          return normalized;
        }
        return { success: true, message, data: normalized };
      }),
    );
  }
}
