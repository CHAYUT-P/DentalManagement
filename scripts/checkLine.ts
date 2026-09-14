import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const appts = await sql`
    SELECT id, ref, child_name, guardian_name, phone, date, time, status, source
    FROM appointment ORDER BY id DESC LIMIT 3`;
  console.log("latest appointments:", JSON.stringify(appts, null, 2));

  const gs = await sql`
    SELECT id, name, phone, line_user_id FROM guardian ORDER BY id DESC LIMIT 5`;
  console.log("guardians:", JSON.stringify(gs, null, 2));

  await sql.end();
}

main();
