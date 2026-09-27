#!/usr/bin/env bash
# Cópia de segurança da base de dados Snackify (mongodump dentro do contentor do MongoDB).
#
# Uso:   scripts/backup.sh
# Gera:  $BACKUP_DIR/snackify-AAAAMMDD-HHMMSS.archive.gz[.age|.gpg] e o respetivo .sha256
#
# Variáveis (lidas também do .env na raiz do projeto, se existir):
#   MONGO_CONTAINER        contentor do MongoDB (omissão: o serviço "mongo" do docker compose)
#   MONGO_ROOT_USERNAME    utilizador (omissão: snackify); MONGO_ROOT_PASSWORD vazio = sem autenticação
#   MONGO_DB               base de dados (omissão: snackify)
#   BACKUP_DIR             pasta das cópias (omissão: ./backups)
#   BACKUP_KEEP            número de cópias a manter (omissão: 7)
#   BACKUP_AGE_RECIPIENT   chave pública age (age1...) para cifrar a cópia (recomendado fora da máquina)
#   BACKUP_GPG_RECIPIENT   alternativa: destinatário GPG (email ou id da chave)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  # Só as variáveis ainda não definidas no ambiente.
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    [[ -z "${!key:-}" ]] && export "$key=${value%\"}" 2>/dev/null || true
  done < <(grep -E '^[A-Z_]+=' "$ROOT/.env")
fi

MONGO_DB="${MONGO_DB:-snackify}"
MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-snackify}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"

if [[ -z "${MONGO_CONTAINER:-}" ]]; then
  MONGO_CONTAINER="$(cd "$ROOT" && docker compose ps -q mongo 2>/dev/null || true)"
fi
if [[ -z "$MONGO_CONTAINER" ]]; then
  echo "Contentor do MongoDB não encontrado (defina MONGO_CONTAINER ou arranque com docker compose up -d)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BASE="$BACKUP_DIR/snackify-$STAMP.archive.gz"
TMP="$(mktemp "$BACKUP_DIR/.parcial-XXXXXX")"
trap 'rm -f "$TMP"' EXIT

# A password vai por stdin para um ficheiro de configuração temporário dentro do contentor:
# não aparece na linha de comandos (ps) nem no histórico.
AUTH_ARGS=""
if [[ -n "$MONGO_ROOT_PASSWORD" ]]; then
  AUTH_ARGS="--config /tmp/.snackify-dump.yml --username $MONGO_ROOT_USERNAME --authenticationDatabase admin"
fi
printf 'password: "%s"\n' "$MONGO_ROOT_PASSWORD" | docker exec -i "$MONGO_CONTAINER" sh -c "
  umask 077; cat > /tmp/.snackify-dump.yml
  mongodump --quiet $AUTH_ARGS --db '$MONGO_DB' --archive --gzip; rc=\$?
  rm -f /tmp/.snackify-dump.yml; exit \$rc" > "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "A cópia ficou vazia: o mongodump falhou." >&2
  exit 1
fi

FINAL="$BASE"
if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]]; then
  FINAL="$BASE.age"
  age -r "$BACKUP_AGE_RECIPIENT" -o "$FINAL" "$TMP"
elif [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then
  FINAL="$BASE.gpg"
  gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$FINAL" "$TMP"
else
  mv "$TMP" "$FINAL"
fi
chmod 600 "$FINAL"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
echo "Cópia criada: $FINAL ($(du -h "$FINAL" | cut -f1))"

# Retenção: mantém as BACKUP_KEEP cópias mais recentes.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/snackify-*.archive.gz* 2>/dev/null | grep -v '\.sha256$' | tail -n +"$((BACKUP_KEEP + 1))")
for file in "${OLD[@]}"; do
  rm -f "$file" "$file.sha256"
  echo "Cópia antiga removida: $(basename "$file")"
done
