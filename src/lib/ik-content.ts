const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const WORD_MARKUP_PATTERN =
  /mso-|MsoNormal|MsoList|WordSection|@font-face|@list|Style Definitions|Font Definitions|Wingdings/i;
const WORD_LIST_MARKUP_PATTERN = /mso-list\s*:|MsoListParagraph|@list\s+l\d+|supportLists/i;

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
  "border-collapse",
  "border-color",
  "border-spacing",
  "border-style",
  "border-width",
  "color",
  "float",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "line-height",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-decoration-line",
  "text-indent",
  "vertical-align",
  "width",
]);
const WORD_VISUAL_STYLE_PROPERTIES = new Set([
  "background-color",
  "border",
  "border-collapse",
  "border-color",
  "border-spacing",
  "border-style",
  "border-width",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "mso-list",
  "mso-bidi-font-style",
  "mso-bidi-font-weight",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "text-decoration-line",
  "text-indent",
  "vertical-align",
  "width",
]);
const BULLET_MARKERS = [
  "\u2022",
  "\u00b7",
  "\u25cf",
  "\u25cb",
  "\u25aa",
  "\u25ab",
  "\u25a0",
  "\u25a1",
  "\uf0b7",
  "-",
  "*",
  "o",
  "ï‚·",
];
const MAX_LIST_INDENT_LEVEL = 12;

type ListType = "ol" | "ul";

type ParsedListLine = {
  indent: number;
  start?: number;
  styleType?: string;
  text: string;
  type: ListType;
};

type ListFrame = {
  lastItem: HTMLLIElement | null;
  list: HTMLOListElement | HTMLUListElement;
  listKey?: string;
  styleType?: string;
  type: ListType;
};

type WordListInfo = {
  indent: number;
  listKey?: string;
  start?: number;
  styleType?: string;
  type: ListType;
};

type WordListDefinition = {
  start?: number;
  styleType?: string;
  type: ListType;
};

type WordListDefinitions = Map<string, WordListDefinition>;

type TextFormat = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
};

