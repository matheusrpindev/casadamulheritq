/**
 * Formulário Nacional de Avaliação de Risco (FONAR) — Parte I (objetiva).
 * Base: Resolução Conjunta CNJ/CNMP nº 5/2020 e Lei 14.149/2021.
 *
 * A redação segue o formulário oficial de forma resumida. Antes de usar em
 * produção, a equipe deve conferir o texto com a versão vigente publicada pelo CNJ.
 *
 * A "sugestão" de classificação é um apoio: quem classifica o risco é a
 * profissional (Parte II), com base na escuta e no contexto.
 */
import type { NivelRisco } from "@/db/schema";

export type Peso = "grave" | "atencao";

export type Opcao = {
  valor: string;
  rotulo: string;
  peso?: Peso;
  /** Nome curto do fator de risco, exibido no resumo. */
  fator?: string;
  /** Fator crítico: sozinho já sugere risco elevado. */
  critico?: boolean;
  /** Opção exclusiva ("Não", "Nenhuma") em perguntas de múltipla escolha. */
  exclusiva?: boolean;
};

export type Pergunta = {
  id: string;
  numero: string;
  texto: string;
  tipo: "unica" | "multipla";
  opcoes: Opcao[];
  ajuda?: string;
};

export type Bloco = { titulo: string; perguntas: Pergunta[] };

const SIM_NAO = (fator?: string, peso: Peso = "grave"): Opcao[] => [
  { valor: "sim", rotulo: "Sim", peso, fator },
  { valor: "nao", rotulo: "Não", exclusiva: true },
];

const SIM_NAO_NAOSEI = (fator?: string, peso: Peso = "atencao"): Opcao[] => [
  { valor: "sim", rotulo: "Sim", peso, fator },
  { valor: "nao", rotulo: "Não" },
  { valor: "nao_sei", rotulo: "Não sei" },
];

