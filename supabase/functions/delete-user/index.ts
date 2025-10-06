
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Create a Supabase client with the Auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create a second client with the service role to perform admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the user has permission to update users
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated', details: authError?.message }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get the user's permissions from the users table
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('staff_access')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error("User data error:", userError);
      return new Response(
        JSON.stringify({ error: 'Error fetching user permissions', details: userError?.message }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if user has editor access to staff section
    if (userData.staff_access !== 'editor') {
      return new Response(
        JSON.stringify({ error: 'No permission to delete users', access: userData.staff_access }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Get request data
    let requestData: { userId: string };
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { userId } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: `Error deleting user: ${deleteError.message}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Log success for debugging
    console.log("User deleted successfully:", userId);

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Log the full error for debugging
    console.error("Unexpected error:", error);
    
    // Return a detailed error response
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: Deno.env.get('SUPABASE_ENV') === 'dev' && error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