const INLINE_TEXT_FORMAT_TAGS = new Set([
  "A",
  "B",
  "DEL",
  "EM",
  "FONT",
  "I",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "U",
]);

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
  if (allowImageData && /^data:image\/(?:bmp|png|jpe?g|gif|webp);base64,/i.test(trimmed)) {
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

const ORDERED_LIST_TYPE_STYLES: Record<string, string> = {
  "1": "decimal",
  A: "upper-alpha",
  I: "upper-roman",
  a: "lower-alpha",
  i: "lower-roman",
};

const BULLETED_LIST_TYPE_STYLES: Record<string, string> = {
  circle: "circle",
  disc: "disc",
  square: "square",
};

const appendStyleRule = (style: string, property: string, value: string) => {
  if (new RegExp(`(?:^|;)\\s*${property}\\s*:`, "i").test(style)) {
    return style;
  }

  return [style, `${property}: ${value}`].filter(Boolean).join("; ");
};

const getListTypeStyle = (source: Element, tagName: string) => {
  const type = source.getAttribute("type")?.trim() ?? "";
  if (!type) return "";

  if (tagName === "OL") {
    return ORDERED_LIST_TYPE_STYLES[type] ?? "";
  }

  if (tagName === "UL") {
    return BULLETED_LIST_TYPE_STYLES[type.toLowerCase()] ?? "";
  }

  return "";
};

const copySafeAttributes = (source: Element, target: Element, tagName: string) => {
  const className = sanitizeClassName(source.getAttribute("class") ?? "");
  let style = sanitizeStyle(source.getAttribute("style") ?? "");
  const listTypeStyle = getListTypeStyle(source, tagName);
  if (listTypeStyle) {
    style = appendStyleRule(style, "list-style-type", listTypeStyle);
  }
  if (!INLINE_TEXT_FORMAT_TAGS.has(tagName)) {
    style = style
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => {
        const property = rule.split(":")[0]?.trim().toLowerCase();
        return property !== "text-decoration" && property !== "text-decoration-line";
      })
      .join("; ");
  }

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
  const shouldReadStyleFormat = INLINE_TEXT_FORMAT_TAGS.has(tagName);

  return {
    bold:
      tagName === "B" ||
      tagName === "STRONG" ||
      (shouldReadStyleFormat &&
        (/\bfont-weight\s*:\s*(bold|[6-9]00)\b/i.test(normalizedStyle) ||
          /\bmso-bidi-font-weight\s*:\s*bold\b/i.test(normalizedStyle))),
    italic:
      tagName === "I" ||
      tagName === "EM" ||
      (shouldReadStyleFormat &&
        (/\bfont-style\s*:\s*(italic|oblique)\b/i.test(normalizedStyle) ||
          /\bmso-bidi-font-style\s*:\s*italic\b/i.test(normalizedStyle))),
    strike:
      tagName === "S" ||
      tagName === "STRIKE" ||
      tagName === "DEL" ||
      (shouldReadStyleFormat &&
        /\b(line-through|text-line-through)\b/i.test(textDecoration)),
    underline:
      tagName === "U" ||
      (shouldReadStyleFormat &&
        (/\bunderline\b/i.test(textDecoration) ||
          /\bMsoHyperlink\b/.test(className))),
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
  const ordered = trimmed.match(/^(\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]\s+(.+)$/);
  if (ordered) {
    const orderedMarker = getOrderedMarkerInfo(`${ordered[1]}.`);
    return {
      indent,
      start: orderedMarker?.start,
      styleType: orderedMarker?.styleType,
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

const getPlainTextListLevel = (indent: number) =>
  Math.min(MAX_LIST_INDENT_LEVEL, indent > 0 ? Math.max(1, Math.round(indent / 4)) : 0);

export const hasMeaningfulPlainTextList = (text: string) => {
  const cleanText = stripWordPlainTextNoise(text);
  if (!cleanText) return false;

  const parsedLines = cleanText
    .split("\n")
    .map((line) => parseListLine(line))
    .filter((line): line is ParsedListLine => Boolean(line));

  if (parsedLines.length < 2) return false;

  const hasTopLevelItem = parsedLines.some(
    (line) => getPlainTextListLevel(line.indent) === 0
  );
  const hasNestedItem = parsedLines.some(
    (line) => getPlainTextListLevel(line.indent) > 0
  );
  const hasRepeatedListType = parsedLines.some((line, index) =>
    parsedLines.slice(index + 1).some((nextLine) => nextLine.type === line.type)
  );

  return hasTopLevelItem && (hasNestedItem || hasRepeatedListType);
};

const appendParagraph = (parent: Element, text: string) => {
  const p = document.createElement("p");
  p.textContent = text;
  parent.appendChild(p);
};

const makeList = (type: ListType, start?: number, styleType?: string) => {
  const list = document.createElement(type);
  if (type === "ol" && start && start > 1) {
    list.setAttribute("start", String(start));
  }
  if (styleType) {
    list.style.listStyleType = styleType;
  }
  return list;
};

const normalizeListLevel = (requestedLevel: number, stack: ListFrame[]) => {
  const boundedLevel = Math.max(0, Math.min(MAX_LIST_INDENT_LEVEL, requestedLevel));
  if (boundedLevel === 0 || stack[boundedLevel - 1]?.lastItem) {
    return boundedLevel;
  }

  for (let index = boundedLevel - 1; index >= 0; index -= 1) {
    if (stack[index]?.lastItem) {
      return index + 1;
    }
  }

  return 0;
};

const cssLengthToPoints = (value: string) => {
  const match = value.trim().match(/^(-?[0-9.]+)\s*(pt|px|in|cm|mm)?$/i);
  if (!match) return null;

  const numericValue = Number.parseFloat(match[1]);
  if (!Number.isFinite(numericValue)) return null;

  const unit = (match[2] ?? "pt").toLowerCase();
  if (unit === "pt") return numericValue;
  if (unit === "px") return numericValue * 0.75;
  if (unit === "in") return numericValue * 72;
  if (unit === "cm") return numericValue * 28.3465;
  if (unit === "mm") return numericValue * 2.83465;
  return null;
};

const getElementMarginLeftPoints = (element: Element) => {
  const style = element.getAttribute("style") ?? "";
  const match = style.match(/(?:^|;)\s*margin-left\s*:\s*([^;]+)/i);
  const shorthandMatch = style.match(/(?:^|;)\s*margin\s*:\s*([^;]+)/i);
  const shorthandValues = shorthandMatch
    ? shorthandMatch[1].trim().split(/\s+/).filter(Boolean)
    : [];
  const shorthandLeft =
    shorthandValues.length >= 4
      ? shorthandValues[3]
      : shorthandValues.length >= 2
        ? shorthandValues[1]
        : shorthandValues[0];
  const points = match
    ? cssLengthToPoints(match[1])
    : shorthandLeft
      ? cssLengthToPoints(shorthandLeft)
      : null;
  return points === null ? null : Math.round(points * 2) / 2;
};

const getExplicitWordListLevel = (element: Element) => {
  const style = element.getAttribute("style") ?? "";
  const msoListMatch = style.match(/(?:^|;)\s*mso-list\s*:\s*[^;]*\blevel(\d+)\b/i);
  if (!msoListMatch) return null;

  const level = Number.parseInt(msoListMatch[1], 10);
  if (!Number.isFinite(level) || level <= 0) return null;

  return Math.min(MAX_LIST_INDENT_LEVEL, level - 1);
};

const getCssDeclaration = (value: string, property: string) => {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "i"))?.[1]
    ?.replace(/^["']|["']$/g, "")
    .trim();
};

const getWordListDefinitionKey = (listId: string, level: number) => `${listId}:${level}`;

const parseWordListReference = (msoListValue: string) => {
  const match = msoListValue.match(/\bl(\d+)\s+level(\d+)\s+lfo(\d+)/i);
  if (!match) return null;

  const level = Number.parseInt(match[2], 10);
  if (!Number.isFinite(level) || level <= 0) return null;

  return {
    definitionKey: getWordListDefinitionKey(match[1], level),
    listKey: `${match[1]}:${match[3]}`,
    level,
  };
};

const resolveWordListDefinitionType = (
  numberFormat: string | undefined,
  levelText: string | undefined
): Pick<WordListDefinition, "styleType" | "type"> => {
  const format = (numberFormat ?? "").toLowerCase();
  const text = levelText ?? "";

  if (format.includes("bullet") || (!/%\d+/.test(text) && /[\u2022\u00b7\u25cf\u25cb\u25aa\u25ab\u25a0\u25a1\uf0b7]/.test(text))) {
    return { type: "ul" };
  }
  if (format.includes("alpha-upper")) {
    return { styleType: "upper-alpha", type: "ol" };
  }
  if (format.includes("alpha-lower")) {
    return { styleType: "lower-alpha", type: "ol" };
  }
  if (format.includes("roman-upper")) {
    return { styleType: "upper-roman", type: "ol" };
  }
  if (format.includes("roman-lower")) {
    return { styleType: "lower-roman", type: "ol" };
  }

  return { styleType: "decimal", type: "ol" };
};

const parseWordListDefinitions = (html: string): WordListDefinitions => {
  const definitions: WordListDefinitions = new Map();
  const listRulePattern = /@list\s+l(\d+):level(\d+)\s*\{([\s\S]*?)\}/gi;
  let match: RegExpExecArray | null;

  while ((match = listRulePattern.exec(html))) {
    const level = Number.parseInt(match[2], 10);
    if (!Number.isFinite(level) || level <= 0) continue;

    const declarations = match[3];
    const start = Number.parseInt(getCssDeclaration(declarations, "mso-level-start-at") ?? "", 10);
    const listType = resolveWordListDefinitionType(
      getCssDeclaration(declarations, "mso-level-number-format"),
      getCssDeclaration(declarations, "mso-level-text")
    );

    definitions.set(getWordListDefinitionKey(match[1], level), {
      ...listType,
      start: Number.isFinite(start) && start > 0 ? start : undefined,
    });
  }

  return definitions;
};

const createWordListLevelResolver = (nodes: Node[], definitions?: WordListDefinitions) => {
  const listMargins = Array.from(
    new Set(
      nodes
        .filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE)
        .filter((element) => Boolean(getWordListInfo(element, definitions)))
        .map((element) => getElementMarginLeftPoints(element))
        .filter((value): value is number => value !== null)
    )
  ).sort((left, right) => left - right);

  const resolveMarginLevel = (element: Element) => {
    const margin = getElementMarginLeftPoints(element);
    if (margin === null || listMargins.length < 2) return null;

    const exactLevel = listMargins.findIndex((item) => Math.abs(item - margin) <= 1);
    if (exactLevel >= 0) return exactLevel;

    const lowerMarginCount = listMargins.filter((item) => item < margin).length;
    return Math.max(0, Math.min(MAX_LIST_INDENT_LEVEL, lowerMarginCount));
  };

  const resolveListLevel = (element: Element, fallbackLevel: number) => {
    const marginLevel = resolveMarginLevel(element);
    if (marginLevel !== null) return marginLevel;

    const explicitLevel = getExplicitWordListLevel(element);
    if (explicitLevel !== null) return explicitLevel;

    return fallbackLevel;
  };

  const resolveContinuationLevel = (element: Element, stack: ListFrame[]) => {
    const inferredLevel = resolveMarginLevel(element);
    if (inferredLevel === null) return null;

    for (let level = Math.min(inferredLevel, stack.length - 1); level >= 0; level -= 1) {
      if (stack[level]?.lastItem) return level;
    }

    return null;
  };

  return {
    resolveMarginLevel,
    resolveContinuationLevel,
    resolveListLevel,
  };
};

const resolveStackMarginListLevel = (
  element: Element,
  stack: ListFrame[],
  stackMargins: Array<number | null | undefined>
) => {
  const margin = getElementMarginLeftPoints(element);
  if (margin === null) return null;

  const exactLevel = stackMargins.findIndex(
    (item, index) => stack[index]?.lastItem && item !== null && item !== undefined && Math.abs(item - margin) <= 1
  );
  if (exactLevel >= 0) return exactLevel;

  for (let level = stackMargins.length - 1; level >= 0; level -= 1) {
    const parentMargin = stackMargins[level];
    if (
      stack[level]?.lastItem &&
      parentMargin !== null &&
      parentMargin !== undefined &&
      margin > parentMargin + 1
    ) {
      return level + 1;
    }
  }

  return null;
};

const resolveStackMarginContinuationLevel = (
  element: Element,
  stack: ListFrame[],
  stackMargins: Array<number | null | undefined>
) => {
  const margin = getElementMarginLeftPoints(element);
  if (margin === null) return null;

  const exactLevel = stackMargins.findIndex(
    (item, index) => stack[index]?.lastItem && item !== null && item !== undefined && Math.abs(item - margin) <= 1
  );

  return exactLevel >= 0 ? exactLevel : null;
};

const getWordListMarkerElement = (element: Element) =>
  Array.from(element.querySelectorAll("[style]")).find((node) =>
    /mso-list\s*:\s*ignore/i.test(node.getAttribute("style") ?? "")
  );

const normalizeMarkerText = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const alphaToNumber = (value: string) => value.toLowerCase().charCodeAt(0) - 96;

const romanToNumber = (value: string) => {
  const map: Record<string, number> = {
    c: 100,
    d: 500,
    i: 1,
    l: 50,
    m: 1000,
    v: 5,
    x: 10,
  };
  let total = 0;
  let previous = 0;

  for (const char of value.toLowerCase().split("").reverse()) {
    const current = map[char] ?? 0;
    total += current < previous ? -current : current;
    previous = Math.max(previous, current);
  }

  return total > 0 ? total : undefined;
};

const getOrderedMarkerInfo = (markerText: string) => {
  const numeric = markerText.match(/^(\d+)(?:[.)]|$)/);
  if (numeric) {
    return { start: Number.parseInt(numeric[1], 10), styleType: "decimal" };
  }

  const roman = markerText.match(/^([ivxlcdm]+)[.)]/i);
  if (roman && roman[1].length > 1) {
    return {
      start: romanToNumber(roman[1]),
      styleType: roman[1] === roman[1].toUpperCase() ? "upper-roman" : "lower-roman",
    };
  }

  const alpha = markerText.match(/^([a-zA-Z])[.)]/);
  if (alpha) {
    return {
      start: alphaToNumber(alpha[1]),
      styleType: alpha[1] === alpha[1].toUpperCase() ? "upper-alpha" : "lower-alpha",
    };
  }

  return null;
};

