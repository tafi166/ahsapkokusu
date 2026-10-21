import { useEffect, useState, type FormEvent } from "react";
import { adminApi, errorMessage, type AdminUser, type StaffUser } from "@/lib/adminApi";
import { AdminButton, Field, SectionCard, TextInput } from "@/pages/admin/controls";

const ROLE_LABEL: Record<AdminUser["role"], string> = { ADMIN: "Yönetici", EDITOR: "Editör" };

/** Staff accounts (ADMIN only). The server enforces who may change what; this shows its answer. */
export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "EDITOR" as AdminUser["role"], password: "" });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function act(task: () => Promise<string>) {
    setError(null);
    setMessage(null);
    try {
      setMessage(await task());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const replace = (updated: StaffUser) => setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      const created = await adminApi.createUser(form);
      setUsers((prev) => [...(prev ?? []), created]);
      setForm({ email: "", name: "", role: "EDITOR", password: "" });
      return `${created.email} eklendi.`;
    });
  }

  function handleReset(user: StaffUser) {
    const password = window.prompt(`${user.email} için yeni şifre (en az 12 karakter):`);
    if (!password) return;
    void act(async () => {
      await adminApi.resetUserPassword(user.id, password);
      return `${user.email} şifresi değiştirildi; açık oturumları kapatıldı.`;
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Kullanıcılar</h2>
        <p className="text-sm text-black/55">
          Panele erişebilen hesaplar. Editörler içerik ve teklifleri yönetir; yöneticiler ayrıca kullanıcıları yönetir.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      ) : null}

      {users === null && !error ? <p className="text-sm text-black/50">Yükleniyor…</p> : null}
      <ul className="space-y-2">
        {users?.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
            <div className="min-w-48 flex-1">
              <p className="font-medium">
                {u.name} {u.id === currentUserId ? <span className="text-xs text-black/45">(siz)</span> : null}
              </p>
              <p className="text-xs text-black/55">{u.email}</p>
            </div>
            <select
              aria-label={`${u.email} rolü`}
              value={u.role}
              onChange={(e) => void act(async () => {
                replace(await adminApi.updateUser(u.id, { role: e.target.value as AdminUser["role"] }));
                return `${u.email} rolü güncellendi.`;
              })}
              className="rounded-md border border-black/15 bg-white px-2 py-1"
            >
              {(Object.keys(ROLE_LABEL) as AdminUser["role"][]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <span className={u.isActive ? "text-green-700" : "text-black/45"}>{u.isActive ? "Etkin" : "Devre dışı"}</span>
            <AdminButton
              variant="outline"
              onClick={() => void act(async () => {
                replace(await adminApi.updateUser(u.id, { isActive: !u.isActive }));
                return u.isActive ? `${u.email} devre dışı bırakıldı; oturumları kapatıldı.` : `${u.email} etkinleştirildi.`;
              })}
            >
              {u.isActive ? "Devre Dışı Bırak" : "Etkinleştir"}
            </AdminButton>
            <AdminButton variant="outline" onClick={() => handleReset(u)}>
              Şifre Sıfırla
            </AdminButton>
          </li>
        ))}
      </ul>

      <SectionCard title="Yeni Kullanıcı" description="Şifreyi kişiye güvenli bir kanaldan iletin; ilk girişten sonra kendisi değiştirebilir.">
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <Field label="E-posta">
            <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Ad Soyad">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Rol">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminUser["role"] })}
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="EDITOR">Editör</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </Field>
          <Field label="Geçici Şifre" hint="En az 12 karakter.">
            <TextInput
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <AdminButton type="submit">Kullanıcı Ekle</AdminButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
