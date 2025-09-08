import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendQREmailRequest {
  attendee: {
    name: string;
    email: string;
    qrCode: string;
  };
  qrImageData: string; // base64 data URL
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attendee, qrImageData }: SendQREmailRequest = await req.json();

    console.log(`Sending QR code email to ${attendee.name} (${attendee.email})`);

    // Check if Resend API key is configured
    if (!Deno.env.get('RESEND_API_KEY')) {
      throw new Error('Resend API key not configured');
    }
    
    // Convert base64 QR code to attachment
    const base64Data = qrImageData.split(',')[1];
    
    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Event QR Codes <onboarding@resend.dev>",
      to: [attendee.email],
      subject: `Your Event QR Code - ${attendee.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #262883;">Hello ${attendee.name}!</h2>
          <p>Here's your QR code for the event. Please save this image and present it at check-in.</p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:qr-code" alt="Your QR Code" style="border: 2px solid #262883; border-radius: 8px;" />
          </div>
          <p>Your unique QR code: <strong style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${attendee.qrCode}</strong></p>
          <p>We look forward to seeing you at the event!</p>
          <br>
          <p style="color: #666;">Best regards,<br>Event Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `qr-code-${attendee.name.replace(/\s+/g, '-')}.png`,
          content: base64Data,
          content_type: 'image/png',
          disposition: 'attachment'
        }
      ]
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `QR code email sent successfully to ${attendee.name}`,
        emailId: emailResponse.data?.id
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
    console.error('Error in send-qr-email function:', error);
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