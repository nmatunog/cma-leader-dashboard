export function formatNumberWithCommas(value: number | string): string {
  const num = typeof value === 'string' ? parseCommaNumber(value) : value;
  if (isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseCommaNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.toString().replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function handleNumberInputChange(
  value: string,
  setter: (num: number) => void
): void {
  const parsed = parseCommaNumber(value);
  setter(parsed);
}

