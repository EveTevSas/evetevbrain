import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  // rawBody: true expone req.rawBody para verificar la firma de los webhooks (§4).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("v1");

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`EvePay API escuchando en http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
