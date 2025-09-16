import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviterName?: string;
  inviterEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing invitation email request...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authenticated:", user.email);

    const { email, inviterName, inviterEmail }: InvitationEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending invitation email to:", email);

    // Get the site URL from environment or use the Supabase URL
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace("https://", "https://app-")}.vercel.app` || "https://your-app.lovable.app";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Event Manager</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f8fafc;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 30px;
            }
            .welcome {
              font-size: 18px;
              color: #2d3748;
              margin-bottom: 20px;
            }
            .invitation-box {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .instructions {
              background: #fff5f5;
              border-left: 4px solid #f56565;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background: #f7fafc;
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #718096;
            }
            .step {
              margin: 10px 0;
              padding-left: 20px;
              position: relative;
            }
            .step::before {
              content: counter(step-counter);
              counter-increment: step-counter;
              position: absolute;
              left: 0;
              top: 0;
              background: #667eea;
              color: white;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            }
            .steps-container {
              counter-reset: step-counter;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
              <p>Welcome to Event Manager Platform</p>
            </div>
            
            <div class="content">
              <div class="welcome">
                Great news! You've been invited to access our Event Manager platform.
              </div>
              
              <div class="invitation-box">
                <h3>💌 Invitation Details</h3>
                <p><strong>Invited by:</strong> ${inviterName || inviterEmail || 'System Administrator'}</p>
                <p><strong>Your invited email:</strong> ${email}</p>
                <p><strong>Platform:</strong> Event Check-In Management System</p>
              </div>

              <div class="instructions">
                <h3>📋 How to Get Started</h3>
                <div class="steps-container">
                  <div class="step">Click the "Access Platform" button below</div>
                  <div class="step">Sign up using <strong>exactly this email address</strong>: ${email}</div>
                  <div class="step">Create your password (minimum 6 characters)</div>
                  <div class="step">Start managing events and attendees!</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${siteUrl}/auth" class="cta-button">
                  🚀 Access Platform
                </a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <h3>✨ What You Can Do</h3>
                <ul>
                  <li>🏷️ Manage event attendees with QR codes</li>
                  <li>📱 Check-in attendees with QR scanner</li>
                  <li>📊 View detailed reports and analytics</li>
                  <li>📧 Send QR codes via email</li>
                  <li>📈 Track attendance and generate insights</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>⚠️ <strong>Important:</strong> You must sign up with the exact email address: <strong>${email}</strong></p>
              <p>If you have any questions, please contact ${inviterEmail || 'your administrator'}.</p>
              <br>
              <p>This invitation was sent from Event Manager Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Event Manager <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 You're invited to Event Manager Platform",
      html: emailHtml,
      replyTo: inviterEmail || undefined,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation email sent successfully",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send invitation email", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);