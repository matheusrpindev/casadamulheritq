/**
 * Gerador de casos FICTÍCIOS para a base de validação.
 *
 * Determinístico (mesma semente = mesmos casos) e coerente: filhos menores nunca
 * passam do total, gestação só em idade fértil, autor "filho" só para mulheres mais
 * velhas, respostas do FONAR batem com o cadastro, renda acompanha o trabalho etc.
 * Testado em tests/gerador-casos.test.ts.
 *
 * Nenhum nome, endereço ou história corresponde a pessoa real.
 */
import type { Respostas } from "@/lib/fonar";
import type { TipoViolencia } from "@/lib/dominio";

export type SiglaUnidade = "CMI" | "SMDHC" | "CREAS" | "UBS" | "DDM";
export type Vinculo =
  | "CONJUGE_COMPANHEIRO"
  | "EX_CONJUGE_COMPANHEIRO"
  | "NAMORADO"
  | "EX_NAMORADO"
  | "PAI_PADRASTO"
  | "FILHO"
  | "IRMAO"
  | "OUTRO_FAMILIAR"
  | "CONHECIDO"
  | "DESCONHECIDO";
type TipoAtendimento = "ACOLHIMENTO" | "PSICOLOGICO" | "SOCIAL" | "JURIDICO" | "SAUDE" | "RETORNO" | "CONTATO_TELEFONICO" | "VISITA" | "GRUPO" | "OUTRO";

export type Caso = {
  nomeCivil: string;
  nomeSocial: string | null;
  identidadeGenero: string | null;
  diasAtras: number;
  idade: number | null;
  dataNascimento: string | null;
  racaCor: string | null;
  escolaridade: string | null;
  bairro: string | null;
  perfil: {
    quantidadeFilhos: number | null;
    filhosMenores: number | null;
    gestante: boolean | null;
    pessoaComDeficiencia: boolean | null;
    estadoCivil: string | null;
    situacaoTrabalho: string | null;
    rendaFamiliar: string | null;
    recebeBeneficio: boolean | null;
    situacaoMoradia: string | null;
    dependenciaFinanceira: boolean | null;
  };
  origem: SiglaUnidade;
  autorizou: boolean;
  contatoSeguro: boolean;
  autor: { nome: string; vinculo: Vinculo; acessoArma: "SIM" | "NAO" | "NAO_SABE" } | null;
  tipos: TipoViolencia[];
  relato: string;
  fonar: { respostas: Respostas; ajuste: -1 | 0 | 1 } | null;
  atendimentos: { tipo: TipoAtendimento; diasDepois: number; texto: string; sigilo: "REDE" | "ESPECIALIDADE" }[];
  encaminhamento: {
    destino: SiglaUnidade | "EXTERNO";
    destinoExterno: string | null;
    urgencia: "ROTINA" | "PRIORITARIA" | "URGENTE";
    status: "ENVIADO" | "RECEBIDO" | "CONCLUIDO" | "RECUSADO";
    diasDepois: number;
    motivo: string;
    resposta: string | null;
  } | null;
  medida: { status: "SOLICITADA" | "DEFERIDA" | "INDEFERIDA" | "REVOGADA" | "ENCERRADA"; medidas: string[]; diasDepois: number; validadeDias: number } | null;
  arquivar: boolean;
};

// ---------------------------------------------------------------------------
// Sorteio determinístico
// ---------------------------------------------------------------------------

function criarSorteio(semente: number) {
  let s = semente >>> 0;
  const aleatorio = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const chance = (p: number) => aleatorio() < p;
  const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)];
  const pesar = <T,>(opcoes: readonly (readonly [T, number])[]): T => {
    const total = opcoes.reduce((s, [, p]) => s + p, 0);
    let r = aleatorio() * total;
    for (const [v, p] of opcoes) if ((r -= p) < 0) return v;
    return opcoes[opcoes.length - 1][0];
  };
  const inteiro = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));
  return { aleatorio, chance, escolher, pesar, inteiro };
}

// ---------------------------------------------------------------------------
// Vocabulário (fictício)
// ---------------------------------------------------------------------------

