/*
 * audit-ui.js — deterministic, read-only audit of a *rendered* UI.
 *
 * ── Interface ────────────────────────────────────────────────────────────────
 * Load this file in the page you are reviewing (or inject its source through a
 * browser evaluate call), then call:
 *
 *   auditUI();                       // regions = [data-ui-density]
 *   auditUI({regionSelector:'.row'}); // explicit regions, e.g. the baseline row
 *   auditUI({profile:'brand'});       // marketing/brand surface: effects become
 *                                     // a manual worklist, density is opt-in
 *
 * The function is synchronous and returns a plain JSON-serializable object. It
 * reads the live DOM through getComputedStyle, Range.getClientRects() and
 * elementsFromPoint(). It never writes the DOM, focuses anything or scrolls.
 * Calling it twice on an unchanged page returns the same measurements.
 *
 * Regions are the elements matched by `regionSelector` (default
 * `[data-ui-density]`). Each region's `data-ui-density` value is `scan`,
 * `dense` or `editor`; a missing value means `scan`. Text inside a region may
 * carry `data-ui-role="primary|secondary|muted|dense"`; the nearest
 * ancestor-or-self role applies to a run. Unmarked copy is `default`. `dense`
 * exists only for tabular cells and headers (13px floor): it is a declared
 * exception, never a general metadata tier.
 *
 * Text inside an inactive control (`:disabled`, `[aria-disabled="true"]`, a
 * disabled fieldset) is excluded from contrast, because WCAG 1.4.3 exempts
 * inactive components and the craft rules require it to look inactive. Its
 * font size is still measured.
 *
 * `profile:'brand'` is for marketing and brand surfaces. Effects the audit
 * cannot composite (background image, gradient, filter, blend mode, text
 * shadow or stroke, overlay, gradient text) are reported as `manual` with an
 * element path instead of `unsupported`; font and contrast floors still apply
 * to text over solid backgrounds, and density budgets are opt-in via regions.
 *
 * Output (short form):
 *   {
 *     version, theme, viewport, options,
 *     limits: { fonts, contrast, density, sampling },
 *     readability: { samples, errors, unsupported, manual, counts },
 *     density: { budgets, regions, errors },
 *     pass, caveats
 *   }
 *
 * `pass` is true only when: at least one visible text run was actually
 * inspected; every font-size and contrast sample met its floor; every region
 * met its budget and every density setup check passed. Any unsupported
 * contrast sample forces `pass: false` — the audit never silently substitutes
 * a plausible color.
 *
 * ── Measurement limits (read these before trusting a number) ─────────────────
 * - Sizes are CSS pixels from getComputedStyle, including `::placeholder`.
 *   Browser zoom, page zoom and CSS transforms are not folded in.
 * - Contrast is the WCAG 2.x sRGB ratio. Foreground is composited over the
 *   ancestor background stack, including ancestor opacity groups. Only uniform
 *   ancestor background colors are modelled. Background images and gradients,
 *   CSS filters, backdrop-filter, blend modes, text-shadow/stroke, gradient
 *   text, overlays found by hit testing, and pages whose effective background
 *   depends on the UA canvas are reported as `unsupported`; they are not
 *   assumed to pass.
 * - Text coverage is the union area of text line rectangles from Range
 *   geometry, clipped to the region's border box. It is line-box area, not
 *   glyph ink: line-height and inline padding inflate it, so it is a density
 *   heuristic, not a measure of optical grey.
 * - `visibleCharacters` counts Unicode code points of normalized visible text
 *   (whitespace collapsed and trimmed). Emoji sequences and grapheme clusters
 *   may count as more than one. Characters are counted once per text node;
 *   ancestors do not re-count descendant text.
 * - `visibleControls` counts visible interactive elements: buttons, links,
 *   form controls, summaries, contenteditable hosts and ARIA widget roles.
 * - Region area is the border box; padding is the region's own computed
 *   padding. Coverage and character budgets are local project policy, not
 *   WCAG, and not a validated measure of human-perceived crampedness.
 * - Offscreen records are measured if they are laid out (the viewport is not
 *   used to exclude them), but ancestor overflow clipping is honoured.
 * - Not measured: text in iframes, closed shadow roots, canvas, images,
 *   SVG <text>, CSS counters/list markers, drawn/UA-canvas content, display
 *   color management (the 2D canvas gives 8-bit sRGB, gamut-clipped), and
 *   non-text indicators. A pass cannot prove taste, hierarchy, grouping or
 *   restraint.
 *
 * No dependencies. Chromium/Blink is the target (OffscreenCanvas, Range,
 * elementsFromPoint, CSS.supports).
 */
