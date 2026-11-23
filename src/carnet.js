// Le carnet de l'astronome : tes observations notées à la plume, et les sceaux gagnés aux pleines lunes.
import { time, longDate } from './format.js';
import { runhead, folio, dropcap } from './panels.js';

const KEY = 'lc.journal';
const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) || f; } catch { return f; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ok */ } };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** ctx : { date, phaseName, placeName } — ce que l'on inscrit en marge de chaque note. */
export function renderCarnet(body, ctx) {
  const notes = load(KEY, []);
  const seals = Object.entries(load('lc.carnet', { seals: {} }).seals || {});
  body.innerHTML = `
    ${runhead('Liber observationum')}
    <h3 class="lettrine">${dropcap('Le carnet de l’astronome')}</h3>
    <p class="lead">Note ce que tu as vu ce soir : l’Ourse, la Lune, une étoile filante…</p>
    <textarea id="note-text" class="note-input" rows="3" placeholder="Ce soir, au-dessus de la maison…"></textarea>
    <div class="note-bar"><span class="note-ctx">${longDate(ctx.date)} · ${time(ctx.date)} · ${esc(ctx.phaseName)}</span>
      <button class="btn" id="note-save">Inscrire</button></div>
    <h4>Observations</h4>
    ${notes.length ? notes.map((n, i) => `<div class="note">
        <p class="note-head">${esc(n.when)}<button class="note-del" data-i="${i}" aria-label="Effacer cette note">✕</button></p>
        <p class="note-body">${esc(n.text)}</p>
        <p class="note-meta">${esc(n.meta)}</p></div>`).join('')
      : '<p class="story">Les pages sont encore blanches. La première observation t’attend.</p>'}
    <h4>Sceaux des pleines lunes</h4>
    ${seals.length ? seals.map(([d, a]) => `<p class="note-body">✺ ${esc(d)} — <i>${esc(a)}</i></p>`).join('')
      : '<p class="story">Aucun sceau encore. Le soir de la pleine lune, un sceau de cire apparaît près de la Lune : résous son énigme.</p>'}
    <p class="motto-small">Le temps venra</p>
    ${folio(ctx.date)}`;

  body.querySelector('#note-save').addEventListener('click', () => {
    const text = body.querySelector('#note-text').value.trim();
    if (!text) return;
    notes.unshift({ when: `${longDate(ctx.date)} · ${time(ctx.date)}`, text, meta: `${ctx.phaseName} · ${ctx.placeName}` });
    save(KEY, notes);
    navigator.vibrate?.(8);
    renderCarnet(body, ctx);
  });
  body.querySelectorAll('.note-del').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Effacer cette observation ?')) return;
    notes.splice(Number(b.dataset.i), 1);
    save(KEY, notes);
    renderCarnet(body, ctx);
  }));
}
