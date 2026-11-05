# Acolhe — Prontuário único da rede de atendimento à mulher

> **Ela conta uma vez. A rede inteira acolhe.**

Sistema para a rede de atendimento à mulher em situação de violência de **Itaquaquecetuba** (Casa da Mulher,
Secretaria da Mulher, CREAS, saúde, delegacia…). Cada porta da rede passa a enxergar o mesmo prontuário: se ela foi
acolhida na Secretaria e depois chega à Casa da Mulher, a equipe já sabe o que aconteceu, qual o risco e o que foi
feito, e **ela não precisa contar a história de novo** (revitimização — Lei 14.245/2021 e Lei 13.505/2017).

## Como funciona

```
 Secretaria da Mulher                         Casa da Mulher
 ─────────────────────                        ─────────────────────────────
 1. Busca na rede (nome/CPF)                  4. "Chegando à sua unidade":
 2. Abre o prontuário                            Maria · Urgente · de SMM
    · relato (escuta qualificada)             5. Lê o prontuário ANTES de recebê-la:
    · avaliação de risco (FONAR)                 relato, risco, medidas, como contatar
    · autorização dela p/ compartilhar        6. Confirma a chegada e registra o
 3. Encaminha, com ficha de passagem  ──────►    atendimento — sem pedir que ela repita
```

## O que tem

| Para quem atende | Para a gestão |
|---|---|
| **Busca na rede inteira** antes de abrir prontuário (com alerta de duplicidade) | **Relatórios** agregados: atendimentos, fluxos entre unidades, tempo até ela ser recebida; **perfil** (idade, filhos, filhos menores, gestantes, deficiência, raça/cor, escolaridade, trabalho, renda, benefício, moradia, bairro); **violência** (formas, vínculo com o autor, arma de fogo, fatores de risco do FONAR, medidas protetivas). Exporta CSV e imprime |
| **Relato único** registrado com as palavras dela, disponível para as próximas unidades | **Trilha de auditoria** imutável: quem viu, buscou, imprimiu ou alterou o quê |
| **Linha do tempo** unificada com o que cada unidade fez | **Fila de revisão** dos acessos emergenciais aos prontuários da unidade |
| **FONAR** (Lei 14.149/2021) com sugestão de risco ao vivo e reaplicação já preenchida | Gestão da equipe (contas, senhas temporárias, desativação) |
| **Encaminhamentos** com ficha de passagem, urgência, confirmação de chegada e devolutiva | Cadastro das unidades da rede |
| **Contato seguro**: aviso quando ligar pode colocá-la em risco e orientação de como falar com ela | Arquivamento (nada é apagado) |
| **Medidas protetivas** com alerta de vencimento | |
| **Nome social** respeitado em todo o sistema | |
| **Família e situação socioeconômica** no cadastro, resumida no cartão "Sobre ela" | |
| **Versão para impressão** sigilosa (registrada na auditoria) | |

## Privacidade e segurança (resumo)

Dados de mulheres em situação de violência são dados pessoais sensíveis (LGPD, art. 11). O sistema foi desenhado para
isso desde o início — detalhes em [`docs/SEGURANCA-E-LGPD.md`](docs/SEGURANCA-E-LGPD.md).

- **Acesso por necessidade:** a unidade só abre o prontuário se abriu o caso, recebeu encaminhamento autorizado, ela
  autorizou diretamente, ou em **acesso emergencial** (justificado, expira em 24 h, revisado pela gestão).
- **Consentimento dela** registrado e revogável; sem ele, a unidade de destino recebe só a ficha de passagem.
- **Sigilo por registro:** rede, só a unidade, ou só a especialidade (ex.: Psicologia — nem a gestão lê).
- **Recepção** cadastra e confirma chegadas, mas não lê relatos. **TI** administra contas, mas não lê prontuários.
- **Criptografia de campo (AES-256-GCM)** para relatos, atendimentos, FONAR, CPF, telefone, endereço e dados do
  autor. Um backup vazado não expõe as histórias.
- **Nada se apaga:** relatos, atendimentos, avaliações e auditoria são protegidos por *triggers* no banco; correção é
  por retificação, com o original preservado.
- Senhas com bcrypt, bloqueio após 5 tentativas, sessões curtas, **bloqueio automático de tela** por inatividade,
  CSP com *nonce*, cabeçalhos de segurança, páginas fora de buscadores e de cache.

## Rodando no seu computador

