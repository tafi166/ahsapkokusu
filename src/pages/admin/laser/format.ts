export const duration = (s: number) =>
  `${(s / 60).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} dk`;
