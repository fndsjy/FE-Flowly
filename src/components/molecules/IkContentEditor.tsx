import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alignment,
  Autoformat,
  AutoImage,
  BlockQuote,
  Bold,
  ClassicEditor,
  ClipboardPipeline,
  Essentials,
  FileRepository,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  Plugin,
  RemoveFormat,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TodoList,
  Underline,
  _ListItemUid,
} from "ckeditor5";
import type { ClipboardInputTransformationData, FileLoader, ModelElement } from "ckeditor5";
import "ckeditor5/ckeditor5.css";

import {
  hasMeaningfulPlainTextList,
  normalizeCkEditorWordPasteHtml,
  normalizeIkContentForStorage,
} from "../../lib/ik-content";

type IkContentEditorProps = {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const CONTENT_CHANGE_DEBOUNCE_MS = 400;
const MAX_LIST_INDENT_LEVEL = 12;
const WORD_LIST_CLIPBOARD_PATTERN = /mso-list\s*:|MsoListParagraph|@list\s+l\d+|supportLists/i;

type IkEditorInstance = {
  getData: () => string;
};

type IkNestedListMarker = {
  listStart?: number;
  listStyle: string;
  listType: "bulleted" | "numbered";
};

const BULLETED_LIST_STYLES = new Set(["disc", "circle", "square"]);

const getAlphaListStart = (value: string) => value.toLowerCase().charCodeAt(0) - 96;

const parseNestedListMarker = (value: string): IkNestedListMarker | null => {
  const marker = value.match(/^(?:(\d+|[a-zA-Z])[.)]\s?|([-*])\s)$/);
  if (!marker) return null;

  const token = marker[1] ?? marker[2];
  if (/^\d+$/.test(token)) {
    return {
      listStart: Number.parseInt(token, 10),
      listStyle: "decimal",
      listType: "numbered",
    };
  }

  if (/^[a-zA-Z]$/.test(token)) {
    return {
      listStart: getAlphaListStart(token),
      listStyle: token === token.toUpperCase() ? "upper-alpha" : "lower-alpha",
      listType: "numbered",
    };
  }

  return {
    listStyle: "disc",
    listType: "bulleted",
  };
};

const getNestedListMarkerFromStyle = (listStyle?: unknown): IkNestedListMarker | null => {
  if (typeof listStyle !== "string" || !listStyle) return null;

  if (BULLETED_LIST_STYLES.has(listStyle)) {
    return {
      listStyle,
      listType: "bulleted",
    };
  }

  return {
    listStart: 1,
    listStyle,
    listType: "numbered",
  };
};

const getNestedListIndent = (block: ModelElement) => {
  const currentIndent = Number(block.getAttribute("listIndent") ?? 0);
  return Math.max(0, Math.min(MAX_LIST_INDENT_LEVEL, currentIndent));
};

const resolveMarkerListIndent = (block: ModelElement, marker: IkNestedListMarker) => {
  const currentIndent = getNestedListIndent(block);
  const currentListType = block.getAttribute("listType");
  const currentListStyle = block.getAttribute("listStyle");
  const startsNestedNumbering =
    marker.listType === "numbered" &&
    typeof marker.listStyle === "string" &&
    marker.listStyle.includes("alpha") &&
    currentListType === "numbered" &&
    currentListStyle === "decimal";
  const startsNestedBullet =
    marker.listType === "bulleted" && currentListType === "numbered";

  if ((startsNestedNumbering || startsNestedBullet) && currentIndent < MAX_LIST_INDENT_LEVEL) {
    return currentIndent + 1;
  }

  return currentIndent;
};

const isIkListBlock = (node: unknown): node is ModelElement => {
  const candidate = node as
    | {
        hasAttribute?: (key: string) => boolean;
        is?: (...args: string[]) => boolean;
      }
    | null
    | undefined;

  return Boolean(
    candidate?.is?.("element", "listItem") &&
      candidate.hasAttribute?.("listType") &&
      candidate.hasAttribute?.("listIndent")
  );
};

const collectListRunFromBlock = (block: ModelElement) => {
  const initialIndent = getNestedListIndent(block);
  const blocks: ModelElement[] = [block];
  let nextNode = block.nextSibling;

  while (nextNode) {
    if (!isIkListBlock(nextNode)) break;

    const nextIndent = getNestedListIndent(nextNode);
    if (nextIndent < initialIndent) break;

    blocks.push(nextNode);
    nextNode = nextNode.nextSibling;
  }

  return blocks;
};

