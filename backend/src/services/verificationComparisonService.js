/**
 * Verification Comparison Service
 * 
 * Objective: Compare voter registration data from three sources:
 *   1. User Registration Data (userData)
 *   2. Excel Roster Record (excelData)
 *   3. OCR Extracted Data (ocrData)
 * 
 * Rules:
 * - Pure, stateless, reusable, and side-effect free.
 * - Compares fields: name, dob, gender, address, citizenshipNumber, employeeId.
 * - Excludes wallet address and email (not present in OCR).
 * - Applies text normalization: lowercasing, removing punctuation, collapsing whitespace, trimming.
 * - Handles OCR missing employeeId by design (returns match if user & excel match).
 * - Returns statuses: 'match', 'mismatch', 'missing', 'not_available'.
 * - Generates human-readable facts-only `issues` array.
 */

const FIELDS = ['name', 'dob', 'gender', 'address', 'citizenshipNumber', 'employeeId'];

const FIELD_LABELS = {
  name: 'Name',
  dob: 'Date of Birth',
  gender: 'Gender',
  address: 'Address',
  citizenshipNumber: 'Citizenship Number',
  employeeId: 'Employee ID',
};

/**
 * Normalizes text strings:
 * - Converts to lowercase
 * - Removes punctuation characters (retaining unicode letters, numbers, and spaces)
 * - Collapses multiple spaces into a single space
 * - Trims leading and trailing whitespace
 *
 * @param {*} val
 * @returns {string} Normalized string
 */
