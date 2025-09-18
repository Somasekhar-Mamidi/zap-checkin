import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting banner upload process...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL/Service Role Key not configured');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the banner image data from the request
    const { imageData } = await req.json();
    
    if (!imageData) {
      throw new Error('No image data provided');
    }

    // Process base64 image data
    const parts = imageData.split(',');
    if (parts.length !== 2) {
      throw new Error('Invalid base64 data format');
    }
    
    const base64Data = parts[1].trim();
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Uploading banner to storage...');

    // Upload banner to storage
    const uploadResult = await supabase.storage
      .from('qr-codes')
      .upload('email-banner.png', bytes, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadResult.error) {
      console.error('Error uploading banner:', uploadResult.error);
      throw new Error(`Failed to upload banner: ${uploadResult.error.message}`);
    }

    console.log('Banner uploaded successfully');

    const { data: publicUrlData } = supabase.storage
      .from('qr-codes')
      .getPublicUrl('email-banner.png');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Banner uploaded successfully',
        url: publicUrlData.publicUrl
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in upload-banner function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);