// This file contains fictional sample data for the public demo only.
(() => {
  const category_schema = [
    { category: '餐饮', subcategories: ['早餐', '午餐', '晚餐', '买菜', '水果'] },
    { category: '零食', subcategories: ['饮料', '零食'] },
    { category: '房租', subcategories: ['房租'] },
    { category: '水电', subcategories: ['水费', '电费'] },
    { category: '网费', subcategories: ['手机话费'] },
    { category: '交通', subcategories: ['公交地铁', '骑行'] },
    { category: '购物', subcategories: ['生活用品', '数码配件'] },
    { category: '娱乐', subcategories: ['电影', '游戏'] },
    { category: '健康', subcategories: ['医疗用品'] },
    { category: '收入', subcategories: ['工资', '其他收入'] },
  ];

  // A made-up household budget, spread across months so all report views have examples.
  const sample = [
    [1, '餐饮', '早餐', '早餐', 12, '余额'],
    [2, '房租', '房租', '房租', 1950, '余额'],
    [4, '餐饮', '午餐', '工作日午餐', 28, '余额'],
    [5, '交通', '公交地铁', '地铁', 46, '余额'],
    [7, '购物', '生活用品', '清洁用品', 68, '信用卡'],
    [9, '水电', '电费', '电费', 96, '余额'],
    [10, '收入', '工资', '工资', 6200, '余额'],
    [11, '餐饮', '早餐', '周末早餐', 20, '余额'],
    [12, '餐饮', '晚餐', '晚餐', 55, '余额'],
    [14, '水电', '水费', '水费', 32, '余额'],
    [15, '餐饮', '水果', '水果', 34, '余额'],
    [16, '零食', '饮料', '咖啡', 19, '余额'],
    [18, '餐饮', '买菜', '买菜', 74, '余额'],
    [19, '购物', '数码配件', '电脑配件', 118, '信用卡'],
    [20, '网费', '手机话费', '手机话费', 59, '余额'],
    [22, '收入', '其他收入', '兼职收入', 360, '余额'],
    [23, '娱乐', '游戏', '游戏', 24, '余额'],
    [25, '餐饮', '晚餐', '朋友聚餐', 88, '余额'],
    [27, '交通', '骑行', '共享单车', 3, '余额'],
    [28, '餐饮', '买菜', '周末买菜', 63, '余额'],
  ];

  const as_of_date = '2026-07-20';
  const transactions = [];
  for (let month = 1; month <= 7; month++) {
    for (const [day, category, subcategory, item, base, payment_method] of sample) {
      const date = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (date > as_of_date) continue;
      const income = category === '收入';
      const amount = income || category === '房租' ? base : base + ((month * 7 + day) % 9);
      transactions.push({
        id: `demo-${date}-${subcategory}`,
        date, category, subcategory, item,
        income: income ? amount : null,
        expense: income ? null : amount,
        payment_method,
        note: '虚构演示记录',
      });
    }
  }

  const card_used = transactions.reduce((sum, entry) =>
    sum + (entry.payment_method === '信用卡' ? entry.expense || 0 : 0), 0);
  const bank_balance = 3000 + transactions.reduce((sum, entry) =>
    sum + (entry.payment_method === '余额' ? (entry.income || 0) - (entry.expense || 0) : 0), 0);

  window.LEDGER_DATA = {
    demo: true,
    start_date: '2026-01-01',
    as_of_date,
    calculated_current_balance: bank_balance,
    credit_card_new_spending: card_used,
    credit_card: {
      as_of_date,
      total_limit: 12000,
      available_limit: 12000 - card_used,
      used_limit: card_used,
    },
    bills: [],
    recurring: [
      { day: 2, item: '房租', income: null, expense: 1950 },
      { day: 10, item: '工资', income: 6200, expense: null },
      { day: 22, item: '兼职收入', income: 360, expense: null },
    ],
    category_schema,
    transactions,
  };
})();
