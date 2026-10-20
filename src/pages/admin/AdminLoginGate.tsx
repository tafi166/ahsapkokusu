import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { tryAdminLogin } from "@/pages/admin/adminAuth";
import { AdminButton, TextInput } from "@/pages/admin/controls";

export function AdminLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (tryAdminLogin(password)) {
      onSuccess();
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Yönetim Paneli</h1>
        <p className="mt-1 text-sm text-black/55">Devam etmek için erişim şifresini girin.</p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">Şifre</span>
          <TextInput
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
          />
        </label>
        {error ? <p className="mt-2 text-sm text-red-600">Şifre yanlış.</p> : null}

        <AdminButton type="submit" className="mt-4 w-full justify-center">
          Giriş Yap
        </AdminButton>

        <p className="mt-4 text-xs text-black/40">
          Bu, gerçek bir kimlik doğrulama sistemi değildir — sadece panele yanlışlıkla tıklanmasını önler.
          Şifre uygulama kodunda düz metin olarak bulunur (<code>src/pages/admin/adminAuth.ts</code>). Bu
          paneli herkese açık bir alan adında yayınlamadan önce gerçek bir kimlik doğrulama katmanı ekleyin.
        </p>
        <Link to="/" className="mt-3 inline-block text-xs underline">
          ← Siteye dön
        </Link>
      </form>
    </div>
  );
}
