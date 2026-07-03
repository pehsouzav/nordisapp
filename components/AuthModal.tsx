"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  onSuccess: () => void;
  onClose: () => void;
}

const copy = {
  pt: {
    title_signup: "Crie sua conta",
    title_signin: "Entre na sua conta",
    subtitle_signup: "Gratuito — salva seu roteiro e libera o acesso.",
    subtitle_signin: "Bem-vindo de volta!",
    email: "E-mail",
    password: "Senha",
    password_hint: "Mínimo 6 caracteres",
    btn_signup: "Criar conta",
    btn_signin: "Entrar",
    switch_to_signin: "Já tem conta? Entrar",
    switch_to_signup: "Não tem conta? Criar agora",
    error_generic: "Algo deu errado. Tente novamente.",
  },
  en: {
    title_signup: "Create your account",
    title_signin: "Sign in",
    subtitle_signup: "Free — saves your itinerary and unlocks access.",
    subtitle_signin: "Welcome back!",
    email: "Email",
    password: "Password",
    password_hint: "At least 6 characters",
    btn_signup: "Create account",
    btn_signin: "Sign in",
    switch_to_signin: "Already have an account? Sign in",
    switch_to_signup: "No account? Create one",
    error_generic: "Something went wrong. Please try again.",
  },
  es: {
    title_signup: "Crea tu cuenta",
    title_signin: "Inicia sesión",
    subtitle_signup: "Gratis — guarda tu itinerario y desbloquea el acceso.",
    subtitle_signin: "¡Bienvenido de nuevo!",
    email: "Correo electrónico",
    password: "Contraseña",
    password_hint: "Mínimo 6 caracteres",
    btn_signup: "Crear cuenta",
    btn_signin: "Entrar",
    switch_to_signin: "¿Ya tienes cuenta? Entrar",
    switch_to_signup: "¿No tienes cuenta? Crear ahora",
    error_generic: "Algo salió mal. Inténtalo de nuevo.",
  },
};

export default function AuthModal({ lang, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const c = copy[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message || c.error_generic);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message || c.error_generic);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-night)" }}>
            {mode === "signup" ? c.title_signup : c.title_signin}
          </h2>
          <p className="text-sm text-gray-500">
            {mode === "signup" ? c.subtitle_signup : c.subtitle_signin}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{c.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--color-ocean)" } as React.CSSProperties}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{c.password}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--color-ocean)" } as React.CSSProperties}
            />
            <p className="text-xs text-gray-400">{c.password_hint}</p>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: "var(--color-sunset)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3 font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{ background: "var(--color-ocean)" }}
          >
            {loading ? "..." : mode === "signup" ? c.btn_signup : c.btn_signin}
          </button>
        </form>

        {/* Switch mode */}
        <button
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
          className="w-full text-sm text-center font-medium"
          style={{ color: "var(--color-ocean)" }}
        >
          {mode === "signup" ? c.switch_to_signin : c.switch_to_signup}
        </button>
      </div>
    </div>
  );
}
