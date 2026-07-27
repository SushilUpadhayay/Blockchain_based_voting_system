/**
 * OCR Service — Nepali Citizenship Certificate (Back / English Side)
 *
 * Pipeline:
 *  1. Image Preprocessing:
 *     - EXIF orientation auto-correction (.rotate())
 *     - High-resolution resizing (2200px width)
 *     - Contrast normalization & sharpening (crisp text edges)
 *     - Adaptive thresholding (enhances text against watermarks/backgrounds)
 *  2. Region-Based OCR:
 *     - Primary Pass: Upper card details region (top 60%)
 *     - Right-Column Pass: Right half crop (enhances recognition of right-hand values)
 *  3. Nepali Citizenship-Specific Field Extraction:
 *     - Extracts ONLY:
 *       - Citizenship Number
 *       - Full Name
 *       - Gender
 *       - Date of Birth (Year, Month, Day)
 *       - Birth District, Birth Municipality, Birth Ward No.
 *       - Permanent District, Permanent Municipality, Permanent Ward No.
 *     - Ignores all irrelevant text / missing fields (returns null for missing values)
 */

const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

const TMP_DIR = path.join(__dirname, '..', '..', 'uploads', 'ocr-tmp');

// Ensure temp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Try matching multiple regex patterns to extract value safely.
 */
function extractPattern(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1]
        .trim()
        .replace(/^[:\-\.\|\s]+/, '')
        .replace(/[:\-\.\|\s]+$/, '');
      if (cleaned.length > 0) return cleaned;
    }
  }
  return null;
}

/**
 * Parse raw text specifically for Nepali Citizenship Certificate fields.
 */
