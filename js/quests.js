import { supabase } from './supabase.js';

const QUEST_SELECT = 'id, title, description, type, difficulty, reward_tokens, reward_character_id, starts_at, ends_at, quest_places(place_id, places(id, name)), characters:reward_character_id(name)';

// RLS returns only currently open quests to non-admins.
export async function listQuests({ difficulty, type, placeId } = {}) {
  let q = supabase.from('quests').select(QUEST_SELECT).eq('status', 'published').order('title');
  if (difficulty) q = q.eq('difficulty', difficulty);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return placeId
    ? data.filter(x => x.quest_places.some(qp => qp.place_id === placeId))
    : data;
}

export async function listQuestsForPlace(placeId) {
  return listQuests({ placeId });
}

// Returns Map(quest_id -> status) for the signed-in user; empty when signed out.
export async function getMyProgress() {
  const { data, error } = await supabase.from('user_quests').select('quest_id, status');
  if (error) return new Map();
  return new Map(data.map(r => [r.quest_id, r.status]));
}

export async function getQuestQuestions(questId) {
  const { data, error } = await supabase.from('quest_questions')
    .select('id, prompt, position, quest_options(id, label, position)')
    .eq('quest_id', questId).order('position');
  if (error) throw error;
  return data.map(q => ({ ...q, quest_options: [...q.quest_options].sort((a, b) => a.position - b.position) }));
}

export async function startQuest(questId) {
  const { error } = await supabase.rpc('start_quest', { p_quest_id: questId });
  if (error) throw error;
}

export async function completeQuest(questId, { answers = {}, code = null } = {}) {
  const { data, error } = await supabase.rpc('complete_quest', {
    p_quest_id: questId, p_answers: answers, p_code: code,
  });
  if (error) throw error;
  return data;
}
