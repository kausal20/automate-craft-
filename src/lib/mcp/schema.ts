/**
 * Tool input validation against the tool's saved JSON schema.
 *
 * Deliberately a small, strict subset: object schemas with typed properties,
 * `required`, `enum`, and `additionalProperties: false`. A tool whose schema
 * uses anything else ($ref, oneOf, anyOf, allOf, patterns, ...) cannot be
 * validated safely, so it is marked unsupported and stays switched off.
 */

type Schema = Record<string, unknown>;

const SUPPORTED_KEYS = new Set(["type", "properties", "required", "description", "title", "enum", "additionalProperties", "items", "default", "$schema", "examples"]);
const TYPES = new Set(["string", "number", "integer", "boolean", "array", "object"]);

function supported(schema: unknown, depth = 0): boolean {
  if (!schema || typeof schema !== "object" || depth > 4) return false;
  const s = schema as Schema;
  if (Object.keys(s).some((k) => !SUPPORTED_KEYS.has(k))) return false;
  if (s.type !== undefined && !(typeof s.type === "string" && TYPES.has(s.type))) return false;
  if (s.properties !== undefined) {
    if (typeof s.properties !== "object" || s.properties === null) return false;
    if (!Object.values(s.properties as Schema).every((p) => supported(p, depth + 1))) return false;
  }
  if (s.items !== undefined && !supported(s.items, depth + 1)) return false;
  return true;
}

/** Can this tool's inputs be validated with the subset above? */
export function isSchemaSupported(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const s = schema as Schema;
  if (s.type !== undefined && s.type !== "object") return false;
  return supported(s);
}

export function requiredInputs(schema: Schema): string[] {
  return Array.isArray(schema.required) ? (schema.required as unknown[]).filter((r): r is string => typeof r === "string") : [];
}

function checkType(value: unknown, type: unknown): boolean {
  switch (type) {
    case undefined: return true;
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "array": return Array.isArray(value);
    case "object": return !!value && typeof value === "object" && !Array.isArray(value);
    default: return false;
  }
}

/** Plain-language problems; empty means valid. */
export function validateInputs(schema: Schema, input: unknown, path = "input"): string[] {
  const errors: string[] = [];
  if (!checkType(input, schema.type ?? "object")) return [`${path} has the wrong type`];
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === input)) errors.push(`${path} is not one of the allowed values`);
  if (schema.type === "array" && schema.items && Array.isArray(input)) {
    input.forEach((v, i) => errors.push(...validateInputs(schema.items as Schema, v, `${path}[${i}]`)));
  }
  if ((schema.type ?? "object") === "object" && input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, Schema>;
    for (const r of requiredInputs(schema)) if (obj[r] === undefined) errors.push(`"${r}" is missing`);
    for (const [k, v] of Object.entries(obj)) {
      if (props[k]) errors.push(...validateInputs(props[k], v, `"${k}"`));
      else if (schema.additionalProperties === false) errors.push(`"${k}" is not an input of this tool`);
    }
  }
  return errors;
}
