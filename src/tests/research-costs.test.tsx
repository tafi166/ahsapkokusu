import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CostCalculator } from '@/pages/admin/research/CostCalculator';
import { request } from '@/lib/adminApi';
vi.mock('@/lib/adminApi',()=>({request:vi.fn(),errorMessage:(e:Error)=>e.message}));
const result={formulaVersion:'1',currency:'TRY',unitCost:'230.00',batchCost:'2300.00',contribution:'215.00',marginPercent:'43.00',breakEvenPrice:'261.12',targetPrice:'391.67'};
afterEach(()=>{cleanup();vi.resetAllMocks();});
describe('saved cost calculator',()=>{
  it('calculates through the private API and invalidates stale totals when assumptions change',async()=>{
    vi.mocked(request).mockResolvedValueOnce([]).mockResolvedValueOnce(result);
    render(<CostCalculator/>);const u=userEvent.setup();await screen.findByText('Henüz kaydedilmiş senaryo yok.');
    await u.click(screen.getByRole('button',{name:'Hesapla'}));
    expect(await screen.findByText('391.67')).toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith('POST','/api/admin/research/costs/calculate',expect.objectContaining({quantity:'1',currency:'TRY'}));
    await u.clear(screen.getByLabelText('Parti malzeme maliyeti'));await u.type(screen.getByLabelText('Parti malzeme maliyeti'),'12,50');
    expect(screen.getByLabelText('Parti malzeme maliyeti')).toHaveValue('12.50');expect(screen.queryByText('391.67')).not.toBeInTheDocument();
  });
  it('preserves values on a failed save and never sends client totals',async()=>{
    vi.mocked(request).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Oturum sona erdi'));
    render(<CostCalculator/>);const u=userEvent.setup();await u.type(screen.getByLabelText('Senaryo adı'),'Ceviz');
    await u.click(screen.getByRole('button',{name:'Senaryoyu kaydet'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Oturum sona erdi');expect(screen.getByLabelText('Senaryo adı')).toHaveValue('Ceviz');
    expect(request).toHaveBeenLastCalledWith('POST','/api/admin/research/costs',{name:'Ceviz',input:expect.objectContaining({quantity:'1'})});
  });
});
