import { j as jsxRuntimeExports } from "../_virtual/jsx-runtime.js";
import { useState, useRef } from "react";
import { cx } from "../util/cx.js";
import { t } from "../util/i18n.js";
import { localToUtcHHMM, utcToLocalHHMM, uid } from "../constants.js";
import { imgGet, imgSet, imgDelete } from "../util/imageStorage.js";
import { Modal } from "./UI.js";
import { CropModal } from "./CropModal.js";
import s from "./Settings.module.css.js";
import shared from "./shared.module.css.js";
const TYPE_OPTS = ["daily", "weekly", "webdaily", "monthly", "halfmonthly"];
const DragHandle = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.dragHandle, children: "⠿" });
function TypeSelect({ value, onChange, style }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value, onChange, className: shared.inputCls, style, children: TYPE_OPTS.map((ty) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: ty, children: t(`types.${ty}`) }, ty)) });
}
function TaskExtraFields({ task, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    task.type === "webdaily" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.extraLbl, children: t("resetLbl") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "time", value: utcToLocalHHMM(task.webResetTime ?? "00:00"), onChange: (e) => onChange("webResetTime", localToUtcHHMM(e.target.value)), className: shared.inputCls, style: { width: 84, fontFamily: "monospace" } })
    ] }),
    task.type === "monthly" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.extraLbl, children: t("resetDay") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: "1", max: "28", value: task.monthlyResetDay ?? 1, onChange: (e) => onChange("monthlyResetDay", Math.max(1, Math.min(28, parseInt(e.target.value) || 1))), className: shared.inputCls, style: { width: 52, fontFamily: "monospace", textAlign: "center" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.extraLbl, children: t("dayUnit") })
    ] })
  ] });
}
function ImageDropZone({ currentDataUrl, onFile, onRemove, mode = "large" }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const handleDrop = (e) => {
    var _a;
    e.preventDefault();
    setOver(false);
    const f = (_a = e.dataTransfer.files) == null ? void 0 : _a[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  };
  if (mode === "compact") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.imgBtn, title: t("imgSetBg"), onClick: () => {
        var _a;
        return (_a = fileRef.current) == null ? void 0 : _a.click();
      }, onDragOver: (e) => {
        e.preventDefault();
        setOver(true);
      }, onDragLeave: () => setOver(false), onDrop: handleDrop, style: over ? { borderColor: "var(--link)" } : void 0, children: currentDataUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: currentDataUrl, className: s.imgBtnThumb, draggable: false }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🖼️" }) }),
      currentDataUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => {
        e.stopPropagation();
        onRemove();
      }, style: { position: "absolute", top: -5, right: -5, width: 14, height: 14, borderRadius: "50%", background: "var(--danger)", border: "none", color: "white", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }, children: "✕" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => {
        var _a;
        const f = (_a = e.target.files) == null ? void 0 : _a[0];
        if (f) onFile(f);
        e.target.value = "";
      } })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    currentDataUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.thumbRow, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: currentDataUrl, className: s.thumb, draggable: false }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.thumbInfo, children: t("appBgSet") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        var _a;
        return (_a = fileRef.current) == null ? void 0 : _a.click();
      }, className: cx(shared.btn, shared.btnAdd), children: t("imgChange") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRemove, className: cx(shared.btn, shared.btnDanger), children: t("delete") })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: cx(s.dropZone, s.dropZoneLarge, over && s.dropZoneOver), onClick: () => {
      var _a;
      return (_a = fileRef.current) == null ? void 0 : _a.click();
    }, onDragOver: (e) => {
      e.preventDefault();
      setOver(true);
    }, onDragLeave: () => setOver(false), onDrop: handleDrop, children: t("imgDrop") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => {
      var _a;
      const f = (_a = e.target.files) == null ? void 0 : _a[0];
      if (f) onFile(f);
      e.target.value = "";
    } })
  ] });
}
function SettingsModal({ games, setGames, onClose, showConfirm, refreshImages }) {
  const [newGame, setNewGame] = useState({ name: "", color: "#4a9eff", resetTime: "00:00" });
  const [showNG, setShowNG] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", type: "daily", webResetTime: "00:00", monthlyResetDay: 1 });
  const [addTo, setAddTo] = useState(null);
  const [deletingIds, setDeletingIds] = useState(/* @__PURE__ */ new Set());
  const importRef = useRef(null);
  const [cropFile, setCropFile] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [appBgThumb, setAppBgThumb] = useState(null);
  const [gameBgThumbs, setGameBgThumbs] = useState({});
  useState(() => {
    imgGet("app-bg").then((v) => setAppBgThumb((v == null ? void 0 : v.dataUrl) ?? null));
    games.forEach((g) => imgGet(`game-${g.id}`).then((v) => {
      if (v) setGameBgThumbs((prev) => ({ ...prev, [g.id]: v.dataUrl }));
    }));
  });
  const openCrop = (target, file) => {
    setCropTarget(target);
    setCropFile(file);
  };
  const handleCropConfirm = async (dataUrl, opacity) => {
    if (!cropTarget) return;
    await imgSet(cropTarget, dataUrl, opacity);
    if (cropTarget === "app-bg") {
      setAppBgThumb(dataUrl);
    } else {
      const id = cropTarget.replace("game-", "");
      setGameBgThumbs((prev) => ({ ...prev, [id]: dataUrl }));
    }
    setCropFile(null);
    setCropTarget(null);
    refreshImages();
  };
  const handleCropCancel = () => {
    setCropFile(null);
    setCropTarget(null);
  };
  const removeAppBg = async () => {
    await imgDelete("app-bg");
    setAppBgThumb(null);
    refreshImages();
  };
  const removeGameBg = async (gameId) => {
    await imgDelete(`game-${gameId}`);
    setGameBgThumbs((prev) => {
      const n = { ...prev };
      delete n[gameId];
      return n;
    });
    refreshImages();
  };
  const animateDelete = (id, doDelete) => {
    setDeletingIds((prev) => {
      const st = new Set(prev);
      st.add(id);
      return st;
    });
    setTimeout(() => {
      doDelete();
      setDeletingIds((prev) => {
        const st = new Set(prev);
        st.delete(id);
        return st;
      });
    }, 190);
  };
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ games }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = `daily-tracker-settings-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImportFile = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result), imported = parsed.games ?? parsed;
        if (!Array.isArray(imported)) throw new Error("invalid");
        const fresh = imported.map((g) => ({ ...g, id: uid(), tasks: (g.tasks ?? []).map((tk) => ({ ...tk, id: uid() })) }));
        showConfirm(t("importConfirm", { n: fresh.length }), () => setGames(fresh));
      } catch {
        alert(t("importError"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const [dgFrom, setDgFrom] = useState(null);
  const [dgOver, setDgOver] = useState(null);
  const [dtDrag, setDtDrag] = useState(null);
  const upGame = (id, f, v) => setGames((g) => g.map((gm) => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t("deleteMsg", { name }), async () => {
    await imgDelete(`game-${id}`);
    setGameBgThumbs((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    animateDelete(id, () => setGames((g) => g.filter((gm) => gm.id !== id)));
    refreshImages();
  });
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames((g) => [...g, { id: uid(), ...newGame, resetTime: localToUtcHHMM(newGame.resetTime), tasks: [] }]);
    setNewGame({ name: "", color: "#4a9eff", resetTime: "00:00" });
    setShowNG(false);
  };
  const upTask = (gid, tid, f, v) => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.map((tk) => tk.id === tid ? { ...tk, [f]: v } : tk) } : gm));
  const delTask = (gid, tid) => animateDelete(tid, () => setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: gm.tasks.filter((tk) => tk.id !== tid) } : gm)));
  const addTask = (gid) => {
    setGames((g) => g.map((gm) => gm.id === gid ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] } : gm));
    setNewTask({ name: "", type: "daily", webResetTime: "00:00", monthlyResetDay: 1 });
    setAddTo(null);
  };
  const openAddTask = (gid) => {
    setAddTo(gid);
    setNewTask({ name: "", type: "daily", webResetTime: "00:00", monthlyResetDay: 1 });
  };
  const onGameDS = (i) => (e) => {
    setDgFrom(i);
    setDgOver(i);
    e.dataTransfer.effectAllowed = "move";
  };
  const onGameDO = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dgFrom != null) setDgOver(i);
  };
  const onGameDrp = (i) => (e) => {
    e.preventDefault();
    if (dgFrom == null || dgFrom === i) {
      setDgFrom(null);
      setDgOver(null);
      return;
    }
    setGames((g) => {
      const a = [...g], [it] = a.splice(dgFrom, 1);
      a.splice(i, 0, it);
      return a;
    });
    setDgFrom(null);
    setDgOver(null);
  };
  const onGameDE = () => {
    setDgFrom(null);
    setDgOver(null);
  };
  const onTaskDS = (gid, i) => (e) => {
    setDtDrag({ gid, from: i, over: i });
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };
  const onTaskDO = (gid, i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if ((dtDrag == null ? void 0 : dtDrag.gid) === gid) setDtDrag((p) => ({ ...p, over: i }));
  };
  const onTaskDrp = (gid, i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dtDrag || dtDrag.gid !== gid || dtDrag.from === i) {
      setDtDrag(null);
      return;
    }
    const { from } = dtDrag;
    setGames((g) => g.map((gm) => {
      if (gm.id !== gid) return gm;
      const tasks = [...gm.tasks], [it] = tasks.splice(from, 1);
      tasks.splice(i, 0, it);
      return { ...gm, tasks };
    }));
    setDtDrag(null);
  };
  const onTaskDE = () => setDtDrag(null);
  const gameDrop = (i) => ({ borderTop: dgFrom != null && dgOver === i && dgFrom !== i ? "2px solid var(--link)" : "2px solid transparent", transition: "border-color 0.12s" });
  const taskDrop = (gid, i) => ({ borderTop: (dtDrag == null ? void 0 : dtDrag.gid) === gid && dtDrag.over === i && dtDrag.from !== i ? "2px solid var(--link)" : "2px solid transparent", transition: "border-color 0.12s" });
  const rowStyle = { display: "flex", alignItems: "center", gap: 7, marginBottom: 6 };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    cropFile && /* @__PURE__ */ jsxRuntimeExports.jsx(CropModal, { file: cropFile, onConfirm: handleCropConfirm, onCancel: handleCropCancel }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Modal,
      {
        title: `⚙️ ${t("settings")}`,
        titleExtra: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleExport, className: cx(shared.btn, shared.btnAdd), title: t("exportSettings"), children: "📤" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            var _a;
            return (_a = importRef.current) == null ? void 0 : _a.click();
          }, className: cx(shared.btn, shared.btnAdd), title: t("importSettings"), children: "📥" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: importRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: handleImportFile })
        ] }),
        onClose,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.list, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.imgSection, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: s.imgSectionTitle, children: t("appBgImage") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ImageDropZone, { currentDataUrl: appBgThumb, onFile: (file) => openCrop("app-bg", file), onRemove: removeAppBg, mode: "large" })
          ] }),
          games.map((game, gi) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              draggable: true,
              onDragStart: onGameDS(gi),
              onDragOver: onGameDO(gi),
              onDrop: onGameDrp(gi),
              onDragEnd: onGameDE,
              className: cx(s.gameItem, deletingIds.has(game.id) && s.gameItemExit),
              style: { ...gameDrop(gi), border: `1px solid ${game.color}44`, opacity: dgFrom === gi ? 0.4 : 1, transition: "opacity 0.15s" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.gameHeader, children: [
                  DragHandle,
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: game.color, onChange: (e) => upGame(game.id, "color", e.target.value), className: s.colorInput }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: game.name, onChange: (e) => upGame(game.id, "name", e.target.value), onKeyDown: (e) => e.key === "Enter" && e.currentTarget.blur(), className: cx(s.nameInput, shared.inputCls), placeholder: t("gameName") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.resetLbl, children: t("resetLbl") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "time", value: utcToLocalHHMM(game.resetTime), onChange: (e) => upGame(game.id, "resetTime", localToUtcHHMM(e.target.value)), className: shared.inputCls, style: { width: 86, fontFamily: "monospace", flexShrink: 0 } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ImageDropZone, { currentDataUrl: gameBgThumbs[game.id] || null, onFile: (file) => openCrop(`game-${game.id}`, file), onRemove: () => removeGameBg(game.id), mode: "compact" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => delGame(game.id, game.name), className: cx(shared.btn, shared.btnDanger), children: "✕" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.gameBody, children: [
                  game.tasks.map((task, ti) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      draggable: true,
                      onDragStart: onTaskDS(game.id, ti),
                      onDragOver: onTaskDO(game.id, ti),
                      onDrop: onTaskDrp(game.id, ti),
                      onDragEnd: onTaskDE,
                      className: cx(s.taskItem, deletingIds.has(task.id) && s.taskItemExit),
                      style: { ...taskDrop(game.id, ti), ...rowStyle, opacity: (dtDrag == null ? void 0 : dtDrag.gid) === game.id && dtDrag.from === ti ? 0.4 : 1, transition: "opacity 0.15s" },
                      children: [
                        DragHandle,
                        /* @__PURE__ */ jsxRuntimeExports.jsx(TypeSelect, { value: task.type, onChange: (e) => upTask(game.id, task.id, "type", e.target.value), style: { width: 104 } }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: task.name, onChange: (e) => upTask(game.id, task.id, "name", e.target.value), className: shared.inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t(`types.${task.type}`) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(TaskExtraFields, { task, onChange: (f, v) => upTask(game.id, task.id, f, v) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => delTask(game.id, task.id), className: cx(shared.btn, shared.btnDanger), children: "✕" })
                      ]
                    },
                    task.id
                  )),
                  addTo === game.id ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: rowStyle, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TypeSelect, { value: newTask.type, onChange: (e) => setNewTask((p) => ({ ...p, type: e.target.value })), style: { width: 104 } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newTask.name, onChange: (e) => setNewTask((p) => ({ ...p, name: e.target.value })), onKeyDown: (e) => e.key === "Enter" && addTask(game.id), className: shared.inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t(`types.${newTask.type}`), autoFocus: true }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TaskExtraFields, { task: newTask, onChange: (f, v) => setNewTask((p) => ({ ...p, [f]: v })) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => addTask(game.id), className: cx(shared.btn, shared.btnConfirm), children: t("add") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setAddTo(null), className: shared.btn, children: "✕" })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openAddTask(game.id), className: cx(shared.btn, shared.btnAdd, s.addTaskBtn), children: t("addTask") })
                ] })
              ]
            },
            game.id
          )),
          showNG ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.newGameBox, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.newGameHeader, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", value: newGame.color, onChange: (e) => setNewGame((g) => ({ ...g, color: e.target.value })), className: s.colorInput }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: newGame.name, onChange: (e) => setNewGame((g) => ({ ...g, name: e.target.value })), onKeyDown: (e) => e.key === "Enter" && addGame(), className: shared.inputCls, style: { flex: 1, minWidth: 0 }, placeholder: t("gameName"), autoFocus: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: s.resetLbl, children: t("resetLbl") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "time", value: newGame.resetTime, onChange: (e) => setNewGame((g) => ({ ...g, resetTime: e.target.value })), className: shared.inputCls, style: { width: 86, fontFamily: "monospace" } })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: s.newGameActions, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: addGame, className: cx(shared.btn, shared.btnConfirm), children: t("add") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNG(false), className: shared.btn, children: t("cancel") })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: s.addGameBtn, onClick: () => setShowNG(true), children: t("addGame") })
        ] })
      }
    )
  ] });
}
export {
  SettingsModal
};
