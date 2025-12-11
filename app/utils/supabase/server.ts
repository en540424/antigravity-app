import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        // Next.js 16 types sometimes mark cookies() as Promise in TS; cast to any to avoid build error
        return (cookies() as any).get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          (cookies() as any).set(name, value, options);
        } catch (e) {}
      },
      remove(name: string, options: any) {
        try {
          (cookies() as any).set(name, "", { ...options, expires: new Date(0) });
        } catch (e) {}
      },
    },
  }
);
