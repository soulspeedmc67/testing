// Creates a test shop owner in the LOCAL Firebase emulators, for trying the
// admin console (/xcyop) with NEXT_PUBLIC_FIREBASE_EMULATORS=1.
//
//   npm run fb:emulate      (in one terminal: auth + firestore)
//   node scripts/seed-emulator-admin.mjs
//
// Emulator only: it refuses to run against anything but 127.0.0.1.
const PROJECT = "dashit-1ecba";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = "http://127.0.0.1:8080";

export const TEST_ADMIN = { email: "owner@dashit.test", password: "emulator-only-9431" };

async function main() {
  const signUp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...TEST_ADMIN, returnSecureToken: true }),
  });
  let uid = (await signUp.json()).localId;
  if (!uid) {
    const signIn = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...TEST_ADMIN, returnSecureToken: true }),
    });
    uid = (await signIn.json()).localId;
  }
  if (!uid) throw new Error("Couldn't create the test owner. Are the emulators running?");

  // "Bearer owner" skips security rules, which only the emulator accepts.
  const staff = await fetch(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/staff/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: { role: { stringValue: "admin" }, active: { booleanValue: true }, name: { stringValue: "Test owner" } } }),
  });
  if (!staff.ok) throw new Error(`staff doc: ${staff.status} ${await staff.text()}`);
  console.log(`Test owner ready in the emulator: ${TEST_ADMIN.email} (uid ${uid})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
