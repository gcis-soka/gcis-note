#!/usr/bin/env bash
# 「形だけ写す」ボタン（Actions の copy-shape）の初期設定（一度だけ・Google Cloud Shell で gcis@ が実行）
#   使い方：bash setup-copy.sh
# すること：
#   1) 写す専用のアカウント copy@gcis-note を作る（配信用の deploy@ とは別。deploy@ は今までどおり生徒データを読めない）
#   2) 本番（gcis-note）は「読むだけ」、開発版（gcis-note-dev）は「読み書き」の許可を付ける
#   3) GitHub の main ブランチからだけ使えるようにする（setup-ci.sh で作ったログイン窓口を使う）
# 何度実行しても同じ結果になる
set -euo pipefail

PROD="gcis-note"
DEV="gcis-note-dev"
POOL="github"
SA="copy@${PROD}.iam.gserviceaccount.com"
say() { printf '\n== %s\n' "$*"; }

say "プロジェクトの確認"
NUM=$(gcloud projects describe "$PROD" --format='value(projectNumber)')
gcloud projects describe "$DEV" --format='value(projectId)' >/dev/null
gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROD" >/dev/null \
  || { echo "ログイン窓口（setup-ci.sh で作るもの）が見つかりません"; exit 1; }
echo "本番 $PROD（番号 $NUM）／開発版 $DEV"

say "写す専用のアカウント $SA"
if ! gcloud iam service-accounts describe "$SA" --project="$PROD" >/dev/null 2>&1; then
  gcloud iam service-accounts create copy --project="$PROD" --display-name="本番→開発版 形だけ写す（main・手動だけ）"
  sleep 10
fi

bind() { # $1=プロジェクト $2=役割
  gcloud projects add-iam-policy-binding "$1" --member="serviceAccount:$SA" --role="$2" --condition=None --quiet >/dev/null
  echo "  $1：$2"
}
say "許可"
bind "$PROD" roles/datastore.viewer               # 本番：読むだけ
bind "$PROD" roles/serviceusage.serviceUsageConsumer
bind "$DEV"  roles/datastore.user                 # 開発版：読み書き
bind "$DEV"  roles/serviceusage.serviceUsageConsumer

gcloud iam service-accounts add-iam-policy-binding "$SA" --project="$PROD" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${NUM}/locations/global/workloadIdentityPools/${POOL}/attribute.ref/refs/heads/main" --quiet >/dev/null
echo "  GitHub の main ブランチからだけ使える"

say "完了。GitHub → Actions → copy-shape → Run workflow（Branch：main）で写せます"