const getWordListInfo = (
  element: Element,
  definitions?: WordListDefinitions
): WordListInfo | null => {
  const style = element.getAttribute("style") ?? "";
  const className = element.getAttribute("class") ?? "";
  const markerElement = getWordListMarkerElement(element);
  const explicitLevel = getExplicitWordListLevel(element);
  const msoListValue = style.match(/(?:^|;)\s*mso-list\s*:\s*([^;]+)/i)?.[1]?.trim() ?? "";
  const hasWordList =
    (Boolean(msoListValue) && !/^none\b/i.test(msoListValue)) ||
    /MsoListParagraph/i.test(className) ||
    Boolean(markerElement);

  if (!hasWordList) return null;

  const markerText = normalizeMarkerText(markerElement?.textContent ?? "");
  const marginMatch = style.match(/margin-left\s*:\s*([0-9.]+)\s*pt/i);
  const listReference = parseWordListReference(msoListValue);
  const listDefinition = listReference?.definitionKey
    ? definitions?.get(listReference.definitionKey)
    : undefined;
  const listKey = listReference?.listKey;
  const level = explicitLevel !== null
    ? explicitLevel
    : marginMatch
      ? Math.max(0, Math.round(Number.parseFloat(marginMatch[1]) / 36) - 1)
      : 0;
  const orderedMarker = getOrderedMarkerInfo(markerText);
  const type = orderedMarker ? "ol" : listDefinition?.type ?? "ul";

  return {
    indent: Number.isFinite(level) ? Math.min(MAX_LIST_INDENT_LEVEL, level) : 0,
    listKey,
    start: type === "ol" ? orderedMarker?.start ?? listDefinition?.start : undefined,
    styleType: type === "ol" ? orderedMarker?.styleType ?? listDefinition?.styleType : undefined,
    type,
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

const WORD_LIST_STYLE_PROPERTIES = new Set(["mso-list"]);
const WORD_LIST_BLOCK_STYLE_PROPERTIES = new Set(["margin", "margin-left", "mso-list", "text-indent"]);
const TEXT_DECORATION_STYLE_PROPERTIES = new Set(["text-decoration", "text-decoration-line"]);

const removeStyleProperties = (value: string, properties: Set<string>) => {
  const safeRules = value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const separatorIndex = rule.indexOf(":");
      if (separatorIndex <= 0) return true;
      const property = rule.slice(0, separatorIndex).trim().toLowerCase();
      return !properties.has(property);
    });

  return safeRules.join("; ");
};