const isEmptyListBlock = (block: ModelElement) => {
  for (const child of block.getChildren() as Iterable<{
    data?: string;
    is?: (...args: string[]) => boolean;
  }>) {
    if (!child.is?.("$text")) return false;
    if (child.data?.trim()) return false;
  }

  return true;
};

class IkBase64ImageUploadAdapter {
  private readonly loader: FileLoader;

  constructor(loader: FileLoader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise<{ default: string }>((resolve, reject) => {
          if (!file) {
            reject("File gambar tidak terbaca.");
            return;
          }
          if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            reject("Format gambar belum didukung. Gunakan JPG, PNG, WEBP, GIF, atau BMP.");
            return;
          }
          if (file.size > MAX_IMAGE_SIZE) {
            reject("Ukuran gambar maksimal 8 MB untuk uji editor ini.");
            return;
          }

          const reader = new window.FileReader();
          reader.onerror = () => reject("Gambar tidak bisa dibaca.");
          reader.onabort = () => reject("Upload gambar dibatalkan.");
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve({ default: reader.result });
              return;
            }
            reject("Gambar tidak bisa dibaca.");
          };
          reader.readAsDataURL(file);
        })
    );
  }

  abort() {}
}

class IkBase64UploadPlugin extends Plugin {
  static get requires() {
    return [FileRepository] as const;
  }

  init() {
    const fileRepository = this.editor.plugins.get(FileRepository);
    fileRepository.createUploadAdapter = (loader) => new IkBase64ImageUploadAdapter(loader);
  }
}

class IkWordListPastePlugin extends Plugin {
  static get requires() {
    return [ClipboardPipeline] as const;
  }

  init() {
    const clipboardPipeline = this.editor.plugins.get(ClipboardPipeline);

    this.listenTo(
      clipboardPipeline,
      "inputTransformation",
      (_eventInfo, data: ClipboardInputTransformationData) => {
        if (data.method !== "paste") return;

        const html = data.dataTransfer.getData("text/html");
        const text = data.dataTransfer.getData("text/plain");
        const clipboardFiles = Array.from(
          (
            data.dataTransfer as unknown as {
              files?: ArrayLike<File>;
            }
          ).files ?? []
        );
        const hasClipboardImage = clipboardFiles.some((file) =>
          file.type.startsWith("image/")
        );
        if (hasClipboardImage || /<img\b/i.test(html)) return;

        const hasHtml = html.trim().length > 0;
        const hasWordListHtml = hasHtml && WORD_LIST_CLIPBOARD_PATTERN.test(html);

        const hasPlainListText = !hasHtml && hasMeaningfulPlainTextList(text);
        if (!hasWordListHtml && !hasPlainListText) return;

        const normalizedHtml = normalizeCkEditorWordPasteHtml(hasWordListHtml ? html : "", text);
        if (!normalizedHtml.trim()) return;

        data.content = this.editor.data.htmlProcessor.toView(normalizedHtml);
        data.extraContent = undefined;
      },
      { priority: "highest" }
    );
  }
}

class IkListOutdentFromHerePlugin extends Plugin {
  init() {
    const outdentCommand = this.editor.commands.get("outdent");
    if (!outdentCommand) return;

    this.listenTo(
      outdentCommand,
      "execute",
      (eventInfo) => {
        const model = this.editor.model;
        const selection = model.document.selection;
        const selectionRange = selection.getFirstRange();
        if (!selectionRange?.isCollapsed) return;

        const selectedBlocks = Array.from(selection.getSelectedBlocks());
        if (selectedBlocks.length !== 1) return;

        const block = selectedBlocks[0];
        if (!isIkListBlock(block)) return;

        const currentIndent = getNestedListIndent(block);
        if (currentIndent <= 0) return;

        const affectedBlocks = collectListRunFromBlock(block);
        if (affectedBlocks.length <= 1) return;

        eventInfo.stop();

        model.change((writer) => {
          for (const listBlock of affectedBlocks) {
            writer.setAttribute("listIndent", getNestedListIndent(listBlock) - 1, listBlock);
          }
        });
      },
      { priority: "highest" }
    );
  }
}

