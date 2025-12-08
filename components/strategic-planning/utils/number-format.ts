/**
 * Utility functions for formatting numbers with comma separators
 */

/**
 * Format a number with comma separators (e.g., 1000000 -> "1,000,000")
 */
export function formatNumberWithCommas(value: number | string): string {
  if (value === '' || value === null || value === undefined) return '';
  const numStr = typeof value === 'string' ? value : value.toString();
  // Remove existing commas and non-numeric characters except decimal point
  const cleaned = numStr.replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  
  // Split by decimal point if present
  const parts = cleaned.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal part if present
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Parse a comma-separated number string back to a number
 * (e.g., "1,000,000" -> 1000000)
 */
export function parseCommaNumber(value: string): number {
  if (!value || value === '') return 0;
  // Remove all commas and parse
  const cleaned = value.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Handle input change for number fields with comma formatting
 */
export function handleNumberInputChange(
  value: string,
  setValue: (value: string) => void
): void {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Allow empty string
  if (cleaned === '') {
    setValue('');
    return;
  }
  
  // Format with commas
  const formatted = formatNumberWithCommas(cleaned);
  setValue(formatted);
}