const setCleanStyle = (element: Element, properties: Set<string>) => {
  const style = element.getAttribute("style");
  if (!style) return;

  const cleanStyle = removeStyleProperties(style, properties);
  if (cleanStyle) {
    element.setAttribute("style", cleanStyle);
    return;
  }
  element.removeAttribute("style");
};

const removeBlockTextDecoration = (element: Element) => {
  [element, ...Array.from(element.querySelectorAll("[style]"))].forEach((node) => {
    const tagName = node.tagName.toUpperCase();
    if (INLINE_TEXT_FORMAT_TAGS.has(tagName)) return;
    setCleanStyle(node, TEXT_DECORATION_STYLE_PROPERTIES);
  });
};

const cleanPreservedWordListBlock = (element: Element) => {
  removeWordListMarkers(element);
  removeBlockTextDecoration(element);
  element.querySelectorAll("[style]").forEach((child) => {
    setCleanStyle(child, WORD_LIST_STYLE_PROPERTIES);
  });
  setCleanStyle(element, WORD_LIST_BLOCK_STYLE_PROPERTIES);

  const className = (element.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter((item) => item && !/^MsoList/i.test(item))
    .join(" ");
  if (className) {
    element.setAttribute("class", className);
  } else {
    element.removeAttribute("class");
  }
};

const appendSanitizedWordListContinuation = (element: Element, item: HTMLLIElement) => {
  const block = document.createElement("p");
  copySafeAttributes(element, block, "P");
  setCleanStyle(block, WORD_LIST_BLOCK_STYLE_PROPERTIES);

  const textFormat = getTextFormat(element, element.tagName.toUpperCase());
  appendSanitizedChildren(element, applyTextFormat(block, textFormat));

  if (block.textContent?.trim() || block.children.length > 0) {
    item.appendChild(block);
    cleanEmptyMarkup(item);
  }
};

const appendPreservedWordListContinuation = (element: Element, item: HTMLLIElement) => {
  const clone = element.cloneNode(true) as Element;
  cleanPreservedWordListBlock(clone);
  removeEmptyInlineElements(clone);

  if (clone.textContent?.trim() || clone.children.length > 0) {
    item.appendChild(clone);
  }
};

const removeEmptyInlineElements = (element: Element) => {
  Array.from(element.querySelectorAll("span,a"))
    .reverse()
    .forEach((node) => {
      if (node.attributes.length === 0 && !node.textContent?.trim() && node.children.length === 0) {
        node.remove();
      }
    });
};

const createPreservedWordListItem = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  cleanPreservedWordListBlock(clone);
  removeEmptyInlineElements(clone);

  const item = document.createElement("li");
  item.appendChild(clone);
  return item;
};

