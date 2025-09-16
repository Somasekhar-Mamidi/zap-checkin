import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Mail, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AccessDenied = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this platform yet.
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">Access Required</span>
            </div>
            <p className="text-sm text-orange-700">
              This platform requires an invitation from an administrator. Please contact your administrator to request access.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Signed in as: {user?.email}</span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            If you believe this is an error, please contact your system administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;