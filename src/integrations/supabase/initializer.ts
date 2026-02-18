import { supabase } from './client';

export const initializeSupabase = async (): Promise<void> => {
  try {
    const { error } = await supabase.from('profiles' as any).select('count', { count: 'exact', head: true });
    if (error) throw new Error(`Failed to connect: ${error.message}`);
    console.log('Supabase connected');
  } catch (err) {
    console.error('Supabase init failed:', err);
    throw err;
  }
};
