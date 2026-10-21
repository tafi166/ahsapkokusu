import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/lib/adminApi";
import { AdminButton, TextInput } from "@/pages/admin/controls";

export function AdminLoginGate({
  onLogin,
  initialError,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Yönetim Paneli</h1>
        <p className="mt-1 text-sm text-black/55">Devam etmek için hesabınızla giriş yapın.</p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">E-posta</span>
          <TextInput type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">Şifre</span>
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <AdminButton type="submit" className="mt-4 w-full justify-center" disabled={submitting}>
          {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </AdminButton>

        <p className="mt-4 text-xs text-black/40">
          Hesaplar sunucuda yönetilir. İlk yönetici hesabı <code>server/</code> klasöründe{" "}
          <code>npm run admin:create</code> ile oluşturulur.
        </p>
        <Link to="/" className="mt-3 inline-block text-xs underline">
          ← Siteye dön
        </Link>
      </form>
    </div>
  );
}
