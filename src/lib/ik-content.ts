const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const WORD_MARKUP_PATTERN =
  /mso-|MsoNormal|MsoList|WordSection|@font-face|@list|Style Definitions|Font Definitions|Wingdings/i;

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "MAIN",
  "NAV",
  "P",
  "SECTION",
]);

const DROP_TAGS = new Set([
  "HEAD",
  "STYLE",
  "SCRIPT",
  "META",
  "LINK",
  "TITLE",
  "XML",
  "O:P",
  "O:SMARTTAGTYPE",
  "W:WORDDOCUMENT",
  "MATH",
]);

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const CONTENT_BLOCK_TAGS = new Set(["P", "BLOCKQUOTE", "FIGURE", "FIGCAPTION", "CAPTION"]);
const INLINE_TAGS = new Set(["A", "BR", "SPAN", "STRONG", "EM", "U", "S"]);
const LIST_TAGS = new Set(["OL", "UL", "LI"]);
const TABLE_TAGS = new Set([
  "COL",
  "COLGROUP",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
]);
const MEDIA_TAGS = new Set(["IMG"]);
const SAFE_STYLE_PROPERTIES = new Set([
  "aspect-ratio",
  "background-color",
  "border",
  "border-color",
  "border-style",
  "border-width",
  "color",
  "float",
  "font-family",
  "font-size",
  "height",
  "list-style-type",
  "margin-left",
  "margin-right",
  "max-width",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "vertical-align",
  "width",
]);
const WORD_VISUAL_STYLE_PROPERTIES = new Set([
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "mso-bidi-font-style",
  "mso-bidi-font-weight",
  "text-align",
  "text-decoration",
  "text-decoration-line",
]);
const BULLET_MARKERS = ["•", "·", "●", "○", "▪", "▫", "■", "□", "-", "*", "\uf0b7", "ï‚·"];

type ListType = "ol" | "ul";

type ParsedListLine = {
  indent: number;
  start?: number;
  text: string;
  type: ListType;
};

type ListFrame = {
  lastItem: HTMLLIElement | null;
  list: HTMLOListElement | HTMLUListElement;
  type: ListType;
};

type WordListInfo = {
  indent: number;
  start?: number;
  type: ListType;
};

type TextFormat = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
};

const hasDocument = () => typeof document !== "undefined";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeWhitespace = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();

const stripWordHtmlNoise = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[if !supportLists\]>/gi, "")
    .replace(/<!\[endif\]>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<xml[\s\S]*?<\/xml>/gi, "")
    .replace(/<\/?o:[^>]*>/gi, "")
    .replace(/<\/?w:[^>]*>/gi, "");

const isCssNoiseLine = (line: string) => {
  const value = line.trim();
  if (!value) return false;
  if (/^(\/\*|\*\/|<!--|-->|\{|\}|;)$/.test(value)) return true;
  if (/^(@font-face|@page|@list|\.[A-Za-z]*Mso|p\.Mso|li\.Mso|div\.Mso|div\.WordSection)/i.test(value)) {
    return true;
  }
  if (/^(panose-1|font-family|font-size|font-style|font-weight|margin|margin-|text-align|line-height|mso-|page:)/i.test(value)) {
    return true;
  }
  return WORD_MARKUP_PATTERN.test(value) && /[:{};]/.test(value);
};

const stripWordPlainTextNoise = (text: string) => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const cleanLines: string[] = [];
  let inComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<!--")) {
      inComment = true;
      if (trimmed.includes("-->")) {
        inComment = false;
      }
      continue;
    }
    if (inComment) {
      if (trimmed.includes("-->")) {
        inComment = false;
      }
      continue;
    }
    if (isCssNoiseLine(line)) {
      continue;
    }
    cleanLines.push(line);
  }

  return normalizeWhitespace(cleanLines.join("\n"));
};

const normalizeTagName = (tagName: string) => {
  const upper = tagName.toUpperCase();
  if (upper === "B") return "STRONG";
  if (upper === "I") return "EM";
  if (upper === "STRIKE" || upper === "DEL") return "S";
  if (
    upper === "SPAN" ||
    HEADING_TAGS.has(upper) ||
    CONTENT_BLOCK_TAGS.has(upper) ||
    TABLE_TAGS.has(upper) ||
    MEDIA_TAGS.has(upper)
  ) {
    return upper;
  }
  if (BLOCK_TAGS.has(upper)) return "P";
  return upper;
};

