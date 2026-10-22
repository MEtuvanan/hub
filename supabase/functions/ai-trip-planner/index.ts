// Supabase Edge Function: ai-trip-planner
// Secure server-side Groq integration grounded in verified database destinations.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UserPreferences {
  startingArea?: string;
  startDate?: string;
  days?: number;
  travelStyle?: string;
  interests?: string[];
  pace?: string;
  includeQuests?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is not configured on Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const body: UserPreferences = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body.days) || 1, 1), 7);
    const startingArea = body.startingArea || 'Bangkok City Center';
    const travelStyle = body.travelStyle || 'balanced explorer';
    const interests = Array.isArray(body.interests) && body.interests.length > 0
      ? body.interests.join(', ')
      : 'culture, local food, landmarks, peaceful parks';
    const pace = body.pace || 'moderate';
    const includeQuests = body.includeQuests !== false;

    // 1. Fetch verified, published destinations from Supabase
    const { data: places, error: placesError } = await supabase
      .from('places')
      .select('id, name, summary, lat, lng, visitor_info, districts(name_en), place_categories(name)')
      .eq('status', 'published')
      .limit(30);

    if (placesError || !places || places.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No published destinations found in the database to plan a trip.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch active quests if requested
    let questsData: any[] = [];
    if (includeQuests) {
      const { data: quests } = await supabase
        .from('quests')
        .select('id, title, difficulty, reward_tokens, quest_places(place_id)')
        .eq('status', 'published')
        .limit(20);
      questsData = quests || [];
    }

    // Map quests by place_id
    const questsByPlace: Record<string, any[]> = {};
    for (const q of questsData) {
      for (const qp of q.quest_places || []) {
        if (!questsByPlace[qp.place_id]) questsByPlace[qp.place_id] = [];
        questsByPlace[qp.place_id].push({
          id: q.id,
          title: q.title,
          difficulty: q.difficulty,
          reward_tokens: q.reward_tokens,
        });
      }
    }

    // 3. Prepare Grounded Knowledge Context for Groq
    const placesContext = places.map((p: any) => ({
      id: p.id,
      name: p.name,
      summary: p.summary,
      district: p.districts?.name_en || 'Bangkok',
      category: p.place_categories?.name || 'General',
      visitor_info: p.visitor_info || '',
      available_quests: questsByPlace[p.id] || [],
    }));

    const validPlaceIds = new Set(places.map((p: any) => p.id));
    const placesMap = new Map(places.map((p: any) => [p.id, p]));

    const systemPrompt = `You are the expert AI Travel Planner for "Travel and Challenge", a gamified tourism platform for Thailand.
CRITICAL GROUNDING RULES:
1. You MUST ONLY use the destinations provided in the VERIFIED_PLACES list below.
2. Under NO circumstance should you invent or hallucinate new place IDs or destinations.
3. Every stop in the itinerary MUST have a valid "place_id" matching one of the verified places exactly.
4. Respect practical travel reality: suggest 2 to 4 stops per day maximum to allow enjoyable exploration.
5. Provide realistic visit duration and helpful, authentic explorer tips.
6. Return your response STRICTLY as valid JSON with NO extra commentary or markdown formatting.

Format specification:
{
  "trip_title": "string",
  "summary": "string",
  "daily_plan": [
    {
      "day": 1,
      "theme": "string",
      "stops": [
        {
          "place_id": "UUID from verified list",
          "suggested_time": "09:00 - 11:30",
          "duration_minutes": 150,
          "why_recommended": "string",
          "exploration_tips": "string"
        }
      ]
    }
  ]
}

VERIFIED_PLACES:
${JSON.stringify(placesContext, null, 2)}`;

    const userPrompt = `Please design a ${days}-day Bangkok itinerary for a traveler with these preferences:
- Starting base/area: ${startingArea}
- Travel Style: ${travelStyle}
- Specific Interests: ${interests}
- Activity Pace: ${pace}
- Quests Included: ${includeQuests ? 'Yes, highlight exciting challenges' : 'No'}

Create an inspiring, well-sequenced adventure schedule.`;

    // 4. Call Groq Cloud API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq API Error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI Planner service is temporarily unavailable. Please try again in a few moments.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const rawContent = groqData.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Groq JSON:', rawContent);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Post-validation: sanitize and reject hallucinated destination IDs
    const validatedDailyPlan = [];
    for (const day of parsed.daily_plan || []) {
      const validStops = [];
      let stopOrder = 1;
      for (const stop of day.stops || []) {
        if (validPlaceIds.has(stop.place_id)) {
          const placeObj = placesMap.get(stop.place_id);
          validStops.push({
            place_id: stop.place_id,
            name: placeObj.name,
            summary: placeObj.summary,
            lat: placeObj.lat,
            lng: placeObj.lng,
            district: placeObj.districts?.name_en || 'Bangkok',
            visitor_info: placeObj.visitor_info,
            suggested_time: stop.suggested_time || 'Flexible',
            duration_minutes: stop.duration_minutes || 90,
            why_recommended: stop.why_recommended || '',
            exploration_tips: stop.exploration_tips || '',
            stop_order: stopOrder++,
            quests: questsByPlace[stop.place_id] || [],
          });
        } else {
          console.warn('Filtered out ungrounded place_id from AI:', stop.place_id);
        }
      }

      if (validStops.length > 0) {
        validatedDailyPlan.push({
          day: day.day || (validatedDailyPlan.length + 1),
          theme: day.theme || `Day ${validatedDailyPlan.length + 1} Exploration`,
          stops: validStops,
        });
      }
    }

    const result = {
      trip_title: parsed.trip_title || `${days}-Day Bangkok Adventure`,
      summary: parsed.summary || 'A customized itinerary grounded in Bangkok verified destinations.',
      preferences: { startingArea, days, travelStyle, interests, pace },
      daily_plan: validatedDailyPlan,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Edge Function Unexpected Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected server error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
