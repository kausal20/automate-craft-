/**
 * PROTOTYPE MOCK of src/lib/env.ts. Reads no environment variables.
 * These values only decide which UI states render.
 */
export const env = { openaiModel: "gpt-4o" };

export const isSupabaseAuthEnabled = () => true;
export const isSupabaseMode = () => true;
export const hasOpenAIKey = () => true;
export const isOpenAccessMode = () => false;
export const isSsoEnabled = () => false;
