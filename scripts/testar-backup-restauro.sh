#!/usr/bin/env bash
# Teste automático da cópia de segurança e do restauro, num MongoDB descartável em Docker:
#   1. arranca um mongo:7 com autenticação (como o docker-compose.yml);
#   2. cria dados de exemplo (contas, restaurantes, encomendas e vales);
#   3. regista o número de documentos e o hash de cada coleção (comando dbHash);
#   4. faz a cópia com scripts/backup.sh, cifrada com age se estiver instalado;
#   5. apaga a base de dados e confirma que ficou vazia;
#   6. repõe com scripts/restore.sh e compara contagens e hashes;
#   7. confirma a retenção (BACKUP_KEEP) e remove o contentor.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
NAME="snackify-backup-teste-$$"
PASS="teste-$(openssl rand -hex 12)"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

echo "» A arrancar o MongoDB de teste ($NAME)..."
docker run -d --rm --name "$NAME" -e MONGO_INITDB_ROOT_USERNAME=snackify -e MONGO_INITDB_ROOT_PASSWORD="$PASS" mongo:7 --quiet >/dev/null
for _ in $(seq 1 60); do
  docker exec "$NAME" mongosh --quiet -u snackify -p "$PASS" --authenticationDatabase admin --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1 && break
  sleep 1
done

mongo() { docker exec -i "$NAME" mongosh --quiet -u snackify -p "$PASS" --authenticationDatabase admin snackify --eval "$1"; }

echo "» A criar dados de exemplo..."
mongo '
  const users = [];
  for (let i = 0; i < 200; i++) users.push({ name: "Cliente " + i, username: "c" + i, email: "c" + i + "@exemplo.pt", emailVerified: true, createdAt: new Date() });
  db.users.insertMany(users);
  db.users.createIndex({ email: 1 }, { unique: true });
  const r = db.restaurants.insertMany([{ name: "Tasca", isChecked: true }, { name: "Marisqueira", isChecked: true }]);
  const orders = [];
  for (let i = 0; i < 1500; i++) orders.push({ orderCode: "ORD-" + i, total: (i % 37) + 0.5, state: i % 3 ? "entregue" : "pendente", orderDate: new Date(Date.UTC(2026, 0, 1) + i * 60000), restaurantId: r.insertedIds[i % 2] });
  db.orders.insertMany(orders);
  db.orders.createIndex({ restaurantId: 1, orderDate: -1 });
  db.vouchers.insertMany([{ code: "VALE-AAA111", value: 10, balance: 7.5, status: "active" }, { code: "VALE-BBB222", value: 20, balance: 0, status: "active" }]);
' >/dev/null

snapshot() {
  mongo 'const h = db.runCommand({ dbHash: 1 }); const out = {};
    db.getCollectionNames().sort().forEach(c => { out[c] = { n: db.getCollection(c).countDocuments(), hash: h.collections[c], idx: db.getCollection(c).getIndexes().length }; });
    print(JSON.stringify(out));'
}
BEFORE="$(snapshot)"
echo "  antes:  $BEFORE"

export MONGO_CONTAINER="$NAME" MONGO_ROOT_USERNAME=snackify MONGO_ROOT_PASSWORD="$PASS" BACKUP_DIR="$WORK/backups" BACKUP_KEEP=2
if command -v age >/dev/null 2>&1; then
  age-keygen -o "$WORK/chave.txt" 2>/dev/null
  export BACKUP_AGE_RECIPIENT="$(grep -o 'age1[0-9a-z]*' "$WORK/chave.txt")" BACKUP_AGE_IDENTITY="$WORK/chave.txt"
  echo "» Cópia cifrada com age"
fi

echo "» Cópia de segurança..."
"$HERE/backup.sh"
FILE="$(ls -1t "$BACKUP_DIR"/snackify-*.archive.gz* | grep -v '\.sha256$' | head -1)"
if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] && ! head -c 40 "$FILE" | grep -q "age-encryption.org"; then
  echo "FALHOU: a cópia não está cifrada." >&2; exit 1
fi

echo "» A apagar a base de dados..."
mongo 'db.dropDatabase()' >/dev/null
[[ "$(mongo 'print(db.getCollectionNames().length)')" == "0" ]] || { echo "FALHOU: a base de dados não ficou vazia." >&2; exit 1; }

echo "» Restauro..."
RESTORE_YES=1 "$HERE/restore.sh" "$FILE"
AFTER="$(snapshot)"
echo "  depois: $AFTER"
[[ "$BEFORE" == "$AFTER" ]] || { echo "FALHOU: contagens, índices ou hashes diferentes depois do restauro." >&2; exit 1; }

echo "» Ficheiro danificado é recusado..."
cp "$FILE" "$WORK/danificado"; cp "$FILE.sha256" "$WORK/danificado.sha256"
sed -i "s#$(basename "$FILE")#danificado#" "$WORK/danificado.sha256"
printf 'x' >> "$WORK/danificado"
if RESTORE_YES=1 "$HERE/restore.sh" "$WORK/danificado" 2>/dev/null; then
  echo "FALHOU: um ficheiro alterado foi reposto." >&2; exit 1
fi

echo "» Retenção (BACKUP_KEEP=2)..."
sleep 1; "$HERE/backup.sh" >/dev/null; sleep 1; "$HERE/backup.sh" >/dev/null
COUNT="$(ls -1 "$BACKUP_DIR"/snackify-*.archive.gz* | grep -vc '\.sha256$')"
[[ "$COUNT" == "2" ]] || { echo "FALHOU: ficaram $COUNT cópias em vez de 2." >&2; exit 1; }

echo "OK: cópia, restauro (contagens, índices e dbHash iguais), verificação do sha256 e retenção."
