/**
 * One-time utility: set a password for an existing user account.
 * Usage:  npx tsx --env-file=.env scripts/set-password.ts <email> <password>
 */
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { users } from "../shared/models/auth";
import { eq } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx --env-file=.env scripts/set-password.ts <email> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));

  if (!user) {
    console.error(`No user found with email: ${email}`);
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  console.log(`✓ Password set for ${user.firstName} ${user.lastName} (${user.email})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
