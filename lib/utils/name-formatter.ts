/**
 * Name Format Conversion Utilities
 * Converts between different name formats used in the system
 */

/**
 * Convert name from worksheet format to display format
 * Input: "I/GONZALES/ANALYN/D@"
 * Output: "ANALYN D. GONZALES"
 */
export function convertWorksheetNameToDisplay(worksheetName: string): string {
  if (!worksheetName || !worksheetName.startsWith('I/')) {
    // If not in worksheet format, return as-is
    return worksheetName;
  }

  try {
    // Remove the "I/" prefix and "@" suffix
    const namePart = worksheetName.replace(/^I\//, '').replace(/@$/, '');
    
    // Split by "/"
    const parts = namePart.split('/');
    
    if (parts.length < 3) {
      // Invalid format, return as-is
      return worksheetName;
    }

    const lastName = parts[0] || '';
    const firstName = parts[1] || '';
    const initial = parts[2] || '';

    // Format: FIRSTNAME INITIAL. LASTNAME
    // Handle cases where firstName might have middle name (e.g., "ANNIE ROSE")
    const formattedFirstName = firstName.trim();
    const formattedInitial = initial.trim() ? `${initial.trim()}.` : '';
    const formattedLastName = lastName.trim();

    // Combine: "ANALYN D. GONZALES"
    if (formattedInitial) {
      return `${formattedFirstName} ${formattedInitial} ${formattedLastName}`.trim();
    } else {
      return `${formattedFirstName} ${formattedLastName}`.trim();
    }
  } catch (error) {
    console.error('Error converting worksheet name:', error);
    return worksheetName;
  }
}

/**
 * Convert display name back to worksheet format (if needed)
 * Input: "ANALYN D. GONZALES"
 * Output: "I/GONZALES/ANALYN/D@"
 */
export function convertDisplayNameToWorksheet(displayName: string): string {
  if (!displayName) {
    return '';
  }

  try {
    // Split by spaces
    const parts = displayName.trim().split(/\s+/);
    
    if (parts.length < 2) {
      return displayName;
    }

    // Last part is usually the last name
    const lastName = parts[parts.length - 1] || '';
    
    // First part is the first name
    const firstName = parts[0] || '';
    
    // Middle part(s) might contain the initial
    let initial = '';
    if (parts.length > 2) {
      // Look for single letter with period (e.g., "D.")
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i].replace(/\.$/, ''); // Remove trailing period
        if (part.length === 1) {
          initial = part;
          break;
        }
      }
    }

    // Format: I/LASTNAME/FIRSTNAME/INITIAL@
    return `I/${lastName.toUpperCase()}/${firstName.toUpperCase()}/${initial.toUpperCase()}@`;
  } catch (error) {
    console.error('Error converting display name to worksheet format:', error);
    return displayName;
  }
}

/**
 * Extract components from worksheet name format
 */
export function parseWorksheetName(worksheetName: string): {
  lastName: string;
  firstName: string;
  initial: string;
  displayName: string;
} | null {
  if (!worksheetName || !worksheetName.startsWith('I/')) {
    return null;
  }

  try {
    const namePart = worksheetName.replace(/^I\//, '').replace(/@$/, '');
    const parts = namePart.split('/');
    
    if (parts.length < 3) {
      return null;
    }

    const lastName = parts[0] || '';
    const firstName = parts[1] || '';
    const initial = parts[2] || '';
    const displayName = convertWorksheetNameToDisplay(worksheetName);

    return {
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      initial: initial.trim(),
      displayName,
    };
  } catch (error) {
    console.error('Error parsing worksheet name:', error);
    return null;
  }
}

/**
 * Normalize name for comparison (remove extra spaces, convert to uppercase)
 */
export function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}


