import { supabase } from './supabase.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles').select('id, display_name, avatar_url, role')
    .eq('id', session.user.id).single();
  return error ? null : data;
}

export const signUp = (email, password, displayName) =>
  supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

// UI-only convenience; real authorization is enforced by RLS.
export async function requireAuth(redirect = '/login') {
  const s = await getSession();
  if (!s) location.href = `${redirect}?next=${encodeURIComponent(location.pathname)}`;
  return s;
}
