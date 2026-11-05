// Diagnóstico da configuração: npm run db:verificar
// Lê os arquivos .env do mesmo jeito que o Next.js (npm run dev) e confere, passo a passo:
// endereço do banco, conexão, tabelas, dados e se a chave de criptografia abre os relatos.
import { createRequire } from "node:module";
import { createDecipheriv } from "node:crypto";
import pg from "pg";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const dotenv = require("dotenv");

const ok = (m) => console.log(`  ✓ ${m}`);
const erro = (m, dica) => {
  console.log(`  ✗ ${m}`);
  if (dica) console.log(`    → ${dica}`);
};
let problemas = 0;
const falhou = (m, dica) => {
  problemas++;
  erro(m, dica);
};

console.log("\nDiagnóstico do Acolhe\n");

// 1) Arquivos de configuração
console.log("1. Arquivos de configuração");
const { loadedEnvFiles } = loadEnvConfig(process.cwd(), true, { info() {}, error: console.error });
if (loadedEnvFiles.length === 0) {
  falhou("Nenhum arquivo .env encontrado nesta pasta.", "Crie o arquivo .env (copie o .env.example) dentro da pasta do projeto.");
} else {
  for (const f of loadedEnvFiles) ok(`lido: ${f.path}`);
  const comBanco = loadedEnvFiles.filter((f) => "DATABASE_URL" in dotenv.parse(f.contents ?? ""));
  if (comBanco.length > 1) {
    falhou(
      `DATABASE_URL aparece em ${comBanco.length} arquivos (${comBanco.map((f) => f.path).join(", ")}). O Next usa o de ${comBanco[0].path}.`,
      "Deixe o endereço do banco só no .env e apague os outros arquivos (.env.local etc.).",
    );
  }
}

// 2) Variáveis
console.log("\n2. Variáveis");
const url = process.env.DATABASE_URL;
let alvo = null;
if (!url) {
  falhou("DATABASE_URL não está definida.", "Coloque o endereço do Neon no .env, na linha DATABASE_URL=");
} else {
  try {
    const u = new URL(url);
    alvo = u;
    ok(`DATABASE_URL aponta para ${u.hostname} / banco "${u.pathname.slice(1)}" / usuário "${decodeURIComponent(u.username)}"`);
    const senha = decodeURIComponent(u.password);
    if (!senha || senha === "..." || senha === "SENHA") {
      falhou("A senha no endereço está vazia ou é um texto de exemplo.", "Copie de novo o endereço completo no Neon (botão Connect → Show password).");
    }
    if (url.startsWith('"') || url.endsWith('"')) falhou("O endereço ficou com aspas sobrando.", "Confira as aspas no início e no fim da linha DATABASE_URL.");
  } catch {
    falhou("DATABASE_URL não é um endereço válido.", "Copie de novo o endereço completo no Neon.");
  }
}
for (const nome of ["CHAVE_CRIPTOGRAFIA", "CHAVE_INDICE"]) {
  const v = process.env[nome];
  if (!v) falhou(`${nome} não está definida.`, 'Rode "npm run gerar-chaves" e cole as linhas no .env.');
  else if (Buffer.from(v, "base64").length !== 32) falhou(`${nome} não tem 32 bytes em base64.`, "Copie a chave inteira, sem espaços.");
  else ok(`${nome} definida`);
}

// 3) Conexão
console.log("\n3. Conexão com o banco");
let cliente = null;
if (url && alvo) {
  cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  try {
    await cliente.connect();
    const { rows } = await cliente.query("select current_database() as banco, version() as versao");
    ok(`conectado (${rows[0].versao.split(" ").slice(0, 2).join(" ")})`);
  } catch (e) {
    const dicas = {
      "28P01": "Senha errada. Copie de novo o endereço no Neon (Connect → Show password).",
      "3D000": "O banco indicado no endereço não existe. Confira o nome depois da última barra.",
      ENOTFOUND: "Endereço do servidor não encontrado. Confira se o endereço foi copiado inteiro.",
      ETIMEDOUT: "Sem resposta. A rede (firewall, antivírus, rede da Prefeitura) pode estar bloqueando a porta 5432.",
      ECONNREFUSED: "Conexão recusada. Confira o endereço, ou a rede pode estar bloqueando a porta 5432.",
      SELF_SIGNED_CERT_IN_CHAIN: "Um antivírus ou proxy está interceptando a conexão segura. Teste em outra rede.",
    };
    falhou(`não conectou: ${e.message}${e.code ? ` (código ${e.code})` : ""}`, dicas[e.code] ?? "Mande esta mensagem para quem está te ajudando com o sistema.");
    cliente = null;
  }
}

// 4) Tabelas e dados
if (cliente) {
  console.log("\n4. Tabelas e dados");
  const { rows } = await cliente.query("select to_regclass('public.usuarios') is not null as tem_tabela");
  if (!rows[0].tem_tabela) {
    falhou("As tabelas não existem neste banco.", 'Rode "npm run db:migrar".');
  } else {
    ok("tabelas criadas");
    const { rows: c } = await cliente.query(
      "select (select count(*) from usuarios)::int as usuarios, (select count(*) from prontuarios)::int as prontuarios",
    );
    if (c[0].usuarios === 0) falhou("Não há nenhuma conta cadastrada.", 'Rode "npm run db:semear" (base fictícia) ou "npm run criar-admin".');
    else ok(`${c[0].usuarios} contas e ${c[0].prontuarios} prontuários`);

    // 5) A chave abre os dados gravados?
    console.log("\n5. Chave de criptografia");
    const { rows: r } = await cliente.query("select texto_cifrado from relatos limit 1");
    if (r.length === 0) ok("nenhum relato gravado ainda (nada a conferir)");
    else if (process.env.CHAVE_CRIPTOGRAFIA) {
      try {
        const [, iv, tag, conteudo] = r[0].texto_cifrado.split(".");
        const d = createDecipheriv("aes-256-gcm", Buffer.from(process.env.CHAVE_CRIPTOGRAFIA, "base64"), Buffer.from(iv, "base64url"));
        d.setAuthTag(Buffer.from(tag, "base64url"));
        Buffer.concat([d.update(Buffer.from(conteudo, "base64url")), d.final()]);
        ok("a chave abre os relatos gravados");
      } catch {
        falhou(
          "a CHAVE_CRIPTOGRAFIA é diferente da usada quando os dados foram gravados.",
          'Use a mesma chave do "npm run db:semear", ou rode o db:semear de novo com a chave atual.',
        );
      }
    }
  }
  await cliente.end();
}

console.log(problemas === 0 ? "\nTudo certo. ✓\n" : `\n${problemas} problema(s) encontrado(s). Veja as dicas acima.\n`);
process.exit(problemas === 0 ? 0 : 1);
