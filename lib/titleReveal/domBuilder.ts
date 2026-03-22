import type { TitleRevealAnimConfig } from "./types";
import { parseMarkup, segmentsToLines } from "./markupParser";
import { linesToMarkup } from "@/lib/utils/titleRevealMarkup";

// ---------------------------------------------------------------------------
// Build the onion-skin DOM structure inside a given container element
// ---------------------------------------------------------------------------

interface DomConfig {
  title: string;
  fontFamily: string;
  fontSize: number;
  colors: {
    text: string;
    ghostBlue: string;
    ghostNavy: string;
  };
}

function configToDomConfig(config: TitleRevealAnimConfig): DomConfig {
  return {
    title: linesToMarkup(config.lines),
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    colors: {
      text: config.colorText,
      ghostBlue: config.colorGhostBlue,
      ghostNavy: config.colorGhostNavy,
    },
  };
}

export function buildOnionSkinDOM(
  titleEl: HTMLElement,
  config: TitleRevealAnimConfig
): HTMLElement[] {
  const dc = configToDomConfig(config);
  const segments = parseMarkup(dc.title);
  const lines = segmentsToLines(segments);
  titleEl.innerHTML = "";

  const allCharWraps: HTMLElement[] = [];

  lines.forEach((line, lineIdx) => {
    const lineDiv = document.createElement("div");
    lineDiv.className = "title-line";

    // Line-height matches the actual font size used in this line
    const segSizes = line.segments
      .map((seg) => seg.style.fontSize)
      .filter(Boolean) as number[];
    const lineFontSize =
      segSizes.length > 0 ? Math.max(...segSizes) : dc.fontSize;
    lineDiv.style.lineHeight = `${lineFontSize * 0.74}px`;

    // Line gap
    if (lineIdx > 0 && line.gap !== undefined) {
      lineDiv.style.marginTop = `${line.gap}px`;
    }

    // Alignment: applied after first render via JS (see below)
    if (line.align) lineDiv.dataset.align = line.align;

    for (const seg of line.segments) {
      const chars = [...seg.text];

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];

        if (ch === " ") {
          const spacer = document.createElement("span");
          spacer.className = "word-space";
          if (seg.style.fontSize)
            spacer.style.fontSize = `${seg.style.fontSize}px`;
          lineDiv.appendChild(spacer);
          continue;
        }

        const wrap = document.createElement("span");
        wrap.className = "char-wrap";

        if (seg.style.fontSize)
          wrap.style.fontSize = `${seg.style.fontSize}px`;
        if (seg.style.x && i === 0)
          wrap.style.marginLeft = `${seg.style.x}px`;
        if (seg.style.y) {
          wrap.style.position = "relative";
          wrap.style.top = `${seg.style.y}px`;
        }
        if (seg.style.rotation)
          wrap.style.transform = `rotate(${seg.style.rotation}deg)`;

        const ghostBlue = document.createElement("span");
        ghostBlue.className = "ghost ghost-blue";
        ghostBlue.textContent = ch;
        ghostBlue.style.color = dc.colors.ghostBlue;

        const ghostNavy = document.createElement("span");
        ghostNavy.className = "ghost ghost-navy";
        ghostNavy.textContent = ch;
        ghostNavy.style.color = dc.colors.ghostNavy;

        const main = document.createElement("span");
        main.className = "char";
        main.textContent = ch;
        if (seg.style.color) main.style.color = seg.style.color;

        wrap.appendChild(ghostBlue);
        wrap.appendChild(ghostNavy);
        wrap.appendChild(main);
        lineDiv.appendChild(wrap);
        allCharWraps.push(wrap);
      }
    }

    titleEl.appendChild(lineDiv);
  });

  // Align lines relative to the first line's width
  // Force layout so offsetWidth is accurate
  titleEl.style.visibility = "hidden";
  titleEl.style.opacity = "1";
  void titleEl.offsetWidth; // force reflow

  const lineDivs = titleEl.querySelectorAll<HTMLElement>(".title-line");
  if (lineDivs.length >= 2) {
    const firstWidth = lineDivs[0].offsetWidth;

    for (let i = 1; i < lineDivs.length; i++) {
      const div = lineDivs[i];
      const align = div.dataset.align;
      if (!align) continue;
      const thisWidth = div.offsetWidth;
      const diff = firstWidth - thisWidth;
      switch (align) {
        case "r":
          div.style.marginLeft = `${diff}px`;
          break;
        case "c":
          div.style.marginLeft = `${diff / 2}px`;
          break;
        case "l":
          break;
      }
    }
  }

  titleEl.style.visibility = "";
  titleEl.style.opacity = "";

  return allCharWraps;
}
