function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeZip(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isSameAddress(a, b) {
  return (
    normalizeText(a.street) === normalizeText(b.street) &&
    normalizeText(a.number) === normalizeText(b.number) &&
    normalizeText(a.city) === normalizeText(b.city) &&
    normalizeText(a.state) === normalizeText(b.state) &&
    normalizeZip(a.zipCode) === normalizeZip(b.zipCode)
  );
}
