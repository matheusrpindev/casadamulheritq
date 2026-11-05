# Implantação

Caminho recomendado: **um servidor Linux** (da Prefeitura ou VPS no Brasil) com Docker, atrás de HTTPS.
Para uma rede municipal (dezenas de profissionais), 2 vCPU / 4 GB de RAM / 40 GB de disco sobram.

> Por serem dados sensíveis, prefira infraestrutura da própria Prefeitura ou um provedor com data center no Brasil e
> contrato que trate de proteção de dados. Evite hospedagens gratuitas.

## 1. Preparar o `.env`

No servidor, dentro da pasta do projeto:

```bash
cp .env.example .env
```

```bash
docker run --rm -v "$PWD":/app -w /app node:22-alpine node scripts/gerar-chaves.mjs
```

Preencha no `.env`:

- `CHAVE_CRIPTOGRAFIA` e `CHAVE_INDICE` — as chaves geradas acima. **Guarde uma cópia no cofre de senhas da
  Prefeitura.** Sem elas, ninguém (nem a TI) consegue ler os relatos — inclusive de um backup.
- `SENHA_BANCO` — uma senha longa e aleatória para o PostgreSQL.
- `NOME_REDE` e `PREFIXO_PRONTUARIO` (ex.: `ITQ`).

O `DATABASE_URL` é montado pelo `docker-compose.yml`.

## 2. Subir

```bash
docker compose up -d --build
```

As migrações rodam sozinhas a cada inicialização. A aplicação escuta só em `127.0.0.1:3000`.

## 3. HTTPS

Coloque um proxy com certificado na frente. Exemplo com [Caddy](https://caddyserver.com) (certificado automático),
arquivo `/etc/caddy/Caddyfile`:

```
acolhe.itaquaquecetuba.sp.gov.br {
    reverse_proxy 127.0.0.1:3000
}
```

Em rede interna sem certificado (só para testes!), defina `PERMITIR_HTTP=true` no `.env`.

## 4. Primeira conta

```bash
docker compose exec app node scripts/criar-admin.mjs --email ti@prefeitura.sp.gov.br --nome "Equipe de TI" --unidade "Secretaria Municipal da Mulher" --sigla SMM --tipo SECRETARIA
```

Ele mostra uma **senha temporária**, trocada no primeiro acesso. Com essa conta, cadastre as unidades e as gestoras de
cada unidade; cada gestora cria as contas da própria equipe.

> **Nunca** rode `npm run db:semear` em produção: ele apaga o banco e cria dados fictícios.

## 4.1 Ambiente de validação (base fictícia)

Para a equipe testar antes de usar com casos reais, suba **uma instalação separada** (outro servidor ou outra pasta
com outro banco e outras chaves) com `MODO_VALIDACAO=true` no `.env` e carregue a base fictícia:

```bash
docker compose exec app node scripts/semear.mjs
```

O script apaga o banco e cria 156 mulheres inventadas e 10 contas de teste. Sem `MODO_VALIDACAO=true` ele se recusa
a rodar. O roteiro de testes está em [`ROTEIRO-DE-VALIDACAO.md`](ROTEIRO-DE-VALIDACAO.md).

> Na instalação de verdade, mantenha `MODO_VALIDACAO=false` e nunca rode esse script.

## 4.2 Validação na Netlify (ou Vercel) com banco Neon

Para a **base fictícia**, uma hospedagem gerenciada é o caminho mais rápido. **Não use para dados reais**: os
servidores ficam fora do Brasil e o contrato não foi avaliado pela Prefeitura.

1. **Banco:** crie um PostgreSQL no [Neon](https://neon.com) (ou pelo Netlify Database, que usa o Neon) e copie a
   *connection string* **com pooling** (o endereço tem `-pooler`).
2. **Chaves:** no seu computador, rode `npm run gerar-chaves` e guarde as duas chaves.
3. **Carga do banco, do seu computador:** no `.env` local, coloque o `DATABASE_URL` do Neon, as duas chaves e
   `MODO_VALIDACAO=true`. Depois rode `npm run db:migrar` e `npm run db:semear`.
4. **Site:** na Netlify, *Add new site → Import from Git*, escolha o repositório e a branch. O build (`npm run build`)
   é detectado sozinho. Em *Environment variables*, cadastre **exatamente as mesmas** `DATABASE_URL`,
   `CHAVE_CRIPTOGRAFIA` e `CHAVE_INDICE` do passo 3, mais `MODO_VALIDACAO=true`.

> As chaves da hospedagem precisam ser idênticas às usadas na carga: com chaves diferentes, os relatos gravados
> não podem ser lidos (o sistema mostra erro ao abrir um prontuário).

Para recomeçar a base depois dos testes, rode de novo o `npm run db:semear` do seu computador.

## 5. Backups

Backup diário do banco, criptografado, guardado fora do servidor. Exemplo (cron às 2h):

```bash
docker compose exec -T banco pg_dump -U acolhe -Fc acolhe | gpg --encrypt --recipient backup@prefeitura > /backup/acolhe-$(date +%F).dump.gpg
```

Teste a restauração todo mês em um ambiente separado. Lembre: o backup do banco **não** contém as chaves — elas ficam no
cofre de senhas, e são necessárias para ler os dados restaurados.

## 6. Atualizações

```bash
git pull
```

```bash
docker compose up -d --build
```

## 7. Checklist de produção

- [ ] HTTPS funcionando (o sistema exige cookie seguro)
- [ ] Chaves guardadas no cofre, com duas pessoas responsáveis
- [ ] Backup diário configurado e restauração testada
- [ ] Firewall: só portas 80/443 abertas; PostgreSQL não exposto
- [ ] Atualizações de segurança automáticas do sistema operacional
- [ ] RIPD e termo de uso aprovados com o encarregado (DPO)
- [ ] Rotina semanal da gestão: revisar acessos emergenciais na Auditoria