export const FONAR: Bloco[] = [
  {
    titulo: "Bloco I — Sobre o histórico de violência",
    perguntas: [
      {
        id: "q1",
        numero: "1",
        texto: "O(a) agressor(a) já ameaçou você ou algum familiar com a finalidade de atingi-la?",
        tipo: "multipla",
        opcoes: [
          { valor: "arma_fogo", rotulo: "Sim, utilizando arma de fogo", peso: "grave", fator: "Ameaça com arma de fogo", critico: true },
          { valor: "faca", rotulo: "Sim, utilizando faca", peso: "grave", fator: "Ameaça com faca" },
          { valor: "outra", rotulo: "Sim, de outra forma", peso: "atencao", fator: "Ameaças" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
        ],
      },
      {
        id: "q2",
        numero: "2",
        texto: "O(a) agressor(a) já praticou alguma(s) destas agressões físicas contra você?",
        tipo: "multipla",
        opcoes: [
          { valor: "queimadura", rotulo: "Queimadura", peso: "grave", fator: "Queimadura" },
          { valor: "enforcamento", rotulo: "Enforcamento", peso: "grave", fator: "Enforcamento/estrangulamento", critico: true },
          { valor: "sufocamento", rotulo: "Sufocamento", peso: "grave", fator: "Sufocamento", critico: true },
          { valor: "tiro", rotulo: "Tiro", peso: "grave", fator: "Tiro", critico: true },
          { valor: "afogamento", rotulo: "Afogamento", peso: "grave", fator: "Afogamento" },
          { valor: "facada", rotulo: "Facada", peso: "grave", fator: "Facada", critico: true },
          { valor: "paulada", rotulo: "Paulada", peso: "grave", fator: "Paulada" },
          { valor: "nenhuma", rotulo: "Nenhuma das agressões acima", exclusiva: true },
        ],
      },
      {
        id: "q3",
        numero: "3",
        texto: "O(a) agressor(a) já praticou alguma(s) destas outras agressões físicas contra você?",
        tipo: "multipla",
        opcoes: [
          { valor: "socos", rotulo: "Socos", peso: "atencao", fator: "Agressões físicas" },
          { valor: "chutes", rotulo: "Chutes", peso: "atencao", fator: "Agressões físicas" },
          { valor: "tapas", rotulo: "Tapas", peso: "atencao", fator: "Agressões físicas" },
          { valor: "empurroes", rotulo: "Empurrões", peso: "atencao", fator: "Agressões físicas" },
          { valor: "puxoes_cabelo", rotulo: "Puxões de cabelo", peso: "atencao", fator: "Agressões físicas" },
          { valor: "nenhuma", rotulo: "Nenhuma das agressões acima", exclusiva: true },
        ],
      },
      {
        id: "q4",
        numero: "4",
        texto: "Você necessitou de atendimento médico e/ou internação após alguma dessas agressões?",
        tipo: "multipla",
        opcoes: [
          { valor: "atendimento", rotulo: "Sim, atendimento médico", peso: "atencao", fator: "Precisou de atendimento médico" },
          { valor: "internacao", rotulo: "Sim, internação", peso: "grave", fator: "Precisou de internação" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
        ],
      },
      {
        id: "q5",
        numero: "5",
        texto: "O(a) agressor(a) já obrigou você a ter relações sexuais ou praticar atos sexuais contra a sua vontade?",
        tipo: "unica",
        opcoes: SIM_NAO("Violência sexual"),
      },
      {
        id: "q6",
        numero: "6",
        texto:
          "O(a) agressor(a) persegue você, demonstra ciúme excessivo, tenta controlar sua vida e as coisas que você faz (aonde você vai, com quem conversa, o tipo de roupa que usa etc.)?",
        tipo: "unica",
        opcoes: SIM_NAO("Controle e ciúme excessivo", "atencao"),
      },
      {
        id: "q7",
        numero: "7",
        texto: "O(a) agressor(a) já teve algum destes comportamentos?",
        tipo: "multipla",
        opcoes: [
          { valor: "nao_sera_de_ninguem", rotulo: "Disse algo parecido com \"se não for minha, não será de mais ninguém\"", peso: "grave", fator: "\"Se não for minha, não será de ninguém\"" },
          { valor: "perseguiu", rotulo: "Perturbou, perseguiu ou vigiou você nos locais que frequenta", peso: "grave", fator: "Perseguição (stalking)" },
          { valor: "proibiu_familia", rotulo: "Proibiu você de visitar familiares ou amigos", peso: "atencao", fator: "Isolamento social" },
          { valor: "proibiu_trabalho", rotulo: "Proibiu você de trabalhar ou estudar", peso: "atencao", fator: "Impediu de trabalhar/estudar" },
          { valor: "mensagens", rotulo: "Fez telefonemas, enviou mensagens ou e-mails de forma insistente", peso: "atencao", fator: "Contato insistente" },
          { valor: "dinheiro", rotulo: "Impediu você de ter acesso a dinheiro, conta bancária ou outros bens (documentos, carro)", peso: "atencao", fator: "Violência patrimonial" },
          { valor: "outros_controle", rotulo: "Teve outros comportamentos de ciúme excessivo e de controle sobre você", peso: "atencao", fator: "Controle" },
          { valor: "nenhum", rotulo: "Nenhum dos comportamentos acima", exclusiva: true },
        ],
      },
      {
        id: "q8",
        numero: "8",
        texto:
          "Você já registrou ocorrência policial ou pediu medida protetiva de urgência envolvendo essa mesma pessoa?",
        tipo: "unica",
        opcoes: SIM_NAO("Histórico de ocorrências/medidas", "atencao"),
      },
      {
        id: "q9",
        numero: "9",
        texto:
          "As ameaças ou agressões físicas do(a) agressor(a) contra você se tornaram mais frequentes ou mais graves nos últimos meses?",
        tipo: "unica",
        opcoes: SIM_NAO("Escalada da violência"),
      },
    ],
  },
  {
    titulo: "Bloco II — Sobre o(a) agressor(a)",
    perguntas: [
      {
        id: "q10",
        numero: "10",
        texto: "O(a) agressor(a) faz uso abusivo de álcool, drogas ou medicamentos?",
        tipo: "multipla",
        opcoes: [
          { valor: "alcool", rotulo: "Sim, de álcool", peso: "atencao", fator: "Uso abusivo de álcool/drogas" },
          { valor: "drogas", rotulo: "Sim, de drogas", peso: "atencao", fator: "Uso abusivo de álcool/drogas" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
          { valor: "nao_sei", rotulo: "Não sei", exclusiva: true },
        ],
      },
      {
        id: "q11",
        numero: "11",
        texto: "O(a) agressor(a) tem alguma doença mental comprovada por avaliação médica?",
        tipo: "unica",
        opcoes: [
          { valor: "sim_medicado", rotulo: "Sim, e faz uso de medicação" },
          { valor: "sim_sem_medicacao", rotulo: "Sim, e não faz uso de medicação", peso: "atencao", fator: "Transtorno mental sem tratamento" },
          { valor: "nao", rotulo: "Não" },
          { valor: "nao_sei", rotulo: "Não sei" },
        ],
      },
      {
        id: "q12",
        numero: "12",
        texto: "O(a) agressor(a) já tentou suicídio ou falou em suicidar-se?",
        tipo: "unica",
        opcoes: SIM_NAO_NAOSEI("Agressor fala em suicídio", "grave"),
      },
      {
        id: "q13",
        numero: "13",
        texto:
          "O(a) agressor(a) está com dificuldades financeiras, desempregado ou com dificuldade de se manter no emprego?",
        tipo: "unica",
        opcoes: SIM_NAO_NAOSEI("Agressor desempregado/dificuldade financeira"),
      },
      {
        id: "q14",
        numero: "14",
        texto: "O(a) agressor(a) já usou, ameaçou usar arma de fogo contra você ou tem fácil acesso a uma arma?",
        tipo: "multipla",
        opcoes: [
          { valor: "ja_usou", rotulo: "Sim, já usou", peso: "grave", fator: "Já usou arma de fogo", critico: true },
          { valor: "ameacou", rotulo: "Sim, já ameaçou usar", peso: "grave", fator: "Ameaçou usar arma de fogo", critico: true },
          { valor: "facil_acesso", rotulo: "Sim, tem fácil acesso", peso: "grave", fator: "Acesso a arma de fogo" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
          { valor: "nao_sei", rotulo: "Não sei", exclusiva: true },
        ],
      },
      {
        id: "q15",
        numero: "15",
        texto:
          "O(a) agressor(a) já ameaçou ou agrediu seus filhos, outros familiares, amigos, colegas, pessoas desconhecidas ou animais de estimação?",
        tipo: "multipla",
        opcoes: [
          { valor: "filhos", rotulo: "Sim, os filhos", peso: "grave", fator: "Ameaça/agressão aos filhos" },
          { valor: "familiares", rotulo: "Sim, outros familiares", peso: "atencao", fator: "Ameaça a terceiros" },
          { valor: "outras_pessoas", rotulo: "Sim, outras pessoas", peso: "atencao", fator: "Ameaça a terceiros" },
          { valor: "animais", rotulo: "Sim, animais", peso: "atencao", fator: "Violência contra animais" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
          { valor: "nao_sei", rotulo: "Não sei", exclusiva: true },
        ],
      },
    ],
  },
  {
    titulo: "Bloco III — Sobre você",
    perguntas: [
      {
        id: "q16",
        numero: "16",
        texto: "Você se separou recentemente do(a) agressor(a) ou tentou se separar?",
        tipo: "unica",
        opcoes: SIM_NAO("Separação recente"),
      },
      {
        id: "q17",
        numero: "17",
        texto: "Você tem filhos?",
        tipo: "multipla",
        opcoes: [
          { valor: "com_agressor", rotulo: "Sim, com o(a) agressor(a)" },
          { valor: "outro_relacionamento", rotulo: "Sim, de outro relacionamento" },
          { valor: "nao", rotulo: "Não", exclusiva: true },
        ],
      },
      {
        id: "q17_1",
        numero: "17.1",
        texto: "Se sim, qual a faixa etária dos filhos?",
        tipo: "multipla",
        opcoes: [
          { valor: "0_11", rotulo: "0 a 11 anos" },
          { valor: "12_17", rotulo: "12 a 17 anos" },
          { valor: "18_mais", rotulo: "A partir de 18 anos" },
        ],
      },
      {
        id: "q17_2",
        numero: "17.2",
        texto: "Algum de seus filhos é pessoa com deficiência?",
        tipo: "unica",
        opcoes: SIM_NAO("Filho(a) com deficiência", "atencao"),
      },
      {
        id: "q18",
        numero: "18",
        texto:
          "Vocês estão vivendo algum conflito com relação à guarda dos filhos, visitas ou pagamento de pensão pelo(a) agressor(a)?",
        tipo: "unica",
        opcoes: [
          { valor: "sim", rotulo: "Sim", peso: "atencao", fator: "Conflito sobre guarda/pensão" },
          { valor: "nao", rotulo: "Não" },
          { valor: "sem_filhos_agressor", rotulo: "Não tenho filhos com o(a) agressor(a)" },
        ],
      },
      {
        id: "q19",
        numero: "19",
        texto: "Seus filhos já presenciaram atos de violência do(a) agressor(a) contra você?",
        tipo: "unica",
        opcoes: SIM_NAO("Filhos presenciaram violência", "atencao"),
      },
      {
        id: "q20",
        numero: "20",
        texto: "Você sofreu algum tipo de violência durante a gravidez ou nos três meses posteriores ao parto?",
        tipo: "unica",
        opcoes: SIM_NAO("Violência na gravidez/pós-parto"),
      },
      {
        id: "q21",
        numero: "21",
        texto:
          "Se você está em um novo relacionamento, percebeu que as ameaças ou as agressões aumentaram em razão disso?",
        tipo: "unica",
        opcoes: [
          { valor: "sim", rotulo: "Sim", peso: "grave", fator: "Aumento após novo relacionamento" },
          { valor: "nao", rotulo: "Não" },
          { valor: "nao_se_aplica", rotulo: "Não se aplica" },
        ],
      },
      {
        id: "q22",
        numero: "22",
        texto:
          "Você possui alguma deficiência ou doença degenerativa que acarreta condição limitante ou de vulnerabilidade física ou mental?",
        tipo: "unica",
        opcoes: SIM_NAO("Deficiência/vulnerabilidade da mulher", "atencao"),
      },
      {
        id: "q23",
        numero: "23",
        texto: "Com qual cor/raça você se declara?",
        tipo: "unica",
        opcoes: [
          { valor: "branca", rotulo: "Branca" },
          { valor: "preta", rotulo: "Preta" },
          { valor: "parda", rotulo: "Parda" },
          { valor: "amarela", rotulo: "Amarela" },
          { valor: "indigena", rotulo: "Indígena" },
          { valor: "nao_declarada", rotulo: "Prefere não declarar" },
        ],
      },
    ],
  },
  {
    titulo: "Bloco IV — Outras informações importantes",
    perguntas: [
      {
        id: "q24",
        numero: "24",
        texto: "Você considera que mora em bairro, comunidade, área rural ou local de risco de violência?",
        tipo: "unica",
        opcoes: SIM_NAO_NAOSEI("Mora em local de risco"),
      },
      {
        id: "q25",
        numero: "25",
        texto: "Qual a sua situação de moradia?",
        tipo: "unica",
        opcoes: [
          { valor: "propria", rotulo: "Própria" },
          { valor: "alugada", rotulo: "Alugada" },
          { valor: "cedida", rotulo: "Cedida ou \"de favor\"", peso: "atencao", fator: "Moradia cedida/de favor" },
        ],
      },
      {
        id: "q26",
        numero: "26",
        texto: "Você se considera dependente financeiramente do(a) agressor(a)?",
        tipo: "unica",
        opcoes: SIM_NAO("Dependência financeira", "atencao"),
      },
      {
        id: "q27",
        numero: "27",
        texto: "Você quer e aceita abrigamento temporário?",
        tipo: "unica",
        opcoes: [
          { valor: "sim", rotulo: "Sim", fator: "Aceita abrigamento" },
          { valor: "nao", rotulo: "Não" },
        ],
        ajuda: "Não é fator de risco, mas exige providência imediata se a resposta for sim.",
      },
    ],
  },
];

export const PERGUNTAS: Pergunta[] = FONAR.flatMap((b) => b.perguntas);

export type Respostas = Record<string, string[]>;

export type ResultadoFonar = {
  fatoresGraves: string[];
  fatoresAtencao: string[];
  criticos: string[];
  respondidas: number;
  sugestao: Exclude<NivelRisco, "NAO_AVALIADO">;
  aceitaAbrigamento: boolean;
};

/** Normaliza respostas vindas de formulário: só valores existentes, exclusivas sozinhas. */
export function limparRespostas(entrada: Record<string, string[] | string | undefined>): Respostas {
  const saida: Respostas = {};
  for (const p of PERGUNTAS) {
    const bruto = entrada[p.id];
    const lista = (Array.isArray(bruto) ? bruto : bruto ? [bruto] : []).filter((v) =>
      p.opcoes.some((o) => o.valor === v),
    );
    if (lista.length === 0) continue;
    const unicos = [...new Set(lista)];
    if (p.tipo === "unica") {
      saida[p.id] = [unicos[0]];
      continue;
    }
    const exclusiva = unicos.find((v) => p.opcoes.find((o) => o.valor === v)?.exclusiva);
    saida[p.id] = exclusiva && unicos.length > 1 ? unicos.filter((v) => !p.opcoes.find((o) => o.valor === v)?.exclusiva) : unicos;
  }
  return saida;
}

export function avaliarFonar(respostas: Respostas): ResultadoFonar {
  const graves = new Set<string>();
  const atencao = new Set<string>();
  const criticos = new Set<string>();
  let respondidas = 0;

  for (const p of PERGUNTAS) {
    const marcadas = respostas[p.id] ?? [];
    if (marcadas.length > 0) respondidas++;
    for (const valor of marcadas) {
      const opcao = p.opcoes.find((o) => o.valor === valor);
      if (!opcao?.peso || !opcao.fator) continue;
      if (opcao.peso === "grave") graves.add(opcao.fator);
      else atencao.add(opcao.fator);
      if (opcao.critico) criticos.add(opcao.fator);
    }
  }
  // Um fator que já é grave não conta de novo como atenção.
  for (const f of graves) atencao.delete(f);

  let sugestao: ResultadoFonar["sugestao"] = "BAIXO";
  if (criticos.size > 0 || graves.size >= 3) sugestao = "ELEVADO";
  else if (graves.size >= 1 || atencao.size >= 3) sugestao = "MEDIO";

  return {
    fatoresGraves: [...graves],
    fatoresAtencao: [...atencao],
    criticos: [...criticos],
    respondidas,
    sugestao,
    aceitaAbrigamento: respostas.q27?.[0] === "sim",
  };
}
