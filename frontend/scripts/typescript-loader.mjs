import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Use the project's TypeScript compiler on both Node 20 and 22. Type checking
// remains mandatory in `npm run build`; this loader only runs API unit tests.
export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:') || !url.endsWith('.ts')) return nextLoad(url, context);
  const source = await readFile(new URL(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    fileName: new URL(url).pathname
  });
  return { format: 'module', source: outputText, shortCircuit: true };
}
