/**
 * ALIAS & RE-EXPORT CORPORATIVO
 * coverage-temporal-engine.ts -> cobertura-temporal-engine.ts
 *
 * Garante compatibilidade tanto para imports em inglês (CoverageTemporalEngine)
 * quanto em português (CoberturaTemporalEngine).
 */

export * from './cobertura-temporal-engine'
export { CoberturaTemporalEngine as CoverageTemporalEngine } from './cobertura-temporal-engine'
export { default } from './cobertura-temporal-engine'
