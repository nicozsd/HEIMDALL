import { ISO2Date,Date2ISO } from "../utils/HDL_Utils.js?v=3";

let initDate = new Date();
let endDate = new Date();
let ticketChart = null;
let hoursChart = null;
let projectHours = [];

function chartPalette() {
  const styles = getComputedStyle(document.body);
  return {
    ink: styles.getPropertyValue('--portal-ink').trim() || '#f5f7fb',
    muted: styles.getPropertyValue('--portal-muted').trim() || '#adbbcf',
    line: styles.getPropertyValue('--portal-line').trim() || 'rgba(183, 202, 230, .22)',
    gold: styles.getPropertyValue('--portal-gold').trim() || '#f4c542',
    focus: styles.getPropertyValue('--portal-focus').trim() || '#8bdcff',
    field: styles.getPropertyValue('--portal-field').trim() || '#111a29',
    reducedMotion: document.body.classList.contains('a11y-reduce-motion')
  };
}

function setRangeFromFilter() {
  const filter = document.getElementById('period_filter');
  const period = filter?.value || '7';
  endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  initDate = new Date(0);
  if (period !== 'all') {
    initDate = new Date();
    initDate.setHours(0, 0, 0, 0);
    initDate.setDate(initDate.getDate() - Number(period) + 1);
  }
}

function parseRecordDate(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const date = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toMinutes(value) {
  const text = String(value || '').trim();
  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const verbose = text.match(/(\d+)\s*h(?:\s*(\d+)\s*m?)?/i);
  if (verbose) return Number(verbose[1]) * 60 + Number(verbose[2] || 0);
  const decimal = Number(text.replace(',', '.'));
  return Number.isFinite(decimal) ? Math.round(decimal * 60) : 0;
}

export async function basicDashboard() {
  const ctx1 = document.getElementById('tickets_chart');
  const ctx2 = document.getElementById('hours_chart');
  const status = document.getElementById('dashboard_status');
  setRangeFromFilter();
  if (status) status.textContent = 'Atualizando indicadores…';
  let openTickets;
  let closedTickets;
  let totalHours;
  try {
    [openTickets, closedTickets, totalHours] = await Promise.all([getOpenTickets(), getClosedTickets(), getTotalProjTime()]);
  } catch (error) {
    console.error('Erro ao atualizar dashboard:', error);
    if (status) { status.textContent = 'Não foi possível carregar os indicadores. Tente novamente.'; status.classList.add('is-error'); }
    return;
  }
  if (status) { status.textContent = 'Indicadores atualizados para o período selecionado.'; status.classList.remove('is-error'); }

  const totalTickets  = openTickets + closedTickets;

  const openPercent   = totalTickets > 0 ? ((openTickets / totalTickets) * 100).toFixed(0) : 0;
  const closedPercent = totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(0) : 0;
    
  const openVariation   = 0;
  const closedVariation = 0;
  const hoursVariation  = 0;

  function fillValues() {
    document.getElementById('open_tickets').innerHTML = `${openTickets} <span class="percent">(${openPercent}%)</span>`;

    const openVarEl = document.getElementById('open_tickets_variation');
    openVarEl.textContent = 'Chamados abertos no período selecionado';
    openVarEl.className = 'variation';

    document.getElementById('closed_tickets').innerHTML = `${closedTickets} <span class="percent">(${closedPercent}%)</span>`;

    const closedVarEl = document.getElementById('closed_tickets_variation');
    closedVarEl.textContent = 'Chamados concluídos no período selecionado';
    closedVarEl.className = 'variation';

    document.getElementById('total_hours').innerHTML = `${totalHours} <span class="percent"></span>`;

    const hoursVarEl = document.getElementById('total_hours_variation');
    hoursVarEl.textContent = 'Horas registradas no período selecionado';
    hoursVarEl.className = 'variation';
  }

  function generateCharts() {
    const palette = chartPalette();
    ticketChart?.destroy();
    hoursChart?.destroy();
    if (!window.Chart) return;
    ticketChart = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Abertos', 'Concluídos'],
        datasets: [{
          data: [openTickets, closedTickets],
          backgroundColor: [
            palette.focus,
            palette.gold
          ],
          borderColor: [palette.ink, palette.ink],
          borderWidth: 2,
          hoverOffset: 20
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: palette.ink,
              font: { size: 14, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: palette.field,
            titleColor: palette.gold,
            bodyColor: palette.ink,
            borderColor: palette.line,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 4,
            boxShadow: '0 2px 6px rgba(54, 99, 235, 0.15)'
          },
          title: { display: false }
        },
        animation: {
          duration: palette.reducedMotion ? 0 : 900,
          easing: 'easeOutCubic'
        }
      }
    });
    
    hoursChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: projectHours.length ? projectHours.map((project) => project.label) : ['Sem apontamentos no período'],
        datasets: [{
          label: 'Horas',
          data: projectHours.length ? projectHours.map((project) => Number((project.minutes / 60).toFixed(2))) : [0],
          backgroundColor: palette.focus,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { color: palette.ink, font: { size: 14, weight: '600' } },
            grid: { display: false },
            border: { display: false }
          },
          y: {
            ticks: {
              color: palette.ink,
              font: { size: 14, weight: '600' },
              callback: val => val + 'h'
            },
            grid: {
              color: palette.line,
              borderDash: [4, 6]
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.field,
            titleColor: palette.gold,
            bodyColor: palette.ink,
            borderColor: palette.line,
            borderWidth: 1,
            padding: 8,
            cornerRadius: 4,
            boxShadow: '0 2px 6px rgba(54, 99, 235, 0.15)'
          }
        },
        animation: {
          duration: palette.reducedMotion ? 0 : 1000,
          easing: 'easeOutCubic'
        }
      }
    });
  }

  document.getElementById('period_filter').onchange = () => basicDashboard();

  fillValues();
  generateCharts();
}