(function () {
  'use strict';

  const VERSION = '1.1.0';
  const DEFAULT_REGION_SELECTOR = '[data-ui-density]';
  const SCAN = 'scan';

  // Declared project policy. These are deliberately named local heuristics,
  // not accessibility thresholds. Do not "fix" a run by lowering them.
  // scan.visibleControls moved 3 -> 4 on 2026-10-28: a triage row that carries
  // approve, edit, skip and a per-row remove is four real decisions, and the
  // old budget was written for three. Characters and coverage are unchanged.
  // `dense` exists for data tables, which are a different job from a review
  // row: more columns, tighter side padding, more text by design.
  const BUDGETS = {
    scan:   { visibleCharacters: 220,  visibleControls: 4,  textCoverage: 0.35, padding: 16 },
    dense:  { visibleCharacters: 420,  visibleControls: 6,  textCoverage: 0.50, padding: 12 },
    editor: { visibleCharacters: 1600, visibleControls: 24, textCoverage: 0.50, padding: 16 }
  };

  // `dense` is the one declared exception to the 14px floor: tabular cells and
  // headers only. It is never a licence to shrink prose, names or labels.
  const FONT = { base: 14, primary: 16, dense: 13 };
  const CONTRAST_LIGHT = { primary: 4.5, secondary: 4.5, muted: 4.5, dense: 4.5, default: 4.5 };
  // Dark floors are higher: light text on dark ground halates and quiet tiers
  // lose the most apparent contrast.
  const CONTRAST_DARK = { primary: 7, secondary: 6, muted: 5.5, dense: 6, default: 7 };
  const ROLES = { primary: 1, secondary: 1, muted: 1, dense: 1 };

  // Effects that cannot be composited. In the product profile they force a
  // failing run; in the brand profile they become a manual worklist because
  // marketing surfaces legitimately put type over imagery and gradient fields.
  const MANUAL_ONLY_CODES = new Set([
    'background-image', 'filter', 'backdrop-filter', 'blend-mode',
    'text-shadow', 'text-stroke', 'gradient-text', 'overlay',
    'generated-text', 'svg-text'
  ]);

  const CONTROL_ROLES = new Set([
    'button', 'link', 'checkbox', 'radio', 'switch', 'combobox', 'textbox',
    'searchbox', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'treeitem'
  ]);

  const SKIP_TAGS = new Set([
    'script', 'style', 'template', 'noscript', 'head', 'title', 'meta', 'link',
    'base', 'option', 'optgroup', 'datalist', 'param', 'source', 'track',
    'canvas', 'video', 'audio', 'object', 'embed', 'iframe', 'img', 'map',
    'area', 'br', 'wbr', 'hr'
  ]);

  const NON_TEXT_INPUTS = new Set([
    'checkbox', 'radio', 'range', 'color', 'file', 'image', 'hidden'
  ]);

  const MAX_REPORTED_SAMPLES = 5000;
  const EPS = 0.5 / 255;

  // ── generic helpers ────────────────────────────────────────────────────────

  function n2(value) {
    return Math.round(value * 100) / 100;
  }

  function n4(value) {
    return Math.round(value * 10000) / 10000;
  }

  function preview(text, limit) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.length > limit ? value.slice(0, limit - 1) + '…' : value;
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function charCount(text) {
    return Array.from(normalizeText(text)).length;
  }

  function pathFor(element) {
    if (!element || element.nodeType !== 1) return '(unknown)';
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && parts.length < 4) {
      let part = node.localName || '?';
      if (node.id) {
        part += '#' + node.id;
      } else if (node.classList && node.classList.length) {
        part += '.' + Array.from(node.classList).slice(0, 2).join('.');
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function parsePx(value) {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  // `background-clip: text` paints the glyph with the background, not `color`.
  // That cannot be sampled from the color stack and is reported unsupported.
  function hasTextClip(style) {
    if (!style) return false;
    return /\btext\b/.test(`${style.backgroundClip || ''} ${style.webkitBackgroundClip || ''}`);
  }

  function rectArea(r) {
    return Math.max(0, r.width) * Math.max(0, r.height);
  }

  function intersect(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) return null;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  // Exact union area of axis-aligned rectangles by x-slab decomposition.
  function unionArea(rects) {
    if (!rects.length) return 0;
    const xs = Array.from(new Set(rects.flatMap(r => [r.left, r.right]))).sort((a, b) => a - b);
    let area = 0;
    for (let i = 0; i < xs.length - 1; i += 1) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      if (x1 <= x0) continue;
      const intervals = [];
      for (const r of rects) {
        if (r.left < x1 && r.right > x0) intervals.push([r.top, r.bottom]);
      }
      if (!intervals.length) continue;
      intervals.sort((a, b) => a[0] - b[0]);
      let covered = 0;
      let start = intervals[0][0];
      let end = intervals[0][1];
      for (let j = 1; j < intervals.length; j += 1) {
        const [top, bottom] = intervals[j];
        if (top > end) {
          covered += end - start;
          start = top;
          end = bottom;
        } else if (bottom > end) {
          end = bottom;
        }
      }
      covered += end - start;
      area += covered * (x1 - x0);
    }
    return area;
  }

  // ── color parsing (browser → 8-bit sRGB) ─────────────────────────────────
  // The browser is the parser and color-space converter. A 1×1 sRGB 2D
  // canvas resolves any supported computed CSS color (rgb, hsl, lab, oklch,
  // display-p3, …) to 8-bit sRGB bytes, including gamut clipping. If the
  // browser rejects the value or cannot give us a 2D context, the sample is
  // unsupported; it is never guessed. Sampling is 8-bit, so sub-8-bit
  // differences and display color management are not modelled.

  const colorCache = new Map();
  let colorContext = null;
  let colorContextTried = false;

  function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
  }

  function srgbToLinear(value) {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function getColorContext() {
    if (colorContext || colorContextTried) return colorContext;
    colorContextTried = true;
    const options = { colorSpace: 'srgb', willReadFrequently: true };
    try {
      colorContext = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(1, 1).getContext('2d', options)
        : null;
    } catch (error) {
      colorContext = null;
    }
    if (!colorContext) {
      try {
        colorContext = document.createElement('canvas').getContext('2d', options);
      } catch (error) {
        colorContext = null;
      }
    }
    return colorContext;
  }

  function parseColor(value) {
    const key = String(value || '').trim().toLowerCase();
    if (colorCache.has(key)) return colorCache.get(key);
    let parsed = null;
    if (key === 'transparent') {
      parsed = { r: 0, g: 0, b: 0, a: 0 };
    } else if (key && key !== 'currentcolor' && key !== 'inherit' && key !== 'initial' && key !== 'unset') {
      try {
        const supported = typeof CSS !== 'undefined' && CSS.supports('color', key);
        const ctx = supported ? getColorContext() : null;
        if (ctx) {
          const sentinel = '#0a0b0c';
          ctx.fillStyle = sentinel;
          ctx.fillStyle = key;
          if (ctx.fillStyle === sentinel && key !== sentinel) {
            parsed = null;
          } else {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillRect(0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            parsed = { r: data[0] / 255, g: data[1] / 255, b: data[2] / 255, a: data[3] / 255 };
          }
        }
      } catch (error) {
        parsed = null;
      }
    }
    colorCache.set(key, parsed);
    return parsed;
  }

  function colorCss(color) {
    if (!color) return 'unknown';
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return color.a >= 0.999 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${n2(color.a)})`;
  }

  function luminance(color) {
    const r = srgbToLinear(clamp01(color.r));
    const g = srgbToLinear(clamp01(color.g));
    const b = srgbToLinear(clamp01(color.b));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  // ── alpha compositing and ancestor groups ─────────────────────────────────

  function premul(color) {
    return { r: color.r * color.a, g: color.g * color.a, b: color.b * color.a, a: color.a };
  }

  function over(top, bottom) {
    const keep = 1 - top.a;
    return {
      r: top.r + bottom.r * keep,
      g: top.g + bottom.g * keep,
      b: top.b + bottom.b * keep,
      a: top.a + bottom.a * keep
    };
  }

  function scaled(color, opacity) {
    return { r: color.r * opacity, g: color.g * opacity, b: color.b * opacity, a: color.a * opacity };
  }

  function unpremul(color) {
    if (color.a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
    return { r: color.r / color.a, g: color.g / color.a, b: color.b / color.a, a: color.a };
  }

  function colorDelta(a, b) {
    const x = unpremul(a);
    const y = unpremul(b);
    return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b), Math.abs(x.a - y.a));
  }

  // ── main audit ─────────────────────────────────────────────────────────────

  function auditUI(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const profile = String(opts.profile || 'product').trim().toLowerCase();
    if (profile !== 'product' && profile !== 'brand') {
      throw new Error(`auditUI: unknown profile "${opts.profile}". Use 'product' (default) or 'brand'.`);
    }
    const documentRef = document;
    const root = documentRef.body || documentRef.documentElement;
    // System colors can change with the emulated theme; never reuse a parsed
    // color across audits.
    colorCache.clear();
    const styleCache = new Map();
    const hiddenCache = new Map();
    const clipCache = new Map();
    const roleCache = new Map();
    const regionMap = new Map();
    const samples = [];
    const runs = [];
    const controls = [];
    const errors = [];
    const unsupportedMap = new Map();
    const manualMap = new Map();
    const unknownRoleReported = new Set();
    const counts = {
      elementsVisited: 0,
      textNodesSeen: 0,
      textSamples: 0,
      controlSamples: 0,
      controlsSeen: 0,
      excludedHidden: 0,
      excludedInvisible: 0,
      excludedInactive: 0
    };

    const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    const forcedColors = typeof matchMedia === 'function' && matchMedia('(forced-colors: active)').matches;
    const theme = dark ? 'dark' : 'light';
    const contrastFloors = dark ? CONTRAST_DARK : CONTRAST_LIGHT;
    const htmlStyle = root ? getComputedStyle(documentRef.documentElement) : null;

    function styleOf(element, pseudo) {
      const key = element;
      if (!pseudo && styleCache.has(key)) return styleCache.get(key);
      let style;
      try {
        style = getComputedStyle(element, pseudo || null);
      } catch (error) {
        style = null;
      }
      if (!pseudo) styleCache.set(key, style);
      return style;
    }

    function addUnsupported(code, element, detail) {
      const path = pathFor(element);
      const key = code + '|' + path;
      let entry = unsupportedMap.get(key);
      if (!entry) {
        entry = { code, path, detail: detail || '', count: 0, example: '' };
        unsupportedMap.set(key, entry);
      }
      entry.count += 1;
      return entry;
    }

    // Brand surfaces legitimately set type over gradients and imagery. The
    // audit cannot composite those, so it hands back a worklist instead of
    // pretending the ratio is unknown-to-fail. Product surfaces stay strict.
    function addBlocker(code, element, detail) {
      if (profile === 'brand' && MANUAL_ONLY_CODES.has(code)) {
        const path = pathFor(element);
        const key = code + '|' + path;
        let entry = manualMap.get(key);
        if (!entry) {
          entry = {
            code,
            path,
            detail: detail || '',
            count: 0,
            example: '',
            action: code === 'text-shadow' || code === 'text-stroke'
              ? 'Sample the glyph against the lightest and darkest pixels behind it; a shadow does not earn contrast for the text.'
              : 'Measure the worst-case text/background contrast at every stop, crop and hover state; record the value.'
          };
          manualMap.set(key, entry);
        }
        entry.count += 1;
        return entry;
      }
      return addUnsupported(code, element, detail);
    }

    function addError(error) {
      errors.push(error);
    }

    // ── visibility ───────────────────────────────────────────────────────────

    function srOnly(element, style) {
      const rect = element.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0 && rect.width <= 1 && rect.height <= 1)) return false;
      const clips = style.overflowX !== 'visible' || style.overflowY !== 'visible' ||
        (style.clip && style.clip !== 'auto') || (style.clipPath && style.clipPath !== 'none');
      return Boolean(clips);
    }

    function isHidden(element) {
      if (hiddenCache.has(element)) return hiddenCache.get(element);
      const parent = element.parentElement;
      const parentHidden = parent ? isHidden(parent) : false;
      // Closed <details> can retain geometry for descendants in Chromium.
      // Only its first direct summary is rendered; the rest is deferred.
      const closedDetails = parent && parent.localName === 'details' && !parent.open;
      let hidden = parentHidden ||
        (closedDetails && element !== parent.querySelector(':scope > summary'));
      if (!hidden) {
        const style = styleOf(element);
        if (!style) {
          hidden = true;
        } else if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          style.contentVisibility === 'hidden' ||
          parseFloat(style.opacity) === 0 ||
          srOnly(element, style)
        ) {
          hidden = true;
        }
      }
      hiddenCache.set(element, hidden);
      return hidden;
    }

    // Inactive controls are exempt from contrast (WCAG 1.4.3) and are meant to
    // look inactive. Their text is still measured for size.
    function inactiveControl(element) {
      let node = element;
      while (node && node.nodeType === 1) {
        if (node.getAttribute('aria-disabled') === 'true') return node;
        if (typeof node.matches === 'function' && node.matches(':disabled')) return node;
        node = node.parentElement;
      }
      return null;
    }

    function clipRectFor(element) {
      if (clipCache.has(element)) return clipCache.get(element);
      const parent = element.parentElement;
      let clip = parent
        ? clipRectFor(parent)
        : { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
      const style = styleOf(element);
      if (style && (style.overflowX !== 'visible' || style.overflowY !== 'visible' || style.overflow === 'clip')) {
        const rect = element.getBoundingClientRect();
        const box = {
          left: rect.left + parsePx(style.borderLeftWidth),
          top: rect.top + parsePx(style.borderTopWidth),
          right: rect.right - parsePx(style.borderRightWidth),
          bottom: rect.bottom - parsePx(style.borderBottomWidth),
          width: Math.max(0, rect.width - parsePx(style.borderLeftWidth) - parsePx(style.borderRightWidth)),
          height: Math.max(0, rect.height - parsePx(style.borderTopWidth) - parsePx(style.borderBottomWidth))
        };
        clip = intersect(clip, box) || { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      }
      clipCache.set(element, clip);
      return clip;
    }

    // ── role resolution ──────────────────────────────────────────────────────

    function roleFor(element) {
      if (roleCache.has(element)) return roleCache.get(element);
      let node = element;
      let holder = null;
      while (node && node.nodeType === 1) {
        if (node.hasAttribute('data-ui-role')) {
          holder = node;
          break;
        }
        node = node.parentElement;
      }
      const raw = holder ? String(holder.getAttribute('data-ui-role') || '').trim().toLowerCase() : '';
      let role = raw || 'default';
      if (raw && !ROLES[raw]) {
        if (!unknownRoleReported.has(holder)) {
          unknownRoleReported.add(holder);
          addError({
            code: 'unknown-role',
            path: pathFor(holder),
            actual: raw,
            required: 'primary, secondary, muted or dense'
          });
        }
        role = 'default';
      }
      const result = { role, holder, invalid: Boolean(raw && !ROLES[raw]) };
      roleCache.set(element, result);
      return result;
    }

    function requiredFontFor(role) {
      if (role === 'primary') return FONT.primary;
      if (role === 'dense') return FONT.dense;
      return FONT.base;
    }

    function requiredContrastFor(role) {
      return contrastFloors[role] != null ? contrastFloors[role] : contrastFloors.default;
    }

    // `-webkit-text-fill-color` overrides `color` for the glyph fill and is
    // inherited. If it differs from the computed color, it is the real paint.
    // A non-color serialization is unsupported rather than silently ignored.
    function resolveGlyphColor(style, colorValue) {
      const base = parseColor(colorValue);
      const fillRaw = style && style.webkitTextFillColor;
      if (!fillRaw || String(fillRaw).toLowerCase() === 'currentcolor') return base;
      const fill = parseColor(fillRaw);
      if (!fill) return null;
      if (base && fill.r === base.r && fill.g === base.g && fill.b === base.b && fill.a === base.a) return base;
      return fill;
    }

    // ── background/foreground analysis ───────────────────────────────────────

    function chainFor(element) {
      const chain = [];
      let node = element;
      while (node && node.nodeType === 1) {
        const style = styleOf(node);
        if (!style) break;
        chain.push({
          element: node,
          background: parseColor(style.backgroundColor),
          backgroundColorRaw: style.backgroundColor,
          opacity: (() => {
            const value = parseFloat(style.opacity);
            return Number.isFinite(value) ? clamp01(value) : 1;
          })(),
          backgroundImage: style.backgroundImage || 'none',
          backgroundClip: `${style.backgroundClip || ''} ${style.webkitBackgroundClip || ''}`,
          textShadow: style.textShadow || 'none',
          textStroke: parsePx(style.webkitTextStrokeWidth || '0'),
          filter: style.filter || 'none',
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
          blendMode: style.mixBlendMode || 'normal',
          backgroundBlendMode: style.backgroundBlendMode || 'normal',
          borderLeftWidth: style.borderLeftWidth,
          borderTopWidth: style.borderTopWidth,
          overflow: style.overflow
        });
        node = node.parentElement;
      }
      chain.reverse();
      return chain;
    }

    function paintChain(chain, index, base, includeGlyph, glyph) {
      const item = chain[index];
      const own = premul(item.background || { r: 0, g: 0, b: 0, a: 0 });
      let content;
      if (index === chain.length - 1) {
        content = includeGlyph && glyph ? over(glyph, own) : own;
      } else {
        content = paintChain(chain, index + 1, own, includeGlyph, glyph);
      }
      return over(scaled(content, item.opacity), base);
    }

    function checkContrastSupport(chain, glyphElement, glyphColor) {
      const blockers = [];
      const last = chain.length - 1;

      // Walk from the glyph outward. `transmission` is the fraction of layers
      // farther away that can still be seen through the layers already crossed.
      // Background images are unsupported while they are visible at the sample
      // point; an opaque color blocks farther layers until an ancestor opacity
      // group lets the outside world back through.
      let transmission = 1;
      for (let i = last; i >= 0; i -= 1) {
        const item = chain[i];
        if (transmission > 0 && item.backgroundImage && item.backgroundImage !== 'none') {
          blockers.push({ code: 'background-image', element: item.element, detail: preview(item.backgroundImage, 80) });
        }
        const bg = item.background;
        if (!bg) {
          blockers.push({ code: 'unparsable-background-color', element: item.element, detail: preview(item.backgroundColorRaw, 60) });
          transmission = 0;
        } else {
          transmission *= (1 - bg.a);
          transmission = 1 - item.opacity * (1 - transmission);
        }
        if (item.filter && item.filter !== 'none') {
          blockers.push({ code: 'filter', element: item.element, detail: preview(item.filter, 60) });
        }
        if (item.backdropFilter && item.backdropFilter !== 'none') {
          blockers.push({ code: 'backdrop-filter', element: item.element, detail: preview(item.backdropFilter, 60) });
        }
        if (item.blendMode && item.blendMode !== 'normal') {
          blockers.push({ code: 'blend-mode', element: item.element, detail: item.blendMode });
        }
      }

      if (glyphElement) {
        const item = chain[last];
        if (item.textShadow && item.textShadow !== 'none') {
          blockers.push({ code: 'text-shadow', element: glyphElement, detail: preview(item.textShadow, 60) });
        }
        if (item.textStroke > 0) {
          blockers.push({ code: 'text-stroke', element: glyphElement, detail: String(item.textStroke) });
        }
        if (hasTextClip(item)) {
          blockers.push({ code: 'gradient-text', element: glyphElement, detail: 'background-clip:text paints the glyph with the background' });
        }
      }

      if (!glyphColor) {
        blockers.push({ code: 'unparsable-text-color', element: glyphElement || chain[last].element, detail: '' });
      }

      return blockers;
    }

    function detectOverlay(element, rects) {
      if (typeof documentRef.elementsFromPoint !== 'function') return null;
      const onscreen = rects.find(r =>
        r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight
      );
      if (!onscreen) return null;
      const x = Math.min(window.innerWidth - 1, Math.max(0, (onscreen.left + onscreen.right) / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, (onscreen.top + onscreen.bottom) / 2));
      let stack;
      try {
        stack = documentRef.elementsFromPoint(x, y);
      } catch (error) {
        return null;
      }
      for (const hit of stack) {
        if (hit === documentRef.documentElement) return null;
        if (hit === element) return null;
        // Reaching an ancestor means everything above it has been inspected and
        // everything below is behind the text's own painting context.
        if (elContains(hit, element)) return null;
        // A descendant of the text element is part of that element's paint.
        if (elContains(element, hit)) continue;
        const style = styleOf(hit);
        if (!style) continue;
        const bg = parseColor(style.backgroundColor);
        const paints = (bg && bg.a > 0) ||
          (style.backgroundImage && style.backgroundImage !== 'none') ||
          (style.backdropFilter && style.backdropFilter !== 'none');
        if (paints) return hit;
      }
      return null;
    }

    // Avoid Element.contains on non-elements and keep the intent readable.
    function elContains(outer, inner) {
      return Boolean(outer && inner && outer.nodeType === 1 && inner.nodeType === 1 && outer.contains(inner));
    }

    function analyzeContrast(element, glyphColor) {
      const chain = chainFor(element);
      const blockers = checkContrastSupport(chain, element, glyphColor);

      if (blockers.length) return { ok: false, blockers, chain };

      const overlay = detectOverlay(element, currentRects || []);
      if (overlay) {
        return { ok: false, blockers: [{ code: 'overlay', element: overlay, detail: pathFor(overlay) }], chain };
      }

      const black = { r: 0, g: 0, b: 0, a: 1 };
      const white = { r: 1, g: 1, b: 1, a: 1 };
      const glyph = premul(glyphColor);
      let bgBlack;
      let bgWhite;
      let fgBlack;
      let fgWhite;
      try {
        bgBlack = paintChain(chain, 0, black, false, null);
        bgWhite = paintChain(chain, 0, white, false, null);
        fgBlack = paintChain(chain, 0, black, true, glyph);
        fgWhite = paintChain(chain, 0, white, true, glyph);
      } catch (error) {
        return { ok: false, blockers: [{ code: 'compositing-failed', element, detail: String(error && error.message || error) }], chain };
      }

      if (colorDelta(bgBlack, bgWhite) > EPS || colorDelta(fgBlack, fgWhite) > EPS) {
        return {
          ok: false,
          blockers: [{
            code: 'indeterminate-base',
            element,
            detail: 'effective color depends on the UA canvas; set an opaque html/body background or use an opaque local surface'
          }],
          chain
        };
      }

      const background = unpremul(bgWhite);
      const foreground = unpremul(fgWhite);
      if (background.a < 0.999 || foreground.a < 0.999) {
        return {
          ok: false,
          blockers: [{ code: 'transparent-composite', element, detail: `background alpha ${n2(background.a)}` }],
          chain
        };
      }
      return { ok: true, foreground, background, contrast: contrastRatio(foreground, background), chain };
    }

    // The overlay probe needs the line rectangles of the element currently
    // being sampled. It is set transiently (no DOM change) by the caller.
    let currentRects = null;

    // ── text sampling ────────────────────────────────────────────────────────

    function sampleTextNode(textNode, parent) {
      if (!parent || parent.nodeType !== 1) return;
      if (isHidden(parent)) {
        counts.excludedHidden += 1;
        return;
      }
      const raw = textNode.nodeValue;
      if (!raw || !normalizeText(raw)) return;
      counts.textNodesSeen += 1;

      const style = styleOf(parent);
      if (!style) return;

      if (parent.localName === 'textarea' || parent.localName === 'option' || parent.localName === 'optgroup') return;

      const fontSize = parseFloat(style.fontSize);
      if (!Number.isFinite(fontSize)) {
        addError({ code: 'unmeasurable-font-size', path: pathFor(parent), actual: style.fontSize, required: 'a finite CSS px size' });
        return;
      }

      const range = documentRef.createRange();
      range.selectNodeContents(textNode);
      let rawRects;
      try {
        rawRects = Array.from(range.getClientRects());
      } catch (error) {
        rawRects = [];
      }
      if (typeof range.detach === 'function') range.detach();

      const clip = clipRectFor(parent);
      const lineRects = rawRects
        .map(r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }))
        .filter(r => r.width > 0.01 && r.height > 0.01)
        .map(r => intersect(r, clip))
        .filter(Boolean);

      if (!lineRects.length) {
        counts.excludedInvisible += 1;
        return;
      }

      const roleInfo = roleFor(parent);
      const role = roleInfo.role;
      const requiredFontSize = requiredFontFor(role);
      const text = normalizeText(raw);
      const characters = charCount(text);
      const glyphColor = resolveGlyphColor(style, style.color);
      // Transparent glyphs are not readable text. `background-clip:text` is
      // the exception: the glyph is filled by the background and is reported
      // as unsupported by the contrast sampler rather than skipped.
      if (!hasTextClip(style) && glyphColor && glyphColor.a <= 0) {
        counts.excludedInvisible += 1;
        return;
      }
      const run = {
        element: parent,
        text,
        characters,
        lineRects,
        role,
        fontSize,
        requiredFontSize,
        fontOk: fontSize + 1e-6 >= requiredFontSize,
        source: 'text'
      };

      const inactive = inactiveControl(parent);
      currentRects = lineRects;
      const contrast = inactive
        ? { ok: false, skipped: 'inactive-control' }
        : glyphColor
          ? analyzeContrast(parent, glyphColor)
          : { ok: false, blockers: [{ code: 'unparsable-text-color', element: parent, detail: style.color }] };
      currentRects = null;

      const sample = {
        source: 'text',
        path: pathFor(parent),
        text: preview(text, 160),
        role,
        fontSize: n2(fontSize),
        fontWeight: style.fontWeight,
        requiredFontSize,
        fontOk: run.fontOk,
        characters,
        lineCount: lineRects.length,
        declaredColor: style.color,
        contrast: null,
        requiredContrast: requiredContrastFor(role),
        contrastOk: false
      };

      if (!run.fontOk) {
        addError({
          code: 'font-size',
          path: pathFor(parent),
          role,
          text: preview(text, 80),
          actual: n2(fontSize),
          required: requiredFontSize
        });
      }

      if (inactive) {
        counts.excludedInactive += 1;
        sample.exempt = 'inactive-control';
        sample.contrastOk = null;
      } else if (contrast.ok) {
        sample.foreground = colorCss(contrast.foreground);
        sample.background = colorCss(contrast.background);
        sample.contrast = n2(contrast.contrast);
        sample.contrastOk = contrast.contrast + 1e-6 >= sample.requiredContrast;
        if (!sample.contrastOk) {
          addError({
            code: 'contrast',
            path: pathFor(parent),
            role,
            theme,
            text: preview(text, 80),
            actual: n2(contrast.contrast),
            required: sample.requiredContrast
          });
        }
      } else {
        const unsupportedCodes = [];
        const manualCodes = [];
        for (const blocker of contrast.blockers) {
          const entry = addBlocker(blocker.code, blocker.element || parent, blocker.detail);
          if (!entry.example) entry.example = preview(text, 60);
          (profile === 'brand' && MANUAL_ONLY_CODES.has(blocker.code) ? manualCodes : unsupportedCodes).push(blocker.code);
        }
        if (unsupportedCodes.length) sample.unsupported = unsupportedCodes;
        if (manualCodes.length) sample.manual = manualCodes;
      }

      samples.push(sample);
      runs.push(run);
      counts.textSamples += 1;
    }

    // ── form controls ────────────────────────────────────────────────────────

    function isControl(element) {
      const tag = element.localName;
      if (tag === 'input') return element.type !== 'hidden';
      if (tag === 'button' || tag === 'select' || tag === 'textarea' || tag === 'summary') return true;
      if ((tag === 'a' || tag === 'area') && element.hasAttribute('href')) return true;
      if (element.isContentEditable) {
        let parent = element.parentElement;
        while (parent) {
          if (parent.isContentEditable) return false;
          parent = parent.parentElement;
        }
        return true;
      }
      const role = String(element.getAttribute('role') || '').trim().toLowerCase();
      return CONTROL_ROLES.has(role);
    }

    function displayedControlText(element) {
      const tag = element.localName;
      if (tag === 'input') {
        const type = String(element.type || 'text').toLowerCase();
        if (NON_TEXT_INPUTS.has(type)) return null;
        const value = String(element.value || '');
        if (value) {
          const text = type === 'password' ? '•'.repeat(value.length) : value;
          return { text, kind: 'value', pseudo: null };
        }
        if (type === 'submit' || type === 'reset') {
          // The UA renders a default label when value is omitted.
          return { text: type === 'reset' ? 'Reset' : 'Submit', kind: 'value', pseudo: null };
        }
        const placeholder = element.getAttribute('placeholder') || '';
        return placeholder ? { text: placeholder, kind: 'placeholder', pseudo: '::placeholder' } : null;
      }
      if (tag === 'textarea') {
        const value = String(element.value || '');
        if (value) return { text: value, kind: 'value', pseudo: null };
        const placeholder = element.getAttribute('placeholder') || '';
        return placeholder ? { text: placeholder, kind: 'placeholder', pseudo: '::placeholder' } : null;
      }
      if (tag === 'select') {
        const options = Array.from(element.options || []).filter(option => !option.hidden);
        const showsAll = element.multiple || Number(element.size) > 1;
        const selected = showsAll
          ? options
          : options.filter(option => option.selected);
        const text = selected.map(option => normalizeText(option.textContent)).filter(Boolean).join(' ');
        return text ? { text, kind: 'option', pseudo: null } : null;
      }
      return null;
    }

    function controlTextRect(element, style, text, fontSize) {
      const rect = element.getBoundingClientRect();
      const borderLeft = parsePx(style.borderLeftWidth);
      const borderTop = parsePx(style.borderTopWidth);
      const paddingLeft = parsePx(style.paddingLeft);
      const paddingTop = parsePx(style.paddingTop);
      const paddingRight = parsePx(style.paddingRight);
      const paddingBottom = parsePx(style.paddingBottom);
      const contentWidth = Math.max(0, rect.width - borderLeft - parsePx(style.borderRightWidth) - paddingLeft - paddingRight);
      const contentHeight = Math.max(0, rect.height - borderTop - parsePx(style.borderBottomWidth) - paddingTop - paddingBottom);
      const lineHeightRaw = parseFloat(style.lineHeight);
      const lineHeight = Number.isFinite(lineHeightRaw) ? lineHeightRaw : fontSize * 1.2;
      let width = contentWidth;
      try {
        const ctx = getColorContext();
        if (ctx) {
          ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
          const measured = ctx.measureText(text).width;
          if (Number.isFinite(measured) && measured > 0) width = Math.min(contentWidth, measured);
        }
      } catch (error) {
        // approximate with the content box
      }
      let top;
      let height;
      if (element.localName === 'textarea') {
        const lines = Math.max(1, Math.ceil((width > 0 ? text.length * fontSize * 0.55 : 0) / Math.max(1, contentWidth)));
        height = Math.min(contentHeight, lineHeight * lines);
        top = rect.top + borderTop + paddingTop;
      } else {
        height = Math.min(contentHeight || lineHeight, lineHeight);
        top = rect.top + borderTop + paddingTop + Math.max(0, (contentHeight - height) / 2);
      }
      let left = rect.left + borderLeft + paddingLeft;
      const align = style.textAlign;
      if (align === 'center') left += Math.max(0, (contentWidth - width) / 2);
      else if (align === 'right' || align === 'end') left += Math.max(0, contentWidth - width);
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width: Math.max(0, Math.min(contentWidth, width)),
        height
      };
    }

    function sampleControl(element) {
      if (isHidden(element)) return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const textInfo = displayedControlText(element);
      if (!textInfo) return;
      const text = normalizeText(textInfo.text);
      if (!text) return;

      const style = styleOf(element);
      const pseudoStyle = textInfo.pseudo ? styleOf(element, textInfo.pseudo) : null;
      const fontSize = parseFloat((pseudoStyle && pseudoStyle.fontSize) || style.fontSize);
      if (!Number.isFinite(fontSize) || fontSize <= 0) {
        addError({ code: 'unmeasurable-font-size', path: pathFor(element), actual: style.fontSize, required: 'a finite CSS px size' });
        return;
      }
      const colorValue = (pseudoStyle && pseudoStyle.color) || style.color;
      let glyphColor = textInfo.pseudo
        ? parseColor(colorValue)
        : resolveGlyphColor(style, colorValue);
      if (glyphColor && pseudoStyle) {
        const pseudoOpacity = parseFloat(pseudoStyle.opacity);
        if (Number.isFinite(pseudoOpacity) && pseudoOpacity < 1) {
          glyphColor = { r: glyphColor.r, g: glyphColor.g, b: glyphColor.b, a: glyphColor.a * clamp01(pseudoOpacity) };
        }
      }
      const roleInfo = roleFor(element);
      const role = roleInfo.role;
      const requiredFontSize = requiredFontFor(role);
      const textRect = controlTextRect(element, style, text, fontSize);
      const clip = clipRectFor(element);
      const clipped = intersect(textRect, clip);
      const lineRects = clipped ? [clipped] : [];

      if (!lineRects.length) {
        counts.excludedInvisible += 1;
        return;
      }

      if (!hasTextClip(style) && glyphColor && glyphColor.a <= 0) {
        counts.excludedInvisible += 1;
        return;
      }

      const inactive = inactiveControl(element);
      currentRects = lineRects;
      const contrast = inactive
        ? { ok: false, skipped: 'inactive-control' }
        : glyphColor
          ? analyzeContrast(element, glyphColor)
          : { ok: false, blockers: [{ code: 'unparsable-text-color', element, detail: colorValue }] };
      currentRects = null;

      const requiredContrast = requiredContrastFor(role);
      const sample = {
        source: textInfo.kind,
        path: pathFor(element),
        text: preview(text, 160),
        role,
        fontSize: n2(fontSize),
        fontWeight: (pseudoStyle && pseudoStyle.fontWeight) || style.fontWeight,
        requiredFontSize,
        fontOk: fontSize + 1e-6 >= requiredFontSize,
        characters: charCount(text),
        lineCount: lineRects.length,
        declaredColor: colorValue,
        contrast: null,
        requiredContrast,
        contrastOk: false
      };

      if (!sample.fontOk) {
        addError({
          code: 'font-size',
          path: pathFor(element),
          role,
          text: preview(text, 80),
          source: textInfo.kind,
          actual: n2(fontSize),
          required: requiredFontSize
        });
      }

      if (inactive) {
        counts.excludedInactive += 1;
        sample.exempt = 'inactive-control';
        sample.contrastOk = null;
      } else if (contrast.ok) {
        sample.foreground = colorCss(contrast.foreground);
        sample.background = colorCss(contrast.background);
        sample.contrast = n2(contrast.contrast);
        sample.contrastOk = contrast.contrast + 1e-6 >= requiredContrast;
        if (!sample.contrastOk) {
          addError({
            code: 'contrast',
            path: pathFor(element),
            role,
            theme,
            text: preview(text, 80),
            source: textInfo.kind,
            actual: n2(contrast.contrast),
            required: requiredContrast
          });
        }
      } else {
        const unsupportedCodes = [];
        const manualCodes = [];
        for (const blocker of contrast.blockers) {
          const entry = addBlocker(blocker.code, blocker.element || element, blocker.detail);
          if (!entry.example) entry.example = preview(text, 60);
          (profile === 'brand' && MANUAL_ONLY_CODES.has(blocker.code) ? manualCodes : unsupportedCodes).push(blocker.code);
        }
        if (unsupportedCodes.length) sample.unsupported = unsupportedCodes;
        if (manualCodes.length) sample.manual = manualCodes;
      }

      samples.push(sample);
      runs.push({
        element,
        text,
        characters: charCount(text),
        lineRects,
        role,
        fontSize,
        requiredFontSize,
        fontOk: sample.fontOk,
        source: textInfo.kind
      });
      counts.textSamples += 1;
    }

    // ── DOM walk ─────────────────────────────────────────────────────────────

    function checkGeneratedContent(element) {
      for (const pseudo of ['::before', '::after']) {
        const style = styleOf(element, pseudo);
        if (!style) continue;
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') continue;
        const content = style.content;
        if (!content || content === 'none' || content === 'normal') continue;
        // Only quoted literal text. Counters, attr() and icons are excluded and
        // documented as out of scope.
        if (!/^["']/.test(content)) continue;
        if (!/[\p{L}\p{N}]/u.test(content)) continue;
        addBlocker('generated-text', element, preview(content, 60));
      }
    }

    function visit(element) {
      if (!element || element.nodeType !== 1) return;
      if (SKIP_TAGS.has(element.localName)) return;
      if (isHidden(element)) return;
      counts.elementsVisited += 1;

      const tag = element.localName;
      if (tag === 'svg') {
        // SVG <title>/<desc> are accessibility metadata, not rendered text.
        // Only an actual rendered <text> subtree is unsupported.
        const svgText = Array.from(element.querySelectorAll('text')).some(node => {
          if (!normalizeText(node.textContent)) return false;
          const style = styleOf(node);
          if (!style || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
          return node.getClientRects().length > 0;
        });
        if (svgText) addBlocker('svg-text', element, 'SVG text is not measured');
        return;
      }
      if (element.shadowRoot) {
        addUnsupported('shadow-root', element, 'open shadow root is not traversed');
        return;
      }

      checkGeneratedContent(element);

      if (isControl(element)) {
        counts.controlsSeen += 1;
        controls.push({ element });
      }

      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        sampleControl(element);
        return;
      }

      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 3) {
          sampleTextNode(child, element);
        } else if (child.nodeType === 1) {
          visit(child);
        }
      }
    }

    // ── regions ──────────────────────────────────────────────────────────────

    const selector = typeof opts.regionSelector === 'string' && opts.regionSelector.trim()
      ? opts.regionSelector.trim()
      : DEFAULT_REGION_SELECTOR;
    const explicitSelector = selector !== DEFAULT_REGION_SELECTOR;
    let regionElements = [];
    const densityErrors = [];
    try {
      regionElements = Array.from(documentRef.querySelectorAll(selector));
    } catch (error) {
      densityErrors.push({
        code: 'invalid-region-selector',
        selector,
        message: String(error && error.message || error)
      });
    }

    const regions = regionElements.map((element, index) => {
      regionMap.set(element, index);
      const style = styleOf(element);
      const rawProfile = element.hasAttribute('data-ui-density')
        ? String(element.getAttribute('data-ui-density')).trim().toLowerCase()
        : '';
      const profile = rawProfile || SCAN;
      const rect = element.getBoundingClientRect();
      return {
        index,
        element,
        selector,
        profile,
        declaredProfile: rawProfile || null,
        rect: { left: n2(rect.left), top: n2(rect.top), width: n2(rect.width), height: n2(rect.height) },
        padding: {
          top: n2(parsePx(style ? style.paddingTop : 0)),
          right: n2(parsePx(style ? style.paddingRight : 0)),
          bottom: n2(parsePx(style ? style.paddingBottom : 0)),
          left: n2(parsePx(style ? style.paddingLeft : 0))
        },
        issues: []
      };
    });

    if (!regionElements.length && (profile !== 'brand' || explicitSelector)) {
      densityErrors.push({
        code: 'no-regions',
        selector,
        message: 'No regions matched. Mark at least one region with [data-ui-density] or pass regionSelector.'
      });
    }

    if (forcedColors) {
      addUnsupported('forced-colors', root, 'forced-colors: active replaces the author color palette');
    }

    if (root) visit(root);

    // Assign every run and control to its nearest region (innermost wins).
    function nearestRegion(element) {
      let node = element;
      while (node && node.nodeType === 1) {
        if (regionMap.has(node)) return regionMap.get(node);
        node = node.parentElement;
      }
      return -1;
    }

    const regionRuns = regions.map(() => []);
    const regionControls = regions.map(() => []);
    for (const run of runs) {
      const index = nearestRegion(run.element);
      run.regionIndex = index;
      if (index >= 0) regionRuns[index].push(run);
    }
    for (const control of controls) {
      const index = nearestRegion(control.element);
      control.regionIndex = index;
      if (index >= 0) {
        const rect = control.element.getBoundingClientRect();
        const clipped = intersect(rect, clipRectFor(control.element));
        if (clipped) regionControls[index].push(control);
      }
    }

    // ── density aggregation ──────────────────────────────────────────────────

    const denseRegions = regions.map(region => {
      const hasProfile = Object.prototype.hasOwnProperty.call(BUDGETS, region.profile);
      let visibleCharacters = 0;
      let visibleControls = 0;
      let textArea = 0;
      let regionArea = 0;

      const baseRect = region.element.getBoundingClientRect();
      regionArea = rectArea(baseRect);

      if (!hasProfile) {
        region.issues.push({
          code: 'unknown-profile',
          actual: region.profile,
          required: 'scan, dense or editor'
        });
        region.profile = SCAN;
      }
      const activeBudget = BUDGETS[region.profile];

      if (regionArea <= 0) {
        region.issues.push({
          code: 'not-rendered',
          message: 'Region has no rendered area; density cannot be measured.'
        });
      }

      const textRects = [];
      for (const run of regionRuns[region.index]) {
        visibleCharacters += run.characters;
        for (const rect of run.lineRects) {
          const clipped = intersect(rect, baseRect);
          if (clipped) textRects.push(clipped);
        }
      }
      for (const control of regionControls[region.index]) {
        visibleControls += 1;
      }

      textArea = unionArea(textRects);
      const textCoverage = regionArea > 0 ? textArea / regionArea : 0;

      if (visibleCharacters > activeBudget.visibleCharacters) {
        region.issues.push({
          code: 'characters',
          actual: visibleCharacters,
          budget: activeBudget.visibleCharacters,
          message: `Visible characters exceed the ${region.profile} budget. Delete or defer copy; do not shrink it.`
        });
      }
      if (visibleControls > activeBudget.visibleControls) {
        region.issues.push({
          code: 'controls',
          actual: visibleControls,
          budget: activeBudget.visibleControls,
          message: `Visible controls exceed the ${region.profile} budget. Reveal them behind Edit or remove them.`
        });
      }
      if (textCoverage > activeBudget.textCoverage + 1e-9) {
        region.issues.push({
          code: 'text-coverage',
          actual: n4(textCoverage),
          budget: activeBudget.textCoverage,
          message: 'Text line-box area covers too much of the region.'
        });
      }
      const paddingMin = Math.min(region.padding.top, region.padding.right, region.padding.bottom, region.padding.left);
      if (paddingMin + 1e-6 < activeBudget.padding) {
        const side = ['top', 'right', 'bottom', 'left'].find(sideName => region.padding[sideName] === paddingMin);
        region.issues.push({
          code: 'padding',
          actual: paddingMin,
          budget: activeBudget.padding,
          side,
          message: `Region padding is below ${activeBudget.padding}px on the ${side} side.`
        });
      }

      return {
        index: region.index,
        path: pathFor(region.element),
        selector,
        profile: region.profile,
        declaredProfile: region.declaredProfile,
        rect: region.rect,
        area: n2(regionArea),
        visibleCharacters,
        visibleControls,
        textArea: n2(textArea),
        textCoverage: n4(textCoverage),
        padding: region.padding,
        paddingMin: n2(paddingMin),
        budgets: activeBudget,
        issues: region.issues
      };
    });

    // ── report ───────────────────────────────────────────────────────────────

    if (counts.textSamples === 0) {
      addError({
        code: 'no-text-samples',
        message: 'No visible text was sampled. An empty audit is not a pass; check visibility, selector and timing.'
      });
    }

    const unsupported = Array.from(unsupportedMap.values());
    const manual = Array.from(manualMap.values());
    const reportedSamples = samples.length > MAX_REPORTED_SAMPLES
      ? samples.slice(0, MAX_REPORTED_SAMPLES)
      : samples;

    const pass = errors.length === 0 &&
      unsupported.length === 0 &&
      densityErrors.length === 0 &&
      denseRegions.every(region => region.issues.length === 0);

    return {
      version: VERSION,
      theme: {
        mode: theme,
        source: 'prefers-color-scheme',
        colorScheme: htmlStyle ? htmlStyle.colorScheme : null,
        activeFloors: contrastFloors
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentWidth: documentRef.documentElement.scrollWidth,
        documentHeight: documentRef.documentElement.scrollHeight
      },
      options: {
        profile,
        regionSelector: selector,
        regionCount: regionElements.length
      },
      limits: {
        fonts: { base: FONT.base, primary: FONT.primary, dense: FONT.dense },
        profiles: {
          product: 'effects that cannot be composited fail the run',
          brand: 'effects that cannot be composited become manual worklist items; density is opt-in'
        },
        contrast: {
          light: CONTRAST_LIGHT,
          dark: CONTRAST_DARK,
          active: contrastFloors,
          algorithm: 'WCAG 2.x sRGB relative luminance'
        },
        density: {
          budgets: BUDGETS,
          characters: 'Unicode code points of whitespace-normalized visible text',
          textCoverage: 'union area of Range line rectangles / region border-box area',
          controls: 'visible interactive elements',
          padding: 'region computed padding, minimum side'
        },
        sampling: {
          scope: 'document.body, including laid-out content outside the viewport and excluding ancestor overflow clips',
          excluded: 'display:none, visibility:hidden, opacity:0, closed details content, content-visibility:hidden, sr-only 1px clips, hidden select options',
          unsupported: 'forces pass:false; no token or assumed-color fallback',
          maxReportedSamples: MAX_REPORTED_SAMPLES,
          samplesOmitted: Math.max(0, samples.length - MAX_REPORTED_SAMPLES)
        }
      },
      readability: {
        samples: reportedSamples,
        errors,
        unsupported,
        manual,
        counts: {
          elementsVisited: counts.elementsVisited,
          textNodesSeen: counts.textNodesSeen,
          textSamples: counts.textSamples,
          controlSamples: samples.filter(sample => sample.source !== 'text').length,
          controlsSeen: counts.controlsSeen,
          excludedHidden: counts.excludedHidden,
          excludedInvisible: counts.excludedInvisible,
          excludedInactive: counts.excludedInactive
        }
      },
      density: {
        budgets: BUDGETS,
        regions: denseRegions,
        errors: densityErrors
      },
      pass,
      caveats: [
        'A pass means the measured floors were met, not that the design is tasteful. Judge the rendered screenshots and user feedback.',
        'Density budgets are local project policy for overloaded scan rows, not WCAG or a validated measure of perceptual crampedness.',
        'Text coverage counts line-box rectangles, not glyph ink; line-height and inline padding inflate it.',
        'Font floors are CSS px; browser zoom, page zoom and CSS transforms are not folded in.',
        'Text inside inactive controls is exempt from contrast (WCAG 1.4.3) and still measured for size.',
        'Contrast is WCAG 2.x sRGB, not APCA. In the product profile unsupported effects fail the run; in the brand profile they are a manual worklist and pass is provisional on those measurements.',
        'Text in iframes, shadow roots, canvas, images, SVG <text>, generated content, native select popups and UA canvases is out of scope.'
      ]
    };
  }

  globalThis.auditUI = auditUI;
})();
