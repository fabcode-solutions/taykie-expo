// Serial-number rules for device registration. Mirrors the backend validator
// (taykie-backend validators/deviceRegistration.validators.ts) and the admin panel's
// serial-number import: 8–16 upper-case letters/digits.
export const SERIAL_PATTERN = /^[A-Z0-9]{8,16}$/;
export const SERIAL_MAX_LENGTH = 16;

/** Auto-capitalise and strip spaces, as the brief asks, to cut entry errors. */
export const normalizeSerial = (raw: string): string => raw.replace(/\s+/g, "").toUpperCase();

export const isValidSerial = (serial: string): boolean => SERIAL_PATTERN.test(serial);
