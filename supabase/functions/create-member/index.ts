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
        JSON.stringify({ error: "Only admin users can create members" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log("Confirmed admin role");

    // Get the request body
    const requestBody = await req.json();
    const { firstName, lastName } = requestBody;
    console.log("Request body:", requestBody);

    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "First name and last name are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate email and set password
    const email = `${firstName.toLowerCase()}@netmissions.com`;
    const password = lastName;

    // Check for existing users with the same name
    const { data: existingProfiles, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName);
    
    if (profileCheckError) {
      console.error("Error checking for existing profiles:", profileCheckError);
      return new Response(
        JSON.stringify({ error: `Failed to check for duplicates: ${profileCheckError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (existingProfiles && existingProfiles.length > 0) {
      console.error("Duplicate profile found:", existingProfiles);
      return new Response(
        JSON.stringify({ error: `A member with name ${firstName} ${lastName} already exists` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }
    
    // Check for existing user with the same email
    const { data: existingUsers, error: emailCheckError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (emailCheckError) {
      console.error("Error checking for existing emails:", emailCheckError);
      return new Response(
        JSON.stringify({ error: `Failed to check for duplicate emails: ${emailCheckError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const emailExists = existingUsers?.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      console.error("Duplicate email found:", email);
      return new Response(
        JSON.stringify({ error: `A member with email ${email} already exists` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create the user with the admin client
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (userError) {
      console.error("User creation error:", userError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "No user data returned from creation" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("User created with ID:", userData.user.id);

    // Insert user role and profile in transaction-like manner
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        first_name: firstName,
        last_name: lastName
      });

    if (profileError) {
      // Try to clean up if profile insertion fails
      console.error("Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'member'
      });

    if (roleError) {
      // Try to clean up if role insertion fails
      console.error("Role creation error:", roleError);
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to set user role: ${roleError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("Member creation successful");

    return new Response(
      JSON.stringify({ 
        message: "Member created successfully",
        user: {
          id: userData.user.id,
          email,
          firstName,
          lastName
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 