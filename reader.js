// 論文を読みながらメモ（第3回「読みはじめる」・Quest 3）11/7 試作
// 論文のページをアプリの中に出し、横（狭い画面では下）にメモ欄を置く。
// 多くの論文サイトは、ほかのサイトの中での表示を許していない（白い画面・「接続が拒否されました」）。
// アプリ側ではかわせない（かわすには論文を学校のサーバーから配り直すことになるので、しない）。
// → そのときのために「この論文を右半分に開く」を必ず出す（Gemini と同じ開き方）。PDF の保存はさせない
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

let pick = 0; // いま開いている論文（0＝①、1＝②）。保存しない
let floatKeys = []; // 小さな窓に出す欄（[{ key, label, rows }]）
let floatPapers = []; // 小さな窓から開く論文（[{ no, url }]）
let pipWin = null; // 開いている小さな窓

// メモを小さな窓にして、論文の上に浮かせる（11/8 先生：論文サイトの多くがアプリの中での表示を拒むため）。
// Chrome の Document Picture-in-Picture（Chrome 116〜・Chromebook も可）。使えないブラウザではボタンを出さない
const canFloat = () => typeof window !== "undefined" && "documentPictureInPicture" in window;

// ps：[{ no: "①", url }]、memo：右（下）に置く欄の HTML、float：小さな窓に出す欄（[{ key, label, rows }]・なくてもよい）
export function readerHtml(c, ps, memo, float = []) {
  const esc = c.esc;
  const list = ps.filter(p => safeUrl(p.url));
  floatKeys = float; floatPapers = list;
  if (!list.length) return `<div class="reader-memo solo">${memo}</div>`;
  if (pick >= list.length) pick = 0;
  const p = list.at(pick), url = safeUrl(p.url);
  const fl = canFloat() && float.length;
  return `
    <div class="reader">
      ${fl ? `
      <div class="reader-float">
        <button type="button" class="btn" data-reader-float>${pipWin ? "メモの小さな窓を前に出す" : "メモを浮かせて、論文を読む ↗"}</button>
        <p class="hint"><b>メモだけの小さな窓</b>が出ます → その窓の「論文を開く」を押すと、論文が画面いっぱいに開き、メモはその上に浮かんだままになります。書いた分は、このアプリに自動で入ります。小さな窓は角をつかんで大きさを変えられます。</p>
        ${pipWin ? `<p class="note">いま小さな窓で書いています。書き終わったら、小さな窓の「閉じる」を押そう。</p>` : ""}
      </div>` : ""}
      <div class="reader-bar">
        ${list.length > 1 ? `<span class="reader-tabs">${list.map((x, j) => `<button type="button" class="choice-btn ${j === pick ? "on" : ""}" data-reader-pick="${j}">論文${x.no}</button>`).join("")}</span>` : `<b>論文${p.no}</b>`}
        <span class="hint">${esc(hostOf(url))}</span>
        <button type="button" class="btn small ${fl ? "ghost" : ""}" data-reader-split="${esc(url)}">この論文を右半分に開く ↗</button>
      </div>
      <p class="hint">白い画面や「接続が拒否されました」と出たら、その論文のサイトはアプリの中での表示を許していません。${fl ? "上の<b>「メモを浮かせて、論文を読む」</b>か、" : ""}<b>「この論文を右半分に開く」</b>で読もう。</p>
      <div class="reader-grid">
        <iframe class="reader-frame" src="${esc(url)}" title="論文${p.no}" referrerpolicy="no-referrer-when-downgrade"></iframe>
        <div class="reader-memo">${memo}</div>
      </div>
    </div>`;
}

function openPaper(url, { full = false, from = window } = {}) {
  const W = screen.availWidth || 1366, H = screen.availHeight || 768;
  const feat = full ? `popup=yes,left=0,top=0,width=${W},height=${H}` : `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`;
  const w = from.open(url, "gcis_paper", feat);
  try { w?.focus(); } catch { /* なし */ }
  return w;
}

// 小さな窓の中身。欄に書くと、アプリの同じ欄に入れて input を起こす（保存・次へ・ヒントはふだんの流れで動く）
async function openFloat(c) {
  if (pipWin) { try { pipWin.focus(); } catch { /* なし */ } return; }
  let w;
  try { w = await window.documentPictureInPicture.requestWindow({ width: 400, height: 600 }); }
  catch (e) { console.error(e); alert("小さな窓を開けませんでした。「この論文を右半分に開く」で読もう"); return; }
  pipWin = w;
  const doc = w.document;
  [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(n => doc.head.appendChild(n.cloneNode(true)));
  doc.title = "メモ（探究ノート）";
  doc.body.classList.add("pip");
  const esc = c.esc;
  doc.body.innerHTML = `
    <div class="pip-wrap">
      <div class="pip-head"><b>読みながらメモ</b><button type="button" class="btn small ghost" data-pip-close>閉じる</button></div>
      <div class="pip-papers">${floatPapers.map((x, j) => `<button type="button" class="btn small ${j === pick ? "" : "ghost"}" data-pip-open="${j}">論文${x.no}を開く ↗</button>`).join("")}</div>
      <p class="hint">まず上のボタンで論文を開こう。</p>
      ${floatKeys.map(f => `<label class="field"><span class="label">${esc(f.label)}</span><textarea data-pip-key="${f.key}" rows="${f.rows || 6}">${esc(c.d[f.key] || "")}</textarea></label>`).join("")}
      <p class="hint">書いた分は、アプリに自動で入ります（このあと保存されます）。</p>
    </div>`;
  doc.addEventListener("input", e => {
    const t = e.target.closest?.("[data-pip-key]");
    if (!t) return;
    const el = document.querySelector(`[data-key="${t.dataset.pipKey}"]`);
    if (el) { el.value = t.value; el.dispatchEvent(new Event("input", { bubbles: true })); }
    else c.set(t.dataset.pipKey, t.value);
  });
  doc.addEventListener("click", e => {
    const o = e.target.closest?.("[data-pip-open]");
    if (o) { const p = floatPapers[Number(o.dataset.pipOpen) || 0]; if (p) openPaper(safeUrl(p.url), { full: true, from: w }); return; }
    if (e.target.closest?.("[data-pip-close]")) w.close();
  });
  w.addEventListener("pagehide", () => {
    pipWin = null;
    document.querySelector("[data-key]")?.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); // 閉じたら保存（focusout で保存する仕組みを使う）
    c.rerender();
  });
  c.rerender();
  // 論文は小さな窓のボタンで開く。1回のクリックで開けるのは「小さな窓」か「論文の窓」のどちらか1つ（Chrome の決まり）
}

export function handleReader(t, c) {
  const b = t.closest("[data-reader-pick]");
  if (b) { pick = Number(b.dataset.readerPick) || 0; c.rerender(); return true; }
  if (t.closest("[data-reader-float]")) { openFloat(c); return true; }
  const s = t.closest("[data-reader-split]");
  if (s) { openPaper(s.dataset.readerSplit); return true; }
  return false;
}
