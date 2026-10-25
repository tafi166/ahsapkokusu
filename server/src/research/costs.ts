import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import type { CostInput, CostResult } from '../../../src/pages/admin/research/costTypes';
const D = Prisma.Decimal;
const numberPattern = /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/;
const amount = z.string().regex(numberPattern, 'En fazla iki ondalık basamaklı, negatif olmayan sayı girin.');
const percent = amount.refine((v) => numberPattern.test(v) && new D(v).lt(100), 'Yüzde 100’den küçük olmalı.');
export const costInput = z.object({
  currency: z.enum(['TRY','USD']), quantity: z.string().regex(/^[1-9]\d{0,4}$/),
  materialCost: amount, wastePercent: amount.refine((v) => numberPattern.test(v) && new D(v).lte(100)),
  laborMinutes: amount, laborHourlyRate: amount, machineMinutes: amount, machineHourlyRate: amount,
  finishingCost: amount, overheadCost: amount, packagingPerUnit: amount, shippingPerUnit: amount,
  salePrice: amount, feePercent: percent, fixedFee: amount, targetMargin: percent,
}).strict().refine((v) => numberPattern.test(v.feePercent) && numberPattern.test(v.targetMargin) && new D(v.feePercent).plus(v.targetMargin).lt(100), 'Komisyon ve hedef marj toplamı 100’den küçük olmalı.');
export const costSave = z.object({name:z.string().trim().min(1).max(120),input:costInput}).strict();
export const costUpdate = costSave.extend({version:z.number().int().positive()});

/** Tax-exclusive, single currency, one unit per order; never trust client totals. */
export function calculateCost(input: CostInput): CostResult {
  const v = costInput.parse(input);
  const batch = new D(v.materialCost).mul(new D(1).plus(new D(v.wastePercent).div(100)))
    .plus(new D(v.laborMinutes).mul(v.laborHourlyRate).div(60))
    .plus(new D(v.machineMinutes).mul(v.machineHourlyRate).div(60))
    .plus(v.finishingCost).plus(v.overheadCost);
  const unit = batch.div(v.quantity).plus(v.packagingPerUnit).plus(v.shippingPerUnit);
  const fee = new D(v.feePercent).div(100);
  const contribution = new D(v.salePrice).mul(new D(1).minus(fee)).minus(v.fixedFee).minus(unit);
  const money = (n: Prisma.Decimal) => n.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
  const ceil = (n: Prisma.Decimal) => n.toDecimalPlaces(2, D.ROUND_CEIL).toFixed(2);
  return { formulaVersion:'1',currency:v.currency,
    batchCost:money(batch.plus(new D(v.packagingPerUnit).plus(v.shippingPerUnit).mul(v.quantity))),
    unitCost:money(unit),contribution:money(contribution),
    marginPercent:new D(v.salePrice).isZero()?null:money(contribution.div(v.salePrice).mul(100)),
    breakEvenPrice:ceil(unit.plus(v.fixedFee).div(new D(1).minus(fee))),
    targetPrice:ceil(unit.plus(v.fixedFee).div(new D(1).minus(fee).minus(new D(v.targetMargin).div(100)))),
  };
}
