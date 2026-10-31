import { Prisma } from '@prisma/client';

/** Reusable Prisma select that returns a user WITHOUT passwordHash. */
export const userPublicSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  agentProfile: {
    select: {
      id: true,
      agencyName: true,
      bio: true,
      specialties: true,
      licenseNumber: true,
      verificationStatus: true,
      verifiedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
