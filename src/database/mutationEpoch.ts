
let epoch = 0;

export function bumpMutationEpoch(): void {
  epoch += 1;
}

export function currentMutationEpoch(): number {
  return epoch;
}
