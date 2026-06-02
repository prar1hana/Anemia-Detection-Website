import { spawn } from "child_process";
import path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT) || 3000;

// Start Python ML microservice
function startMlService() {
  const mlPort = process.env.ML_SERVICE_PORT || "8001";
  const workspaceRoot = process.cwd().replace(/\/artifacts\/api-server.*$/, "");
  const mlScript = path.join(
    workspaceRoot,
    "artifacts",
    "ml-service",
    "main.py"
  );

  logger.info({ mlPort, mlScript }, "Starting ML microservice");

  const mlProcess = spawn("python3", [mlScript], {
    env: { ...process.env, ML_PORT: mlPort },
    stdio: ["ignore", "pipe", "pipe"],
  });

  mlProcess.stdout?.on("data", (data: Buffer) => {
    console.log(data.toString());
  });

  mlProcess.stderr?.on("data", (data: Buffer) => {
    console.error(data.toString());
  });

  mlProcess.on("exit", (code) => {
    logger.warn({ code }, "ML service exited");
  });
}

startMlService();

app.listen(port, "0.0.0.0", () => {
  logger.info(`API running at http://localhost:${port}`);
});