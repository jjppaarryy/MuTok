const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const waitOn = require("wait-on");

const DEFAULT_PORT = Number(process.env.MUTOK_PORT || "3000");
const isDev = process.env.MUTOK_DESKTOP_DEV === "1";
let serverProcess;
let serverPort = DEFAULT_PORT;

function findOpenPort(startPort, maxPort = startPort + 10) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryPort = () => {
      const tester = require("net")
        .createServer()
        .once("error", () => {
          port += 1;
          if (port > maxPort) {
            reject(new Error("No open port available"));
          } else {
            tryPort();
          }
        })
        .once("listening", () => {
          tester.close(() => resolve(port));
        })
        .listen(port, "127.0.0.1");
    };
    tryPort();
  });
}

function getAppRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }
  return app.getAppPath();
}

function resolveNextBin(root) {
  const candidates = [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    path.join(root, "node_modules", "next", "dist", "bin", "next.js"),
    path.join(root, "apps", "web", "node_modules", "next", "dist", "bin", "next"),
    path.join(root, "apps", "web", "node_modules", "next", "dist", "bin", "next.js"),
    path.join(root, "node_modules", ".bin", "next")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function startServerIfNeeded() {
  if (isDev) {
    return;
  }

  const root = getAppRoot();
  const webDir = path.join(root, "apps", "web");
  const nextBin = resolveNextBin(root);
  const nodeBin = process.execPath;
  serverPort = await findOpenPort(DEFAULT_PORT);
  let lastOutput = "";

  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, "server.log");
  const log = (line) => {
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
  };

  log(`Starting server on port ${serverPort}`);
  log(`root=${root}`);
  log(`webDir=${webDir}`);
  log(`nextBin=${nextBin ?? "missing"}`);
  log(`nodeBin=${nodeBin}`);

  if (!fs.existsSync(webDir) || !nextBin) {
    throw new Error(
      `Missing app resources. webDir exists=${fs.existsSync(webDir)} nextBin exists=${Boolean(nextBin)}`
    );
  }

  serverProcess = spawn(
    nodeBin,
    [nextBin, "start", "-p", String(serverPort)],
    {
      cwd: webDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PRISMA_CLIENT_ENGINE_TYPE: "binary",
        NODE_ENV: "production"
      }
    }
  );

  const recordOutput = (data) => {
    const text = data.toString();
    lastOutput = `${lastOutput}${text}`.slice(-2000);
    log(text.trimEnd());
  };

  serverProcess.stdout.on("data", recordOutput);
  serverProcess.stderr.on("data", recordOutput);

  const exitPromise = new Promise((_, reject) => {
    serverProcess.on("exit", (code) => {
      reject(new Error(`Server exited early (code ${code ?? "unknown"}).`));
    });
    serverProcess.on("error", (error) => reject(error));
  });

  await Promise.race([
    waitOn({
      resources: [`http://localhost:${serverPort}`],
      timeout: 60000
    }),
    exitPromise
  ]);
}

async function createWindow() {
  const root = getAppRoot();
  const iconPath = path.join(root, "apps", "web", "app", "icon.png");
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#f6f7f9",
    show: true,
    title: "MuTok",
    titleBarStyle: "default",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const loadingPath = path.join(__dirname, "loading.html");
  await win.loadFile(loadingPath);

  try {
    await startServerIfNeeded();
    await win.loadURL(`http://localhost:${serverPort}`);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    dialog.showErrorBox(
      "MuTok failed to start",
      `The local server did not start in time.\n\n${details}\n\nLog: ${path.join(
        app.getPath("userData"),
        "logs",
        "server.log"
      )}`
    );
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
