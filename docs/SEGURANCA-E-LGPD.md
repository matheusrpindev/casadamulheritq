# Segurança, privacidade e LGPD

Este documento explica **como o Acolhe protege os dados** e serve de base para o Relatório de Impacto à Proteção de
Dados (RIPD) que a Prefeitura deve elaborar com seu encarregado (DPO). Não é parecer jurídico.

## 1. Natureza dos dados e base legal

O sistema trata dados pessoais sensíveis (saúde, vida sexual, origem racial — LGPD art. 5º, II) de mulheres em situação
de violência e dados de terceiros (autores da violência).

Bases legais a avaliar no RIPD:

- **Execução de políticas públicas** pela administração (LGPD art. 11, II, "b"), no âmbito da Lei 11.340/2006
  (Lei Maria da Penha), que prevê atendimento articulado em rede (art. 8º e 9º);
- **Proteção da vida e da incolumidade física** (art. 11, II, "e") — fundamento do acesso emergencial;
- **Consentimento** (art. 11, I) — usado aqui como camada adicional de respeito à autonomia dela: o compartilhamento
  com outras unidades depende da autorização registrada, que pode ser revogada.

## 2. Quem vê o quê

| Perfil | Pode |
|---|---|
| **Recepção** | Buscar, cadastrar, ver identificação, risco atual, contato seguro, medidas protetivas e encaminhamentos; confirmar chegada. **Não lê** relatos, atendimentos nem respostas do FONAR. |
| **Equipe técnica** | Tudo da recepção + ler e registrar relatos, atendimentos, FONAR, autores, medidas e encaminhamentos — respeitando o sigilo de cada registro. |
| **Gestão** | Tudo da equipe técnica + trilha de auditoria da unidade, revisão de acessos emergenciais, relatórios, equipe da unidade, arquivamento. **Não** fura o sigilo por especialidade. |
| **Administração (TI)** | Contas, unidades, auditoria técnica e relatórios agregados. **Nunca abre prontuário.** |

### Acesso ao prontuário (por unidade)

Uma unidade só abre um prontuário quando existe uma concessão vigente:

1. **Origem** — a unidade que abriu o prontuário;
2. **Encaminhamento** — recebeu encaminhamento *e* ela autorizou o compartilhamento;
3. **Autorização direta** — ela está na unidade e autorizou (justificativa obrigatória, auditado);
4. **Emergencial ("quebra de vidro")** — risco à vida ou integridade, justificativa obrigatória, **expira em 24 h**,
   aparece em destaque na auditoria e na fila de revisão da gestão da unidade de origem, que pode revogar.

Não existe "listar todas as mulheres": é preciso buscar alguém específico, e toda busca é registrada.

### Sigilo de cada registro

Ao registrar relato ou atendimento, a profissional escolhe:

- **Rede** — equipes técnicas das unidades com acesso;
- **Só minha unidade**;
- **Só minha especialidade** — ex.: registros da Psicologia, lidos só por psicólogas (Resolução CFP 01/2009 e 06/2019).

Quem não pode ler vê apenas que o registro existe ("Conteúdo restrito à Psicologia"), para saber que há acompanhamento.
A impressão inclui somente registros compartilhados com a rede.

## 3. Proteções técnicas

| Proteção | Onde |
|---|---|
| Criptografia de campo AES-256-GCM (relatos, atendimentos, FONAR, fichas de passagem, CPF, telefone, endereço, orientações de contato, dados do autor) | `src/lib/cripto.ts` |
| CPF buscável sem ficar legível (índice cego HMAC-SHA256) | `src/lib/cripto.ts` |
| Regras de acesso centralizadas e testadas | `src/lib/permissoes.ts`, `tests/permissoes.test.ts` |
| Checagem de permissão em **toda** ação do servidor (nunca só na interface) | `src/app/(app)/prontuarios/acoes.ts` |
| Auditoria de login, buscas, visualizações, impressões, alterações, acessos emergenciais | `src/lib/auditoria.ts` |
| Auditoria e registros técnicos imutáveis (triggers bloqueiam UPDATE/DELETE) | `drizzle/0001_protecoes.sql` |
| Senhas bcrypt (custo 12), política mínima, troca obrigatória no 1º acesso | `src/lib/senha.ts` |
| Bloqueio por 15 min após 5 tentativas; resposta igual para e-mail inexistente | `src/app/login/acoes.ts` |
| Sessão no banco (só o hash do token), cookie `httpOnly`/`secure`/`sameSite`, 10 h de duração, 30 min de inatividade | `src/lib/sessao.ts` |
| Bloqueio de tela no navegador após 15 min parado (com aviso); renovação enquanto ela digita | `src/components/guarda-inatividade.tsx` |
| CSP com nonce, `frame-ancestors 'none'`, HSTS, `no-referrer`, `nosniff`, `Cache-Control: no-store`, `noindex` | `src/proxy.ts`, `next.config.ts` |
| Relatórios só agregados (tela e CSV), com supressão de contagens < 3 nas categorias sensíveis | `src/lib/dados/relatorios.ts` |

### Campos em texto claro

Para que os relatórios possam ser calculados no banco, ficam **sem criptografia**: nome civil e social, data de
nascimento, bairro, raça/cor, identidade de gênero, escolaridade e o perfil familiar e socioeconômico (filhos,
gestação, deficiência, estado civil, trabalho, renda, benefício, moradia, dependência financeira). Relatos,
atendimentos, respostas do FONAR, fichas de passagem, CPF, telefone, endereço, orientações de contato e dados do
autor continuam cifrados. Os relatórios nunca mostram uma mulher individualmente e ocultam contagens de 1 e 2 nas
categorias sensíveis.

## 4. Responsabilidades da operação

- **Chaves:** `CHAVE_CRIPTOGRAFIA` e `CHAVE_INDICE` ficam fora do repositório e fora do backup do banco, em cofre de
  senhas da Prefeitura, com pelo menos duas pessoas responsáveis. **Perder a chave = perder os relatos.**
- **Backups:** diários, criptografados, testados mensalmente (restaurar em ambiente separado).
- **Contas:** uma por pessoa, nunca compartilhadas; desativar no mesmo dia em que alguém sai da equipe.
- **Revisão:** a gestão revisa semanalmente os acessos emergenciais e eventos de bloqueio de conta.
- **Direitos da titular (LGPD art. 18):** a gestão consegue informar a ela quais unidades e profissionais acessaram o
  prontuário (aba *Acessos*). Pedidos de correção viram retificação; pedidos de eliminação devem ser avaliados
  juridicamente (há dever de guarda de registros de atendimento público).
- **Incidentes:** em caso de suspeita de vazamento, comunicar o encarregado (DPO) imediatamente (LGPD art. 48).

## 5. Limitações conhecidas

- Ainda não há autenticação em dois fatores (recomendado antes de ampliar o acesso para fora da rede municipal).
- O texto do FONAR deve ser conferido com a versão oficial vigente; a sugestão de risco é apoio, não decisão.
- A troca de chave de criptografia (rotação) exige script de recriptografia — o formato `v1.` já prevê versões.
