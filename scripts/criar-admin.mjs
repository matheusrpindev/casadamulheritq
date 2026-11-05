// Primeiro acesso em produção: cria a primeira unidade (se não existir) e uma conta
// com senha temporária (trocada no primeiro login).
//
// Uso (local):      npm run criar-admin -- --email ti@prefeitura.gov.br --nome "Equipe de TI"
// Uso (container):  docker compose exec app node scripts/criar-admin.mjs --email ... --nome "..."
// Opcionais: --unidade "Secretaria Municipal da Mulher" --sigla SMM --tipo SECRETARIA --papel ADMIN
try {
  await import("dotenv/config");
} catch {}
import { randomInt } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const TIPOS = ["CASA_DA_MULHER", "SECRETARIA", "CREAS", "CRAS", "DELEGACIA", "SAUDE", "JURIDICO", "ABRIGO", "OUTRO"];
const PAPEIS = ["ADMIN", "GESTORA", "TECNICA", "RECEPCAO"];
const arg = (nome) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const email = arg("email")?.trim().toLowerCase();
const nome = arg("nome")?.trim();
const nomeUnidade = arg("unidade") ?? "Secretaria Municipal da Mulher";
const sigla = arg("sigla") ?? "SMM";
const tipo = arg("tipo") ?? "SECRETARIA";
const papel = arg("papel") ?? "ADMIN";

if (!email || !nome) {
  console.error('Informe --email e --nome. Ex.: --email ti@prefeitura.gov.br --nome "Equipe de TI"');
  process.exit(1);
}
if (!TIPOS.includes(tipo) || !PAPEIS.includes(papel)) {
  console.error(`--tipo: ${TIPOS.join(", ")}\n--papel: ${PAPEIS.join(", ")}`);
  process.exit(1);
}

const palavras = ["lume", "vento", "folha", "ponte", "rio", "sol", "mar", "flor", "trilha", "aurora", "brisa", "pedra", "nuvem", "farol"];
const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const bloco = Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join("");
const senha = `${palavras[randomInt(palavras.length)]}-${bloco}-${palavras[randomInt(palavras.length)]}-${randomInt(10, 100)}`;

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
await cliente.connect();
try {
  const existe = await cliente.query("select 1 from usuarios where email = $1", [email]);
  if (existe.rowCount) throw new Error("Já existe uma conta com esse e-mail.");
  let unidade = (await cliente.query("select id, nome from unidades where nome = $1", [nomeUnidade])).rows[0];
  if (!unidade) {
    unidade = (
      await cliente.query("insert into unidades (nome, sigla, tipo) values ($1, $2, $3) returning id, nome", [nomeUnidade, sigla, tipo])
    ).rows[0];
  }
  await cliente.query(
    "insert into usuarios (nome, email, papel, unidade_id, senha_hash, precisa_trocar_senha) values ($1, $2, $3, $4, $5, true)",
    [nome, email, papel, unidade.id, await bcrypt.hash(senha, 12)],
  );
  console.log(`\n✓ Conta criada: ${email} (${papel}) em ${unidade.nome}\n  Senha temporária: ${senha}\n  Ela será trocada no primeiro acesso.\n`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
