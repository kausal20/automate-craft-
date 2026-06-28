/**
 * Clarification engine barrel.
 */

export { clarificationEngine } from "./engine";
export { deriveRequirements, type DerivedRequirement } from "./requirement-spec";
export {
  extract,
  consumeSpan,
  looksLikeSkip,
  looksLikeCorrection,
  type Extraction,
} from "./extractors";
