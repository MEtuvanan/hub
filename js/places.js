import { supabase } from './supabase.js';

const SELECT = 'id, name, summary, description, lat, lng, visitor_info, verified, province_id, district_id, category_id, provinces(name_en), districts(name_en), place_categories(name, slug)';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
export const isUuid = v => typeof v === 'string' && UUID_RE.test(v);

// RLS already limits anonymous users to published rows; the filter is explicit for admins too.
export async function listPlaces({ search = '', provinceId, districtId, categoryId } = {}) {
  let q = supabase.from('places').select(SELECT).eq('status', 'published').order('name');
  if (provinceId) q = q.eq('province_id', provinceId);
  if (districtId) q = q.eq('district_id', districtId);
  if (categoryId) q = q.eq('category_id', categoryId);
  const term = search.trim().replace(/[%,()]/g, ' ');
  if (term) q = q.or(`name.ilike.%${term}%,summary.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getPlace(id) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from('places').select(SELECT)
    .eq('id', id).eq('status', 'published').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: images } = await supabase.from('place_images')
    .select('url, alt').eq('place_id', id).order('position');
  return { ...data, images: images ?? [] };
}

export async function getFilterOptions() {
  const [p, d, c] = await Promise.all([
    supabase.from('provinces').select('id, name_en').order('name_en'),
    supabase.from('districts').select('id, province_id, name_en').order('name_en'),
    supabase.from('place_categories').select('id, name').order('name'),
  ]);
  if (p.error || d.error || c.error) throw (p.error || d.error || c.error);
  return { provinces: p.data, districts: d.data, categories: c.data };
}
