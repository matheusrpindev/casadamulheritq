/**
 * Dados de DEMONSTRAÇÃO — todos os nomes e histórias são fictícios.
 * Uso: npm run db:semear      (apaga TODO o conteúdo do banco antes!)
 *
 * Nunca rode em produção: o script se recusa se NODE_ENV=production.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { cifrar, indiceCego } from "@/lib/cripto";
import { avaliarFonar, type Respostas } from "@/lib/fonar";
import { normalizarBusca, hojeISO } from "@/lib/texto";
import type { NivelRisco, TIPOS_ATENDIMENTO } from "@/lib/dominio";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--sei-o-que-estou-fazendo")) {
  console.error("Recusado: este script apaga o banco e cria dados fictícios. Não use em produção.");
  process.exit(1);
}

const SENHA_DEMO = "acolhe-demo-2026";
const DIA = 86400000;
const atras = (dias: number, horas = 0) => new Date(Date.now() - dias * DIA - horas * 3600000);
const dataISO = (d: Date) => hojeISO(d);

// Gerador pseudoaleatório determinístico (mesmos dados a cada execução)
let semente = 20261105;
const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)];

async function main() {
  console.log("Limpando banco…");
  await db.execute(sql`truncate auditoria, sessoes, acessos, relatos, atendimentos, avaliacoes_risco, encaminhamentos,
    medidas_protetivas, autores, prontuarios, usuarios, unidades restart identity cascade`);

  // ---------------------------------------------------------------- unidades
  const [cmi, smm, creas, ubs, ddm] = await db
    .insert(schema.unidades)
    .values([
      { nome: "Casa da Mulher em Itaquaquecetuba", sigla: "CMI", tipo: "CASA_DA_MULHER", cor: "#84296F", telefone: "(11) 0000-0001" },
      { nome: "Secretaria Municipal da Mulher", sigla: "SMM", tipo: "SECRETARIA", cor: "#db2777", telefone: "(11) 0000-0002" },
      { nome: "CREAS Itaquaquecetuba", sigla: "CREAS", tipo: "CREAS", cor: "#0891b2", telefone: "(11) 0000-0003" },
      { nome: "UBS Central", sigla: "UBS", tipo: "SAUDE", cor: "#059669", telefone: "(11) 0000-0004" },
      { nome: "Delegacia de Defesa da Mulher", sigla: "DDM", tipo: "DELEGACIA", cor: "#2563eb", telefone: "(11) 0000-0005" },
    ])
    .returning();

  // ---------------------------------------------------------------- equipe
  const hash = await bcrypt.hash(SENHA_DEMO, 10);
  const pessoa = (nome: string, email: string, papel: schema.Usuario["papel"], unidadeId: string, especialidade: schema.Usuario["especialidade"] = null, registroProfissional: string | null = null) => ({
    nome,
    email,
    papel,
    unidadeId,
    especialidade,
    registroProfissional,
    senhaHash: hash,
    precisaTrocarSenha: false,
    ultimoAcessoEm: atras(0, 2),
  });
  const [admin, ana, carla, joana, sueli, marta, renata, paula, luiza, beatriz] = await db
    .insert(schema.usuarios)
    .values([
      pessoa("Equipe de TI da Prefeitura", "ti@acolhe.demo", "ADMIN", smm.id),
      pessoa("Ana Beatriz Moura", "ana@acolhe.demo", "GESTORA", cmi.id, "SERVICO_SOCIAL", "CRESS 00000"),
      pessoa("Carla Nunes", "carla@acolhe.demo", "TECNICA", cmi.id, "PSICOLOGIA", "CRP 06/000000"),
      pessoa("Joana Prado", "joana@acolhe.demo", "TECNICA", cmi.id, "JURIDICO", "OAB/SP 000000"),
      pessoa("Sueli Ramos", "sueli@acolhe.demo", "RECEPCAO", cmi.id),
      pessoa("Marta Lima", "marta@acolhe.demo", "TECNICA", smm.id, "SERVICO_SOCIAL", "CRESS 00001"),
      pessoa("Renata Alves", "renata@acolhe.demo", "GESTORA", smm.id, "PSICOLOGIA", "CRP 06/000001"),
      pessoa("Paula Teixeira", "paula@acolhe.demo", "TECNICA", creas.id, "SERVICO_SOCIAL", "CRESS 00002"),
      pessoa("Luiza Campos", "luiza@acolhe.demo", "TECNICA", ubs.id, "SAUDE", "COREN 000000"),
      pessoa("Beatriz Souza", "beatriz@acolhe.demo", "TECNICA", ddm.id, "OUTRA"),
    ])
    .returning();

  type NovoProntuario = {
    nomeCivil: string;
    nomeSocial?: string;
    nascimento: string;
    cpf?: string;
    origem: typeof cmi;
    autor: typeof ana;
    quando: Date;
    autorizou: boolean;
    bairro: string;
    racaCor: string;
    telefone?: string;
    contatoSeguro?: boolean;
    orientacoes?: string;
    identidadeGenero?: string;
  };

  async function prontuario(d: NovoProntuario) {
    const [p] = await db
      .insert(schema.prontuarios)
      .values({
        nomeCivil: d.nomeCivil,
        nomeSocial: d.nomeSocial ?? null,
        nomeBusca: normalizarBusca(`${d.nomeCivil} ${d.nomeSocial ?? ""}`),
        dataNascimento: d.nascimento,
        cpfCifrado: d.cpf ? cifrar(d.cpf) : null,
        cpfIndice: d.cpf ? indiceCego(d.cpf) : null,
        racaCor: d.racaCor,
        identidadeGenero: d.identidadeGenero ?? "Mulher cisgênero",
        telefoneCifrado: d.telefone ? cifrar(d.telefone) : null,
        contatoSeguro: d.contatoSeguro ?? true,
        podeDeixarRecado: d.contatoSeguro !== false,
        orientacoesContatoCifrado: d.orientacoes ? cifrar(d.orientacoes) : null,
        enderecoCifrado: cifrar("Endereço fictício de demonstração, 123"),
        bairro: d.bairro,
        compartilhamentoAutorizado: d.autorizou,
        consentimentoRegistradoEm: d.quando,
        consentimentoRegistradoPorId: d.autor.id,
        unidadeOrigemId: d.origem.id,
        criadoPorId: d.autor.id,
        criadoEm: d.quando,
        atualizadoEm: d.quando,
      })
      .returning();
    await db.insert(schema.acessos).values({ prontuarioId: p.id, unidadeId: d.origem.id, origem: "ORIGEM", concedidoPorId: d.autor.id, criadoEm: d.quando });
    await db.insert(schema.auditoria).values({ acao: "PRONTUARIO_CRIADO", usuarioId: d.autor.id, unidadeId: d.origem.id, prontuarioId: p.id, criadoEm: d.quando });
    return p;
  }

  async function relato(p: { id: string }, autor: typeof ana, quando: Date, tipos: string[], texto: string, sigilo: "REDE" | "UNIDADE" | "ESPECIALIDADE" = "REDE", dataFato?: string) {
    await db.insert(schema.relatos).values({
      prontuarioId: p.id,
      unidadeId: autor.unidadeId,
      autorId: autor.id,
      especialidade: autor.especialidade,
      tiposViolencia: tipos,
      textoCifrado: cifrar(texto),
      sigilo,
      dataFato: dataFato ?? dataISO(new Date(quando.getTime() - 2 * DIA)),
      criadoEm: quando,
    });
  }

  async function atendimento(p: { id: string }, prof: typeof ana, quando: Date, tipo: (typeof TIPOS_ATENDIMENTO)[number], texto: string, sigilo: "REDE" | "UNIDADE" | "ESPECIALIDADE" = "REDE") {
    await db.insert(schema.atendimentos).values({
      prontuarioId: p.id,
      unidadeId: prof.unidadeId,
      profissionalId: prof.id,
      especialidade: prof.especialidade,
      tipo,
      realizadoEm: quando,
      textoCifrado: cifrar(texto),
      sigilo,
      criadoEm: quando,
    });
  }

  async function fonar(p: { id: string }, prof: typeof ana, quando: Date, respostas: Respostas, classificacao?: Exclude<NivelRisco, "NAO_AVALIADO">, justificativa?: string) {
    const r = avaliarFonar(respostas);
    const final = classificacao ?? r.sugestao;
    await db.insert(schema.avaliacoesRisco).values({
      prontuarioId: p.id,
      unidadeId: prof.unidadeId,
      profissionalId: prof.id,
      respostasCifrado: cifrar(JSON.stringify(respostas)),
      fatoresGraves: r.fatoresGraves.length,
      sugestao: r.sugestao,
      classificacao: final,
      justificativaCifrado: justificativa ? cifrar(justificativa) : null,
      criadoEm: quando,
    });
    await db.update(schema.prontuarios).set({ nivelRisco: final, riscoAtualizadoEm: quando }).where(sql`id = ${p.id}`);
  }

  async function encaminhar(
    p: { id: string; compartilhamentoAutorizado: boolean },
    por: typeof ana,
    destino: typeof cmi,
    quando: Date,
    urgencia: "ROTINA" | "PRIORITARIA" | "URGENTE",
    motivo: string,
    status: "ENVIADO" | "RECEBIDO" | "CONCLUIDO" = "ENVIADO",
    recebidoPor?: typeof ana,
    resposta?: string,
  ) {
    const recebidoEm = status !== "ENVIADO" ? new Date(quando.getTime() + (2 + aleatorio() * 30) * 3600000) : null;
    await db.insert(schema.encaminhamentos).values({
      prontuarioId: p.id,
      origemUnidadeId: por.unidadeId,
      destinoUnidadeId: destino.id,
      criadoPorId: por.id,
      motivoCifrado: cifrar(motivo),
      urgencia,
      status,
      recebidoPorId: recebidoPor?.id ?? null,
      recebidoEm,
      concluidoEm: status === "CONCLUIDO" && recebidoEm ? new Date(recebidoEm.getTime() + 5 * DIA) : null,
      respostaCifrado: resposta ? cifrar(resposta) : null,
      criadoEm: quando,
      atualizadoEm: quando,
    });
    if (p.compartilhamentoAutorizado) {
      await db.insert(schema.acessos).values({ prontuarioId: p.id, unidadeId: destino.id, origem: "ENCAMINHAMENTO", concedidoPorId: por.id, criadoEm: quando });
    }
  }

  // ------------------------------------------------- 1) Maria — a história principal
  // Atendida na Secretaria; encaminhada com urgência à Casa da Mulher.
  const maria = await prontuario({
    nomeCivil: "Maria Aparecida dos Santos",
    nascimento: "1991-03-14",
    cpf: "52998224725",
    origem: smm,
    autor: marta,
    quando: atras(12, 3),
    autorizou: true,
    bairro: "Vila Virgínia",
    racaCor: "Parda",
    telefone: "(11) 90000-0001",
    contatoSeguro: false,
    orientacoes: "O ex-companheiro ainda tem a senha do celular dela. Ligar só para a irmã, Cláudia (11) 90000-0099, e se apresentar como \"da escola das crianças\".",
  });
  await relato(
    maria,
    marta,
    atras(12, 2),
    ["FISICA", "PSICOLOGICA", "PATRIMONIAL"],
    "Maria procurou a Secretaria por indicação de uma vizinha. Conta que está separada do ex-companheiro há três semanas, depois de 11 anos juntos, e que desde então ele aparece na porta da casa dela quase todos os dias.\n\nNo último sábado ele entrou sem ser convidado, quebrou o celular dela e a segurou pelo pescoço contra a parede da cozinha, na frente dos dois filhos (8 e 5 anos). Disse que \"se ela não voltar, ninguém mais vai ter ela\". Ela conseguiu sair quando a filha mais velha começou a gritar.\n\nRelata que ele sempre controlou o dinheiro da casa e ficou com o cartão do Bolsa Família dela. Tem medo de registrar boletim de ocorrência porque ele disse que \"sabe onde a mãe dela mora\".\n\nEstá trabalhando como diarista, sem registro. Os filhos estão matriculados na EMEF do bairro.",
    "REDE",
    dataISO(atras(14)),
  );
  await atendimento(maria, marta, atras(12, 1), "SOCIAL", "Acolhimento e escuta. Orientada sobre medida protetiva de urgência e sobre o direito ao atendimento na Casa da Mulher (psicológico e jurídico). Feito contato com a Defensoria para pedido de MPU. Orientada a retirar novo cartão do benefício no CRAS com acompanhamento.");
  await fonar(
    maria,
    marta,
    atras(12, 1),
    {
      q1: ["outra"], q2: ["enforcamento"], q3: ["empurroes", "tapas"], q4: ["nao"], q5: ["nao"], q6: ["sim"],
      q7: ["nao_sera_de_ninguem", "perseguiu", "dinheiro"], q8: ["nao"], q9: ["sim"], q10: ["alcool"], q11: ["nao_sei"],
      q12: ["nao"], q13: ["sim"], q14: ["nao_sei"], q15: ["nao"], q16: ["sim"], q17: ["com_agressor"], q17_1: ["0_11"],
      q17_2: ["nao"], q18: ["sim"], q19: ["sim"], q20: ["nao"], q21: ["nao_se_aplica"], q22: ["nao"], q23: ["parda"],
      q24: ["nao"], q25: ["alugada"], q26: ["nao"], q27: ["nao"],
    },
    "ELEVADO",
    "Estrangulamento recente, separação há 3 semanas, perseguição diária e ameaça de morte (\"ninguém mais vai ter ela\"). Ela mesma avalia o risco como 9/10. Encaminhada com urgência à CMI para acompanhamento psicológico e jurídico.",
  );
  await db.insert(schema.autores).values({ prontuarioId: maria.id, nomeCifrado: cifrar("Carlos Eduardo (ex-companheiro)"), vinculo: "EX_CONJUGE_COMPANHEIRO", acessoArma: "NAO_SABE", observacoesCifrado: cifrar("Trabalha como motorista de aplicativo. Carro prata. Costuma aparecer no fim da tarde."), unidadeId: smm.id, criadoPorId: marta.id, criadoEm: atras(12) });
  await db.insert(schema.medidasProtetivas).values({ prontuarioId: maria.id, medidas: ["Proibição de aproximação", "Proibição de contato por qualquer meio", "Afastamento do agressor do lar"], observacoesCifrado: cifrar("Distância mínima de 300 metros."), status: "DEFERIDA", solicitadaEm: dataISO(atras(11)), decididaEm: dataISO(atras(9)), validaAte: dataISO(new Date(Date.now() + 18 * DIA)), numeroProcesso: "0000000-00.2026.8.26.0000", unidadeId: smm.id, registradoPorId: marta.id, criadoEm: atras(9) });
  await encaminhar(
    { ...maria, compartilhamentoAutorizado: true },
    marta,
    cmi,
    atras(0, 3),
    "URGENTE",
    "Maria vai até a Casa da Mulher hoje à tarde, depois de deixar as crianças na escola. Precisa de acompanhamento psicológico (muito ansiosa, sem dormir) e orientação jurídica sobre guarda e pensão. A MPU foi deferida. Ela já contou tudo aqui na Secretaria — por favor, não peçam para ela repetir a história; o relato e o FONAR estão no prontuário. Prefere ser atendida por mulher.",
  );

  // ------------------------------------------------- 2) Rafaela — nome social, sigilo da psicologia
  const rafaela = await prontuario({
    nomeCivil: "Rafael Ferreira Lima",
    nomeSocial: "Rafaela Ferreira",
    identidadeGenero: "Mulher transgênero",
    nascimento: "1998-07-02",
    origem: cmi,
    autor: carla,
    quando: atras(64),
    autorizou: true,
    bairro: "Jardim Amanda",
    racaCor: "Preta",
    telefone: "(11) 90000-0002",
  });
  await relato(rafaela, carla, atras(64), ["PSICOLOGICA", "MORAL"], "Rafaela relata que o companheiro, com quem mora há dois anos, a humilha constantemente, a chama pelo nome de registro na frente de amigos e familiares e ameaça \"contar para todo mundo\" no trabalho. Diz que ele controla o celular dela e já a trancou em casa duas vezes.", "REDE");
  await atendimento(rafaela, carla, atras(64), "PSICOLOGICO", "Primeira escuta psicológica. Sinais de sofrimento intenso, isolamento social. Combinado acompanhamento semanal.", "ESPECIALIDADE");
  await atendimento(rafaela, carla, atras(57), "PSICOLOGICO", "Segue em acompanhamento. Relata episódios de pânico. Trabalhado plano de segurança.", "ESPECIALIDADE");
  await atendimento(rafaela, joana, atras(50), "JURIDICO", "Orientação sobre aplicação da Lei Maria da Penha a mulheres trans (entendimento do STJ) e sobre retificação de nome e gênero no cartório, sem necessidade de cirurgia ou laudo.");
  await atendimento(rafaela, carla, atras(43), "PSICOLOGICO", "Rafaela decidiu sair de casa. Está temporariamente na casa de uma amiga. Melhora do sono.", "ESPECIALIDADE");
  await fonar(rafaela, carla, atras(64), { q1: ["outra"], q2: ["nenhuma"], q3: ["empurroes"], q4: ["nao"], q5: ["nao"], q6: ["sim"], q7: ["proibiu_familia", "mensagens", "outros_controle"], q8: ["nao"], q9: ["nao"], q10: ["nao"], q12: ["nao"], q14: ["nao"], q15: ["nao"], q16: ["nao"], q17: ["nao"], q22: ["nao"], q23: ["preta"], q24: ["nao"], q25: ["cedida"], q26: ["sim"], q27: ["nao"] });
  await encaminhar({ ...rafaela, compartilhamentoAutorizado: true }, carla, creas, atras(45), "PRIORITARIA", "Rafaela precisa de apoio para inclusão em programa de transferência de renda e aluguel social — saiu de casa e está na casa de uma amiga. Acompanhamento psicológico segue na CMI.", "RECEBIDO", paula);

  // ------------------------------------------------- 3) Antônia — não autorizou compartilhar
  const antonia = await prontuario({
    nomeCivil: "Antônia Rodrigues Silva",
    nascimento: "1968-11-20",
    origem: ubs,
    autor: luiza,
    quando: atras(5),
    autorizou: false,
    bairro: "Parque Piratininga",
    racaCor: "Branca",
  });
  await relato(antonia, luiza, atras(5), ["FISICA"], "Atendida na UBS com hematomas nos braços. Inicialmente disse que caiu; depois contou que o filho adulto, usuário de drogas, a empurrou durante uma discussão por dinheiro. Pediu que nada fosse contado à família.", "REDE");
  await atendimento(antonia, luiza, atras(5), "SAUDE", "Curativo, notificação compulsória (SINAN) realizada. Oferecido encaminhamento à Casa da Mulher; ela aceitou ir, mas não autorizou o compartilhamento do prontuário.");
  await encaminhar({ ...antonia, compartilhamentoAutorizado: false }, luiza, cmi, atras(1, 5), "PRIORITARIA", "Senhora de 57 anos, agredida pelo filho adulto. Aceitou ir à Casa da Mulher para orientação. Pediu sigilo absoluto em relação à família. Ainda não autorizou o compartilhamento do histórico — por favor, pergunte a ela quando chegar.");

  // ------------------------------------------------- 4) Fernanda — contato não seguro, acesso emergencial
  const fernanda = await prontuario({
    nomeCivil: "Fernanda Oliveira Costa",
    nascimento: "1999-01-30",
    cpf: "11144477735",
    origem: cmi,
    autor: carla,
    quando: atras(120),
    autorizou: true,
    bairro: "Centro",
    racaCor: "Parda",
    telefone: "(11) 90000-0004",
    contatoSeguro: false,
    orientacoes: "Nunca ligar. Ela entra em contato pelo telefone da unidade.",
  });
  await relato(fernanda, carla, atras(120), ["PSICOLOGICA", "SEXUAL"], "Fernanda relata violência sexual por parte do namorado, com quem não mora. Ele a ameaça divulgar fotos íntimas se ela terminar o relacionamento.", "REDE");
  await atendimento(fernanda, joana, atras(115), "JURIDICO", "Orientada sobre os crimes de divulgação de cena de sexo sem consentimento (art. 218-C do CP) e sobre a possibilidade de MPU. Optou por registrar ocorrência.");
  await fonar(fernanda, carla, atras(118), { q1: ["outra"], q2: ["nenhuma"], q3: ["nenhuma"], q4: ["nao"], q5: ["sim"], q6: ["sim"], q7: ["mensagens"], q8: ["nao"], q9: ["nao"], q10: ["nao"], q12: ["nao"], q14: ["nao"], q15: ["nao"], q16: ["nao"], q17: ["nao"], q23: ["parda"], q25: ["alugada"], q26: ["nao"], q27: ["nao"] }, "MEDIO");
  await encaminhar({ ...fernanda, compartilhamentoAutorizado: true }, joana, ddm, atras(110), "ROTINA", "Acompanhar registro de boletim de ocorrência (art. 218-C). Ela prefere ser atendida por policial mulher.", "CONCLUIDO", beatriz, "BO registrado e pedido de MPU encaminhado ao Judiciário.");
  // Acesso emergencial da UBS (a revisar pela gestão da CMI)
  await db.insert(schema.acessos).values({ prontuarioId: fernanda.id, unidadeId: ubs.id, origem: "EMERGENCIAL", justificativa: "Chegou ao pronto-atendimento em crise, com ideação suicida. Precisávamos do histórico e da avaliação de risco para definir a conduta.", concedidoPorId: luiza.id, criadoEm: atras(0, 20), expiraEm: new Date(Date.now() + 4 * 3600000) });
  await db.insert(schema.auditoria).values({ acao: "ACESSO_EMERGENCIAL", usuarioId: luiza.id, unidadeId: ubs.id, prontuarioId: fernanda.id, detalhes: { tipo: "EMERGENCIAL", justificativa: "Chegou ao pronto-atendimento em crise, com ideação suicida." }, criadoEm: atras(0, 20) });

  // ------------------------------------------------- Volume para os indicadores (fictício)
  const nomes = ["Ana", "Bruna", "Camila", "Daniela", "Eliane", "Francisca", "Gabriela", "Helena", "Ivone", "Jéssica", "Kelly", "Larissa", "Márcia", "Natália", "Patrícia", "Quitéria", "Rosana", "Sandra", "Tatiane", "Vanessa", "Yasmin", "Zuleide"];
  const sobrenomes = ["Almeida", "Barbosa", "Cardoso", "Dias", "Espíndola", "Freitas", "Gomes", "Henrique", "Moreira", "Nascimento", "Pereira", "Queiroz", "Ribeiro", "Souza", "Torres", "Vieira"];
  const bairros = ["Centro", "Vila Virgínia", "Jardim Amanda", "Parque Piratininga", "Vila Zeferina", "Jardim Caiubi", "Pequeno Coração", "Jardim Odete", "Vila Monte Belo", "Jardim Nova Itaquá"];
  const racas = ["Parda", "Parda", "Preta", "Branca", "Branca", "Preta", "Parda", "Amarela"];
  const origens = [cmi, cmi, cmi, smm, smm, creas, ubs];
  const tecnicaDe = new Map([[cmi.id, [carla, joana, ana]], [smm.id, [marta, renata]], [creas.id, [paula]], [ubs.id, [luiza]], [ddm.id, [beatriz]]]);
  const tiposViol = ["FISICA", "PSICOLOGICA", "SEXUAL", "PATRIMONIAL", "MORAL"];
  const tiposAt = ["ACOLHIMENTO", "PSICOLOGICO", "SOCIAL", "JURIDICO", "RETORNO", "CONTATO_TELEFONICO", "GRUPO"] as const;
  const niveis: Exclude<NivelRisco, "NAO_AVALIADO">[] = ["BAIXO", "BAIXO", "MEDIO", "MEDIO", "MEDIO", "ELEVADO"];

  for (let i = 0; i < 46; i++) {
    const origem = escolher(origens);
    const equipe = tecnicaDe.get(origem.id)!;
    const autor = escolher(equipe);
    const dias = Math.floor(aleatorio() * 350) + 3;
    const quando = atras(dias, Math.floor(aleatorio() * 8));
    const ano = 1965 + Math.floor(aleatorio() * 40);
    const p = await prontuario({
      nomeCivil: (() => {
        const s1 = escolher(sobrenomes);
        const s2 = escolher(sobrenomes.filter((s) => s !== s1));
        return `${escolher(nomes)} ${s1} ${s2}`;
      })(),
      nascimento: `${ano}-${String(1 + Math.floor(aleatorio() * 12)).padStart(2, "0")}-${String(1 + Math.floor(aleatorio() * 28)).padStart(2, "0")}`,
      origem,
      autor,
      quando,
      autorizou: aleatorio() > 0.2,
      bairro: escolher(bairros),
      racaCor: escolher(racas),
    });
    const tipos = tiposViol.filter(() => aleatorio() > 0.55);
    if (tipos.length === 0) tipos.push("PSICOLOGICA");
    await relato(p, autor, quando, tipos, "Relato fictício gerado para demonstração dos indicadores.");
    const nAt = 1 + Math.floor(aleatorio() * 5);
    for (let k = 0; k < nAt; k++) {
      const d = Math.max(0, dias - Math.floor(aleatorio() * Math.min(dias, 90)));
      await atendimento(p, escolher(equipe), atras(d, Math.floor(aleatorio() * 6)), escolher(tiposAt), "Atendimento fictício de demonstração.");
    }
    if (aleatorio() > 0.25) {
      const nivel = escolher(niveis);
      const respostas: Respostas = nivel === "ELEVADO" ? { q2: ["sufocamento"], q9: ["sim"], q16: ["sim"] } : nivel === "MEDIO" ? { q6: ["sim"], q9: ["sim"] } : { q6: ["nao"], q9: ["nao"] };
      await fonar(p, autor, quando, respostas, nivel);
    }
    if (aleatorio() > 0.55) {
      const destino = escolher([cmi, smm, creas, ubs, ddm].filter((u) => u.id !== origem.id));
      const status = dias > 20 ? escolher(["CONCLUIDO", "CONCLUIDO", "RECEBIDO"] as const) : escolher(["ENVIADO", "RECEBIDO"] as const);
      await encaminhar(
        { ...p, compartilhamentoAutorizado: p.compartilhamentoAutorizado },
        autor,
        destino,
        new Date(quando.getTime() + DIA),
        escolher(["ROTINA", "ROTINA", "PRIORITARIA", "URGENTE"] as const),
        "Encaminhamento fictício de demonstração.",
        status,
        status !== "ENVIADO" ? tecnicaDe.get(destino.id)![0] : undefined,
      );
    }
    if (dias > 200 && aleatorio() > 0.5) await db.update(schema.prontuarios).set({ status: "ARQUIVADO" }).where(sql`id = ${p.id}`);
  }

  // Alguns eventos de login para a trilha de auditoria
  for (const u of [ana, carla, joana, sueli, marta, renata, paula, luiza]) {
    await db.insert(schema.auditoria).values({ acao: "LOGIN", usuarioId: u.id, unidadeId: u.unidadeId, criadoEm: atras(0, 2 + aleatorio() * 5) });
  }
  void admin;

  console.log(`
✓ Dados de demonstração criados (tudo fictício).

  Senha de todas as contas: ${SENHA_DEMO}

  Casa da Mulher (CMI)
    ana@acolhe.demo      gestora
    carla@acolhe.demo    psicóloga        ← comece por aqui: a Maria está chegando da Secretaria
    joana@acolhe.demo    advogada
    sueli@acolhe.demo    recepção
  Secretaria da Mulher (SMM)
    marta@acolhe.demo    assistente social
    renata@acolhe.demo   gestora
  Outras unidades
    paula@acolhe.demo    CREAS
    luiza@acolhe.demo    UBS
    beatriz@acolhe.demo  DDM
  Administração (TI — não lê prontuários)
    ti@acolhe.demo
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
