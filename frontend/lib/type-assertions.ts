// lib/type-assertions.ts
export const asMutable = <T extends readonly any[]>(arr: T): any[] => {
  return [...arr] // Create a mutable copy
}

export const asAbi = (abi: readonly any[]): any[] => {
  return [...abi] // Create a mutable copy
}