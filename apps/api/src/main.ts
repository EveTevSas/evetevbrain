import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS: permite al portal del comercio y al panel admin llamar al API.
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3003")
    .split(",")
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

  app.setGlobalPrefix("v1", { exclude: ["admin"] });

  // Railway/hosts inyectan PORT; en local usamos API_PORT. 0.0.0.0 para aceptar
  // tráfico externo dentro del contenedor (no solo loopback).
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  Logger.log(`EvePay API escuchando en el puerto ${port}`, "Bootstrap");
}

void bootstrap();
