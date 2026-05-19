"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
}

function PasswordField({ id, label, value, onChange, autoComplete, disabled }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pr-9"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side validation (server tetap re-validate)
    if (!currentPassword) {
      setError("Password lama wajib diisi");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password baru tidak cocok");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru harus berbeda dari password lama");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah password");
        return;
      }
      toast.success(data.message ?? "Password berhasil diubah");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Ganti Password
          </DialogTitle>
          <DialogDescription>
            Masukkan password lama lalu password baru. Minimal {MIN_PASSWORD_LENGTH} karakter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordField
            id="current-password"
            label="Password Lama"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            disabled={loading}
          />
          <PasswordField
            id="new-password"
            label="Password Baru"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordField
            id="confirm-password"
            label="Konfirmasi Password Baru"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            disabled={loading}
          />

          {error && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
