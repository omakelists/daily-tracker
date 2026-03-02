import { html } from 'htm/preact';
import { useState } from 'htm/preact';
import { t } from './i18n.js';
import { uid, isPWA } from './constants.js';
import { IS, SB, Modal } from './UI.js';

const TYPE_OPTS = ['daily', 'weekly', 'webdaily', 'monthly', 'halfmonthly'];

function TypeSelect({ value, onChange, style }) {
  return html`
    <select value=${value} onChange=${onChange} style=${{ ...IS, ...style }}>
      ${TYPE_OPTS.map(ty => html`<option key=${ty} value=${ty}>${t('types.' + ty)}</option>`)}
    </select>
  `;
}

function TaskExtraFields({ task, onChange }) {
  return html`
    <>
      ${task.type === 'webdaily' && html`
        <span style=${{ fontSize:10, color:'#8b949e', whiteSpace:'nowrap' }}>${t('webReset')}</span>
        <input type="time" value=${task.webResetTime || '00:00'}
          onChange=${e => onChange('webResetTime', e.target.value)}
          style=${{ ...IS, width:84, fontFamily:'monospace' }} />
      `}
      ${task.type === 'monthly' && html`
        <span style=${{ fontSize:10, color:'#8b949e', whiteSpace:'nowrap' }}>${t('resetDay')}</span>
        <input type="number" min="1" max="28" value=${task.monthlyResetDay ?? 1}
          onChange=${e => onChange('monthlyResetDay', Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
          style=${{ ...IS, width:52, fontFamily:'monospace', textAlign:'center' }} />
        <span style=${{ fontSize:10, color:'#8b949e' }}>${t('dayUnit')}</span>
      `}
      <input type="url" value=${task.url || ''} placeholder=${t('taskUrl')}
        onChange=${e => onChange('url', e.target.value)}
        style=${{ ...IS, width:130, minWidth:0 }} />
    </>
  `;
}

/** Resize a File to maxSize×maxSize JPEG and call callback(dataUrl). */
function resizeImage(file, maxSize, callback) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const s = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.naturalWidth  * s);
    canvas.height = Math.round(img.naturalHeight * s);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.src = url;
}

