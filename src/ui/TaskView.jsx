import {
  cdColor,
  fmtDeadlineDate,
  formatCountdown,
  msUntilDeadline,
  msUntilTaskReset,
  utcToLocalHHMM
} from "../util/helpers.js";
import {t} from "../util/i18n.js";
import shared from "./shared.module.css";
import {Badge, BADGE_MAP} from "./UI.jsx";
import s from "./TaskView.module.css";
import {DAY_MS} from "../constants.js";
import {useMemo} from "react";

export function TaskView({game, task, now, isChecked, showDeadline}) {
  const isEvent = task.type === 'event';

  // ── Event-specific ───────────────────────────────────────────────
  const deadlineMs = isEvent && task.deadline ? msUntilDeadline(task.deadline, now, task.deadlineTime) : null;
  const isExpired = deadlineMs !== null && deadlineMs <= 0;

  // ── Task-specific ────────────────────────────────────────────────
  const taskMs = !isEvent ? msUntilTaskReset(task, game, now)
                        : task.deadline ? msUntilDeadline(task.deadline, now, task.deadlineTime)
                        : null;
  const [urgentH, warnH] = task.type === 'daily' ? [3, 6]
                                         : task.type === 'weekly' ? [24, 48]
                                         : task.type === 'halfmonthly' ? [48, 120]
                                         : task.type === 'monthly' ? [72, 168]
                                         : task.type === 'event' ? [72, 168]
                                         : [3, 6];
  const cd = useMemo(() => ({ d: t('cd.d'), h: t('cd.h'), m: t('cd.m') }), []);
  const taskCdColor = cdColor(taskMs, urgentH, warnH);
  const localResetTime = !isEvent ? utcToLocalHHMM(task.resetTime || game?.resetTime) : null;

  return (
    <div className={shared.taskInfo}>
      <div className={shared.badgeSlot}>
        <Badge item={task} />
      </div>
      <div className={shared.taskWrapSlot}>
        <div className={shared.taskLabelSlot}>
          <span
            className={s.taskName}
            style={{
              color: isChecked ? "var(--muted)" : "var(--text)",
              textDecoration: isChecked ? "line-through" : "none",
              textDecorationThickness: isChecked ? "2px" : undefined,
            }}
          >
            {task.name.trim() || t(`types.${task.type}`)}
          </span>
        </div>
        <div className={shared.meta}>
          {!isChecked && <span className={s.countdown} style={{color: taskCdColor}}>{(isEvent && isExpired) ? t("expired") : `⏱${formatCountdown(taskMs, cd)}`}</span>}
          {task.type === "daily" && localResetTime && <span className={s.resetLbl}>{localResetTime}</span>}
          {task.type === "weekly" && <span className={s.resetLbl}>{t("everyWeek", {day: t("dayNamesFull." + (task.weeklyResetDay ?? 1))})}</span>}
          {task.type === "monthly" && <span className={s.resetLbl}>{t("everyDay", {day: task.monthlyResetDay ?? 1})}</span>}
          {task.type === "halfmonthly" && <span className={s.resetLbl}>{t("everyHalfMonth", { a: task.halfMonthlyStartDay ?? 1, b: (task.halfMonthlyStartDay ?? 1) + 15 })}</span>}
          {task.type === "event" && showDeadline && task.deadline && <span className={s.resetLbl}>
            {(deadlineMs >= DAY_MS || isExpired) && fmtDeadlineDate(task.deadline, t)}
            {(deadlineMs < DAY_MS && !isExpired) && utcToLocalHHMM(task.deadlineTime)}
          </span>}
        </div>
      </div>
    </div>
  );
}