const PRENOMES = [
  "Adriana", "Alessandra", "Aline", "Amanda", "Ana Paula", "Andreia", "Bárbara", "Beatriz", "Bruna", "Camila", "Carolina", "Cláudia",
  "Cristiane", "Daiane", "Daniela", "Débora", "Edilene", "Elaine", "Eliane", "Elisângela", "Fabiana", "Fernanda", "Francisca", "Gabriela",
  "Gisele", "Graziela", "Ingrid", "Isabela", "Ivone", "Jaqueline", "Jéssica", "Joana", "Josiane", "Juliana", "Karina", "Kátia", "Kelly",
  "Larissa", "Letícia", "Luana", "Lucimara", "Luciana", "Maiara", "Márcia", "Mariana", "Marlene", "Michele", "Mônica", "Natália", "Nayara",
  "Patrícia", "Priscila", "Raquel", "Regiane", "Rosana", "Rosângela", "Sabrina", "Samanta", "Sandra", "Silvana", "Simone", "Sônia",
  "Suelen", "Tainá", "Tatiane", "Thaís", "Vanessa", "Vera Lúcia", "Viviane", "Yasmin",
] as const;
const SOBRENOMES = [
  "Almeida", "Alves", "Andrade", "Araújo", "Barbosa", "Batista", "Bezerra", "Cardoso", "Carvalho", "Castro", "Costa", "Cruz", "Dias",
  "Duarte", "Farias", "Ferreira", "Fonseca", "Freitas", "Gomes", "Lima", "Lopes", "Machado", "Marques", "Martins", "Melo", "Mendes",
  "Moreira", "Moura", "Nascimento", "Nogueira", "Oliveira", "Pereira", "Pinto", "Queiroz", "Ramos", "Reis", "Ribeiro", "Rocha",
  "Santana", "Santos", "Silva", "Soares", "Sousa", "Teixeira", "Vieira",
] as const;
const PRENOMES_AUTOR = [
  "Anderson", "André", "Bruno", "Carlos", "Cláudio", "Cristiano", "Daniel", "Diego", "Edson", "Everton", "Fábio", "Felipe", "Gilberto",
  "Gustavo", "Jefferson", "João", "Jorge", "José", "Leandro", "Luciano", "Marcelo", "Marcos", "Mário", "Maurício", "Paulo", "Rafael",
  "Reginaldo", "Renato", "Ricardo", "Roberto", "Rodrigo", "Sérgio", "Thiago", "Valdir", "Wellington", "William",
] as const;
const NOMES_SOCIAIS = ["Alícia", "Bianca", "Duda", "Valentina", "Kim"] as const;

const BAIRROS = [
  ["Centro", 9], ["Vila Virgínia", 9], ["Jardim Amanda", 8], ["Parque Piratininga", 8], ["Vila Zeferina", 7], ["Jardim Caiubi", 7],
  ["Pequeno Coração", 6], ["Jardim Odete", 6], ["Vila Monte Belo", 5], ["Jardim Nova Itaquá", 5], ["Jardim Moraes", 4],
  ["Vila Japão", 4], ["Jardim Maragogipe", 3], ["Estância Paraíso", 2],
] as const;

const TEXTO_VINCULO: Record<Vinculo, string> = {
  CONJUGE_COMPANHEIRO: "o companheiro",
  EX_CONJUGE_COMPANHEIRO: "o ex-companheiro",
  NAMORADO: "o namorado",
  EX_NAMORADO: "o ex-namorado",
  PAI_PADRASTO: "o padrasto",
  FILHO: "o filho",
  IRMAO: "o irmão",
  OUTRO_FAMILIAR: "um familiar com quem divide a casa",
  CONHECIDO: "um conhecido do bairro",
  DESCONHECIDO: "um homem que ela não conhecia",
};

