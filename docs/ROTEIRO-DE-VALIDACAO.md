# Roteiro de validação

Este roteiro é para a equipe da Casa da Mulher e da rede **testar o sistema antes de usar com casos reais**. A base é
inteiramente fictícia: são **156 mulheres inventadas** (6 com histórias detalhadas, as "casos-roteiro", e 150 geradas
com perfis coerentes), espalhadas pelos últimos 12 meses, para que buscas, encaminhamentos e relatórios tenham volume.

> Uma faixa amarela no topo de todas as telas avisa que é ambiente de validação. **Não registre dados de mulheres
> reais neste ambiente.**

## 1. Montar o ambiente

**No computador de quem desenvolve** (Node.js 22+ e PostgreSQL):

```bash
npm install
```

```bash
npm run db:migrar
```

```bash
npm run db:semear
```

```bash
npm run dev
```

No `.env`, deixe `MODO_VALIDACAO=true` (mostra a faixa de aviso).

**Num servidor, para a equipe acessar** (Docker): siga o [`IMPLANTACAO.md`](IMPLANTACAO.md) com `MODO_VALIDACAO=true`
no `.env` e, depois de subir, carregue a base:

```bash
docker compose exec app node scripts/semear.mjs
```

O script **apaga tudo** e recria a base. Sem `MODO_VALIDACAO=true` ele se recusa a rodar em produção. Para começar
de novo depois dos testes, é só rodá-lo outra vez.

## 2. Contas

Senha de todas: `acolhe-demo-2026`

| Conta | Quem é | Unidade |
|---|---|---|
| `carla@acolhe.demo` | Carla Nunes, psicóloga | Casa da Mulher (CMI) |
| `joana@acolhe.demo` | Joana Prado, advogada | Casa da Mulher |
| `ana@acolhe.demo` | Ana Beatriz Moura, gestora | Casa da Mulher |
| `sueli@acolhe.demo` | Sueli Ramos, recepção | Casa da Mulher |
| `marta@acolhe.demo` | Marta Lima, assistente social | Secretaria da Mulher, Direitos Humanos e Cidadania (SMDHC) |
| `renata@acolhe.demo` | Renata Alves, gestora (psicóloga) | Secretaria da Mulher |
| `paula@acolhe.demo` | Paula Teixeira, assistente social | CREAS |
| `luiza@acolhe.demo` | Luiza Campos, enfermeira | UBS Central |
| `beatriz@acolhe.demo` | Beatriz Souza | Delegacia da Mulher (DDM) |
| `ti@acolhe.demo` | Equipe de TI | — (não lê prontuários) |

Dica: use uma janela anônima do navegador para cada pessoa e compare o que cada uma vê.

## 3. Casos-roteiro

| Mulher (fictícia) | O que ela permite testar |
|---|---|
| **Maria Aparecida dos Santos**, 35 | Acolhida na Secretaria, encaminhada **com urgência** à Casa da Mulher hoje. Relato, FONAR (risco elevado), medida protetiva vencendo e **contato não seguro**. É o caso principal: a Casa da Mulher recebe sem pedir que ela reconte. CPF `529.982.247-25`. |
| **Bianca Rodrigues Lima**, 19 | **Gestante**, ameaçada com faca, **aceita abrigamento**. Encaminhada hoje, urgente. Testa o cartão "Sobre ela" e o alerta de abrigamento. |
| **Antônia Rodrigues Silva**, 57 | **Não autorizou** o compartilhamento. A Casa da Mulher recebe só a ficha de passagem e precisa registrar a autorização quando ela chegar. Autor: o filho. |
| **Rafaela Ferreira** (nome civil Rafael), 28 | Mulher trans: **nome social** em todo o sistema. Atendimentos **restritos à Psicologia**. Encaminhada ao CREAS. |
| **Fernanda Oliveira Costa**, 27 | **Nunca ligar** para ela. A UBS fez um **acesso emergencial** ontem, que a gestão da Casa da Mulher precisa revisar. CPF `111.444.777-35`. |
| **Josefa Barbosa de Lima**, 67 | Pessoa idosa **com deficiência**, violência patrimonial pelo neto. Identificada pela UBS e acompanhada pelo CREAS. |

## 4. Roteiros por pessoa

Marque cada item e anote o que estranhou (veja a seção 5).

### Recepção — `sueli@acolhe.demo`
- [ ] No início, aparecem Maria, Bianca e Antônia chegando, com urgência.
- [ ] Abra a Maria: dá para ver risco, medidas protetivas, como falar com ela e o aviso de "ligar pode colocá-la em risco" — **mas não o relato**.
- [ ] Na aba Encaminhamentos, confirme a chegada da Maria ("Ela chegou — confirmar recebimento").

