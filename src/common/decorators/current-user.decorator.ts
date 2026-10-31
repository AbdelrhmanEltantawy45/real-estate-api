import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  role: string;
  email?: string;
  fullName?: string;
  agentProfileId?: string | null;
}

/**
 * Extract the authenticated user from the request. Pass a property name to get
 * a single field, e.g. @CurrentUser('id').
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
