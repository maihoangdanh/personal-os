import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Paginated } from './paginated';

/**
 * Wraps every successful controller return value into the standard envelope
 * defined in 04_API_Specification:
 *   { success: true, data: {}, meta: {}, error: null }
 *
 * A controller may return a Paginated<T> to route pagination info to `meta`.
 */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
  error: null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((value) => {
        if (value instanceof Paginated) {
          return {
            success: true as const,
            data: value.data as T,
            meta: value.meta,
            error: null,
          };
        }
        return {
          success: true as const,
          data: value ?? (null as unknown as T),
          meta: {},
          error: null,
        };
      }),
    );
  }
}
