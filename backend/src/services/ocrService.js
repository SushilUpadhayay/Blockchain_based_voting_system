/**
 * Mock OCR Service
 * Simulates extracting text from an identity document.
 */

const extractIdentityData = async (filePath) => {
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Mock Data Extraction
      resolve({
        success: true,
        extractedData: {
          // Typically we would parse the OCR text to find these.
          // For now, we mock a successful verification assuming it matches.
          isMatch: true,
          confidence: 0.95
        }
      });
    }, 1500);
  });
};

module.exports = {
  extractIdentityData,
};
