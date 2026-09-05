/* ==========================================================================
   SIMPLY COZY HOMES — the moving parts of the site
   Every page loads this one file. You should not need to touch it.
   ========================================================================== */

/* ==========================================================================
   SCROLL ANIMATIONS — blocks fade upward as you reach them.
   Turned off automatically if your computer is set to "reduce motion".
   ========================================================================== */
(function () {
	var picks = ".section__head, .head-row, .tier, .pcard, .promise, .card, .deal-band__inner, .signup, .stats > div, .hero__panel, .hero__media, .prose, .note, .phead__inner > div, .post, .showcase, .statrow, .prin__card, .split__img, .split > div, .pullquote, .ctaband, .artimg, .artbody > div, .artside, .pickbox";
	var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var items = document.querySelectorAll(picks);
	var i;

	if (reduce || !("IntersectionObserver" in window)) { return; }

	for (i = 0; i < items.length; i++) { items[i].classList.add("reveal"); }

	function reveal(el) {
		var parent = el.parentNode;
		var order = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
		el.style.transitionDelay = Math.min(order, 5) * 70 + "ms";
		el.classList.add("is-in");
	}

	var watcher = new IntersectionObserver(function (entries) {
		for (var n = 0; n < entries.length; n++) {
			if (entries[n].isIntersecting) {
				reveal(entries[n].target);
				watcher.unobserve(entries[n].target);
			}
		}
	}, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });

	for (i = 0; i < items.length; i++) { watcher.observe(items[i]); }

	/* safety net when you switch pages: show anything already on screen */
	window.__revealNow = function () {
		var all = document.querySelectorAll(".reveal:not(.is-in)");
		for (var n = 0; n < all.length; n++) {
			var box = all[n].getBoundingClientRect();
			if (box.top < window.innerHeight && box.bottom > 0) {
				reveal(all[n]);
				watcher.unobserve(all[n]);
			}
		}
	};
})();

/* ==========================================================================
   THE GLOWING POINTER — a ring that trails your mouse and swells on links.
   Ignored on phones and tablets (no mouse) and with "reduce motion" on.
   ========================================================================== */
(function () {
	var ring = document.querySelector(".cursor-ring");
	var dot = document.querySelector(".cursor-dot");
	var hasMouse = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
	var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var targetX = 0, targetY = 0, ringX = 0, ringY = 0, started = false;

	if (!ring || !dot || !hasMouse || reduce) { return; }

	document.addEventListener("mousemove", function (event) {
		targetX = event.clientX;
		targetY = event.clientY;
		if (!started) {
			started = true;
			ringX = targetX;
			ringY = targetY;
			document.body.classList.add("cursor-on");
		}
		dot.style.transform = "translate(" + targetX + "px," + targetY + "px)";
		var over = event.target.closest ? event.target.closest("a, button, input, .tier, .card, .pcard") : null;
		if (over) {
			document.body.classList.add("cursor-hot");
		} else {
			document.body.classList.remove("cursor-hot");
		}
	});

	document.addEventListener("mouseleave", function () {
		document.body.classList.remove("cursor-on");
		started = false;
	});

	(function follow() {
		ringX += (targetX - ringX) * 0.18;
		ringY += (targetY - ringY) * 0.18;
		ring.style.transform = "translate(" + ringX + "px," + ringY + "px)";
		window.requestAnimationFrame(follow);
	})();
})();

/* ==========================================================================
   BACK-TO-TOP BUTTON + the shadow under the menu bar
   ========================================================================== */
(function () {
	var button = document.querySelector(".to-top");

	function onScroll() {
		var y = window.pageYOffset || document.documentElement.scrollTop;
		if (y > 8) {
			document.body.classList.add("is-scrolled");
		} else {
			document.body.classList.remove("is-scrolled");
		}
		if (button) {
			if (y > 420) {
				button.classList.add("is-on");
			} else {
				button.classList.remove("is-on");
			}
		}
	}

	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();

	if (button) {
		button.addEventListener("click", function () {
			if ("scrollBehavior" in document.documentElement.style) {
				window.scrollTo({ top: 0, behavior: "smooth" });
			} else {
				window.scrollTo(0, 0);
			}
		});
	}
})();

/* ==========================================================================
   BLOG CATEGORY BUTTONS AND SEARCH BOX
   Filters the article cards on the blog page. Safe to leave alone.
   ========================================================================== */
(function () {
	var grid = document.getElementById("blog-posts");
	var bar = document.getElementById("blog-filters");
	var search = document.getElementById("blog-search");
	var empty = document.getElementById("blog-empty");
	if (!grid || !bar) { return; }

	var buttons = bar.querySelectorAll("button");
	var cards = grid.querySelectorAll(".post");
	var active = "all";

	function apply() {
		var term = search && search.value ? search.value.toLowerCase().trim() : "";
		var shown = 0;
		var i;
		for (i = 0; i < cards.length; i++) {
			var card = cards[i];
			var matchesCategory = active === "all" || card.getAttribute("data-cat") === active;
			var matchesText = !term || card.textContent.toLowerCase().indexOf(term) !== -1;
			var show = matchesCategory && matchesText;
			card.style.display = show ? "" : "none";
			if (show) { shown++; }
		}
		if (empty) { empty.style.display = shown === 0 ? "block" : "none"; }
		if (window.__revealNow) { window.setTimeout(window.__revealNow, 30); }
	}

	for (var n = 0; n < buttons.length; n++) {
		buttons[n].addEventListener("click", function () {
			for (var m = 0; m < buttons.length; m++) { buttons[m].classList.remove("is-on"); }
			this.classList.add("is-on");
			active = this.getAttribute("data-filter");
			apply();
		});
	}

	if (search) {
		search.addEventListener("input", apply);
	}
})();

/* ==========================================================================
   CATEGORY LINKS FROM OTHER PAGES
   Opening blog.html#kitchen pre-selects the Kitchen button for you.
   ========================================================================== */
(function () {
	var name = (window.location.hash || "").replace("#", "").toLowerCase();
	var bar = document.getElementById("blog-filters");
	if (!bar || !/^[a-z]+$/.test(name)) { return; }
	var button = bar.querySelector('[data-filter="' + name + '"]');
	if (button) { button.click(); }
})();

/* ==========================================================================
   SMOOTH SCROLL for the "In this guide" links on article pages
   ========================================================================== */
(function () {
	var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduce || !("scrollBehavior" in document.documentElement.style)) { return; }
	document.documentElement.style.scrollBehavior = "smooth";
})();
