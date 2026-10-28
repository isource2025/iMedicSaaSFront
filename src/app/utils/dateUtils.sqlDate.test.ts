import { describe, expect, it } from "vitest";
import { formatSqlDate, parseSqlDateTimeLocal } from "./dateUtils";

describe("parseSqlDateTimeLocal", () => {
	it("no interpreta YYYY-MM-DD HH:mm:ss como UTC", () => {
		const d = parseSqlDateTimeLocal("2026-10-28 16:00:00");
		expect(d).not.toBeNull();
		expect(d!.getFullYear()).toBe(2026);
		expect(d!.getMonth()).toBe(9);
		expect(d!.getDate()).toBe(28);
		expect(d!.getHours()).toBe(16);
		expect(d!.getMinutes()).toBe(0);
	});

	it("formatSqlDate muestra la hora de pared, no UTC-3", () => {
		const texto = formatSqlDate("2026-10-28 16:00:00", {
			showDate: true,
			showTime: true,
			showYear: false,
			locale: "es-AR",
		});
		expect(texto).toMatch(/28/);
		expect(texto).toMatch(/10/);
		expect(texto.toLowerCase()).toMatch(/4:00|16:00/);
	});
});
