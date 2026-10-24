import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:\\Users\\guiag\\Documents\\Projeto Padrão\\agenda-agora-main\\";
const env = readFileSync(root + ".env", "utf8");
const get = (key) => {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match && match[1] ? match[1].trim().replace(/^["']|["']$/g, "") : undefined;
};

const url = get("SUPABASE_URL");
const admin = createClient(url, get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const client = createClient(url, get("SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false },
});

const email = "felipewelison92@gmail.com";
const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (linkError) throw new Error(linkError.message);

const { data: session, error: verifyError } = await client.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});
if (verifyError) throw new Error(verifyError.message);

writeFileSync(
  root + "public\\__tmp_master_session.json",
  JSON.stringify({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_at: session.session.expires_at,
    expires_in: session.session.expires_in,
    token_type: session.session.token_type,
    user: session.session.user,
  }),
);
console.log("sessao master criada");
