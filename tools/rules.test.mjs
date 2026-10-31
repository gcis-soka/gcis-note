// firestore.rules の自動テスト（配信の前に GitHub Actions が実行。1つでも失敗したら配信しない）
// 手元で試すとき：npx firebase-tools emulators:exec --only firestore --project demo-gcis "node tools/rules.test.mjs"
// ルールを変えたら、ここにも「通るべきもの」「通ってはいけないもの」を足す
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-gcis",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") }
});

// ---- 登場人物 ----
const S1 = { uid: "s1", email: "59s1@tokyo.soka.ed.jp" };   // 生徒（3組12番）
const S2 = { uid: "s2", email: "59s2@tokyo.soka.ed.jp" };   // 別の生徒
const T  = { uid: "t1", email: "teacher@soka.ed.jp" };      // 教員
const X  = { uid: "x1", email: "someone@gmail.com" };       // 学校外
const as = (u, verified = true) => env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore();

const prof = (u, o = {}) => ({ email: u.email, ki: "59", class: 3, number: 12, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...o });
const note = (u, o = {}) => ({ uid: u.uid, lesson: "L01", ki: "59", class: 3, number: 12, step: 1, submitted: false, data: { odai1: "ゲーム" }, updatedAt: serverTimestamp(), ...o });

// 下準備（ルールを通さずに入れる）：S2 のプロフィールとノート
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, "students", S2.uid), prof(S2, { number: 13 }));
  await setDoc(doc(db, "notes", S2.uid + "_L01"), note(S2, { number: 13 }));
});

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log("  ✓ " + name); }
  catch (e) { fail++; console.log("  ✗ " + name + "\n      " + (e.message || e)); }
}

console.log("生徒");
const s1 = as(S1);
await t("自分のプロフィールを作れる", () => assertSucceeds(setDoc(doc(s1, "students", S1.uid), prof(S1))));
await t("期がアドレスと違うと作れない", () => assertFails(setDoc(doc(s1, "students", S1.uid), prof(S1, { ki: "58" }))));
await t("生徒もクラス「テスト」を選べる（今の仕様）", () => assertSucceeds(setDoc(doc(s1, "students", S1.uid), prof(S1, { class: 0 }))));
await t("番号42は作れない", () => assertFails(setDoc(doc(s1, "students", S1.uid), prof(S1, { number: 42 }))));
await t("余計な項目は入れられない", () => assertFails(setDoc(doc(s1, "students", S1.uid), prof(S1, { role: "teacher" }))));
await t("（戻す）3組12番", () => assertSucceeds(setDoc(doc(s1, "students", S1.uid), prof(S1))));
await t("他人のプロフィールは読めない", () => assertFails(getDoc(doc(s1, "students", S2.uid))));
await t("自分の L01 ノートを書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_L01"), note(S1))));
await t("自分のノートを読める", () => assertSucceeds(getDoc(doc(s1, "notes", S1.uid + "_L01"))));
await t("クラスをプロフィールと違えて書けない", () => assertFails(setDoc(doc(s1, "notes", S1.uid + "_L01"), note(S1, { class: 4 }))));
await t("自分の L02 ノートを書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_L02"), note(S1, { lesson: "L02", data: { did: "やった", q1: "なんで？" } }))));
await t("ID と回が食い違うと書けない（ID は L02・中身は L01）", () => assertFails(setDoc(doc(s1, "notes", S1.uid + "_L02"), note(S1))));
await t("自分の R01（Quest 1 の結果）を書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_R01"), note(S1, { lesson: "R01", step: 0, data: { did: "やった" } }))));
await t("自分の R01 を読める", () => assertSucceeds(getDoc(doc(s1, "notes", S1.uid + "_R01"))));
await t("他人の R01 は読めない", () => assertFails(getDoc(doc(s1, "notes", S2.uid + "_R01"))));
await t("自分の R02（Quest 2）を書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_R02"), note(S1, { lesson: "R02", step: 0, data: { mono: "『本』p.48", kokoro: "ひとこと" } }))));
await t("他人の R02 は読めない", () => assertFails(getDoc(doc(s1, "notes", S2.uid + "_R02"))));
await t("自分の L03（第3回）を書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_L03"), note(S1, { lesson: "L03", data: { p1Title: "論文", p1Url: "https://example.com" } }))));
await t("自分の R03（Quest 3）を書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_R03"), note(S1, { lesson: "R03", step: 0, data: { wakatta: "分かった", mada: "まだ" } }))));
await t("他人の R03 は読めない", () => assertFails(getDoc(doc(s1, "notes", S2.uid + "_R03"))));
await t("自分の L04（第4回）を書ける", () => assertSucceeds(setDoc(doc(s1, "notes", S1.uid + "_L04"), note(S1, { lesson: "L04", data: { toi: "なんで？", houhou: "観察" } }))));
await t("まだないステージ（R04）は書けない", () => assertFails(setDoc(doc(s1, "notes", S1.uid + "_R04"), note(S1, { lesson: "R04" }))));
await t("まだない回（L05）は書けない", () => assertFails(setDoc(doc(s1, "notes", S1.uid + "_L05"), note(S1, { lesson: "L05" }))));
await t("まだない回（L99）は書けない", () => assertFails(setDoc(doc(s1, "notes", S1.uid + "_L99"), note(S1, { lesson: "L99" }))));
await t("他人のノートは読めない", () => assertFails(getDoc(doc(s1, "notes", S2.uid + "_L01"))));
await t("他人のノートは書けない", () => assertFails(setDoc(doc(s1, "notes", S2.uid + "_L01"), note(S2, { number: 13 }))));
await t("ノート一覧はまとめて読めない", () => assertFails(getDocs(collection(s1, "notes"))));
await t("ノートは消せない", () => assertFails(deleteDoc(doc(s1, "notes", S1.uid + "_L01"))));
await t("入力の項目が多すぎる（31個）と書けない", () => {
  const big = {}; for (let i = 0; i < 31; i++) big["k" + i] = "x";
  return assertFails(setDoc(doc(s1, "notes", S1.uid + "_L01"), note(S1, { data: big })));
});

