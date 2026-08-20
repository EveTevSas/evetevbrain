import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS: permite al portal del comercio y al panel admin llamar al API.
  // Siempre incluye los orígenes de producción conocidos más lo que venga en CORS_ORIGINS.
  const extraOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origins = [
    "http://localhost:3003",
    "https://merchants.evetev.com",
    "https://eve-merchants.vercel.app",
    ...extraOrigins
  ];
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  app.setGlobalPrefix("v1", { exclude: ["admin"] });

  // Railway/hosts inyectan PORT; en local usamos API_PORT. 0.0.0.0 para aceptar
  // tráfico externo dentro del contenedor (no solo loopback).
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  Logger.log(`EvePay API escuchando en el puerto ${port}`, "Bootstrap");
}

void bootstrap();