function parseNepaliCitizenshipText(rawText) {
  // Normalize line breaks & tabs
  const text = rawText.replace(/\r\n|\r/g, '\n').replace(/[ \t]+/g, ' ');

  // 1. Citizenship Number
  const citizenshipNumber = extractPattern(text, [
    /Citizenship\s*(?:Certificate|Card|No|Number|#|No\.)?\s*[:\-\.\|]?\s*([0-9\-\/]{4,25})/i,
    /Cert(?:ificate)?\s*No\.?\s*[:\-\.\|]?\s*([0-9\-\/]{4,25})/i,
    /(?:No|No\.)\s*[:\-\.\|]?\s*([0-9]{2,6}[\/\-][0-9]{2,6}[\/\-][0-9]{2,8})/i,
  ]);

  // 2. Full Name
  const fullName = extractPattern(text, [
    /(?:Full\s*Name|Name\s*of\s*Holder|Name)\.?\s*[:\-\.\|]?\s*([A-Za-z \-\.]{3,60})(?=\n|$|Date)/i,
  ]);

  // 3. Gender
  let gender = extractPattern(text, [
    /(?:Sex|Gender)\s*[:\-\.\|]?\s*(Male|Female|Other|M|F)/i,
  ]);
  if (gender) {
    if (/^m$/i.test(gender) || /^male$/i.test(gender)) gender = 'Male';
    else if (/^f$/i.test(gender) || /^female$/i.test(gender)) gender = 'Female';
    else if (/^other$/i.test(gender)) gender = 'Other';
  }

  // 4. Date of Birth (Year, Month, Day)
  let dateOfBirth = { year: null, month: null, day: null };
  const rawDob = extractPattern(text, [
    /(?:Date\s*of\s*Birth|DOB|Birth\s*Date)\s*\(?AD\)?\s*[:\-\.\|]?\s*([^\n]{5,40})/i,
  ]);

  if (rawDob) {
    // YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = rawDob.match(/([0-9]{4})[\-\/\.]([0-9]{1,2})[\-\/\.]([0-9]{1,2})/);
    if (isoMatch) {
      dateOfBirth = {
        year: isoMatch[1],
        month: isoMatch[2].padStart(2, '0'),
        day: isoMatch[3].padStart(2, '0'),
      };
    } else {
      // DD-MM-YYYY or DD/MM/YYYY
      const dmyMatch = rawDob.match(/([0-9]{1,2})[\-\/\.]([0-9]{1,2})[\-\/\.]([0-9]{4})/);
      if (dmyMatch) {
        dateOfBirth = {
          year: dmyMatch[3],
          month: dmyMatch[2].padStart(2, '0'),
          day: dmyMatch[1].padStart(2, '0'),
        };
      } else {
        // Explicit Year, Month, Day labels
        const yr = rawDob.match(/Year\s*[:\-\.\|]?\s*([0-9]{4})/i) || text.match(/Year\s*[:\-\.\|]?\s*([0-9]{4})/i);
        const mo = rawDob.match(/Month\s*[:\-\.\|]?\s*([0-9]{1,2}|[A-Za-z]{3,9})/i) || text.match(/Month\s*[:\-\.\|]?\s*([0-9]{1,2}|[A-Za-z]{3,9})/i);
        const dy = rawDob.match(/Day\s*[:\-\.\|]?\s*([0-9]{1,2})/i) || text.match(/Day\s*[:\-\.\|]?\s*([0-9]{1,2})/i);

        dateOfBirth = {
          year: yr ? yr[1] : null,
          month: mo ? mo[1] : null,
          day: dy ? dy[1] : null,
        };
      }
    }
  } else {
      const yr = text.match(/Year\s*[:\-\.\|]?\s*([0-9]{4})/i);
      const mo = text.match(/Month\s*[:\-\.\|]?\s*([0-9]{1,2}|[A-Za-z]{3,9})/i);
      const dy = text.match(/Day\s*[:\-\.\|]?\s*([0-9]{1,2})/i);
      dateOfBirth = {
        year: yr ? yr[1] : null,
        month: mo ? mo[1] : null,
        day: dy ? dy[1] : null,
      };
  }

  // 5. Birth Place (District, Municipality, Ward No.)
  const birthSectionMatch = text.match(/(?:Place\s*of\s*Birth|Birth\s*Place|Birth\s*Details)[\s\S]*?(?=(?:Permanent\s*Address|Permanent\s*Residence|Date\s*of\s*Issue|$))/i);
  const birthText = birthSectionMatch ? birthSectionMatch[0] : text;

  const birthDistrict = extractPattern(birthText, [
    /District\s*[:\-\.\|]?\s*([A-Za-z ]{3,30})(?=\n|$|Municipality)/i,
  ]);
  const birthMunicipality = extractPattern(birthText, [
    /(?:Municipality|R\.?\s*Municipality|Nagarpalika|Gaunpalika|Sub\-?Metropolitan|Metropolitan|VDC)\s*[:\-\.\|]?\s*([A-Za-z0-9 \-\.]+?)(?=\s*Ward|\n|$)/i,
  ]);
  const birthWardNo = extractPattern(birthText, [
    /Ward\s*(?:No|Num|#|No\.)?\s*[:\-\.\|]?\s*([0-9A-Za-z]{1,5})/i,
  ]);

  // 6. Permanent Address (District, Municipality, Ward No.)
  const permSectionMatch = text.match(/(?:Permanent\s*Address|Permanent\s*Residence|Permanent)[\s\S]*/i);
  const permText = permSectionMatch ? permSectionMatch[0] : text;

  let permanentDistrict = extractPattern(permText, [
    /District\s*[:\-\.\|]?\s*([A-Za-z ]{3,30})(?=\n|$|Municipality)/i,
  ]);
  let permanentMunicipality = extractPattern(permText, [
    /(?:Municipality|R\.?\s*Municipality|Nagarpalika|Gaunpalika|Sub\-?Metropolitan|Metropolitan|VDC)\s*[:\-\.\|]?\s*([A-Za-z0-9 \-\.]+?)(?=\s*Ward|\n|$)/i,
  ]);
  let permanentWardNo = extractPattern(permText, [
    /Ward\s*(?:No|Num|#|No\.)?\s*[:\-\.\|]?\s*([0-9A-Za-z]{1,5})/i,
  ]);

  // Fallback if permanent is not explicitly separated from birth
  if (!permanentDistrict) permanentDistrict = birthDistrict;

  const hasDob = Boolean(dateOfBirth.year || dateOfBirth.month || dateOfBirth.day);

  return {
    citizenshipNumber: citizenshipNumber || null,
    fullName: fullName || null,
    gender: gender || null,
    dateOfBirth: hasDob ? dateOfBirth : { year: null, month: null, day: null },
    birthDistrict: birthDistrict || null,
    birthMunicipality: birthMunicipality || null,
    birthWardNo: birthWardNo || null,
    permanentDistrict: permanentDistrict || null,
    permanentMunicipality: permanentMunicipality || null,
    permanentWardNo: permanentWardNo || null,
  };
}

/**
 * Enhanced Image Preprocessing Pipeline with Region-based Crops
 */
async function preprocessCitizenshipImage(inputPath) {
  const timestamp = Date.now();
  const baseName = path.basename(inputPath, path.extname(inputPath));

  const mainTmp = path.join(TMP_DIR, `ocr-main-${timestamp}-${baseName}.png`);
  const rightColumnTmp = path.join(TMP_DIR, `ocr-right-${timestamp}-${baseName}.png`);

  const meta = await sharp(inputPath).rotate().metadata();
  const width = meta.width || 1200;
  const height = meta.height || 800;

  const cropHeight = Math.floor(height * 0.60);

  // 1. Primary Preprocessed Crop (Top 60% with Upscaling, Normalization & Contrast Sharpening)
  await sharp(inputPath)
    .rotate()
    .extract({ left: 0, top: 0, width, height: cropHeight })
    .resize({ width: 2200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .threshold(140) // Enhances dark printed text against background watermarks
    .toFile(mainTmp);

  // 2. Right-Column Crop (Right 55% of top area — specifically targets right-hand printed values)
  const rightLeft = Math.floor(width * 0.40);
  const rightWidth = width - rightLeft;

  await sharp(inputPath)
    .rotate()
    .extract({ left: rightLeft, top: 0, width: rightWidth, height: cropHeight })
    .resize({ width: 1600, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .toFile(rightColumnTmp);

  return { mainTmp, rightColumnTmp };
}

/**
 * Extract information from a Nepali Citizenship Certificate (Back / English Side).
 *
 * @param {string} backImagePath Absolute path to uploaded document
 * @returns {Promise<{ success: boolean, extractedData: object, error?: string }>}
 */
const extractCitizenshipData = async (backImagePath) => {
  let tmpFiles = null;
  let worker = null;

  try {
    // 1. Preprocess Image
    tmpFiles = await preprocessCitizenshipImage(backImagePath);

    // 2. Initialize Tesseract Worker
    worker = await createWorker('eng');

    // 3. Recognize Primary Region
    const mainResult = await worker.recognize(tmpFiles.mainTmp);
    const mainText = mainResult.data.text || '';
    const mainConfidence = mainResult.data.confidence ?? 0;

    // 4. Recognize Right-Column Region
    const rightResult = await worker.recognize(tmpFiles.rightColumnTmp);
    const rightText = rightResult.data.text || '';

    // Combine raw text from both passes for maximum recall
    const combinedRawText = `${mainText}\n--- RIGHT COLUMN PASS ---\n${rightText}`;
    const averageConfidence = Math.round(mainConfidence);

    // 5. Parse Nepali Citizenship Specific Fields
    const fields = parseNepaliCitizenshipText(combinedRawText);

    return {
      success: true,
      extractedData: {
        ...fields,
        confidence: averageConfidence,
        rawText: combinedRawText,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[OCR] Extraction failed:', err.message);
    return {
      success: false,
      extractedData: null,
      error: err.message,
    };
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) { /* ignore */ }
    }
    if (tmpFiles) {
      if (tmpFiles.mainTmp && fs.existsSync(tmpFiles.mainTmp)) {
        try { fs.unlinkSync(tmpFiles.mainTmp); } catch (_) { /* ignore */ }
      }
      if (tmpFiles.rightColumnTmp && fs.existsSync(tmpFiles.rightColumnTmp)) {
        try { fs.unlinkSync(tmpFiles.rightColumnTmp); } catch (_) { /* ignore */ }
      }
    }
  }
};

module.exports = { extractCitizenshipData };
