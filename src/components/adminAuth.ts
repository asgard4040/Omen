export function normalizeAdminPassword(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function resolveAdminPassword(value: string | null | undefined): string {
  return normalizeAdminPassword(value) || 'sunsun12345';
}

export function isAdminPasswordValid(
  inputPassword: string | null | undefined,
  storedPassword: string | null | undefined,
): boolean {
  const normalizedInput = normalizeAdminPassword(inputPassword);
  const normalizedStored = resolveAdminPassword(storedPassword);

  if (!normalizedInput) {
    return false;
  }

  if (normalizedInput === normalizedStored) {
    return true;
  }

  return normalizedInput === 'sunsun12345' && normalizedStored === 'sunsun12345';
}
