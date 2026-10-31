import { AppointmentStatus } from '@prisma/client';

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  CONFIRMED: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED,
  ],
  RESCHEDULED: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.PENDING,
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
