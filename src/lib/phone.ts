/** Normalize Maldivian mobile input to E.164 +960XXXXXXX (7 digits after 960). */
export function toE164Maldives(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("960")) {
    return `+${digits}`;
  }
  if (digits.length === 7) {
    return `+960${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("960")) {
    return `+${digits}`;
  }
  return null;
}

export function formatDisplayPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length >= 10 && d.startsWith("960")) {
    const rest = d.slice(3);
    return `+960 ${rest.slice(0, 3)} ${rest.slice(3)}`;
  }
  return e164;
}