const isAllowedTag = (tagName: string) =>
  HEADING_TAGS.has(tagName) ||
  CONTENT_BLOCK_TAGS.has(tagName) ||
  INLINE_TAGS.has(tagName) ||
  LIST_TAGS.has(tagName) ||
  TABLE_TAGS.has(tagName) ||
  MEDIA_TAGS.has(tagName);

const isSafeUrl = (value: string, allowImageData = false) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (allowImageData && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)) {
    return true;
  }
  return /^(https?:|mailto:|tel:|\/|#|\.{1,2}\/)/i.test(trimmed);
};

const sanitizeClassName = (value: string) =>
  value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9_-]+$/.test(item))
    .join(" ");

const sanitizeStyle = (value: string) => {
  const safeRules = value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const separatorIndex = rule.indexOf(":");
      if (separatorIndex <= 0) return "";
      const property = rule.slice(0, separatorIndex).trim().toLowerCase();
      const propertyValue = rule.slice(separatorIndex + 1).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property)) return "";
      if (/expression\s*\(|javascript\s*:|url\s*\(/i.test(propertyValue)) return "";
      return `${property}: ${propertyValue}`;
    })
    .filter(Boolean);

  return safeRules.join("; ");
};

const sanitizeWordVisualStyle = (value: string) => {
  const safeRules = value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const separatorIndex = rule.indexOf(":");
      if (separatorIndex <= 0) return "";
      const property = rule.slice(0, separatorIndex).trim().toLowerCase();
      const propertyValue = rule
        .slice(separatorIndex + 1)
        .replace(/\s*!important\s*$/i, "")
        .trim();
      if (!WORD_VISUAL_STYLE_PROPERTIES.has(property)) return "";
      if (/expression\s*\(|javascript\s*:|url\s*\(/i.test(propertyValue)) return "";
      return `${property}: ${propertyValue}`;
    })
    .filter(Boolean);

  return safeRules.join("; ");
};

const inlineWordClassVisualStyles = (html: string) => {
  if (!hasDocument() || !/<style[\s>]/i.test(html) || !WORD_MARKUP_PATTERN.test(html)) {
    return html;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const stylesByClass = new Map<string, string[]>();

  parsed.querySelectorAll("style").forEach((styleElement) => {
    const css = styleElement.textContent ?? "";
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = rulePattern.exec(css))) {
      const visualStyle = sanitizeWordVisualStyle(match[2]);
      if (!visualStyle) continue;

      match[1].split(",").forEach((selector) => {
        const classMatches = Array.from(selector.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g));
        const className = classMatches.at(-1)?.[1];
        if (!className) return;
        const styles = stylesByClass.get(className) ?? [];
        styles.push(visualStyle);
        stylesByClass.set(className, styles);
      });
    }
  });

  parsed.body.querySelectorAll("[class]").forEach((element) => {
    const classStyles = Array.from(element.classList)
      .flatMap((className) => stylesByClass.get(className) ?? [])
      .filter(Boolean);
    if (classStyles.length === 0) return;

    const inlineStyle = element.getAttribute("style") ?? "";
    element.setAttribute("style", [...classStyles, inlineStyle].filter(Boolean).join("; "));
  });

  return parsed.body.innerHTML;
};

const copyNumberAttribute = (source: Element, target: Element, attributeName: string) => {
  const value = Number.parseInt(source.getAttribute(attributeName) ?? "", 10);
  if (Number.isFinite(value) && value > 0) {
    target.setAttribute(attributeName, String(value));
  }
};

