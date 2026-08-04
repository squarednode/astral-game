/** Display/build identifier. Change this file for ordinary release version bumps. */
export const BUILD_VERSION = '0.6.9.1e';

/**
 * Save-format compatibility version. Increment only when the persisted structure
 * changes and add a migration in SaveRuntime.
 */
export const CURRENT_SAVE_SCHEMA = 2;

/** Stable browser storage namespace. Do not include the build version. */
export const SAVE_STORAGE_PREFIX = 'astral-shift.save.';
