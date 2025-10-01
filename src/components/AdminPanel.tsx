import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Shield, Users, Mail, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationTokenManager } from "@/components/RegistrationTokenManager";

interface InvitedUser {
  id: string;
  email: string;
  status: string;
  invited_at: string;
  used_at?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  } | null;
}

const AdminPanel = () => {
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkAdminStatus();
    loadInvitedUsers();
    loadUserRoles();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['super_admin', 'admin'])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadInvitedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('invited_users')
        .select('*')
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error loading invited users:', error);
        return;
      }

      setInvitedUsers(data || []);
    } catch (error) {
      console.error('Error loading invited users:', error);
    }
  };

  const loadUserRoles = async () => {
    try {
      // First get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        return;
      }

      if (!rolesData || rolesData.length === 0) {
        setUserRoles([]);
        return;
      }

      // Then get profiles for these users
      const userIds = rolesData.map(role => role.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Combine the data
      const combinedData = rolesData.map(role => ({
        ...role,
        profiles: profilesData?.find(profile => profile.user_id === role.user_id) || null
      }));

      setUserRoles(combinedData);
    } catch (error) {
      console.error('Error loading user roles:', error);
    }
  };

  const inviteUser = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('invited_users')
        .insert([
          {
            email: newEmail.trim().toLowerCase(),
            invited_by: user?.id,
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "This email has already been invited.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: newEmail.trim().toLowerCase(),
            inviterName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
            inviterEmail: user?.email,
          }
        });

        if (emailError) {
          console.error('Error sending invitation email:', emailError);
          // Don't fail the invitation if email fails
          toast({
            title: "Invitation Created",
            description: `Successfully invited ${newEmail}, but email notification failed to send.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully invited ${newEmail} and sent notification email!`,
          });
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: "Invitation Created",
          description: `Successfully invited ${newEmail}, but email notification failed to send.`,
        });
      }

      setNewEmail("");
      setDialogOpen(false);
      loadInvitedUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "Failed to invite user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeInvitation = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from('invited_users')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Revoked invitation for ${email}`,
      });

      loadInvitedUsers();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast({
        title: "Error",
        description: "Failed to revoke invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (id: string, email: string) => {
    setLoading(true);
    try {
      // Update invitation status to pending and refresh timestamp
      const { error } = await supabase
        .from('invited_users')
        .update({ 
          status: 'pending',
          invited_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: email,
            inviterName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
            inviterEmail: user?.email,
          }
        });

        if (emailError) {
          console.error('Error sending invitation email:', emailError);
          toast({
            title: "Invitation Resent",
            description: `Successfully resent invitation to ${email}, but email notification failed to send.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Success",
            description: `Successfully resent invitation to ${email} and sent notification email!`,
          });
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: "Invitation Resent",
          description: `Successfully resent invitation to ${email}, but email notification failed to send.`,
        });
      }

      loadInvitedUsers();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'used':
        return <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="default" className="bg-red-600 hover:bg-red-700"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'user':
        return <Badge variant="outline"><Users className="w-3 h-3 mr-1" />User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const deleteUser = async (userId: string, userEmail: string, userRole: string) => {
    // Prevent super admins from being deleted and prevent deletion of own account
    if (userRole === 'super_admin') {
      toast({
        title: "Error",
        description: "Super admin accounts cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (userId === user?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete user role to revoke access
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `Successfully removed access for ${userEmail}`,
      });

      loadUserRoles();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="invitations" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invitations">User Invitations</TabsTrigger>
              <TabsTrigger value="users">Active Users</TabsTrigger>
              <TabsTrigger value="tokens">Registration Tokens</TabsTrigger>
            </TabsList>

            <TabsContent value="invitations" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Manage Access</h3>
                  <p className="text-sm text-muted-foreground">Invite users to access the platform</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite New User</DialogTitle>
                      <DialogDescription>
                        Enter an email address to invite someone to access the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={inviteUser} disabled={loading}>
                        {loading ? "Inviting..." : "Send Invitation"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {invitedUsers.length === 0 ? (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    No invitations sent yet. Click "Invite User" to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitedUsers.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(invitation.invited_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.used_at ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(invitation.used_at).toLocaleDateString()}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeInvitation(invitation.id, invitation.email)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                          {invitation.status === 'revoked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvitation(invitation.id, invitation.email)}
                              disabled={loading}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              {loading ? "Sending..." : "Resend"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Active Users</h3>
                <p className="text-sm text-muted-foreground">Users with access to the platform</p>
              </div>

              {userRoles.length === 0 ? (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    No users have access yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-medium">
                          {userRole.profiles?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>{userRole.profiles?.email}</TableCell>
                        <TableCell>{getRoleBadge(userRole.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(userRole.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {userRole.role !== 'super_admin' && userRole.user_id !== user?.id && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove User Access</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to remove access for {userRole.profiles?.email}? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline">Cancel</Button>
                                  <Button 
                                    variant="destructive"
                                    onClick={() => deleteUser(userRole.user_id, userRole.profiles?.email || 'Unknown', userRole.role)}
                                  >
                                    Remove Access
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
              <RegistrationTokenManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;