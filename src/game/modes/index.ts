/**
 * Mode Registry Initialization
 *
 * This file imports all mode registration files to ensure all modes
 * are registered before the app starts. Import this file in the app
 * entry point to initialize the registry.
 */

// Import registration files - these execute on import
import './earTrainingModes';
import './noteTrainingModes';

// Re-export the registry for convenience
export { modeRegistry } from '../ModeRegistry';
