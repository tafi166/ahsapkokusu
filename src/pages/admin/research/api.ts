import { request } from '@/lib/adminApi';
export interface Collection { id: string; name: string; description: string; version: number }
export interface Item { id: string; title: string; sourceUrl: string | null; notes: string; archived: boolean; version: number; collections: { collectionId: string }[] }
export interface ItemInput { title: string; sourceUrl: string | null; notes: string; archived: boolean; collectionIds: string[] }
export interface ItemPage { items: Item[]; total: number; page: number; pageSize: number }
export const researchApi = {
  status: () => request<{ enabled: boolean }>('GET', '/api/admin/research/status'),
  items: (query: URLSearchParams) => request<ItemPage>('GET', `/api/admin/research/items?${query}`),
  collections: () => request<Collection[]>('GET', '/api/admin/research/collections'),
  saveItem: (input: ItemInput, item?: Item) => request<Item>(item ? 'PUT' : 'POST', `/api/admin/research/items${item ? `/${item.id}` : ''}`, { ...input, ...(item ? { version: item.version } : {}) }),
  saveCollection: (input: { name: string; description: string }, item?: Collection) => request<Collection>(item ? 'PUT' : 'POST', `/api/admin/research/collections${item ? `/${item.id}` : ''}`, { ...input, ...(item ? { version: item.version } : {}) }),
};