class IkNestedListAutoformatPlugin extends Plugin {
  init() {
    const modelDocument = this.editor.model.document;
    const applyMarkerToBlock = (
      block: ModelElement,
      marker: IkNestedListMarker,
      markerTextLength = 0
    ) => {
      const model = this.editor.model;

      model.enqueueChange((writer) => {
        if (markerTextLength > 0) {
          const markerRange = writer.createRange(
            writer.createPositionAt(block, 0),
            writer.createPositionAt(block, markerTextLength)
          );

          writer.remove(markerRange);
        }

        writer.setAttribute("listType", marker.listType, block);
        writer.setAttribute("listIndent", resolveMarkerListIndent(block, marker), block);
        writer.setAttribute("listItemId", _ListItemUid.next(), block);
        writer.setAttribute("listStyle", marker.listStyle, block);

        if (marker.listType === "numbered") {
          writer.setAttribute("listStart", marker.listStart ?? 1, block);
        } else {
          writer.removeAttribute("listStart", block);
          writer.removeAttribute("listReversed", block);
        }
      });
    };

    const getActiveListBlock = () => {
      const selection = this.editor.model.document.selection;
      const selectionRange = selection.getFirstRange();
      if (!selectionRange?.isCollapsed) return null;

      const block = Array.from(selection.getSelectedBlocks())[0] as ModelElement | undefined;
      if (!block?.is?.("element", "listItem") || !block.hasAttribute("listType")) return null;

      return block;
    };

    const bindListCommand = (
      commandName: "bulletedList" | "numberedList",
      marker: IkNestedListMarker
    ) => {
      const command = this.editor.commands.get(commandName);
      if (!command) return;

      this.listenTo(
        command,
        "execute",
        (eventInfo) => {
          const block = getActiveListBlock();
          if (!block || !isEmptyListBlock(block)) return;

          eventInfo.stop();
          applyMarkerToBlock(block, marker);
        },
        { priority: "highest" }
      );
    };

    bindListCommand("numberedList", {
      listStart: 1,
      listStyle: "decimal",
      listType: "numbered",
    });
    bindListCommand("bulletedList", {
      listStyle: "disc",
      listType: "bulleted",
    });

    const listStyleCommand = this.editor.commands.get("listStyle");
    if (listStyleCommand) {
      this.listenTo(
        listStyleCommand,
        "execute",
        (eventInfo, options) => {
          const marker = getNestedListMarkerFromStyle((options as { type?: unknown } | undefined)?.type);
          if (!marker) return;

          const block = getActiveListBlock();
          if (!block || !isEmptyListBlock(block)) return;

          eventInfo.stop();
          applyMarkerToBlock(block, marker);
        },
        { priority: "highest" }
      );
    }

    this.listenTo(
      modelDocument,
      "change:data",
      (eventInfo, batch) => {
        const changeBatch = batch as { isLocal?: boolean; isUndo?: boolean };
        if (changeBatch.isUndo || changeBatch.isLocal === false) return;

        const model = this.editor.model;
        const selection = model.document.selection;
        const selectionRange = selection.getFirstRange();
        if (!selectionRange?.isCollapsed) return;

        const changes = Array.from(model.document.differ.getChanges()) as Array<{
          length?: number;
          name?: string;
          position: { parent: ModelElement };
          type: string;
        }>;
        if (changes.length !== 1) return;

        const change = changes[0];
        if (change.type !== "insert" || change.name !== "$text" || change.length !== 1) return;

        const block = change.position.parent;
        if (!block.is?.("element", "listItem") || !block.hasAttribute("listType")) return;

        const firstNode = block.getChild(0) as
          | { data?: string; is?: (...args: string[]) => boolean }
          | null;
        if (!firstNode?.is?.("$text") || typeof firstNode.data !== "string") return;

        const markerText = firstNode.data.slice(0, selectionRange.end.offset);
        const marker = parseNestedListMarker(markerText);
        if (!marker) return;

        eventInfo.stop();
        applyMarkerToBlock(block, marker, markerText.length);
      },
      { priority: "highest" }
    );
  }
}

const editorPlugins = [
  Alignment,
  Autoformat,
  AutoImage,
  BlockQuote,
  Bold,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  IkBase64UploadPlugin,
  IkListOutdentFromHerePlugin,
  IkNestedListAutoformatPlugin,
  IkWordListPastePlugin,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TodoList,
  Underline,
];

