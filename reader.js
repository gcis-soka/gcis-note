import { doiOf } from "./common.js";

// 論文を読みながらメモ（Quest 3 の画面1）11/7 試作 → 11/9 作り直し
// 多くの論文サイトは、ほかのサイトの中での表示を許していない（白い画面・「接続が拒否されました」）。
// アプリ側ではかわせない（かわすには論文を学校のサーバーから配り直すことになるので、しない）。PDF の保存はさせない。
// → アプリの中に論文は出さない（11/9 先生）。代わりに：
//   ① メモだけの小さな窓を論文の上に浮かせる（Chrome の Document Picture-in-Picture。Chrome 116〜・Chromebook も可）
//   ② 使えないブラウザでは「右半分に開く」（Gemini と同じ開き方）
// 1回のクリックで開ける窓は1つ（Chrome の決まり）。だから論文は、小さな窓の「この論文を開く」で開く。
// 小さな窓に書くと、アプリの同じ欄に入れて input を起こす（保存・次へ・ヒントはふだんの流れで動く）。

export const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// 論文を開くときのURL（11/9）。J-STAGE の論文なら、本文の PDF（…/_pdf）を直接開く。
//  - URL が J-STAGE の論文のページ（…/_article/…）→ …/_pdf
//  - URL が doi.org のリンク、または J-STAGE 以外で DOI がある → DOI の行き先（doi.org の API で調べておく）が J-STAGE なら …/_pdf
//  - それ以外は URL のまま（URL がなく DOI だけなら doi.org）。PDF かどうかはサイトしだい
const JSTAGE = /^(https?:\/\/(?:www\.)?jstage\.jst\.go\.jp\/article\/.+?)\/_article(?:[/?#].*)?$/i;
const toPdf = u => { const m = JSTAGE.exec(u || ""); return m ? `${m[1]}/_pdf` : ""; };
const doiOfPaper = p => (/doi\.org\//i.test(p?.url || "") ? doiOf(p.url) : "") || doiOf(p?.doi);
const landing = new Map(); // DOI → 行き先のURL（調べ中は null、分からなければ ""）。保存しない
export function paperOpenUrl(p) {
  const u = safeUrl(p?.url), doi = doiOfPaper(p);
  return toPdf(u) || toPdf(landing.get(doi)) || u || (doi ? `https://doi.org/${doi}` : "");
}
// DOI の行き先を doi.org の API（だれでも使える・鍵なし）で調べる。終わったら then() を呼ぶ
function resolveDois(ps, then) {
  ps.forEach(p => {
    const doi = doiOfPaper(p);
    if (!doi || toPdf(safeUrl(p.url)) || landing.has(doi)) return;
    landing.set(doi, null);
    fetch(`https://doi.org/api/handles/${doi}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { landing.set(doi, j?.values?.find(v => v.type === "URL")?.data?.value || ""); then(); })
      .catch(() => landing.set(doi, ""));
  });
}
export const canFloat = () => typeof window !== "undefined" && "documentPictureInPicture" in window;

// 画面1の状態（保存しない）
let pick = 0;      // いま開いている論文（0＝①、1＝②）
let cfg = null;    // { papers: [{ no, url, raw }], fields: j => [{ key, label, rows, chips, placeholder }], yomi: j => key, YOMI }
let pip = null;    // 開いている小さな窓
let pipCtx = null; // 小さな窓を開いたときの ctx（d・set は同じノートを指す）
const opened = new Set(); // 小さな窓から開いた論文（0・1）。開くまでは大きな「論文を開く」だけを出す（11/9 先生 A案）。保存しない

export const getPick = () => pick;
export function setupReader(c, conf) {
  cfg = conf;
  if (pick >= conf.papers.length) pick = 0;
  resolveDois(conf.papers, () => { if (pip) renderPip(); });
  if (pip) renderPip(); // アプリ側で論文を切り替えたら、小さな窓も合わせる
  return pick;
}
export const isFloating = () => !!pip;

// 論文の窓を開く。full＝画面いっぱい（小さな窓を上に浮かせるとき）、それ以外は右半分
export function openPaper(url, { full = false, from = window } = {}) {
  if (!url) return null;
  const W = screen.availWidth || 1366, H = screen.availHeight || 768;
  const feat = full ? `popup=yes,left=0,top=0,width=${W},height=${H}` : `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`;
  const w = from.open(url, "gcis_paper", feat) || (full ? null : window.open(url, "_blank"));
  try { w?.focus(); } catch { /* なし */ }
  return w;
}

// ---------- 小さな窓 ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const onScreen = () => !!document.querySelector("[data-reader-root]"); // アプリが画面1を出しているか

function renderPip() {
  if (!pip || !cfg) return;
  const doc = pip.document, d = pipCtx.d, ps = cfg.papers, p = ps[pick] || ps[0];
  if (!p) { doc.body.innerHTML = `<div class="pip-wrap"><p>論文がありません。アプリで論文を決めよう。</p></div>`; return; }
  const yk = cfg.yomi(pick), url = paperOpenUrl(p), first = url && !opened.has(pick);
  const tabs = ps.length > 1 ? `<span class="pip-tabs">${ps.map((x, j) => `<button type="button" class="pip-tab ${j === pick ? "on" : ""}" data-pip-pick="${j}">論文${x.no}</button>`).join("")}</span>` : `<b>論文${p.no}</b>`;
  const head = `
      <div class="pip-head">
        ${tabs}
        ${url && !first ? `<button type="button" class="pip-x" data-pip-open>論文${p.no}をもう一度開く ↗</button>` : ""}
        <button type="button" class="pip-x pip-close" data-pip-close title="閉じる">閉じる</button>
      </div>`;
  // 開く前：押すものを1つにする（大きなボタン＋一言＋逃げ道）
  if (first) {
    doc.body.innerHTML = `
    <div class="pip-wrap">
      ${head}
      <div class="pip-start">
        <button type="button" class="btn primary" data-pip-open>📄 論文${p.no}を開く ↗</button>
        <p class="hint">押すと論文が開き、この窓はその上に浮かびます</p>
        <button type="button" class="linkish" data-pip-skip>もう開いている人は → メモを書く</button>
      </div>
    </div>`;
    syncOff();
    return;
  }
  doc.body.innerHTML = `
    <div class="pip-wrap">
      ${head}
      <p class="pip-off note" data-pip-off hidden>アプリで「論文を読もう」の画面を開くと、また書けます。</p>
      <div class="pip-cols">
      ${cfg.fields(pick).map(f => `
        <div class="pip-field">
          <span class="label">${esc(f.label)}</span>
          ${f.chips ? `<span class="chips">${f.chips.map(ch => `<button type="button" class="chip" data-pip-chip="${esc(ch.text)}" data-pip-target="${f.key}">${esc(ch.label)}</button>`).join("")}</span>` : ""}
          <textarea data-pip-key="${f.key}" rows="${f.rows || 6}" placeholder="${esc(f.placeholder || "")}">${esc(d[f.key] || "")}</textarea>
        </div>`).join("")}
      </div>
      <div class="pip-foot"><span class="label">どこまで読んだ？</span>
        <span class="choice small">${cfg.YOMI.map(y => `<button type="button" class="choice-btn ${d[yk] === y ? "on" : ""}" data-pip-yomi="${y}">${y}</button>`).join("")}</span>
        <span class="hint">書いた分は、アプリに自動で入ります</span>
      </div>
    </div>`;
  syncOff();
}
// アプリが画面1を出していないときは書けないようにする（別の回のノートに入るのを防ぐ）
function syncOff() {
  if (!pip) return;
  const off = !onScreen(), doc = pip.document;
  doc.querySelectorAll("textarea, [data-pip-chip], [data-pip-yomi]").forEach(el => { el.disabled = off; });
  const m = doc.querySelector("[data-pip-off]"); if (m) m.hidden = !off;
}
// 小さな窓の欄 → アプリの欄
function push(key, val) {
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) { el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); }
}
// 描き直してもスクロールの位置は保つ（renderStep は上に戻すため）
const keepScroll = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };
const rerenderApp = () => { if (onScreen()) keepScroll(() => pipCtx.rerender()); };

async function openFloat(c) {
  if (pip) { try { pip.focus(); } catch { /* なし */ } return; }
  let w;
  try { w = await window.documentPictureInPicture.requestWindow({ width: 860, height: 380 }); }
  catch (e) { console.error(e); alert("小さな窓を開けませんでした。「右半分に開く」で読もう"); return; }
  pip = w; pipCtx = c; opened.clear();
  const doc = w.document;
  document.querySelectorAll('link[rel="stylesheet"]').forEach(n => { const l = doc.createElement("link"); l.rel = "stylesheet"; l.href = n.href; doc.head.appendChild(l); });
  document.querySelectorAll("style").forEach(n => doc.head.appendChild(n.cloneNode(true)));
  doc.title = "メモ（探究ノート）";
  doc.body.classList.add("pip");
  doc.addEventListener("input", e => {
    const t = e.target.closest?.("[data-pip-key]");
    if (t && onScreen()) push(t.dataset.pipKey, t.value);
  });
  doc.addEventListener("click", e => {
    const t = e.target;
    if (t.closest?.("[data-pip-close]")) { w.close(); return; }
    if (t.closest?.("[data-pip-open]")) {
      openPaper(paperOpenUrl(cfg.papers[pick]), { full: true, from: w });
      if (!opened.has(pick)) { opened.add(pick); renderPip(); }
      return;
    }
    if (t.closest?.("[data-pip-skip]")) { opened.add(pick); renderPip(); return; }
    const pk = t.closest?.("[data-pip-pick]");
    if (pk) { pick = Number(pk.dataset.pipPick) || 0; renderPip(); rerenderApp(); return; }
    if (!onScreen()) return;
    const y = t.closest?.("[data-pip-yomi]");
    if (y) { pipCtx.set(cfg.yomi(pick), y.dataset.pipYomi); renderPip(); rerenderApp(); return; }
    const ch = t.closest?.("[data-pip-chip]");
    if (ch) { // 書き出し：カーソルの位置に入れ、「|」の所にカーソルを置く（アプリの書き出しと同じ）
      const ta = doc.querySelector(`[data-pip-key="${ch.dataset.pipTarget}"]`);
      const txt = ch.dataset.pipChip, at = txt.indexOf("|"), ins = txt.replace("|", "");
      const pos = doc.activeElement === ta ? ta.selectionStart : ta.value.length;
      const end = doc.activeElement === ta ? ta.selectionEnd : pos;
      ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(end);
      const to = pos + (at >= 0 ? at : ins.length);
      ta.focus(); ta.setSelectionRange(to, to);
      push(ta.dataset.pipKey, ta.value);
    }
  });
  // アプリ側の画面が変わったら、書けるかどうかを合わせる。画面1に戻ったら、アプリの値を小さな窓へ
  let was = onScreen();
  const timer = setInterval(() => {
    const now = onScreen();
    if (now !== was) { was = now; if (now) renderPip(); else syncOff(); }
  }, 800);
  w.addEventListener("pagehide", () => {
    clearInterval(timer);
    pip = null;
    document.querySelector("[data-key]")?.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); // 閉じたら保存（focusout で保存する仕組みを使う）
    rerenderApp();
  });
  renderPip();
  rerenderApp();
}

export function handleReader(t, c) {
  const b = t.closest("[data-reader-pick]");
  if (b) { pick = Number(b.dataset.readerPick) || 0; keepScroll(() => c.rerender()); return true; }
  if (t.closest("[data-reader-float]")) { openFloat(c); return true; }
  const s = t.closest("[data-reader-split]"); // 開くURLは押したときに決める（DOI の行き先があとから分かることがある）
  if (s) { openPaper(paperOpenUrl(cfg?.papers[Number(s.dataset.readerSplit) || 0])); return true; }
  return false;
}
