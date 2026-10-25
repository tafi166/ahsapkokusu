export interface CostInput {
  currency: 'TRY' | 'USD'; quantity: string; materialCost: string; wastePercent: string;
  laborMinutes: string; laborHourlyRate: string; machineMinutes: string; machineHourlyRate: string;
  finishingCost: string; overheadCost: string; packagingPerUnit: string; shippingPerUnit: string;
  salePrice: string; feePercent: string; fixedFee: string; targetMargin: string;
}
export interface CostResult {
  formulaVersion: '1'; currency: 'TRY' | 'USD'; batchCost: string; unitCost: string;
  contribution: string; marginPercent: string | null; breakEvenPrice: string; targetPrice: string;
}
export interface CostEstimate { id: string; name: string; input: CostInput; result: CostResult; version: number }
