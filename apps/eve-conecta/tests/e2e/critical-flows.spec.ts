import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("dashboard exposes the operational overview", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Buenas tardes, Camila/ })).toBeVisible();
  await expect(page.getByText("Recaudo de julio")).toBeVisible();
  await expect(page.getByText("Requiere tu atención")).toBeVisible();
});

test("fee to payment to portfolio flow is completed end-to-end", async ({ page }) => {
  await page.goto("/finanzas");
  const actionableRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "Pagar sandbox" }) })
    .first();
  await expect(actionableRow).toBeVisible();
  const unit = (await actionableRow.getByRole("cell").first().textContent())?.trim();
  expect(unit).toBeTruthy();

  await actionableRow.getByRole("button", { name: "Pagar sandbox" }).click();

  await expect(page.getByText("Pago aprobado y aplicado")).toBeVisible();
  const paidRow = page.getByRole("row").filter({ hasText: unit! });
  await expect(paidRow.getByText("Pagado")).toBeVisible();
});

test("administrator creates a tenant-scoped PQRS case", async ({ page }, testInfo) => {
  const subject = `Iluminación intermitente en sendero peatonal · ${testInfo.project.name}`;
  await page.goto("/pqrs");
  await page.getByRole("button", { name: "Crear caso" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo caso" });
  await dialog.getByLabel("Asunto").fill(subject);
  await dialog.getByLabel("Categoría").selectOption({ label: "Mantenimiento" });
  await dialog.getByLabel("Prioridad").selectOption("high");
  await dialog.getByRole("textbox", { name: "Unidad", exact: true }).fill("T1 · 301");
  await dialog.getByRole("button", { name: "Crear caso", exact: true }).click();

  await expect(page.getByText("Caso creado")).toBeVisible();
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
});

test("dashboard has no serious or critical automated accessibility violations", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Buenas tardes/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const materialViolations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  expect(materialViolations).toEqual([]);
});
