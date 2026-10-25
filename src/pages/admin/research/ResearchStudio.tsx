import { CostCalculator } from './CostCalculator';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/lib/adminApi';
import { Field, TextArea, TextInput } from '../controls';
import { researchApi, type Collection, type Item, type ItemInput, type ItemPage } from './api';

const button = 'inline-flex min-h-11 items-center justify-center rounded-md border border-divider bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-warm-soft disabled:opacity-50';
const empty: ItemInput = { title: '', sourceUrl: null, notes: '', archived: false, collectionIds: [] };

export function ResearchStudio() {
  const [params, setParams] = useSearchParams();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [data, setData] = useState<ItemPage>({ items: [], total: 0, page: 1, pageSize: 30 });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [editing, setEditing] = useState<Item>();
  const [form, setForm] = useState<ItemInput>(empty);
  const [collection, setCollection] = useState<Collection>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const isCosts = params.get('view') === 'costs';
  const isCollections = params.get('view') === 'collections';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const archived = params.get('archived') === 'true';
  const collectionId = params.get('collectionId') ?? '';

  function param(key: string, value: string) {
    setParams((old) => { const next = new URLSearchParams(old); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  }
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const status = await researchApi.status();
          if (!active) return;
          setEnabled(status.enabled);
          if (!status.enabled) return;
          const query = new URLSearchParams({ q, page: String(page), archived: String(archived) });
          if (collectionId) query.set('collectionId', collectionId);
          const [items, groups] = await Promise.all([researchApi.items(query), researchApi.collections()]);
          if (active) { setData(items); setCollections(groups); }
        } catch (e) { if (active) setError(errorMessage(e)); }
        finally { if (active) setLoading(false); }
      })();
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [q, page, archived, collectionId, refresh]);

  async function save(task: () => Promise<unknown>, reset: () => void) {
    setBusy(true); setError(''); setMessage('');
    try { await task(); reset(); setMessage('Kaydedildi. Araştırma verileri mağazada yayımlanmaz.'); setRefresh((n) => n + 1); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  function edit(item: Item) {
    setEditing(item); setForm({ title: item.title, sourceUrl: item.sourceUrl, notes: item.notes, archived: item.archived, collectionIds: item.collections.map((c) => c.collectionId) }); setMessage('');
  }

  return <section className="min-w-0 space-y-5 rounded-xl border border-line bg-paper-soft p-4 text-body md:p-6" aria-label="Araştırma Stüdyosu">
    <div><p className="text-xs uppercase tracking-widest text-success">Ahşap Kokusu · Özel çalışma alanı</p><h2 className="mt-2 text-2xl">Araştırma Stüdyosu</h2><p className="mt-2 text-sm">Manuel araştırmalarınızı ve koleksiyonlarınızı saklayın. Etsy, AI, görsel indirme ve otomatik yayın kapalıdır.</p></div>
    {error && <div role="alert" className="rounded border border-danger p-3 text-sm">{error} Oturumunuz sona erdiyse yeniden giriş yapın. Çakışma varsa kaydı yenileyip yeniden açın; formunuz korunur.</div>}
    {message && <p role="status" className="text-sm text-success">{message}</p>}
    {enabled === false ? <p role="status">Bu ortamda Araştırma Stüdyosu kapalı. Sunucu ortam ayarlarında RESEARCH_ENABLED etkinleştirilmelidir.</p> : enabled === null ? <p role="status">Erişim kontrol ediliyor…</p> : <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Araştırma bölümleri">
        <button className={button} aria-pressed={!isCollections && !isCosts} onClick={() => param('view', '')}>Kütüphane</button>
        <button className={button} aria-pressed={isCollections} onClick={() => param('view', 'collections')}>Koleksiyonlar</button>
        <button className={button} aria-pressed={isCosts} onClick={() => param('view', 'costs')}>Maliyet & Kârlılık</button>
        <button className={button} disabled={busy} onClick={() => { setError(''); setRefresh((n) => n + 1); }}>Yenile</button>
      </div>
      {isCosts ? <CostCalculator /> : isCollections ? <>
        <form className="space-y-3 rounded-lg bg-paper p-4" onSubmit={(e) => { e.preventDefault(); void save(() => researchApi.saveCollection({ name, description }, collection), () => { setName(''); setDescription(''); setCollection(undefined); }); }}>
          <h3 className="text-lg">{collection ? 'Koleksiyonu düzenle' : 'Yeni koleksiyon'}</h3>
          <Field label="Koleksiyon adı"><TextInput required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} /></Field>
          <Field label="Açıklama"><TextArea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} /></Field>
          <button className={button} disabled={busy}>Koleksiyonu kaydet</button>
          {collection && <button type="button" className={button} disabled={busy} onClick={() => { setCollection(undefined); setName(''); setDescription(''); }}>Vazgeç</button>}
        </form>
        <ul className="space-y-2">{collections.map((c) => <li key={c.id} className="rounded-lg border border-line bg-paper p-4"><p className="font-medium">{c.name}</p><p className="whitespace-pre-wrap break-words text-sm">{c.description}</p><button className={button} disabled={busy} onClick={() => { setCollection(c); setName(c.name); setDescription(c.description); }}>Düzenle: {c.name}</button></li>)}</ul>
        {!collections.length && <p>Henüz koleksiyon yok.</p>}
      </> : <>
        <form className="space-y-3 rounded-lg bg-paper p-4" onSubmit={(e) => { e.preventDefault(); void save(() => researchApi.saveItem(form, editing), () => { setEditing(undefined); setForm(empty); }); }}>
          <h3 className="text-lg">{editing ? 'Araştırmayı düzenle' : 'Yeni manuel araştırma'}</h3>
          <Field label="Başlık"><TextInput required maxLength={200} value={form.title} disabled={busy} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Kaynak URL (isteğe bağlı)" hint="Yalnızca HTTPS. Bu adres otomatik olarak indirilmez."><TextInput type="url" pattern="https://.*" maxLength={2048} value={form.sourceUrl ?? ''} disabled={busy} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value || null })} /></Field>
          <Field label="Araştırma notları"><TextArea rows={5} maxLength={12000} value={form.notes} disabled={busy} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <fieldset disabled={busy}><legend className="text-sm">Koleksiyonlar (en fazla 30)</legend><div className="flex flex-wrap gap-2">{collections.map((c) => <label key={c.id} className="flex min-h-11 items-center gap-2 rounded border border-line px-3"><input type="checkbox" checked={form.collectionIds.includes(c.id)} onChange={(e) => setForm({ ...form, collectionIds: e.target.checked ? [...form.collectionIds, c.id] : form.collectionIds.filter((id) => id !== c.id) })} />{c.name}</label>)}</div></fieldset>
          {editing && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={busy} checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} />Arşivlendi</label>}
          <div className="flex gap-2"><button className={button} disabled={busy}>Araştırmayı kaydet</button>{editing && <button type="button" className={button} disabled={busy} onClick={() => { setEditing(undefined); setForm(empty); }}>Vazgeç</button>}</div>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kütüphanede ara"><TextInput value={q} maxLength={200} onChange={(e) => param('q', e.target.value)} /></Field>
          <Field label="Koleksiyon filtresi"><select className="min-h-11 w-full rounded border border-divider bg-paper px-3" value={collectionId} onChange={(e) => param('collectionId', e.target.value)}><option value="">Tüm koleksiyonlar</option>{collections.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={archived} onChange={(e) => param('archived', String(e.target.checked))} />Arşivlenenler</label>
        </div>
        {loading ? <p role="status">Kütüphane yükleniyor…</p> : <>
          <p className="text-sm">{data.total} araştırma</p>
          <ul className="space-y-3">{data.items.map((item) => <li key={item.id} className="space-y-2 rounded-lg border border-line bg-paper p-4"><h3 className="break-words text-lg">{item.title}</h3><p className="whitespace-pre-wrap break-words text-sm">{item.notes}</p>{item.sourceUrl && <a className="inline-flex min-h-11 items-center break-all text-sm underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Kaynağı aç</a>}<div><button className={button} disabled={busy} onClick={() => edit(item)}>Düzenle: {item.title}</button></div></li>)}</ul>
          {!data.items.length && <p>Araştırma bulunamadı.</p>}
          <div className="flex items-center gap-3"><button className={button} disabled={page <= 1} onClick={() => param('page', String(page - 1))}>Önceki</button><span>Sayfa {page}</span><button className={button} disabled={page * 30 >= data.total} onClick={() => param('page', String(page + 1))}>Sonraki</button></div>
        </>}
      </>}
      <p className="text-xs">Kaydetmeden ayrılırsanız formdaki değişiklikler kaybolur. Kaynak bağlantısı kullanım veya görsel yayın izni sağlamaz.</p>
    </>}
  </section>;
}
