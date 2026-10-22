import { supabase } from './supabase.js';

// Public side. RLS only returns published, in-window campaigns to non-admins.
export async function listOpenCampaigns() {
  const { data, error } = await supabase.from('campaigns')
    .select('id, title, description, image_url, starts_at, ends_at, campaign_places(places(name)), campaign_quests(quests(title))')
    .eq('status', 'published').order('starts_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function myCampaignIds() {
  const { data, error } = await supabase.from('campaign_participants').select('campaign_id');
  return new Set(error ? [] : data.map(r => r.campaign_id));
}

export async function joinCampaign(id) {
  const { error } = await supabase.rpc('join_campaign', { p_campaign_id: id });
  if (error) throw error;
}
