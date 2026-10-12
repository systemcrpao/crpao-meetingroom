const ALLOWED_TAGS = new Set(["B", "STRONG", "U", "SPAN", "P", "DIV", "BR", "BLOCKQUOTE"]);

function sanitizeElement(el: Element): void {
  const children = [...el.children];
  for (const child of children) {
    const tag = child.tagName.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) {
      while (child.firstChild) {
        el.insertBefore(child.firstChild, child);
      }
      el.removeChild(child);
      continue;
    }
    [...child.attributes].forEach((attr) => {
      if (attr.name === "style") {
        if (tag === "SPAN") {
          const color = attr.value.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]?.trim();
          if (color && /^[#a-zA-Z0-9(),.%\s-]+$/.test(color)) {
            child.setAttribute("style", `color: ${color}`);
          } else {
            child.removeAttribute("style");
          }
          return;
        }
        if (tag === "BLOCKQUOTE" || tag === "P" || tag === "DIV") {
          const margin = attr.value.match(/(?:^|;)\s*margin-left\s*:\s*([^;]+)/i)?.[1]?.trim();
          if (margin && /^[\d.a-zA-Z%()\s-]+$/.test(margin)) {
            child.setAttribute("style", `margin-left: ${margin}`);
          } else {
            child.removeAttribute("style");
          }
          return;
        }
      }
      child.removeAttribute(attr.name);
    });
    if (tag === "SPAN" && !child.getAttribute("style")) {
      while (child.firstChild) {
        el.insertBefore(child.firstChild, child);
      }
      el.removeChild(child);
      continue;
    }
    sanitizeElement(child);
  }
}

/** ทำความสะอาด HTML ประกาศก่อนบันทึก/แสดง */
export function sanitizeAnnouncementHtml(html: string): string {
  const raw = html.trim();
  if (!raw) return "";
  if (typeof document === "undefined") {
    return raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<div id="root">${raw}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return "";
  sanitizeElement(root);
  return root.innerHTML.trim();
}

export function isProbablyAnnouncementHtml(content: string): boolean {
  return /<\s*(b|strong|u|span|p|div|br)\b/i.test(content);
}

export function announcementContentPlainText(content: string): string {
  if (!content.trim()) return "";
  if (typeof document === "undefined") {
    return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = sanitizeAnnouncementHtml(content);
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}
