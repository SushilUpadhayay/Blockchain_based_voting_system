# Task: Build a Voter Comparison Service

## Implement a reusable comparison service for the voter verification workflow

## Goal: Create a new service (for example, comparisonService.js) whose only responsibility is comparing data from three sources

1. User registration data
2. Excel roster record
3. OCR extracted data

This service must not:

1. Access MongoDB directly
2. Call controllers
3. Read Excel files
4. Perform blockchain operations
5. Approve or reject voters
6. Modify any existing registration workflow

It should only compare data and return structured results.

Fields to Compare

Compare these fields:

1. Full Name
2. Date of Birth
3. Gender
4. Permanent Address
5. Citizenship Number
6. Employee ID

Wallet Address and Email should not be compared because OCR does not provide them.

## Comparison Rules

For each field return one of:

1. match
2. mismatch
3. missing
4. not_available

Definitions:

1. match → values are equal
2. mismatch → both values exist but differ
3. missing → one value exists while the other is missing
4. not_available → comparison cannot be performed because that source does not contain the field (e.g., Employee ID in OCR)

## Address Comparison

For now, perform a simple case-insensitive string comparison. Do not implement fuzzy matching yet.

## Name Comparison

Perform: trim whitespace, ignore case. No fuzzy matching.

## DOB Comparison

Normalize dates before comparison if formats differ.

## Return Format

Return a structured object similar to:

{
  "excelFound": true,
  "ocrAvailable": true,
  "fields": {
    "name": {
      "user": "Robair Sharma",
      "excel": "Robair Sharma",
      "ocr": "Robair Sharma",
      "status": "match"
    },
    "dob": {
      "status": "match"
    },
    "gender": {
      "status": "mismatch"
    },
    "address": {
      "status": "match"
    },
    "citizenshipNumber": {
      "status": "match"
    },
    "employeeId": {
      "status": "match"
    }
  }
}

## Code Quality

1. Keep the service modular.
2. Create helper functions where appropriate (e.g., normalize strings, compare values).
3. Make it easy to extend later with fuzzy matching if needed.
4. Do not modify any existing controller or API endpoint in this phase.
Deliverables

## Provide

1. The new comparison service.
2. Helper functions used.
3. Example input and output.
4. Files created.
5. Confirmation that no existing registration, verification, or blockchain logic was modified.