### Psicóloga — `carla@acolhe.demo`
- [ ] Abra a **Bianca** pelo painel. Leia o "Antes de atender, leia" e o cartão "Sobre ela" (gestante, mora com o autor, depende dele). Dá para atendê-la sem pedir que repita a história?
- [ ] Registre um atendimento psicológico com sigilo **"Só Psicologia"**.
- [ ] Reaplique a avaliação de risco (aba Risco): o formulário já vem preenchido com as respostas da Secretaria.
- [ ] Encaminhe a Bianca para o CREAS com uma ficha de passagem.
- [ ] Busque **Antônia**: ela não autorizou o compartilhamento. Use "Ela está aqui e autorizou" e veja o prontuário abrir.
- [ ] "Novo acolhimento": digite **Maria Aparecida dos Santos**, nascida em **14/03/1991** — o sistema avisa que ela já existe.
- [ ] Faça um acolhimento novo inventado, preenchendo a parte de **Família e situação socioeconômica**.

### Advogada — `joana@acolhe.demo`
- [ ] Abra a **Rafaela**, aba Atendimentos: os registros da Psicologia aparecem só como "Conteúdo restrito à Psicologia".
- [ ] Abra a **Maria** e registre uma orientação jurídica.

### Gestora da Casa da Mulher — `ana@acolhe.demo`
- [ ] **Auditoria**: revise o acesso emergencial da UBS ao prontuário da Fernanda ("Acesso justificado" ou "Revogar").
- [ ] **Relatórios**: confira a parte de perfil (idade, filhos, filhos menores, gestantes, deficiência, trabalho, renda, moradia) e a de violência (vínculo com o autor, arma de fogo, fatores de risco).
- [ ] Alterne entre "Rede toda" e "CMI", e entre 3, 6 e 12 meses.
- [ ] **Exportar CSV** e abrir no Excel. **Imprimir** o relatório.
- [ ] Num prontuário, abra a aba **Acessos**: quem viu, quando e de qual unidade.
- [ ] **Equipe**: crie uma conta para uma técnica e veja a senha temporária.

### Secretaria — `marta@acolhe.demo` e `renata@acolhe.demo`
- [ ] Ao entrar, o sistema aparece com a **identidade da Secretaria** (azul, logo da Secretaria com a Prefeitura). Quem é da Casa da Mulher continua vendo a identidade da Casa.
- [ ] Saia e veja que a tela de login agora mostra a marca da Secretaria (ela lembra o último acesso neste navegador).
- [ ] Marta: em Encaminhamentos → Enviados, veja que a Casa da Mulher confirmou a chegada da Maria (depois do passo da recepção).
- [ ] Renata: na Auditoria, há um acesso emergencial do CREAS para revisar.

### Outras unidades — `paula@acolhe.demo`, `luiza@acolhe.demo`
- [ ] Paula (CREAS): veja a Josefa e a Rafaela, recebidas por encaminhamento.
- [ ] Luiza (UBS): tente abrir a Maria — sem vínculo, o sistema pede autorização ou acesso emergencial.

### TI — `ti@acolhe.demo`
- [ ] Gerencia contas e unidades, mas **não consegue abrir nenhum prontuário**.

### Segurança (qualquer conta)
- [ ] Fique 13 minutos sem mexer: aparece o aviso; aos 15, o sistema sai sozinho.
- [ ] Erre a senha 5 vezes: a conta fica bloqueada por 15 minutos.
- [ ] Imprima um prontuário: só saem registros compartilhados com a rede, e a impressão fica na auditoria.

## 5. O que queremos saber da equipe

1. Os campos do cadastro e do relato são os que vocês usam hoje? **Falta algum? Sobra algum?**
2. A linguagem das telas é a de vocês? Algum termo soa estranho ou técnico demais?
3. O fluxo de **autorização** dela para compartilhar é viável no dia a dia? Quem costuma pedir?
4. Quem de cada unidade deve ver o quê? A divisão recepção / equipe técnica / gestão / sigilo da Psicologia está certa?
5. Os **relatórios** respondem às perguntas que a Secretaria e o Fundo Social fazem? Que outro recorte vocês precisam?
6. As perguntas do **FONAR** conferem com o formulário oficial que vocês aplicam?
7. Quais unidades da rede de Itaquaquecetuba devem entrar no sistema, e quem será a gestora de cada uma?