console.log("教員");
const tdb = as(T);
await t("全員のプロフィールを読める", () => assertSucceeds(getDocs(collection(tdb, "students"))));
await t("全員のノートを読める", () => assertSucceeds(getDocs(collection(tdb, "notes"))));
await t("クラスで絞って全部の回を読める（第2回の表）", () => assertSucceeds(getDocs(query(collection(tdb, "notes"), where("class", "==", 3), where("ki", "==", "59")))));
await t("自分を「テスト・0番」で作れる", () => assertSucceeds(setDoc(doc(tdb, "students", T.uid), prof(T, { ki: "", class: 0, number: 0 }))));
await t("自分を3組にはできない", () => assertFails(setDoc(doc(tdb, "students", T.uid), prof(T, { ki: "", class: 3, number: 1 }))));
await t("（戻す）テスト・0番", () => assertSucceeds(setDoc(doc(tdb, "students", T.uid), prof(T, { ki: "", class: 0, number: 0 }))));
await t("自分のテストノートを書ける", () => assertSucceeds(setDoc(doc(tdb, "notes", T.uid + "_L01"), note(T, { ki: "", class: 0, number: 0 }))));
await t("自分のテストノート（第2回）を書ける", () => assertSucceeds(setDoc(doc(tdb, "notes", T.uid + "_L02"), note(T, { lesson: "L02", ki: "", class: 0, number: 0 }))));
await t("生徒のノートは書き換えられない", () => assertFails(setDoc(doc(tdb, "notes", S2.uid + "_L01"), note(S2, { number: 13, step: 4 }))));

console.log("学校外・未確認");
await t("学校外のアカウントは読めない", () => assertFails(getDoc(doc(as(X), "notes", S2.uid + "_L01"))));
await t("学校外のアカウントはプロフィールを作れない", () => assertFails(setDoc(doc(as(X), "students", X.uid), prof(X, { ki: "" }))));
await t("メール未確認の生徒は書けない", () => assertFails(setDoc(doc(as(S1, false), "notes", S1.uid + "_L01"), note(S1))));
await t("ログインしていない人は読めない", () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "notes", S2.uid + "_L01"))));

await env.cleanup();
console.log(`\n結果：${pass} 件成功／${fail} 件失敗`);
process.exit(fail ? 1 : 0);
