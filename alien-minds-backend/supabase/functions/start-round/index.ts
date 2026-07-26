import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  roomId: string;
  action?: 'start_game' | 'next_prompt';
  maxPrompts?: number;
  numAliens?: number;
}

interface PromptPair {
  human: string;
  alien: string;
}

const FALLBACK_PROMPT_PAIRS: PromptPair[] = [
  { human: "Draw your favorite breakfast food.", alien: "Draw your pet's favorite food." },
  { human: "Draw a pet animal you would love to own.", alien: "Draw the smallest animal that you think could beat you in a fight." },
  { human: "Draw your daily morning routine.", alien: "Draw your before bed routine." },
  { human: "Draw your dream car.", alien: "Draw the fanciest car you think is ugly." },
  { human: "Draw a superpower you wish you had.", alien: "Draw your supervillain power." },
  { human: "Draw what you do when extremely tired.", alien: "Draw what you do when you're relaxed." },
  { human: "Draw your favorite vacation location.", alien: "Draw a place you'd hate to be lost in." },
  { human: "Draw an item you bring to the beach.", alien: "Draw an item you bring to the desert." }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roomId, action = 'start_game', maxPrompts = 3, numAliens = 1 } = (await req.json()) as RequestBody;

    if (!roomId) throw new Error("Missing roomId in request body.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch room & player list
    const { data: room, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) throw new Error("Room not found.");

    const { data: players, error: playersErr } = await supabaseAdmin
      .from('players')
      .select('id, user_id')
      .eq('room_id', roomId);

    if (playersErr || !players) throw new Error("Could not fetch players.");

    const totalPlayers = players.length;
    if (totalPlayers < 3) {
      throw new Error(`Minimum 3 operatives required. Currently in lobby: ${totalPlayers}`);
    }

    const isNewGame = action === 'start_game' || room.current_prompt_num === 0;

    // 2. Validate Alien Ratio & Prompt Constraints
    const maxAllowedAliens = Math.max(1, Math.floor((totalPlayers - 1) / 2));
    const targetNumAliens = Math.min(Math.max(1, isNewGame ? numAliens : (room.num_aliens || 1)), maxAllowedAliens);
    const totalMaxPrompts = isNewGame ? maxPrompts : (room.max_prompts || 3);

    if (totalMaxPrompts < targetNumAliens + 1) {
      throw new Error(`Insufficient prompts: ${targetNumAliens} alien(s) require at least ${targetNumAliens + 1} prompts to be voted out.`);
    }

    // Reset task completion and prompt readiness status for all players for the new round
    await supabaseAdmin.from('players').update({
        task_completed: false,
        ready_next_prompt: false
    }).eq('room_id', roomId);

    // 3. Game Session Counters
    const nextPromptNum = isNewGame ? 1 : (room.current_prompt_num || 0) + 1;

    // 4. Persistent Multi-Alien Selection Logic
    let alienPlayerIds: string[] = Array.isArray(room.alien_player_ids)
      ? room.alien_player_ids
      : (room.alien_player_id ? [room.alien_player_id] : []);

    // Filter out any alien who left the room
    alienPlayerIds = alienPlayerIds.filter(id => players.some(p => p.id === id));

    // Re-roll aliens if starting a new session or if player count/alien count changed
    if (isNewGame || alienPlayerIds.length !== targetNumAliens) {
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      alienPlayerIds = shuffled.slice(0, targetNumAliens).map(p => p.id);
    }

    // 5. Generate Dynamic Prompt Pair
    let promptPair: PromptPair = FALLBACK_PROMPT_PAIRS[Math.floor(Math.random() * FALLBACK_PROMPT_PAIRS.length)];

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (apiKey) {
      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are an AI generating asymmetric prompt pairs for an imposter party game.
Given a normal human prompt, generate a corrupted 'alien' prompt that will yield physically similar actions/drawings/answers, but stems from twisting the context or qualifier of the prompt. Results should yield ~40% overlap in believable results, with ~60% leading to awkward, strange, or just off-putting responses that will require the 'aliens' to explain away the weirdness.
Return ONLY JSON matching: {"human": "...", "alien": "..."}`
              },
              { role: "user", content: `Generate prompt #${nextPromptNum} of ${totalMaxPrompts} for this session.` }
            ]
          })
        });

        const aiData = await aiRes.json();
        if (aiData.choices && aiData.choices[0]?.message?.content) {
          const parsed = JSON.parse(aiData.choices[0].message.content);
          if (parsed.human && parsed.alien) {
            promptPair = parsed;
          }
        }
      } catch (aiErr) {
        console.warn("AI generation failed, using fallback prompt pair:", aiErr);
      }
    }

    // 6. Update secret assignments for all players
    const secretUpdates = players.map((player) => {
      const isAlien = alienPlayerIds.includes(player.id);
      return {
        player_id: player.id,
        user_id: player.user_id,
        role: isAlien ? 'alien' : 'human',
        current_prompt: isAlien ? promptPair.alien : promptPair.human
      };
    });

    await supabaseAdmin.from('player_secrets').upsert(secretUpdates, { onConflict: 'player_id' });

    // 7. Update Room State
    await supabaseAdmin.from('rooms').update({
      status: 'playing',
      current_prompt_num: nextPromptNum,
      max_prompts: totalMaxPrompts,
      num_aliens: targetNumAliens,
      alien_player_id: alienPlayerIds[0] || null, // Primary alien for single-alien backwards compatibility
      alien_player_ids: alienPlayerIds,
      winner: null
    }).eq('id', roomId);

    return new Response(
      JSON.stringify({
        success: true,
        promptNum: nextPromptNum,
        totalMaxPrompts,
        numAliens: targetNumAliens
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});