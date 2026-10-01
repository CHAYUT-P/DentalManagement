/**
 * Full-system walkthrough test — simulates exactly what a parent and a
 * receptionist do, through the same code the UI calls (server actions),
 * verifying every surface afterwards. Run: pnpm e2e:test
 */
import "dotenv/config";

async function main() {
  const actions = await import("../src/server/actions");
  const queries = await import("../src/server/queries");
  const { todayISO, addDays, weekdayIndex } = await import("../src/lib/dates");

  const today = todayISO();
  let passed = 0, failed = 0;
  const ok = (name: string, cond: boolean, detail = "") => {
    if (cond) { passed++; console.log(`  ✓ ${name}`); }
    else { failed++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
  };

  console.log("\n— 1. Parent books online (new family) —");
  // find a day naree works, next week
  let date = addDays(today, 7);
  while (![1, 3, 5, 6].includes(weekdayIndex(date))) date = addDays(date, 1);

  // pick a slot no leftover run has taken, per dentist availability
  const allSlots = await (await import("../src/server/queries")).slotsForDate(date);
  const freeTimes = [...new Set(allSlots.filter((s) => !s.taken).map((s) => s.time))].sort();
  const time = freeTimes.find((t) => t >= "14:00") ?? freeTimes[0];
  console.log(`  (using ${date} at ${time})`);
  const result = await actions.bookAppointment({
    date, time, treatmentKey: "fluoride",
    dentistId: null, // "any dentist" — the UI's default choice
    // the patient site sends only the name to give at the desk + a phone
    childName: "น้องเทสเตอร์",
    phone: "0912345678",
  });
  ok(`booking confirmed with ref ${result.ref}`, result.ok && !!result.ref, JSON.stringify(result));
  if (!result.ok) process.exit(1);

  console.log("\n— 2. Booking visible in the system (pooled) —");
  const mine = await actions.myBookings("0912345678");
  ok(
    "patient /bookings finds it by phone",
    mine.some((m) => m.ref === result.ref),
    `got ${mine.map((m) => m.ref).join(",") || "none"}`,
  );
  const staffList = await queries.listAppointmentsBetween(today, addDays(today, 30));
  const onStaff = staffList.find(a => a.ref === result.ref);
  ok("staff list has it pooled (no dentist yet)", !!onStaff && onStaff.dentistId === null);
  const notifs = await queries.listNotifications();
  ok("staff notification bell has it", notifs.some(n => n.type === "online_booking" && n.refCode === result.ref));

  console.log("\n— 2b. Staff hands the pool booking to a dentist —");
  const capableFree = await queries.freeCapableAtSlot(date, time, "fluoride");
  ok("a capable dentist is free at that slot", capableFree.length > 0);
  const dentistId = capableFree[0].id;
  const dentistSlug = capableFree[0].slug;
  const assigned = await actions.assignPoolDentist(onStaff!.id, dentistId);
  ok("assign succeeds", assigned.ok);
  const staffList2 = await queries.listAppointmentsBetween(today, addDays(today, 30));
  const onStaff2 = staffList2.find(a => a.ref === result.ref);
  ok("staff list now shows the dentist", !!onStaff2 && onStaff2.dentistSlug === dentistSlug);

  console.log("\n— 3. Slot now reads taken —");
  const slots = await queries.slotsForDate(date);
  const takenSlot = slots.find(s => s.dentistSlug === dentistSlug && s.time === time);
  ok(`${time} with ${dentistSlug} shows taken`, takenSlot?.taken === true);
  const others = slots.filter(s => s.time === time && !s.taken);
  ok("other dentists still free", others.length > 0);

  console.log("\n— 4. Double-booking refused, specific bypasses pool —");
  const clash = await actions.bookAppointment({
    date, time, treatmentKey: "checkup",
    dentistId,
    childName: "น้องชนกัน", guardianName: "คุณชน", phone: "0988888888", forSelf: false,
  });
  ok("second booking at same slot rejected", !clash.ok && clash.error === "slot_taken");

  console.log("\n— 5. Online booking is name + phone only —");
  ok("booking keeps the name given", onStaff?.childName === "น้องเทสเตอร์");
  ok("no guardian/child record created from the patient site", onStaff?.guardianId === null && onStaff?.childId === null);

  console.log("\n— 6. Staff manages the queue —");
  await actions.staffAddWaitlist({ childName: "น้องวอคอิน", guardianPhone: "0912345678", treatmentKey: "checkup" });
  let wl = await queries.listWaitlist();
  // take the newest "waiting" entry with this name (earlier runs may linger)
  const mineQ = wl.filter(w => w.childName === "น้องวอคอิน" && w.status === "waiting");
  const entry = mineQ[mineQ.length - 1];
  ok("walk-in added to waitlist", !!entry);
  await actions.staffSetWaitlistStatus(entry!.id, "in_chair");
  wl = await queries.listWaitlist();
  ok("queue advanced to in_chair", wl.find(w => w.id === entry!.id)?.status === "in_chair");
  await actions.staffSetWaitlistStatus(entry!.id, "done");
  wl = await queries.listWaitlist();
  ok("queue completed", wl.find(w => w.id === entry!.id)?.status === "done");
  // leave no test walk-in on today's real board
  await actions.staffRemoveWaitlist(entry!.id);

  console.log("\n— 7. Staff edits content —");
  const naree = (await queries.listDentists()).find(d => d.slug === "naree")!;
  await actions.staffUpdateDentist("naree", { text: { th: { blurb: "ดูแลเด็กเล็กและการมาหาหมอฟันครั้งแรก (แก้ไขแล้ว)" } } });
  const naree2 = (await queries.listDentists()).find(d => d.slug === "naree")!;
  ok("dentist blurb edit persisted", naree2.text.th.blurb.includes("แก้ไขแล้ว"));
  await actions.staffUpdateDentist("naree", { text: { th: { blurb: naree.text.th.blurb } } }); // restore

  await actions.staffUpdatePrice("fluoride", 777);
  const prices = await queries.priceMap();
  ok("price edit persisted", prices.fluoride === 777);
  await actions.staffUpdatePrice("fluoride", 600); // restore

  console.log("\n— 8. Patient cancels —");
  await actions.cancelBooking(result.ref!, "0912345678");
  const after = await actions.myBookings("0912345678");
  ok("booking now cancelled", after[0]?.status === "cancelled");
  const freed = (await queries.slotsForDate(date)).find(s => s.dentistSlug === dentistSlug && s.time === time);
  ok("slot freed for others", freed?.taken === false);
  const cancelNotifs = await queries.listNotifications();
  ok("staff told about cancellation", cancelNotifs.some(n => n.type === "cancellation" && n.refCode === result.ref));

  console.log(`\n═══ ${passed} passed, ${failed} failed ═══\n`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