Requisitos: Node.js 22+ e PostgreSQL 14+ (ou Docker).

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run gerar-chaves
```

Cole as duas chaves geradas no `.env` e ajuste o `DATABASE_URL`. Depois:

```bash
npm run db:migrar
```

```bash
npm run db:semear
```

```bash
npm run dev
```

Abra http://localhost:3000. O `db:semear` cria a **base fictícia de validação** (apaga o banco antes!): 5 unidades,
10 contas e 156 mulheres inventadas, com 6 casos-roteiro detalhados. Senha de todas as contas: `acolhe-demo-2026`.
Com `MODO_VALIDACAO=true` no `.env`, uma faixa amarela avisa em todas as telas que os dados são fictícios.

**Para a equipe testar, siga o [roteiro de validação](docs/ROTEIRO-DE-VALIDACAO.md).**

| Conta | Quem é | Experimente |
|---|---|---|
| `carla@acolhe.demo` | Psicóloga da Casa da Mulher | Maria e Bianca estão chegando da Secretaria: abra pelo painel e veja que tudo já está lá |
| `sueli@acolhe.demo` | Recepção da Casa da Mulher | Vê o essencial para receber, mas não lê relatos |
| `joana@acolhe.demo` | Advogada da Casa da Mulher | Não lê os registros restritos à Psicologia |
| `ana@acolhe.demo` | Gestora da Casa da Mulher | Auditoria com um acesso emergencial para revisar; relatórios |
| `marta@acolhe.demo` | Assistente social da Secretaria | Quem acolheu a Maria |
| `luiza@acolhe.demo` | UBS | A Antônia não autorizou compartilhar — veja como fica do lado da Casa da Mulher |
| `ti@acolhe.demo` | TI da Prefeitura | Gerencia contas e unidades, sem acesso a prontuários |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (regras de acesso, FONAR, criptografia) |
| `npm run lint` / `npm run typecheck` | Verificações de código |
| `npm run db:gerar` | Gera migração após mudar `src/db/schema.ts` |
| `npm run db:migrar` | Aplica migrações |
| `npm run db:semear` | Base fictícia de validação (**apaga o banco**); `QTD_CASOS=300` muda o volume |
| `npm run build:semear` | Empacota a carga fictícia em `dist-scripts/semear.mjs` (usado na imagem Docker) |
| `npm run criar-admin -- --email … --nome "…"` | Primeira conta em produção |

## Implantação

Veja [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md): servidor com Docker Compose, HTTPS, backups, guarda das chaves e
primeira conta.

## Estrutura

```
src/
  app/(app)/            telas autenticadas (painel, busca, prontuário, encaminhamentos, gestão)
  app/(app)/prontuarios/acoes.ts   todas as ações do prontuário (permissão + auditoria em cada uma)
  app/(impressao)/      versão para impressão
  app/login/            entrada
  db/schema.ts          modelo de dados
  lib/permissoes.ts     regras de acesso (funções puras, testadas)
  lib/fonar.ts          perguntas e sugestão de risco do FONAR
  lib/dados/relatorios.ts  consultas dos relatórios (tela e CSV)
  lib/cripto.ts         criptografia de campo e índice cego
  lib/sessao.ts         sessões, expiração e inatividade
  proxy.ts              CSP com nonce e checagem de sessão
drizzle/                migrações (inclui triggers de imutabilidade)
scripts/                migrar, semear + gerador-casos (base fictícia), criar-admin, gerar-chaves
tests/                  testes automatizados
```

Stack: Next.js 16 (App Router, Server Actions), React 19, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS 4.

### Identidade visual

Segue a identidade oficial da **Casa da Mulher Itaquaquecetuba**: roxo `#862C72`, rosa `#E7A1A3`, coral `#E07974`
e cinza `#717075`, com títulos em PT Sans. Os logos ficam em `public/marca/` nas versões horizontal e vertical, com
texto cinza (fundo claro) ou branco (fundo escuro), recompostos dos arquivos oficiais com fundo transparente; o
símbolo da casa é desenhado em SVG (`src/components/marca.tsx` e `src/app/icon.svg`). As cores estão em
`src/app/globals.css` (escala `marca-*`; os cinzas da interface usam a escala `zinc`, próxima do cinza oficial).
Coral e rosa são só decorativos: texto branco sobre coral não tem contraste suficiente.

## Antes de usar com dados reais

- [ ] Conferir as perguntas do FONAR com a versão oficial vigente do CNJ (`src/lib/fonar.ts`) e validar com a equipe os
      critérios da sugestão de risco.
- [ ] Elaborar com o encarregado (DPO) da Prefeitura o **Relatório de Impacto à Proteção de Dados (RIPD)** e o termo de
      uso para as profissionais.
- [ ] Definir com a rede quais unidades entram, os perfis de cada pessoa e o fluxo de revisão dos acessos emergenciais.
- [ ] Hospedagem com HTTPS, backups criptografados e chaves guardadas fora do servidor (ver implantação).
- [ ] Treinamento da equipe — principalmente sobre consentimento, sigilo por registro e acesso emergencial.

## Próximos passos possíveis

Autenticação em dois fatores · avisos por e-mail de encaminhamento urgente · agenda de atendimentos · anexos
(documentos, BO, decisão da MPU) com criptografia · relatório de acessos para entregar à própria mulher (LGPD art. 18)
· relatórios mensais automáticos por e-mail para a gestão.
