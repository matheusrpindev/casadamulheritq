/** Utilitários de texto e formatação (sem dependências de servidor). */

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

export function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

/** Mostra só os 3 últimos dígitos antes do verificador: ***.***.*89-01 */
export function mascararCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? `***.***.*${d.slice(7, 9)}-${d.slice(9)}` : "***";
}

export function numeroProntuario(numero: number, criadoEm: Date | string, prefixo = "ITQ"): string {
  const ano = new Date(criadoEm).getFullYear();
  return `${prefixo}-${ano}-${String(numero).padStart(6, "0")}`;
}

const TZ = "America/Sao_Paulo";

export function formatarData(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  // Datas puras (AAAA-MM-DD) não devem sofrer deslocamento de fuso.
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short" }).format(new Date(valor));
}

export function formatarDataHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

export function tempoRelativo(valor: Date | string, agora = new Date()): string {
  const diff = (agora.getTime() - new Date(valor).getTime()) / 1000;
  const fmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (Math.abs(diff) < 60) return "agora";
  if (Math.abs(diff) < 3600) return fmt.format(-Math.round(diff / 60), "minute");
  if (Math.abs(diff) < 86400) return fmt.format(-Math.round(diff / 3600), "hour");
  if (Math.abs(diff) < 86400 * 30) return fmt.format(-Math.round(diff / 86400), "day");
  if (Math.abs(diff) < 86400 * 365) return fmt.format(-Math.round(diff / (86400 * 30)), "month");
  return fmt.format(-Math.round(diff / (86400 * 365)), "year");
}

export function idade(dataNascimento: string | null | undefined, hoje = new Date()): number | null {
  if (!dataNascimento) return null;
  const [a, m, d] = dataNascimento.split("-").map(Number);
  let anos = hoje.getFullYear() - a;
  const mes = hoje.getMonth() + 1;
  if (mes < m || (mes === m && hoje.getDate() < d)) anos--;
  return anos;
}

/** Instante deslocado do momento atual (ms negativos = passado). */
export function instante(deslocamentoMs = 0): Date {
  return new Date(Date.now() + deslocamentoMs);
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hojeISO(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(agora);
}

export function nomeExibicao(p: { nomeCivil: string; nomeSocial: string | null }): string {
  return p.nomeSocial?.trim() || p.nomeCivil;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