const removeWordListStyleRules = (css: string) =>
  css.replace(/@list\s+l\d+(?::level\d+)?\s*\{[^}]*\}/gi, "");

const unwrapWordListConditionalComments = (html: string) =>
  html
    .replace(/<!--\[if !supportLists\]>/gi, "")
    .replace(/<!\[endif\]-->/gi, "")
    .replace(/<!\[if !supportLists\]>/gi, "")
    .replace(/<!\[endif\]>/gi, "");

const cleanConvertedWordListBody = (body: HTMLElement) => {
  removeWordListMarkers(body);
  removeBlockTextDecoration(body);

  body.querySelectorAll("[style]").forEach((element) => {
    setCleanStyle(element, WORD_LIST_STYLE_PROPERTIES);
  });
  body.querySelectorAll("p,li").forEach((element) => {
    const text = normalizeWhitespace(element.textContent ?? "");
    const hasStructuralChildren = Boolean(element.querySelector("img,table,ol,ul"));
    if (!hasStructuralChildren && /^[-\u2013\u2014\u2022\u00b7\u25cf\u25cb\u25aa\u25ab\u25a0\u25a1\uf0b7o]$/.test(text)) {
      element.remove();
    }
  });
  body.querySelectorAll("style").forEach((element) => {
    const cleanCss = removeWordListStyleRules(element.textContent ?? "").trim();
    if (cleanCss) {
      element.textContent = cleanCss;
    } else {
      element.remove();
    }
  });
};

