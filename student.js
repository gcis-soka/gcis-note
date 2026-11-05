// 生徒画面の枠：ホーム・クラスと番号・保存・画面の切り替え
// ステージ（前のステージを提出すると次が出る）の中身は l01.js・r01.js・l02.js・r02.js・l03.js・r03.js・l04.js … に書く
import {
  escapeHtml, kiOf, classLabel, openGemini, chatUrlOf, chatUrlProblem, snapKeys, quest,
  CLASSES, MAX_NUMBER, TEST_CLASS
} from "./common.js";
import { L01 } from "./l01.js";
import { R01 } from "./r01.js";
import { L02 } from "./l02.js";
import { R02 } from "./r02.js";
import { L03 } from "./l03.js";
import { R03 } from "./r03.js";
import { L04 } from "./l04.js";

// ステージの順。足すときはここに並べる（teacher.js の VIEWS・firestore.rules の lesson も足す）
const LESSONS = [L01, R01, L02, R02, L03, R03, L04];
const stageLabel = L => L.no ? `第${L.no}回` : L.quest ? quest(L.quest) : "";
const MAP = ["気になる", "一歩", "文献", "問い", "計画", "着手", "RQ"];
const SHORT_MSG = "思いついたことを、もう少しだけ足してみよう（いつ？どんなとき？）";
const QMARK_MSG = "最後を「？」にしてみよう";
const blank = () => ({ step: 0, submitted: false, data: {} });

