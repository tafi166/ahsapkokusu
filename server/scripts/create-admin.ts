// Creates an ADMIN user. The password is typed at a hidden prompt — never passed as an
// argument or environment variable, so it doesn't end up in shell history or logs.
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../src/auth/crypto';
import { isUniqueConflict } from '../src/common/errors';
import { createPrismaClient } from '../src/prisma/prisma';
import { createUserSchema } from '../src/users/users.schemas';

async function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          reject(new Error('Cancelled'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error('Run this in an interactive terminal (the password is read from a hidden prompt).');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (server/.env)');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = await rl.question('E-posta: ');
  const name = await rl.question('Ad Soyad: ');
  rl.close();
  const password = await askHidden('Şifre (en az 12 karakter): ');
  const repeat = await askHidden('Şifre (tekrar): ');
  if (password !== repeat) throw new Error('Şifreler eşleşmiyor.');

  const parsed = createUserSchema.safeParse({ email, name, role: 'ADMIN', password });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(' '));

  const prisma = createPrismaClient(url);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: parsed.data.email, name: parsed.data.name, role: 'ADMIN', passwordHash: await hashPassword(password) },
      });
      await tx.auditLog.create({
        data: { actorUserId: null, action: 'user.created', entityType: 'User', entityId: created.id, details: { role: 'ADMIN', via: 'cli' } },
      });
      return created;
    });
    console.log(`Yönetici oluşturuldu: ${user.email}`);
  } catch (e) {
    if (isUniqueConflict(e)) throw new Error('Bu e-posta ile bir kullanıcı zaten var.');
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
