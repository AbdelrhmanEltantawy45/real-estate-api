import { InquiryStatus } from '@prisma/client';

const TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: [InquiryStatus.CONTACTED, InquiryStatus.QUALIFIED, InquiryStatus.CLOSED],
  CONTACTED: [InquiryStatus.QUALIFIED, InquiryStatus.CLOSED, InquiryStatus.NEW],
  QUALIFIED: [InquiryStatus.CLOSED, InquiryStatus.CONTACTED],
  CLOSED: [InquiryStatus.NEW],
};

export function canTransitionInquiry(from: InquiryStatus, to: InquiryStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
