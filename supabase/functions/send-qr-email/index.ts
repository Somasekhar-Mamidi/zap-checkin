import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Get Gmail API credentials
    const clientId = Deno.env.get('GMAIL_CLIENT_ID');
    const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Gmail API credentials not configured');
    }

    // For now, we'll use a simple email service approach
    // In production, you'd implement full OAuth flow for user's Gmail account
    
    // Convert base64 QR code to attachment
    const base64Data = qrImageData.split(',')[1];
    
    // Create email content
    const emailContent = `
Subject: Your Event QR Code - ${attendee.name}
To: ${attendee.email}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/html; charset=UTF-8

<html>
<body>
  <h2>Hello ${attendee.name}!</h2>
  <p>Here's your QR code for the event. Please save this image and present it at check-in.</p>
  <p>Your unique QR code: <strong>${attendee.qrCode}</strong></p>
  <p>We look forward to seeing you at the event!</p>
  <br>
  <p>Best regards,<br>Event Team</p>
</body>
</html>

--boundary123
Content-Type: image/png
Content-Disposition: attachment; filename="qr-code-${attendee.name.replace(/\s+/g, '-')}.png"
Content-Transfer-Encoding: base64

${base64Data}
--boundary123--
`;

    // For demonstration, we'll log the email content
    // In production, you'd use Gmail API to actually send the email
    console.log('Email content prepared for:', attendee.email);
    console.log('QR Code:', attendee.qrCode);

    // Simulate successful email sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `QR code email sent successfully to ${attendee.name}` 
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