import { describe, expect, it } from "vitest";
import {
  acessoApenasEmergencial,
  papeisAtribuiveis,
  podeAbrirProntuario,
  podeGerirUsuarios,
  podeRevisarAcessoEmergencial,
  podeVerRegistro,
  sigilosPermitidos,
  type Ator,
  type Concessao,
} from "@/lib/permissoes";

const CMI = "unidade-cmi";
const SMM = "unidade-smm";

const ator = (p: Partial<Ator> = {}): Ator => ({ id: "u1", papel: "TECNICA", unidadeId: CMI, especialidade: "PSICOLOGIA", ...p });
const concessao = (p: Partial<Concessao> = {}): Concessao => ({ unidadeId: CMI, origem: "ORIGEM", expiraEm: null, revogadoEm: null, ...p });
const agora = new Date("2026-11-05T12:00:00Z");

describe("abrir prontuário", () => {
  it("unidade com concessão vigente abre", () => {
    expect(podeAbrirProntuario(ator(), [concessao()], agora)).toBe(true);
  });

  it("unidade sem concessão não abre — mesmo sendo da rede", () => {
    expect(podeAbrirProntuario(ator({ unidadeId: SMM }), [concessao()], agora)).toBe(false);
  });

  it("TI (ADMIN) nunca abre prontuário, mesmo da própria unidade", () => {
    expect(podeAbrirProntuario(ator({ papel: "ADMIN" }), [concessao()], agora)).toBe(false);
  });

  it("concessão revogada não vale", () => {
    expect(podeAbrirProntuario(ator(), [concessao({ origem: "ENCAMINHAMENTO", revogadoEm: new Date("2026-11-01") })], agora)).toBe(false);
  });

  it("acesso emergencial vale até expirar", () => {
    const emergencial = concessao({ origem: "EMERGENCIAL", expiraEm: new Date("2026-11-05T20:00:00Z") });
    expect(podeAbrirProntuario(ator(), [emergencial], agora)).toBe(true);
    expect(acessoApenasEmergencial(ator(), [emergencial], agora)).toBe(true);
    expect(podeAbrirProntuario(ator(), [emergencial], new Date("2026-11-06T00:00:00Z"))).toBe(false);
  });

  it("acesso regular + emergencial não é 'apenas emergencial'", () => {
    const lista = [concessao(), concessao({ origem: "EMERGENCIAL", expiraEm: new Date("2026-11-06") })];
    expect(acessoApenasEmergencial(ator(), lista, agora)).toBe(false);
  });
});

describe("sigilo por registro", () => {
  const registro = (sigilo: "REDE" | "UNIDADE" | "ESPECIALIDADE", unidadeId = CMI, especialidade: Ator["especialidade"] = "PSICOLOGIA") => ({
    sigilo,
    unidadeId,
    especialidade,
  });

  it("registro da rede é lido por toda a equipe técnica", () => {
    expect(podeVerRegistro(ator({ unidadeId: SMM, especialidade: "SERVICO_SOCIAL" }), registro("REDE"))).toBe(true);
  });

  it("recepção não lê conteúdo técnico, nem o da rede", () => {
    expect(podeVerRegistro(ator({ papel: "RECEPCAO", especialidade: null }), registro("REDE"))).toBe(false);
  });

  it("registro da unidade fica na unidade", () => {
    expect(podeVerRegistro(ator(), registro("UNIDADE"))).toBe(true);
    expect(podeVerRegistro(ator({ unidadeId: SMM }), registro("UNIDADE"))).toBe(false);
  });

  it("registro da Psicologia só é lido por psicólogas (de qualquer unidade)", () => {
    expect(podeVerRegistro(ator({ unidadeId: SMM }), registro("ESPECIALIDADE"))).toBe(true);
    expect(podeVerRegistro(ator({ especialidade: "JURIDICO" }), registro("ESPECIALIDADE"))).toBe(false);
  });

  it("gestão não fura o sigilo da especialidade", () => {
    expect(podeVerRegistro(ator({ papel: "GESTORA", especialidade: "SERVICO_SOCIAL" }), registro("ESPECIALIDADE"))).toBe(false);
  });

  it("sem especialidade, não há opção de sigilo por especialidade", () => {
    expect(sigilosPermitidos(ator({ especialidade: null }))).toEqual(["REDE", "UNIDADE"]);
  });
});

describe("gestão de contas", () => {
  it("gestora só gerencia a própria unidade e não cria gestoras/admin", () => {
    const gestora = ator({ papel: "GESTORA" });
    expect(podeGerirUsuarios(gestora, CMI)).toBe(true);
    expect(podeGerirUsuarios(gestora, SMM)).toBe(false);
    expect(papeisAtribuiveis(gestora)).toEqual(["TECNICA", "RECEPCAO"]);
  });

  it("técnica não gerencia contas", () => {
    expect(podeGerirUsuarios(ator(), CMI)).toBe(false);
    expect(papeisAtribuiveis(ator())).toEqual([]);
  });

  it("só a gestão da unidade de origem revisa acesso emergencial", () => {
    expect(podeRevisarAcessoEmergencial(ator({ papel: "GESTORA" }), CMI)).toBe(true);
    expect(podeRevisarAcessoEmergencial(ator({ papel: "GESTORA", unidadeId: SMM }), CMI)).toBe(false);
    expect(podeRevisarAcessoEmergencial(ator(), CMI)).toBe(false);
  });
});