const normalizeWordListMarkupHtml = (
  html: string,
  definitions = parseWordListDefinitions(html)
) => {
  const parsed = new DOMParser().parseFromString(
    unwrapWordListConditionalComments(html),
    "text/html"
  );

  convertWordListsInContainerPreservingMarkup(
    parsed.body,
    definitions
  );
  cleanConvertedWordListBody(parsed.body);
  cleanEmptyMarkup(parsed.body);

  return parsed.body.innerHTML.trim();
};

const convertWordListsInContainer = (
  container: Element,
  definitions?: WordListDefinitions
) => {
  Array.from(container.children).forEach((child) => {
    if (!getWordListInfo(child, definitions)) {
      convertWordListsInContainer(child, definitions);
    }
  });

  const originalNodes = Array.from(container.childNodes);
  if (
    !originalNodes.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        getWordListInfo(node as Element, definitions)
    )
  ) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const stack: ListFrame[] = [];
  const stackMargins: Array<number | null | undefined> = [];
  const levelResolver = createWordListLevelResolver(originalNodes, definitions);

  originalNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.textContent?.trim()) {
        stack.splice(0);
        stackMargins.splice(0);
        fragment.appendChild(node);
      }
      return;
    }

    const element = node as Element;
    const listInfo = getWordListInfo(element, definitions);
    if (!listInfo) {
      const continuationLevel =
        levelResolver.resolveContinuationLevel(element, stack) ??
        resolveStackMarginContinuationLevel(element, stack, stackMargins);
      if (continuationLevel !== null && stack[continuationLevel]?.lastItem) {
        const continuationItem = stack[continuationLevel].lastItem;
        appendSanitizedWordListContinuation(element, continuationItem);
        stack.splice(continuationLevel + 1);
        stackMargins.splice(continuationLevel + 1);
        return;
      }

      stack.splice(0);
      stackMargins.splice(0);
      fragment.appendChild(element);
      return;
    }

    const stackMarginLevel = resolveStackMarginListLevel(element, stack, stackMargins);
    const resolvedLevel = stackMarginLevel ?? levelResolver.resolveListLevel(element, listInfo.indent);
    const level = normalizeListLevel(resolvedLevel, stack);

    let frame = stack[level];
    if (
      !frame ||
      frame.type !== listInfo.type ||
      frame.styleType !== listInfo.styleType ||
      frame.listKey !== listInfo.listKey
    ) {
      const list = makeList(listInfo.type, listInfo.start, listInfo.styleType);
      frame = {
        lastItem: null,
        listKey: listInfo.listKey,
        list,
        styleType: listInfo.styleType,
        type: listInfo.type,
      };
      if (level === 0) {
        fragment.appendChild(list);
      } else {
        stack[level - 1].lastItem?.appendChild(list);
      }
      stack[level] = frame;
    } else if (listInfo.type === "ol" && listInfo.start && frame.list.children.length === 0) {
      frame.list.setAttribute("start", String(listInfo.start));
    }
    stackMargins[level] = getElementMarginLeftPoints(element);
    stack.splice(level + 1);
    stackMargins.splice(level + 1);

    const item = createWordListItem(element);
    frame.list.appendChild(item);
    frame.lastItem = item;
  });

  container.replaceChildren(fragment);
};

