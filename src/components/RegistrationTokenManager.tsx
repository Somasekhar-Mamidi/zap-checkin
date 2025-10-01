import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, QrCode as QrCodeIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Token {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  notes: string | null;
}

export function RegistrationTokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { toast } = useToast();

  // Form state
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('registration_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createToken = async () => {
    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      const { error } = await supabase
        .from('registration_tokens')
        .insert({
          token,
          expires_at: expiresAt.toISOString(),
          max_uses: maxUses,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: "Token Created",
        description: "Registration token created successfully",
      });

      setShowCreateForm(false);
      setNotes("");
      fetchTokens();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteToken = async (id: string) => {
    try {
      const { error } = await supabase
        .from('registration_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Token Deleted",
        description: "Registration token deleted successfully",
      });

      fetchTokens();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Copied",
      description: "Token copied to clipboard",
    });
  };

  const getRegistrationUrl = (token: string) => {
    return `${window.location.origin}/self-register?token=${token}`;
  };

  const showQRCode = (token: Token) => {
    setSelectedToken(token);
    setShowQRDialog(true);
  };

  const downloadQRCode = (token: string) => {
    const svg = document.querySelector(`#qr-container-${token} svg`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      canvas.width = 256;
      canvas.height = 256;
      
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `registration-token-${token}.png`;
        link.href = url;
        link.click();
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registration Tokens</CardTitle>
          <CardDescription>
            Manage secure registration tokens for self-registration. Users need a valid token to register.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Create New Token
          </Button>

          {showCreateForm && (
            <Card className="mb-4">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryHours">Expires In (Hours)</Label>
                    <Input
                      id="expiryHours"
                      type="number"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUses">Maximum Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this token..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createToken}>Create Token</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No tokens created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-mono text-sm">{token.token}</TableCell>
                      <TableCell>
                        {token.is_active && new Date(token.expires_at) > new Date() ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {token.current_uses} / {token.max_uses}
                      </TableCell>
                      <TableCell>
                        {format(new Date(token.expires_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {token.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToken(token.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showQRCode(token)}
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteToken(token.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code for self-registration. Token: {selectedToken?.token}
            </DialogDescription>
          </DialogHeader>
          {selectedToken && (
            <div className="flex flex-col items-center space-y-4">
              <div id={`qr-container-${selectedToken.token}`}>
                <QRCodeSVG
                  value={getRegistrationUrl(selectedToken.token)}
                  size={256}
                  level="H"
                />
              </div>
              <Button onClick={() => downloadQRCode(selectedToken.token)}>
                Download QR Code
              </Button>
              <div className="text-sm text-muted-foreground break-all">
                URL: {getRegistrationUrl(selectedToken.token)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
