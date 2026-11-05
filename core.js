(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LedgerCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const pad = value => String(value).padStart(2, '0');
  const iso = (year, month, day = 1) => `${year}-${pad(month)}-${pad(day)}`;
  const isTransfer = tx => tx.entry_type === 'internal_transfer';
  const isRepayment = tx => tx.entry_type === 'credit_card_repayment';
  const isConsumption = tx => !isTransfer(tx) && !isRepayment(tx);
  const expense = tx => isConsumption(tx) ? Number(tx.expense || 0) : 0;
  const income = tx => !isTransfer(tx) ? Number(tx.income || 0) : 0;

  function periodBounds(kind, year, number) {
    let startMonth = 1;
    let endMonth = 13;
    if (kind === 'month') { startMonth = number; endMonth = number + 1; }
    if (kind === 'quarter') { startMonth = 1 + (number - 1) * 3; endMonth = startMonth + 3; }
    const endYear = endMonth > 12 ? year + 1 : year;
    const normalizedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;
    return { start: iso(year, startMonth), end: iso(endYear, normalizedEndMonth) };
  }

  function inPeriod(tx, kind, year, number) {
    const { start, end } = periodBounds(kind, year, number);
    return tx.date >= start && tx.date < end;
  }

  function summarize(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    let bankExpense = 0;
    let cardExpense = 0;
    for (const tx of transactions) {
      const amount = expense(tx);
      totalIncome += income(tx);
      totalExpense += amount;
      if (tx.payment_method === '余额') bankExpense += amount;
      if (tx.payment_method === '信用卡') cardExpense += amount;
    }
    return {
      income: round(totalIncome),
      expense: round(totalExpense),
      net: round(totalIncome - totalExpense),
      bankExpense: round(bankExpense),
      cardExpense: round(cardExpense),
    };
  }

  function categories(transactions, schema) {
    return schema.filter(group => group.category !== '收入').map(group => {
      const children = group.subcategories.map(name => ({
        name,
        amount: round(transactions.filter(tx => tx.category === group.category && tx.subcategory === name).reduce((sum, tx) => sum + expense(tx), 0)),
      })).filter(child => child.amount !== 0);
      return { name: group.category, amount: round(children.reduce((sum, child) => sum + child.amount, 0)), children };
    }).filter(group => group.amount !== 0).sort((a, b) => b.amount - a.amount);
  }

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
  function calendarDays(transactions, year, month) {
    const first = new Date(year, month - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = daysInMonth(year, month);
    const gridSize = Math.ceil((offset + count) / 7) * 7;
    const result = [];
    for (let cell = 0; cell < gridSize; cell++) {
      const date = new Date(year, month - 1, cell - offset + 1);
      const day = iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const today = transactions.filter(tx => tx.date === day);
      result.push({ date: day, day: date.getDate(), inMonth: date.getMonth() + 1 === month, ...summarize(today), transactions: today });
    }
    return result;
  }

  function trend(transactions, kind, year, number) {
    if (kind === 'month') return Array.from({ length: daysInMonth(year, number) }, (_, i) => {
      const date = iso(year, number, i + 1);
      return { label: String(i + 1), date, ...summarize(transactions.filter(tx => tx.date === date)) };
    });
    const start = kind === 'quarter' ? 1 + (number - 1) * 3 : 1;
    const length = kind === 'quarter' ? 3 : 12;
    return Array.from({ length }, (_, i) => {
      const month = start + i;
      return { label: `${month}月`, date: iso(year, month), ...summarize(transactions.filter(tx => inPeriod(tx, 'month', year, month))) };
    });
  }

  return { round, iso, isConsumption, expense, income, periodBounds, inPeriod, summarize, categories, calendarDays, trend };
});
