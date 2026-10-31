import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

/** Returns the caller's agent profile id or throws 403 if they are not an agent. */
export function requireAgent(user: AuthenticatedUser): string {
  if (user.role !== UserRole.AGENT || !user.agentProfileId) {
    throw new ForbiddenException('Only agents can perform this action');
  }
  return user.agentProfileId;
}