const convertWordListsInContainerPreservingMarkup = (
  container: Element,
  definitions?: WordListDefinitions
) => {
  Array.from(container.children).forEach((child) => {
    if (!getWordListInfo(child, definitions)) {
      convertWordListsInContainerPreservingMarkup(child, definitions);
    }
  });

  const originalNodes = Array.from(container.childNodes);
  if (
    !originalNodes.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        getWordListInfo(node as Element, definitions)
    )
  ) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const stack: ListFrame[] = [];
  const stackMargins: Array<number | null | undefined> = [];
  const levelResolver = createWordListLevelResolver(originalNodes, definitions);

  originalNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.textContent?.trim()) {
        stack.splice(0);
        stackMargins.splice(0);
        fragment.appendChild(node);
      }
      return;
    }

    const element = node as Element;
    const listInfo = getWordListInfo(element, definitions);
    if (!listInfo) {
      const continuationLevel =
        levelResolver.resolveContinuationLevel(element, stack) ??
        resolveStackMarginContinuationLevel(element, stack, stackMargins);
      if (continuationLevel !== null && stack[continuationLevel]?.lastItem) {
        const continuationItem = stack[continuationLevel].lastItem;
        appendPreservedWordListContinuation(element, continuationItem);
        stack.splice(continuationLevel + 1);
        stackMargins.splice(continuationLevel + 1);
        return;
      }

      stack.splice(0);
      stackMargins.splice(0);
      fragment.appendChild(element);
      return;
    }

    const effectiveListInfo: WordListInfo = listInfo;
    const stackMarginLevel = resolveStackMarginListLevel(element, stack, stackMargins);
    const resolvedLevel =
      stackMarginLevel ?? levelResolver.resolveListLevel(element, listInfo.indent);
    const level = normalizeListLevel(resolvedLevel, stack);

    let frame = stack[level];
    if (
      !frame ||
      frame.type !== effectiveListInfo.type ||
      frame.styleType !== effectiveListInfo.styleType ||
      frame.listKey !== effectiveListInfo.listKey
    ) {
      const list = makeList(
        effectiveListInfo.type,
        effectiveListInfo.start,
        effectiveListInfo.styleType
      );
      frame = {
        lastItem: null,
        listKey: effectiveListInfo.listKey,
        list,
        styleType: effectiveListInfo.styleType,
        type: effectiveListInfo.type,
      };
      if (level === 0) {
        fragment.appendChild(list);
      } else {
        stack[level - 1].lastItem?.appendChild(list);
      }
      stack[level] = frame;
    } else if (
      effectiveListInfo.type === "ol" &&
      effectiveListInfo.start &&
      frame.list.children.length === 0
    ) {
      frame.list.setAttribute("start", String(effectiveListInfo.start));
    }
    stackMargins[level] = getElementMarginLeftPoints(element);
    stack.splice(level + 1);
    stackMargins.splice(level + 1);

    const item = createPreservedWordListItem(element);
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
    let level = getPlainTextListLevel(parsed.indent);
    if (
      parsed.type === "ul" &&
      level === 0 &&
      stack[0]?.type === "ol" &&
      stack[0].lastItem
    ) {
      level = 1;
    }
    level = normalizeListLevel(level, stack);

    const existing = stack[level];
    if (existing?.type === parsed.type && existing.styleType === parsed.styleType) {
      stack.splice(level + 1);
      return existing;
    }

    const list = makeList(parsed.type, parsed.start, parsed.styleType);
    const frame: ListFrame = {
      lastItem: null,
      list,
      styleType: parsed.styleType,
      type: parsed.type,
    };
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

