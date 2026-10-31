import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';

/**
 * Attaches the authenticated user to the request when a valid token is present,
 * but allows the request through (with req.user = undefined) when there is no
 * token. Useful for endpoints like "record property view" that count for both
 * anonymous and authenticated visitors.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    try {
      await super.canActivate(context);
      return true;
    } catch {
      return true;
    }
  }

  handleRequest(_err: unknown, user: any): any {
    return user || undefined;
  }
}
