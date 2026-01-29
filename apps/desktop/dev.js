const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");
const electron = require("electron");

const root = path.join(__dirname, "..", "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const PORT = process.env.MUTOK_PORT || "3000";

const devServer = spawn(
  npmCmd,
  ["run", "dev"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, MUTOK_PORT: PORT }
  }
);

const stopServer = () => {
  if (devServer) {
    devServer.kill();
  }
};

process.on("exit", stopServer);
process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);

(async () => {
  await waitOn({
    resources: [`http://localhost:${PORT}`],
    timeout: 60000
  });

  const electronProcess = spawn(
    electron,
    [path.join(__dirname, "main.js")],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MUTOK_DESKTOP_DEV: "1",
        MUTOK_PORT: PORT
      }
    }
  );

  electronProcess.on("close", () => {
    stopServer();
    process.exit(0);
  });
})();
