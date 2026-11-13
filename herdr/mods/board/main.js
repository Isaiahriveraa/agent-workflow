import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { focused, home, props, spaces, run, theme, readTextFile, watchFolder } from "herdr";
import * as fs from "fs/promises";
import { ageLabel, cardsFor, contextText, isDone, parseBoard, toggleOpen, peekLine, repoGroups, statusGroups, unseenCount } from "./board.js";

const MAX_OPEN = 3;
const LOG_SHOWN = 2;
const ICONS = "mods/workspace-chrome";
const OWN = "mods/board";

// Every open tab in Herdr, in its space order.
function openTabs() {
  const here = focused()?.tab;
  return spaces().flatMap((space) =>
    space.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      status: tab.status,
      active: tab.id === here,
      space: { id: space.id, name: space.name },
    })));
}

const shortAge = (iso, now) => ageLabel(iso, now).replace(" ago", "").replace("just now", "now");

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is unavailable; the board still works for this session.
  }
}

export default class Board extends View {
  init(_props, cx) {
    this.folder = `${home()}/.config/herdr-app/board`;
    this.boards = {};
    this.mode = load("mode", "status");
    this.open = load("open", null); // tab ids, oldest opened first; null until the first fold
    this.seenAt = load("seenAt", null);
    if (!this.seenAt) this.markSeen();
    this.fullLog = new Set();
    this.archiveOpen = false;
    this.copied = null;
    this.refresh(cx);
    cx.timer.every(10_000, (cx) => this.refresh(cx));
    cx.spawn(async (cx) => {
      await fs.mkdir(this.folder, { recursive: true });
      for (;;) {
        try {
          await watchFolder(this.folder);
        } catch {
          return; // Watching stopped; the 10 s refresh keeps the cards current.
        }
        this.refresh(cx);
      }
    });
  }

  refresh(cx) {
    cx.spawn(async (cx) => {
      try {
        await fs.mkdir(this.folder, { recursive: true });
        const names = (await fs.readdir(this.folder)).filter((name) => name.endsWith(".json"));
        const entries = await Promise.all(names.map(async (name) =>
          [name.slice(0, -".json".length), parseBoard(await readTextFile(`${this.folder}/${name}`))]));
        this.boards = Object.fromEntries(entries.filter(([, board]) => board !== null));
        this.problem = null;
      } catch (error) {
        this.problem = `The board folder can't be read: ${error?.message ?? error}`;
      }
      cx.notify();
    });
  }

  markSeen() {
    this.seenAt = new Date().toISOString();
    save("seenAt", this.seenAt);
  }

  // Cards that need the user start open; after the first fold, the user's choice is kept.
  openIds(groups) {
    if (this.open) return this.open;
    return groups.flatMap((g) => g.cards).filter((c) => c.status === "blocked" || c.status === "done")
      .map((c) => c.tabId).slice(0, MAX_OPEN);
  }

  toggle(tabId, groups, cx) {
    this.open = toggleOpen(this.openIds(groups), tabId, MAX_OPEN);
    save("open", this.open);
    cx.notify();
  }

  copy(text, key, cx) {
    cx.write_to_clipboard(text);
    this.copied = key;
    cx.timer.after(1200, (cx) => {
      if (this.copied === key) this.copied = null;
      cx.notify();
    });
    cx.notify();
  }

  // The status marks Herdr draws elsewhere: its spinner ring, Lucide circles.
  mark(status, t, size = 14) {
    if (status === "working") return svg(`${ICONS}/spinner.svg`).size(size).flex_none().text_color(t.working).spin(900);
    if (status === "done") return svg(`${ICONS}/circle-check.svg`).size(size).flex_none().text_color(t.done);
    if (status === "blocked") return svg(`${OWN}/circle-alert.svg`).size(size).flex_none().text_color(t.blocked);
    return svg(`${OWN}/circle.svg`).size(size).flex_none().text_color(t.dim);
  }

