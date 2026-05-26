import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking Supabase tables using Anon Key...");
  
  const { count: userLibraryCount, error: err1 } = await supabase
    .from('user_library')
    .select('*', { count: 'exact', head: true });
    
  console.log("user_library count:", err1 ? `Error: ${err1.message}` : userLibraryCount);

  const { count: foldersCount, error: err2 } = await supabase
    .from('folders')
    .select('*', { count: 'exact', head: true });
    
  console.log("folders count:", err2 ? `Error: ${err2.message}` : foldersCount);

  const { count: mapCount, error: err3 } = await supabase
    .from('library_folder_map')
    .select('*', { count: 'exact', head: true });
    
  console.log("library_folder_map count:", err3 ? `Error: ${err3.message}` : mapCount);
}

run();
