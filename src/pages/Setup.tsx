
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const Setup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingUsers, setHasExistingUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Check if there are existing users
  useEffect(() => {
    const checkExistingUsers = async () => {
      try {
        const { data: userRoles, error, count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        if (count && count > 0) {
          setHasExistingUsers(true);
          navigate("/login");
        }
      } catch (error) {
        console.error("Error checking existing users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingUsers();
  }, [navigate]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await supabase.functions.invoke('create-first-admin', {
        body: {
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName
        }
      });
      
      if (!response.data) {
        throw new Error(response.error?.message || "Failed to create admin user");
      }
      
      toast({
        title: "Setup Complete",
        description: "Admin account created successfully. You can now sign in.",
      });
      
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Checking setup status...</p>
      </div>
    );
  }

  if (hasExistingUsers) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Book className="h-12 w-12 text-primary mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Scripture Stride Tracker</h1>
          <p className="text-muted-foreground mt-2">First-time setup</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Admin Account</CardTitle>
            <CardDescription>
              Set up the first administrator account for your congregation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Admin..." : "Create Admin Account"}
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
