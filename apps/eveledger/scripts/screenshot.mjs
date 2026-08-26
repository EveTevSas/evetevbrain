// Screenshots vía Chrome DevTools Protocol usando solo Node 22 (WebSocket nativo).
// Uso: node scripts/screenshot.mjs <cookie> <ruta> <salida.png> [ancho] [alto]
import { writeFileSync } from "node:fs";

const [cookie, ruta, salida, ancho = "1280", alto = "900"] = process.argv.slice(2);
const BASE = "http://localhost:3000";

const lista = await fetch("http://localhost:9222/json").then((r) => r.json());
const pagina = lista.find((t) => t.type === "page");
const ws = new WebSocket(pagina.webSocketDebuggerUrl);

let id = 0;
const pendientes = new Map();
function cmd(metodo, params = {}) {
  return new Promise((resolver) => {
    const mid = ++id;
    pendientes.set(mid, resolver);
    ws.send(JSON.stringify({ id: mid, method: metodo, params }));
  });
}

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pendientes.has(msg.id)) {
    pendientes.get(msg.id)(msg.result);
    pendientes.delete(msg.id);
  }
};

await new Promise((r) => (ws.onopen = r));

await cmd("Page.enable");
if (cookie) {
  const [nombre, valor] = cookie.split("=");
  await cmd("Network.setCookie", {
    name: nombre,
    value: valor,
    url: BASE
  });
}
await cmd("Emulation.setDeviceMetricsOverride", {
  width: Number(ancho),
  height: Number(alto),
  deviceScaleFactor: 1,
  mobile: Number(ancho) < 760
});
await cmd("Page.navigate", { url: BASE + ruta });
// Espera de red/fuentes (headless CLI no expone load event fácilmente aquí).
await new Promise((r) => setTimeout(r, 3500));
const shot = await cmd("Page.captureScreenshot", { format: "png" });
writeFileSync(salida, Buffer.from(shot.data, "base64"));
console.log("OK", salida);
ws.close();
process.exit(0);
