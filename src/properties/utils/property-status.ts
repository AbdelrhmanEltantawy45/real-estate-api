import { PropertyStatus } from '@prisma/client';

/**
 * Allowed property status transitions. The backend enforces these on every
 * status-changing operation, regardless of what the frontend requests.
 */
const TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  DRAFT: [PropertyStatus.PENDING_APPROVAL],
  PENDING_APPROVAL: [
    PropertyStatus.PUBLISHED,
    PropertyStatus.REJECTED,
    PropertyStatus.DRAFT,
  ],
  REJECTED: [PropertyStatus.PENDING_APPROVAL, PropertyStatus.DRAFT],
  PUBLISHED: [
    PropertyStatus.SOLD,
    PropertyStatus.RENTED,
    PropertyStatus.ARCHIVED,
    PropertyStatus.DRAFT,
  ],
  SOLD: [PropertyStatus.PUBLISHED, PropertyStatus.ARCHIVED],
  RENTED: [PropertyStatus.PUBLISHED, PropertyStatus.ARCHIVED],
  ARCHIVED: [PropertyStatus.DRAFT, PropertyStatus.PUBLISHED],
};

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: PropertyStatus): PropertyStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Statuses visible to the public. */
export const PUBLIC_STATUSES: PropertyStatus[] = [PropertyStatus.PUBLISHED];
