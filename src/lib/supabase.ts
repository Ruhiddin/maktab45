import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = supabaseUrl === 'https://placeholder.supabase.co'
  ? {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } }),
            order: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } }),
            limit: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } })
          }),
          order: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } }),
          single: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } })
            })
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: "Placeholder URL" } })
        })
      })
    } as any
  : createClient(supabaseUrl, supabaseAnonKey);
