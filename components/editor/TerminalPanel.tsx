"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

type TerminalResult = {
  output: string;
  exitCode: number;
  runtime: number;
  timestamp: number;
} | null;

type TerminalPanelProps = {
  result: TerminalResult;
  running: boolean;
  stdin: string;
  onStdinChange: (value: string) => void;
};

export default function TerminalPanel({
  result,
  running,
  stdin,
  onStdinChange,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const stdinRef = useRef(stdin);

  useEffect(() => {
    stdinRef.current = stdin;
  }, [stdin]);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new XTerminal({
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#3b82f6",
        cursorAccent: "#09090b",
        selectionBackground: "rgba(59, 130, 246, 0.5)",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#d946ef",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#e879f9",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const inputDisposable = terminal.onData((data) => {
      if (data === "\u007f") {
        if (stdinRef.current.length === 0) return;
        const nextValue = stdinRef.current.slice(0, -1);
        stdinRef.current = nextValue;
        onStdinChange(nextValue);
        terminal.write("\b \b");
        return;
      }

      if (data === "\r") {
        const nextValue = `${stdinRef.current}\n`;
        stdinRef.current = nextValue;
        onStdinChange(nextValue);
        terminal.write("\r\n");
        return;
      }

      if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126) {
        const nextValue = `${stdinRef.current}${data}`;
        stdinRef.current = nextValue;
        onStdinChange(nextValue);
        terminal.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // xterm can throw while its container is settling.
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [onStdinChange]);

  useEffect(() => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!terminal) return;

    terminal.clear();
    terminal.writeln("\x1b[36mPairSpace execution terminal\x1b[0m");
    terminal.writeln(running ? "\x1b[33mStatus: Running...\x1b[0m" : "Status: Idle");

    if (result) {
      const exitColor = result.exitCode === 0 ? "\x1b[32m" : "\x1b[31m";
      terminal.writeln(`${exitColor}Exit code: ${result.exitCode}\x1b[0m`);
      terminal.writeln("");
      terminal.writeln(result.output || "(no output)");
    } else {
      terminal.writeln("Exit code: --");
      terminal.writeln("");
      terminal.writeln("Run code to see output here.");
    }

    terminal.writeln("");
    terminal.write("\x1b[35mstdin>\x1b[0m ");
    terminal.write(stdinRef.current.replace(/\n/g, "\r\n"));

    try {
      fitAddon?.fit();
    } catch {
      // Ignore fit races during tab/layout changes.
    }
  }, [result, running]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[22rem] w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
    />
  );
}
