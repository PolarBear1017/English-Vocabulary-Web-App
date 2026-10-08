type AuthClient = {
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: unknown };
      error: unknown;
    }>;
  };
};

// Verify the session with Supabase Auth; the project's API key is not a user identity.
// Anonymous Auth sessions are valid users too, preserving the app's guest flow.
export const hasAuthenticatedUser = async (req: Request, client: AuthClient): Promise<boolean> => {
  const match = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i);
  if (!match || match[1].startsWith('sb_')) return false;
  const { data, error } = await client.auth.getUser(match[1]);
  return !error && Boolean(data.user);
};
