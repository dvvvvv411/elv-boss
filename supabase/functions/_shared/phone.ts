// Normalisiert deutsche Telefonnummern in E.164-Format (+49...)
// Gibt null zurück, wenn die Nummer nicht zu einer gültigen DE-Nummer normalisiert werden kann.
export function normalizeDePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  // 1) Alles außer Ziffern und führendem + entfernen
  let s = input.trim();
  const hasPlus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (hasPlus) s = "+" + s;

  // 2) 00... -> +...
  if (s.startsWith("00")) s = "+" + s.slice(2);

  // 3) Nationale Form 0... -> +49...
  if (!s.startsWith("+") && s.startsWith("0")) s = "+49" + s.slice(1);

  // 4) 49... ohne + -> +49...
  if (!s.startsWith("+") && s.startsWith("49")) s = "+" + s;

  // 5) Sonst (z.B. nur Ziffern ohne 0/49) -> +49 voranstellen
  if (!s.startsWith("+")) s = "+49" + s;

  // 6) Validierung DE
  if (!/^\+49[1-9][0-9]{6,14}$/.test(s)) return null;
  return s;
}
