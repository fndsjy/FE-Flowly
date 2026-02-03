type IkPreviewData = {
  ikName: string;
  ikNumber: string;
  effectiveDate: string;
  ikContent?: string | null;
  dibuatOlehLabel?: string;
  diketahuiOlehLabel?: string;
  disetujuiOlehLabel?: string;
  sopName?: string;
  departmentName?: string;
  sopNames?: string[];
  departmentNames?: string[];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getBaseUrl = () =>
  new URL(import.meta.env.BASE_URL ?? "/", window.location.origin).toString();

const toBase64 = (value: string) => {
  try {
    return window.btoa(
      encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
    );
  } catch {
    return window.btoa(unescape(encodeURIComponent(value)));
  }
};

export const buildIkPreviewHtml = (data: IkPreviewData) => {
  const logoUrl = `${getBaseUrl()}images/masa-depan-dimatamu.png`;
  const ikTitle = escapeHtml(data.ikName);
  const ikNumber = escapeHtml(data.ikNumber);
  const effectiveDate = escapeHtml(formatDate(data.effectiveDate));
  const dibuatOlehLabel = escapeHtml(data.dibuatOlehLabel ?? "________________");
  const diketahuiOlehLabel = escapeHtml(data.diketahuiOlehLabel ?? "________________");
  const disetujuiOlehLabel = escapeHtml(data.disetujuiOlehLabel ?? "________________");
  const sopName = data.sopName ? escapeHtml(data.sopName) : "-";
  const departmentName = data.departmentName ? escapeHtml(data.departmentName) : "-";
  const sopNames = Array.isArray(data.sopNames) ? data.sopNames : [];
  const departmentNames = Array.isArray(data.departmentNames) ? data.departmentNames : [];
  const rawContent = data.ikContent ?? "";
  const contentBase64 = toBase64(rawContent);

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${ikNumber} - ${ikTitle}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        color: #000;
        background: #f2f5f9;
      }
      .preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 0 32px;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        width: 210mm;
        padding: 6px 0 12px;
      }
      .toolbar button {
        padding: 6px 12px;
        border: 1px solid #bfc6d1;
        background: #fff;
        border-radius: 999px;
        font-size: 12px;
        cursor: pointer;
      }
      .page {
        width: 210mm;
        height: 297mm;
        padding: 25.4mm;
        margin: 0 auto 12px;
        background: #fff;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
        display: flex;
        flex-direction: column;
      }
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .header-table td {
        border: 1px solid #000;
        padding: 6px 8px;
        vertical-align: top;
      }
      .logo-cell {
        width: 28%;
        text-align: center;
        padding: 6px;
        vertical-align: middle;
      }
      .logo-cell img {
        display: block;
        width: 100%;
        height: auto;
        max-width: 100%;
        max-height: 90px;
        margin: 0 auto;
        object-fit: contain;
      }
      .logo-tagline {
        font-size: 9px;
        margin-top: 4px;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
      }
      .info-table td {
        border: 1px solid #000;
        padding: 4px 6px;
        font-size: 11px;
        vertical-align: top;
      }
      .info-label {
        font-weight: bold;
      }
      .info-merge {
        text-align: center;
      }
      .approval-table {
        width: 100%;
        border-collapse: collapse;
      }
      .approval-table td {
        border: 1px solid #000;
        padding: 12px 6px 26px;
        text-align: center;
        font-size: 11px;
      }
      .approval-name {
        margin-top: 28px;
        font-size: 11px;
      }
      .doc-title {
        text-align: center;
        font-weight: bold;
        text-decoration: underline;
        margin: 14px 0 4px;
      }
      .doc-number {
        text-align: center;
        margin-bottom: 10px;
      }
      .page.no-title .doc-title,
      .page.no-title .doc-number {
        display: none;
        margin: 0;
      }
      .content {
        line-height: 1.5;
        font-size: 12pt;
        overflow: hidden;
      }
      .page-content {
        flex: 1;
        min-height: 0;
      }
      .content p {
        margin: 0 0 6px;
      }
      .content ol,
      .content ul {
        margin: 0 0 8px 22px;
        padding: 0;
      }
      .content li {
        margin-bottom: 4px;
      }
      .content li.continued {
        list-style: none;
        margin-left: -22px;
        padding-left: 22px;
      }
      .content ol {
        list-style-type: decimal;
      }
      @media print {
        .toolbar {
          display: none;
        }
        .preview {
          padding: 0;
        }
        body {
          background: #fff;
        }
        .page {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
        }
      }
    </style>
  </head>
  <body>
    <div class="preview">
      <div class="toolbar">
        <button onclick="window.print()">Print / Simpan PDF</button>
      </div>
      <div id="pages"></div>
    </div>
    <template id="page-template">
      <div class="page">
        <table class="header-table">
          <colgroup>
            <col style="width:28%" />
            <col style="width:36%" />
            <col style="width:36%" />
          </colgroup>
          <tr>
            <td class="logo-cell">
              <img src="${logoUrl}" alt="DOMAS" />
            </td>
            <td colspan="2">
              <table class="info-table">
                <colgroup>
                  <col style="width:65%" />
                  <col style="width:35%" />
                </colgroup>
                <tr>
                  <td>
                    <div class="info-label">Nama Department :</div>
                    <div data-department>-</div>
                  </td>
                  <td>
                    <div class="info-label">No. Dokumen :</div>
                    <div data-doc-number></div>
                  </td>
                </tr>
                <tr>
                  <td class="info-merge" colspan="2">
                    <div class="info-label">Nama SOP :</div>
                    <div data-doc-title></div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="info-label">Berlaku Efektif :</div>
                    <div data-effective-date></div>
                  </td>
                  <td>
                    <div class="info-label">Halaman :</div>
                    <div><span data-page-number></span>/<span data-page-total></span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <div>Dibuat :</div>
              <div class="approval-name">(${dibuatOlehLabel})</div>
            </td>
            <td>
              <div>Diketahui :</div>
              <div class="approval-name">(${diketahuiOlehLabel})</div>
            </td>
            <td>
              <div>Disetujui :</div>
              <div class="approval-name">(${disetujuiOlehLabel})</div>
            </td>
          </tr>
        </table>

        <div class="doc-title" data-title></div>
        <div class="doc-number" data-number></div>
        <div class="content page-content"></div>
      </div>
    </template>
    <script>
      (function () {
        try {
        const ikTitle = ${JSON.stringify(data.ikName)};
        const ikNumber = ${JSON.stringify(data.ikNumber)};
        const sopTitle = ${JSON.stringify(sopName)};
        const department = ${JSON.stringify(departmentName)};
        const sopTitles = ${JSON.stringify(sopNames)};
        const departments = ${JSON.stringify(departmentNames)};
        const effectiveDate = ${JSON.stringify(effectiveDate)};
        const decodeBase64 = (input) => {
          try {
            return decodeURIComponent(escape(atob(input || "")));
          } catch (err) {
            console.error("Base64 decode failed:", err);
            return atob(input || "");
          }
        };
        const htmlContent = decodeBase64(${JSON.stringify(contentBase64)});
        const isPlainText = ${JSON.stringify(!/<[a-z][\s\S]*>/i.test(rawContent))};

        const normalizeHtml = (html) => {
          const container = document.createElement("div");
          container.innerHTML = html || "";
          const textNodes = container.querySelectorAll("*");
          textNodes.forEach((node) => {
            if (node.tagName === "LI") {
              if (node.textContent && node.textContent.trim().length > 0) {
                node.textContent = node.textContent.trim();
              }
            }
          });
          return container.innerHTML;
        };

        const createPage = (isFirst = true) => {
          const template = document.getElementById("page-template");
          const page = template.content.firstElementChild.cloneNode(true);
          if (!isFirst) {
            page.classList.add("no-title");
          }
          page.querySelector("[data-title]").textContent = ikTitle;
          page.querySelector("[data-number]").textContent = ikNumber;
          page.querySelector("[data-doc-number]").textContent = ikNumber;
          const docTitleEl = page.querySelector("[data-doc-title]");
          const deptEl = page.querySelector("[data-department]");

        const renderList = (container, items, fallback) => {
          if (!container) return;
          const normalized = (items || [])
            .map((value) => (value === null || value === undefined ? "" : String(value).trim()))
            .filter((text) => text.length > 0);
          if (normalized.length === 0) {
            container.textContent = fallback || "-";
            return;
          }
          if (normalized.length === 1) {
            container.textContent = normalized[0] || fallback || "-";
            return;
          }
          const groups = [];
          const groupMap = new Map();
          normalized.forEach((value, index) => {
            const key = value.toLowerCase();
            const existing = groupMap.get(key);
            if (existing) {
              existing.indices.push(index + 1);
              return;
            }
            const group = { label: value, indices: [index + 1] };
            groupMap.set(key, group);
            groups.push(group);
          });
          if (groups.length === 1 && groups[0].indices.length === 1) {
            container.textContent = groups[0].label || fallback || "-";
            return;
          }
          const list = document.createElement("ol");
          list.style.margin = "0";
          list.style.paddingLeft = "0";
          list.style.listStyle = "none";
          groups.forEach((group) => {
            const li = document.createElement("li");
            const prefix =
              group.indices.length === 1
                ? "(" + group.indices[0] + ") "
                : "(" + group.indices.join(",") + ") ";
            li.textContent = prefix + group.label;
            list.appendChild(li);
          });
          container.innerHTML = "";
          container.appendChild(list);
        };

          renderList(docTitleEl, sopTitles, sopTitle || "-");
          renderList(deptEl, departments, department || "-");
          page.querySelector("[data-effective-date]").textContent = effectiveDate;
          return page;
        };

        const setPageNumbers = (pages) => {
          pages.forEach((page, index) => {
            const number = index + 1;
            page.querySelector("[data-page-number]").textContent = number;
            page.querySelector("[data-page-total]").textContent = pages.length;
          });
        };

        const measureContentHeight = (isFirst) => {
          const tempPage = createPage(isFirst);
          tempPage.style.visibility = "hidden";
          document.body.appendChild(tempPage);
          const contentArea = tempPage.querySelector(".page-content");
          const maxHeight = contentArea.clientHeight;
          document.body.removeChild(tempPage);
          return maxHeight;
        };

        const fragmentToPages = (elements, maxHeightFirst, maxHeightOther, mountRoot) => {
          const pages = [];
          const createAndMountPage = (isFirst) => {
            const page = createPage(isFirst);
            mountRoot.appendChild(page);
            pages.push(page);
            return page;
          };
          let currentPage = createAndMountPage(true);
          let contentArea = currentPage.querySelector(".page-content");
          let currentMaxHeight = maxHeightFirst;

          const isOverflowing = () => contentArea.scrollHeight > currentMaxHeight + 0.5;

          const pushPage = () => {
            currentPage = createAndMountPage(false);
            contentArea = currentPage.querySelector(".page-content");
            currentMaxHeight = maxHeightOther;
          };

          const appendNode = (node) => {
            const cloned = node.cloneNode(true);
            contentArea.appendChild(cloned);
            if (isOverflowing()) {
              contentArea.removeChild(cloned);
              pushPage();
              contentArea.appendChild(cloned);
            }
          };

          elements.forEach((element) => {
            if (element.tagName === "OL" || element.tagName === "UL") {
              const listType = element.tagName;
              const items = Array.from(element.children);
              const baseStart =
                listType === "OL"
                  ? element.start || Number(element.getAttribute("start")) || 1
                  : 1;

              let list = document.createElement(listType);
              if (listType === "OL") {
                list.start = baseStart;
              }
              contentArea.appendChild(list);

              items.forEach((item, index) => {
                const li = item.cloneNode(true);
                list.appendChild(li);
                if (isOverflowing()) {
                  list.removeChild(li);
                  if (list.childElementCount === 0) {
                    contentArea.removeChild(list);
                  }
                  pushPage();
                  list = document.createElement(listType);
                  if (listType === "OL") {
                    list.start = baseStart + index;
                  }
                  contentArea.appendChild(list);
                  list.appendChild(li);
                }
              });
            } else {
              appendNode(element);
            }
          });

          return pages;
        };

        try {
          const maxHeightFirst = measureContentHeight(true);
          const maxHeightOther = measureContentHeight(false);
          const elements = [];
          const pushTextParagraphs = (text) => {
            const lines = String(text || "").split(/\\r?\\n/);
            lines.forEach((line) => {
              const p = document.createElement("p");
              if (line.trim() === "") {
                p.innerHTML = "&nbsp;";
              } else {
                p.textContent = line;
              }
              elements.push(p);
            });
          };

          if (isPlainText) {
            pushTextParagraphs(htmlContent);
          } else {
            const normalized = normalizeHtml(htmlContent);
            const parser = document.createElement("div");
            parser.innerHTML = normalized;
            parser.childNodes.forEach((node) => {
              if (node.nodeType === 1) {
                elements.push(node);
              } else if (node.nodeType === 3) {
                const text = node.textContent ? node.textContent : "";
                if (text.trim()) {
                  pushTextParagraphs(text);
                }
              }
            });

            if (elements.length === 0) {
              const text = parser.textContent ? parser.textContent : "";
              if (text.trim()) {
                pushTextParagraphs(text);
              }
            }
          }

          const pagesContainer = document.getElementById("pages");
          const measureRoot = document.createElement("div");
          measureRoot.style.position = "absolute";
          measureRoot.style.visibility = "hidden";
          measureRoot.style.left = "-99999px";
          measureRoot.style.top = "0";
          measureRoot.style.width = "210mm";
          document.body.appendChild(measureRoot);

          const pages = fragmentToPages(elements, maxHeightFirst, maxHeightOther, measureRoot);
          pagesContainer.innerHTML = "";
          pages.forEach((page) => pagesContainer.appendChild(page));
          document.body.removeChild(measureRoot);
          setPageNumbers(pages);
        } catch (error) {
          console.error("Preview render failed:", error);
          const fallbackPage = createPage();
          const contentArea = fallbackPage.querySelector(".page-content");
          if (contentArea) {
            if (isPlainText) {
              contentArea.textContent = htmlContent || "";
            } else {
              contentArea.innerHTML = htmlContent || "";
            }
          }
          const pagesContainer = document.getElementById("pages");
          pagesContainer.appendChild(fallbackPage);
          setPageNumbers([fallbackPage]);
        }
        } catch (error) {
          console.error("Preview bootstrap failed:", error);
          const errorBox = document.createElement("pre");
          errorBox.style.margin = "24px";
          errorBox.style.whiteSpace = "pre-wrap";
          errorBox.textContent = "Preview error: " + (error && error.message ? error.message : String(error));
          document.body.appendChild(errorBox);
        }
      })();
    </script>
  </body>
</html>`;
};

export const openIkPreviewWindow = (data: IkPreviewData) => {
  const html = buildIkPreviewHtml(data);
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      URL.revokeObjectURL(url);
      throw new Error("Popup blocked");
    }
    previewWindow.opener = null;
    previewWindow.location.href = url;
    previewWindow.addEventListener("beforeunload", () => {
      URL.revokeObjectURL(url);
    });
    return;
  } catch (err) {
    if (err instanceof Error && err.message === "Popup blocked") {
      throw err;
    }
    throw new Error("Preview failed");
  }
};