const copySafeAttributes = (source: Element, target: Element, tagName: string) => {
  const className = sanitizeClassName(source.getAttribute("class") ?? "");
  const style = sanitizeStyle(source.getAttribute("style") ?? "");

  if (className && (tagName === "FIGURE" || tagName === "IMG" || TABLE_TAGS.has(tagName))) {
    target.setAttribute("class", className);
  }
  if (style) {
    target.setAttribute("style", style);
  }

  if (tagName === "A") {
    const href = source.getAttribute("href") ?? "";
    if (isSafeUrl(href)) {
      target.setAttribute("href", href.trim());
      if (source.getAttribute("target") === "_blank") {
        target.setAttribute("target", "_blank");
        target.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  if (tagName === "IMG") {
    const src = source.getAttribute("src") ?? "";
    if (isSafeUrl(src, true)) {
      target.setAttribute("src", src.trim());
    }
    const alt = source.getAttribute("alt");
    if (alt) {
      target.setAttribute("alt", alt.slice(0, 250));
    }
    copyNumberAttribute(source, target, "width");
    copyNumberAttribute(source, target, "height");
  }

  if (tagName === "OL") {
    copyNumberAttribute(source, target, "start");
    if (source.hasAttribute("reversed")) {
      target.setAttribute("reversed", "");
    }
  }

  if (tagName === "LI") {
    copyNumberAttribute(source, target, "value");
  }

  if (tagName === "TD" || tagName === "TH") {
    copyNumberAttribute(source, target, "colspan");
    copyNumberAttribute(source, target, "rowspan");
  }
};

const getTextFormat = (element: Element, tagName: string): TextFormat => {
  const style = element.getAttribute("style") ?? "";
  const normalizedStyle = style.replace(/\s+/g, " ").toLowerCase();
  const className = element.getAttribute("class") ?? "";
  const textDecoration = [
    element.getAttribute("text-decoration") ?? "",
    normalizedStyle,
  ].join(" ");

  return {
    bold:
      tagName === "B" ||
      tagName === "STRONG" ||
      /\bfont-weight\s*:\s*(bold|[6-9]00)\b/i.test(normalizedStyle) ||
      /\bmso-bidi-font-weight\s*:\s*bold\b/i.test(normalizedStyle),
    italic:
      tagName === "I" ||
      tagName === "EM" ||
      /\bfont-style\s*:\s*(italic|oblique)\b/i.test(normalizedStyle) ||
      /\bmso-bidi-font-style\s*:\s*italic\b/i.test(normalizedStyle),
    strike:
      tagName === "S" ||
      tagName === "STRIKE" ||
      tagName === "DEL" ||
      /\b(line-through|text-line-through)\b/i.test(textDecoration),
    underline:
      tagName === "U" ||
      /\bunderline\b/i.test(textDecoration) ||
      /\bMsoHyperlink\b/.test(className),
  };
};

const applyTextFormat = (target: Node, format: TextFormat) => {
  let current = target;
  const wrappers: Array<[boolean, keyof HTMLElementTagNameMap]> = [
    [format.bold, "strong"],
    [format.italic, "em"],
    [format.underline, "u"],
    [format.strike, "s"],
  ];

  wrappers.forEach(([enabled, tagName]) => {
    if (!enabled) return;
    const wrapper = document.createElement(tagName);
    current.appendChild(wrapper);
    current = wrapper;
  });

  return current;
};

const appendSanitizedChildren = (source: Node, target: Node) => {
  Array.from(source.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ""));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const sourceElement = child as Element;
    const originalTagName = sourceElement.tagName.toUpperCase();
    if (DROP_TAGS.has(originalTagName)) {
      return;
    }

    const tagName = normalizeTagName(originalTagName);
    const textFormat = getTextFormat(sourceElement, originalTagName);
    if (!tagName) {
      const fragment = document.createDocumentFragment();
      appendSanitizedChildren(sourceElement, applyTextFormat(fragment, textFormat));
      target.appendChild(fragment);
      return;
    }
    if (!isAllowedTag(tagName)) {
      const fragment = document.createDocumentFragment();
      appendSanitizedChildren(sourceElement, applyTextFormat(fragment, textFormat));
      target.appendChild(fragment);
      return;
    }

    const clean = document.createElement(tagName.toLowerCase());
    copySafeAttributes(sourceElement, clean, tagName);
    if (tagName === "IMG" && !clean.getAttribute("src")) {
      return;
    }
    const childFormat = {
      ...textFormat,
      bold: tagName === "STRONG" ? false : textFormat.bold,
      italic: tagName === "EM" ? false : textFormat.italic,
      strike: tagName === "S" ? false : textFormat.strike,
      underline: tagName === "U" ? false : textFormat.underline,
    };
    const childTarget =
      tagName === "P" ||
      tagName === "LI" ||
      HEADING_TAGS.has(tagName) ||
      CONTENT_BLOCK_TAGS.has(tagName) ||
      INLINE_TAGS.has(tagName)
        ? applyTextFormat(clean, childFormat)
        : clean;
    if (tagName !== "BR" && tagName !== "IMG" && tagName !== "COL") {
      appendSanitizedChildren(sourceElement, childTarget);
    }
    target.appendChild(clean);
  });
};

const cleanEmptyMarkup = (root: HTMLElement) => {
  root.querySelectorAll("font,style,script,meta,link,xml").forEach((node) => {
    node.remove();
  });

  root.querySelectorAll("li").forEach((node) => {
    const text = node.textContent?.trim() ?? "";
    if (!text && node.children.length === 0) {
      node.remove();
    }
  });

  root.querySelectorAll("ol,ul").forEach((node) => {
    if (node.children.length === 0) {
      node.remove();
    }
  });

  root.querySelectorAll("p").forEach((node) => {
    const text = node.textContent?.trim() ?? "";
    if (!text && node.children.length === 0) {
      node.remove();
    }
  });
};