  iconButton(id, icon, label, t, onClick) {
    return div().id(id).size(22).flex_none().flex().items_center().justify_center().rounded(5)
      .text_color(t.dim).cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(label)
      .on_click((e, cx) => { cx.stop_propagation(); onClick(e, cx); })
      .child(svg(icon).size(14).flex_none());
  }

  textButton(id, icon, label, t, onClick) {
    return h_flex().id(id).flex_none().gap(5).items_center().px(6).h(22).rounded(4)
      .text_size(11).text_color(t.dim).cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((e, cx) => { cx.stop_propagation(); onClick(e, cx); })
      .when(Boolean(icon), (el) => el.child(svg(icon).size(12).flex_none()))
      .child(label);
  }

  card(card, isOpen, groups, t, now) {
    const board = card.board && !card.board.unreadable ? card.board : null;
    const needs = card.status === "blocked" || card.status === "done";
    const fresh = unseenCount(board, this.seenAt);
    const title = board?.goal || card.title;
    const path = (board?.root ?? "").replace(home(), "~");
    const peek = peekLine(card);
    const age = shortAge(board?.updated, now);

    const header = h_flex().id(`row-${card.tabId}`).h(28).pl(8).pr(4).gap(8).items_center().cursor_pointer()
      .on_click((_e, cx) => this.toggle(card.tabId, groups, cx))
      .child(this.mark(card.status, t))
      .child(div().flex_1().min_w(0).truncate()
        .text_color(isOpen || needs ? t.foreground : t.muted)
        .when(isOpen || needs, (el) => el.font_medium())
        .child(title))
      .when(fresh > 0, (el) => el.child(div().flex_none().text_size(10.5).text_color(t.accent).child(`${fresh} new`)))
      .when(Boolean(age), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(age)))
      .when(Boolean(path), (el) => el.child(this.copied === `path-${card.tabId}`
        ? div().w(22).flex_none().text_size(10.5).text_color(t.done).child("✓")
        : this.iconButton(`copy-${card.tabId}`, `${OWN}/copy.svg`, `Copy ${path}`, t, (_e, cx) => this.copy(board.root, `path-${card.tabId}`, cx))))
      .child(svg(`${ICONS}/chevron-${isOpen ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim));

    const shell = v_flex().id(`card-${card.tabId}`).mx(6).my(1).rounded(6).flex_none()
      // The tab you're on: an accent edge, the way Herdr marks focus.
      .border_l(2).border_color(card.active ? t.accent : "#00000000")
      .when(isOpen, (el) => el.bg(t.surface))
      .when(!isOpen, (el) => el.hover((s) => s.bg(t.hover)))
      .child(header);

    if (!isOpen) {
      return shell.when(Boolean(peek), (el) => el.child(div().pl(30).pr(8).pb(6).mt(-4).truncate().text_size(11.5)
        .text_color(needs ? t.muted : t.dim).child(peek)));
    }

    const body = v_flex().pl(30).pr(8).pb(8).pt(2).gap(2);
    if (card.board?.unreadable) body.child(div().text_size(12).text_color(t.blocked).child("This board file can't be read."));
    if (board) {
      const label = (text) => div().flex_none().text_color(t.dim).child(text);
      if (board.blockers?.length) {
        for (const blocker of board.blockers) body.child(h_flex().gap(8).text_size(12).text_color(t.blocked).child(label("blocked")).child(div().flex_1().min_w(0).child(blocker)));
      } else if (board.now) {
        const done = isDone(card);
        body.child(h_flex().gap(8).text_size(12).text_color(done ? t.done : t.foreground)
          .child(label(done ? "done" : "now")).child(div().flex_1().min_w(0).child(board.now.replace(/^done:\s*/, ""))));
      }
      if (board.next?.length) {
        body.child(h_flex().gap(8).text_size(11.5).text_color(t.muted).child(label("next")).child(div().flex_1().min_w(0).child(board.next[0])));
      }

      const log = board.log ?? [];
      const showAll = this.fullLog.has(card.tabId);
      const shown = showAll ? log : log.slice(-LOG_SHOWN);
      if (shown.length) {
        body.child(v_flex().mt(6).gap(1).children(shown.map((entry) => {
          const unseen = entry.at > this.seenAt;
          const decision = entry.kind === "decision";
          return h_flex().gap(8).items_start().text_size(11.5)
            .text_color(unseen ? t.foreground : decision ? t.muted : t.dim)
            .child(div().w(10).flex_none().text_color(decision ? t.foreground : t.done).child(decision ? "◆" : "✓"))
            .child(div().flex_1().min_w(0).child(entry.text))
            .when(unseen, (el) => el.child(div().size(5).mt(6).rounded(3).flex_none().bg(t.accent)))
            .child(div().flex_none().text_size(11).text_color(t.dim).child(shortAge(entry.at, now)));
        })));
      }
      if (log.length > LOG_SHOWN) {
        body.child(div().id(`more-${card.tabId}`).pl(18).text_size(11).text_color(t.dim).cursor_pointer()
          .hover((s) => s.text_color(t.foreground))
          .on_click((_e, cx) => {
            if (showAll) this.fullLog.delete(card.tabId); else this.fullLog.add(card.tabId);
            cx.notify();
          })
          .child(showAll ? "show less" : `+ ${log.length - LOG_SHOWN} earlier`));
      }
    }
    body.child(h_flex().mt(6).pt(6).border_t(1).border_color(t.border).gap(2).items_center()
      .child(div().flex_1().min_w(0).truncate().pl(2).text_size(11).text_color(t.dim).child(path))
      .when(Boolean(board), (el) => el.child(this.textButton(`ctx-${card.tabId}`, `${ICONS}/files.svg`,
        this.copied === `ctx-${card.tabId}` ? "Copied" : "Copy context", t,
        (_e, cx) => this.copy(contextText(card), `ctx-${card.tabId}`, cx)))));
    return shell.child(body);
  }

  groupLabel(group, t) {
    return h_flex().px(12).pt(10).pb(4).gap(6).items_center().text_size(11).text_color(t.dim)
      .when(this.mode === "repo", (el) => el.child(svg(`${ICONS}/git-branch.svg`).size(12).flex_none()))
      .child(div().flex_1().min_w(0).truncate().child(group.label))
      .child(div().flex_none().child(String(group.cards.length)));
  }

  since(cards, t) {
    const changed = cards.filter((c) => (c.board?.updated ?? "") > this.seenAt);
    const fresh = cards.reduce((sum, c) => sum + unseenCount(c.board, this.seenAt), 0);
    // The prompt hook stamps a board on every prompt, so "updated" alone isn't news:
    // only new log lines and tasks that newly need the user are.
    const blocked = changed.filter((c) => c.status === "blocked").length;
    const done = changed.filter((c) => c.status === "done").length;
    if (fresh === 0 && blocked === 0 && done === 0) return null;
    return h_flex().mx(6).mb(4).h(28).pl(10).pr(4).gap(8).rounded(6).bg(t.surface).items_center()
      .text_size(11.5).text_color(t.muted)
      .child("Since you left")
      .when(blocked > 0, (el) => el.child(div().font_medium().text_color(t.blocked).child(`${blocked} blocked`)))
      .when(done > 0, (el) => el.child(div().font_medium().text_color(t.done).child(`${done} done`)))
      .when(fresh > 0, (el) => el.child(`${fresh} new`))
      .child(div().flex_1())
      .child(div().id("mark-seen").px(6).h(20).flex().items_center().rounded(4).text_size(11).text_color(t.dim)
        .cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => { this.markSeen(); cx.notify(); })
        .child("Mark seen"));
  }

  segment(t) {
    const option = (mode, label) => div().id(`mode-${mode}`).px(8).h(20).flex().items_center().rounded(4)
      .text_size(11.5).cursor_pointer()
      .text_color(this.mode === mode ? t.foreground : t.dim)
      .when(this.mode === mode, (el) => el.bg(t.raised))
      .when(this.mode !== mode, (el) => el.hover((s) => s.text_color(t.foreground)))
      .on_click((_e, cx) => { this.mode = mode; save("mode", mode); cx.notify(); })
      .child(label);
    return h_flex().flex_none().gap(2).p(2).rounded(6).bg(t.canvas)
      .child(option("status", "Status")).child(option("repo", "Repo"));
  }

  archive(closed, t, now) {
    if (closed.length === 0) return null;
    const rows = this.archiveOpen ? closed.map((card) => {
      const board = card.board ?? {};
      const done = isDone(card);
      const title = board.goal || board.project || "Closed tab";
      return h_flex().id(`arch-${card.tabId}`).mx(6).my(1).h(26).pl(8).pr(4).gap(8).items_center().rounded(6)
        .text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.muted))
        .child(this.mark(done ? "done" : "idle", t))
        .child(div().flex_1().min_w(0).truncate().child(title))
        .when(Boolean(board.root), (el) => el
          .child(this.textButton(`reopen-${card.tabId}`, null, "Reopen", t, () => run("tab.new", { folder: board.root })))
          .child(this.copied === `path-${card.tabId}`
            ? div().w(22).flex_none().text_size(10.5).text_color(t.done).child("✓")
            : this.iconButton(`acopy-${card.tabId}`, `${OWN}/copy.svg`, `Copy ${board.root.replace(home(), "~")}`, t,
              (_e, cx) => this.copy(board.root, `path-${card.tabId}`, cx))))
        .child(div().flex_none().text_size(11).child(shortAge(board.updated, now)));
    }) : [];
    return v_flex().mt(6).border_t(1).border_color(t.border).flex_none()
      .child(h_flex().id("archive-toggle").h(30).px(12).gap(6).items_center().text_size(11).text_color(t.dim)
        .cursor_pointer().hover((s) => s.text_color(t.foreground))
        .on_click((_e, cx) => { this.archiveOpen = !this.archiveOpen; cx.notify(); })
        .child(svg(`${ICONS}/chevron-${this.archiveOpen ? "down" : "right"}.svg`).size(12).flex_none())
        .child(svg(`${ICONS}/archive.svg`).size(12).flex_none())
        .child(div().flex_1().child("Archive"))
        .child(String(closed.length)))
      .children(rows);
  }

  render(cx) {
    const t = theme();
    const now = Date.now();
    const tabs = openTabs();
    const cards = cardsFor(tabs, this.boards);
    const tabOrder = tabs.map((tab) => tab.id);
    const groups = this.mode === "repo" ? repoGroups(cards, tabOrder) : statusGroups(cards, tabOrder);
    const open = new Set(this.openIds(groups));
    const live = cards.filter((c) => c.placement !== "closed");
    const closed = cards.filter((c) => c.placement === "closed")
      .sort((a, b) => (b.board?.updated ?? "").localeCompare(a.board?.updated ?? ""));

    const list = [];
    for (const group of groups) {
      list.push(this.groupLabel(group, t));
      for (const card of group.cards) list.push(this.card(card, open.has(card.tabId), groups, t, now));
    }

    // Docked, the board has no background of its own: the layout's shows through,
    // so it reads as part of the window. As a popup, Herdr's frame needs a fill.
    const popup = Boolean(props()?.overlay);
    return v_flex()
      .id("board-root")
      .size_full()
      .when(popup, (el) => el.w(420).h(640).bg(t.popover))
      .min_h(0)
      .text_size(12.5)
      .text_color(t.foreground)
      .child(h_flex().h(38).pl(12).pr(8).gap(8).flex_none().items_center()
        .child(div().flex_1().text_size(12.5).font_semibold().child("Board"))
        .child(this.segment(t))
        .child(this.iconButton("collapse-all", `${OWN}/collapse.svg`, "Collapse all", t, (_e, cx) => {
          this.open = [];
          save("open", []);
          cx.notify();
        })))
      .children(this.problem ? [div().px(12).pb(6).text_size(12).text_color(t.blocked).child(this.problem)] : [])
      .children([this.since(live, t)].filter(Boolean))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar().pb(8)
        .children(live.length === 0 ? [div().px(12).pt(8).text_size(12).text_color(t.dim).child("No open tabs.")] : list)
        .children([this.archive(closed, t, now)].filter(Boolean)));
  }
}
