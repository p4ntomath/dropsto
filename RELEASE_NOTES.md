# DropSto v2 Release Notes

## Major Changes
- **Simplified PIN Format**: Introduced shorter 4-character PINs (format: `drop-XXXX`) for easier sharing and memorization
- **Legacy PIN Support**: Maintained backward compatibility with existing 8-character PINs (format: `drop-XXXXXXXX`)

## UI/UX Improvements
- Updated PIN input validation to support both PIN formats
- Enhanced PIN format help text to clearly indicate both new and legacy format support
- Added visual feedback for valid PIN entries
- Improved PIN format messaging across all relevant UI components

## Technical Improvements
- Updated PIN generation logic to create shorter, more user-friendly codes
- Enhanced PIN validation system to handle both formats seamlessly
- Maintained full compatibility with existing stored buckets

## Documentation Updates
- Updated feature descriptions to reflect the new PIN format
- Added legacy format compatibility notes

## Other Changes
- Improved error handling for PIN validation
- Updated help text and tooltips throughout the application

## Notes
- All existing buckets with 8-character PINs continue to work without any changes
- New buckets will receive the shorter 4-character PIN format
- Both PIN formats provide the same level of security and functionality

## Migration Guide
No migration is needed. The system will automatically:
- Continue to support existing 8-character PINs
- Generate 4-character PINs for new buckets
- Handle both formats in all user interfaces

## Technical Details
### PIN Format Specifications
- **New Format**: `drop-XXXX` where X can be A-Z or 0-9
- **Legacy Format**: `drop-XXXXXXXX` where X can be A-Z or 0-9
- Both formats are case-sensitive

### Validation Rules
- PINs must start with "drop-" (case-insensitive)
- Characters after "drop-" must be uppercase alphanumeric
- Total length must be either 9 characters (new format) or 13 characters (legacy format)

## Release Date
September 7, 2025