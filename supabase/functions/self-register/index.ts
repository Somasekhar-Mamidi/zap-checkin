import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT = 3; // 3 registrations per hour per IP (reduced from 5)
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function generateSecureQRCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function checkRateLimit(clientIP: string, supabase: any): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  try {
    // Get or create rate limit record
    const { data: existingLimit, error: fetchError } = await supabase
      .from('registration_rate_limits')
      .select('*')
      .eq('client_ip', clientIP)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching rate limit:', fetchError);
      return false; // Fail closed on errors
    }

    if (!existingLimit) {
      // First attempt from this IP
      const { error: insertError } = await supabase
        .from('registration_rate_limits')
        .insert({
          client_ip: clientIP,
          attempt_count: 1,
          window_start: now,
          last_attempt: now,
        });

      if (insertError) {
        console.error('Error creating rate limit:', insertError);
        return false;
      }
      return true;
    }

    // Check if window has expired
    if (new Date(existingLimit.window_start) < windowStart) {
      // Reset the window
      const { error: updateError } = await supabase
        .from('registration_rate_limits')
        .update({
          attempt_count: 1,
          window_start: now,
          last_attempt: now,
        })
        .eq('client_ip', clientIP);

      if (updateError) {
        console.error('Error resetting rate limit:', updateError);
        return false;
      }
      return true;
    }

    // Check if limit exceeded
    if (existingLimit.attempt_count >= RATE_LIMIT) {
      return false;
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from('registration_rate_limits')
      .update({
        attempt_count: existingLimit.attempt_count + 1,
        last_attempt: now,
      })
      .eq('client_ip', clientIP);

    if (updateError) {
      console.error('Error updating rate limit:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false; // Fail closed on errors
  }
}

async function validateToken(token: string, email: string, supabase: any): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data: tokenData, error: fetchError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !tokenData) {
      return { valid: false, error: 'Invalid registration token' };
    }

    // Check if token is active
    if (!tokenData.is_active) {
      return { valid: false, error: 'Token is no longer active' };
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }

    // Check if token has reached max uses
    if (tokenData.current_uses >= tokenData.max_uses) {
      return { valid: false, error: 'Token has reached maximum uses' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Token validation failed' };
  }
}

async function markTokenAsUsed(token: string, email: string, supabase: any): Promise<void> {
  try {
    const { data: tokenData } = await supabase
      .from('registration_tokens')
      .select('current_uses')
      .eq('token', token)
      .single();

    if (!tokenData) return;

    await supabase
      .from('registration_tokens')
      .update({
        current_uses: tokenData.current_uses + 1,
        used_at: new Date(),
        used_by_email: email,
      })
      .eq('token', token);
  } catch (error) {
    console.error('Error marking token as used:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit (database-backed)
    const rateLimitPassed = await checkRateLimit(clientIP, supabase);
    if (!rateLimitPassed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, phone, company, token } = await req.json();

    // Validate registration token (REQUIRED)
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Registration token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenValidation = await validateToken(token.trim(), email, supabase);
    if (!tokenValidation.valid) {
      return new Response(JSON.stringify({ error: tokenValidation.error }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!company || typeof company !== 'string' || company.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Company name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      name: name.trim().substring(0, 100),
      email: email.trim().toLowerCase().substring(0, 255),
      phone: phone?.toString().trim().substring(0, 20) || null,
      company: company.toString().trim().substring(0, 100),
    };

    // Generate secure QR code
    const qrCode = generateSecureQRCode();

    // Check if email already exists
    const { data: existingAttendee } = await supabase
      .from('attendees')
      .select('id')
      .eq('email', sanitizedData.email)
      .single();

    if (existingAttendee) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert new attendee
    const { data, error } = await supabase
      .from('attendees')
      .insert({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        company: sanitizedData.company,
        qr_code: qrCode,
        registration_type: 'walk_in',
        checked_in: false,
      })
      .select('id, qr_code')
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Registration failed. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark token as used
    await markTokenAsUsed(token.trim(), sanitizedData.email, supabase);

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        type: 'registration',
        action: 'self_register',
        user_name: sanitizedData.name,
        user_email: sanitizedData.email,
        details: `Walk-in registration via token`,
        status: 'success',
        metadata: { 
          registration_type: 'walk_in',
          qr_code: qrCode,
          client_ip: clientIP,
          token_used: token.trim()
        }
      });

    // Return success response (minimal data)
    return new Response(JSON.stringify({ 
      success: true, 
      qr_code: qrCode,
      message: 'Registration successful!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in self-register function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});