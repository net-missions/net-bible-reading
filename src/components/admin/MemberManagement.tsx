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
  const { isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    
    try {
      // Call the create-member Edge Function
      const response = await supabase.functions.invoke('create-member', {
        body: {
          firstName: values.firstName,
          lastName: values.lastName
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to create member");
      }
      
      if (!response.data) {
        throw new Error("Failed to create member");
      }
      
      // Generate email for display in the success message
      const email = `${values.firstName.toLowerCase()}@netmissions.com`;
      
      toast({
        title: "Member added successfully",
        description: `${values.firstName} ${values.lastName} has been added as a member.\n\nCredentials:\nUsername/Email: ${email}\nPassword: ${values.lastName}`,
      });
      
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to add member",
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
            
            <Button type="submit" disabled={isSubmitting} className="mt-4">
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MemberManagement;
