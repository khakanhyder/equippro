import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Profile() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update your account details and contact information
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" placeholder="First name" data-testid="input-first-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" placeholder="Last name" data-testid="input-last-name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="user@example.com" 
                data-testid="input-email"
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Authentication is managed by Replit Auth (Google, GitHub, or email)
            </div>

            <Button data-testid="button-save-changes">Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
