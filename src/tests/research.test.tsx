import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResearchStudio } from '@/pages/admin/research/ResearchStudio';
import { researchApi } from '@/pages/admin/research/api';
vi.mock('@/pages/admin/research/api', () => ({ researchApi: { status: vi.fn(), items: vi.fn(), collections: vi.fn(), saveItem: vi.fn(), saveCollection: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function setup(enabled = true) {
  vi.mocked(researchApi.status).mockResolvedValue({ enabled });
  vi.mocked(researchApi.items).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 30 });
  vi.mocked(researchApi.collections).mockResolvedValue([]);
  render(<MemoryRouter initialEntries={['/admin/research']}><ResearchStudio /></MemoryRouter>);
}
describe('research library', () => {
  it('shows disabled state without reading private records', async () => {
    setup(false); expect(await screen.findByText(/Bu ortamda Araştırma Stüdyosu kapalı/)).toBeInTheDocument(); expect(researchApi.items).not.toHaveBeenCalled();
  });
  it('saves a manual record without enabling external imports', async () => {
    setup(); const u = userEvent.setup(); await u.type(await screen.findByLabelText('Başlık'), 'Yeni fikir');
    await u.type(screen.getByLabelText('Araştırma notları'), 'Ceviz panel');
    await u.click(screen.getByRole('button', { name: 'Araştırmayı kaydet' }));
    expect(researchApi.saveItem).toHaveBeenCalledWith({ title: 'Yeni fikir', notes: 'Ceviz panel', sourceUrl: null, archived: false, collectionIds: [] }, undefined);
    expect(await screen.findByText(/Kaydedildi. Araştırma/)).toBeInTheDocument();
  });
  it('preserves the form after a failed save', async () => {
    setup(); vi.mocked(researchApi.saveItem).mockRejectedValue(new Error('Çakışma'));
    const u = userEvent.setup(); await u.type(await screen.findByLabelText('Başlık'), 'Korunacak fikir');
    await u.click(screen.getByRole('button', { name: 'Araştırmayı kaydet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Çakışma'); expect(screen.getByLabelText('Başlık')).toHaveValue('Korunacak fikir');
  });
  it('creates a collection from the tablet navigation', async () => {
    setup(); const u = userEvent.setup(); await screen.findByLabelText('Başlık');
    await u.click(screen.getByRole('button', { name: 'Koleksiyonlar' }));
    await u.type(screen.getByLabelText('Koleksiyon adı'), 'Saatler');
    await u.click(screen.getByRole('button', { name: 'Koleksiyonu kaydet' }));
    expect(researchApi.saveCollection).toHaveBeenCalledWith({ name: 'Saatler', description: '' }, undefined);
  });
});
