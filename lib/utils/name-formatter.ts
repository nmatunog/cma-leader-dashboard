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

/**
 * Format name for consistent display in "First Name(s) M.I. Last Name" format
 * Handles multiple first names and converts middle names to initials:
 * - "JOHN DOE" -> "John Doe"
 * - "JOHN D. SMITH" -> "John D. Smith"
 * - "MARIA ESTRELLA C. MATUNOG" -> "Maria Estrella C. Matunog" (keeps multiple first names)
 * - "JUAN CARLOS SANTOS" -> "Juan Carlos Santos" (treats as first names if no clear middle initial)
 * - "JOHN DAVID M. SMITH" -> "John David M. Smith" (if M. is present, David is first name)
 * - "JOHN M. SMITH" -> "John M. Smith" (single middle initial)
 * - Handles single letters (initials) and common prefixes/suffixes
 */
export function formatDisplayName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Trim and normalize spaces
  let normalized = name.trim().replace(/\s+/g, ' ');
  
  // Split by spaces
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  
  // If only one part, return as title case
  if (parts.length === 1) {
    const part = parts[0];
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  
  // If only two parts, return as "First Last"
  if (parts.length === 2) {
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    return `${firstName} ${lastName}`;
  }
  
  // For 3+ parts, identify: first names, middle initials, last name
  // Handle compound last names (e.g., "Canu og", "De La Cruz", "Van Der Berg")
  // Check if last part is a suffix (Jr., Sr., II, etc.)
  const lastPart = parts[parts.length - 1];
  const lastPartUpper = lastPart.toUpperCase().replace(/\.$/, '');
  const isSuffix = ['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(lastPartUpper);
  
  // Determine where the last name starts
  // Look for common last name prefixes or short words that might be part of compound last name
  const commonLastNamePrefixes = ['DE', 'DEL', 'LA', 'LOS', 'VAN', 'VON', 'MC', 'MAC', 'OG', 'O'];
  
  // Check if we have a compound last name
  // If the last part is very short (2-3 letters) and the second-to-last is longer, 
  // or if the last part matches a common prefix pattern, treat as compound
  let lastNameStartIndex = parts.length - 1;
  if (!isSuffix && parts.length >= 3) {
    // Check if last part is short and might be part of compound last name
    const lastPartClean = lastPart.replace(/\.$/, '').toUpperCase();
    const secondToLastClean = parts[parts.length - 2].replace(/\.$/, '').toUpperCase();
    
    // If last part is 2-3 letters and matches common patterns, or is "OG", treat as compound
    // Also check if last part is very short (2 letters) and previous part is longer (likely compound)
    if ((lastPartClean.length <= 3 && commonLastNamePrefixes.includes(lastPartClean)) ||
        (lastPartClean === 'OG' && secondToLastClean.length > 3) ||
        (lastPartClean.length === 2 && secondToLastClean.length > 3 && !secondToLastClean.match(/^[A-Z]\.?$/))) {
      // This is likely a compound last name (e.g., "Canu og")
      lastNameStartIndex = parts.length - 2;
    }
  } else if (isSuffix && parts.length >= 4) {
    // With suffix, check one more part back
    const thirdToLastClean = parts[parts.length - 3].replace(/\.$/, '').toUpperCase();
    const secondToLastClean = parts[parts.length - 2].replace(/\.$/, '').toUpperCase();
    const lastPartClean = lastPart.toUpperCase();
    
    if ((lastPartClean.length <= 3 && commonLastNamePrefixes.includes(lastPartClean)) ||
        (lastPartClean === 'OG' && secondToLastClean.length > 3) ||
        (lastPartClean.length === 2 && secondToLastClean.length > 3 && !secondToLastClean.match(/^[A-Z]\.?$/))) {
      lastNameStartIndex = parts.length - 3;
    }
  }
  
  // Extract last name (may be compound)
  const lastNameParts = parts.slice(lastNameStartIndex);
  const actualLastName = lastNameParts.join(' ');
  const formattedActualLastName = lastNameParts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ');
  
  // Everything before the last name is first names and middle initials
  const middleAndFirstParts = parts.slice(0, lastNameStartIndex);
  
  // Find where middle initials start (look for single letters or existing initials)
  let firstNamesEndIndex = middleAndFirstParts.length;
  for (let i = 0; i < middleAndFirstParts.length; i++) {
    const part = middleAndFirstParts[i].replace(/\.$/, '').toUpperCase();
    // If we find a single letter or an existing initial pattern, everything before is first names
    if (part.length === 1) {
      firstNamesEndIndex = i;
      break;
    }
  }
  
  // First names: everything up to the first initial
  const firstNames = middleAndFirstParts.slice(0, firstNamesEndIndex);
  const formattedFirstNames = firstNames.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ');
  
  // Middle parts: everything after first names (convert to initials if needed)
  const middleParts = middleAndFirstParts.slice(firstNamesEndIndex);
  const formattedMiddle = middleParts.map(part => {
    const cleanPart = part.replace(/\.$/, '').toUpperCase();
    
    // If it's already a single letter, return with period
    if (cleanPart.length === 1) {
      return cleanPart + '.';
    }
    
    // If it's a common suffix, keep as is (shouldn't happen here, but safety check)
    if (['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(cleanPart)) {
      return cleanPart;
    }
    
    // Convert to initial (first letter only)
    return cleanPart.charAt(0) + '.';
  }).join(' ');
  
  // Combine: First Name(s) M.I. Last Name [Suffix]
  let result = formattedFirstNames;
  if (formattedMiddle) {
    result += ` ${formattedMiddle}`;
  }
  result += ` ${formattedActualLastName}`;
  if (isSuffix) {
    result += ` ${lastPartUpper}`;
  }
  
  return result;
}