const htmlToPlainText = (html: string) => {
  if (!hasDocument()) {
    return stripWordPlainTextNoise(html.replace(/<[^>]*>/g, "\n"));
  }

  const container = document.createElement("div");
  container.innerHTML = stripWordHtmlNoise(html);
  return stripWordPlainTextNoise(container.textContent ?? "");
};

const parseListLine = (line: string): ParsedListLine | null => {
  const leading = line.match(/^[\t ]*/)?.[0] ?? "";
  const indent = leading.replace(/\t/g, "    ").length;
  const trimmed = line.trim();
  const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
  if (ordered) {
    return {
      indent,
      start: Number.parseInt(ordered[1], 10),
      text: ordered[2].trim(),
      type: "ol",
    };
  }

  for (const marker of BULLET_MARKERS) {
    if (trimmed.startsWith(`${marker} `) || trimmed.startsWith(`${marker}\t`)) {
      return {
        indent,
        text: trimmed.slice(marker.length).trim(),
        type: "ul",
      };
    }
  }

  return null;
};

const appendParagraph = (parent: Element, text: string) => {
  const p = document.createElement("p");
  p.textContent = text;
  parent.appendChild(p);
};

const makeList = (type: ListType, start?: number) => {
  const list = document.createElement(type);
  if (type === "ol" && start && start > 1) {
    list.setAttribute("start", String(start));
  }
  return list;
};

const getWordListMarkerElement = (element: Element) =>
  Array.from(element.querySelectorAll("[style]")).find((node) =>
    /mso-list\s*:\s*ignore/i.test(node.getAttribute("style") ?? "")
  );

const normalizeMarkerText = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const getWordListInfo = (element: Element): WordListInfo | null => {
  const style = element.getAttribute("style") ?? "";
  const className = element.getAttribute("class") ?? "";
  const markerElement = getWordListMarkerElement(element);
  const hasWordList =
    /mso-list\s*:/i.test(style) ||
    /MsoListParagraph/i.test(className) ||
    Boolean(markerElement);

  if (!hasWordList) return null;

  const markerText = normalizeMarkerText(markerElement?.textContent ?? "");
  const levelMatch = style.match(/\blevel(\d+)\b/i);
  const marginMatch = style.match(/margin-left\s*:\s*([0-9.]+)\s*pt/i);
  const level = levelMatch
    ? Math.max(0, Number.parseInt(levelMatch[1], 10) - 1)
    : marginMatch
      ? Math.max(0, Math.round(Number.parseFloat(marginMatch[1]) / 36) - 1)
      : 0;
  const orderedMatch = markerText.match(/^(\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]/);
  const numericStart = markerText.match(/^(\d+)[.)]/);

  return {
    indent: Number.isFinite(level) ? Math.min(5, level) : 0,
    start: numericStart ? Number.parseInt(numericStart[1], 10) : undefined,
    type: orderedMatch ? "ol" : "ul",
  };
};

const removeWordListMarkers = (element: Element) => {
  element.querySelectorAll("[style]").forEach((node) => {
    const style = node.getAttribute("style") ?? "";
    if (/mso-list\s*:\s*ignore/i.test(style)) {
      node.remove();
    }
  });
};

const createWordListItem = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  removeWordListMarkers(clone);

  const item = document.createElement("li");
  appendSanitizedChildren(clone, item);
  cleanEmptyMarkup(item);
  return item;
};

const convertWordListsInContainer = (container: Element) => {
  Array.from(container.children).forEach((child) => {
    if (!getWordListInfo(child)) {
      convertWordListsInContainer(child);
    }
  });

  const originalNodes = Array.from(container.childNodes);
  if (
    !originalNodes.some(
      (node) => node.nodeType === Node.ELEMENT_NODE && getWordListInfo(node as Element)
    )
  ) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const stack: ListFrame[] = [];

  originalNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.textContent?.trim()) {
        stack.splice(0);
        fragment.appendChild(node);
      }
      return;
    }

    const element = node as Element;
    const listInfo = getWordListInfo(element);
    if (!listInfo) {
      stack.splice(0);
      fragment.appendChild(element);
      return;
    }

    let level = listInfo.indent;
    if (level > 0 && !stack[level - 1]?.lastItem) {
      level = 0;
    }

    let frame = stack[level];
    if (!frame || frame.type !== listInfo.type) {
      const list = makeList(listInfo.type, listInfo.start);
      frame = { lastItem: null, list, type: listInfo.type };
      if (level === 0) {
        fragment.appendChild(list);
      } else {
        stack[level - 1].lastItem?.appendChild(list);
      }
      stack[level] = frame;
    } else if (listInfo.type === "ol" && listInfo.start && frame.list.children.length === 0) {
      frame.list.setAttribute("start", String(listInfo.start));
    }
    stack.splice(level + 1);

    const item = createWordListItem(element);
    frame.list.appendChild(item);
    frame.lastItem = item;
  });

  container.replaceChildren(fragment);
};

