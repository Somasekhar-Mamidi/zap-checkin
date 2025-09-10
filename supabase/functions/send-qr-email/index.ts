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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      throw new Error('Resend API key not configured');
    }
    
    console.log('Resend API key found, length:', resendApiKey.length);
    
    // Process base64 QR code data
    let base64Data: string;
    try {
      // Clean and validate base64 data
      const parts = qrImageData.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid base64 data format');
      }
      base64Data = parts[1];
      
      // Validate base64 format
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Empty base64 data');
      }
      
      console.log('Base64 data processed successfully, length:', base64Data.length);
    } catch (error) {
      console.error('Error processing base64 data:', error);
      throw new Error(`Failed to process QR code image: ${error.message}`);
    }
    
    console.log('Attempting to send email via Resend...');
    
    // Send email using Resend with enhanced HTML and fallback
    const emailResponse = await resend.emails.send({
      from: "Event QR Codes <noreply@juspayconnect.online>",
      to: [attendee.email],
      subject: `Your Event QR Code - ${attendee.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Your Event QR Code</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f9f9f9;">
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #262883 0%, #4338ca 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Your Event QR Code</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #262883; margin: 0 0 20px 0; font-size: 24px;">Hello ${attendee.name}!</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Here's your QR code for the event. Please save this image and present it at check-in.
              </p>
              
              <!-- QR Code with multiple display methods -->
              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 2px dashed #e5e7eb;">
                
                <!-- Primary method: CID reference -->
                <div style="margin-bottom: 20px;">
                  <img src="cid:qr-code" alt="Your QR Code" style="max-width: 250px; height: auto; border: 3px solid #262883; border-radius: 12px; box-shadow: 0 4px 8px rgba(38, 40, 131, 0.2); display: block; margin: 0 auto;" />
                </div>
                
                <!-- Fallback method: Base64 embedded -->
                <div style="margin-top: 20px;">
                  <img src="data:image/png;base64,${base64Data}" alt="Your QR Code (Fallback)" style="max-width: 250px; height: auto; border: 3px solid #262883; border-radius: 12px; box-shadow: 0 4px 8px rgba(38, 40, 131, 0.2); display: block; margin: 0 auto;" />
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0;">
                  If you can't see the QR code above, please check your email settings or download the attachment.
                </p>
              </div>
              
              <!-- QR Code Text -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <p style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">Your unique QR code:</p>
                <p style="background: #ffffff; padding: 12px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 600; color: #262883; margin: 0; border: 1px solid #e5e7eb; letter-spacing: 1px;">
                  ${attendee.qrCode}
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
                We look forward to seeing you at the event!
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong style="color: #262883;">Event Team</strong>
              </p>
            </div>
            
          </div>
          
          <!-- Email client compatibility styles -->
          <style>
            @media only screen and (max-width: 600px) {
              .email-container { width: 100% !important; }
              .email-content { padding: 20px !important; }
            }
          </style>
          
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `qr-code-${attendee.name.replace(/\s+/g, '-')}.png`,
          content: base64Data,
          content_type: 'image/png',
          disposition: 'inline',
          cid: 'qr-code'
        }
      ]
    });

    console.log('Resend API response:', JSON.stringify(emailResponse, null, 2));

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      
      // Handle specific Resend errors with helpful messages
      if (emailResponse.error.message?.includes('verify a domain') || emailResponse.error.message?.includes('domain is not verified')) {
        throw new Error('Domain not verified. With the test domain, you can only send emails to your own verified Resend account email. To send to other recipients, verify your domain at resend.com/domains.');
      }
      
      if (emailResponse.error.message?.includes('testing emails to your own email')) {
        throw new Error('With the test domain, you can only send emails to your own verified Resend account email address. To send to other recipients, verify a custom domain at resend.com/domains.');
      }
      
      throw new Error(`Resend API error: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
    }

    console.log('Email sent successfully. Email ID:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `QR code email sent successfully to ${attendee.name}`,
        emailId: emailResponse.data?.id,
        resendResponse: emailResponse
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