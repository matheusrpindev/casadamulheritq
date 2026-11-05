/**
 * Funções puras usadas no perfil da mulher e nos relatórios agregados.
 * Testadas em tests/relatorios.test.ts.
 */

export const FAIXAS_ETARIAS = ["Até 17 anos", "18 a 24", "25 a 34", "35 a 44", "45 a 59", "60 ou mais", "Não informada"] as const;
export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number];

/** Idade completa em anos numa data de referência (datas AAAA-MM-DD). */
export function idadeEm(dataNascimento: string | null | undefined, referencia: string): number | null {
  if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return null;
  const [an, mn, dn] = dataNascimento.split("-").map(Number);
  const [ar, mr, dr] = referencia.split("-").map(Number);
  let anos = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) anos--;
  return anos >= 0 ? anos : null;
}

export function faixaEtaria(idade: number | null): FaixaEtaria {
  if (idade === null) return "Não informada";
  if (idade < 18) return "Até 17 anos";
  if (idade < 25) return "18 a 24";
  if (idade < 35) return "25 a 34";
  if (idade < 45) return "35 a 44";
  if (idade < 60) return "45 a 59";
  return "60 ou mais";
}

export function rotuloFilhos(quantidade: number | null): string {
  if (quantidade === null) return "Não informado";
  if (quantidade === 0) return "Sem filhos";
  if (quantidade >= 4) return "4 ou mais";
  return quantidade === 1 ? "1 filho" : `${quantidade} filhos`;
}
export const ORDEM_FILHOS = ["Sem filhos", "1 filho", "2 filhos", "3 filhos", "4 ou mais", "Não informado"];

export type PerfilMulher = {
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

/** Frases curtas para o cartão "Sobre ela" (só o que foi informado). */
export function resumoPerfil(p: PerfilMulher): { texto: string; destaque?: boolean }[] {
  const itens: { texto: string; destaque?: boolean }[] = [];
  if (p.quantidadeFilhos !== null) {
    if (p.quantidadeFilhos === 0) itens.push({ texto: "Não tem filhos" });
    else {
      const total = p.quantidadeFilhos === 1 ? "1 filho" : `${p.quantidadeFilhos} filhos`;
      const menores =
        p.filhosMenores === null ? "" : p.filhosMenores === 0 ? " (todos adultos)" : p.filhosMenores === p.quantidadeFilhos ? " (todos menores)" : ` (${p.filhosMenores} menor${p.filhosMenores > 1 ? "es" : ""})`;
      itens.push({ texto: total + menores });
    }
  }
  if (p.gestante) itens.push({ texto: "Gestante", destaque: true });
  if (p.pessoaComDeficiencia) itens.push({ texto: "Pessoa com deficiência", destaque: true });
  if (p.situacaoMoradia === "Mora com o autor da violência") itens.push({ texto: "Mora com o autor da violência", destaque: true });
  else if (p.situacaoMoradia) itens.push({ texto: `Moradia: ${p.situacaoMoradia.toLowerCase()}` });
  if (p.dependenciaFinanceira) itens.push({ texto: "Depende financeiramente do autor", destaque: true });
  if (p.estadoCivil) itens.push({ texto: p.estadoCivil });
  if (p.situacaoTrabalho) itens.push({ texto: p.situacaoTrabalho });
  if (p.rendaFamiliar) itens.push({ texto: `Renda: ${p.rendaFamiliar.toLowerCase()}` });
  if (p.recebeBeneficio) itens.push({ texto: "Recebe benefício social" });
  return itens;
}

/** Conta ocorrências e devolve na ordem pedida (categorias sem ocorrência entram com 0). */
export function contarEmOrdem<T extends string>(valores: T[], ordem: readonly string[]): { rotulo: string; valor: number }[] {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  const conhecidos = ordem.map((rotulo) => ({ rotulo, valor: mapa.get(rotulo) ?? 0 }));
  const extras = [...mapa.entries()].filter(([k]) => !ordem.includes(k)).map(([rotulo, valor]) => ({ rotulo, valor }));
  return [...conhecidos, ...extras];
}

/** Rótulo de sim/não/não informado. */
export const rotuloSimNao = (v: boolean | null) => (v === true ? "Sim" : v === false ? "Não" : "Não informado");
export const ORDEM_SIM_NAO = ["Sim", "Não", "Não informado"];