const FRASES: Record<TipoViolencia, readonly string[]> = {
  FISICA: [
    "a agrediu com empurrões e tapas durante uma discussão",
    "deu socos nos braços dela e a jogou contra a parede",
    "a puxou pelos cabelos na frente dos filhos",
    "a derrubou no chão e a chutou quando ela tentou sair de casa",
  ],
  PSICOLOGICA: [
    "a xinga e humilha com frequência, inclusive na frente de outras pessoas",
    "controla o celular dela e a proíbe de visitar a família",
    "ameaça tirar os filhos dela se ela procurar ajuda",
    "diz que ela não consegue viver sem ele e que ninguém vai acreditar nela",
  ],
  MORAL: ["espalhou para vizinhos e familiares que ela não presta", "a chama de louca nas redes sociais"],
  PATRIMONIAL: [
    "quebrou o celular dela e rasgou seus documentos",
    "fica com o cartão do benefício e não deixa que ela compre nada sem pedir",
    "vendeu móveis da casa sem avisar e não devolve as coisas dela",
  ],
  SEXUAL: ["a obrigou a manter relações sexuais contra a vontade", "a pressiona a ter relações e a ameaça quando ela recusa"],
  OUTRA: ["a persegue no caminho do trabalho"],
};

const CONTEXTOS = [
  "Procurou atendimento por indicação de uma vizinha.",
  "Diz que a situação piorou nos últimos meses.",
  "Tem medo de que ele descubra que ela buscou atendimento.",
  "Já tentou se separar outras vezes, mas voltou por falta de onde morar.",
  "Chegou acompanhada da irmã, que a incentivou a procurar ajuda.",
  "Conta que nunca tinha falado sobre isso com ninguém.",
] as const;

const TEXTO_ATENDIMENTO: Record<TipoAtendimento, readonly string[]> = {
  ACOLHIMENTO: ["Acolhimento inicial e escuta. Apresentados os serviços da rede.", "Acolhimento; explicado o funcionamento da Casa e combinado retorno."],
  PSICOLOGICO: [
    "Atendimento psicológico. Trabalhado o plano de segurança e os sinais de escalada.",
    "Segue em acompanhamento. Relata melhora do sono e mais confiança para tomar decisões.",
    "Atendimento psicológico. Muito ansiosa; trabalhadas estratégias de enfrentamento.",
  ],
  SOCIAL: [
    "Atendimento social. Orientada sobre Bolsa Família e aluguel social; encaminhada ao CRAS de referência.",
    "Levantamento da rede de apoio familiar. Combinada visita à mãe, que pode acolhê-la temporariamente.",
    "Orientada sobre vaga em creche para os filhos e sobre segunda via de documentos.",
  ],
  JURIDICO: [
    "Orientação jurídica sobre medida protetiva de urgência e sobre o direito à guarda.",
    "Orientada sobre pensão alimentícia e divórcio; agendado atendimento na Defensoria.",
  ],
  SAUDE: ["Atendimento de saúde; lesões leves. Notificação compulsória (SINAN) realizada.", "Acompanhamento em saúde mental na UBS."],
  RETORNO: ["Retorno. Situação estável; mantém medida protetiva.", "Retorno. Voltou a morar com a mãe; segue em acompanhamento."],
  CONTATO_TELEFONICO: ["Contato telefônico no horário combinado. Confirmou presença no próximo atendimento."],
  VISITA: ["Visita domiciliar com a equipe do CREAS. Condições da casa e rede de apoio avaliadas."],
  GRUPO: ["Participou do grupo de mulheres. Engajada, compartilhou a própria experiência."],
  OUTRO: ["Registro de ocorrência e orientação sobre o pedido de medida protetiva."],
};

const TIPOS_POR_UNIDADE: Record<SiglaUnidade, readonly TipoAtendimento[]> = {
  CMI: ["ACOLHIMENTO", "PSICOLOGICO", "PSICOLOGICO", "SOCIAL", "JURIDICO", "RETORNO", "GRUPO", "CONTATO_TELEFONICO"],
  SMDHC: ["ACOLHIMENTO", "SOCIAL", "SOCIAL", "CONTATO_TELEFONICO", "RETORNO"],
  CREAS: ["SOCIAL", "VISITA", "RETORNO"],
  UBS: ["SAUDE", "SAUDE", "RETORNO"],
  DDM: ["OUTRO"],
};

const MEDIDAS = [
  "Afastamento do agressor do lar",
  "Proibição de aproximação",
  "Proibição de contato por qualquer meio",
  "Proibição de frequentar determinados lugares",
  "Suspensão da posse ou restrição do porte de armas",
  "Prestação de alimentos provisórios",
] as const;

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

function dataISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function gerarCasos(quantidade: number, hoje: Date, semente = 20261105): Caso[] {
  const { aleatorio, chance, escolher, pesar, inteiro } = criarSorteio(semente);
  const nomesUsados = new Set<string>();
  const casos: Caso[] = [];

  for (let i = 0; i < quantidade; i++) {
    // Quando: mais casos recentes (a procura cresce ao longo do ano)
    const diasAtras = Math.max(1, Math.floor(360 * Math.pow(aleatorio(), 1.25)));
    const dataAcolhimento = new Date(hoje.getTime() - diasAtras * 86400000);

    // Nome único
    let nomeCivil = "";
    do {
      const s1 = escolher(SOBRENOMES);
      let s2 = escolher(SOBRENOMES);
      while (s2 === s1) s2 = escolher(SOBRENOMES);
      nomeCivil = `${escolher(PRENOMES)} ${s1} ${s2}`;
    } while (nomesUsados.has(nomeCivil));
    nomesUsados.add(nomeCivil);

    // Identidade de gênero (mulheres trans com nome social)
    const identidadeGenero = pesar([
      ["Mulher cisgênero", 93],
      ["Mulher transgênero", 2.5],
      ["Travesti", 0.8],
      ["Prefere não informar", 1],
      [null, 2.7],
    ] as const);
    const nomeSocial = identidadeGenero === "Mulher transgênero" || identidadeGenero === "Travesti" ? `${escolher(NOMES_SOCIAIS)} ${nomeCivil.split(" ").slice(-1)[0]}` : null;

    // Idade
    const faixa = pesar([
      [[16, 17], 1],
      [[18, 24], 15],
      [[25, 34], 32],
      [[35, 44], 27],
      [[45, 59], 18],
      [[60, 78], 5],
      [null, 2],
    ] as const);
    const idade = faixa ? inteiro(faixa[0], faixa[1]) : null;
    const dataNascimento =
      idade === null ? null : dataISO(new Date(dataAcolhimento.getTime() - (idade * 365.25 + inteiro(1, 360)) * 86400000));

    // Autor e vínculo (coerentes com a idade)
    let vinculo = pesar([
      ["CONJUGE_COMPANHEIRO", 34],
      ["EX_CONJUGE_COMPANHEIRO", 29],
      ["NAMORADO", 7],
      ["EX_NAMORADO", 9],
      ["FILHO", 5],
      ["PAI_PADRASTO", 4],
      ["IRMAO", 3],
      ["OUTRO_FAMILIAR", 4],
      ["CONHECIDO", 4],
      ["DESCONHECIDO", 1],
    ] as const) as Vinculo;
    if (vinculo === "FILHO" && (idade === null || idade < 42)) vinculo = "CONJUGE_COMPANHEIRO";
    if (vinculo === "PAI_PADRASTO" && idade !== null && idade > 32) vinculo = "IRMAO";
    const parceiro = ["CONJUGE_COMPANHEIRO", "EX_CONJUGE_COMPANHEIRO", "NAMORADO", "EX_NAMORADO"].includes(vinculo);
    const ex = vinculo === "EX_CONJUGE_COMPANHEIRO" || vinculo === "EX_NAMORADO";

    // Filhos
    const idadeRef = idade ?? 35;
    const pSemFilhos = idadeRef < 20 ? 0.7 : idadeRef < 25 ? 0.45 : idadeRef < 35 ? 0.22 : idadeRef < 45 ? 0.12 : 0.1;
    let quantidadeFilhos: number | null = chance(0.05) ? null : chance(pSemFilhos) ? 0 : pesar([[1, 30], [2, 35], [3, 20], [4, 10], [5, 5]] as const);
    if (vinculo === "FILHO" && (quantidadeFilhos === null || quantidadeFilhos === 0)) quantidadeFilhos = inteiro(1, 3);
    let filhosMenores: number | null = null;
    if (quantidadeFilhos !== null) {
      if (quantidadeFilhos === 0) filhosMenores = 0;
      else if (idadeRef < 36) filhosMenores = quantidadeFilhos;
      else if (idadeRef < 46) filhosMenores = inteiro(Math.max(0, quantidadeFilhos - 2), quantidadeFilhos);
      else if (idadeRef < 56) filhosMenores = chance(0.3) ? 1 : 0;
      else filhosMenores = 0;
      if (vinculo === "FILHO") filhosMenores = Math.min(filhosMenores, quantidadeFilhos - 1);
      if (quantidadeFilhos > 0 && chance(0.04)) filhosMenores = null;
    }

    const gestante = idade !== null && idade >= 16 && idade <= 42 ? (chance(0.05) ? null : chance(0.06)) : idade === null ? null : false;
    const pessoaComDeficiencia = chance(0.08) ? null : chance(0.07);

    // Situação socioeconômica
    const estadoCivil = chance(0.05)
      ? null
      : vinculo === "CONJUGE_COMPANHEIRO"
        ? "Casada / união estável"
        : vinculo === "EX_CONJUGE_COMPANHEIRO"
          ? pesar([["Separada / divorciada", 70], ["Solteira", 30]] as const)
          : idadeRef > 65
            ? pesar([["Viúva", 60], ["Separada / divorciada", 25], ["Casada / união estável", 15]] as const)
            : pesar([["Solteira", 70], ["Separada / divorciada", 20], ["Casada / união estável", 10]] as const);

    const situacaoTrabalho = chance(0.04)
      ? null
      : idadeRef >= 60
        ? pesar([["Aposentada / pensionista", 70], ["Do lar", 20], ["Trabalho informal / autônoma", 10]] as const)
        : idadeRef < 22
          ? pesar([["Estudante", 40], ["Desempregada", 25], ["Trabalho informal / autônoma", 20], ["Trabalho com carteira assinada", 15]] as const)
          : pesar([
              ["Trabalho com carteira assinada", 27],
              ["Trabalho informal / autônoma", 30],
              ["Desempregada", 21],
              ["Do lar", 18],
              ["Estudante", 4],
            ] as const);

    const rendaFamiliar = chance(0.06)
      ? null
      : situacaoTrabalho === "Trabalho com carteira assinada"
        ? pesar([["Até 1 salário mínimo", 15], ["De 1 a 2 salários mínimos", 50], ["De 2 a 3 salários mínimos", 25], ["Mais de 3 salários mínimos", 10]] as const)
        : situacaoTrabalho === "Trabalho informal / autônoma" || situacaoTrabalho === "Aposentada / pensionista"
          ? pesar([["Sem renda", 5], ["Até 1 salário mínimo", 55], ["De 1 a 2 salários mínimos", 35], ["De 2 a 3 salários mínimos", 5]] as const)
          : pesar([["Sem renda", 45], ["Até 1 salário mínimo", 40], ["De 1 a 2 salários mínimos", 15]] as const);
    const rendaBaixa = rendaFamiliar === "Sem renda" || rendaFamiliar === "Até 1 salário mínimo";
    const recebeBeneficio = chance(0.06) ? null : chance(rendaBaixa ? 0.6 : 0.12);

    const moraComAutor =
      vinculo === "CONJUGE_COMPANHEIRO" ? chance(0.6) : ["FILHO", "IRMAO", "OUTRO_FAMILIAR", "PAI_PADRASTO"].includes(vinculo) ? chance(0.45) : false;
    const situacaoMoradia = chance(0.05)
      ? null
      : moraComAutor
        ? "Mora com o autor da violência"
        : pesar([["Alugada", 36], ["Própria", 28], ["Cedida / de favor", 26], ["Acolhimento / casa-abrigo", 3], ["Situação de rua", 1]] as const);

    const semRendaPropria = situacaoTrabalho === "Do lar" || situacaoTrabalho === "Desempregada";
    const dependenciaFinanceira = chance(0.05) ? null : chance(parceiro && !ex && semRendaPropria ? 0.7 : parceiro && semRendaPropria ? 0.35 : 0.08);

    // Formas de violência
    const tipos: TipoViolencia[] = [];
    if (chance(0.88)) tipos.push("PSICOLOGICA");
    if (chance(0.55)) tipos.push("FISICA");
    if (chance(0.43)) tipos.push("MORAL");
    if (chance(dependenciaFinanceira ? 0.55 : 0.28)) tipos.push("PATRIMONIAL");
    if (parceiro && chance(0.2)) tipos.push("SEXUAL");
    if (tipos.length === 0) tipos.push("PSICOLOGICA");

    // Gravidade latente: orienta o FONAR e as medidas
    const g = Math.min(1, aleatorio() * 0.85 + (tipos.includes("FISICA") ? 0.15 : 0) + (ex ? 0.08 : 0));
    const acessoArma = pesar([["SIM", 7], ["NAO", 58], ["NAO_SABE", 35]] as const);

    const vinculoTexto = TEXTO_VINCULO[vinculo];
    const frases = tipos.map((t) => escolher(FRASES[t]));
    const relato = [
      `Relata que ${vinculoTexto} ${frases[0]}.`,
      ...frases.slice(1).map((f) => `Conta também que ele ${f}.`),
      escolher(CONTEXTOS),
      quantidadeFilhos ? `Tem ${quantidadeFilhos === 1 ? "um filho" : `${quantidadeFilhos} filhos`}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const racaCor = pesar([
      ["Parda", 40],
      ["Branca", 34],
      ["Preta", 18],
      ["Amarela", 1.5],
      ["Indígena", 0.5],
      ["Prefere não declarar", 2],
      [null, 4],
    ] as const);

    // FONAR (aplicado em ~78% dos casos)
    let fonar: Caso["fonar"] = null;
    if (chance(0.78)) {
      const fisica = tipos.includes("FISICA");
      const r: Respostas = {};
      r.q1 = [acessoArma !== "NAO" && (g > 0.95 || (acessoArma === "SIM" && g > 0.7)) ? "arma_fogo" : g > 0.82 ? "faca" : g > 0.35 ? "outra" : "nao"];
      const graves = fisica ? (["enforcamento", "sufocamento", "paulada", "queimadura", "facada"] as const).filter((_, k) => g > [0.72, 0.88, 0.84, 0.95, 0.97][k] && chance(0.7)) : [];
      r.q2 = graves.length ? [...graves] : ["nenhuma"];
      const leves = fisica ? (["socos", "chutes", "tapas", "empurroes", "puxoes_cabelo"] as const).filter(() => chance(0.5)) : [];
      r.q3 = leves.length ? [...leves] : fisica ? ["empurroes"] : ["nenhuma"];
      r.q4 = [fisica && g > 0.93 ? "internacao" : fisica && g > 0.7 ? "atendimento" : "nao"];
      r.q5 = [tipos.includes("SEXUAL") ? "sim" : "nao"];
      r.q6 = [g > 0.3 ? "sim" : "nao"];
      const comp = [
        g > 0.82 ? "nao_sera_de_ninguem" : null,
        ex && g > 0.55 ? "perseguiu" : null,
        g > 0.45 && chance(0.6) ? "proibiu_familia" : null,
        semRendaPropria && g > 0.4 && chance(0.5) ? "proibiu_trabalho" : null,
        g > 0.5 && chance(0.6) ? "mensagens" : null,
        tipos.includes("PATRIMONIAL") ? "dinheiro" : null,
        g > 0.4 && chance(0.5) ? "outros_controle" : null,
      ].filter((v): v is string => v !== null);
      r.q7 = comp.length ? comp : ["nenhum"];
      r.q8 = [g > 0.5 && chance(0.7) ? "sim" : "nao"];
      r.q9 = [g > 0.55 ? "sim" : "nao"];
      r.q10 = [pesar([["alcool", 40], ["drogas", 12], ["nao", 33], ["nao_sei", 15]] as const)];
      r.q11 = [pesar([["nao", 45], ["nao_sei", 50], ["sim_sem_medicacao", 5]] as const)];
      r.q12 = [g > 0.88 ? "sim" : chance(0.7) ? "nao" : "nao_sei"];
      r.q13 = [chance(0.4) ? "sim" : chance(0.8) ? "nao" : "nao_sei"];
      r.q14 = acessoArma === "SIM" ? (g > 0.8 ? ["ameacou", "facil_acesso"] : ["facil_acesso"]) : acessoArma === "NAO_SABE" ? ["nao_sei"] : ["nao"];
      r.q15 = [quantidadeFilhos && g > 0.75 && chance(0.6) ? "filhos" : "nao"];
      r.q16 = [ex ? (chance(0.6) ? "sim" : "nao") : chance(0.15) ? "sim" : "nao"];
      if (quantidadeFilhos === null || quantidadeFilhos === 0) r.q17 = ["nao"];
      else {
        r.q17 = [parceiro && chance(0.75) ? "com_agressor" : "outro_relacionamento"];
        const faixas: string[] = [];
        if (filhosMenores && idadeRef < 30) faixas.push("0_11");
        else if (filhosMenores) faixas.push(chance(0.5) ? "0_11" : "12_17");
        if (filhosMenores !== null && quantidadeFilhos > filhosMenores) faixas.push("18_mais");
        if (faixas.length) r.q17_1 = faixas;
        r.q17_2 = [chance(0.06) ? "sim" : "nao"];
        r.q18 = [r.q17[0] === "com_agressor" ? (chance(0.45) ? "sim" : "nao") : "sem_filhos_agressor"];
        r.q19 = [fisica && chance(0.6) ? "sim" : "nao"];
      }
      r.q20 = [gestante && chance(0.5) ? "sim" : "nao"];
      r.q22 = [pessoaComDeficiencia ? "sim" : "nao"];
      const raca: Record<string, string> = { Branca: "branca", Preta: "preta", Parda: "parda", Amarela: "amarela", Indígena: "indigena" };
      r.q23 = [raca[racaCor ?? ""] ?? "nao_declarada"];
      r.q24 = [chance(0.3) ? "sim" : chance(0.8) ? "nao" : "nao_sei"];
      const moradia: Record<string, string> = { Própria: "propria", Alugada: "alugada" };
      r.q25 = [moradia[situacaoMoradia ?? ""] ?? "cedida"];
      r.q26 = [dependenciaFinanceira ? "sim" : "nao"];
      r.q27 = [g > 0.85 && chance(0.4) ? "sim" : "nao"];
      fonar = { respostas: r, ajuste: chance(0.1) ? (chance(0.5) ? 1 : -1) : 0 };
    }


    const escolaridade = chance(0.06)
      ? null
      : pesar([
          ["Fundamental incompleto", 18],
          ["Fundamental completo", 12],
          ["Médio incompleto", 15],
          ["Médio completo", 35],
          ["Superior incompleto", 9],
          ["Superior completo", 9],
          ["Sem escolaridade", 2],
        ] as const);

    // Unidade de origem e atendimentos
    const origem = pesar([["CMI", 46], ["SMDHC", 24], ["CREAS", 12], ["UBS", 12], ["DDM", 6]] as const) as SiglaUnidade;
    const atendimentos: Caso["atendimentos"] = [];
    const nAt = inteiro(1, diasAtras > 60 ? 7 : diasAtras > 14 ? 4 : 2);
    for (let k = 0; k < nAt; k++) {
      const tipo = k === 0 && origem !== "UBS" && origem !== "DDM" ? "ACOLHIMENTO" : escolher(TIPOS_POR_UNIDADE[origem]);
      const diasDepois = k === 0 ? 0 : Math.min(diasAtras - 1, Math.floor(aleatorio() * Math.min(diasAtras, 120)));
      atendimentos.push({
        tipo,
        diasDepois: Math.max(0, diasDepois),
        texto: escolher(TEXTO_ATENDIMENTO[tipo]),
        sigilo: tipo === "PSICOLOGICO" && chance(0.7) ? "ESPECIALIDADE" : "REDE",
      });
    }

    // Encaminhamento (~50%)
    let encaminhamento: Caso["encaminhamento"] = null;
    if (chance(0.5) && diasAtras > 0) {
      const destino: SiglaUnidade | "EXTERNO" =
        origem === "CMI"
          ? pesar([["CREAS", 45], ["DDM", 25], ["EXTERNO", 20], ["UBS", 10]] as const)
          : origem === "SMDHC"
            ? pesar([["CMI", 65], ["CREAS", 20], ["DDM", 15]] as const)
            : origem === "DDM"
              ? pesar([["CMI", 80], ["CREAS", 20]] as const)
              : origem === "CREAS"
                ? pesar([["CMI", 70], ["DDM", 30]] as const)
                : pesar([["CMI", 75], ["CREAS", 25]] as const);
      const diasDepois = Math.min(diasAtras - 1 < 0 ? 0 : diasAtras - 1, inteiro(0, 10));
      const recente = diasAtras - diasDepois <= 6;
      const status =
        destino === "EXTERNO"
          ? "CONCLUIDO"
          : recente
            ? pesar([["ENVIADO", 60], ["RECEBIDO", 40]] as const)
            : pesar([["CONCLUIDO", 62], ["RECEBIDO", 33], ["RECUSADO", 5]] as const);
      const urgencia = g > 0.8 ? "URGENTE" : g > 0.55 ? "PRIORITARIA" : "ROTINA";
      const motivoPorDestino: Record<string, string> = {
        CMI: "Encaminhada para acompanhamento psicológico e orientação jurídica. O relato já está no prontuário — não é preciso pedir que ela conte de novo.",
        CREAS: "Precisa de acompanhamento socioassistencial (benefícios, moradia e rede de apoio). Já atendida e orientada sobre medida protetiva.",
        DDM: "Decidiu registrar ocorrência e pedir medida protetiva. Prefere ser atendida por policial mulher.",
        UBS: "Encaminhada para acompanhamento em saúde mental (ansiedade e insônia) e avaliação clínica.",
        EXTERNO: "Encaminhada à Defensoria Pública para divórcio, guarda e pensão alimentícia.",
      };
      encaminhamento = {
        destino,
        destinoExterno: destino === "EXTERNO" ? "Defensoria Pública — Núcleo de Defesa da Mulher" : null,
        urgencia,
        status,
        diasDepois,
        motivo: motivoPorDestino[destino],
        resposta:
          status === "CONCLUIDO" && destino !== "EXTERNO"
            ? "Atendida e incluída no acompanhamento da unidade."
            : status === "RECUSADO"
              ? "Fora do território de atendimento desta unidade; sugerimos o serviço de referência do município vizinho."
              : null,
      };
    }

    // Medida protetiva
    let medida: Caso["medida"] = null;
    if ((tipos.includes("FISICA") || g > 0.6) && chance(0.45)) {
      const status = diasAtras < 10 ? pesar([["SOLICITADA", 60], ["DEFERIDA", 40]] as const) : pesar([["DEFERIDA", 62], ["INDEFERIDA", 8], ["ENCERRADA", 18], ["REVOGADA", 7], ["SOLICITADA", 5]] as const);
      const medidas = [...new Set([escolher(MEDIDAS), "Proibição de aproximação", ...(chance(0.6) ? ["Proibição de contato por qualquer meio"] : [])])];
      if (moraComAutor) medidas.unshift("Afastamento do agressor do lar");
      medida = { status, medidas: [...new Set(medidas)], diasDepois: Math.min(diasAtras, inteiro(1, 8)), validadeDias: inteiro(90, 180) };
    }

    casos.push({
      nomeCivil,
      nomeSocial,
      identidadeGenero,
      diasAtras,
      idade,
      dataNascimento,
      racaCor,
      escolaridade,
      bairro: chance(0.04) ? null : pesar(BAIRROS),
      perfil: {
        quantidadeFilhos,
        filhosMenores,
        gestante,
        pessoaComDeficiencia,
        estadoCivil,
        situacaoTrabalho,
        rendaFamiliar,
        recebeBeneficio,
        situacaoMoradia,
        dependenciaFinanceira,
      },
      origem,
      autorizou: chance(0.82),
      contatoSeguro: !chance(0.15),
      autor: moraComAutor || chance(0.95) ? { nome: `${escolher(PRENOMES_AUTOR)} ${escolher(SOBRENOMES)[0]}.`, vinculo, acessoArma } : null,
      tipos,
      relato,
      fonar,
      atendimentos,
      encaminhamento,
      medida,
      arquivar: diasAtras > 180 && chance(0.45),
    });
  }
  return casos;
}
