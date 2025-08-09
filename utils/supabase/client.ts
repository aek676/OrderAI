import { type Database } from "../../types/database.types.js";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export default supabase;