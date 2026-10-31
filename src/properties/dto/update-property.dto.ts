import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

/**
 * Updatable property fields. `status` is intentionally excluded because status
 * changes flow through the dedicated submit and status endpoints so the
 * transition rules are always enforced.
 */
export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['status'] as const),
) {}