const plainTextToHtml = (text: string) => {
  const cleanText = stripWordPlainTextNoise(text);
  if (!cleanText) return "";
  if (!hasDocument()) {
    return escapeHtml(cleanText).replace(/\n/g, "<br>");
  }

  const root = document.createElement("div");
  const stack: ListFrame[] = [];
  let previousLineWasList = false;

  const ensureList = (parsed: ParsedListLine) => {
    let level = Math.min(5, Math.floor(parsed.indent / 3));
    if (
      parsed.type === "ul" &&
      level === 0 &&
      stack[0]?.type === "ol" &&
      stack[0].lastItem
    ) {
      level = 1;
    }
    if (level > 0 && !stack[level - 1]?.lastItem) {
      level = 0;
    }

    const existing = stack[level];
    if (existing?.type === parsed.type) {
      stack.splice(level + 1);
      return existing;
    }

    const list = makeList(parsed.type, parsed.start);
    const frame: ListFrame = { lastItem: null, list, type: parsed.type };
    if (level === 0) {
      root.appendChild(list);
    } else {
      stack[level - 1].lastItem?.appendChild(list);
    }
    stack[level] = frame;
    stack.splice(level + 1);
    return frame;
  };

  cleanText.split("\n").forEach((line) => {
    if (!line.trim()) {
      stack.splice(0);
      previousLineWasList = false;
      return;
    }

    const parsed = parseListLine(line);
    if (parsed) {
      const frame = ensureList(parsed);
      const item = document.createElement("li");
      item.textContent = parsed.text;
      frame.list.appendChild(item);
      frame.lastItem = item;
      previousLineWasList = true;
      return;
    }

    const targetFrame = stack[stack.length - 1];
    if (previousLineWasList && targetFrame?.lastItem) {
      appendParagraph(targetFrame.lastItem, line.trim());
    } else {
      stack.splice(0);
      appendParagraph(root, line.trim());
    }
    previousLineWasList = false;
  });

  return root.innerHTML;
};

const sanitizeHtmlToSafe = (html: string) => {
  const cleaned = stripWordHtmlNoise(inlineWordClassVisualStyles(html));
  if (!cleaned.trim()) return "";
  if (!hasDocument()) {
    return escapeHtml(htmlToPlainText(cleaned)).replace(/\n/g, "<br>");
  }

  const source = document.createElement("div");
  source.innerHTML = cleaned;

  convertWordListsInContainer(source);
  removeWordListMarkers(source);

  const sanitized = document.createElement("div");
  appendSanitizedChildren(source, sanitized);
  cleanEmptyMarkup(sanitized);
  return sanitized.innerHTML.trim();
};

export const normalizePastedIkContent = (html: string, text: string) => {
  if (html.trim()) {
    const sanitizedHtml = sanitizeHtmlToSafe(html);
    if (sanitizedHtml && !WORD_MARKUP_PATTERN.test(sanitizedHtml)) {
      return sanitizedHtml;
    }
  }

  const plainHtml = plainTextToHtml(text || htmlToPlainText(html));
  if (plainHtml) return plainHtml;

  return html.trim() ? sanitizeHtmlToSafe(html) : "";
};

export const normalizeIkContentForStorage = (value: string) => {
  const raw = value ?? "";
  if (!raw.trim()) return "";
  const normalized = HTML_TAG_PATTERN.test(raw)
    ? sanitizeHtmlToSafe(raw)
    : plainTextToHtml(raw);

  if (WORD_MARKUP_PATTERN.test(normalized)) {
    return plainTextToHtml(htmlToPlainText(normalized));
  }
  return normalized;
};

export const getIkContentPlainText = (value: string | null | undefined) => {
  const raw = value ?? "";
  if (!raw.trim()) return "";
  if (!hasDocument()) {
    return normalizeWhitespace(raw.replace(/<[^>]*>/g, " "));
  }

  const container = document.createElement("div");
  container.innerHTML = normalizeIkContentForStorage(raw);
  return normalizeWhitespace(container.textContent ?? "");
};
