import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useState } from "react";
import {
  Alignment,
  Autoformat,
  AutoImage,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  FileRepository,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
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
} from "ckeditor5";
import type { FileLoader } from "ckeditor5";
import "ckeditor5/ckeditor5.css";

import { normalizeIkContentForStorage } from "../../lib/ik-content";

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
  Heading,
  IkBase64UploadPlugin,
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
            properties: {
              styles: true,
              startIndex: true,
              reversed: true,
            },
          },
          fontFamily: {
            supportAllValues: true,
          },
          fontSize: {
            options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72],
            supportAllValues: true,
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
        onChange={(_event, editor) => {
          onChange(editor.getData());
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
          margin: 0 0 8px 34px;
          padding-left: 8px;
          list-style-position: outside;
        }
        .ik-content-editor .ck-content ul {
          margin: 0 0 8px 52px;
          padding-left: 8px;
          list-style-position: outside;
        }
        .ik-content-editor .ck-content li {
          margin-bottom: 4px;
        }
        .ik-content-editor .ck-content li > ol {
          margin-top: 4px;
          margin-left: 28px;
        }
        .ik-content-editor .ck-content li > ul {
          margin-top: 4px;
          margin-left: 36px;
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
