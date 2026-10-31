import { ValidationError } from 'class-validator';

export interface FieldError {
  field: string;
  message: string;
}

/** Flatten class-validator errors (including nested) into { field, message } pairs. */
export function flattenValidationErrors(errors: ValidationError[]): FieldError[] {
  const result: FieldError[] = [];
  for (const error of errors) {
    if (error.constraints) {
      const message = Object.values(error.constraints).join(', ');
      result.push({ field: error.property, message });
    }
    if (error.children && error.children.length > 0) {
      for (const child of flattenValidationErrors(error.children)) {
        result.push({ field: `${error.property}.${child.field}`, message: child.message });
      }
    }
  }
  return result;
}
