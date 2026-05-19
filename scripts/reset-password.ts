/**
 * Interactive password reset untuk semua user di tabel `users`.
 *
 * Usage:  pnpm tsx scripts/reset-password.ts
 *
 * Untuk setiap user di DB, prompt password baru (hidden input — char tidak
 * dicetak ke terminal), lalu hash dengan bcryptjs dan simpan.
 * Skip user dengan menekan Enter di prompt (kosong → skip).
 * Batal dengan Ctrl+C kapan saja.
 */
import readline from "readline";
import { Writable } from "stream";
import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MIN_PASSWORD_LENGTH = 6;

// Writable yang silently absorb byte — dipakai supaya readline tidak echo
// karakter password yang sedang diketik ke terminal.
const mutedStdout = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutedStdout,
      terminal: true,
    });
    process.stdout.write(question);
    rl.question("", (answer) => {
      process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true },
  });

  if (users.length === 0) {
    console.log("Tidak ada user di database. Jalankan `pnpm db:seed` dulu.");
    return;
  }

  console.log("");
  console.log("=== Reset Password ===");
  console.log(`Ditemukan ${users.length} user:`);
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name} <${u.email}> [${u.role}]`);
  });
  console.log("");
  console.log("Tekan Enter (kosong) untuk skip user. Ctrl+C untuk batal.");
  console.log("");

  const updated: Array<{ name: string; email: string }> = [];
  const skipped: Array<{ name: string; email: string }> = [];

  for (const u of users) {
    let pw1 = "";
    let pw2 = "";

    while (true) {
      pw1 = await askHidden(`Password baru untuk ${u.name} (${u.email}): `);
      if (pw1.length === 0) {
        console.log(`  ⏭  Skip ${u.name}`);
        skipped.push({ name: u.name, email: u.email });
        break;
      }
      if (pw1.length < MIN_PASSWORD_LENGTH) {
        console.log(`  ⚠  Minimum ${MIN_PASSWORD_LENGTH} karakter, coba lagi.`);
        continue;
      }
      pw2 = await askHidden(`Ulangi password untuk ${u.name}: `);
      if (pw1 !== pw2) {
        console.log("  ⚠  Password tidak sama, coba lagi.");
        continue;
      }
      const passwordHash = await bcrypt.hash(pw1, 10);
      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash },
      });
      console.log(`  ✅ Password ${u.name} berhasil diupdate`);
      updated.push({ name: u.name, email: u.email });
      break;
    }
  }

  console.log("");
  console.log("=== Ringkasan ===");
  console.log(`Updated (${updated.length}):`);
  if (updated.length === 0) {
    console.log("  (tidak ada)");
  } else {
    updated.forEach((u) => console.log(`  ✅ ${u.name} <${u.email}>`));
  }
  if (skipped.length > 0) {
    console.log(`Skipped (${skipped.length}):`);
    skipped.forEach((u) => console.log(`  ⏭  ${u.name} <${u.email}>`));
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n❌ Reset password failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
