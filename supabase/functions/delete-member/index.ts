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
        JSON.stringify({ error: "Only admin users can delete members" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log("Confirmed admin role");

    // Get the request body
    const requestBody = await req.json();
    const { userId } = requestBody;
    console.log("Request body:", requestBody);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Don't allow admins to delete themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if the user being deleted is an admin
    const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (targetRoleError && targetRoleError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error checking target user role:", targetRoleError);
      return new Response(
        JSON.stringify({ error: `Error checking user role: ${targetRoleError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Don't allow deleting other admins
    if (targetRoleData && targetRoleData.role === 'admin') {
      return new Response(
        JSON.stringify({ error: "Cannot delete another admin user" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Delete all reading progress for the user
    const { error: readingProgressError } = await supabaseAdmin
      .from('reading_progress')
      .delete()
      .eq('user_id', userId);
      
    if (readingProgressError) {
      console.error("Error deleting reading progress:", readingProgressError);
      // Continue with deletion even if reading progress deletion fails
    }
    
    // Delete user role
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (deleteRoleError) {
      console.error("Error deleting user role:", deleteRoleError);
      // Continue with deletion even if role deletion fails
    }
    
    // Delete profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteProfileError) {
      console.error("Error deleting profile:", deleteProfileError);
      // Continue with deletion even if profile deletion fails
    }
    
    // Delete the user account
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteUserError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        message: "Member deleted successfully"
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