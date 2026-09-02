export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
  highlightWords?: string[];
}

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function toSrt(cues: SubtitleCue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

function assTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const c = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${h}:${pad(m)}:${pad(s)}.${String(c).padStart(3, "0")}`;
}

export function toAss(
  cues: SubtitleCue[],
  opts?: {
    width?: number;
    height?: number;
    font?: string;
    fontSize?: number;
    fontColor?: string;
    outlineColor?: string;
  }
): string {
  const width = opts?.width ?? 1080;
  const height = opts?.height ?? 1920;
  const font = opts?.font ?? "Noto Sans Bengali";
  const fontSize = opts?.fontSize ?? 58;
  const fontColor = opts?.fontColor ?? "&HFFFFFF";
  const outlineColor = opts?.outlineColor ?? "&H000000";
  const marginV = 90;

  const lines: string[] = [
    "[Script Info]",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
    `Style: Default,${font},${fontSize},${fontColor},${fontColor},${outlineColor},&H80000000,1,0,0,0,100,100,0,0,1,3,1,2,60,60,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  for (const cue of cues) {
    const text = assEscape(cue.text);
    lines.push(
      `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${text}`
    );
  }
  return lines.join("\n");
}

function assEscape(text: string): string {
  return text.replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}
