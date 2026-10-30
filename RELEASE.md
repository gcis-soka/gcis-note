# 配信のしかた（本番と開発版）

| | ブランチ | Firebase（gcis@ が持ち主） | URL | 使う人 |
|---|---|---|---|---|
| 本番 | `main` | gcis-note | https://gcis-note.web.app/ | 生徒・先生 |
| 開発版 | `develop` | gcis-note-dev | https://gcis-note-dev.web.app/ | 先生・Claude（画面上部に縞の帯） |

- ブランチに入ると GitHub Actions が自動で配信する（画面と `firestore.rules`）。2〜3分
- 本番と開発版はデータもルールも別。開発版で何をしても本番の生徒データには触れない
- `firebase-config.js` はリポジトリでは見本。配信のときに Secrets の値で書き換わる
- 配信の前に**ルールの自動テスト**（`tools/rules.test.mjs`）が走り、1つでも失敗したら配信しない。main への PR でもテストだけ走る
- ルールを変えるときは、テストにも「通るべきもの／通ってはいけないもの」を足す（Claude が行う）
- `main` は保護してあり、PR のマージでしか変わらない（Claude は develop にだけ入れる）

## ふだんの更新
1. Claude が `develop` に直接入れる → 開発版に自動で出る（zip のやりとりはなし）
2. 開発版を「テスト」で確認
3. GitHub → Pull requests → New pull request → **base: main ← compare: develop** → Create pull request → Merge pull request → Confirm merge（**Delete branch は押さない**）
4. Actions が緑になったら、本番を「テスト」で確認
- **月曜（授業日）は本番に出ない**ように止めてある。急ぎのときだけ Actions → deploy → Run workflow（Branch：main、「月曜でも本番に出す」に印）

## 戻すとき
- 画面：Firebase コンソール（gcis-note）→ Hosting → リリース履歴 → 1つ前の行の「⋮」→ ロールバック
- ルール：Firestore Database → ルール → 左の履歴から前の版を選んで公開
- そのあと、原因の PR を「Revert」しておく

---

## 初回だけの設定
### A. リポジトリ（済）
- https://github.com/gcis-soka/gcis-note（Public）。初回のファイル一式と develop ブランチは Claude が入れた
- 以後の更新も Claude が develop に直接入れる（Claude の GitHub アプリを gcis-soka に許可済み）。main は先生が PR でマージしたときだけ変わる

### B. Firebase を2つ作る（gcis@ でログイン・各15分）
https://console.firebase.google.com/ の右上のアイコンで **gcis@ に切り替えてから**、`gcis-note` と `gcis-note-dev` について同じことを2回する。
1. プロジェクトを作成 → 名前を入力 → **名前の下のIDがそのままか確認**（末尾に記号が付いたら、作らずに Claude に伝える）→ 親リソースを聞かれたら tokyo.soka.ed.jp → Gemini・アナリティクスはオフ → 作成
2. アプリを追加 → `</>` → ニックネーム（プロジェクト名と同じ）→ Hosting には**チェックしない** → 登録 → `const firebaseConfig = { … };` を**見出し付きでメモ**（本番／開発）→ コンソールに進む
3. 構築 → Authentication → 始める → ログイン方法 → Google → 有効 → サポートメール → 保存
4. 構築 → Firestore Database → データベースを作成 → Standard → **asia-northeast1（東京）**（後から変えられない）→ 本番環境モード → 作成
5. 構築 → Hosting → 始める →「次へ」を最後まで → コンソールに進む

### C. Cloud Shell で配信用アカウントを作る（gcis@・5分）（済 10/29）
1. https://console.cloud.google.com/ （gcis@）→ 上のプロジェクト名 → **gcis-note** を選ぶ
2. 右上の **`>_`** → 下の黒い画面に次の2行を貼って Enter
```
curl -sLO https://raw.githubusercontent.com/gcis-soka/gcis-note/main/tools/setup-ci.sh
bash setup-ci.sh gcis-soka/gcis-note
```
3. 「承認」が出たら承認。最後に出る `GCP_WIF_PROVIDER` の値をメモ（秘密ではない）
- 赤い ERROR で止まったら、その数行を Claude に貼る

### D. GitHub に値を入れる（5分）
リポジトリ → Settings → Secrets and variables → Actions
| タブ | ボタン | Name | 値 |
|---|---|---|---|
| Variables | New repository variable | `GCP_WIF_PROVIDER` | C の値 |
| Secrets | New repository secret | `FIREBASE_CONFIG_PROD` | 本番（gcis-note）の firebaseConfig |
| Secrets | New repository secret | `FIREBASE_CONFIG_DEV` | 開発版（gcis-note-dev）の firebaseConfig |
- 取り違えても配信が止まるだけ（安全装置）

### F. main を保護する（gcis-soka・2分）（済 10/30）
Settings → Rules → Rulesets → New ruleset → New branch ruleset →
Ruleset name `main`・Enforcement status **Active** → Target branches：Add target → Include default branch →
「Restrict deletions」「Require a pull request before merging」（Required approvals は 0）「Block force pushes」に印 → Create

### G. 予備のオーナー（各1分）
- Firebase（gcis-note・gcis-note-dev それぞれ）：歯車 → ユーザーと権限 → メンバーを追加 → miura@ → 役割「オーナー」
- GitHub：Settings → Collaborators → Add people → frost-topaz（個人アカウントのリポジトリなので役割は選べない。PRのマージ・更新はできるが、設定の変更はできない）

### E. 開発版 → 本番
1. Actions → deploy → Run workflow → Branch：**develop** → 緑になるのを待つ
2. https://gcis-note-dev.web.app/ ：縞の帯が出る／テストで入力して再読み込みしても残る
3. 「ふだんの更新」の3で main へ → https://gcis-note.web.app/ ：帯なし／テストで入力・保存
4. 旧リポジトリ（frost-topaz/gcis_quest）→ Settings → Pages → Branch を **None** → Save → Settings → General → 一番下「Archive this repository」
5. 問題なければ、古い Firebase（miura@ の gcis-quest）を削除：プロジェクトの設定 → 全般 → 一番下「プロジェクトを削除」（30日間は戻せる）

### うまくいかないとき
- C が組織のルールで拒否された → Claude に伝える（鍵ファイル方式に切り替え。Secrets `GCP_SA_KEY_PROD`／`GCP_SA_KEY_DEV`）
- 配信が `PERMISSION_DENIED` → エラーの1行を Claude に見せる
