import { supabase } from './client';

/**
 * Initializes and tests the Supabase connection
 * @returns A promise that resolves if connection is successful
 */
export const initializeSupabase = async (): Promise<void> => {
  try {
    console.log('Testing Supabase connection...');
    
    // A simple ping to check if we can connect
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error);
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    
    console.log('Supabase connection successful');
    return;
  } catch (err) {
    console.error('Failed to initialize Supabase:', err);
    throw err;
  }
}; 