(() => {
  'use strict';
  const data = window.LEDGER_DATA;
  const core = window.LedgerCore;
  const content = document.getElementById('app-content');
  const nav = document.getElementById('side-nav');
  const mobileNav = document.getElementById('mobile-nav');
  const modal = document.getElementById('modal-root');
  if (!data || !core) { content.innerHTML = '<p class="load-error">账目数据未能载入，请刷新页面。</p>'; return; }

  const asOf = data.as_of_date;
  const [initialYear, initialMonth] = asOf.split('-').map(Number);
  const transactions = data.transactions.map((tx, index) => ({ ...tx, _index: index }));
  const state = {
    view: 'overview', kind: 'month', year: initialYear, month: initialMonth,
    quarter: Math.floor((initialMonth - 1) / 3) + 1,
    categoryMode: 'expense', expanded: new Set(['购物','餐饮']), selectedDay: asOf,
    query: '', payment: 'all', category: 'all', scope: 'all', shown: 60,
  };
  const navItems = [
    { key: 'overview', label: '总览', icon: 'home' },
    { key: 'calendar', label: '收支日历', icon: 'calendar' },
    { key: 'month', label: '月度账单', icon: 'receipt' },
    { key: 'quarter', label: '季度账单', icon: 'layers' },
    { key: 'year', label: '年度账单', icon: 'bars' },
    { key: 'categories', label: '分类明细', icon: 'pie' },
    { key: 'transactions', label: '全部记录', icon: 'list' },
  ];
  const colors = ['#9774ed', '#65cfbb', '#ffbf88', '#ff8999', '#7f9def', '#a2d3df', '#f3ce6d', '#b1a8c7', '#e68ebf', '#78b6da', '#d6ad76', '#9bbd8a'];
  const money = (n, digits = 2) => '¥' + Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const monthLabel = (year, month) => `${year}年${month}月`;
  const periodLabel = () => state.kind === 'month' ? monthLabel(state.year, state.month) : state.kind === 'quarter' ? `${state.year}年第${state.quarter}季度` : `${state.year}年`;
  const currentPeriod = () => transactions.filter(tx => core.inPeriod(tx, state.kind, state.year, state.kind === 'month' ? state.month : state.quarter));
  const activeMonth = () => transactions.filter(tx => core.inPeriod(tx, 'month', state.year, state.month));
  const sorted = rows => [...rows].sort((a,b) => b.date.localeCompare(a.date) || b._index - a._index);
  const formatDate = iso => `${Number(iso.slice(5,7))}月${Number(iso.slice(8,10))}日`;
  const icon = (name, size = 20) => {
    const paths = {
      home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM8 8h8M8 12h8M8 16h5"/>',
      layers:'<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
      bars:'<path d="M4 20V11h4v9M10 20V5h4v15M16 20V9h4v11"/>',
      pie:'<path d="M12 3v9h9A9 9 0 1 1 12 3z"/><path d="M15 3a7 7 0 0 1 6 6h-6z"/>',
      list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h2M3 12h2M3 18h2"/>',
      search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
      chevron:'<path d="m9 18 6-6-6-6"/>',
      down:'<path d="m6 9 6 6 6-6"/>',
      wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M16 15h2M5 6V4a1 1 0 0 1 1-1h13"/>',
      income:'<path d="M12 20V4m-6 6 6-6 6 6M4 20h16"/>',
      expense:'<path d="M12 4v16m-6-6 6 6 6-6M4 4h16"/>',
      card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
      close:'<path d="M5 5l14 14M19 5 5 19"/>',
      filter:'<path d="M3 5h18M6 12h12M9 19h6"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.receipt}</svg>`;
  };

  function renderNav() {
    nav.innerHTML = navItems.map(item => `<button class="nav-item ${isActive(item.key) ? 'active' : ''}" type="button" data-nav="${item.key}">${icon(item.icon)}<span>${item.label}</span></button>`).join('');
    const mobile = [navItems[0], navItems[1], navItems[2], navItems[5], navItems[6]];
    mobileNav.innerHTML = mobile.map(item => `<button class="mobile-nav-item ${isActive(item.key) ? 'active' : ''}" type="button" data-nav="${item.key}">${icon(item.icon, 22)}<span>${item.key === 'calendar' ? '日历' : item.key === 'month' ? '账单' : item.key === 'categories' ? '分类' : item.key === 'transactions' ? '记录' : '总览'}</span></button>`).join('');
    document.getElementById('sidebar-date').textContent = formatDate(asOf);
    document.getElementById('search-icon').innerHTML = icon('search', 17);
  }
  function isActive(key) { return key === state.view || (state.view === 'report' && key === state.kind); }
  function setView(key) {
    if (['month', 'quarter', 'year'].includes(key)) { state.view = 'report'; state.kind = key; }
    else { state.view = key; if (key === 'overview' || key === 'calendar') state.kind = 'month'; }
    if (key === 'transactions') state.shown = 60;
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function shiftPeriod(delta) {
    if (state.kind === 'month') {
      const date = new Date(state.year, state.month - 1 + delta, 1);
      state.year = date.getFullYear(); state.month = date.getMonth() + 1;
      state.quarter = Math.floor((state.month - 1) / 3) + 1;
    } else if (state.kind === 'quarter') {
      const q = (state.year * 4 + state.quarter - 1) + delta;
      state.year = Math.floor(q / 4); state.quarter = q % 4 + 1;
      state.month = (state.quarter - 1) * 3 + 1;
    } else state.year += delta;
    state.selectedDay = core.iso(state.year, state.month, 1);
    render();
  }
  function header() {
    const active = state.view === 'report' ? state.kind : state.view === 'calendar' || state.view === 'overview' ? 'month' : null;
    const titles = { overview:'总览', calendar:'收支日历', report: state.kind === 'month' ? '月度账单' : state.kind === 'quarter' ? '季度账单' : '年度账单', categories:'分类明细', transactions:'全部记录' };
    document.getElementById('page-title').textContent = titles[state.view];
    document.getElementById('page-subtitle').textContent = `演示数据 · ${data.start_date} 起`;
    document.title = `${titles[state.view]} · 一页账（演示版）`;
    return active;
  }
  function periodControls(showTabs = true) {
    return `<div class="period-row">${showTabs ? `<div class="segmented" role="tablist" aria-label="账单周期">${[['month','月度'],['quarter','季度'],['year','年度']].map(([key,label]) => `<button type="button" role="tab" aria-selected="${state.kind === key}" class="${state.kind === key ? 'selected' : ''}" data-period="${key}">${label}</button>`).join('')}</div>` : '<div></div>'}<div class="period-picker"><button type="button" data-shift="-1" aria-label="上一个周期">${icon('chevron',18)}</button><strong>${periodLabel()}</strong><button type="button" data-shift="1" aria-label="下一个周期">${icon('chevron',18)}</button></div></div>`;
  }
  function metricCards(rows, periodText) {
    const totals = core.summarize(rows);
    const cards = [
      ['bank', icon('wallet'), '银行卡余额', data.calculated_current_balance, '截至 ' + formatDate(asOf)],
      ['income', icon('income'), `本${periodText}收入`, totals.income, '已记录收入'],
      ['expense', icon('expense'), `本${periodText}支出`, totals.expense, '已记录消费'],
      ['net', icon('bars'), `本${periodText}结余`, totals.net, '收入减消费'],
    ];
    return `<section class="metrics" aria-label="收支概览">${cards.map(([tone, symbol, label, value, note]) => `<div class="metric metric-${tone}"><div class="metric-top"><span class="metric-icon">${symbol}</span><span>${label}</span></div><strong class="metric-value ${value < 0 ? 'negative' : ''}">${money(value)}</strong><small>${note}</small></div>`).join('')}</section>`;
  }
  function categoryRows(rows) { return core.categories(rows, data.category_schema); }
  function categoryColor(name) { const index = data.category_schema.findIndex(group => group.category === name); return colors[Math.max(index, 0) % colors.length]; }
  function categoryDonut(rows) {
    const groups = categoryRows(rows).filter(g => g.amount > 0);
    const total = groups.reduce((sum, group) => sum + group.amount, 0);
    if (!total) return `<div class="empty-state">这个周期还没有消费记录</div>`;
    let cumulative = 0;
    const stops = groups.map(group => { const start = cumulative / total * 100; cumulative += group.amount; return `${categoryColor(group.name)} ${start}% ${cumulative / total * 100}%`; });
    return `<div class="donut-layout"><div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-hole"><small>合计支出</small><strong>${money(total)}</strong></div></div><div class="donut-legend">${groups.slice(0,6).map(group => `<button type="button" data-category-link="${safe(group.name)}"><span class="legend-dot" style="background:${categoryColor(group.name)}"></span><span>${safe(group.name)}</span><strong>${money(group.amount)}</strong><small>${(group.amount / total * 100).toFixed(1)}%</small></button>`).join('')}</div></div>`;
  }
  function calendar(rows = transactions, compact = false) {
    const cells = core.calendarDays(rows, state.year, state.month);
    const weekdays = ['一','二','三','四','五','六','日'];
    return `<div class="calendar"><div class="calendar-head">${weekdays.map(day => `<span>周${day}</span>`).join('')}</div><div class="calendar-grid">${cells.map(day => {
      const isFuture = day.date > asOf;
      const tone = !day.inMonth ? 'outside' : isFuture ? 'future' : day.expense >= 500 ? 'very-high' : day.expense >= 100 ? 'high' : day.expense >= 20 ? 'medium' : day.expense !== 0 ? 'low' : 'zero';
      return `<button type="button" class="calendar-day ${tone} ${day.date === state.selectedDay ? 'picked' : ''}" data-day="${day.date}" aria-label="${day.date}，支出${money(day.expense)}" ${!day.inMonth ? 'tabindex="-1"' : ''}><b>${day.day}</b><span>${day.inMonth && !isFuture && day.expense !== 0 ? money(day.expense, compact ? 0 : 2) : day.inMonth && !isFuture ? '—' : ''}</span></button>`;
    }).join('')}</div></div>`;
  }
  function lineChart(rows) {
    const points = core.trend(rows, state.kind, state.year, state.kind === 'month' ? state.month : state.quarter);
    const values = points.map(point => point.expense);
    const max = Math.max(1, ...values);
    const width = 720, height = 210, left = 42, top = 16, right = 16, bottom = 36;
    const plotW = width - left - right, plotH = height - top - bottom;
    const coords = values.map((value,i) => [left + (points.length === 1 ? 0 : i / (points.length - 1)) * plotW, top + plotH * (1 - value / max)]);
    const path = coords.map(([x,y],i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${path} L${coords.at(-1)[0].toFixed(1)},${top + plotH} L${left},${top + plotH} Z`;
    const labelEvery = points.length > 10 ? 5 : 1;
    return `<div class="chart-wrap"><svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${periodLabel()}支出趋势"><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a685f0" stop-opacity=".22"/><stop offset="1" stop-color="#a685f0" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(f => `<line x1="${left}" y1="${top + plotH * f}" x2="${width - right}" y2="${top + plotH * f}" stroke="#eceaf3"/><text x="${left - 9}" y="${top + plotH * f + 4}" text-anchor="end">${Math.round(max * (1-f))}</text>`).join('')}<path d="${area}" fill="url(#trend-fill)"/><path d="${path}" fill="none" stroke="#8b67df" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${coords.map(([x,y],i) => values[i] > 0 ? `<circle cx="${x}" cy="${y}" r="${points.length > 10 ? 3.5 : 5}" fill="#fff" stroke="#8b67df" stroke-width="2"/>` : '').join('')}${points.map((point,i) => i % labelEvery === 0 || i === points.length - 1 ? `<text x="${coords[i][0]}" y="${height - 8}" text-anchor="middle">${safe(point.label)}</text>` : '').join('')}</svg></div>`;
  }
  function categoryTree(rows, limit = Infinity) {
    const groups = categoryRows(rows).slice(0, limit);
    const total = core.summarize(rows).expense;
    if (!groups.length) return '<div class="empty-state">这个周期没有可展开的消费分类</div>';
    return `<div class="category-tree">${groups.map(group => {
      const isOpen = state.expanded.has(group.name);
      return `<div class="category-group"><button type="button" class="category-parent" data-expand="${safe(group.name)}" aria-expanded="${isOpen}"><span class="parent-left"><span class="parent-icon" style="color:${categoryColor(group.name)}">${icon('layers',18)}</span><strong>${safe(group.name)}</strong><small>${group.children.length} 个小类</small></span><span class="parent-right"><strong>${money(group.amount)}</strong><small>${total ? (group.amount / total * 100).toFixed(1) : 0}%</small>${icon(isOpen ? 'down' : 'chevron',16)}</span></button>${isOpen ? `<div class="category-children">${group.children.sort((a,b) => b.amount-a.amount).map(child => `<button type="button" class="category-child" data-subcategory="${safe(group.name)}|${safe(child.name)}"><span>└ &nbsp;${safe(child.name)}</span><span class="child-bar"><i style="width:${Math.max(2, Math.abs(child.amount / (group.amount || 1)) * 100)}%;background:${categoryColor(group.name)}"></i></span><strong>${money(child.amount)}</strong></button>`).join('')}</div>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function categoryBars(rows) {
    const groups = categoryRows(rows).filter(g => g.amount > 0).slice(0,7);
    const max = Math.max(1,...groups.map(g => g.amount));
    if (!groups.length) return '<div class="empty-state">这个周期还没有分类消费</div>';
    return `<div class="category-bars">${groups.map(group => `<button type="button" data-category-link="${safe(group.name)}" class="bar-row"><span>${safe(group.name)}</span><span class="bar-track"><i style="width:${group.amount/max*100}%;background:${categoryColor(group.name)}"></i></span><strong>${money(group.amount)}</strong></button>`).join('')}</div>`;
  }
  function transactionList(rows, limit = 8) {
    const selected = sorted(rows).slice(0,limit);
    if (!selected.length) return '<div class="empty-state">这个周期还没有记录</div>';
    return `<div class="transaction-list">${selected.map(tx => {
      const amount = tx.income != null ? Number(tx.income) : Number(tx.expense || 0);
      const positive = tx.income != null || amount < 0;
      const special = !core.isConsumption(tx);
      const sign = positive ? '+' : '−';
      return `<button class="transaction-row" type="button" data-transaction="${tx._index}"><span class="transaction-icon" style="color:${categoryColor(tx.category)};background:${categoryColor(tx.category)}20">${icon(tx.income != null ? 'income' : special ? 'card' : 'receipt',19)}</span><span class="transaction-info"><strong>${safe(tx.item)}</strong><small>${safe(tx.category)} · ${safe(tx.subcategory)} · ${safe(tx.payment_method || '余额')}</small></span><span class="transaction-end"><strong class="${positive ? 'positive' : special ? 'muted-money' : ''}">${sign}${money(Math.abs(amount))}</strong><small>${formatDate(tx.date)}</small></span></button>`;
    }).join('')}</div>`;
  }
  function sectionTitle(title, action = '') { return `<div class="section-heading"><h2>${title}</h2>${action}</div>`; }
  function overview() {
    state.kind = 'month';
    const rows = activeMonth();
    return `${periodControls()}${metricCards(rows, '月')}<div class="dashboard-grid"><section class="surface calendar-surface">${sectionTitle('收支日历', `<button class="text-link" data-nav="calendar">查看日历 ${icon('chevron',16)}</button>`)}${calendar(transactions)}</section><section class="surface donut-surface">${sectionTitle('分类构成', `<span class="section-context">${monthLabel(state.year,state.month)}</span>`)}${categoryDonut(rows)}</section><section class="surface trend-surface">${sectionTitle('支出趋势', `<span class="section-context">按日 · 元</span>`)}${lineChart(rows)}</section><section class="surface fixed-surface">${sectionTitle('固定收支与账户')}<div class="fixed-list">${data.recurring.map(item => `<div><span class="fixed-icon">${icon(item.income ? 'income':'receipt',18)}</span><span><strong>${safe(item.item)}</strong><small>每月 ${item.day} 日</small></span><b class="${item.income ? 'positive':''}">${item.income ? '+' : '−'}${money(item.income || item.expense)}</b></div>`).join('')}</div><div class="card-note">信用卡最近确认已用额度 ${money(data.credit_card.used_limit)} · ${safe(data.credit_card.as_of_date || '')} 核对</div></section><section class="surface category-surface">${sectionTitle('分类明细 <span class="heading-hint">一级类目 / 二级类目</span>', `<button class="text-link" data-nav="categories">全部分类 ${icon('chevron',16)}</button>`)}${categoryTree(rows,5)}</section><section class="surface recent-surface">${sectionTitle('最近记录', `<button class="text-link" data-nav="transactions">查看全部 ${icon('chevron',16)}</button>`)}${transactionList(rows,7)}</section></div>`;
  }
  function report() {
    const rows = currentPeriod();
    const periodText = state.kind === 'month' ? '月' : state.kind === 'quarter' ? '季' : '年';
    return `${periodControls()}<div class="scope-note">${periodLabel()} · 以下金额与交易均为虚构演示数据。</div>${metricCards(rows,periodText)}<div class="report-grid"><section class="surface report-trend">${sectionTitle('支出趋势', `<span class="section-context">${state.kind === 'month' ? '每日' : '每月'}支出</span>`)}${lineChart(rows)}</section><section class="surface report-bars">${sectionTitle('一级类目支出')}${categoryBars(rows)}</section>${state.kind === 'month' ? `<section class="surface report-calendar">${sectionTitle('本月日历')}${calendar(transactions,true)}</section>` : ''}<section class="surface report-categories">${sectionTitle('一级类目 / 二级类目', `<button class="text-link" data-nav="categories">查看分类页 ${icon('chevron',16)}</button>`)}${categoryTree(rows)}</section><section class="surface report-records">${sectionTitle('本周期明细', `<button class="text-link" data-nav="transactions">全部记录 ${icon('chevron',16)}</button>`)}${transactionList(rows,10)}</section></div>`;
  }
  function calendarPage() {
    state.kind = 'month';
    const rows = activeMonth();
    const dayRows = sorted(transactions.filter(tx => tx.date === state.selectedDay));
    return `${periodControls(false)}${metricCards(rows,'月')}<div class="calendar-page-grid"><section class="surface full-calendar">${sectionTitle(`${monthLabel(state.year,state.month)}收支日历`, '<span class="section-context">点击日期查看当日账目</span>')}${calendar(transactions)}</section><section class="surface day-panel">${sectionTitle(`${formatDate(state.selectedDay)}明细`, `<span class="section-context">支出 ${money(core.summarize(dayRows).expense)}</span>`)}${transactionList(dayRows,30)}</section></div>`;
  }
  function categoryPage() {
    const rows = currentPeriod();
    const mode = state.categoryMode;
    const totals = core.summarize(rows);
    let groups;
    if (mode === 'expense') groups = categoryRows(rows);
    else groups = data.category_schema.filter(g => g.category === '收入').map(g => ({ name:g.category, amount:totals.income, children:g.subcategories.map(name => ({name,amount:core.round(rows.filter(tx => tx.subcategory === name).reduce((sum,tx) => sum + core.income(tx),0))})).filter(x => x.amount) }));
    return `${periodControls()}<div class="scope-note">一级类目是消费方向，二级类目是其中的具体用途。</div><div class="category-page-grid"><section class="surface category-page-main">${sectionTitle('分类汇总', `<div class="mini-segmented"><button data-category-mode="expense" class="${mode === 'expense'?'selected':''}">支出</button><button data-category-mode="income" class="${mode === 'income'?'selected':''}">收入</button></div>`)}<div class="category-total"><span>本周期${mode === 'income' ? '收入' : '支出'}</span><strong>${money(mode === 'income' ? totals.income : totals.expense)}</strong></div>${mode === 'expense' ? categoryBars(rows) : ''}<div class="category-tree category-full">${groups.length ? groups.map(group => `<div class="category-group"><div class="category-parent static"><span class="parent-left"><span class="parent-icon" style="color:${categoryColor(group.name)}">${icon(mode === 'income' ? 'income' : 'layers',18)}</span><strong>${safe(group.name)}</strong><small>一级类目</small></span><span class="parent-right"><strong>${money(group.amount)}</strong></span></div><div class="category-children">${group.children.map(child => `<button class="category-child" type="button" data-subcategory="${safe(group.name)}|${safe(child.name)}"><span>└ &nbsp;${safe(child.name)} <em>二级类目</em></span><span class="child-bar"><i style="width:${Math.max(2,Math.abs(child.amount/(group.amount||1))*100)}%;background:${categoryColor(group.name)}"></i></span><strong>${money(child.amount)}</strong></button>`).join('')}</div></div>`).join('') : '<div class="empty-state">当前周期暂无分类记录</div>'}</div></section><aside class="surface category-schema">${sectionTitle('完整分类目录')}<p>当前账本共有 ${data.category_schema.length} 个一级类目。每笔记录均保留一级和二级分类。</p>${data.category_schema.map(group => `<details><summary>${safe(group.category)} <small>${group.subcategories.length} 个小类</small></summary><div>${group.subcategories.map(sub => `<span>${safe(sub)}</span>`).join('')}</div></details>`).join('')}</aside></div>`;
  }
  function transactionPage() {
    let rows = transactions;
    if (state.scope !== 'all') rows = rows.filter(tx => core.inPeriod(tx,state.scope,state.year,state.scope === 'month' ? state.month : state.quarter));
    if (state.payment !== 'all') rows = rows.filter(tx => tx.payment_method === state.payment);
    if (state.category !== 'all') rows = rows.filter(tx => tx.category === state.category || `${tx.category}|${tx.subcategory}` === state.category);
    if (state.query.trim()) { const q = state.query.trim().toLowerCase(); rows = rows.filter(tx => [tx.item,tx.category,tx.subcategory,tx.note,tx.payment_method].some(x => String(x||'').toLowerCase().includes(q))); }
    const totals = core.summarize(rows);
    return `<div class="records-summary"><div><span>筛选结果</span><strong>${rows.length} 笔</strong></div><div><span>收入</span><strong class="positive">${money(totals.income)}</strong></div><div><span>消费</span><strong>${money(totals.expense)}</strong></div></div><section class="surface records-surface"><div class="filter-row"><label class="search-field">${icon('search',18)}<input id="record-search" type="search" value="${safe(state.query)}" placeholder="搜索项目、分类或备注" autocomplete="off"></label><select id="scope-filter" aria-label="日期范围"><option value="all" ${state.scope==='all'?'selected':''}>全部日期</option><option value="month" ${state.scope==='month'?'selected':''}>当前选中月</option><option value="quarter" ${state.scope==='quarter'?'selected':''}>当前选中季</option><option value="year" ${state.scope==='year'?'selected':''}>当前选中年</option></select><select id="category-filter" aria-label="一级类目"><option value="all">全部类目</option>${data.category_schema.map(group => `<option value="${safe(group.category)}" ${state.category===group.category?'selected':''}>${safe(group.category)}</option>`).join('')}</select><select id="payment-filter" aria-label="付款方式"><option value="all">全部账户</option>${['余额','信用卡','微信'].map(method => `<option value="${method}" ${state.payment===method?'selected':''}>${method}</option>`).join('')}</select></div><div class="record-table-header"><span>项目 / 分类</span><span>日期</span><span>账户</span><span>金额</span></div><div class="record-table">${sorted(rows).slice(0,state.shown).map(tx => `<button class="record-row" type="button" data-transaction="${tx._index}"><span><strong>${safe(tx.item)}</strong><small>${safe(tx.category)} › ${safe(tx.subcategory)}${!core.isConsumption(tx) ? ' · 非消费' : ''}</small></span><span>${safe(tx.date)}</span><span>${safe(tx.payment_method || '余额')}</span><b class="${tx.income != null || (tx.expense||0)<0 ? 'positive':''}">${tx.income != null ? '+' : (tx.expense||0)<0 ? '+' : '−'}${money(Math.abs(tx.income ?? tx.expense ?? 0))}</b></button>`).join('')}</div>${rows.length > state.shown ? `<button class="more-button" type="button" id="show-more">显示更多（剩余 ${rows.length-state.shown} 笔）</button>` : ''}${rows.length===0 ? '<div class="empty-state">没有符合条件的记录</div>' : ''}</section>`;
  }
  function render() {
    const kind = header();
    renderNav();
    content.innerHTML = state.view === 'overview' ? overview() : state.view === 'calendar' ? calendarPage() : state.view === 'report' ? report() : state.view === 'categories' ? categoryPage() : transactionPage();
    if (kind) document.body.dataset.period = kind;
    document.body.dataset.view = state.view;
  }
  function openTransaction(index) {
    const tx = transactions[index]; if (!tx) return;
    const amount = tx.income != null ? tx.income : tx.expense;
    modal.innerHTML = `<div class="modal-backdrop" data-close="modal"><div class="detail-modal" role="dialog" aria-modal="true" aria-label="账目详情"><button class="modal-close" type="button" data-close="modal" aria-label="关闭">${icon('close')}</button><span class="detail-category">${safe(tx.category)} › ${safe(tx.subcategory)}</span><h2>${safe(tx.item)}</h2><strong class="detail-amount ${tx.income != null || amount < 0 ? 'positive':''}">${tx.income != null || amount < 0 ? '+' : '−'}${money(Math.abs(amount || 0))}</strong><dl><div><dt>日期</dt><dd>${safe(tx.date)}</dd></div><div><dt>支付账户</dt><dd>${safe(tx.payment_method || '余额')}</dd></div><div><dt>一级类目</dt><dd>${safe(tx.category)}</dd></div><div><dt>二级类目</dt><dd>${safe(tx.subcategory)}</dd></div>${tx.note ? `<div><dt>备注</dt><dd>${safe(tx.note)}</dd></div>` : ''}</dl></div></div>`;
    document.body.classList.add('modal-open');
  }
  function closeModal() { modal.innerHTML = ''; document.body.classList.remove('modal-open'); }

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a'); if (!target) return;
    if (target.dataset.nav) { setView(target.dataset.nav); return; }
    if (target.dataset.period) { state.kind=target.dataset.period; state.view='report'; render(); return; }
    if (target.dataset.shift) { shiftPeriod(Number(target.dataset.shift)); return; }
    if (target.dataset.day) { state.selectedDay = target.dataset.day; if (state.view !== 'calendar') state.view='calendar'; render(); return; }
    if (target.dataset.expand) { state.expanded.has(target.dataset.expand) ? state.expanded.delete(target.dataset.expand) : state.expanded.add(target.dataset.expand); render(); return; }
    if (target.dataset.categoryLink) { state.view='categories'; state.categoryMode='expense'; state.expanded.add(target.dataset.categoryLink); render(); return; }
    if (target.dataset.subcategory) { state.category=target.dataset.subcategory; state.scope=state.kind; state.view='transactions'; render(); return; }
    if (target.dataset.categoryMode) { state.categoryMode=target.dataset.categoryMode; render(); return; }
    if (target.dataset.transaction) { openTransaction(Number(target.dataset.transaction)); return; }
    if (target.dataset.close) { closeModal(); return; }
    if (target.id === 'show-more') { state.shown += 60; render(); return; }
    if (target.id === 'search-shortcut') { setView('transactions'); document.getElementById('record-search')?.focus(); }
  });
  modal.addEventListener('click', event => { if (event.target.classList.contains('modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key==='Escape') closeModal(); if ((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==='k') { event.preventDefault(); setView('transactions'); document.getElementById('record-search')?.focus(); } });
  document.addEventListener('input', event => { if (event.target.id === 'record-search') { const pos=event.target.selectionStart; state.query=event.target.value; render(); const field=document.getElementById('record-search'); field.focus(); field.setSelectionRange(pos,pos); } });
  document.addEventListener('change', event => { if (event.target.id==='scope-filter') state.scope=event.target.value; else if (event.target.id==='payment-filter') state.payment=event.target.value; else if (event.target.id==='category-filter') state.category=event.target.value; else return; render(); });
  render();
})();
