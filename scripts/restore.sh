#!/usr/bin/env bash
# Repõe uma cópia de segurança criada por scripts/backup.sh (mongorestore --drop).
#
# Uso:   scripts/restore.sh backups/snackify-AAAAMMDD-HHMMSS.archive.gz[.age|.gpg]
#
# Variáveis: as mesmas do backup.sh e ainda
#   BACKUP_AGE_IDENTITY   ficheiro com a chave privada age (para cópias .age)
#   RESTORE_DB            repor com outro nome de base de dados (ex.: snackify_restauro, para testar)
#   RESTORE_YES=1         não pedir confirmação
# ATENÇÃO: as coleções existentes na base de dados de destino são substituídas.
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Indique o ficheiro da cópia: scripts/restore.sh backups/snackify-....archive.gz" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    [[ -z "${!key:-}" ]] && export "$key=${value%\"}" 2>/dev/null || true
  done < <(grep -E '^[A-Z_]+=' "$ROOT/.env")
fi

MONGO_DB="${MONGO_DB:-snackify}"
RESTORE_DB="${RESTORE_DB:-$MONGO_DB}"
MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-snackify}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-}"
if [[ -z "${MONGO_CONTAINER:-}" ]]; then
  MONGO_CONTAINER="$(cd "$ROOT" && docker compose ps -q mongo 2>/dev/null || true)"
fi
[[ -n "$MONGO_CONTAINER" ]] || { echo "Contentor do MongoDB não encontrado (MONGO_CONTAINER)." >&2; exit 1; }

if [[ -f "$FILE.sha256" ]]; then
  (cd "$(dirname "$FILE")" && sha256sum --check --quiet "$(basename "$FILE").sha256") \
    || { echo "O ficheiro não corresponde ao .sha256: cópia danificada ou alterada." >&2; exit 1; }
fi

if [[ "${RESTORE_YES:-}" != "1" ]]; then
  read -r -p "Repor $FILE na base de dados '$RESTORE_DB' (as coleções atuais são substituídas)? [s/N] " answer
  [[ "$answer" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 1; }
fi

decrypt() {
  case "$FILE" in
    *.age) age -d -i "${BACKUP_AGE_IDENTITY:?Defina BACKUP_AGE_IDENTITY}" "$FILE" ;;
    *.gpg) gpg --batch --quiet --decrypt "$FILE" ;;
    *) cat "$FILE" ;;
  esac
}

AUTH_ARGS=""
if [[ -n "$MONGO_ROOT_PASSWORD" ]]; then
  AUTH_ARGS="--username $MONGO_ROOT_USERNAME --authenticationDatabase admin"
  # A password vai no início do stdin (primeira linha) e o arquivo a seguir: nunca aparece no ps.
fi

TMP_IN="$(mktemp)"
trap 'rm -f "$TMP_IN"' EXIT
decrypt > "$TMP_IN"
docker cp "$TMP_IN" "$MONGO_CONTAINER:/tmp/.snackify-restore.archive.gz" >/dev/null
printf 'password: "%s"\n' "$MONGO_ROOT_PASSWORD" | docker exec -i "$MONGO_CONTAINER" sh -c "
  umask 077; cat > /tmp/.snackify-restore.yml
  CONF=''; [ -n '$AUTH_ARGS' ] && CONF='--config /tmp/.snackify-restore.yml'
  mongorestore --quiet \$CONF $AUTH_ARGS --drop --gzip --archive=/tmp/.snackify-restore.archive.gz \
    --nsInclude '$MONGO_DB.*' --nsFrom '$MONGO_DB.*' --nsTo '$RESTORE_DB.*'; rc=\$?
  rm -f /tmp/.snackify-restore.yml /tmp/.snackify-restore.archive.gz; exit \$rc"
echo "Cópia reposta em '$RESTORE_DB'."
