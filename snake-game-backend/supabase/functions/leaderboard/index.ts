// Supabase Edge Function for Snake Game leaderboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface LeaderboardEntry {
  id?: number;
  name: string;
  score: number;
  level: number;
  timestamp?: string;
}

interface SubmissionRequest {
  name: string;
  score: number;
  level: number;
  timestamp?: number;
}

// Rate limiting store (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 submissions per minute per IP

// Use Web Crypto API instead of BLAKE3 for better compatibility
async function hashIP(ip: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error hashing IP:', error);
    // Fallback to a simple hash if crypto.subtle fails
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

async function isRateLimited(ip: string): Promise<boolean> {
  const now = Date.now();
  const key = await hashIP(ip);
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count++;
  rateLimitStore.set(key, current);
  return false;
}

function validateSubmission(data: SubmissionRequest): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  if (!/^[A-Z]{3}$/.test(data.name)) {
    return { valid: false, error: 'Name must be exactly 3 uppercase letters' };
  }

  if (!Number.isInteger(data.score) || data.score < 0 || data.score > 999999) {
    return { valid: false, error: 'Invalid score value' };
  }

  if (!Number.isInteger(data.level) || data.level < 1 || data.level > 100) {
    return { valid: false, error: 'Invalid level value' };
  }

  // Basic sanity check: score should roughly correlate with level
  const expectedMinScore = Math.max(0, (data.level - 1) * 50);
  if (data.score < expectedMinScore) {
    return { valid: false, error: 'Score too low for reported level' };
  }

  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') ||
                    req.headers.get('x-real-ip') ||
                    'unknown';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const path = url.pathname

    if (req.method === 'GET' && (path.endsWith('/leaderboard') || path.endsWith('/leaderboard/'))) {
      // Get leaderboard
      const limitParam = url.searchParams.get('limit')
      const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50

      const { data, error } = await supabase
        .rpc('get_leaderboard', { limit_count: limit })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch leaderboard' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          scores: data || [],
          timestamp: Date.now()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'POST' && (path.endsWith('/submit') || path.endsWith('/submit/'))) {
      // Check rate limiting
      if (await isRateLimited(clientIP)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait before submitting again.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Parse and validate request
      const body = await req.json() as SubmissionRequest
      const validation = validateSubmission(body)

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check for recent duplicate submissions from same IP
      const ipHash = await hashIP(clientIP)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data: recentSubmissions } = await supabase
        .from('leaderboard')
        .select('id')
        .eq('ip_hash', ipHash)
        .gte('timestamp', fiveMinutesAgo)

      if (recentSubmissions && recentSubmissions.length >= 3) {
        return new Response(
          JSON.stringify({ error: 'Too many recent submissions from your location' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Insert new score
      const { data, error } = await supabase
        .from('leaderboard')
        .insert({
          name: body.name,
          score: body.score,
          level: body.level,
          ip_hash: ipHash,
          timestamp: body.timestamp ? new Date(body.timestamp).toISOString() : new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to submit score' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Clean up old entries (keep top 100)
      await supabase.rpc('cleanup_leaderboard')

      // Get the rank of the new entry
      const { data: rankData } = await supabase
        .rpc('get_leaderboard', { limit_count: 100 })

      const rank = rankData ? rankData.findIndex((entry: any) => entry.id === data.id) + 1 : null

      return new Response(
        JSON.stringify({
          success: true,
          entry: data,
          rank: rank
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})