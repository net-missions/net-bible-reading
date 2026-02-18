import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    defaultValues: { firstName: "", lastName: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!isAdmin) return;
    setIsSubmitting(true);

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("profiles" as any)
        .select("id")
        .ilike("first_name", values.firstName.trim())
        .ilike("last_name", values.lastName.trim())
        .single();

      if (existing) {
        toast({ title: "Already exists", description: "A member with that name already exists.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("profiles" as any)
        .insert({ first_name: values.firstName.trim(), last_name: values.lastName.trim() } as any)
        .select()
        .single();

      if (pErr || !profile) throw pErr || new Error("Failed");

      const { error: rErr } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: (profile as any).id, role: "member" } as any);

      if (rErr) throw rErr;

      toast({ title: "Member added", description: `${values.firstName} ${values.lastName} has been added.` });
      form.reset();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Member</CardTitle>
        <CardDescription>Add a member by entering their name</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Smith" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MemberManagement;