const getHtmlListDepth = (html: string) => {
  if (!hasDocument() || !html.trim()) return 0;

  const root = document.createElement("div");
  root.innerHTML = html;
  let maxDepth = 0;

  const walk = (node: Element, depth: number) => {
    Array.from(node.children).forEach((child) => {
      const tagName = child.tagName.toUpperCase();
      const nextDepth = tagName === "OL" || tagName === "UL" ? depth + 1 : depth;
      maxDepth = Math.max(maxDepth, nextDepth);
      walk(child, nextDepth);
    });
  };

  walk(root, 0);
  return maxDepth;
};

const getPreferredPlainTextListHtml = (
  html: string,
  text: string,
  allowTopLevelListFallback = false
) => {
  if (!text.trim() || !hasDocument()) return "";
  if (!hasMeaningfulPlainTextList(text)) return "";

  const plainHtml = plainTextToHtml(text);
  if (!plainHtml) return "";

  const plainDepth = getHtmlListDepth(plainHtml);
  if (plainDepth === 0) return "";

  const htmlDepth = getHtmlListDepth(html);
  if (
    (plainDepth > htmlDepth && plainDepth > 1) ||
    (allowTopLevelListFallback && htmlDepth === 0)
  ) {
    return plainHtml;
  }

  return "";
};

const sanitizeHtmlToSafe = (html: string) => {
  const listDefinitions = parseWordListDefinitions(html);
  const cleaned = stripWordHtmlNoise(inlineWordClassVisualStyles(html));
  if (!cleaned.trim()) return "";
  if (!hasDocument()) {
    return escapeHtml(htmlToPlainText(cleaned)).replace(/\n/g, "<br>");
  }

  const source = document.createElement("div");
  source.innerHTML = cleaned;

  convertWordListsInContainer(source, listDefinitions);
  removeWordListMarkers(source);

  const sanitized = document.createElement("div");
  appendSanitizedChildren(source, sanitized);
  cleanEmptyMarkup(sanitized);
  return sanitized.innerHTML.trim();
};

export const normalizeCkEditorWordPasteHtml = (html: string, text = "") => {
  if (!hasDocument()) {
    return html;
  }

  const hasWordListMarkup = WORD_LIST_MARKUP_PATTERN.test(html);
  const listDefinitions = parseWordListDefinitions(html);
  let normalizedHtml = WORD_MARKUP_PATTERN.test(html)
    ? inlineWordClassVisualStyles(html)
    : html;
  const wordListSourceHtml = normalizedHtml;

  if (!hasWordListMarkup && html.trim()) {
    return normalizedHtml;
  }

  if (hasWordListMarkup) {
    normalizedHtml = normalizeWordListMarkupHtml(
      wordListSourceHtml,
      listDefinitions
    ) || html;
  }

  if (!hasWordListMarkup) {
    const plainListHtml = getPreferredPlainTextListHtml(normalizedHtml, text, !html.trim());
    if (plainListHtml) {
      return plainListHtml;
    }
  }

  return normalizedHtml;
};

export const normalizePastedIkContent = (html: string, text: string) => {
  if (html.trim()) {
    const sanitizedHtml = sanitizeHtmlToSafe(html);
    if (WORD_LIST_MARKUP_PATTERN.test(html) && sanitizedHtml) {
      return sanitizedHtml;
    }
    const plainListHtml = getPreferredPlainTextListHtml(sanitizedHtml, text);
    if (plainListHtml) {
      return plainListHtml;
    }
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
