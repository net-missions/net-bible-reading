import React, { useState } from "react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

type FormValues = z.infer<typeof formSchema>;

const MemberManagement = () => {
  const { isAdmin, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "You need admin privileges to add members.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setDebugInfo(null);
    
    try {
      // Use a direct fetch call instead of supabase.functions.invoke
      // This gives us more control over headers and error handling
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("No active session found. Please log in again.");
      }

      const token = sessionData.session.access_token;
      setDebugInfo(`Using token: ${token.substring(0, 10)}...`);
      
      // Get the URL for the Edge Function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`;
      
      // Make a direct fetch to the Edge Function
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName
        })
      });
      
      // Get the response data
      const data = await response.json();
      setDebugInfo(prev => `${prev}\nStatus: ${response.status}\nResponse: ${JSON.stringify(data)}`);
      
      // Handle response status
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${data.error || 'Unknown error'}`);
      }
      
      // Generate email for display in the success message
      const email = `${values.firstName.toLowerCase()}@netmissions.com`;
      
      toast({
        title: "Member added successfully",
        description: `${values.firstName} ${values.lastName} has been added as a member.\n\nCredentials:\nUsername/Email: ${email}\nPassword: ${values.lastName}`,
      });
      
      form.reset();
      setDebugInfo(null);
    } catch (error: any) {
      console.error("Add member error:", error);
      const errorMsg = error.message || "An unknown error occurred";
      setDebugInfo(prev => `${prev}\nError: ${errorMsg}`);
      
      toast({
        title: "Failed to add member",
        description: errorMsg,
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
        <CardTitle>Add New Member</CardTitle>
        <CardDescription>Create new accounts for congregation members</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                The member's email will be generated automatically using their name.
                The first name will be used as username and the last name as password.
              </p>
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="mt-4 w-full sm:w-auto">
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
            
            {debugInfo && (
              <div className="mt-4 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap">
                {debugInfo}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MemberManagement;
