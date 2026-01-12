// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// TODO: 請前往 Supabase Dashboard -> Project Settings -> API 複製以下資訊
const supabaseUrl = 'https://qucyaothykoxwluaezwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1Y3lhb3RoeWtveHdsdWFlendoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTg0NzEsImV4cCI6MjA4Mzc3NDQ3MX0.uZQfeKJa_d1WkCR2Zn1ylgduYR9E8jrMbQmZkPOEwUY';

export const supabase = createClient(supabaseUrl, supabaseKey);
