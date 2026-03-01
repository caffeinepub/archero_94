import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { cn } from "@/lib/utils";
import { Swords, LogIn, Loader2, ShieldCheck } from "lucide-react";

export function LoginScreen() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <div className="animate-slide-up-fade flex flex-col items-center gap-6 p-10 bg-gradient-to-b from-card to-background border-2 border-border rounded-2xl max-w-sm w-full mx-4">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.35)]">
          <Swords className="w-10 h-10 text-accent-foreground" />
        </div>

        <h1 className="font-display text-2xl font-bold text-accent tracking-[0.2em]">
          ARCHERO
        </h1>

        <p className="text-muted-foreground text-sm text-center leading-relaxed">
          Battle through dungeons, collect skills, and defeat epic bosses.
        </p>

        {isLoginError && (
          <div className="w-full text-destructive text-xs text-center p-3 border border-destructive/30 rounded-lg bg-destructive/10">
            {loginError?.message ?? "Login failed. Please try again."}
          </div>
        )}

        <button
          onClick={login}
          disabled={isLoggingIn}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold text-sm tracking-wide transition-all border-0",
            isLoggingIn
              ? "bg-emerald-500/30 text-emerald-300 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:brightness-110 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.3)]",
          )}
        >
          {isLoggingIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {isLoggingIn ? "Signing in..." : "Sign in with Internet Identity"}
        </button>

        <div className="flex items-center gap-1.5 text-muted-foreground/50 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure, private, no passwords</span>
        </div>
      </div>
    </div>
  );
}
