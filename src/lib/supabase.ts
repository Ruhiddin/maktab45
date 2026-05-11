import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const isBrowser = typeof window !== 'undefined';

function createNoopClient(message: string) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message } }),
          order: () => Promise.resolve({ data: null, error: { message } }),
          limit: () => Promise.resolve({ data: null, error: { message } }),
        }),
        order: () => Promise.resolve({ data: null, error: { message } }),
        single: () => Promise.resolve({ data: null, error: { message } }),
        in: () => Promise.resolve({ data: null, error: { message } }),
        gt: () => Promise.resolve({ data: null, error: { message } }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message } }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message } }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message } }),
      }),
    }),
  } as any;
}

export const supabase = supabaseUrl === 'https://placeholder.supabase.co'
  ? createNoopClient('Placeholder URL')
  : !isBrowser
    ? createNoopClient('Supabase browser client is unavailable during static build')
    : createClient(supabaseUrl, supabaseAnonKey);
