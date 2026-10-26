import { useEffect, useState } from "react";
import { allCategories as categories } from "@/data/categories";
import { adminApi, errorMessage, type ContactMessage, type MessageStatus } from "@/lib/adminApi";
import { AdminButton } from "@/pages/admin/controls";

const STATUS_LABEL: Record<MessageStatus, string> = {
  NEW: "Yeni",
  ANSWERED: "Yanıtlandı",
  CLOSED: "Kapandı",
};

const KIND_LABEL: Record<ContactMessage["kind"], string> = {
  CONTACT: "İletişim",
  DESIGN: "Özel tasarım fikri",
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

/** Messages from the contact page, product "ask about this" buttons and the custom-design idea form. */
export function MessagesTab() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setMessages(await adminApi.listMessages());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listMessages()
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeStatus(id: string, status: MessageStatus) {
    setError(null);
    try {
      const updated = await adminApi.setMessageStatus(id, status);
      setMessages((prev) => prev?.map((m) => (m.id === id ? updated : m)) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const unread = messages?.filter((m) => m.status === "NEW").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mesajlar</h2>
          <p className="text-sm text-black/55">
            İletişim formu, ürün sayfalarındaki "Bu Ürünü Sor" butonu ve özel tasarım fikir formundan gelen mesajlar. Yanıtları
            e-postayla gönderin; site e-posta göndermez.
            {unread > 0 ? ` ${unread} yeni mesaj var.` : ""}
          </p>
        </div>
        <AdminButton variant="outline" onClick={() => void load()}>
          Yenile
        </AdminButton>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {messages === null && !error ? <p className="text-sm text-black/50">Yükleniyor…</p> : null}
      {messages?.length === 0 ? <p className="text-sm text-black/50">Henüz mesaj yok.</p> : null}

      <ul className="space-y-3">
        {messages?.map((m) => (
          <li key={m.id} className="rounded-lg border border-black/10 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {m.status === "NEW" ? <span className="mr-2 rounded bg-black px-1.5 py-0.5 text-[10px] text-white">YENİ</span> : null}
                  {m.name} · {KIND_LABEL[m.kind]}
                </p>
                <p className="text-xs text-black/50">{dateFormat.format(new Date(m.createdAt))}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                Durum
                <select
                  value={m.status}
                  onChange={(e) => void changeStatus(m.id, e.target.value as MessageStatus)}
                  aria-label={`${m.name} mesajının durumu`}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                >
                  {(Object.keys(STATUS_LABEL) as MessageStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div>
                <dt className="inline text-black/50">İletişim: </dt>
                <dd className="inline">
                  <a href={`mailto:${m.email}`} className="underline">
                    {m.email}
                  </a>
                  {m.phone ? ` · ${m.phone}` : ""}
                </dd>
              </div>
              {m.productTitle ? (
                <div>
                  <dt className="inline text-black/50">Ürün: </dt>
                  <dd className="inline">{m.productTitle}</dd>
                </div>
              ) : null}
              {m.categorySlug ? (
                <div>
                  <dt className="inline text-black/50">Kategori: </dt>
                  <dd className="inline">{categories.find((c) => c.slug === m.categorySlug)?.title ?? m.categorySlug}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-2 whitespace-pre-line rounded-md bg-black/[0.03] p-2 text-black/70">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
