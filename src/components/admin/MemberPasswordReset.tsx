import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// URL for Supabase API
const SUPABASE_URL = "https://pibjpeltpfqxicozdefd.supabase.co";

// Form schema for password reset
const formSchema = z.object({
  memberId: z.string().min(1, "Member selection is required"),
  newPassword: z.string().min(3, "Password must be at least 3 characters"),
});

type FormValues = z.infer<typeof formSchema>;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
};

const MemberPasswordReset = () => {
  const { isAdmin, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: "",
      newPassword: "",
    },
  });

  // Fetch members when component mounts
  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // Get members from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name
        `)
        .neq('id', user?.id || ''); // Exclude current user
      
      if (error) throw error;
      
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Failed to load members",
        description: error.message || "Could not load member list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "You need admin privileges to reset passwords.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setDebugInfo(null);
    
    try {
      // Get admin session for authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("No active session found. Please log in again.");
      }

      const token = sessionData.session.access_token;
      
      // Find the selected member
      const selectedMember = members.find(m => m.id === values.memberId);
      if (!selectedMember) {
        throw new Error("Selected member not found");
      }
      
      // Use Edge Function to reset password
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: values.memberId,
          newPassword: values.newPassword
        })
      });
      
      // Parse response
      const responseText = await response.text();
      let data;
      
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response:", e);
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to reset password: ${data?.error || 'Unknown error'}`);
      }
      
      // Success message
      toast({
        title: "Password reset successful",
        description: `Password for ${selectedMember.first_name} ${selectedMember.last_name} has been updated.`,
      });
      
      form.reset({
        memberId: "",
        newPassword: ""
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Failed to reset password",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Denied</CardTitle>
          <CardDescription>You need admin privileges to access this feature.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Member Password</CardTitle>
        <CardDescription>Change a member's password</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Member</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting || members.length === 0} className="mt-4 w-full sm:w-auto">
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
              
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No members available to reset passwords for.
                </p>
              )}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberPasswordReset; 