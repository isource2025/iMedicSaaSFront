import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cambiarPassword } = vi.hoisted(() => ({ cambiarPassword: vi.fn() }));
vi.mock("@/app/services/miPerfilService", () => ({ miPerfilService: { cambiarPassword } }));

import CambiarPasswordForm from "./CambiarPasswordForm";

const campo = (re: RegExp) => screen.getByLabelText(re) as HTMLInputElement;

async function completar(actual: string, nueva: string, confirmacion: string) {
    const user = userEvent.setup();
    if (actual) await user.type(campo(/^Contraseña actual/), actual);
    if (nueva) await user.type(campo(/^Contraseña nueva/), nueva);
    if (confirmacion) await user.type(campo(/^Repetir contraseña nueva/), confirmacion);
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

describe("CambiarPasswordForm", () => {
    beforeEach(() => {
        cambiarPassword.mockReset();
    });

    it("no llama a la API si la confirmación no coincide", async () => {
        render(<CambiarPasswordForm />);
        await completar("vieja", "nueva123", "nueva124");
        expect(screen.getByText("La confirmación no coincide con la contraseña nueva")).toBeInTheDocument();
        expect(cambiarPassword).not.toHaveBeenCalled();
    });

    it("exige largo mínimo y que sea distinta de la actual", async () => {
        render(<CambiarPasswordForm />);
        await completar("clave", "abc", "abc");
        expect(screen.getByText(/al menos 4 caracteres/)).toBeInTheDocument();

        await userEvent.clear(campo(/^Contraseña nueva/));
        await userEvent.clear(campo(/^Repetir contraseña nueva/));
        await completar("", "CLAVE", "CLAVE");
        expect(screen.getByText("La contraseña nueva tiene que ser distinta de la actual")).toBeInTheDocument();
        expect(cambiarPassword).not.toHaveBeenCalled();
    });

    it("envía, limpia los campos y confirma al guardar", async () => {
        cambiarPassword.mockResolvedValue(undefined);
        render(<CambiarPasswordForm />);
        await completar("vieja", "nueva123", "nueva123");

        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/se actualizó/));
        expect(cambiarPassword).toHaveBeenCalledWith("vieja", "nueva123");
        expect(campo(/^Contraseña actual/).value).toBe("");
        expect(campo(/^Contraseña nueva/).value).toBe("");
    });

    it("muestra el mensaje del backend si la contraseña actual es incorrecta", async () => {
        const axiosError = Object.assign(new Error("Request failed with status code 400"), {
            response: { status: 400, data: { mensaje: "La contraseña actual no es correcta" } },
        });
        cambiarPassword.mockRejectedValue(axiosError);
        render(<CambiarPasswordForm />);
        await completar("mala", "nueva123", "nueva123");

        expect(await screen.findByText("La contraseña actual no es correcta")).toBeInTheDocument();
        expect(campo(/^Contraseña actual/).value).toBe("mala");
    });
});
