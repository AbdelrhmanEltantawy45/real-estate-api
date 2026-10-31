/** Shared password policy used across all auth DTOs. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE =
  'password must contain at least one letter and one number';
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
