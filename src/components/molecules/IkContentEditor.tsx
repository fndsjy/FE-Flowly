import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faEraser,
  faIndent,
  faItalic,
  faListOl,
  faListUl,
  faOutdent,
  faStrikethrough,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import {
  getIkContentPlainText,
  normalizeIkContentForStorage,
  normalizePastedIkContent,
} from "../../lib/ik-content";

type IkContentEditorProps = {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type ToolbarButton = {
  command: string;
  icon: IconDefinition;
  title: string;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { command: "bold", icon: faBold, title: "Bold" },
  { command: "italic", icon: faItalic, title: "Italic" },
  { command: "underline", icon: faUnderline, title: "Underline" },
  { command: "strikeThrough", icon: faStrikethrough, title: "Strikethrough" },
  { command: "insertOrderedList", icon: faListOl, title: "Numbering" },
  { command: "insertUnorderedList", icon: faListUl, title: "Bullet point" },
  { command: "outdent", icon: faOutdent, title: "Kurangi indent" },
  { command: "indent", icon: faIndent, title: "Tambah indent" },
  { command: "removeFormat", icon: faEraser, title: "Hapus format" },
];

const IkContentEditor = ({ onChange, placeholder, value }: IkContentEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const normalizedValue = useMemo(() => normalizeIkContentForStorage(value), [value]);
  const [isEmpty, setIsEmpty] = useState(() => getIkContentPlainText(normalizedValue).length === 0);

  const syncEmptyState = (html: string) => {
    setIsEmpty(getIkContentPlainText(html).length === 0);
  };

  const emitCurrentValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = normalizeIkContentForStorage(editor.innerHTML);
    syncEmptyState(nextValue);
    onChange(nextValue);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor && editor.innerHTML !== normalizedValue) {
      editor.innerHTML = normalizedValue;
    }
    syncEmptyState(normalizedValue);
  }, [normalizedValue]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (event: ReactMouseEvent<HTMLButtonElement>, command: string) => {
    event.preventDefault();
    focusEditor();
    document.execCommand(command, false);
    emitCurrentValue();
  };

  const insertHtml = (html: string) => {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    emitCurrentValue();
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const cleanHtml = normalizePastedIkContent(html, text);
    if (cleanHtml) {
      insertHtml(cleanHtml);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const editor = editorRef.current;
    if (!editor) return;
    const cleanHtml = normalizeIkContentForStorage(editor.innerHTML);
    if (editor.innerHTML !== cleanHtml) {
      editor.innerHTML = cleanHtml;
    }
    syncEmptyState(cleanHtml);
    onChange(cleanHtml);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2">
        {TOOLBAR_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            title={button.title}
            aria-label={button.title}
            onMouseDown={(event) => runCommand(event, button.command)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#272e79] focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <FontAwesomeIcon icon={button.icon} />
          </button>
        ))}
      </div>
      <div className="relative">
        {isEmpty && !isFocused && placeholder && (
          <div className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          onInput={emitCurrentValue}
          onPaste={handlePaste}
          className="min-h-36 w-full px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none [&_ol]:my-1 [&_ol]:ml-8 [&_ol]:list-decimal [&_ol]:pl-3 [&_ul]:my-1 [&_ul]:ml-12 [&_ul]:list-disc [&_ul]:pl-3 [&_li]:my-1 [&_li>ol]:ml-7 [&_li>ul]:ml-9 [&_p]:my-1"
        />
      </div>
    </div>
  );
};

export default IkContentEditor;
