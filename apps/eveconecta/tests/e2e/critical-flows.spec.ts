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
  await dialog.getByLabel("Anexar imágenes al caso").setInputFiles([
    { name: "sendero-1.png", mimeType: "image/png", buffer: Buffer.from("imagen-1") },
    { name: "sendero-2.jpg", mimeType: "image/jpeg", buffer: Buffer.from("imagen-2") },
    { name: "sendero-3.webp", mimeType: "image/webp", buffer: Buffer.from("imagen-3") }
  ]);
  await expect(dialog.getByLabel("Imágenes seleccionadas").getByRole("img")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Crear caso", exact: true }).click();

  await expect(page.getByText("Caso creado")).toBeVisible();
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
  await expect(page.getByText("3 imágenes anexas", { exact: true })).toBeVisible();
});

test("administrator schedules a tenant-scoped assembly", async ({ page }, testInfo) => {
  const title = `Asamblea de validación · ${testInfo.project.name}`;
  await page.goto("/asambleas");
  await page.getByRole("button", { name: "Programar asamblea" }).click();
  const dialog = page.getByRole("dialog", { name: "Programar asamblea" });
  await dialog.getByLabel("Nombre de la asamblea").fill(title);
  await dialog.getByLabel("Tipo").selectOption("extraordinary");
  await dialog.getByLabel("Modalidad").selectOption("virtual");
  await dialog.getByLabel("Fecha y hora").fill("2099-08-15T19:00");
  await dialog.getByLabel("Enlace de reunión").fill("https://reunion.ejemplo.com/asamblea");
  await dialog
    .getByLabel("Orden del día")
    .fill("Verificación del quórum, presentación de propuestas y votación de decisiones.");
  await dialog.getByRole("button", { name: "Programar asamblea", exact: true }).click();

  await expect(page.getByText("Asamblea programada")).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(
    page.getByText("https://reunion.ejemplo.com/asamblea", { exact: true })
  ).toBeVisible();
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
