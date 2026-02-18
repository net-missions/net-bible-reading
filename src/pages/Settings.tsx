import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
});

const Settings = () => {
  const { profile, updateProfile } = useAuth();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
    },
  });

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    const success = await updateProfile({ first_name: values.firstName, last_name: values.lastName });
    if (success) toast({ title: "Profile updated" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your preferences.</p>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <User className="mr-2 h-4 w-4" /> Profile
              </CardTitle>
              <CardDescription>Update your name</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit">Save</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>"Your word is a lamp to my feet and a light to my path." — Psalm 119:105</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
