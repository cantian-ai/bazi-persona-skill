import readline from "node:readline";
import { createInterface } from "node:readline/promises";

export interface ConfirmPromptOptions {
  cancelLabel: string;
  confirmLabel: string;
  defaultChoice?: "confirm" | "cancel";
  title: string;
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function restoreTerminal(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdout.write("\x1b[?25h");
}

function renderMenu(
  title: string,
  index: number,
  confirmLabel: string,
  cancelLabel: string,
  redrawRows = 0,
): number {
  const rows = [
    title,
    "",
    `${index === 0 ? "›" : " "} 1) ${confirmLabel}`,
    `${index === 1 ? "›" : " "} 2) ${cancelLabel}`,
    "",
    "按 Enter 确认（默认 1）｜↑↓ 切换｜支持 y/n 或 1/2",
  ];
  if (redrawRows > 0) {
    readline.moveCursor(process.stdout, 0, -redrawRows);
  }
  readline.clearScreenDown(process.stdout);
  process.stdout.write(`${rows.join("\n")}\n`);
  return rows.length + 1;
}

export async function confirmWithMenu(
  options: ConfirmPromptOptions,
): Promise<boolean> {
  const defaultChoice = options.defaultChoice ?? "confirm";
  if (!isInteractive()) {
    return defaultChoice === "confirm";
  }

  return await new Promise<boolean>((resolve, reject) => {
    let selected = defaultChoice === "confirm" ? 0 : 1;
    let redrawRows = 0;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    redrawRows = renderMenu(
      options.title,
      selected,
      options.confirmLabel,
      options.cancelLabel,
      redrawRows,
    );

    const onKeypress = (_: string, key: readline.Key) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("已取消操作。"));
        return;
      }
      if (key.name === "up") {
        selected = selected === 0 ? 1 : 0;
        redrawRows = renderMenu(
          options.title,
          selected,
          options.confirmLabel,
          options.cancelLabel,
          redrawRows,
        );
        return;
      }
      if (key.name === "down") {
        selected = selected === 1 ? 0 : 1;
        redrawRows = renderMenu(
          options.title,
          selected,
          options.confirmLabel,
          options.cancelLabel,
          redrawRows,
        );
        return;
      }
      if (key.name === "return") {
        cleanup();
        resolve(selected === 0);
        return;
      }
      if (key.name === "1" || key.name === "y") {
        cleanup();
        resolve(true);
        return;
      }
      if (key.name === "2" || key.name === "n") {
        cleanup();
        resolve(false);
      }
    };

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      restoreTerminal();
      process.stdout.write("\n");
    };

    process.stdin.on("keypress", onKeypress);
  });
}

export async function promptOptionalText(options: {
  prompt: string;
  hint?: string;
}): Promise<string | undefined> {
  if (!isInteractive()) {
    return undefined;
  }
  if (options.hint) {
    process.stdout.write(`${options.hint}\n`);
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (await rl.question(`${options.prompt} `)).trim();
    return answer || undefined;
  } finally {
    rl.close();
  }
}
