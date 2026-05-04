/**
 * VELA Widget — Embeddable Chat Agent
 * Usage: <script src="https://getvela.io/widget.js"
 *           data-key="vela_live_xxxx"
 *           data-agent="support"
 *           data-name="Your Business Support"
 *           data-color="#c9a84c"
 *           data-position="bottom-right">
 *        </script>
 */
(function () {
  'use strict';

  // ── Config from script tag attributes ──────────────────────────
  const script = document.currentScript ||
    Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes('widget.js'));

  const CONFIG = {
    apiKey:    script?.dataset.key      || '',
    agentType: script?.dataset.agent    || 'support',
    agentName: script?.dataset.name     || 'VELA Support',
    color:     script?.dataset.color    || '#c9a84c',
    position:  script?.dataset.position || 'bottom-right',
    proxyUrl:  (script?.src ? new URL(script.src).origin : '') + '/api/chat',
  };

  // ── System prompts per agent type ──────────────────────────────
  const SYSTEMS = {
    support: `You are ${CONFIG.agentName}, an AI customer support agent. Be helpful, concise, and professional. Keep responses under 3 sentences when possible. If you cannot resolve an issue, offer to escalate to a human agent.`,
    sales:   `You are ${CONFIG.agentName}, an AI sales assistant. Qualify leads, answer product questions, handle objections, and guide prospects toward a meeting or demo. Be confident and outcome-focused.`,
    ops:     `You are ${CONFIG.agentName}, an AI operations assistant. Help with task management, scheduling, reporting, and internal coordination. Be efficient and action-oriented.`,
  };

  const SUGGESTIONS = {
    support: ['How can you help me?', 'I have a question', 'I need support', 'Talk to someone'],
    sales:   ['Tell me more', 'What does this cost?', 'Book a demo', 'How does it work?'],
    ops:     ["What's on today?", 'Generate a report', 'Schedule a meeting', 'What needs attention?'],
  };

  const WELCOMES = {
    support: `Hi! I'm ${CONFIG.agentName}. How can I help you today?`,
    sales:   `Hey! I'm ${CONFIG.agentName}. Looking to learn more or get started?`,
    ops:     `${CONFIG.agentName} online. What do you need?`,
  };

  // ── State ───────────────────────────────────────────────────────
  let isOpen = false;
  let firstOpen = true;
  let isTyping = false;
  let history = [];

  // ── Inject styles ───────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #vela-w{position:fixed;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    #vela-w *{box-sizing:border-box;margin:0;padding:0;}
    #vela-w.br{bottom:20px;right:20px;}
    #vela-w.bl{bottom:20px;left:20px;}
    #vela-btn{width:52px;height:52px;border-radius:0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:transform .2s,box-shadow .2s;position:relative;}
    #vela-btn:hover{transform:scale(1.06);}
    #vela-notif{position:absolute;top:-4px;right:-4px;width:13px;height:13px;background:#ef4444;border-radius:50%;border:2px solid #fff;}
    #vela-win{position:absolute;bottom:62px;right:0;width:320px;background:#0e0e0e;border:1px solid rgba(255,255,255,0.12);box-shadow:0 16px 48px rgba(0,0,0,0.6);display:flex;flex-direction:column;transform:scale(.92) translateY(12px);transform-origin:bottom right;opacity:0;pointer-events:none;transition:transform .25s cubic-bezier(.34,1.2,.64,1),opacity .2s;max-height:460px;}
    #vela-win.bl{right:auto;left:0;transform-origin:bottom left;}
    #vela-win.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}
    #vela-win::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
    #vela-hdr{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;flex-shrink:0;}
    #vela-av{width:32px;height:32px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;letter-spacing:1px;}
    #vela-nm{font-size:12px;font-weight:500;color:#f0ede8;letter-spacing:.5px;}
    #vela-st{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(240,237,232,.45);}
    #vela-dot{width:5px;height:5px;background:#4ade80;border-radius:50%;}
    #vela-min{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);font-size:18px;margin-left:auto;padding:2px 4px;line-height:1;transition:color .15s;}
    #vela-min:hover{color:#fff;}
    #vela-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0;max-height:280px;}
    #vela-msgs::-webkit-scrollbar{width:3px;}
    #vela-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);}
    .vela-row{display:flex;max-width:90%;}
    .vela-row.u{align-self:flex-end;}
    .vela-row.a{align-self:flex-start;}
    .vela-bub{padding:9px 12px;font-size:13px;line-height:1.55;border-radius:2px;}
    .vela-row.a .vela-bub{background:#181818;border:1px solid rgba(255,255,255,.07);border-left-width:2px;color:#f0ede8;}
    .vela-row.u .vela-bub{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.18);color:#f0ede8;}
    .vela-typing{display:flex;gap:3px;align-items:center;padding:10px 12px;background:#181818;border:1px solid rgba(255,255,255,.07);border-left-width:2px;}
    .vela-typing span{width:4px;height:4px;border-radius:50%;animation:velablink 1.2s infinite;}
    .vela-typing span:nth-child(2){animation-delay:.2s;}
    .vela-typing span:nth-child(3){animation-delay:.4s;}
    @keyframes velablink{0%,80%,100%{opacity:.2}40%{opacity:1}}
    #vela-pills{padding:0 10px 8px;display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0;}
    .vela-pill{font-size:10px;padding:4px 9px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(240,237,232,.45);cursor:pointer;transition:all .15s;white-space:nowrap;border-radius:0;}
    .vela-pill:hover{color:#f0ede8;border-color:rgba(255,255,255,.25);}
    #vela-inp-row{padding:8px 10px 10px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-shrink:0;}
    #vela-inp{flex:1;background:#1a1a1a;border:1px solid rgba(255,255,255,.1);border-right:none;padding:8px 11px;font-size:13px;color:#f0ede8;outline:none;font-family:inherit;}
    #vela-inp::placeholder{color:rgba(255,255,255,.2);}
    #vela-inp:focus{border-color:rgba(201,168,76,.4);}
    #vela-send{border:none;padding:8px 12px;cursor:pointer;font-size:13px;transition:opacity .15s;flex-shrink:0;}
    #vela-send:hover{opacity:.85;}
    #vela-send:disabled{opacity:.35;cursor:not-allowed;}
    #vela-brand{padding:5px 10px 8px;text-align:center;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.12);flex-shrink:0;}
    @media(max-width:480px){#vela-win{width:calc(100vw - 20px);right:0;}#vela-w.bl #vela-win{left:0;right:auto;}}
  `;
  document.head.appendChild(style);

  // ── Build DOM ───────────────────────────────────────────────────
  const pos = CONFIG.position === 'bottom-left' ? 'bl' : 'br';
  const c = CONFIG.color;
  const cDark = '#000';

  const widget = document.createElement('div');
  widget.id = 'vela-w';
  widget.className = pos;
  widget.innerHTML = `
    <button id="vela-btn" style="background:${c};" aria-label="Open chat">
      <svg id="vela-ico-chat" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${cDark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition:opacity .2s,transform .2s;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg id="vela-ico-close" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${cDark}" stroke-width="2.5" stroke-linecap="round" style="position:absolute;opacity:0;transition:opacity .2s,transform .2s;transform:rotate(-20deg)"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <div id="vela-notif"></div>
    </button>
    <div id="vela-win" class="${pos === 'bl' ? 'bl' : ''}">
      <div id="vela-win" style="display:contents;">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${c},transparent);"></div>
      </div>
      <div id="vela-hdr">
        <div id="vela-av" style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:${c};">AX</div>
        <div>
          <div id="vela-nm">${CONFIG.agentName}</div>
          <div id="vela-st"><div id="vela-dot"></div>Online · Replies instantly</div>
        </div>
        <button id="vela-min" onclick="velaWidget.close()" aria-label="Minimize">−</button>
      </div>
      <div id="vela-msgs"></div>
      <div id="vela-pills"></div>
      <div id="vela-inp-row">
        <input id="vela-inp" placeholder="Type a message…" autocomplete="off">
        <button id="vela-send" style="background:${c};color:${cDark};">➤</button>
      </div>
      <div id="vela-brand">Powered by <span style="color:rgba(201,168,76,.5);">VELA</span></div>
    </div>
  `;
  document.body.appendChild(widget);

  // Fix: only one #vela-win should exist
  const wins = document.querySelectorAll('#vela-win');
  wins.forEach((w, i) => { if (i > 0) w.remove(); });
  const win = document.getElementById('vela-win');

  // ── Event listeners ─────────────────────────────────────────────
  document.getElementById('vela-btn').addEventListener('click', toggle);
  document.getElementById('vela-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  document.getElementById('vela-send').addEventListener('click', send);

  // ── Core functions ───────────────────────────────────────────────
  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    isOpen = true;
    win.classList.add('open');
    document.getElementById('vela-ico-chat').style.opacity = '0';
    document.getElementById('vela-ico-close').style.opacity = '1';
    document.getElementById('vela-ico-close').style.transform = 'rotate(0deg)';
    document.getElementById('vela-notif').style.display = 'none';
    if (firstOpen) {
      firstOpen = false;
      renderPills(SUGGESTIONS[CONFIG.agentType] || SUGGESTIONS.support);
      setTimeout(() => addMsg('a', WELCOMES[CONFIG.agentType] || WELCOMES.support), 320);
    }
    setTimeout(() => document.getElementById('vela-inp').focus(), 340);
  }

  function close() {
    isOpen = false;
    win.classList.remove('open');
    document.getElementById('vela-ico-chat').style.opacity = '1';
    document.getElementById('vela-ico-close').style.opacity = '0';
    document.getElementById('vela-ico-close').style.transform = 'rotate(-20deg)';
  }

  function renderPills(list) {
    const el = document.getElementById('vela-pills');
    el.innerHTML = list.map(s =>
      `<button class="vela-pill" onclick="document.getElementById('vela-inp').value='${s.replace(/'/g,"\\'")}';velaWidget.send()">${s}</button>`
    ).join('');
  }

  function send() {
    const inp = document.getElementById('vela-inp');
    const text = inp.value.trim();
    if (!text || isTyping) return;
    inp.value = '';
    document.getElementById('vela-pills').innerHTML = '';
    addMsg('u', text);
    history.push({ role: 'user', content: text });
    showTyping();
    isTyping = true;
    document.getElementById('vela-send').disabled = true;

    fetch(CONFIG.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEMS[CONFIG.agentType] || SYSTEMS.support,
        messages: history
      })
    })
    .then(r => r.json())
    .then(data => {
      const reply = data.content?.[0]?.text || "I'm having trouble connecting right now.";
      history.push({ role: 'assistant', content: reply });
      hideTyping();
      addMsg('a', reply, true);
    })
    .catch(() => {
      hideTyping();
      addMsg('a', 'Connection issue — please try again.');
    })
    .finally(() => {
      isTyping = false;
      document.getElementById('vela-send').disabled = false;
    });
  }

  function addMsg(role, text, typewrite) {
    const area = document.getElementById('vela-msgs');
    const row = document.createElement('div');
    row.className = `vela-row ${role}`;
    const bub = document.createElement('div');
    bub.className = 'vela-bub';
    // Set border-left color from config
    if (role === 'a') bub.style.borderLeftColor = CONFIG.color + '66';
    row.appendChild(bub);
    area.appendChild(row);
    area.scrollTop = area.scrollHeight;

    if (typewrite) {
      let i = 0;
      (function t() {
        if (i < text.length) { bub.textContent = text.slice(0, ++i); area.scrollTop = area.scrollHeight; setTimeout(t, 14); }
      })();
    } else { bub.textContent = text; }
  }

  function showTyping() {
    const area = document.getElementById('vela-msgs');
    const row = document.createElement('div');
    row.className = 'vela-row a'; row.id = 'vela-t';
    const t = document.createElement('div');
    t.className = 'vela-typing';
    t.style.borderLeftColor = CONFIG.color + '66';
    t.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(t); area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  function hideTyping() { const t = document.getElementById('vela-t'); if (t) t.remove(); }

  // ── Public API ───────────────────────────────────────────────────
  window.velaWidget = { open, close, toggle, send };

})();
