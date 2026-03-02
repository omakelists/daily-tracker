import { html } from 'htm/preact';
import { useState, useCallback } from 'htm/preact';
import { t } from './i18n.js';
import { PERIOD_TYPES, L, ensureContrast } from './constants.js';
import { getPeriodKey, getPrevPeriodKey, msUntilReset, formatCountdown, checkKey } from './helpers.js';
import { dragState, clearDrag, dragFromHandle, clearDragHandle } from './dnd.js';
import { Row, PrevBar, DragHandle, LinkButton } from './UI.js';
import { TaskRow } from './TaskRow.js';

export function GameCard({ game, checks, now, onToggle, allDone, dailyTasks, cd, onReorderTasks }) {
  const hasTasks = game.tasks.length > 0;

  // Master checkbox: daily tasks only
  const allTodayDone = dailyTasks.length > 0 &&
    dailyTasks.every(tk => !!checks[checkKey(tk.id, getPeriodKey(tk, game, now))]);

  // Prev bar: daily tasks only
  const prevCount = dailyTasks.filter(tk =>
    !!checks[checkKey(tk.id, getPrevPeriodKey(tk, game, now))]
  ).length;
  const prevAll  = dailyTasks.length > 0 && prevCount === dailyTasks.length;
  const prevPart = prevCount > 0 && prevCount < dailyTasks.length;

  // Countdown
  const ms = msUntilReset(now, game.resetTime);
  const h  = ms / 3600000;
  const cdColor = h < 3 ? '#f85149' : h < 6 ? '#e3b341' : '#8b949e';

  // Task groups for display/DnD (daily first, then periodic)
  const dailyGroup  = game.tasks.filter(tk => !PERIOD_TYPES.has(tk.type));
  const periodGroup = game.tasks.filter(tk =>  PERIOD_TYPES.has(tk.type));

  const visColor = ensureContrast(game.color);

  // Task drag-drop state: { id: taskId, group: 'daily'|'period', before: bool }
  const [taskDrop, setTaskDrop] = useState(null);

  const onTaskDragStart = useCallback((e, taskId, groupName) => {
    if (!dragFromHandle) { e.preventDefault(); return; }
    clearDragHandle();
    e.stopPropagation(); // don't trigger game-level drag
    dragState.type      = 'task';
    dragState.gameId    = game.id;
    dragState.taskId    = taskId;
    dragState.taskGroup = groupName;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  }, [game.id]);

  const onTaskDragOver = useCallback((e, taskId, groupName) => {
    // Only respond to task drags within the same game and same group
    if (dragState.type !== 'task' ||
        dragState.gameId !== game.id ||
        dragState.taskGroup !== groupName ||
        dragState.taskId === taskId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setTaskDrop(prev =>
      prev?.id === taskId && prev?.before === before ? prev : { id: taskId, group: groupName, before }
    );
  }, [game.id]);

  const onTaskDrop = useCallback((e, taskId, groupName) => {
    if (dragState.type !== 'task' ||
        dragState.gameId !== game.id ||
        dragState.taskGroup !== groupName) return;
    e.preventDefault();
    e.stopPropagation();
    const before = taskDrop?.id === taskId ? taskDrop.before : true;
    onReorderTasks(game.id, dragState.taskId, taskId, before);
    setTaskDrop(null);
    clearDrag();
  }, [game.id, taskDrop, onReorderTasks]);

  const onTaskDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '';
    setTaskDrop(null);
    clearDrag();
    clearDragHandle();
  }, []);

  const onTaskDragLeave = useCallback((e, taskId) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setTaskDrop(prev => prev?.id === taskId ? null : prev);
    }
  }, []);

  // Render a group of task rows with drag wrappers
  const renderGroup = (groupTasks, groupName) => groupTasks.map(tk => {
    const isDropTarget = taskDrop?.id === tk.id && taskDrop?.group === groupName;
    return html`
      <div
        key=${tk.id}
        draggable=${true}
        onMouseUp=${clearDragHandle}
        onDragStart=${(e) => onTaskDragStart(e, tk.id, groupName)}
        onDragOver=${(e)  => onTaskDragOver(e,  tk.id, groupName)}
        onDrop=${(e)      => onTaskDrop(e,      tk.id, groupName)}
        onDragEnd=${onTaskDragEnd}
        onDragLeave=${(e) => onTaskDragLeave(e, tk.id)}
        style=${{
          transition: 'box-shadow 0.1s',
          boxShadow: isDropTarget
            ? `inset 0 ${taskDrop.before ? '2' : '-2'}px 0 #58a6ff`
            : 'none',
        }}
      >
        <${TaskRow}
          task=${tk}
          game=${game}
          checks=${checks}
          now=${now}
          onToggle=${onToggle}
          cd=${cd}
          dragHandle=${html`<${DragHandle}/>`}
        />
      </div>
    `;
  });

  return html`
    <div style=${{
      background: 'rgba(22,27,34,0.85)',
      border: `1px solid ${allDone ? game.color+'55' : 'rgba(255,255,255,0.07)'}`,
      borderLeft: `${L.CARD_BORDER}px solid ${game.color}`,
      borderRadius: 12, marginBottom: 10, overflow: 'hidden',
      opacity: allDone ? 0.62 : 1,
      transition: 'opacity 0.5s, border-color 0.5s',
    }}>

      <${Row}
        dragHandle=${html`<${DragHandle}/>`}
        bg=${`linear-gradient(90deg, ${game.color}14, transparent)`}
        borderBottom=${hasTasks ? '1px solid rgba(255,255,255,0.055)' : 'none'}
        prevBar=${html`<${PrevBar} show=${dailyTasks.length > 0} checked=${prevAll} partial=${prevPart} />`}
        checkbox=${html`
          <button onClick=${() => onToggle(null, game, true)} style=${{
            width: L.CB_W, height: L.CB_W, borderRadius: 7, cursor: 'pointer', flexShrink: 0,
            background: allTodayDone ? game.color : 'transparent',
            border: `2px solid ${allTodayDone ? game.color : 'rgba(255,255,255,0.22)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', transition: 'all 0.2s',
            boxShadow: allTodayDone ? `0 0 10px ${game.color}55` : 'none',
          }}>${allTodayDone ? '✓' : ''}</button>
        `}
        content=${html`
          ${game.iconData && html`
            <img src=${game.iconData} style=${{
              width: 22, height: 22, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
            }} />
          `}
          <span style=${{
            fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: allDone ? '#6e7681' : visColor,
            textDecoration: allDone ? 'line-through' : 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.85)',
            transition: 'all 0.3s',
          }}>${game.name}</span>
          ${game.launchUrl && html`<${LinkButton} url=${game.launchUrl} label=${t('launchUrl')} />`}
        `}
        meta=${html`
          <span style=${{ fontSize:11, color:'#6e7681' }}>${game.resetTime}</span>
          <span style=${{ fontSize:11, fontWeight:600, color:cdColor, fontFamily:'monospace' }}>
            ⏱${formatCountdown(ms, cd)}
          </span>
        `}
      />

      ${hasTasks && html`
        <div style=${{ paddingTop:2, paddingBottom:4 }}>
          ${renderGroup(dailyGroup, 'daily')}

          ${dailyGroup.length > 0 && periodGroup.length > 0 && html`
            <div style=${{ margin:'5px 0', borderTop:'1px solid rgba(255,255,255,0.07)', position:'relative' }}>
              <span class="sep-label">— ${t('periodic')} —</span>
            </div>
          `}

          ${renderGroup(periodGroup, 'period')}
        </div>
      `}
    </div>
  `;
}
