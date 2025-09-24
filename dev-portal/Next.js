# Paste‑Ready Next.js App Router project

Below are **all files** you can paste into a fresh repo to stand up a secure, developer‑facing portal at `/admin` with a login page at `/login`. Uses **Next.js (App Router)**, **NextAuth (Credentials)**, **Tailwind**, and a **single admin account** controlled by environment variables. Protects `/admin` via middleware.

> If your public site is a separate Vite app, you can still deploy this as a separate Vercel project at, e.g., `dev.red-string-recs.vercel.app`.

---

## `package.json`
```json
{
  "name": "red-string-recs-dev-portal",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "hash:password": "node scripts/hash-password.mjs"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "next": "^14.2.4",
    "next-auth": "^5.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.4",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5"
  }
}
```

---

## `.env.example`
```
# Required by NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-string

# Admin credentials (email optional label; password is stored as a bcrypt hash)
ADMIN_EMAIL=admin@redstring.dev
ADMIN_PASSWORD_HASH=$2a$10$QbQyV6k8k9i1rXn7m0YQfO7oY2q7C7v0Xb6mJb5b6qk1wQ5H3mWlC
# ^ replace with your own hash; generate with: `npm run hash:password`
```

---

## `next.config.mjs`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
```

---

## `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "es2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.mjs"],
  "exclude": ["node_modules"]
}
```

---

## `postcss.config.mjs`
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## `tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

---

## `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
body { @apply min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50; }
.container-page { @apply max-w-3xl mx-auto px-4 py-10; }
.card { @apply bg-white dark:bg-neutral-900 rounded-2xl shadow p-6 border border-neutral-200/60 dark:border-neutral-800; }
.btn { @apply inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800; }
.btn-primary { @apply bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 border-transparent; }
.input { @apply w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-400; }
.label { @apply block text-sm font-medium mb-1; }
.err { @apply text-sm text-red-600 mt-2; }
```

---

## `app/layout.tsx`
```tsx
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Red String Recs – Dev Portal',
  description: 'Developer portal for Red String Recs',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## `app/(auth)/login/page.tsx`
```tsx
'use client';
import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/admin',
    });
    if (res?.ok) router.push(res.url ?? '/admin');
    else setError('Invalid credentials');
  }

  return (
    <main className="container-page">
      <div className="card max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Developer Login</h1>
        {searchParams.get('error') && (
          <p className="err">{decodeURIComponent(searchParams.get('error')!)}</p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
```

---

## `app/admin/page.tsx`
```tsx
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth();
  return (
    <main className="container-page">
      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Developer Dashboard</h1>
          <form action="/api/auth/signout" method="post">
            <button className="btn" type="submit">Sign out</button>
          </form>
        </div>
        <p className="mt-4 opacity-80">Signed in as <strong>{session?.user?.email}</strong></p>
        <ul className="mt-6 list-disc pl-6 space-y-2">
          <li>
            <Link className="underline" href="/admin/tools">Tools (placeholder)</Link>
          </li>
          <li>
            <Link className="underline" href="/admin/settings">Settings (placeholder)</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
```

---

## `app/admin/tools/page.tsx`
```tsx
import { auth } from '@/lib/auth';

export default async function ToolsPage() {
  await auth();
  return (
    <main className="container-page">
      <div className="card">
        <h1 className="text-xl font-semibold">Tools</h1>
        <p className="mt-2 opacity-80">Add dev tools here (e.g., CSV import/export, link editors, feature toggles).</p>
      </div>
    </main>
  );
}
```

---

## `app/admin/settings/page.tsx`
```tsx
import { auth } from '@/lib/auth';

export default async function SettingsPage() {
  await auth();
  return (
    <main className="container-page">
      <div className="card">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-2 opacity-80">Environment, API keys, etc. (read-only placeholders).</p>
      </div>
    </main>
  );
}
```

---

## `app/page.tsx`
```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="container-page">
      <div className="card">
        <h1 className="text-2xl font-semibold">Red String Recs – Dev Portal</h1>
        <p className="mt-2 opacity-80">This is the private developer portal. Head to the login page to continue.</p>
        <Link className="btn btn-primary mt-4" href="/login">Go to Login</Link>
      </div>
    </main>
  );
}
```

---

## `app/api/auth/[...nextauth]/route.ts`
```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const handler = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = schema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminHash) return null;
        if (email.toLowerCase() !== adminEmail.toLowerCase()) return null;
        const ok = await compare(password, adminHash);
        if (!ok) return null;
        return { id: 'admin', name: 'Admin', email: adminEmail };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = { email: user.email };
      return token;
    },
    async session({ session, token }) {
      if (token?.user) session.user = token.user as any;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

---

## `lib/auth.ts`
```ts
import NextAuth from 'next-auth';
import authConfig from '@/app/api/auth/[...nextauth]/route';

// Little utility to access the session server-side in App Router components
export async function auth() {
  const { auth } = NextAuth(authConfig as any);
  return auth();
}
```

---

## `middleware.ts`
```ts
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/admin/:path*'],
};
```

---

## `components/NavBar.tsx`
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  const active = (p: string) => pathname.startsWith(p) ? 'font-semibold underline' : '';
  return (
    <nav className="container-page py-4 flex items-center gap-4">
      <Link href="/" className={active('/')}>Home</Link>
      <Link href="/admin" className={active('/admin')}>Admin</Link>
    </nav>
  );
}
```

---

## `next-env.d.ts`
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

---

## `scripts/hash-password.mjs`
```js
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash:password -- "your-strong-password"');
  process.exit(1);
}
const rounds = 10;
const hash = bcrypt.hashSync(password, rounds);
console.log('\nBCRYPT HASH:\n', hash, '\n');
```

---

# How to run locally
1. `pnpm i` (or `npm i` / `yarn`)
2. Copy `.env.example` to `.env.local` and set values. Generate a password hash:  
   `npm run hash:password -- "YourStrongPassword!2025"` → paste into `ADMIN_PASSWORD_HASH`.
3. `npm run dev` and open `http://localhost:3000` → **Login at `/login`**.

# Vercel notes
- Set **Environment Variables** in the Vercel dashboard: `NEXTAUTH_URL` (your production URL), `NEXTAUTH_SECRET` (generate a long random string), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (bcrypt).  
- Deploy. `/admin` is protected by middleware; unauthenticated users are redirected to `/login`.

# Extending
- Add GitHub/Google SSO later by adding providers to `app/api/auth/[...nextauth]/route.ts` and setting provider env vars.
- Swap single‑admin to a multi‑user store by wiring a database (e.g., Prisma + Postgres) and replacing the Credentials authorize logic.
- Drop your existing **tools** into `app/admin/*` routes.