export function mountStudent({ be, user, app, asTeacher }) {
  const saveBadge = document.getElementById("save");
  const who = document.getElementById("who");
  const ac = new AbortController();
  let profile = null;
  const notes = {};   // { L01: { step, submitted, data }, L02: … }
  let cur = null;     // 開いている回（l01.js などの定義）
  let saveTimer = null, alive = true;
  let dirty = false, lastSaved = 0; // まだ保存していない入力があるか／最後に保存した時刻
  let lastFocus = "";               // 最後に入力した欄（書き出しボタンの入れ先）
  let promptOnScreen = false;       // いまの画面にAIの文の箱があるか（チャットのURLが要るかの判定）
  let promptCount = 0;              // いまの画面の何個目の箱か（URLの欄は1個目の箱にだけ出す）

  const note = () => notes[cur.id];
  const isOpen = L => !L.after || !!notes[L.after]?.submitted || asTeacher; // デモの生徒は本物と同じく順に出る

  // 各回の定義に渡す道具
  function ctx() {
    const n = note();
    return {
      d: n.data,
      v: k => String(n.data[k] ?? "").trim(),
      submitted: n.submitted,
      prev: id => notes[id]?.data || {},
      set: (k, val) => { n.data[k] = val; scheduleSave(); },
      rerender: () => renderStep(n.step),
      field, promptBox, chips, esc: escapeHtml, app,
      // 問いの数の順位（第4回）。学年＝期ごと。期なしは "x"、先生のテストは "t" で別に数える
      scoreRank: n => be.scoreRank({ ki: asTeacher ? "t" : (profile?.ki || "x"), lesson: cur.id, uid: user.uid, n })
    };
  }

  // ---------- 保存 ----------
  function setBadge(text, cls = "") { saveBadge.textContent = text; saveBadge.className = "save " + cls; }
  // 書き込み回数を抑える（Firestore の無料枠は1日2万回）：
  //   入力中は15秒に1回まで／入力欄を離れたとき・次へ進むとき・画面を隠すときはすぐ保存
  const SAVE_EVERY = 15000, SAVE_FIRST = 3000;
  function scheduleSave() {
    dirty = true;
    setBadge("入力中…");
    if (saveTimer) return; // すでに予約済み（予約は延ばさない＝打ち続けても15秒以内に保存される）
    const wait = Math.max(SAVE_FIRST, lastSaved + SAVE_EVERY - Date.now());
    saveTimer = setTimeout(() => saveNow(), wait);
  }
  function saveIfDirty() { if (dirty) saveNow(); }
  async function saveNow(markSubmitted = false) {
    clearTimeout(saveTimer); saveTimer = null;
    if (!profile || !cur) return;
    const id = cur.id, n = note(); // 保存中に回を切り替えても、この回に保存する
    dirty = false; lastSaved = Date.now();
    try {
      setBadge("保存中…");
      await be.saveNote(user.uid, id, profile, n, markSubmitted);
      n.saved = true;
      if (alive && !dirty) setBadge(be.demo ? "デモ（保存されません）" : "保存しました ✓", "ok");
    } catch (e) {
      console.error(e);
      dirty = true; // 次の機会にもう一度
      if (alive) setBadge("保存できません。先生に声をかけてね", "ng");
    }
  }

  // ---------- 部品 ----------
  // chips の text に「|」があれば、その位置にカーソルを置く
  function chips(list, target) {
    return `<span class="chips">${list.map(c =>
      `<button type="button" class="chip" data-insert="${escapeHtml(c.text)}" data-target="${target}">${escapeHtml(c.label)}</button>`).join("")}</span>`;
  }
  function field(key, label, { placeholder = "", rows = 2, type = "textarea", hint = "", short = false, qmark = false, chips: cs = null } = {}) {
    const val = escapeHtml(note().data[key] || "");
    const input = type === "textarea"
      ? `<textarea data-key="${key}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${val}</textarea>`
      : `<input data-key="${key}" type="${type}" value="${val}" placeholder="${escapeHtml(placeholder)}">`;
    return `<div class="field"><label><span class="label">${label}</span>${hint ? `<span class="hint">${hint}</span>` : ""}${cs ? chips(cs, key) : ""}${input}</label>` +
      (short ? `<p class="hint short" data-short="${key}" hidden>${SHORT_MSG}</p>` : "") +
      (qmark ? `<p class="hint short" data-qmark="${key}" hidden>${QMARK_MSG}</p>` : "") + `</div>`;
  }

  // チャットのURLをどこからコピーするかの図（Geminiの窓のいちばん上）。最初の箱のURL欄の上に出す（11/4 先生）
  const URL_HOWTO = `
    <figure class="urlhowto" aria-label="Geminiの窓のいちばん上のURLをコピーする">
      <svg viewBox="0 0 520 150" role="img" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="518" height="148" rx="10" fill="#fff" stroke="#c9ced8"/>
        <path d="M1 11a10 10 0 0 1 10-10h498a10 10 0 0 1 10 10v23H1z" fill="#e3e8f2"/>
        <text x="16" y="23" font-size="12" fill="#3c4250">◆ Google Gemini - Google Chrome</text>
        <text x="448" y="23" font-size="13" fill="#3c4250">—　☐　✕</text>
        <rect x="8" y="40" width="504" height="30" rx="15" fill="#eef1f6"/>
        <text x="22" y="60" font-size="13" fill="#5f6673">⊜</text>
        <text x="46" y="60" font-size="15" fill="#1f2329" textLength="302" lengthAdjust="spacingAndGlyphs">gemini.google.com/app/0259e4ca932dc5af</text>
        <rect x="38" y="42" width="318" height="26" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
        <text x="16" y="100" font-size="13" font-weight="700" fill="#3c4250">◆ Gemini</text>
        <rect x="200" y="86" width="300" height="26" rx="13" fill="#eef1f6"/>
        <text x="214" y="104" font-size="12" fill="#5f6673">私は高校1年生です。「…」という説が…</text>
        <path d="M430 132 L372 72" stroke="#d93025" stroke-width="3" fill="none"/>
        <path d="M366 64 L382 70 L372 80 Z" fill="#d93025"/>
        <text x="388" y="142" font-size="15" font-weight="700" fill="#d93025">ここをコピー</text>
      </svg>
      <figcaption>送信したあと、Geminiの窓の<b>いちばん上のURL</b>をクリック（全部が青くなる）→ <kbd>Ctrl</kbd>＋<kbd>C</kbd> → 下の欄で <kbd>Ctrl</kbd>＋<kbd>V</kbd></figcaption>
    </figure>`;

  // AIに送る文の箱。この回のチャットのURL（chatUrl）を最初に預かり、以後は「このチャットに戻る」で必ず同じチャットを開く
  function promptBox(text, { first = false } = {}) {
    promptOnScreen = true;
    const urlHere = ++promptCount === 1; // URLの欄は、この画面の1個目の箱にだけ（2か所あると迷うため）
    const need = cur.needChat ? `<b>URLを貼ると「次へ」が押せます。</b>` : "";
    const link = chatUrlOf(note().data.chatUrl), keys = snapKeys();
    return `
      <div class="prompt ${link ? "has-link" : ""}">
        <div class="prompt-head">AIに送る文（自動でできています）</div>
        <pre class="prompt-text">${escapeHtml(text)}</pre>
        <div class="prompt-actions">
          <button class="btn" data-copy>コピーする</button>
          <button class="btn ghost" data-gemini><span class="if-link">このチャットに戻る ↗</span><span class="if-nolink">${first ? "Geminiを右半分に開く ↗" : "Geminiの窓に戻る ↗"}</span></button>
        </div>
        <p class="note if-link">✓ ${stageLabel(cur)}のGeminiのチャットを登録しました。「このチャットに戻る」を押すと、いつでも<b>同じチャット</b>が開きます。<button class="link small" data-gemini-new>新しいチャットでやり直す</button></p>
        <div class="if-nolink">
          <p class="note" data-gemini-msg>${first
            ? `開いたGeminiに貼って送信。<b>送信したら</b>、Geminiの窓のいちばん上の<b>URL</b>をコピーして、下に貼ろう。この回はずっとこのチャットを使います。${need}`
            : urlHere
              ? `⚠️ さっきの<b>Geminiの窓の同じチャットに</b>貼ってください。下にチャットのURLを貼っておくと、いつでも戻れます。${need}`
              : `⚠️ さっきの<b>Geminiの窓の同じチャットに</b>貼ってください。チャットのURLは<b>上の欄</b>に貼ります。`}</p>
          ${urlHere ? `${URL_HOWTO}<label class="chatlink"><span>この回のチャットのURL</span>
            <input type="url" data-key="chatUrl" value="${escapeHtml(note().data.chatUrl || "")}" placeholder="https://gemini.google.com/app/…" autocomplete="off"></label>
          <p class="hint warn-text" data-chaturl-msg hidden></p>` : ""}
        </div>
        ${keys ? `<p class="hint snap" data-snap hidden>アプリの画面を左に寄せるには <kbd>${keys}</kbd>。Geminiと左右に並べて使おう。</p>` : ""}
      </div>`;
  }

  // チャットのURLを貼ったら、箱の表示を切り替える（全体を描き直すと入力中の欄が消えるため）
  function refreshChatUrl() {
    const raw = note().data.chatUrl, ok = !!chatUrlOf(raw), why = chatUrlProblem(raw);
    app.querySelectorAll(".prompt").forEach(p => p.classList.toggle("has-link", ok));
    app.querySelectorAll("[data-chaturl-msg]").forEach(m => { m.hidden = !why; m.textContent = why; });
  }
  // Geminiを開いたあと、アプリが画面いっぱいなら左に寄せるキーを出す
  function showSnap() {
    const wide = window.innerWidth > (screen.availWidth || 1366) * 0.75;
    app.querySelectorAll("[data-snap]").forEach(el => { el.hidden = !wide; });
  }
  window.addEventListener("resize", () => { if (window.innerWidth <= (screen.availWidth || 1366) * 0.75) app.querySelectorAll("[data-snap]").forEach(el => { el.hidden = true; }); }, { signal: ac.signal });

  function progress(i) {
    return `<ol class="progress">${cur.steps.map((s, j) =>
      `<li class="${j < i ? "done" : j === i ? "now" : ""}"><span>${j + 1}</span></li>`).join("")}</ol>`;
  }
  function nav(i, canNext, nextLabel = "次へ") {
    return `
      <div class="nav">
        ${i > 0 ? `<button class="btn ghost" data-go="${i - 1}">← もどる</button>` : `<button class="btn ghost" data-home>ホーム</button>`}
        <button class="btn primary" data-go="${i + 1}" ${canNext ? "" : "disabled"}>${nextLabel} →</button>
      </div>
      <p class="need-msg" data-need hidden></p>`;
  }

  // ---------- 画面 ----------
  function renderProfile() {
    const cls = profile?.class ?? "";
    const num = profile?.number ?? "";
    const classOpts = [...CLASSES, TEST_CLASS].map(c =>
      `<option value="${c}" ${c === cls ? "selected" : ""}>${classLabel(c)}</option>`).join("");
    const numOpts = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1).map(n =>
      `<option value="${n}" ${n === num ? "selected" : ""}>${n}番</option>`).join("");
    app.innerHTML = `
      <section class="card">
        <h2>はじめに：クラスと番号</h2>
        <p>最初の1回だけです。</p>
        <div class="row">
          <label class="field"><span class="label">クラス</span><select id="cls"><option value="">選ぶ</option>${classOpts}</select></label>
          <label class="field"><span class="label">出席番号</span><select id="num"><option value="">選ぶ</option>${numOpts}</select></label>
        </div>
        <p class="hint">「テスト」は先生の動作確認用です。</p>
        <div class="nav"><span></span><button class="btn primary" id="ok" disabled>決定 →</button></div>
      </section>`;
    const c = document.getElementById("cls"), n = document.getElementById("num"), ok = document.getElementById("ok");
    const check = () => ok.disabled = !(c.value !== "" && n.value !== "");
    c.onchange = n.onchange = check; check();
    ok.onclick = async () => {
      ok.disabled = true;
      const isNew = !profile;
      profile = { email: user.email, ki: kiOf(user.email), class: Number(c.value), number: Number(n.value) };
      try {
        await be.saveProfile(user.uid, profile, isNew);
        if (!isNew) { // ノート側のクラス・番号も合わせる（書いたことのある回だけ）
          for (const L of LESSONS) {
            if (!notes[L.id]?.saved) continue;
            cur = L; await saveNow();
          }
          cur = null;
        }
        showWho(); renderHome();
      } catch (e) {
        console.error(e); ok.disabled = false;
        alert("保存できませんでした。先生に声をかけてください。");
      }
    };
  }

  function showWho() {
    if (!profile) { who.innerHTML = ""; return; }
    who.innerHTML = asTeacher
      ? `<span class="tag">テスト（教員）</span>`
      : `${classLabel(profile.class)} ${profile.number}番 <button class="link" id="edit">変更</button>`;
    document.getElementById("edit")?.addEventListener("click", renderProfile);
  }

  function renderHome() {
    cur = null;
    // 地図：提出済みの回の次、または開いている回の位置を光らせる
    const at = Math.min(MAP.length - 1, Math.max(0, ...LESSONS.map(L =>
      notes[L.id]?.submitted ? L.mapAt + 1 : isOpen(L) ? L.mapAt : 0)));
    // いま取り組む回（開いていて未提出の最初の回。なければ最後に開いている回）
    const openOnes = LESSONS.filter(isOpen);
    const focus = openOnes.find(L => !notes[L.id]?.submitted) || openOnes[openOnes.length - 1];
    // カードの状態：done（提出済み）・now（いま取り組む）・todo（まだ。先生のテストで先が開いているとき）
    const CHECK = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const cards = openOnes.map(L => {
      const n = notes[L.id] || blank();
      const started = n.step > 0 || Object.keys(n.data).length > 0;
      const forced = L.after && !notes[L.after]?.submitted; // 先生・デモなので開いている
      const state = n.submitted ? "done" : L === focus ? "now" : "todo";
      return `
        <section class="card lesson ${state}">
          <span class="mark" aria-hidden="true">${state === "done" ? CHECK : state === "now" ? "<i></i>" : ""}</span>
          <div class="lesson-body">
            <p class="eyebrow">${stageLabel(L)}${n.submitted ? " ・提出済み" : ""}</p>
            <h3>${L.title}</h3>
            ${L.sub && !n.submitted ? `<p class="hint">${L.sub}</p>` : ""}
            ${forced ? `<p class="hint">（生徒には、前のステージを提出すると出ます。先生のテストなので出ています）</p>` : ""}
          </div>
          <button class="btn ${state === "now" ? "primary" : state === "done" ? "ghost" : "ghost"}" data-open="${L.id}">${n.submitted ? "見なおす" : started ? "つづきから" : "はじめる"} →</button>
        </section>`;
    });
    app.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">ゴール</p>
        <h2>1月に「もっと知りたい」と思える、自分の問いを持っている</h2>
        <ol class="map">${MAP.map((m, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}">${m}</li>`).join("")}</ol>
        <ul class="promise">
          <li>気になることは、何度変えてもいい</li>
          <li>空欄があってもいい</li>
          <li>早く終わったら、先に進んでいい</li>
        </ul>
      </section>
      ${cards.reverse().join("")}`; // 新しいステージを上に（まだ開いていないステージは出さない）
  }

  function openLesson(id) {
    const L = LESSONS.find(x => x.id === id);
    if (!L || !isOpen(L)) return;
    cur = L;
    notes[L.id] ||= blank();
    const n = note();
    renderStep(n.submitted ? L.steps.length - 1 : n.step);
  }

  function renderStep(i) {
    promptOnScreen = false;
    promptCount = 0;
    const n = note(), last = cur.steps.length - 1;
    // この生徒には要らない画面（例：入口Cのキーワード）はとばす。もどるときは手前へ
    const back = i < n.step;
    let at = Math.max(0, Math.min(last, i));
    while (at > 0 && at < last && cur.skip?.(at, ctx())) at += back ? -1 : 1;
    n.step = at;
    const s = cur.steps[n.step], c = ctx();
    const title = cur.stepTitle?.(n.step, c) || s.title;
    const nextLabel = n.step === last ? (n.submitted ? "ホームへ" : "提出する") : "次へ";
    const one = cur.steps.length === 1;
    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">${stageLabel(cur)}</p>
        ${one ? "" : progress(n.step)}
        <div class="step-head"><h2>${one ? "" : `${n.step + 1}. `}${title}</h2>${s.mins ? `<span class="mins">目安 ${s.mins}分</span>` : ""}</div>
        ${cur.render(n.step, c)}
        ${nav(n.step, canGo(n.step, c), nextLabel)}
      </section>`;
    window.scrollTo(0, 0);
    updateHints(); refreshNeed();
  }

  // 次へ（最後は提出）を押せるか。提出済みの最後の画面は「ホームへ」なので常に押せる
  function canGo(i, c) {
    const n = note();
    if (i === cur.steps.length - 1 && n.submitted) return true;
    // needChat の回（第1回・第2回）：AIの文がある画面は、チャットのURLを貼るまで次へ進めない
    if (cur.needChat && promptOnScreen && !chatUrlOf(n.data.chatUrl)) return false;
    return cur.canNext(i, c);
  }

  function updateHints() {
    if (!cur) return;
    const v = k => String(note().data[k] ?? "").trim();
    // 入力すると次の欄が出る（data-reveal-after＝前の欄の key。自分に何か入っていれば出したまま）
    app.querySelectorAll("[data-reveal-after]").forEach(el => {
      const own = [...el.querySelectorAll("[data-key]")].some(i => String(i.value || "").trim());
      el.hidden = !(v(el.dataset.revealAfter) || own);
    });
    app.querySelectorAll("[data-short]").forEach(p => {
      const len = v(p.dataset.short).length;
      p.hidden = !(len > 0 && len < 10);
    });
    app.querySelectorAll("[data-qmark]").forEach(p => {
      const x = v(p.dataset.qmark);
      p.hidden = !x || /[？?]$/.test(x);
    });
  }
  function refreshNext() {
    if (!cur) return;
    const n = note();
    const btn = app.querySelector(".nav .primary");
    if (btn) btn.disabled = !canGo(n.step, ctx());
    refreshNeed();
  }
  // 次へが押せないとき、何が書けたら進めるかを出す（11/5 先生：「〜が書けたら、次へ進もう」）
  // 各回の need(i, c) が足りないものの名前の配列を返す。need がない回は何も出さない
  function refreshNeed() {
    const p = app.querySelector("[data-need]");
    if (!p || !cur) return;
    const n = note(), c = ctx();
    let miss = [];
    if (!canGo(n.step, c)) {
      if (cur.needChat && promptOnScreen && !chatUrlOf(n.data.chatUrl)) miss = ["この回のチャットのURL"];
      else miss = cur.need?.(n.step, c) || [];
    }
    p.hidden = !miss.length;
    p.innerHTML = miss.length ? `${miss.map(m => escapeHtml(m)).join("と")}が書けたら、次へ進もう` : "";
  }

  async function copyPrompt(btn) {
    const text = btn.closest(".prompt").querySelector(".prompt-text").textContent;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
    }
    btn.textContent = "コピーしました ✓";
    setTimeout(() => (btn.textContent = "コピーする"), 2000);
  }

  function gemini(btn, force = false) {
    const url = force ? "" : chatUrlOf(note().data.chatUrl);
    const r = openGemini({ force, key: cur.geminiKey, url });
    const msg = btn.closest(".prompt").querySelector("[data-gemini-msg]");
    if (r === "lost" && msg) {
      msg.innerHTML = `Geminiの窓が見つかりません。<b>開いているときは、その窓に戻ってください</b>（タスクバー、または Alt＋Tab）。閉じてしまったときは <button class="link" data-gemini-force>新しく開く</button>（前の話は引き継がれません）`;
    } else if (r === "blocked" && msg) {
      msg.innerHTML = `ポップアップが止められました。アドレスバー右の表示から、このサイトのポップアップを許可してください。`;
    }
    if (r === "opened") showSnap();
  }

  // 書き出しボタン：入れ先が複数（"q1,q2,q3"）なら、最後に触った欄が空ならそこ、なければ空いている最初の欄
  function insertChip(btn) {
    const keys = btn.dataset.target.split(",");
    const els = keys.map(k => app.querySelector(`[data-key="${k}"]`)).filter(Boolean);
    if (!els.length) return;
    let el = els.find(e => e.dataset.key === lastFocus) || null;
    if (!el || el.value.trim()) el = els.find(e => !e.value.trim()) || el || els[0];
    const t = btn.dataset.insert;
    if (t.includes("＿＿")) { // 型（例：たぶん＿＿だと思う。）：空なら入れて、最初の＿＿を選ぶ（打てば置きかわる）
      if (!el.value.trim()) el.value = t;
      el.focus();
      const at = el.value.indexOf("＿＿");
      if (at >= 0) el.setSelectionRange(at, at + 2);
    } else {
      const caret = t.indexOf("|"), text = t.replace("|", "");
      const pos = el === document.activeElement ? (el.selectionStart ?? el.value.length) : el.value.length;
      const end = el === document.activeElement ? (el.selectionEnd ?? pos) : pos;
      el.value = el.value.slice(0, pos) + text + el.value.slice(end);
      const to = pos + (caret >= 0 ? caret : text.length);
      el.focus(); el.setSelectionRange(to, to);
    }
    lastFocus = el.dataset.key;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ---------- イベント（画面共通） ----------
  app.addEventListener("input", e => {
    const el = e.target.closest("[data-key]");
    if (!el || !cur) return;
    note().data[el.dataset.key] = el.value;
    if (el.dataset.key === "chatUrl") refreshChatUrl(); // 次へ の可否は下の refreshNext で
    scheduleSave(); refreshNext(); updateHints();
  }, { signal: ac.signal });

  app.addEventListener("focusin", e => { const el = e.target.closest("[data-key]"); if (el) lastFocus = el.dataset.key; }, { signal: ac.signal });
  app.addEventListener("focusout", e => { if (e.target.closest("[data-key]")) saveIfDirty(); }, { signal: ac.signal });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveIfDirty(); }, { signal: ac.signal });
  window.addEventListener("pagehide", saveIfDirty, { signal: ac.signal });

  app.addEventListener("click", async e => {
    const t = e.target;
    const op = t.closest("[data-open]");
    if (op) { openLesson(op.dataset.open); return; }
    if (!cur) return;
    if (t.closest("[data-copy]")) { copyPrompt(t.closest("[data-copy]")); return; }
    if (t.closest("[data-gemini-new]")) { // やり直す：覚えたURLを消して、新しいチャットを開く
      note().data.chatUrl = ""; app.querySelectorAll('[data-key="chatUrl"]').forEach(i => { i.value = ""; }); scheduleSave(); refreshChatUrl();
      gemini(t.closest(".prompt").querySelector("[data-gemini]"), true); return;
    }
    if (t.closest("[data-gemini-force]")) { gemini(t.closest(".prompt").querySelector("[data-gemini]"), true); return; }
    if (t.closest("[data-gemini]")) { gemini(t.closest("[data-gemini]")); return; }
    if (t.closest("[data-insert]")) { insertChip(t.closest("[data-insert]")); return; }
    if (cur.onClick?.(t, ctx())) return;
    if (t.closest("[data-home]")) { await saveNow(); renderHome(); return; }
    const go = t.closest("[data-go]");
    if (!go) return;
    const to = Number(go.dataset.go), n = note();
    if (to >= cur.steps.length) { // 提出
      if (!n.submitted) { n.submitted = true; await saveNow(true); renderStep(cur.steps.length - 1); }
      else { await saveNow(); renderHome(); }
      return;
    }
    renderStep(to);
    await saveNow();
  }, { signal: ac.signal });

  // ---------- 起動 ----------
  (async () => {
    app.innerHTML = `<section class="card"><p>読み込み中…</p></section>`;
    try {
      profile = await be.getProfile(user.uid);
      const saved = await Promise.all(LESSONS.map(L => be.getNote(user.uid, L.id)));
      LESSONS.forEach((L, i) => {
        const s = saved[i];
        if (s) notes[L.id] = { step: s.step || 0, submitted: !!s.submitted, data: s.data || {}, saved: true };
      });
      const ki = kiOf(user.email);
      if (asTeacher) { // 教員は番号の入力なしで「テスト」として保存
        const want = { email: user.email, ki, class: TEST_CLASS, number: 0 };
        if (!profile || profile.class !== TEST_CLASS || profile.number !== 0 || profile.ki !== ki) {
          await be.saveProfile(user.uid, want, !profile);
        }
        profile = want;
      } else if (profile && profile.ki !== ki) { // 第1版のプロフィールに期を足す
        profile = { ...profile, email: user.email, ki };
        await be.saveProfile(user.uid, profile, false);
      }
    } catch (e) { console.error(e); }
    if (!alive) return;
    if (!profile) { renderProfile(); return; }
    showWho(); renderHome();
  })();

  return () => {
    if (dirty) saveNow(); // 画面を切り替える直前の入力も保存する
    alive = false; ac.abort();
  };
}
