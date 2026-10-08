


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_library" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "word_id" bigint NOT NULL,
    "proficiency_score" integer DEFAULT 0,
    "next_review" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "due" timestamp with time zone,
    "stability" double precision,
    "difficulty" double precision,
    "elapsed_days" integer,
    "scheduled_days" integer,
    "reps" integer,
    "lapses" integer,
    "state" integer,
    "last_review" timestamp with time zone,
    "selected_definitions" "jsonb",
    "source" "text",
    "is_ai_generated" boolean DEFAULT false,
    "is_starred" boolean DEFAULT false
);


ALTER TABLE "public"."user_library" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_word_with_preferences"("p_word_data" "jsonb", "p_user_id" "uuid", "p_folder_id" "uuid" DEFAULT NULL::"uuid", "p_selected_defs" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."user_library"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  dict_id bigint;
  lib_entry user_library;
  is_ai boolean;
BEGIN
  -- 安全解析布林值
  is_ai := CASE 
    WHEN p_word_data->>'isAiGenerated' = 'true' THEN true 
    WHEN p_word_data->>'is_ai_generated' = 'true' THEN true 
    ELSE false 
  END;

  -- 寫入/取得單字表
  INSERT INTO dictionary (
    word, 
    definition, 
    translation, 
    pos, 
    phonetic, 
    example, 
    audio_url, 
    us_audio_url, 
    uk_audio_url, 
    source, 
    is_ai_generated
  )
  VALUES (
    p_word_data->>'word',
    p_word_data->>'definition',
    p_word_data->>'translation',
    p_word_data->>'pos',
    p_word_data->>'phonetic',
    p_word_data->>'example',
    COALESCE(p_word_data->>'audioUrl', p_word_data->>'audio'),
    COALESCE(p_word_data->>'usAudioUrl', p_word_data->>'us_audio'),
    COALESCE(p_word_data->>'ukAudioUrl', p_word_data->>'uk_audio'),
    p_word_data->>'source',
    is_ai
  )
  ON CONFLICT (word) DO UPDATE
  SET
    definition = EXCLUDED.definition,
    translation = EXCLUDED.translation,
    is_ai_generated = EXCLUDED.is_ai_generated
  RETURNING id INTO dict_id;

  -- 寫入/更新使用者單字庫
  INSERT INTO user_library (user_id, word_id, selected_definitions)
  VALUES (p_user_id, dict_id, p_selected_defs)
  ON CONFLICT (user_id, word_id) DO UPDATE
  SET
    selected_definitions = EXCLUDED.selected_definitions,
    last_review = now()
  RETURNING * INTO lib_entry;

  -- 寫入資料夾關聯
  IF p_folder_id IS NOT NULL THEN
    BEGIN
      INSERT INTO library_folder_map (library_id, folder_id, user_id)
      VALUES (lib_entry.id, p_folder_id, p_user_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN lib_entry;
END;
$$;


ALTER FUNCTION "public"."save_word_with_preferences"("p_word_data" "jsonb", "p_user_id" "uuid", "p_folder_id" "uuid", "p_selected_defs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suggest_words"("query_text" "text", "max_results" integer DEFAULT 5) RETURNS TABLE("word" "text", "match_type" "text", "score" real)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $_$
declare
  has_frequency boolean;
begin
  -- 檢查是否存在 frequency 欄位
  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dictionary'
      and column_name = 'frequency'
  ) into has_frequency;

  if has_frequency then
    return query
    execute $sql$
      with normalized as (select lower(trim($1)) as q),
      candidates as (
        select d.word,
          case
            when lower(d.word) = q then 0
            when lower(d.word) like q || '%' then 1
            else 2
          end as match_rank,
          case
            when lower(d.word) = q then 1.0
            when lower(d.word) like q || '%' then 0.9
            else similarity(lower(d.word), q)
          end as score,
          length(d.word) as word_length,
          coalesce(d.frequency, 0) as frequency
        from public.dictionary d, normalized
        where lower(d.word) like q || '%'
           or similarity(lower(d.word), q) >= 0.3
      )
      select word,
        case match_rank when 0 then 'exact' when 1 then 'prefix' else 'fuzzy' end as match_type,
        score
      from candidates
      -- 排序邏輯：完全符合 > 頻率高 > 字短 > 相似度高
      order by match_rank asc, frequency desc nulls last, word_length asc, score desc
      limit $2
    $sql$
    using query_text, max_results;
  else
    -- 如果沒有 frequency 欄位的備用邏輯
    return query
    execute $sql$
      with normalized as (select lower(trim($1)) as q),
      candidates as (
        select d.word,
          case
            when lower(d.word) = q then 0
            when lower(d.word) like q || '%' then 1
            else 2
          end as match_rank,
          case
            when lower(d.word) = q then 1.0
            when lower(d.word) like q || '%' then 0.9
            else similarity(lower(d.word), q)
          end as score,
          length(d.word) as word_length
        from public.dictionary d, normalized
        where lower(d.word) like q || '%'
           or similarity(lower(d.word), q) >= 0.3
      )
      select word,
        case match_rank when 0 then 'exact' when 1 then 'prefix' else 'fuzzy' end as match_type,
        score
      from candidates
      order by match_rank asc, word_length asc, score desc
      limit $2
    $sql$
    using query_text, max_results;
  end if;
end;
$_$;


ALTER FUNCTION "public"."suggest_words"("query_text" "text", "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_word_folders"("p_user_id" "uuid", "p_library_id" bigint, "p_folder_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- 清除舊關聯
  DELETE FROM library_folder_map
  WHERE library_id = p_library_id
    AND user_id = p_user_id;

  -- 批次寫入新關聯
  IF p_folder_ids IS NOT NULL AND array_length(p_folder_ids, 1) > 0 THEN
    INSERT INTO library_folder_map (library_id, folder_id, user_id)
    SELECT p_library_id, unnest(p_folder_ids), p_user_id
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_word_folders"("p_user_id" "uuid", "p_library_id" bigint, "p_folder_ids" "uuid"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dictionary" (
    "id" bigint NOT NULL,
    "word" "text" NOT NULL,
    "definition" "text",
    "translation" "text",
    "pos" "text",
    "phonetic" "text",
    "example" "text",
    "mnemonics" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "audio_url" "text",
    "us_audio_url" "text",
    "uk_audio_url" "text",
    "ai_data" "jsonb",
    "source" "text",
    "is_ai_generated" boolean DEFAULT false
);


ALTER TABLE "public"."dictionary" OWNER TO "postgres";


ALTER TABLE "public"."dictionary" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dictionary_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."library_folder_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "library_id" bigint NOT NULL,
    "folder_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."library_folder_map" OWNER TO "postgres";


ALTER TABLE "public"."user_library" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_library_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."word_ai_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "word" "text" NOT NULL,
    "prompt_type" "text" NOT NULL,
    "content" "jsonb",
    "source" "text",
    "model" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."word_ai_cache" OWNER TO "postgres";


ALTER TABLE ONLY "public"."dictionary"
    ADD CONSTRAINT "dictionary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dictionary"
    ADD CONSTRAINT "dictionary_word_key" UNIQUE ("word");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "library_folder_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "library_folder_map_unique_link" UNIQUE ("library_id", "folder_id");



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "unique_library_folder_map" UNIQUE ("library_id", "folder_id");



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "unique_library_folder_pair" UNIQUE ("library_id", "folder_id");



ALTER TABLE ONLY "public"."user_library"
    ADD CONSTRAINT "user_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_library"
    ADD CONSTRAINT "user_library_user_id_word_id_key" UNIQUE ("user_id", "word_id");



ALTER TABLE ONLY "public"."word_ai_cache"
    ADD CONSTRAINT "word_ai_cache_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "dictionary_word_unique" ON "public"."dictionary" USING "btree" ("lower"("word"));



CREATE INDEX "idx_dictionary_word_trgm" ON "public"."dictionary" USING "gin" ("word" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_user_library_review" ON "public"."user_library" USING "btree" ("next_review");



CREATE INDEX "idx_user_library_user" ON "public"."user_library" USING "btree" ("user_id");



CREATE INDEX "trgm_idx" ON "public"."dictionary" USING "gin" ("lower"("word") "extensions"."gin_trgm_ops");



CREATE INDEX "user_library_due_idx" ON "public"."user_library" USING "btree" ("due");



CREATE UNIQUE INDEX "word_ai_cache_unique" ON "public"."word_ai_cache" USING "btree" ("lower"("word"), "prompt_type");



CREATE INDEX "word_ai_cache_word_idx" ON "public"."word_ai_cache" USING "btree" ("lower"("word"));



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "library_folder_map_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "library_folder_map_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "public"."user_library"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."library_folder_map"
    ADD CONSTRAINT "library_folder_map_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_library"
    ADD CONSTRAINT "user_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_library"
    ADD CONSTRAINT "user_library_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "public"."dictionary"("id");



CREATE POLICY "Allow public read access" ON "public"."dictionary" FOR SELECT USING (true);



CREATE POLICY "Enable ALL access for owner" ON "public"."user_library" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read access for dictionary" ON "public"."dictionary" FOR SELECT USING (true);



CREATE POLICY "Users can add to their own collection" ON "public"."user_library" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own collection" ON "public"."user_library" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folder mappings" ON "public"."library_folder_map" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own folder mappings" ON "public"."library_folder_map" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own folders" ON "public"."folders" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own collection" ON "public"."user_library" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own collection" ON "public"."user_library" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own folder mappings" ON "public"."library_folder_map" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."dictionary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."library_folder_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_library" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."word_ai_cache" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."user_library" TO "anon";
GRANT ALL ON TABLE "public"."user_library" TO "authenticated";
GRANT ALL ON TABLE "public"."user_library" TO "service_role";



GRANT ALL ON FUNCTION "public"."save_word_with_preferences"("p_word_data" "jsonb", "p_user_id" "uuid", "p_folder_id" "uuid", "p_selected_defs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_word_with_preferences"("p_word_data" "jsonb", "p_user_id" "uuid", "p_folder_id" "uuid", "p_selected_defs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_word_with_preferences"("p_word_data" "jsonb", "p_user_id" "uuid", "p_folder_id" "uuid", "p_selected_defs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."suggest_words"("query_text" "text", "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."suggest_words"("query_text" "text", "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."suggest_words"("query_text" "text", "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_word_folders"("p_user_id" "uuid", "p_library_id" bigint, "p_folder_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_word_folders"("p_user_id" "uuid", "p_library_id" bigint, "p_folder_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_word_folders"("p_user_id" "uuid", "p_library_id" bigint, "p_folder_ids" "uuid"[]) TO "service_role";


















GRANT ALL ON TABLE "public"."dictionary" TO "anon";
GRANT ALL ON TABLE "public"."dictionary" TO "authenticated";
GRANT ALL ON TABLE "public"."dictionary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."library_folder_map" TO "anon";
GRANT ALL ON TABLE "public"."library_folder_map" TO "authenticated";
GRANT ALL ON TABLE "public"."library_folder_map" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_library_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_library_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_library_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."word_ai_cache" TO "anon";
GRANT ALL ON TABLE "public"."word_ai_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."word_ai_cache" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";


