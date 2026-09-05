const FALLBACK_URL = 'https://kwpwbocpjdtntnzjwytk.supabase.co';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_SWjHQ5z8P5IgrtkvWnkDuA_igM6IIgA';

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_PUBLISHABLE_KEY;
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({ configured: Boolean(url && publishableKey), url, publishableKey });
};