window.addEventListener('heimdallaccessibilitychange', () => {
  if (document.getElementById('tickets_chart') && document.getElementById('hours_chart')) basicDashboard();
});

async function getOpenTickets() {
  let count = 0;
  let queryvalue = {};  

  if (window.currentUserData.register_type === 'company')
    queryvalue = { ticket_company: window.currentUserData.companyId };

  const response = await fetch('http://localhost:3001/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableid: 'tickets', query: queryvalue })
  });

  const data = await response.json();
  const records = data.json || [];

  for (const record of records) {
    const createdDate = parseRecordDate(record.createdDate);
    const updateDate  = parseRecordDate(record.updateDate);
    const closedDate  = record.closedDate || record.ClosedDate;

    const isInPeriod = (
      (createdDate && createdDate >= initDate && createdDate <= endDate) ||
      (updateDate && updateDate >= initDate && updateDate <= endDate)
    );

    if (isInPeriod && !closedDate) {
      count++;
    }
  }

  return count;
}

async function getClosedTickets() {
  let count = 0;
  let queryvalue = {};

  if (window.currentUserData.register_type === 'company')
    queryvalue = { ticket_company: window.currentUserData.companyId };

  const response = await fetch('http://localhost:3001/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableid: 'tickets', query: queryvalue })
  });

  const data = await response.json();
  const records = data.json || [];

  for (const record of records) {    
    const closedDate = parseRecordDate(record.closedDate || record.ClosedDate);

    if (closedDate && closedDate >= initDate && closedDate <= endDate) {
      count++;
    }
  }

  return count;
}

async function getTotalProjTime() {
    const query = window.currentUserData.register_type === 'company'
      ? { project_company: window.currentUserData.companyId }
      : {};
    const projectResponse = await fetch('http://localhost:3001/find', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableid: 'projects', query })
    });
    if (!projectResponse.ok) throw new Error('Falha ao consultar projetos.');
    const projects = (await projectResponse.json()).json || [];
    const summaries = await Promise.all(projects.map(async (project) => {
      const response = await fetch('http://localhost:3001/find', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableid: 'records', query: { projid: project.projId } })
      });
      if (!response.ok) throw new Error('Falha ao consultar apontamentos.');
      const records = (await response.json()).json || [];
      const minutes = records
        .filter((record) => {
          const date = parseRecordDate(record.refdate || record.createdDate || record.date);
          return date && date >= initDate && date <= endDate;
        })
        .reduce((total, record) => total + toMinutes(record.total), 0);
      return { label: project.projName || project.projId || 'Projeto sem nome', minutes };
    }));
    projectHours = summaries.filter((project) => project.minutes > 0);
    const totalMinutes = projectHours.reduce((total, project) => total + project.minutes, 0);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
