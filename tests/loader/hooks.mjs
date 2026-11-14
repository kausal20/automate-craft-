// Test-only module resolution so node:test can run project TypeScript directly:
//   "@/x" -> src/x, extensionless relative imports -> .ts/.tsx/index.ts, "next/x" -> "next/x.js".
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const isFile = (p) => existsSync(p) && statSync(p).isFile();
const tryExt = (p) => [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")].find(isFile) ?? null;

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = tryExt(path.join(SRC, specifier.slice(2)));
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(SRC)) target = tryExt(path.resolve(path.dirname(parent), specifier));
  } else if (/^next\/[a-z-]+$/.test(specifier)) {
    return next(specifier + ".js", context);
  }
  if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  return next(specifier, context);
}