const IkContentEditor = ({ onChange, placeholder, value }: IkContentEditorProps) => {
  const [initialData] = useState(() => normalizeIkContentForStorage(value));
  const editorRef = useRef<IkEditorInstance | null>(null);
  const pendingEmitRef = useRef<number | null>(null);
  const lastEmittedDataRef = useRef(initialData);

  const clearPendingEmit = useCallback(() => {
    if (pendingEmitRef.current === null) return;
    window.clearTimeout(pendingEmitRef.current);
    pendingEmitRef.current = null;
  }, []);

  const emitEditorData = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    clearPendingEmit();
    const nextData = editor.getData();
    if (nextData === lastEmittedDataRef.current) return;

    lastEmittedDataRef.current = nextData;
    onChange(nextData);
  }, [clearPendingEmit, onChange]);

  const scheduleEditorDataEmit = useCallback(() => {
    clearPendingEmit();
    pendingEmitRef.current = window.setTimeout(emitEditorData, CONTENT_CHANGE_DEBOUNCE_MS);
  }, [clearPendingEmit, emitEditorData]);

  useEffect(() => clearPendingEmit, [clearPendingEmit]);

  return (
    <div className="ik-content-editor mt-3 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
      <CKEditor
        editor={ClassicEditor}
        data={initialData}
        config={{
          licenseKey: "GPL",
          placeholder,
          plugins: editorPlugins,
          toolbar: {
            items: [
              "undo",
              "redo",
              "|",
              "heading",
              "|",
              "bold",
              "italic",
              "underline",
              "strikethrough",
              "fontColor",
              "fontBackgroundColor",
              "removeFormat",
              "|",
              "alignment",
              "outdent",
              "indent",
              "|",
              "bulletedList",
              "numberedList",
              "todoList",
              "|",
              "insertTable",
              "insertImage",
              "blockQuote",
            ],
            shouldNotGroupWhenFull: true,
          },
          list: {
            enableSkipLevelLists: true,
            properties: {
              reversed: false,
              startIndex: true,
              styles: true,
            },
          },
          fontFamily: {
            supportAllValues: true,
          },
          fontSize: {
            options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72],
            supportAllValues: true,
          },
          htmlSupport: {
            allow: [
              {
                name: /^(a|blockquote|caption|col|colgroup|em|figcaption|figure|h[1-6]|img|li|ol|p|s|span|strong|table|tbody|td|tfoot|th|thead|tr|u|ul)$/,
                attributes: [
                  "alt",
                  "colspan",
                  "height",
                  "href",
                  "rel",
                  "reversed",
                  "rowspan",
                  "src",
                  "start",
                  "target",
                  "type",
                  "value",
                  "width",
                ],
                classes: true,
                styles: [
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
                ],
              },
            ],
            disallow: [
              {
                name: /[\s\S]+/,
                attributes: [
                  {
                    key: /^on/i,
                    value: true,
                  },
                ],
              },
              {
                name: /[\s\S]+/,
                styles: [
                  {
                    key: /^behavior$/i,
                    value: true,
                  },
                ],
              },
            ],
          },
          table: {
            contentToolbar: [
              "tableColumn",
              "tableRow",
              "mergeTableCells",
              "toggleTableCaption",
              "tableProperties",
              "tableCellProperties",
            ],
            tableProperties: {
              defaultProperties: {
                borderStyle: "solid",
                borderColor: "#000000",
                borderWidth: "1px",
              },
            },
            tableCellProperties: {
              defaultProperties: {
                borderStyle: "solid",
                borderColor: "#000000",
                borderWidth: "1px",
                padding: "4px",
              },
            },
          },
          image: {
            insert: {
              integrations: ["upload", "url"],
              type: "auto",
            },
            styles: {
              options: [
                "inline",
                "alignLeft",
                "alignRight",
                "alignBlockLeft",
                "block",
                "alignBlockRight",
                "side",
                {
                  name: "inFrontOfText",
                  title: "In Front of Text",
                  icon: "inline",
                  className: "image-style-in-front-of-text",
                  modelElements: ["imageBlock"],
                },
              ],
            },
            upload: {
              types: ["jpeg", "png", "webp", "gif", "bmp"],
            },
            resizeOptions: [
              {
                name: "resizeImage:original",
                label: "Original",
                value: null,
              },
              {
                name: "resizeImage:50",
                label: "50%",
                value: "50",
              },
              {
                name: "resizeImage:75",
                label: "75%",
                value: "75",
              },
            ],
            toolbar: [
              "imageStyle:inline",
              "imageStyle:wrapText",
              "imageStyle:breakText",
              "imageStyle:inFrontOfText",
              "|",
              "toggleImageCaption",
              "imageTextAlternative",
              "|",
              "resizeImage",
            ],
          },
        }}
        onReady={(editor) => {
          editorRef.current = editor;
        }}
        onChange={(_event, editor) => {
          editorRef.current = editor;
          scheduleEditorDataEmit();
        }}
        onBlur={(_event, editor) => {
          editorRef.current = editor;
          emitEditorData();
        }}
      />
      <style>{`
        .ik-content-editor .ck-editor__editable_inline {
          min-height: 26rem;
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
        }
        .ik-content-editor .ck-content p {
          margin: 0 0 6px;
        }
        .ik-content-editor .ck-content h1,
        .ik-content-editor .ck-content h2,
        .ik-content-editor .ck-content h3,
        .ik-content-editor .ck-content h4,
        .ik-content-editor .ck-content h5,
        .ik-content-editor .ck-content h6 {
          margin: 8px 0 6px;
          line-height: 1.25;
          font-weight: bold;
        }
        .ik-content-editor .ck-content h1 {
          font-size: 16pt;
        }
        .ik-content-editor .ck-content h2 {
          font-size: 14pt;
        }
        .ik-content-editor .ck-content h3,
        .ik-content-editor .ck-content h4,
        .ik-content-editor .ck-content h5,
        .ik-content-editor .ck-content h6 {
          font-size: 12pt;
        }
        .ik-content-editor .ck-content ol {
          margin: 0 0 8px 2.1rem;
          padding-left: 1.25rem;
          list-style-position: outside;
        }
        .ik-content-editor .ck-content ol ol {
          list-style-type: lower-alpha;
        }
        .ik-content-editor .ck-content ol ol ol {
          list-style-type: lower-roman;
        }
        .ik-content-editor .ck-content ol ol ol ol {
          list-style-type: decimal;
        }
        .ik-content-editor .ck-content ul {
          margin: 0 0 8px 2.15rem;
          padding-left: 1.25rem;
          list-style-position: outside;
        }
        .ik-content-editor .ck-content ul ul {
          list-style-type: circle;
        }
        .ik-content-editor .ck-content ul ul ul {
          list-style-type: square;
        }
        .ik-content-editor .ck-content ul ul ul ul {
          list-style-type: disc;
        }
        .ik-content-editor .ck-content li {
          margin-bottom: 4px;
        }
        .ik-content-editor .ck-content li > ol {
          margin-top: 4px;
          margin-left: 2.35rem;
          padding-left: 1.2rem;
        }
        .ik-content-editor .ck-content li > ul {
          margin-top: 4px;
          margin-left: 2.4rem;
          padding-left: 1.2rem;
        }
        .ik-content-editor .ck-content blockquote {
          margin: 8px 0 8px 18px;
          padding-left: 10px;
          border-left: 2px solid #555;
          font-style: normal;
        }
        .ik-content-editor .ck-content figure {
          margin: 8px 0;
        }
        .ik-content-editor .ck-content figure.table {
          width: 100%;
          overflow: visible;
        }
        .ik-content-editor .ck-content table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 8px 0;
        }
        .ik-content-editor .ck-content table td,
        .ik-content-editor .ck-content table th {
          border: 1px solid #000;
          padding: 4px 6px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        .ik-content-editor .ck-content table th {
          font-weight: bold;
          text-align: center;
        }
        .ik-content-editor .ck-content figure.image,
        .ik-content-editor .ck-content .image {
          text-align: center;
        }
        .ik-content-editor .ck-content figure.image-style-align-left {
          float: left;
          max-width: 50%;
          margin: 0 14px 8px 0;
          text-align: left;
        }
        .ik-content-editor .ck-content figure.image-style-align-right,
        .ik-content-editor .ck-content figure.image-style-side {
          float: right;
          max-width: 50%;
          margin: 0 0 8px 14px;
          text-align: right;
        }
        .ik-content-editor .ck-content figure.image-style-in-front-of-text {
          position: relative;
          z-index: 3;
          float: right;
          max-width: 50%;
          margin: 0 0 -3.5rem 14px;
          text-align: right;
        }
        .ik-content-editor .ck-content figure.image-style-align-block-left {
          margin-left: 0;
          margin-right: auto;
          text-align: left;
        }
        .ik-content-editor .ck-content figure.image-style-align-block-right {
          margin-left: auto;
          margin-right: 0;
          text-align: right;
        }
        .ik-content-editor .ck-content figure.image-style-block,
        .ik-content-editor .ck-content figure.image-style-align-center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }
        .ik-content-editor .ck-content figure.image::after {
          content: "";
          display: table;
          clear: both;
        }
        .ik-content-editor .ck-content img {
          max-width: 100%;
          height: auto;
          object-fit: contain;
        }
        .ik-content-editor .ck-content figcaption,
        .ik-content-editor .ck-content caption {
          margin-top: 4px;
          font-size: 10pt;
          text-align: center;
        }
        .ik-content-editor .ck-content a {
          color: inherit;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default IkContentEditor;
