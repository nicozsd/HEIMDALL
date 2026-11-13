const preferenceKey = 'heimdall-accessibility-preferences';
const options = [
  ['a11y-large-text', 'Texto maior'],
  ['a11y-high-contrast', 'Alto contraste'],
  ['a11y-readable-font', 'Fonte mais legível'],
  ['a11y-reduce-motion', 'Reduzir movimento'],
  ['a11y-color-safe', 'Cores mais distintas'],
  ['a11y-protanopia', 'Protanopia · vermelho'],
  ['a11y-deuteranopia', 'Deuteranopia · verde'],
  ['a11y-tritanopia', 'Tritanopia · azul'],
  ['a11y-achromatopsia', 'Sem percepção de cores']
];
const clickTargets = '.menu_btn, .buttons_tickets, .tab_button, .Clear_button, .user_grid_row_NF, .edit_record, .delete_record, #open_filter, #search_ico_US, #search_ico_TK';
const colorProfiles = new Set(['a11y-color-safe', 'a11y-protanopia', 'a11y-deuteranopia', 'a11y-tritanopia', 'a11y-achromatopsia']);

function labelFor(control) {
  const explicit = control.getAttribute('aria-label') || control.getAttribute('title');
  const visible = control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)?.textContent;
  const preceding = control.previousElementSibling?.textContent;
  const grouped = control.parentElement?.previousElementSibling?.textContent;
  const containerLabel = control.closest('.ticket_form_group, .Property_Item, .sequence_item, .right_column, .left_column')
    ?.querySelector('label, .profile_label, .Property_Label, .sequence_title')?.textContent;
  return explicit || visible || preceding || grouped || containerLabel || control.placeholder || control.name || control.id || 'Campo de formulário';
}

function enhance(root = document) {
  const controls = [
    ...(root.matches?.('input, select, textarea') ? [root] : []),
    ...(root.querySelectorAll?.('input, select, textarea') || [])
  ];
  controls.forEach((control) => {
    if (control.type === 'hidden') return;
    if (!control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')) control.setAttribute('aria-label', labelFor(control).replace(/\(obrigatório\)/gi, '').trim());
    if (control.required) control.setAttribute('aria-required', 'true');
    if (control.readOnly) control.setAttribute('aria-readonly', 'true');
    control.addEventListener('invalid', () => control.setAttribute('aria-invalid', 'true'), { once: true });
    control.addEventListener('input', () => control.removeAttribute('aria-invalid'));
  });
  const clickItems = [
    ...(root.matches?.(clickTargets) ? [root] : []),
    ...(root.querySelectorAll?.(clickTargets) || [])
  ];
  clickItems.forEach((item) => {
    const isNativeInteractive = item.matches('button, input, select, textarea, [role]') || (item.matches('a') && item.hasAttribute('href'));
    if (isNativeInteractive || item.dataset.a11yInteractive) return;
    item.dataset.a11yInteractive = 'true';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
    });
  });
  const statuses = [
    ...(root.matches?.('.status, .priority_tag, .ticket_status_tag') ? [root] : []),
    ...(root.querySelectorAll?.('.status, .priority_tag, .ticket_status_tag') || [])
  ];
  statuses.forEach((status) => {
    if (status.dataset.statusTone) return;
    const label = status.textContent.toLocaleLowerCase('pt-BR');
    const tone = /(cancel|erro|falh|cr[ií]tic|urgente|alta)/.test(label) ? 'danger'
      : /(pendente|aguard|atenç|m[eé]dia|baixa)/.test(label) ? 'warning'
      : /(conclu|resolvid|finaliz|feito|ativo|normal)/.test(label) ? 'success'
      : 'info';
    status.dataset.statusTone = tone;
    status.setAttribute('aria-label', `${status.textContent.trim()}. Estado: ${tone === 'danger' ? 'crítico' : tone === 'warning' ? 'atenção' : tone === 'success' ? 'concluído ou normal' : 'informativo'}`);
    status.setAttribute('role', 'status');
  });
  const tabs = [
    ...(root.matches?.('.tab_button, .tab_btn') ? [root] : []),
    ...(root.querySelectorAll?.('.tab_button, .tab_btn') || [])
  ];
  tabs.forEach((tab) => {
    if (!tab.dataset.a11yTab) {
      tab.dataset.a11yTab = 'true';
      tab.setAttribute('aria-pressed', String(tab.classList.contains('active')));
      tab.addEventListener('click', () => document.querySelectorAll('.tab_button, .tab_btn').forEach((item) => item.setAttribute('aria-pressed', String(item === tab))));
    }
  });
}

