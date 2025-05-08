import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header for debugging
    const authHeader = req.headers.get('Authorization') || 'none';
    console.log(`Auth header: ${authHeader.substring(0, 15)}...`);
    
    // Create a Supabase client with the service role key (full admin rights)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create another client with the auth context from the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader || '' } }
      }
    );

    // Only proceed if this is a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    // Get the current user to verify they are an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: `Authentication error: ${authError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    if (!user) {
      console.error("No user found in auth context");
      return new Response(
        JSON.stringify({ error: "No authenticated user found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log("Authenticated user ID:", user.id);

    // Check if the current user is an admin
    const { data: roleData, error: roleCheckError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleCheckError) {
      console.error("Role check error:", roleCheckError);
      return new Response(
        JSON.stringify({ error: `Role check error: ${roleCheckError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    if (!roleData || roleData.role !== 'admin') {
      console.error("User is not an admin:", roleData);
      return new Response(
        JSON.stringify({ error: "Only admin users can reset passwords" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log("Confirmed admin role");

    // Get the request body
    const requestBody = await req.json();
    const { userId, newPassword } = requestBody;
    console.log("Request body received for user ID:", userId);

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "User ID and new password are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Reset the user's password with the admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to reset password: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("Password reset successful for user:", userId);

    return new Response(
      JSON.stringify({ 
        message: "Password reset successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 