export function SettingsModal({ games, setGames, onClose, showConfirm }) {
  const [newGame, setNewGame] = useState({ name:'', color:'#4a9eff', resetTime:'05:00', launchUrl:'' });
  const [showNG,  setShowNG]  = useState(false);
  const [newTask, setNewTask] = useState({ name:'', type:'daily', webResetTime:'00:00', monthlyResetDay:1, url:'' });
  const [addTo,   setAddTo]   = useState(null);

  const pwa = isPWA();

  const upGame  = (id, f, v) => setGames(g => g.map(gm => gm.id === id ? { ...gm, [f]: v } : gm));
  const delGame = (id, name) => showConfirm(t('deleteMsg', { name }),
    () => setGames(g => g.filter(gm => gm.id !== id)));
  const addGame = () => {
    if (!newGame.name.trim()) return;
    setGames(g => [...g, { id: uid(), ...newGame, tasks: [] }]);
    setNewGame({ name:'', color:'#4a9eff', resetTime:'05:00', launchUrl:'' });
    setShowNG(false);
  };
  const upTask  = (gid, tid, f, v) => setGames(g => g.map(gm => gm.id === gid
    ? { ...gm, tasks: gm.tasks.map(tk => tk.id === tid ? { ...tk, [f]: v } : tk) }
    : gm));
  const delTask = (gid, tid) => setGames(g => g.map(gm => gm.id === gid
    ? { ...gm, tasks: gm.tasks.filter(tk => tk.id !== tid) }
    : gm));
  const addTask = (gid) => {
    setGames(g => g.map(gm => gm.id === gid
      ? { ...gm, tasks: [...gm.tasks, { id: uid(), ...newTask }] }
      : gm));
    setNewTask({ name:'', type:'daily', webResetTime:'00:00', monthlyResetDay:1, url:'' });
    setAddTo(null);
  };
  const openAddTask = (gid) => {
    setAddTo(gid);
    setNewTask({ name:'', type:'daily', webResetTime:'00:00', monthlyResetDay:1, url:'' });
  };

  const rowStyle = { display:'flex', alignItems:'center', gap:7, marginBottom:6, flexWrap:'wrap' };

  return html`
    <${Modal} title=${'⚙️ ' + t('settings')} onClose=${onClose}>
      <div style=${{ display:'flex', flexDirection:'column', gap:12 }}>

        ${games.map(game => html`
          <div key=${game.id} style=${{
            background: '#161b22', border: `1px solid ${game.color}44`,
            borderRadius: 10, overflow: 'hidden',
          }}>

            <!-- Game header fields -->
            <div style=${{ padding:'10px 13px', display:'flex', alignItems:'center', gap:8,
                           borderBottom:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap' }}>
              <input type="color" value=${game.color}
                onChange=${e => upGame(game.id, 'color', e.target.value)}
                style=${{ width:26, height:26, border:'none', background:'none', cursor:'pointer', flexShrink:0 }} />
              <input value=${game.name} onChange=${e => upGame(game.id, 'name', e.target.value)}
                onKeyDown=${e => e.key === 'Enter' && document.activeElement.blur()}
                style=${{ ...IS, flex:1, minWidth:80, fontWeight:700 }} placeholder=${t('gameName')} />
              <span style=${{ fontSize:11, color:'#8b949e', whiteSpace:'nowrap' }}>${t('resetLbl')}</span>
              <input type="time" value=${game.resetTime}
                onChange=${e => upGame(game.id, 'resetTime', e.target.value)}
                style=${{ ...IS, width:86, fontFamily:'monospace' }} />
              <input type="url" value=${game.launchUrl || ''} placeholder=${t('launchUrl')}
                onChange=${e => upGame(game.id, 'launchUrl', e.target.value)}
                style=${{ ...IS, flex:1, minWidth:100 }} />
              <button onClick=${() => delGame(game.id, game.name)}
                style=${{ ...SB, color:'#f85149', borderColor:'#f8514944' }}>${t('delete')}</button>
            </div>

            <!-- PWA-only icon section -->
            ${pwa && html`
              <div style=${{ padding:'8px 13px', borderBottom:'1px solid rgba(255,255,255,0.06)',
                             display:'flex', alignItems:'center', gap:10 }}>
                ${game.iconData
                  ? html`
                    <img src=${game.iconData} style=${{
                      width:36, height:36, borderRadius:'50%', objectFit:'cover',
                      border:'2px solid ' + game.color + '66',
                    }} />
                    <span style=${{ fontSize:11, color:'#8b949e', flex:1 }}>Game icon</span>
                    <button onClick=${() => upGame(game.id, 'iconData', null)}
                      style=${{ ...SB, color:'#f85149', fontSize:11 }}>✕ ${t('delete')}</button>
                  `
                  : html`
                    <label style=${{ ...SB, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                      🖼 Set icon
                      <input type="file" accept="image/*" style=${{ display:'none' }}
                        onChange=${e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          resizeImage(file, 64, data => upGame(game.id, 'iconData', data));
                          e.target.value = '';
                        }} />
                    </label>
                    <span style=${{ fontSize:10, color:'#484f58' }}>PWA only</span>
                  `
                }
              </div>
            `}

            <!-- Tasks -->
            <div style=${{ padding:'8px 13px 10px' }}>
              ${game.tasks.map(task => html`
                <div key=${task.id} style=${rowStyle}>
                  <${TypeSelect} value=${task.type}
                    onChange=${e => upTask(game.id, task.id, 'type', e.target.value)}
                    style=${{ width:104 }} />
                  <input value=${task.name}
                    onChange=${e => upTask(game.id, task.id, 'name', e.target.value)}
                    style=${{ ...IS, flex:1, minWidth:70 }} placeholder=${t('types.' + task.type)} />
                  <${TaskExtraFields} task=${task} onChange=${(f, v) => upTask(game.id, task.id, f, v)} />
                  <button onClick=${() => delTask(game.id, task.id)}
                    style=${{ ...SB, color:'#f85149' }}>✕</button>
                </div>
              `)}

              ${addTo === game.id
                ? html`
                  <div style=${rowStyle}>
                    <${TypeSelect} value=${newTask.type}
                      onChange=${e => setNewTask(tt => ({ ...tt, type: e.target.value }))}
                      style=${{ width:104 }} />
                    <input value=${newTask.name}
                      onChange=${e => setNewTask(tt => ({ ...tt, name: e.target.value }))}
                      onKeyDown=${e => e.key === 'Enter' && addTask(game.id)}
                      style=${{ ...IS, flex:1, minWidth:70 }}
                      placeholder=${t('types.' + newTask.type)}
                      autofocus />
                    <${TaskExtraFields} task=${newTask} onChange=${(f, v) => setNewTask(tt => ({ ...tt, [f]: v }))} />
                    <button onClick=${() => addTask(game.id)}
                      style=${{ ...SB, color:'#3fb950', borderColor:'#3fb95044' }}>${t('add')}</button>
                    <button onClick=${() => setAddTo(null)} style=${SB}>✕</button>
                  </div>
                `
                : html`
                  <button onClick=${() => openAddTask(game.id)}
                    style=${{ ...SB, marginTop:4, color:'#58a6ff', borderColor:'#58a6ff44' }}>
                    ${t('addTask')}
                  </button>
                `
              }
            </div>
          </div>
        `)}

        ${showNG
          ? html`
            <div style=${{ background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'12px 13px' }}>
              <div style=${{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                <input type="color" value=${newGame.color}
                  onChange=${e => setNewGame(g => ({ ...g, color: e.target.value }))}
                  style=${{ width:26, height:26, border:'none', background:'none', cursor:'pointer' }} />
                <input value=${newGame.name}
                  onChange=${e => setNewGame(g => ({ ...g, name: e.target.value }))}
                  onKeyDown=${e => e.key === 'Enter' && addGame()}
                  style=${{ ...IS, flex:1, minWidth:80 }} placeholder=${t('gameName')} autofocus />
                <span style=${{ fontSize:11, color:'#8b949e', whiteSpace:'nowrap' }}>${t('resetLbl')}</span>
                <input type="time" value=${newGame.resetTime}
                  onChange=${e => setNewGame(g => ({ ...g, resetTime: e.target.value }))}
                  style=${{ ...IS, width:86, fontFamily:'monospace' }} />
                <input type="url" value=${newGame.launchUrl || ''} placeholder=${t('launchUrl')}
                  onChange=${e => setNewGame(g => ({ ...g, launchUrl: e.target.value }))}
                  style=${{ ...IS, flex:1, minWidth:100 }} />
              </div>
              <div style=${{ display:'flex', gap:8 }}>
                <button onClick=${addGame}
                  style=${{ ...SB, color:'#3fb950', borderColor:'#3fb95044' }}>${t('add')}</button>
                <button onClick=${() => setShowNG(false)} style=${SB}>${t('cancel')}</button>
              </div>
            </div>
          `
          : html`<button class="add-game-btn" onClick=${() => setShowNG(true)}>${t('addGame')}</button>`
        }
      </div>
    </${Modal}>
  `;
}