function init() {
  const main = document.querySelector('main, #window_container, .login_container, body');
  const skip = document.createElement('a');
  skip.className = 'skip-link'; skip.href = '#a11y-main'; skip.textContent = 'Pular para o conteúdo';
  if (main && !main.id) main.id = 'a11y-main';
  document.body.prepend(skip);
  const live = document.createElement('div');
  live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  document.body.append(live);
  const announce = (message) => { live.textContent = ''; window.setTimeout(() => { live.textContent = message; }, 30); };

  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'a11y-trigger'; trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', 'Abrir opções de acessibilidade');
  trigger.innerHTML = '<span class="a11y-trigger__mark" aria-hidden="true">A</span><span class="a11y-trigger__label">Acessibilidade</span>';
  const panel = document.createElement('section');
  panel.className = 'a11y-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Opções de acessibilidade');
  panel.innerHTML = `<div class="a11y-panel__header"><div><span class="a11y-panel__eyebrow">HEIMDALL</span><strong>Acessibilidade</strong></div><button type="button" data-a11y-close aria-label="Fechar opções">×</button></div><p class="a11y-panel__intro">Ajuste a leitura e a navegação do jeito que for melhor para você.</p><div class="a11y-panel__grid">${options.map(([key, name]) => `<button type="button" class="a11y-option" data-a11y-option="${key}" aria-pressed="false"><span>${name}</span><span aria-hidden="true" class="a11y-option__state">+</span></button>`).join('')}</div><button type="button" class="a11y-reset" data-a11y-reset>Restaurar ajustes</button>`;
  trigger.setAttribute('aria-controls', 'a11y-panel'); panel.id = 'a11y-panel';
  document.body.append(trigger, panel);

  const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
  const apply = () => {
    options.forEach(([key]) => {
      document.body.classList.toggle(key, Boolean(saved[key]));
      panel.querySelector(`[data-a11y-option="${key}"]`)?.setAttribute('aria-pressed', String(Boolean(saved[key])));
    });
    localStorage.setItem(preferenceKey, JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent('heimdallaccessibilitychange', { detail: { preferences: { ...saved } } }));
  };
  const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); };
  trigger.addEventListener('click', () => { const opening = panel.hidden; panel.hidden = !opening; trigger.setAttribute('aria-expanded', String(opening)); if (opening) panel.querySelector('.a11y-option')?.focus(); });
  panel.addEventListener('click', (event) => {
    const option = event.target.closest('[data-a11y-option]');
    const key = option?.dataset.a11yOption;
    if (key) {
      const nextValue = !saved[key];
      if (colorProfiles.has(key)) colorProfiles.forEach((profile) => { delete saved[profile]; });
      saved[key] = nextValue;
      apply();
      announce(`${option.textContent.trim()}: ${saved[key] ? 'ativado' : 'desativado'}.`);
    }
    if (event.target.closest('[data-a11y-reset]')) { options.forEach(([name]) => delete saved[name]); apply(); announce('Preferências de acessibilidade restauradas.'); }
    if (event.target.closest('[data-a11y-close]')) close();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) close(); });
  apply(); enhance();
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => { if (node.nodeType === Node.ELEMENT_NODE) enhance(node); }))).observe(document.body, { childList: true, subtree: true });
  window.HeimdallUI = { announce, enhance };
}

document.addEventListener('DOMContentLoaded', init);
