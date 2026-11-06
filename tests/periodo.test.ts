import { describe, expect, it } from "vitest";
import { inicioDoPeriodo } from "@/lib/relatorios";

describe("período dos relatórios (horário de Brasília)", () => {
  it("começa à meia-noite do dia 1º, contando o mês atual", () => {
    const agora = new Date("2026-11-06T15:00:00Z");
    expect(inicioDoPeriodo(1, agora).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(inicioDoPeriodo(3, agora).toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(inicioDoPeriodo(12, agora).toISOString()).toBe("2025-12-01T03:00:00.000Z");
  });

  it("usa o mês de Brasília, não o do UTC", () => {
    // 1º/nov 01:00 UTC ainda é 31/out 22:00 em Brasília.
    expect(inicioDoPeriodo(1, new Date("2026-11-01T01:00:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
});
