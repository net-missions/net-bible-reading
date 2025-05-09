import { supabase } from './client';

/**
 * This function can be run from the browser console to fix user_roles table issues
 */
export const fixUserRolesTable = async () => {
  console.log("Checking for user_roles table...");
  
  try {
    // First check if user_roles table exists
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_roles');
    
    if (tablesError) {
      console.error("Error checking tables:", tablesError);
      return { success: false, error: tablesError };
    }
    
    if (tablesData && tablesData.length > 0) {
      console.log("user_roles table exists");
      
      // Check for role enum
      const { data: enumData, error: enumError } = await supabase
        .from('information_schema.columns')
        .select('data_type, udt_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_roles')
        .eq('column_name', 'role');
      
      if (enumError) {
        console.error("Error checking role column:", enumError);
        return { success: false, error: enumError };
      }
      
      console.log("Role column type:", enumData);
      
      // Check RLS policies
      const { error: rlsError } = await supabase.rpc('test_rls');
      if (rlsError) {
        console.log("RLS issues detected, attempting to fix");
        
        // Try to fix RLS policies
        const fixResult = await fixRlsPolicies();
        return fixResult;
      }
      
      console.log("user_roles table and policies appear to be working");
      return { success: true, message: "user_roles table and policies are working correctly" };
    } else {
      console.log("user_roles table does not exist, creating it...");
      const createResult = await createUserRolesTable();
      return createResult;
    }
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error };
  }
};

const createUserRolesTable = async () => {
  try {
    console.log("Creating user_roles table...");
    
    // We'll need to run this as a SQL query
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        -- Create app_role enum if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
            CREATE TYPE app_role AS ENUM ('admin', 'member');
          END IF;
        END
        $$;
        
        -- Create user_roles table
        CREATE TABLE IF NOT EXISTS public.user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role app_role NOT NULL DEFAULT 'member',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(user_id)
        );
        
        -- Add RLS policies
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        DO $$
        BEGIN
          -- Users can read their own role
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own role') THEN
            CREATE POLICY "Users can view their own role"
              ON public.user_roles
              FOR SELECT
              USING (auth.uid() = user_id);
          END IF;
          
          -- Admins can view all roles
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles') THEN
            CREATE POLICY "Admins can view all roles"
              ON public.user_roles
              FOR SELECT
              USING (
                EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
          END IF;
          
          -- Admins can insert roles
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can insert roles') THEN
            CREATE POLICY "Admins can insert roles"
              ON public.user_roles
              FOR INSERT
              WITH CHECK (
                EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
          END IF;
          
          -- Admins can update roles
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can update roles') THEN
            CREATE POLICY "Admins can update roles"
              ON public.user_roles
              FOR UPDATE
              USING (
                EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
          END IF;
          
          -- Admins can delete roles
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can delete roles') THEN
            CREATE POLICY "Admins can delete roles"
              ON public.user_roles
              FOR DELETE
              USING (
                EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_id = auth.uid() AND role = 'admin'
                )
              );
          END IF;
        END
        $$;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
      `
    });
    
    if (error) {
      console.error("Error creating user_roles table:", error);
      return { success: false, error };
    }
    
    console.log("user_roles table created successfully");
    return { success: true, message: "user_roles table created successfully" };
  } catch (error) {
    console.error("Error creating user_roles table:", error);
    return { success: false, error };
  }
};

const fixRlsPolicies = async () => {
  try {
    console.log("Fixing RLS policies...");
    
    // We'll need to run this as a SQL query
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
        
        -- Recreate policies
        -- Users can read their own role
        CREATE POLICY "Users can view their own role"
          ON public.user_roles
          FOR SELECT
          USING (auth.uid() = user_id);
        
        -- Admins can view all roles
        CREATE POLICY "Admins can view all roles"
          ON public.user_roles
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM user_roles
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Admins can insert roles
        CREATE POLICY "Admins can insert roles"
          ON public.user_roles
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM user_roles
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Admins can update roles
        CREATE POLICY "Admins can update roles"
          ON public.user_roles
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM user_roles
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
        
        -- Admins can delete roles
        CREATE POLICY "Admins can delete roles"
          ON public.user_roles
          FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM user_roles
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          );
      `
    });
    
    if (error) {
      console.error("Error fixing RLS policies:", error);
      return { success: false, error };
    }
    
    console.log("RLS policies fixed successfully");
    return { success: true, message: "RLS policies fixed successfully" };
  } catch (error) {
    console.error("Error fixing RLS policies:", error);
    return { success: false, error };
  }
};

// Export function that can be called from the console
(window as any).fixUserRolesTable = fixUserRolesTable; 