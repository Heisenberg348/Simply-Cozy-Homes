/* ============================================================
   Simply Cozy Homes - editor engine (SCE)
   ------------------------------------------------------------
   This file is the missing engine that editor.html needs.
   editor.html handles the buttons and boxes. This file finds
   the editable bits of a page, builds the preview, and writes
   the page back out again.

   You should not need to touch this file.
   ============================================================ */
(function () {
	"use strict";

	var seq = 0;

	/* ---------------------------------------------------------- helpers */

	function text(el) {
		return (el.textContent || "").replace(/\s+/g, " ").trim();
	}

	function plain(html) {
		var d = document.createElement("div");
		d.innerHTML = String(html == null ? "" : html);
		return (d.textContent || "").replace(/\s+/g, " ").trim();
	}

	/* Blocks of words. If one of these sits inside another we only
	   offer the outer one, so a paragraph stays in one piece. */
	var BLOCK = "h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,summary,blockquote,figcaption";

	function isReg(el) { return el && el.__sceReg === true; }

	function hasRegAncestor(el) {
		var p = el.parentElement;
		while (p) {
			if (isReg(p)) { return true; }
			p = p.parentElement;
		}
		return false;
	}

	function inSkipZone(el) {
		var p = el;
		while (p) {
			var t = p.tagName;
			if (t === "SCRIPT" || t === "STYLE" || t === "NOSCRIPT" || t === "SVG") { return true; }
			if (p.getAttribute && p.getAttribute("data-sce-skip") !== null) { return true; }
			p = p.parentElement;
		}
		return false;
	}

	/* Friendly names instead of tag names. */
	function labelFor(el) {
		var tag = el.tagName.toLowerCase();
		var cls = " " + (el.className && el.className.toString ? el.className.toString() : "") + " ";

		if (tag === "title") { return "Browser tab title"; }
		if (tag === "meta") { return "Google description"; }
		if (tag === "img") { return "Photo"; }
		if (tag === "input") { return "Form box hint"; }
		if (tag === "button") { return "Button"; }
		if (tag === "summary") { return "Question"; }
		if (tag === "a") { return "Button or link"; }

		if (cls.indexOf("eyebrow") !== -1) { return "Small label above heading"; }
		if (cls.indexOf("stats__num") !== -1 || cls.indexOf("prin__num") !== -1 ||
			cls.indexOf("tier__num") !== -1) { return "Big number"; }
		if (cls.indexOf("stats__label") !== -1) { return "Number caption"; }
		if (cls.indexOf("chip") !== -1) { return "Small tag"; }
		if (cls.indexOf("price") !== -1) { return "Price line"; }

		if (tag === "h1") { return "Main heading"; }
		if (tag === "h2") { return "Section heading"; }
		if (tag === "h3") { return "Small heading"; }
		if (tag === "h4" || tag === "h5" || tag === "h6") { return "Minor heading"; }
		if (tag === "li") { return "List item"; }
		if (tag === "td" || tag === "th") { return "Table cell"; }
		if (tag === "blockquote") { return "Quote"; }
		if (tag === "figcaption") { return "Photo caption"; }
		if (tag === "p") { return "Paragraph"; }
		return "Text";
	}

	/* Which part of the page this field belongs to. */
	function groupFor(el) {
		var p = el.parentElement;
		while (p) {
			var tag = p.tagName;
			if (tag === "SECTION" || tag === "HEADER" || tag === "FOOTER" ||
				tag === "NAV" || tag === "ARTICLE" || tag === "MAIN") {
				var cls = " " + (p.className && p.className.toString ? p.className.toString() : "") + " ";
				if (tag === "NAV") { return "Top menu"; }
				if (tag === "HEADER" || cls.indexOf("site-header") !== -1) { return "Top of page"; }
				if (tag === "FOOTER" || cls.indexOf("site-footer") !== -1) { return "Bottom of page"; }

				var h = p.querySelector("h1,h2");
				var name = h ? plain(h.innerHTML) : "";
				if (name.length > 46) { name = name.slice(0, 46) + "..."; }
				if (name) { return name; }

				if (cls.indexOf("hero") !== -1) { return "Hero (very top)"; }
				if (cls.indexOf("signup") !== -1) { return "Email signup"; }
				return "Section";
			}
			p = p.parentElement;
		}
		return "Other";
	}

	function mk(el, type, group, extra) {
		seq += 1;
		var id = "f" + seq;
		el.setAttribute("data-sce-id", id);
		el.__sceReg = true;

		var f = {
			id: id,
			node: el,
			type: type,
			label: labelFor(el),
			group: group || groupFor(el)
		};
		if (extra) {
			var k;
			for (k in extra) {
				if (Object.prototype.hasOwnProperty.call(extra, k)) { f[k] = extra[k]; }
			}
		}
		return f;
	}

	/* ---------------------------------------------------------- parse */

	function parseHtml(source) {
		var str = String(source == null ? "" : source);
		var doc = new DOMParser().parseFromString(str, "text/html");
		if (!doc || !doc.documentElement) {
			throw new Error("That file does not look like a web page.");
		}
		if (!doc.body) {
			throw new Error("That page has no body section.");
		}
		return doc;
	}

	/* ---------------------------------------------------------- collect */

	function collectFields(doc) {
		seq = 0;
		var out = [];

		/* --- page settings first: tab title and Google description --- */
		var t = doc.querySelector("title");
		if (t) {
			out.push(mk(t, "title", "Page settings", { value: t.innerHTML }));
		}

		var metas = [
			['meta[name="description"]', "Google description"],
			['meta[property="og:title"]', "Share title (Facebook etc.)"],
			['meta[property="og:description"]', "Share description"]
		];
		metas.forEach(function (pair) {
			var m = doc.querySelector(pair[0]);
			if (!m) { return; }
			var f = mk(m, "meta", "Page settings", { value: m.getAttribute("content") || "" });
			f.label = pair[1];
			out.push(f);
		});

		/* --- then everything in the visible page, top to bottom --- */
		var all = doc.body.querySelectorAll("*");
		var i;
		for (i = 0; i < all.length; i++) {
			var el = all[i];
			if (isReg(el) || inSkipZone(el)) { continue; }

			var tag = el.tagName.toLowerCase();

			/* photos */
			if (tag === "img") {
				if (hasRegAncestor(el)) { continue; }
				out.push(mk(el, "image", null, {
					src: el.getAttribute("src") || "",
					alt: el.getAttribute("alt") || ""
				}));
				continue;
			}

			/* grey hint text inside form boxes */
			if (tag === "input" && el.getAttribute("placeholder") !== null) {
				if (hasRegAncestor(el)) { continue; }
				out.push(mk(el, "placeholder", null, {
					value: el.getAttribute("placeholder") || ""
				}));
				continue;
			}

			if (hasRegAncestor(el)) { continue; }
			if (!text(el)) { continue; }

			/* a block of words, as long as it has no smaller block inside it */
			if (el.matches(BLOCK)) {
				if (el.querySelector(BLOCK)) { continue; }
				var extra = { value: el.innerHTML };
				out.push(mk(el, "html", null, extra));
				continue;
			}

			/* a button or standalone link */
			if (tag === "a" || tag === "button") {
				if (el.querySelector(BLOCK)) { continue; }
				var linkExtra = { value: el.innerHTML };
				if (tag === "a") { linkExtra.href = el.getAttribute("href") || ""; }
				out.push(mk(el, "html", null, linkExtra));
				continue;
			}

			/* a lone bit of text such as a big number */
			if (el.children.length === 0) {
				out.push(mk(el, "html", null, { value: el.innerHTML }));
			}
		}

		return out;
	}

	/* ---------------------------------------------------------- group */

	function groupFields(fields) {
		var order = [];
		var map = {};
		fields.forEach(function (f) {
			var name = f.group || "Other";
			if (!map[name]) {
				map[name] = { name: name, fields: [] };
				order.push(map[name]);
			}
			map[name].fields.push(f);
		});
		return order;
	}

	/* ---------------------------------------------------------- apply */

	function applyField(field, patch) {
		if (!field || !field.node || !patch) { return field; }
		var el = field.node;

		if (Object.prototype.hasOwnProperty.call(patch, "src")) {
			field.src = patch.src;
			el.setAttribute("src", patch.src);
		}
		if (Object.prototype.hasOwnProperty.call(patch, "alt")) {
			field.alt = patch.alt;
			el.setAttribute("alt", patch.alt);
		}
		if (Object.prototype.hasOwnProperty.call(patch, "href")) {
			field.href = patch.href;
			el.setAttribute("href", patch.href);
		}
		if (Object.prototype.hasOwnProperty.call(patch, "value")) {
			field.value = patch.value;
			if (field.type === "meta") {
				el.setAttribute("content", patch.value);
			} else if (field.type === "placeholder") {
				el.setAttribute("placeholder", patch.value);
			} else {
				el.innerHTML = patch.value;
			}
		}
		return field;
	}

	/* ---------------------------------------------------------- preview */

	var HOT_CSS =
		"[data-sce-hot]{outline:3px solid #D07A50 !important;" +
		"outline-offset:3px;border-radius:3px;" +
		"box-shadow:0 0 0 9999px rgba(0,0,0,.08) inset}";

	function previewHtml(doc, baseHref) {
		var clone = doc.documentElement.cloneNode(true);
		var head = clone.querySelector("head");

		if (head) {
			/* make images and stylesheets load from the real folder */
			if (baseHref) {
				var base = doc.createElement("base");
				base.setAttribute("href", baseHref);
				head.insertBefore(base, head.firstChild);
			}
			var st = doc.createElement("style");
			st.textContent = HOT_CSS;
			head.appendChild(st);
		}

		/* the preview never needs to run the site's own scripts */
		var scripts = clone.querySelectorAll("script");
		var i;
		for (i = scripts.length - 1; i >= 0; i--) {
			if (scripts[i].parentNode) { scripts[i].parentNode.removeChild(scripts[i]); }
		}

		return "<!DOCTYPE html>\n" + clone.outerHTML;
	}

	/* ---------------------------------------------------------- save */

	function serialize(doc) {
		var clone = doc.documentElement.cloneNode(true);

		/* strip the invisible markers the editor added */
		var marked = clone.querySelectorAll("[data-sce-id],[data-sce-hot]");
		var i;
		for (i = 0; i < marked.length; i++) {
			marked[i].removeAttribute("data-sce-id");
			marked[i].removeAttribute("data-sce-hot");
		}

		/* No trailing newline here on purpose. Anything after </html> gets
		   read back into the page as blank space, so adding one would make
		   the file grow slightly every single time you pressed Save. */
		return "<!DOCTYPE html>\n" + clone.outerHTML;
	}

	/* ---------------------------------------------------------- export */

	window.SCE = {
		parseHtml: parseHtml,
		collectFields: collectFields,
		groupFields: groupFields,
		applyField: applyField,
		previewHtml: previewHtml,
		serialize: serialize,
		plain: plain
	};
})();
