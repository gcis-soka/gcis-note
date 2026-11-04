// 本番 → 開発版へ生徒のデータを写す（GitHub Actions の copy-shape から手動で実行）
//   本番（gcis-note）は読むだけ。中身はそのまま写す（11/4 先生の判断）
//   ・uid は Firebase のプロジェクトごとに別なので、生徒が開発版にログインしても写したノートは出ない
//   ・写すのは学年の生徒だけ。教員のテスト（クラス0・counts/t）は写さない。開発版の先生のテストはそのまま
//   ・同じ ID に上書きするので、何度押しても重ならない。以前の架空データ（dummy_）は消す
//   ・ログには件数しか出さない（中身・ID・アドレスは出さない）
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { appendFileSync } from "node:fs";

const PROD = process.env.PROJECT_PROD || "gcis-note";
const DEV = process.env.PROJECT_DEV || "gcis-note-dev";
if (PROD === DEV) throw new Error("本番と開発版が同じです");
const OLD_PREFIX = "dummy_"; // 以前の「形だけ写す」で入れた架空データ

async function prefixDocs(col, prefix) {
  const snap = await col.where(FieldPath.documentId(), ">=", prefix).where(FieldPath.documentId(), "<", prefix + "").get();
  return snap.docs.map(d => d.ref);
}

async function main() {
  const prod = getFirestore(initializeApp({ projectId: PROD }, "prod"));
  const dev = getFirestore(initializeApp({ projectId: DEV }, "dev"));

  // 1. 本番を読む（学年の生徒だけ）
  const st = (await prod.collection("students").get()).docs.filter(d => d.data().class !== 0);
  const ids = new Set(st.map(d => d.id));
  const nt = (await prod.collection("notes").get()).docs.filter(d => ids.has(d.data().uid));
  const ct = [];
  for (const kiDoc of await prod.collection("counts").listDocuments()) {
    if (kiDoc.id === "t") continue; // 教員のテスト
    for (const sub of await kiDoc.listCollections())
      (await sub.get()).docs.filter(d => ids.has(d.id)).forEach(d => ct.push({ ki: kiDoc.id, lesson: sub.id, d }));
  }

  // 2. 以前の架空データを消す
  const old = [...await prefixDocs(dev.collection("students"), OLD_PREFIX), ...await prefixDocs(dev.collection("notes"), OLD_PREFIX)];
  for (const kiDoc of await dev.collection("counts").listDocuments())
    for (const sub of await kiDoc.listCollections()) old.push(...await prefixDocs(sub, OLD_PREFIX));

  // 3. 同じ ID でそのまま写す
  const w = dev.bulkWriter();
  old.forEach(r => w.delete(r));
  st.forEach(d => w.set(dev.collection("students").doc(d.id), d.data()));
  nt.forEach(d => w.set(dev.collection("notes").doc(d.id), d.data()));
  ct.forEach(({ ki, lesson, d }) => w.set(dev.collection("counts").doc(ki).collection(lesson).doc(d.id), d.data()));
  await w.close();

  const byLesson = {};
  nt.forEach(d => { const l = d.data().lesson; byLesson[l] = (byLesson[l] || 0) + 1; });
  const line = `本番から読んだ件数：生徒 ${st.length}／ノート ${nt.length}（${Object.entries(byLesson).sort().map(([k, v]) => `${k} ${v}`).join("・")}）／順位用 ${ct.length}\n` +
    `開発版：${st.length + nt.length + ct.length} 件を写しました${old.length ? `（以前の架空データ ${old.length} 件は消しました）` : ""}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 開発版に本番のデータを写しました\n${line.replace("\n", "  \n")}\n`);
}
main().catch(e => { console.error("失敗しました：" + (e.code || "") + " " + String(e.message || e).slice(0, 300)); process.exit(1); });
