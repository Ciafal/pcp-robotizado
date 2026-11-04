/**
 * Tipos de Node mínimos para testes de aceitação que leem código-fonte do projeto
 * (fs/path/process). O tsconfig.app.json não inclui @types/node no `types` (frontend
 * browser), então apenas o necessário é declarado aqui — sem dependência nova.
 */
declare module 'fs' {
  export function readFileSync(path: string, encoding: string): string
}
declare module 'path' {
  export function resolve(...segments: string[]): string
}
declare const process: { cwd: () => string }
