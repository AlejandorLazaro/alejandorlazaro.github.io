import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roomId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch Room, Active Players, Secrets, and Votes
    const { data: room } = await supabaseAdmin.from('rooms').select('*').eq('id', roomId).single();
    const { data: players } = await supabaseAdmin.from('players').select('*').eq('room_id', roomId);
    const { data: votes } = await supabaseAdmin.from('votes').select('*').eq('room_id', roomId);

    if (!room || !players) throw new Error("Room or players not found.");

    const activePlayers = players.filter(p => !p.is_eliminated);
    const activePlayerIds = activePlayers.map(p => p.id);

    const { data: secrets } = await supabaseAdmin.from('player_secrets').select('*').in('player_id', activePlayerIds);

    // 2. Tally Votes
    const voteCounts: Record<string, number> = {};
    let skipVotes = 0;

    (votes || []).forEach(v => {
      // FIX: Use 'suspect_id' and check for null instead of the string 'skip'
      if (v.suspect_id === null) {
        skipVotes++;
      } else {
        voteCounts[v.suspect_id] = (voteCounts[v.suspect_id] || 0) + 1;
      }
    });

    // Determine highest voted player
    let highestVotes = skipVotes;
    let ejectedPlayerId: string | null = null;
    let isTie = false;

    Object.entries(voteCounts).forEach(([playerId, count]) => {
      if (count > highestVotes) {
        highestVotes = count;
        ejectedPlayerId = playerId;
        isTie = false;
      } else if (count === highestVotes && count > 0) {
        isTie = true;
      }
    });

    if (isTie) ejectedPlayerId = null; // Tie results in no ejection

    // 3. Process Ejection
    let ejectedName = "No One";
    let ejectedRole = null;

    if (ejectedPlayerId) {
      const ejectedPlayer = players.find(p => p.id === ejectedPlayerId);
      const ejectedSecret = (secrets || []).find(s => s.player_id === ejectedPlayerId);

      if (ejectedPlayer) {
        ejectedName = ejectedPlayer.name;
        ejectedRole = ejectedSecret?.role || 'human';

        // Mark player eliminated in database
        await supabaseAdmin.from('players').update({ is_eliminated: true }).eq('id', ejectedPlayerId);
      }
    }

    // Clear votes table for next round
    await supabaseAdmin.from('votes').delete().eq('room_id', roomId);

    // 4. Re-evaluate Active Teams & Check Win Conditions
    const { data: updatedPlayers } = await supabaseAdmin.from('players').select('*').eq('room_id', roomId);
    const updatedActive = (updatedPlayers || []).filter(p => !p.is_eliminated);

    const remainingAlienCount = updatedActive.filter(p => {
      const secret = (secrets || []).find(s => s.player_id === p.id);
      return secret?.role === 'alien';
    }).length;

    const remainingHumanCount = updatedActive.length - remainingAlienCount;

    let winner: 'humans' | 'aliens' | null = null;

    if (remainingAlienCount === 0) {
      // WIN CONDITION 1: All Aliens Ejected -> Humans Win
      winner = 'humans';
    } else if (remainingAlienCount >= remainingHumanCount) {
      // WIN CONDITION 2: Aliens equal or outnumber Humans -> Aliens Win
      winner = 'aliens';
    } else if ((room.current_prompt_num || 1) >= (room.max_prompts || 3)) {
      // WIN CONDITION 3: All prompts exhausted with Aliens remaining -> Aliens Win
      winner = 'aliens';
    }

    // 5. Update Room State
    await supabaseAdmin.from('rooms').update({
      status: winner ? 'game_over' : 'vote_results',
      winner: winner,
      last_ejected_name: ejectedName,
      last_ejected_role: ejectedRole
    }).eq('id', roomId);

    return new Response(JSON.stringify({ success: true, winner }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});