/**
 * Base FICTÍCIA para validação do sistema — nenhum nome, endereço ou história é real.
 *
 *   npm run db:semear          (APAGA todo o conteúdo do banco antes!)
 *
 * Cria a rede (5 unidades, 10 contas), 6 casos-roteiro com histórias detalhadas
 * (ver docs/ROTEIRO-DE-VALIDACAO.md) e ~150 casos gerados com perfis coerentes,
 * espalhados pelos últimos 12 meses, para os relatórios terem volume.
 *
 * Em produção (NODE_ENV=production) só roda com MODO_VALIDACAO=true.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { cifrar, indiceCego } from "@/lib/cripto";
import { avaliarFonar, type Respostas } from "@/lib/fonar";
import { normalizarBusca, hojeISO } from "@/lib/texto";
import type { NivelRisco, TIPOS_ATENDIMENTO } from "@/lib/dominio";
import type { PerfilMulher } from "@/lib/relatorios";
import { gerarCasos, type SiglaUnidade } from "./gerador-casos";

if (process.env.NODE_ENV === "production" && process.env.MODO_VALIDACAO !== "true") {
  console.error("Recusado: este script APAGA o banco e cria dados fictícios.");
  console.error("Só use num ambiente de validação, com MODO_VALIDACAO=true. Nunca no sistema em uso.");
  process.exit(1);
}

const SENHA_DEMO = "acolhe-demo-2026";
const QUANTIDADE = Math.min(Math.max(Number(process.env.QTD_CASOS ?? 150) || 150, 10), 2000);
const DIA = 86400000;
const atras = (dias: number, horas = 0) => new Date(Date.now() - dias * DIA - horas * 3600000);
const depois = (d: Date, dias: number, horas = 0) => new Date(d.getTime() + dias * DIA + horas * 3600000);
const noPassado = (d: Date) => (d.getTime() > Date.now() - 60000 ? new Date(Date.now() - 60000) : d);
const dataISO = (d: Date) => hojeISO(d);

const PERFIL_VAZIO: PerfilMulher = {
  quantidadeFilhos: null,
  filhosMenores: null,
  gestante: null,
  pessoaComDeficiencia: null,
  estadoCivil: null,
  situacaoTrabalho: null,
  rendaFamiliar: null,
  recebeBeneficio: null,
  situacaoMoradia: null,
  dependenciaFinanceira: null,
};

async function main() {
  console.log("Limpando banco…");
  await db.execute(sql`truncate auditoria, sessoes, acessos, relatos, atendimentos, avaliacoes_risco, encaminhamentos,
    medidas_protetivas, autores, prontuarios, usuarios, unidades restart identity cascade`);

  // ---------------------------------------------------------------- unidades
  const [cmi, smm, creas, ubs, ddm] = await db
    .insert(schema.unidades)
    .values([
      { nome: "Casa da Mulher Itaquaquecetuba", sigla: "CMI", tipo: "CASA_DA_MULHER", cor: "#862C72", telefone: "(11) 0000-0001" },
      { nome: "Secretaria Municipal da Mulher", sigla: "SMM", tipo: "SECRETARIA", cor: "#db2777", telefone: "(11) 0000-0002" },
      { nome: "CREAS Itaquaquecetuba", sigla: "CREAS", tipo: "CREAS", cor: "#0891b2", telefone: "(11) 0000-0003" },
      { nome: "UBS Central", sigla: "UBS", tipo: "SAUDE", cor: "#059669", telefone: "(11) 0000-0004" },
      { nome: "Delegacia de Defesa da Mulher", sigla: "DDM", tipo: "DELEGACIA", cor: "#2563eb", telefone: "(11) 0000-0005" },
    ])
    .returning();
  const unidadePorSigla: Record<SiglaUnidade, typeof cmi> = { CMI: cmi, SMM: smm, CREAS: creas, UBS: ubs, DDM: ddm };

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
  const [, ana, carla, joana, sueli, marta, renata, paula, luiza, beatriz] = await db
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
  type Profissional = typeof ana;

  /** Quem atende cada tipo de atendimento em cada unidade. */
  const equipe: Record<SiglaUnidade, Partial<Record<(typeof TIPOS_ATENDIMENTO)[number], Profissional>> & { padrao: Profissional }> = {
    CMI: { padrao: carla, ACOLHIMENTO: ana, SOCIAL: ana, CONTATO_TELEFONICO: ana, JURIDICO: joana, PSICOLOGICO: carla, RETORNO: carla, GRUPO: carla },
    SMM: { padrao: marta, PSICOLOGICO: renata },
    CREAS: { padrao: paula },
    UBS: { padrao: luiza },
    DDM: { padrao: beatriz },
  };
  const profissional = (sigla: SiglaUnidade, tipo?: (typeof TIPOS_ATENDIMENTO)[number]) => (tipo && equipe[sigla][tipo]) || equipe[sigla].padrao;

  // ---------------------------------------------------------------- utilitários de gravação
  type NovoProntuario = {
    nomeCivil: string;
    nomeSocial?: string | null;
    nascimento: string | null;
    cpf?: string;
    origem: typeof cmi;
    autor: Profissional;
    quando: Date;
    autorizou: boolean;
    bairro: string | null;
    racaCor: string | null;
    escolaridade?: string | null;
    telefone?: string;
    contatoSeguro?: boolean;
    orientacoes?: string;
    identidadeGenero?: string | null;
    perfil?: Partial<PerfilMulher>;
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
        identidadeGenero: d.identidadeGenero === undefined ? "Mulher cisgênero" : d.identidadeGenero,
        escolaridade: d.escolaridade ?? null,
        telefoneCifrado: cifrar(d.telefone ?? `(11) 9${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")}-0000`),
        contatoSeguro: d.contatoSeguro ?? true,
        podeDeixarRecado: d.contatoSeguro !== false,
        orientacoesContatoCifrado: d.orientacoes ? cifrar(d.orientacoes) : null,
        enderecoCifrado: cifrar("Endereço fictício de validação, 123"),
        bairro: d.bairro,
        ...PERFIL_VAZIO,
        ...d.perfil,
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

  async function relato(p: { id: string }, autor: Profissional, quando: Date, tipos: string[], texto: string, sigilo: "REDE" | "UNIDADE" | "ESPECIALIDADE" = "REDE", dataFato?: string) {
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

  async function atendimento(p: { id: string }, prof: Profissional, quando: Date, tipo: (typeof TIPOS_ATENDIMENTO)[number], texto: string, sigilo: "REDE" | "UNIDADE" | "ESPECIALIDADE" = "REDE") {
    const q = noPassado(quando);
    await db.insert(schema.atendimentos).values({
      prontuarioId: p.id,
      unidadeId: prof.unidadeId,
      profissionalId: prof.id,
      especialidade: prof.especialidade,
      tipo,
      realizadoEm: q,
      textoCifrado: cifrar(texto),
      // Sigilo por especialidade só faz sentido para quem tem especialidade.
      sigilo: sigilo === "ESPECIALIDADE" && !prof.especialidade ? "REDE" : sigilo,
      criadoEm: q,
    });
  }

  const NIVEIS: Exclude<NivelRisco, "NAO_AVALIADO">[] = ["BAIXO", "MEDIO", "ELEVADO"];
  async function fonar(p: { id: string }, prof: Profissional, quando: Date, respostas: Respostas, classificacao?: Exclude<NivelRisco, "NAO_AVALIADO">, justificativa?: string) {
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

  async function autor(p: { id: string }, por: Profissional, quando: Date, nome: string, vinculo: (typeof schema.VINCULOS_AUTOR)[number], acessoArma: "SIM" | "NAO" | "NAO_SABE", observacoes?: string) {
    await db.insert(schema.autores).values({
      prontuarioId: p.id,
      nomeCifrado: cifrar(nome),
      vinculo,
      acessoArma,
      observacoesCifrado: observacoes ? cifrar(observacoes) : null,
      unidadeId: por.unidadeId,
      criadoPorId: por.id,
      criadoEm: quando,
    });
  }

  async function encaminhar(o: {
    p: { id: string; compartilhamentoAutorizado: boolean };
    por: Profissional;
    destino: typeof cmi | null;
    destinoExterno?: string | null;
    quando: Date;
    urgencia: "ROTINA" | "PRIORITARIA" | "URGENTE";
    motivo: string;
    status?: "ENVIADO" | "RECEBIDO" | "CONCLUIDO" | "RECUSADO";
    recebidoPor?: Profissional;
    resposta?: string | null;
  }) {
    const status = o.destino ? (o.status ?? "ENVIADO") : "CONCLUIDO";
    const recebidoEm = status === "RECEBIDO" || status === "CONCLUIDO" ? noPassado(depois(o.quando, 0, 2 + Math.random() * 40)) : null;
    const concluidoEm =
      status === "CONCLUIDO" ? noPassado(o.destino ? depois(recebidoEm!, 5) : o.quando) : status === "RECUSADO" ? noPassado(depois(o.quando, 1)) : null;
    await db.insert(schema.encaminhamentos).values({
      prontuarioId: o.p.id,
      origemUnidadeId: o.por.unidadeId,
      destinoUnidadeId: o.destino?.id ?? null,
      destinoExterno: o.destino ? null : (o.destinoExterno ?? "Serviço externo"),
      criadoPorId: o.por.id,
      motivoCifrado: cifrar(o.motivo),
      urgencia: o.urgencia,
      status,
      recebidoPorId: recebidoEm ? (o.recebidoPor?.id ?? null) : null,
      recebidoEm,
      concluidoEm,
      respostaCifrado: o.resposta ? cifrar(o.resposta) : null,
      criadoEm: o.quando,
      atualizadoEm: concluidoEm ?? recebidoEm ?? o.quando,
    });
    if (o.destino && o.p.compartilhamentoAutorizado) {
      await db.insert(schema.acessos).values({ prontuarioId: o.p.id, unidadeId: o.destino.id, origem: "ENCAMINHAMENTO", concedidoPorId: o.por.id, criadoEm: o.quando });
    }
    return recebidoEm;
  }

  async function medida(p: { id: string }, por: Profissional, o: { status: (typeof schema.STATUS_MEDIDA)[number]; medidas: string[]; solicitadaEm: Date; validadeDias?: number; observacoes?: string; processo?: string }) {
    const decidida = o.status === "SOLICITADA" ? null : noPassado(depois(o.solicitadaEm, 2));
    await db.insert(schema.medidasProtetivas).values({
      prontuarioId: p.id,
      medidas: o.medidas,
      observacoesCifrado: o.observacoes ? cifrar(o.observacoes) : null,
      status: o.status,
      solicitadaEm: dataISO(o.solicitadaEm),
      decididaEm: decidida ? dataISO(decidida) : null,
      validaAte: decidida && ["DEFERIDA", "ENCERRADA", "REVOGADA"].includes(o.status) ? dataISO(depois(decidida, o.validadeDias ?? 120)) : null,
      numeroProcesso: o.processo ?? `${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}-00.2026.8.26.0278`,
      unidadeId: por.unidadeId,
      registradoPorId: por.id,
      criadoEm: o.solicitadaEm,
      atualizadoEm: decidida ?? o.solicitadaEm,
    });
  }

  // ======================================================================
  // Casos-roteiro (histórias detalhadas, usadas no roteiro de validação)
  // ======================================================================

  // 1) Maria — atendida na Secretaria, chega hoje à Casa da Mulher
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
    escolaridade: "Médio completo",
    telefone: "(11) 90000-0001",
    contatoSeguro: false,
    orientacoes: "O ex-companheiro ainda tem a senha do celular dela. Ligar só para a irmã, Cláudia (11) 90000-0099, e se apresentar como \"da escola das crianças\".",
    perfil: {
      quantidadeFilhos: 2,
      filhosMenores: 2,
      gestante: false,
      pessoaComDeficiencia: false,
      estadoCivil: "Separada / divorciada",
      situacaoTrabalho: "Trabalho informal / autônoma",
      rendaFamiliar: "Até 1 salário mínimo",
      recebeBeneficio: true,
      situacaoMoradia: "Alugada",
      dependenciaFinanceira: false,
    },
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
  await autor(maria, marta, atras(12), "Carlos Eduardo (ex-companheiro)", "EX_CONJUGE_COMPANHEIRO", "NAO_SABE", "Trabalha como motorista de aplicativo. Carro prata. Costuma aparecer no fim da tarde.");
  await db.insert(schema.medidasProtetivas).values({ prontuarioId: maria.id, medidas: ["Proibição de aproximação", "Proibição de contato por qualquer meio", "Afastamento do agressor do lar"], observacoesCifrado: cifrar("Distância mínima de 300 metros."), status: "DEFERIDA", solicitadaEm: dataISO(atras(11)), decididaEm: dataISO(atras(9)), validaAte: dataISO(new Date(Date.now() + 18 * DIA)), numeroProcesso: "0000000-00.2026.8.26.0278", unidadeId: smm.id, registradoPorId: marta.id, criadoEm: atras(9) });
  await encaminhar({
    p: maria,
    por: marta,
    destino: cmi,
    quando: atras(0, 3),
    urgencia: "URGENTE",
    motivo: "Maria vai até a Casa da Mulher hoje à tarde, depois de deixar as crianças na escola. Precisa de acompanhamento psicológico (muito ansiosa, sem dormir) e orientação jurídica sobre guarda e pensão. A MPU foi deferida. Ela já contou tudo aqui na Secretaria — por favor, não peçam para ela repetir a história; o relato e o FONAR estão no prontuário. Prefere ser atendida por mulher.",
  });

  // 2) Rafaela — mulher trans, nome social, registros restritos à Psicologia
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
    escolaridade: "Superior incompleto",
    telefone: "(11) 90000-0002",
    perfil: {
      quantidadeFilhos: 0,
      filhosMenores: 0,
      gestante: false,
      pessoaComDeficiencia: false,
      estadoCivil: "Solteira",
      situacaoTrabalho: "Trabalho com carteira assinada",
      rendaFamiliar: "De 1 a 2 salários mínimos",
      recebeBeneficio: false,
      situacaoMoradia: "Cedida / de favor",
      dependenciaFinanceira: false,
    },
  });
  await relato(rafaela, carla, atras(64), ["PSICOLOGICA", "MORAL"], "Rafaela relata que o companheiro, com quem morava há dois anos, a humilha constantemente, a chama pelo nome de registro na frente de amigos e familiares e ameaça \"contar para todo mundo\" no trabalho. Diz que ele controla o celular dela e já a trancou em casa duas vezes.", "REDE");
  await atendimento(rafaela, carla, atras(64), "PSICOLOGICO", "Primeira escuta psicológica. Sinais de sofrimento intenso, isolamento social. Combinado acompanhamento semanal.", "ESPECIALIDADE");
  await atendimento(rafaela, carla, atras(57), "PSICOLOGICO", "Segue em acompanhamento. Relata episódios de pânico. Trabalhado plano de segurança.", "ESPECIALIDADE");
  await atendimento(rafaela, joana, atras(50), "JURIDICO", "Orientação sobre aplicação da Lei Maria da Penha a mulheres trans (entendimento do STJ) e sobre retificação de nome e gênero no cartório, sem necessidade de cirurgia ou laudo.");
  await atendimento(rafaela, carla, atras(43), "PSICOLOGICO", "Rafaela decidiu sair de casa. Está temporariamente na casa de uma amiga. Melhora do sono.", "ESPECIALIDADE");
  await fonar(rafaela, carla, atras(64), { q1: ["outra"], q2: ["nenhuma"], q3: ["empurroes"], q4: ["nao"], q5: ["nao"], q6: ["sim"], q7: ["proibiu_familia", "mensagens", "outros_controle"], q8: ["nao"], q9: ["nao"], q10: ["nao"], q12: ["nao"], q14: ["nao"], q15: ["nao"], q16: ["sim"], q17: ["nao"], q22: ["nao"], q23: ["preta"], q24: ["nao"], q25: ["cedida"], q26: ["nao"], q27: ["nao"] });
  await autor(rafaela, carla, atras(64), "Thiago (ex-companheiro)", "EX_CONJUGE_COMPANHEIRO", "NAO");
  await encaminhar({ p: rafaela, por: carla, destino: creas, quando: atras(45), urgencia: "PRIORITARIA", motivo: "Rafaela precisa de apoio para inclusão em programa de aluguel social — saiu de casa e está na casa de uma amiga. Acompanhamento psicológico segue na CMI.", status: "RECEBIDO", recebidoPor: paula });
  await atendimento(rafaela, paula, atras(44), "SOCIAL", "Atendimento social. Iniciado o cadastro para aluguel social; orientada sobre documentos.");

  // 3) Antônia — não autorizou compartilhar o prontuário
  const antonia = await prontuario({
    nomeCivil: "Antônia Rodrigues Silva",
    nascimento: "1968-11-20",
    origem: ubs,
    autor: luiza,
    quando: atras(5),
    autorizou: false,
    bairro: "Parque Piratininga",
    racaCor: "Branca",
    escolaridade: "Fundamental incompleto",
    perfil: {
      quantidadeFilhos: 3,
      filhosMenores: 0,
      gestante: false,
      pessoaComDeficiencia: false,
      estadoCivil: "Viúva",
      situacaoTrabalho: "Aposentada / pensionista",
      rendaFamiliar: "Até 1 salário mínimo",
      recebeBeneficio: false,
      situacaoMoradia: "Mora com o autor da violência",
      dependenciaFinanceira: false,
    },
  });
  await relato(antonia, luiza, atras(5), ["FISICA"], "Atendida na UBS com hematomas nos braços. Inicialmente disse que caiu; depois contou que o filho adulto, usuário de drogas, a empurrou durante uma discussão por dinheiro. Pediu que nada fosse contado à família.", "REDE");
  await atendimento(antonia, luiza, atras(5), "SAUDE", "Curativo, notificação compulsória (SINAN) realizada. Oferecido encaminhamento à Casa da Mulher; ela aceitou ir, mas não autorizou o compartilhamento do prontuário.");
  await autor(antonia, luiza, atras(5), "Leandro (filho)", "FILHO", "NAO", "Mora com ela. Uso abusivo de drogas.");
  await encaminhar({ p: antonia, por: luiza, destino: cmi, quando: atras(1, 5), urgencia: "PRIORITARIA", motivo: "Senhora de 57 anos, agredida pelo filho adulto com quem mora. Aceitou ir à Casa da Mulher para orientação. Pediu sigilo absoluto em relação à família. Ainda não autorizou o compartilhamento do histórico — por favor, pergunte a ela quando chegar." });

  // 4) Fernanda — contato não seguro e acesso emergencial da UBS
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
    escolaridade: "Superior incompleto",
    telefone: "(11) 90000-0004",
    contatoSeguro: false,
    orientacoes: "Nunca ligar. Ela entra em contato pelo telefone da unidade.",
    perfil: {
      quantidadeFilhos: 0,
      filhosMenores: 0,
      gestante: false,
      pessoaComDeficiencia: false,
      estadoCivil: "Solteira",
      situacaoTrabalho: "Estudante",
      rendaFamiliar: "De 1 a 2 salários mínimos",
      recebeBeneficio: false,
      situacaoMoradia: "Alugada",
      dependenciaFinanceira: false,
    },
  });
  await relato(fernanda, carla, atras(120), ["PSICOLOGICA", "SEXUAL"], "Fernanda relata violência sexual por parte do namorado, com quem não mora. Ele a ameaça divulgar fotos íntimas se ela terminar o relacionamento.", "REDE");
  await atendimento(fernanda, joana, atras(115), "JURIDICO", "Orientada sobre o crime de divulgação de cena de sexo sem consentimento (art. 218-C do CP) e sobre a possibilidade de MPU. Optou por registrar ocorrência.");
  await fonar(fernanda, carla, atras(118), { q1: ["outra"], q2: ["nenhuma"], q3: ["nenhuma"], q4: ["nao"], q5: ["sim"], q6: ["sim"], q7: ["mensagens"], q8: ["nao"], q9: ["nao"], q10: ["nao"], q12: ["nao"], q14: ["nao"], q15: ["nao"], q16: ["nao"], q17: ["nao"], q22: ["nao"], q23: ["parda"], q25: ["alugada"], q26: ["nao"], q27: ["nao"] }, "MEDIO");
  await autor(fernanda, carla, atras(120), "Diego (namorado)", "NAMORADO", "NAO_SABE");
  await encaminhar({ p: fernanda, por: joana, destino: ddm, quando: atras(110), urgencia: "ROTINA", motivo: "Acompanhar registro de boletim de ocorrência (art. 218-C). Ela prefere ser atendida por policial mulher.", status: "CONCLUIDO", recebidoPor: beatriz, resposta: "BO registrado e pedido de MPU encaminhado ao Judiciário." });
  await db.insert(schema.acessos).values({ prontuarioId: fernanda.id, unidadeId: ubs.id, origem: "EMERGENCIAL", justificativa: "Chegou ao pronto-atendimento em crise, com ideação suicida. Precisávamos do histórico e da avaliação de risco para definir a conduta.", concedidoPorId: luiza.id, criadoEm: atras(0, 20), expiraEm: new Date(Date.now() + 4 * 3600000) });
  await db.insert(schema.auditoria).values({ acao: "ACESSO_EMERGENCIAL", usuarioId: luiza.id, unidadeId: ubs.id, prontuarioId: fernanda.id, detalhes: { tipo: "EMERGENCIAL", justificativa: "Chegou ao pronto-atendimento em crise, com ideação suicida." }, criadoEm: atras(0, 20) });

  // 5) Bianca — 19 anos, gestante, aceita abrigamento: urgência de hoje
  const bianca = await prontuario({
    nomeCivil: "Bianca Rodrigues Lima",
    nascimento: dataISO(atras(19 * 365 + 120)),
    origem: smm,
    autor: marta,
    quando: atras(0, 6),
    autorizou: true,
    bairro: "Jardim Caiubi",
    racaCor: "Preta",
    escolaridade: "Médio incompleto",
    telefone: "(11) 90000-0005",
    perfil: {
      quantidadeFilhos: 0,
      filhosMenores: 0,
      gestante: true,
      pessoaComDeficiencia: false,
      estadoCivil: "Casada / união estável",
      situacaoTrabalho: "Desempregada",
      rendaFamiliar: "Sem renda",
      recebeBeneficio: false,
      situacaoMoradia: "Mora com o autor da violência",
      dependenciaFinanceira: true,
    },
  });
  await relato(bianca, marta, atras(0, 5), ["FISICA", "PSICOLOGICA"], "Bianca está grávida de 6 meses. Conta que o companheiro, com quem mora desde que engravidou, a empurrou contra a mesa ontem à noite e a ameaçou com uma faca dizendo que \"se ela contar para alguém, vai ser pior\". Não tem renda nem família por perto; a mãe mora na Bahia. Disse que não pode voltar para casa hoje.", "REDE", dataISO(atras(1)));
  await atendimento(bianca, marta, atras(0, 5), "ACOLHIMENTO", "Acolhimento. Gestante de 6 meses, sem rede de apoio no município. Aceita abrigamento — acionada a Casa da Mulher para avaliação de vaga ainda hoje. Orientada sobre MPU.");
  await fonar(bianca, marta, atras(0, 5), { q1: ["faca"], q2: ["nenhuma"], q3: ["empurroes"], q4: ["atendimento"], q5: ["nao"], q6: ["sim"], q7: ["proibiu_familia", "proibiu_trabalho", "outros_controle"], q8: ["nao"], q9: ["sim"], q10: ["alcool"], q11: ["nao_sei"], q12: ["nao"], q13: ["sim"], q14: ["nao"], q15: ["nao"], q16: ["nao"], q17: ["nao"], q20: ["sim"], q22: ["nao"], q23: ["preta"], q24: ["sim"], q25: ["cedida"], q26: ["sim"], q27: ["sim"] }, "ELEVADO", "Gestante, ameaça com faca, escalada recente, dependência financeira e sem rede de apoio. Aceita abrigamento.");
  await autor(bianca, marta, atras(0, 5), "Wellington (companheiro)", "CONJUGE_COMPANHEIRO", "NAO", "24 anos. Trabalha à noite em um depósito.");
  await medida(bianca, marta, { status: "SOLICITADA", medidas: ["Afastamento do agressor do lar", "Proibição de aproximação"], solicitadaEm: atras(0, 4) });
  await encaminhar({ p: bianca, por: marta, destino: cmi, quando: atras(0, 1), urgencia: "URGENTE", motivo: "URGENTE — Bianca (19 anos, gestante de 6 meses) não pode voltar para casa hoje e aceita abrigamento. Precisa de avaliação de vaga em casa-abrigo e acompanhamento pré-natal. Relato e FONAR já registrados; ela está muito assustada, por favor não peçam que repita o que aconteceu." });

  // 6) Josefa — 67 anos, pessoa com deficiência, violência patrimonial pelo neto
  const josefa = await prontuario({
    nomeCivil: "Josefa Barbosa de Lima",
    nascimento: "1959-04-08",
    origem: ubs,
    autor: luiza,
    quando: atras(21),
    autorizou: true,
    bairro: "Pequeno Coração",
    racaCor: "Parda",
    escolaridade: "Sem escolaridade",
    telefone: "(11) 90000-0006",
    perfil: {
      quantidadeFilhos: 4,
      filhosMenores: 0,
      gestante: false,
      pessoaComDeficiencia: true,
      estadoCivil: "Viúva",
      situacaoTrabalho: "Aposentada / pensionista",
      rendaFamiliar: "Até 1 salário mínimo",
      recebeBeneficio: true,
      situacaoMoradia: "Mora com o autor da violência",
      dependenciaFinanceira: false,
    },
  });
  await relato(josefa, luiza, atras(21), ["PATRIMONIAL", "PSICOLOGICA"], "Identificado em visita domiciliar: dona Josefa usa cadeira de rodas desde um AVC. O neto, que mora com ela, fica com o cartão da aposentadoria, compra pouca comida e a deixa sozinha por dias. Ela diz que tem vergonha de reclamar com os filhos.", "REDE");
  await atendimento(josefa, luiza, atras(21), "SAUDE", "Visita domiciliar. Desidratação leve; orientações de cuidado. Notificação de violência contra pessoa idosa realizada.");
  await fonar(josefa, luiza, atras(21), { q1: ["nao"], q2: ["nenhuma"], q3: ["nenhuma"], q4: ["nao"], q5: ["nao"], q6: ["sim"], q7: ["dinheiro", "proibiu_familia"], q8: ["nao"], q9: ["sim"], q10: ["drogas"], q12: ["nao"], q13: ["sim"], q14: ["nao"], q15: ["nao"], q16: ["nao"], q17: ["outro_relacionamento"], q17_1: ["18_mais"], q17_2: ["nao"], q22: ["sim"], q23: ["parda"], q25: ["propria"], q26: ["nao"], q27: ["nao"] });
  await autor(josefa, luiza, atras(21), "Kauã (neto)", "OUTRO_FAMILIAR", "NAO", "22 anos. Mora com ela.");
  const recebida = await encaminhar({ p: josefa, por: luiza, destino: creas, quando: atras(20), urgencia: "PRIORITARIA", motivo: "Pessoa idosa com deficiência, violência patrimonial pelo neto. Precisa de acompanhamento do CREAS e de articulação com os filhos para o cuidado. Avaliar curatela/gestão do benefício.", status: "RECEBIDO", recebidoPor: paula });
  if (recebida) await atendimento(josefa, paula, depois(recebida, 2), "VISITA", "Visita domiciliar com a equipe do CREAS. Contato feito com a filha mais velha, que vai acompanhar o uso do cartão.");

  // ======================================================================
  // Casos gerados (volume para relatórios e buscas)
  // ======================================================================
  const casos = gerarCasos(QUANTIDADE, new Date());
  let emergenciais = 0;
  for (const c of casos) {
    const origem = unidadePorSigla[c.origem];
    const abertoPor = profissional(c.origem, "ACOLHIMENTO");
    const quando = atras(c.diasAtras, Math.floor(Math.random() * 7));
    const p = await prontuario({
      nomeCivil: c.nomeCivil,
      nomeSocial: c.nomeSocial,
      identidadeGenero: c.identidadeGenero,
      nascimento: c.dataNascimento,
      origem,
      autor: abertoPor,
      quando,
      autorizou: c.autorizou,
      bairro: c.bairro,
      racaCor: c.racaCor,
      escolaridade: c.escolaridade,
      contatoSeguro: c.contatoSeguro,
      orientacoes: c.contatoSeguro ? undefined : "Não ligar. Ela entra em contato com a unidade.",
      perfil: c.perfil,
    });
    await relato(p, abertoPor, quando, c.tipos, c.relato);
    if (c.autor) await autor(p, abertoPor, quando, c.autor.nome, c.autor.vinculo, c.autor.acessoArma);
    for (const a of c.atendimentos) {
      await atendimento(p, profissional(c.origem, a.tipo), depois(quando, a.diasDepois, 1), a.tipo, a.texto, a.sigilo);
    }
    if (c.fonar) {
      const sugestao = avaliarFonar(c.fonar.respostas).sugestao;
      const i = Math.min(2, Math.max(0, NIVEIS.indexOf(sugestao) + c.fonar.ajuste));
      await fonar(
        p,
        abertoPor,
        quando,
        c.fonar.respostas,
        NIVEIS[i],
        c.fonar.ajuste ? "Classificação ajustada pela profissional a partir da escuta e da percepção de risco dela." : undefined,
      );
    }
    if (c.medida) {
      await medida(p, abertoPor, { status: c.medida.status, medidas: c.medida.medidas, solicitadaEm: noPassado(depois(quando, c.medida.diasDepois)), validadeDias: c.medida.validadeDias });
    }
    if (c.encaminhamento) {
      const e = c.encaminhamento;
      const destino = e.destino === "EXTERNO" ? null : unidadePorSigla[e.destino];
      const enviadoEm = noPassado(depois(quando, e.diasDepois, 2));
      const recebidoEm = await encaminhar({
        p,
        por: abertoPor,
        destino,
        destinoExterno: e.destinoExterno,
        quando: enviadoEm,
        urgencia: e.urgencia,
        motivo: e.motivo,
        status: e.status,
        recebidoPor: destino ? profissional(e.destino as SiglaUnidade) : undefined,
        resposta: e.resposta,
      });
      if (destino && recebidoEm) {
        await atendimento(p, profissional(e.destino as SiglaUnidade, "ACOLHIMENTO"), depois(recebidoEm, 0, 1), "ACOLHIMENTO", "Recebida pela unidade. Histórico lido antes do atendimento; não foi preciso pedir que ela recontasse.");
      }
    }
    // Alguns acessos emergenciais antigos, já revisados, para a trilha de auditoria
    if (emergenciais < 3 && c.origem === "SMM" && c.diasAtras > 30) {
      emergenciais++;
      const em = depois(quando, 3);
      await db.insert(schema.acessos).values({ prontuarioId: p.id, unidadeId: creas.id, origem: "EMERGENCIAL", justificativa: "Visita domiciliar com sinais de agressão recente; precisávamos da avaliação de risco.", concedidoPorId: paula.id, criadoEm: em, expiraEm: depois(em, 1), revisadoPorId: emergenciais < 3 ? renata.id : null, revisadoEm: emergenciais < 3 ? depois(em, 2) : null });
      await db.insert(schema.auditoria).values({ acao: "ACESSO_EMERGENCIAL", usuarioId: paula.id, unidadeId: creas.id, prontuarioId: p.id, detalhes: { tipo: "EMERGENCIAL" }, criadoEm: em });
    }
    if (c.arquivar) await db.update(schema.prontuarios).set({ status: "ARQUIVADO" }).where(sql`id = ${p.id}`);
  }

  // Logins de hoje, para a trilha de auditoria
  for (const u of [ana, carla, joana, sueli, marta, renata, paula, luiza]) {
    await db.insert(schema.auditoria).values({ acao: "LOGIN", usuarioId: u.id, unidadeId: u.unidadeId, criadoEm: atras(0, 2 + Math.random() * 5) });
  }

  console.log(`
✓ Base de validação criada — TUDO FICTÍCIO (${casos.length + 6} mulheres, 5 unidades).

  Senha de todas as contas: ${SENHA_DEMO}

  Casa da Mulher (CMI)
    ana@acolhe.demo      gestora
    carla@acolhe.demo    psicóloga        ← comece por aqui: Maria e Bianca estão chegando
    joana@acolhe.demo    advogada
    sueli@acolhe.demo    recepção
  Secretaria da Mulher (SMM)
    marta@acolhe.demo    assistente social
    renata@acolhe.demo   gestora (psicóloga)
  Outras unidades
    paula@acolhe.demo    CREAS
    luiza@acolhe.demo    UBS
    beatriz@acolhe.demo  DDM
  Administração (TI — não lê prontuários)
    ti@acolhe.demo

  Roteiro de validação: docs/ROTEIRO-DE-VALIDACAO.md
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
