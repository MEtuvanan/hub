// Public client configuration only. Never put service-role or Groq keys here.
// The anon key is safe to expose ONLY because every table is protected by RLS.
export const SUPABASE_URL = 'https://tnoemhibqtrjpccnwfzz.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRub2VtaGlicXRyanBjY253Znp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODYxNjEsImV4cCI6MjEwODI2MjE2MX0.mkFwqGlidN8f7uBbubCEdG9emxFeeWF8uYXOGw2Ctpg';

// Replace with a referrer-restricted Google Maps JavaScript API key.
// NOTE: current value does not look like a Google key (those start with "AIza"). Verify it.
export const GOOGLE_MAPS_API_KEY = 'd16a6e6d5592077308931f90023b15348c9b1404e4918f63d2a45b6993bb4994';

// Map defaults: whole of Thailand.
export const MAP_DEFAULTS = { center: { lat: 13.0, lng: 101.0 }, zoom: 6 };
