import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

type FormValues = z.infer<typeof formSchema>;

const Setup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  useEffect(() => {
    const check = async () => {
      const { count } = await supabase.from("user_roles" as any).select("*", { count: "exact", head: true });
      if (count && count > 0) navigate("/login");
      setIsLoading(false);
    };
    check();
  }, [navigate]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const { data: profile, error: pErr } = await supabase
        .from("profiles" as any)
        .insert({ first_name: values.firstName.trim(), last_name: values.lastName.trim() } as any)
        .select()
        .single();
      if (pErr || !profile) throw pErr || new Error("Failed to create profile");

      const { error: rErr } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: (profile as any).id, role: "admin" } as any);
      if (rErr) throw rErr;

      toast({ title: "Setup Complete", description: "Admin account created. Please sign in." });
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">Net Missions Fellowship</h1>
          <p className="text-muted-foreground mt-1 text-sm">First-time setup</p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create Admin</CardTitle>
            <CardDescription>Set up the first administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Admin"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
