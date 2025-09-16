import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAccessControl() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if user has a role (which means they have access)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error checking user role:', roleError);
      }

      // Check if user was invited and used the invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from('invited_users')
        .select('status')
        .eq('email', user.email)
        .eq('status', 'used')
        .single();

      if (inviteError && inviteError.code !== 'PGRST116') {
        console.error('Error checking invitation:', inviteError);
      }

      const hasRoleAccess = !!roleData;
      const hasInviteAccess = !!inviteData;
      const userHasAccess = hasRoleAccess || hasInviteAccess;

      setHasAccess(userHasAccess);
      setIsAdmin(roleData?.role === 'super_admin' || roleData?.role === 'admin');
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, isAdmin, loading, checkAccess };
}