function normalizeString(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes date values into YYYY-MM-DD format if possible.
 * Handles ISO strings, Date objects, and nested objects like { year, month, day }.
 * Fallback to normalized string if non-standard date text.
 *
 * @param {*} val
 * @returns {string} Normalized date string YYYY-MM-DD or normalized text
 */
function normalizeDate(val) {
  if (!val) return '';

  // Handle object { year, month, day }
  if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
    if (val.year && val.month && val.day) {
      const y = String(val.year).padStart(4, '0');
      const m = String(val.month).padStart(2, '0');
      const d = String(val.day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Handle Date instance
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  if (!str) return '';

  // Handle YYYY-MM-DD or YYYY/MM/DD formats
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return normalizeString(str);
}

/**
 * Normalizes gender values (e.g. male/m -> male, female/f -> female, other/o -> other)
 *
 * @param {*} val
 * @returns {string}
 */
function normalizeGender(val) {
  const norm = normalizeString(val);
  if (!norm) return '';
  if (norm === 'm' || norm === 'male') return 'male';
  if (norm === 'f' || norm === 'female') return 'female';
  if (norm === 'o' || norm === 'other') return 'other';
  return norm;
}

/**
 * Extracts raw value from a data source object for a given field key.
 *
 * @param {object|null} data
 * @param {string} field
 * @param {'user'|'excel'|'ocr'} sourceName
 * @returns {*|null}
 */
function extractRawValue(data, field, sourceName) {
  if (!data) return null;

  switch (field) {
    case 'name':
      return data.name || data.fullName || null;
    case 'dob':
      return data.dob || data.dateOfBirth || null;
    case 'gender':
      return data.gender || null;
    case 'address':
      if (data.address || data.permanentAddress) {
        return data.address || data.permanentAddress;
      }
      if (sourceName === 'ocr') {
        const parts = [data.permanentDistrict, data.permanentMunicipality, data.permanentWardNo].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : null;
      }
      return null;
    case 'citizenshipNumber':
      return data.citizenshipNumber || data.idNumber || null;
    case 'employeeId':
      return sourceName === 'ocr' ? null : (data.employeeId || null);
    default:
      return data[field] || null;
  }
}

/**
 * Normalizes raw value depending on field type.
 *
 * @param {*} rawVal
 * @param {string} field
 * @returns {string}
 */
function normalizeValue(rawVal, field) {
  if (rawVal === null || rawVal === undefined) return '';
  if (field === 'dob') return normalizeDate(rawVal);
  if (field === 'gender') return normalizeGender(rawVal);
  return normalizeString(rawVal);
}

/**
 * Compares a single field across user, excel, and ocr data sources.
 *
 * @param {object|null} userData
 * @param {object|null} excelData
 * @param {object|null} ocrData
 * @param {string} field
 * @returns {object} { user, excel, ocr, status }
 */
function compareField(userData, excelData, ocrData, field) {
  const userRaw = extractRawValue(userData, field, 'user');
  const excelRaw = extractRawValue(excelData, field, 'excel');
  const ocrRaw = extractRawValue(ocrData, field, 'ocr');

  const userNorm = normalizeValue(userRaw, field);
  const excelNorm = excelData ? normalizeValue(excelRaw, field) : '';
  const ocrNorm = (ocrData && field !== 'employeeId') ? normalizeValue(ocrRaw, field) : '';

  const sources = [];

  // User is primary input source
  sources.push({ name: 'user', raw: userRaw, norm: userNorm, active: true });

  // Excel roster source
  if (excelData) {
    sources.push({ name: 'excel', raw: excelRaw, norm: excelNorm, active: true });
  }

  // OCR document source (not applicable for employeeId)
  if (ocrData && field !== 'employeeId') {
    sources.push({ name: 'ocr', raw: ocrRaw, norm: ocrNorm, active: true });
  }

  let status = 'not_available';

  const activeSources = sources.filter(s => s.active);

  if (activeSources.length <= 1) {
    // Only user data exists, no comparison source available for this field
    status = 'not_available';
  } else {
    const hasMissingVal = activeSources.some(s => !s.norm);
    const hasPresentVal = activeSources.some(s => !!s.norm);

    if (hasMissingVal && hasPresentVal) {
      status = 'missing';
    } else if (!hasPresentVal) {
      status = 'not_available';
    } else {
      const firstVal = activeSources[0].norm;
      const allMatch = activeSources.every(s => s.norm === firstVal);
      status = allMatch ? 'match' : 'mismatch';
    }
  }

  return {
    user: userRaw !== undefined ? userRaw : null,
    excel: field === 'employeeId' && ocrData && !excelData ? null : (excelRaw !== undefined ? excelRaw : null),
    ocr: field === 'employeeId' ? null : (ocrRaw !== undefined ? ocrRaw : null),
    status
  };
}

/**
 * Generates human-readable issues array detailing facts only.
 *
 * @param {boolean} excelFound
 * @param {boolean} ocrFound
 * @param {object} fieldsResult
 * @returns {Array<string>}
 */
function generateIssues(excelFound, ocrFound, fieldsResult) {
  const issues = [];

  if (!excelFound) {
    issues.push('Excel roster record not found');
  }

  if (!ocrFound) {
    issues.push('OCR data not available');
  }

  for (const [field, result] of Object.entries(fieldsResult)) {
    const label = FIELD_LABELS[field] || field;
    if (result.status === 'mismatch') {
      issues.push(`${label} mismatch`);
    } else if (result.status === 'missing') {
      issues.push(`${label} missing`);
    }
  }

  return issues;
}

/**
 * Main service function to compare voter registration data across sources.
 *
 * @param {object} userData - User registration form data
 * @param {object|null} [excelData=null] - Roster record from Excel import
 * @param {object|null} [ocrData=null] - Extracted document OCR data
 * @returns {object} Comparison results including excelFound, ocrFound, summary, issues, and fields breakdown
 */
function compareVoterData(userData, excelData = null, ocrData = null) {
  const excelFound = !!excelData;
  const ocrFound = !!ocrData;

  const fieldsResult = {};
  const summary = {
    matches: 0,
    mismatches: 0,
    missing: 0,
  };

  for (const field of FIELDS) {
    const res = compareField(userData, excelData, ocrData, field);
    fieldsResult[field] = res;

    if (res.status === 'match') summary.matches++;
    else if (res.status === 'mismatch') summary.mismatches++;
    else if (res.status === 'missing') summary.missing++;
  }

  const issues = generateIssues(excelFound, ocrFound, fieldsResult);

  return {
    excelFound,
    ocrFound,
    summary,
    issues,
    fields: fieldsResult
  };
}

module.exports = {
  compareVoterData,
  compareField,
  generateIssues,
  normalizeString,
  normalizeDate,
  normalizeGender,
  extractRawValue,
  FIELDS
};
