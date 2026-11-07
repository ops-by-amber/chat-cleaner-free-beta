/* Chat Cleaner 1.6.1 — supports standard and custom-GPT conversation routes. */
(() => {
  'use strict';
  if (window.__amberCleaner15) return;
  window.__amberCleaner15 = true;

  const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const lower = value => norm(value).toLocaleLowerCase();
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const selected = new Set();
  const imported = new Map(); // session-only data from a user-chosen file
  const openedHere = new Map();
  let enabled = false, working = false, stopping = false, scheduled = false, trackOpened = false;
  let known = new Map();
  let lastPath = location.pathname;
  const diagnostics = [];
  let lastBatch = null;
  let sendingFeedback = false;
  const FEEDBACK_ENDPOINT = 'https://formsubmit.co/ajax/ops.by.amber@gmail.com';
  // The recipient is the email associated with the publisher's GitHub account.
  // FormSubmit requires a one-time activation email before forwarding submissions.
  const FEEDBACK_VERSION = '1.6.0';

  const triggerSelector = [
    'button[data-conversation-options-trigger]',
    'button[data-testid="conversation-options-button"]',
    'button[data-testid*="conversation"][data-testid*="options"]',
    'button[aria-haspopup="menu"]',
    'button[aria-label*="options" i]',
    'button[aria-label*="more" i]'
  ].join(',');
  const deleteItemSelector = '[data-testid="delete-chat-menu-item"], [role="menuitem"][data-testid*="delete"], [role="menuitem"].text-danger';
  const archiveItemSelector = '[data-testid="archive-chat-menu-item"], [role="menuitem"][data-testid*="archive"]';
  const confirmSelector = 'button[data-testid="delete-conversation-confirm-button"], [role="dialog"] button.btn-danger, [role="alertdialog"] button.btn-danger, [role="dialog"] button[type="submit"].text-chart-red';

  const ui = document.createElement('div');
  ui.id = 'acc12-root';
  ui.innerHTML = `
    <button id="acc12-open" type="button">Chat Cleaner</button>
    <section id="acc12-panel" hidden aria-label="Chat Cleaner">
      <header><strong>Chat Cleaner</strong><button type="button" id="acc12-close" aria-label="Close">✕</button></header>
      <button class="acc12-toggle-btn" id="acc12-enabled" type="button" aria-pressed="false">□ Show checkboxes in sidebar</button>
      <input id="acc12-search" type="search" placeholder="Filter chat titles in sidebar" aria-label="Search chats">
      <div id="acc12-count" role="status" aria-live="polite">Turn on checkboxes to start.</div>
      <div class="acc12-line"><button id="acc12-all" type="button">Select matches</button><button id="acc12-clear" type="button">Clear</button></div>
      <div class="acc12-line"><button class="acc12-archive" id="acc12-archive" type="button">Archive (0)</button><button class="acc12-delete" id="acc12-delete" type="button">Delete (0)</button><button id="acc12-stop" type="button" hidden>Stop</button></div>
      <details id="acc12-extra">
        <summary>Content & date search (optional)</summary>
        <p>To search older chats or their messages, import <code>conversations.json</code> from a ChatGPT data export.</p>
        <button type="button" id="acc12-import">Import conversations.json</button>
        <input type="file" id="acc12-file" accept=".json,application/json" hidden>
        <div id="acc12-import-status">No export imported.</div>
        <label class="acc12-optin"><input type="checkbox" id="acc12-track"> Remember when I open a chat (local to this browser)</label>
        <button type="button" id="acc12-clear-opened">Erase local opened-date history</button>
        <label>Search in <select id="acc12-mode"><option value="title">Sidebar titles</option><option value="content">Message content (export)</option><option value="alltitles">All titles (export)</option></select></label>
        <label>Date <select id="acc12-date-field"><option value="none">Any date</option><option value="created">Created (export)</option><option value="updated">Last updated (export)</option><option value="opened">Opened here (since install)</option></select></label>
        <div class="acc12-dates"><label>From <input type="date" id="acc12-from"></label><label>To <input type="date" id="acc12-to"></label></div>
        <div id="acc12-results" aria-live="polite"></div>
      </details>
      <div id="acc12-progress" role="status" aria-live="polite" hidden></div>
      <section id="acc12-feedback" class="acc12-feedback" hidden aria-label="Optional Chat Cleaner feedback">
        <div class="acc12-feedback-head"><strong>How did it go?</strong><button type="button" id="acc12-feedback-close" aria-label="Dismiss feedback">✕</button></div>
        <p>Optional. Choosing a response sends it and your note through FormSubmit to the developer by email. No chat titles, messages, IDs or logs are included.</p>
        <textarea id="acc12-feedback-note" rows="2" maxlength="280" placeholder="Optional comment (don't include private chat details)" aria-label="Optional feedback comment"></textarea>
        <div class="acc12-feedback-options">
          <button type="button" data-acc12-feedback="worked">✓ Worked</button>
          <button type="button" data-acc12-feedback="issue">⚠ Had an issue</button>
          <button type="button" data-acc12-feedback="idea">✦ Suggestion</button>
        </div>
        <div id="acc12-feedback-status" role="status" aria-live="polite"></div>
        <a id="acc12-feedback-fallback" href="mailto:ops.by.amber@gmail.com?subject=Chat%20Cleaner%20feedback" hidden>Email feedback instead</a>
      </section>
      <footer id="acc12-status" role="status" aria-live="polite">Nothing is changed until you confirm. This extension has no payment or tracking server.</footer>
      <details id="acc12-diagnostics"><summary>Operation details</summary><pre id="acc12-log"></pre><button type="button" id="acc12-copy-log">Copy details</button></details>
    </section>
  `;
  document.documentElement.appendChild(ui);
  const $ = id => ui.querySelector('#' + id);
  const status = (message, kind='info') => {
    const node=$('acc12-status'); node.textContent=message; node.dataset.kind=kind;
  };
  function log(stage, note) {
    const entry = `${new Date().toLocaleTimeString()} | ${stage}: ${note}`;
    diagnostics.push(entry);
    if (diagnostics.length > 150) diagnostics.shift();
    $('acc12-log').textContent=diagnostics.join('\n');
  }
  function progress(msg, kind='info') {
    const el = $('acc12-progress'); el.hidden=false; el.dataset.kind=kind; el.textContent=msg;
  }
  function menuDebug() {
    const visibleMenus=[...document.querySelectorAll('[role="menu"],[role="menuitem"],[data-state="open"]')].filter(visibleElement);
    return `Visible menu/dialog candidates: ${visibleMenus.length}; visible menuitems: ${visibleMenus.filter(e=>e.getAttribute('role')==='menuitem').length}`;
  }

  // Only accept real conversation URLs; custom GPT landing pages and folders
  // aren't conversations and must never be selected.
  const conversationLinkSelector = 'a[href*="/c/"], a[href*="/g/"]';
  function conversationIdFromPath(path) {
    const standard = /^\/c\/([a-z0-9-]{12,})\/?$/i.exec(path);
    if (standard) return standard[1];
    const gpt = /^\/g\/[^/]+\/(?:c\/)?([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/?$/i.exec(path);
    return gpt?.[1] || null;
  }

  function chatId(a) {
    if (!(a instanceof HTMLAnchorElement) || !a.href || a.closest('#acc12-root')) return null;
    try {
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return null;
      return conversationIdFromPath(url.pathname);
    } catch { return null; }
  }

  function sidebarLink(a) {
    if (!chatId(a) || a.closest('main, article')) return false;
    const sidebar = a.closest('nav, aside, [data-testid*="sidebar"], [id*="sidebar"], [id*="history"]');
    if (sidebar) return true;
    if (a.closest('.acc12-filtered-out')) return true;
    const rect = a.getBoundingClientRect();
    return rect.width > 10 && rect.left >= 0 && rect.left < Math.min(470, innerWidth * .45);
  }

  function visible(a) {
    return !!a && a.isConnected && a.getClientRects().length > 0 && getComputedStyle(a).visibility !== 'hidden';
  }

  function getLinks() {
    return [...document.querySelectorAll(conversationLinkSelector)].filter(sidebarLink);
  }

  function titleOf(link) {
    const specific = link.querySelector('[data-testid="conversation-title"]');
    return norm(specific?.textContent || link.textContent) || '(Untitled)';
  }

  function rowFor(link) {
    // Prefer the nearest row containing the link and its options control. Never hide whole navigation lists.
    const base = link.parentElement;
    if (!base || base === document.body) return link;
    if ([...base.querySelectorAll(conversationLinkSelector)].filter(a => !!chatId(a)).length === 1) return base;
    return link;
  }

  function recordVisit() {
    if (!trackOpened) return;
    const id = conversationIdFromPath(location.pathname);
    if (!id) return;
    const time = Date.now();
    openedHere.set(id, time);
    try { chrome.storage.local.set({acc12OpenedHere: Object.fromEntries(openedHere)}); } catch { /* no-op */ }
  }

  function dateOf(id, field) {
    if (field === 'opened') return openedHere.get(id) ?? null;
    return imported.get(id)?.[field] ?? null;
  }
  function dayOf(stamp) {
    if (!Number.isFinite(stamp)) return null;
    const d = new Date(stamp);
    if (isNaN(d.valueOf())) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function matchesDate(id) {
    const field = $('acc12-date-field').value;
    if (field === 'none') return true;
    const day = dayOf(dateOf(id,field));
    if (!day) return false;
    const from = $('acc12-from').value, to = $('acc12-to').value;
    return (!from || day >= from) && (!to || day <= to);
  }

  function matchesSearch(item) {
    const keyword = lower($('acc12-search').value);
    if (!keyword) return matchesDate(item.id);
    const mode = $('acc12-mode').value;
    if (mode === 'content') return (imported.get(item.id)?.content || '').includes(keyword) && matchesDate(item.id);
    if (mode === 'alltitles') return lower(imported.get(item.id)?.title || item.title).includes(keyword) && matchesDate(item.id);
    return lower(item.title).includes(keyword) && matchesDate(item.id);
  }

  function checkbox(link, id, title) {
    // A span, not a native <input>. ChatGPT's global CSS overrides native checkboxes
    // on some installations, leaving them transparent even when injected correctly.
    // This control has a real visible border, a checked glyph and keyboard support.
    let box = [...link.children].find(c => c.classList?.contains('acc12-checkbox'));
    if (!box) {
      box = document.createElement('span');
      box.className = 'acc12-checkbox';
      box.setAttribute('role','checkbox');
      box.setAttribute('tabindex','0');
      box.dataset.acc12Id = id;
      const toggle = e => {
        e.preventDefault(); e.stopPropagation();
        if (working) return;
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        refresh();
      };
      for (const type of ['mousedown', 'pointerdown', 'mouseup', 'pointerup']) {
        box.addEventListener(type, e => e.stopPropagation());
      }
      box.addEventListener('click', toggle);
      box.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') toggle(e);
      });
      link.prepend(box);
    }
    box.setAttribute('aria-checked', selected.has(id) ? 'true' : 'false');
    box.setAttribute('aria-disabled', working ? 'true' : 'false');
    box.setAttribute('aria-label', `Select chat: ${title}`);
    box.title = selected.has(id) ? `Deselect ${title}` : `Select ${title}`;
    return box;
  }

  function updateToggle() {
    const button = $('acc12-enabled');
    button.setAttribute('aria-pressed',enabled ? 'true' : 'false');
    button.textContent = enabled ? '☑ Checkboxes ON — click to hide' : '□ Show checkboxes in sidebar';
  }

  function refresh() {
    if (working) return updateCounts();
    const links = getLinks();
    const current = new Map();
    for (const link of links) {
      const id = chatId(link), title = titleOf(link);
      if (!id || current.has(id)) continue;
      const row = rowFor(link);
      current.set(id, {id, title, link, row});
      link.classList.toggle('acc12-selectable', enabled);
      if (enabled) checkbox(link,id,title);
      else link.querySelectorAll(':scope > .acc12-checkbox').forEach(box => box.remove());
      const match = matchesSearch({id,title});
      row.classList.toggle('acc12-filtered-out', enabled && !match);
    }
    known = current;
    updateToggle();
    updateCounts();
    updateImportedResults();
  }

  function updateCounts() {
    const matches = [...known.values()].filter(item => matchesSearch(item)).length;
    const count = known.size;
    $('acc12-count').textContent = enabled
      ? `${matches} matching / ${count} loaded in sidebar · ${selected.size} selected`
      : `${count} chats loaded in sidebar · ${selected.size} selected`;
    $('acc12-archive').textContent = `Archive (${selected.size})`;
    $('acc12-delete').textContent = `Delete (${selected.size})`;
    for (const id of ['acc12-all','acc12-clear','acc12-delete','acc12-archive','acc12-enabled'])
      $(id).disabled = working || (['acc12-delete','acc12-archive'].includes(id) && !selected.size);
    $('acc12-stop').hidden = !working;
  }

  function scheduleRefresh() {
    if (scheduled || working) return;
    scheduled = true;
    setTimeout(() => {scheduled=false; refresh();}, 180);
  }

  function parseTime(input) {
    if (input == null || input === '') return null;
    if (typeof input === 'string' && !/^\d+(\.\d+)?$/.test(input)) {
      const d = Date.parse(input); return Number.isFinite(d) ? d : null;
    }
    const n = Number(input);
    return Number.isFinite(n) && n > 0 ? (n < 1e11 ? Math.round(n*1000) : Math.round(n)) : null;
  }

  function extractContent(conv) {
    let out = '', total = 0;
    const mapping = conv.mapping || {};
    for (const node of Object.values(mapping)) {
      const content = node?.message?.content;
      if (!content) continue;
      const pieces = [...(Array.isArray(content.parts) ? content.parts : []), content.text];
      for (const p of pieces) {
        const t = typeof p === 'string' ? p : (typeof p?.text === 'string' ? p.text : '');
        if (!t || total >= 400000) continue;
        const clipped = t.slice(0,400000-total); out += ' '+clipped; total += clipped.length;
      }
      if (total >= 400000) break;
    }
    return out.toLocaleLowerCase();
  }

  async function importHistory(file) {
    if (!file) return;
    if (file.size > 200*1024*1024) return status('File over 200 MB. Import stopped to protect this tab.');
    $('acc12-import-status').textContent = `Reading ${file.name} locally…`;
    await delay(30);
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('Expected a conversations.json array, not an export ZIP.');
      imported.clear();
      for (const c of data) {
        const id = c?.conversation_id || c?.id;
        if (!/^[a-z0-9-]{12,}$/i.test(String(id || ''))) continue;
        imported.set(id, {title:norm(c.title), created:parseTime(c.create_time), updated:parseTime(c.update_time), content:extractContent(c)});
      }
      $('acc12-import-status').textContent = `${imported.size} chats imported for local searching.`;
      status('Import complete. No chats were changed.');
      refresh();
    } catch(e) { $('acc12-import-status').textContent = `Import failed: ${e.message}`; }
    $('acc12-file').value = '';
  }

  function updateImportedResults() {
    const el = $('acc12-results');
    el.replaceChildren();
    const mode = $('acc12-mode').value, dateField=$('acc12-date-field').value;
    const searchingExport = mode !== 'title' || ['created','updated'].includes(dateField);
    if (!searchingExport) {
      if (dateField === 'opened') el.textContent = 'Opened here is only tracked from v1.2 onward on this browser.';
      return;
    }
    if (!imported.size) {
      el.textContent = 'Import conversations.json to use message content or historical dates.';
      return;
    }
    const keyword = lower($('acc12-search').value);
    const rows = [];
    for (const [id, data] of imported) {
      const hit = !keyword || (mode === 'content' ? data.content.includes(keyword) : data.title.toLocaleLowerCase().includes(keyword));
      if (hit && matchesDate(id)) rows.push({id, data});
    }
    const header = document.createElement('div');
    header.className = 'acc12-small';
    header.textContent = `${rows.length} matches in imported history. Open a match to load it in the sidebar before selecting it.`;
    el.append(header);
    for (const item of rows.slice(0,30)) {
      const a = document.createElement('a');
      a.href = `${location.origin}/c/${item.id}`;
      a.textContent = item.data.title || '(Untitled)';
      a.title = 'Open this conversation in ChatGPT';
      el.append(a);
    }
    if (rows.length>30) {
      const more=document.createElement('div'); more.className='acc12-small';
      more.textContent=`First 30 shown of ${rows.length}. Refine your search for more.`; el.append(more);
    }
  }

  // Native ChatGPT still controls each action. Never fall back to an unknown API.
  function visibleElement(el) {
    if (!visible(el) || el.closest('[aria-hidden="true"], [hidden]')) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.visibility !== 'collapse';
  }
  function getLink(id) {
    return getLinks().find(a => chatId(a)===id) || null;
  }
  function hover(el) {
    if (!el) return;
    for (const type of ['pointerover','mouseover','mouseenter','mousemove']) {
      const E = type.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : MouseEvent;
      try { el.dispatchEvent(new E(type,{bubbles:true,cancelable:true,view:window,pointerType:'mouse'})); } catch {}
    }
  }
  async function waitFor(fn, timeout=3500) {
    const end=Date.now()+timeout;
    while (Date.now()<end) {
      if (stopping) throw new Error('Stopped at your request');
      const found=fn(); if(found) return found;
      await delay(95);
    }
    return null;
  }
  function candidates(node, selector) {
    return [...node.querySelectorAll(selector)].filter(visibleElement);
  }
  const menuTriggerSelector = [
    'button[data-conversation-options-trigger]',
    'button[data-testid="conversation-options-button"]',
    'button[data-testid$="-options"][aria-haspopup="menu"]',
    'button[id^="radix-"][aria-haspopup="menu"]',
    'button[aria-haspopup="menu"]',
    '[role="button"][aria-haspopup="menu"]',
    'button[aria-label*="More" i]',
    'button[aria-label*="options" i]'
  ].join(',');
  function optionsButton(link) {
    let node=link;
    // Only use the closest row owner containing exactly the target conversation.
    for(let i=0;i<8 && node && node!==document.body;i++,node=node.parentElement) {
      const links=[...node.querySelectorAll(conversationLinkSelector)].filter(a=>!!chatId(a));
      if(links.length!==1 || links[0]!==link) continue;
      const buttons=candidates(node,menuTriggerSelector);
      if(buttons.length===1) return buttons[0];
      // If a row has more than one menu trigger, refuse to guess.
      if(buttons.length>1) return null;
    }
    return null;
  }
  function openMenu() {
    return [...document.querySelectorAll('[role="menu"][data-state="open"],[role="menu"]')].filter(visibleElement).at(-1)||null;
  }
  function dispatchPointer(el,type) {
    const P=window.PointerEvent||MouseEvent;
    const E=type.startsWith('pointer')?P:MouseEvent;
    el.dispatchEvent(new E(type, {bubbles:true,cancelable:true,view:window,
      button:0,buttons:type.endsWith('down')?1:0,pointerType:'mouse',isPrimary:true}));
  }
  async function openOptions(id) {
    // Only repeat the *menu-opening* stage. Never repeat a destructive action.
    // A sidebar re-render can invalidate the DOM node after several chat removals.
    for(let attempt=1;attempt<=2;attempt++) {
      const link=getLink(id);
      if(!link) throw new Error('Selected chat is no longer loaded in the sidebar. No action attempted.');
      const row=rowFor(link);
      row.classList.remove('acc12-filtered-out');
      row.scrollIntoView({block:'nearest'});
      hover(row);hover(link);
      await delay(attempt===1?250:750);
      const fresh=getLink(id);
      if(!fresh) throw new Error('Chat row changed while opening options; stopped safely.');
      const button=await waitFor(()=>optionsButton(fresh),1700);
      log('menu',`Attempt ${attempt}/2: ${button?'options button located':'no unique options button'}`);
      if(!button) {if(attempt===1) {await delay(900);continue;}break;}
      button.scrollIntoView({block:'nearest'});
      hover(button);
      button.click();
      let menu=await waitFor(openMenu,850);
      if(menu) {log('menu','Options menu opened');return menu;}
      log('menu','Click did not open menu; trying pointerdown on this button');
      try {dispatchPointer(button,'pointerover');dispatchPointer(button,'mouseover');dispatchPointer(button,'pointerdown');}
      catch (e) {log('menu',`Pointerdown was not accepted: ${e.message}`);}
      menu=await waitFor(openMenu,700);
      if(menu) {log('menu','Options menu opened');return menu;}
      // Finish the pointer sequence without clicking a second time; a second click
      // can close a Radix menu that opened on pointerdown.
      try {dispatchPointer(button,'mousedown');dispatchPointer(button,'pointerup');dispatchPointer(button,'mouseup');}
      catch (e) {log('menu',`Pointerup was not accepted: ${e.message}`);}
      menu=await waitFor(openMenu,600);
      if(menu) {log('menu','Options menu opened');return menu;}
      if(attempt===1) {
        log('menu','Menu still closed. Allowing sidebar to settle, then retrying this chat once.');
        await delay(1050);
      }
    }
    throw new Error('ChatGPT options menu did not open after two attempts. Stopped safely without selecting Delete or Archive.');
  }
  function actionItem(action) {
    const menu=openMenu();
    const within=menu||document;
    const selector = action==='delete'
      ? '[data-testid="delete-chat-menu-item"], [role="menuitem"][data-testid*="delete"], [role="menuitem"].text-danger'
      : '[data-testid="archive-chat-menu-item"], [role="menuitem"][data-testid*="archive"]';
    const exact=candidates(within,selector);
    if(exact.length===1) return exact[0];
    const matcher=action==='delete' ? /^delete(?: this| chat| conversation)?$/i : /^archive(?: chat| conversation)?$/i;
    const menuitems=candidates(within,'[role="menuitem"], [role="menuitemradio"]')
      .filter(el=>matcher.test(norm(el.textContent||el.getAttribute('aria-label'))));
    return menuitems.length===1 ? menuitems[0] : null;
  }
  function dialogs() {
    return candidates(document,'[role="dialog"], [role="alertdialog"]')
      .filter(el=>el.getAttribute('data-state')!=='closed');
  }
  function matchingConfirmButtons(dialog) {
    const buttons=candidates(dialog,'button,[role="button"]');
    const byId=buttons.filter(el=>el.matches('[data-testid="delete-conversation-confirm-button"],[data-testid*="confirm-delete"], [data-testid*="delete-confirm"]'));
    if (byId.length===1) return byId;
    const byText=buttons.filter(el=>/^delete(?: (?:this |the )?(?:chat|conversation)| permanently)?$/i.test(norm(el.textContent||el.getAttribute('aria-label'))));
    if(byText.length===1) return byText;
    // Late-2026 ChatGPT dialog: form submit is styled destructive, has no test ID.
    const byDanger=buttons.filter(el=>el.matches('form button[type="submit"].text-chart-red, button.btn-danger,button[data-variant="destructive"], button.bg-red-500'));
    return byDanger.length===1 ? byDanger : [];
  }
  function deleteDialog() {
    // Only accept an unambiguous delete dialog, not an unrelated browser modal.
    const possible=dialogs().filter(el=> {
      const text=norm(el.textContent);
      const semantic=/delete|permanent|can't be undone|cannot be undone|remove this chat/i.test(text);
      return semantic && matchingConfirmButtons(el).length===1;
    });
    return possible.length===1 ? possible[0] : null;
  }
  function confirmationVisible(dialog) { return !!(dialog && dialog.isConnected && visibleElement(dialog)); }

  async function performOne(id, action) {
    let link=getLink(id);
    if(link) rowFor(link).classList.remove('acc12-filtered-out');
    if(!link) throw new Error('Selected chat is no longer loaded in the sidebar. Scroll to it and retry.');
    if(dialogs().length) throw new Error('A dialog is already open in ChatGPT. Close it before continuing.');
    log('menu', 'Looking for options button');
    await openOptions(id);
    const item=await waitFor(()=>actionItem(action),2200);
    if(!item) throw new Error(`ChatGPT ${action} menu item not identified (${menuDebug()}).`);
    item.click();
    if(action==='delete') {
      log('confirm','Waiting for ChatGPT confirmation dialog');
      let dialog=await waitFor(deleteDialog,3200);
      if(!dialog) {
        log('confirm','No recognized confirmation dialog after menu click');
        throw new Error('Could not safely identify ChatGPT’s delete confirmation. Nothing else was attempted.');
      }
      const buttons=matchingConfirmButtons(dialog);
      if(buttons.length!==1) throw new Error('Delete confirmation button is ambiguous; refused to click.');
      log('confirm','Clicking ChatGPT native Delete confirmation');
      buttons[0].click();
      // Do not click a destructive confirmation twice if an async request is slow.
      const removed=await waitFor(()=>!getLink(id),9000);
      if(!removed) {
        const state=confirmationVisible(dialog)?'The ChatGPT confirmation is still open.':'The confirmation closed but the chat is still in the sidebar.';
        throw new Error(`${state} Could not verify deletion. Stopped without retrying.`);
      }
    } else {
      const removed=await waitFor(()=>!getLink(id),9000);
      if(!removed) throw new Error('Could not verify archiving: the chat remains in the sidebar.');
    }
    log('verify',`${action} observed: exact chat link disappeared from sidebar (server persistence not independently verified)`);
  }

  function confirmBatch(action) {
    if(working) return;
    if (!selected.size) return status('Check at least one chat first.');
    const missing=[...selected].filter(id=>!getLink(id));
    if(missing.length) return status(`${missing.length} selected chats are not currently loaded. Clear those selections or scroll them into view.`);
    const count=selected.size;
    const overlay=document.createElement('div'); overlay.className='acc12-overlay';
    const dialog=document.createElement('section'); dialog.className='acc12-confirm'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    const h=document.createElement('h2'); h.textContent=`${action==='delete'?'Delete':'Archive'} ${count} chat${count===1?'':'s'}?`;
    const p=document.createElement('p'); p.textContent=action==='delete' ? 'Deletion is permanent and cannot be undone. Only the checked chats will be deleted.' : 'Archived chats can be restored from ChatGPT settings.';
    const sample=document.createElement('ul');
    for(const id of [...selected].slice(0,5)) {const li=document.createElement('li'); li.textContent=known.get(id)?.title || id; sample.append(li);}
    if(count>5){const li=document.createElement('li');li.textContent=`…and ${count-5} more`;sample.append(li);}
    const row=document.createElement('div');row.className='acc12-line';
    const cancel=document.createElement('button'); cancel.textContent='Cancel'; cancel.type='button';
    const yes=document.createElement('button'); yes.textContent=`${action==='delete'?'Delete':'Archive'} ${count}`; yes.type='button'; yes.className=action==='delete'?'acc12-delete':'acc12-archive';
    let safety=null;
    if(action==='delete') {
      const info=document.createElement('label'); info.textContent='Type DELETE to confirm: ';
      safety=document.createElement('input'); safety.type='text'; safety.placeholder='DELETE'; safety.setAttribute('aria-label','Type DELETE to confirm');
      yes.disabled=true;
      safety.addEventListener('input',()=>{yes.disabled=safety.value.trim()!=='DELETE';});
      info.append(safety); dialog.append(h,p,sample,info);
    } else dialog.append(h,p,sample);
    const dismiss=()=>overlay.remove();
    cancel.addEventListener('click',dismiss);
    yes.addEventListener('click',()=>{if(action==='delete'&&safety?.value.trim()!=='DELETE')return;dismiss();runBatch([...selected],action);});
    row.append(cancel,yes); dialog.append(row); overlay.append(dialog); ui.append(overlay);
    (safety||cancel).focus();
  }

  function showFeedback() {
    const panel = $('acc12-feedback');
    panel.hidden = false;
    $('acc12-feedback-note').value = '';
    $('acc12-feedback-note').disabled = false;
    $('acc12-feedback-status').textContent = '';
    $('acc12-feedback-fallback').hidden = true;
    for (const button of panel.querySelectorAll('[data-acc12-feedback]')) button.disabled = false;
  }

  async function sendFeedback(category) {
    if (sendingFeedback || !lastBatch) return;
    if (!['worked', 'issue', 'idea'].includes(category)) return;
    sendingFeedback = true;
    const panel = $('acc12-feedback');
    const message = $('acc12-feedback-status');
    const buttons = [...panel.querySelectorAll('[data-acc12-feedback]')];
    buttons.forEach(button => { button.disabled = true; });
    message.textContent = 'Sending feedback…';

    // Only aggregate batch status and an explicitly typed comment are sent.
    // Never send conversation links, titles, identifiers, imported content or logs.
    const outcome = lastBatch.completed === lastBatch.requested
      ? 'completed'
      : (lastBatch.failed ? 'stopped-on-error' : 'stopped');
    const payload = {
      _subject: 'Chat Cleaner beta feedback',
      version: FEEDBACK_VERSION,
      rating: category,
      action: lastBatch.action,
      outcome,
      observed_sidebar_removals: String(lastBatch.completed),
      items_requested: String(lastBatch.requested),
      comment: $('acc12-feedback-note').value.trim().slice(0, 280)
    };

    try {
      const response = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Feedback service unavailable');
      const data = await response.json();
      if (data?.success === false || data?.success === 'false') throw new Error('Feedback was not accepted');
      message.textContent = 'Thanks — feedback submitted. The developer receives it by email once the form is activated.';
      $('acc12-feedback-note').disabled = true;
    } catch {
      message.textContent = 'Feedback could not be submitted. Try again or send an email.';
      buttons.forEach(button => { button.disabled = false; });
      const fallback = $('acc12-feedback-fallback');
      const subject = encodeURIComponent('Chat Cleaner beta feedback: ' + category);
      const body = encodeURIComponent('Category: ' + category + '\nComment: ' + payload.comment);
      fallback.href = 'mailto:ops.by.amber@gmail.com?subject=' + subject + '&body=' + body;
      fallback.hidden = false;
    } finally {
      sendingFeedback = false;
    }
  }

  async function runBatch(ids,action) {
    $('acc12-feedback').hidden = true;
    working=true; stopping=false; refresh(); updateCounts();
    diagnostics.length=0; $('acc12-log').textContent='';
    lastBatch={requested:ids.length,action,completed:0,failed:0};
    progress(`0/${ids.length} completed. Starting ${action}…`);
    status('Processing one conversation at a time.');
    for(const [index,id] of ids.entries()) {
      if(stopping) break;
      progress(`${index+1}/${ids.length}: ${action==='delete'?'Deleting':'Archiving'} one chat… (${lastBatch.completed} sidebar removals observed)`);
      log('start',`Item ${index+1} of ${ids.length}: ${action}`);
      try {
        await performOne(id,action);
        selected.delete(id); lastBatch.completed++;
        progress(`${lastBatch.completed}/${ids.length} sidebar removals observed ${action==='delete'?'deleted':'archived'}.`,'success');
        if(!stopping) await delay(1400); // modest pacing; do not hammer ChatGPT menus
      } catch(e) {
        lastBatch.failed++;
        log('ERROR',`${e.message}`);
        $('acc12-diagnostics').open=true;
        progress(`${lastBatch.completed} sidebar removals observed; item ${index+1} failed. No further chats attempted.`,'error');
        status(`Stopped: ${e.message} The failed and remaining chats stay selected.`, 'error');
        break;
      }
    }
    const {completed,failed,requested}=lastBatch;
    working=false; stopping=false; refresh();
    if(completed===requested) {
      progress(`Done: ${completed}/${requested} sidebar removals observed ${action==='delete'?'deleted':'archived'}.`,'success');
      status('Finished. Only removals observed in the current sidebar were counted; server persistence is unverified.','success');
    } else if(!failed) {
      progress(`Stopped: ${completed}/${requested} sidebar removals observed. Remaining chats are selected.`);
      status('Stopped at your request.');
    }
    showFeedback();
  }

  $('acc12-feedback-close').addEventListener('click', () => { $('acc12-feedback').hidden = true; });
  for (const button of $('acc12-feedback').querySelectorAll('[data-acc12-feedback]')) {
    button.addEventListener('click', () => sendFeedback(button.dataset.acc12Feedback));
  }

  $('acc12-copy-log').addEventListener('click',()=>{navigator.clipboard?.writeText(diagnostics.join('\n')).then(()=>status('Operation details copied.')).catch(()=>status('Copy failed: select the text in Operation details.'));});
  $('acc12-open').addEventListener('click',()=>{$('acc12-panel').hidden=false;ui.classList.add('acc12-show'); refresh();});
  $('acc12-close').addEventListener('click',()=>{ui.classList.remove('acc12-show');$('acc12-panel').hidden=true;});
  $('acc12-enabled').addEventListener('click', () => {
    enabled=!enabled;
    if(!enabled) {
      // Restores rows that the title filter temporarily hid.
      document.querySelectorAll('.acc12-filtered-out').forEach(el=>el.classList.remove('acc12-filtered-out'));
    }
    refresh();
    status(enabled ? 'Checkboxes are now visible on the left of sidebar chat titles.' : 'Sidebar checkboxes hidden; no chats changed.');
  });
  $('acc12-search').addEventListener('input',()=>{
    if(!enabled) {enabled=true;}
    refresh();
  });
  $('acc12-all').addEventListener('click',()=>{enabled=true;refresh();for(const item of known.values()) if(matchesSearch(item)) selected.add(item.id);refresh();});
  $('acc12-clear').addEventListener('click',()=>{selected.clear();$('acc12-search').value='';$('acc12-date-field').value='none';$('acc12-mode').value='title';$('acc12-from').value='';$('acc12-to').value='';refresh();status('Selection and filters cleared.');});
  $('acc12-archive').addEventListener('click',()=>confirmBatch('archive'));
  $('acc12-delete').addEventListener('click',()=>confirmBatch('delete'));
  $('acc12-stop').addEventListener('click',()=>{stopping=true;status('Stopping after the current chat…');});
  $('acc12-track').addEventListener('change', e=>{
    trackOpened=!!e.target.checked;
    chrome.storage.local.set({acc12TrackOpened:trackOpened}).catch(()=>{});
    if(trackOpened) recordVisit();
    status(trackOpened?'Opened-date tracking enabled (local only).':'Opened-date tracking disabled. Previously saved dates remain until erased.');
  });
  $('acc12-clear-opened').addEventListener('click',()=>{
    openedHere.clear();
    chrome.storage.local.remove(['acc12OpenedHere','accOpenDates']).catch(()=>{});
    refresh();status('Saved opened-date history erased from this browser.');
  });
  $('acc12-import').addEventListener('click',()=>$('acc12-file').click());
  $('acc12-file').addEventListener('change',e=>importHistory(e.target.files?.[0]));
  for (const id of ['acc12-mode','acc12-date-field','acc12-from','acc12-to']) $(id).addEventListener('change',()=>{enabled=true;refresh();});

  const observer=new MutationObserver(records=>{
    if(location.pathname!==lastPath) {lastPath=location.pathname;recordVisit();}
    if(records.some(record=>!ui.contains(record.target))) scheduleRefresh();
  });
  observer.observe(document.body||document.documentElement,{subtree:true,childList:true});
  refresh();
  try {
    chrome.storage.local.get(['acc12OpenedHere','accOpenDates','acc12TrackOpened']).then(result=>{
      trackOpened = result.acc12TrackOpened===true;
      $('acc12-track').checked=trackOpened;
      for(const [id,time] of Object.entries(result?.accOpenDates||{})) if(Number.isFinite(time)) openedHere.set(id,time);
      for(const [id,time] of Object.entries(result?.acc12OpenedHere||{})) if(Number.isFinite(time) && time > (openedHere.get(id)||0)) openedHere.set(id,time);
      recordVisit(); refresh();
    }).catch(()=>recordVisit());
  } catch { recordVisit(); }
})();
