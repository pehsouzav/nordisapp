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
    title_reset: "Redefinir senha",
    subtitle_signup: "Gratuito — salva seu roteiro e libera o acesso.",
    subtitle_signin: "Bem-vindo de volta!",
    subtitle_reset: "Enviaremos um link para redefinir sua senha.",
    email: "E-mail",
    password: "Senha",
    password_hint: "Mínimo 6 caracteres",
    btn_signup: "Criar conta",
    btn_signin: "Entrar",
    btn_reset: "Enviar link de redefinição",
    forgot_password: "Esqueceu a senha?",
    reset_sent: "Verifique sua caixa de entrada e clique no link enviado.",
    back_to_signin: "← Voltar para o login",
    switch_to_signin: "Já tem conta? Entrar",
    switch_to_signup: "Não tem conta? Criar agora",
    error_generic: "Algo deu errado. Tente novamente.",
  },
  en: {
    title_signup: "Create your account",
    title_signin: "Sign in",
    title_reset: "Reset password",
    subtitle_signup: "Free — saves your itinerary and unlocks access.",
    subtitle_signin: "Welcome back!",
    subtitle_reset: "We'll send you a link to reset your password.",
    email: "Email",
    password: "Password",
    password_hint: "At least 6 characters",
    btn_signup: "Create account",
    btn_signin: "Sign in",
    btn_reset: "Send reset link",
    forgot_password: "Forgot password?",
    reset_sent: "Check your inbox and click the link we sent.",
    back_to_signin: "← Back to sign in",
    switch_to_signin: "Already have an account? Sign in",
    switch_to_signup: "No account? Create one",
    error_generic: "Something went wrong. Please try again.",
  },
  es: {
    title_signup: "Crea tu cuenta",
    title_signin: "Inicia sesión",
    title_reset: "Restablecer contraseña",
    subtitle_signup: "Gratis — guarda tu itinerario y desbloquea el acceso.",
    subtitle_signin: "¡Bienvenido de nuevo!",
    subtitle_reset: "Te enviaremos un enlace para restablecer tu contraseña.",
    email: "Correo electrónico",
    password: "Contraseña",
    password_hint: "Mínimo 6 caracteres",
    btn_signup: "Crear cuenta",
    btn_signin: "Entrar",
    btn_reset: "Enviar enlace",
    forgot_password: "¿Olvidaste tu contraseña?",
    reset_sent: "Revisa tu bandeja de entrada y haz clic en el enlace enviado.",
    back_to_signin: "← Volver al inicio de sesión",
    switch_to_signin: "¿Ya tienes cuenta? Entrar",
    switch_to_signup: "¿No tienes cuenta? Crear ahora",
    error_generic: "Algo salió mal. Inténtalo de nuevo.",
  },
};

export default function AuthModal({ lang, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"signup" | "signin" | "reset">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const c = copy[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "reset") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);
      if (err) {
        setError(err.message || c.error_generic);
      } else {
        setResetSent(true);
      }
      return;
    }

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

  function switchMode(next: "signup" | "signin" | "reset") {
    setMode(next);
    setError("");
    setResetSent(false);
  }

  const title = mode === "signup" ? c.title_signup : mode === "signin" ? c.title_signin : c.title_reset;
  const subtitle = mode === "signup" ? c.subtitle_signup : mode === "signin" ? c.subtitle_signin : c.subtitle_reset;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-night)" }}>{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        {/* Reset success */}
        {resetSent ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{c.reset_sent}</p>
            <button
              onClick={() => switchMode("signin")}
              className="w-full text-sm text-center font-medium"
              style={{ color: "var(--color-ocean)" }}
            >
              {c.back_to_signin}
            </button>
          </div>
        ) : (
          <>
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

              {mode !== "reset" && (
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
              )}

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-xs font-medium"
                  style={{ color: "var(--color-ocean)" }}
                >
                  {c.forgot_password}
                </button>
              )}

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
                {loading ? "..." : mode === "signup" ? c.btn_signup : mode === "signin" ? c.btn_signin : c.btn_reset}
              </button>
            </form>

            {/* Switch mode */}
            {mode === "reset" ? (
              <button
                onClick={() => switchMode("signin")}
                className="w-full text-sm text-center font-medium"
                style={{ color: "var(--color-ocean)" }}
              >
                {c.back_to_signin}
              </button>
            ) : (
              <button
                onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                className="w-full text-sm text-center font-medium"
                style={{ color: "var(--color-ocean)" }}
              >
                {mode === "signup" ? c.switch_to_signin : c.switch_to_signup}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
