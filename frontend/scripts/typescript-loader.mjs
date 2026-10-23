import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';

// Resolve the same relative TypeScript imports used by Vite in component tests.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of ['.ts', '.tsx']) {
      const url = new URL(specifier + extension, context.parentURL);
      try { await access(url); } catch { continue; }
      return { url: url.href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

// Use the project's TypeScript compiler on both Node 20 and 22. Type checking
// remains mandatory in `npm run build`; this loader only runs API unit tests.
export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:') || !(/\.tsx?$/.test(url))) return nextLoad(url, context);
  const source = await readFile(new URL(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: new URL(url).pathname
  });
  return { format: 'module', source: outputText, shortCircuit: true };
}
