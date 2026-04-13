const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const INVESTMENT_ADVICE_API_URL = `${API_BASE_URL}/api/investment-advice`;

import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PlusCircle, Trash2, Calendar, Tag, FileText, BarChart3, PieChart } from 'lucide-react';

// 도넛 차트 컴포넌트 (수입/지출 재사용)
function CategoryDonutChart({ data, colors, title, total }) {
  if (!data || data.length === 0 || total === 0) return null;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col items-center flex-1 min-w-[120px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="relative w-28 h-28 md:w-32 md:h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle r="15.91549430918954" cx="18" cy="18" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -accumulatedPercent;
            accumulatedPercent += percent;
            
            return (
              <circle
                key={item.label}
                r="15.91549430918954"
                cx="18"
                cy="18"
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth="4"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-[10px] text-gray-500">총</span>
           <span className="text-xs md:text-sm font-bold text-gray-800">
             {new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(total)}
           </span>
        </div>
      </div>
      <div className="mt-4 w-full space-y-1.5 px-2">
        {data.map((item, index) => (
          <div key={item.label} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
               <span className="text-gray-600 truncate max-w-[50px]" title={item.label}>{item.label}</span>
            </div>
            <span className="font-medium text-gray-800">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const INCOME_CATEGORIES = ['월급', '용돈', '금융수입'];
  const EXPENSE_CATEGORIES = ['식비', '생활', '교통'];

  // 초기 데이터 상태 (로컬 스토리지에서 불러오기)
  const [transactions, setTransactions] = useState(() => {
    const savedTransactions = localStorage.getItem('transactions');
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });
  
  // 거래 내역이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    type: 'expense', // 'income' 또는 'expense'
    date: new Date().toISOString().split('T')[0], // 오늘 날짜 기본값
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: ''
  });

  // 금액 수정 상태 관리
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  // 입력 폼 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 폼 제출 (추가 버튼) 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.date) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      type: formData.type,
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: parseInt(formData.amount, 10)
    };

    setTransactions(prev => [newTransaction, ...prev]); // 최신 내역이 위로 오도록 추가
    
    // 폼 초기화 (날짜와 타입은 유지)
    setFormData(prev => ({
      ...prev,
      category: prev.type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
      description: '',
      amount: ''
    }));
  };

  // 내역 삭제 핸들러
  const handleDelete = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // 금액 수정 모드 진입 핸들러
  const handleDoubleClickAmount = (id, currentAmount) => {
    setEditingId(id);
    setEditAmount(currentAmount);
  };

  // 금액 수정 저장 핸들러
  const handleSaveAmount = (id) => {
    const numAmount = Number(editAmount);
    
    if (editAmount === '' || isNaN(numAmount) || numAmount < 0) {
      alert('유효한 금액을 입력해주세요.');
      setEditingId(null);
      return;
    }
    
    // 금액이 0으로 수정된 경우 해당 내역 삭제
    if (numAmount === 0) {
      handleDelete(id);
      setEditingId(null);
      return;
    }
    
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, amount: parseInt(editAmount, 10) } : t
    ));
    setEditingId(null);
  };

  // 금액 수정 키보드 이벤트 핸들러 (엔터 저장, ESC 취소)
  const handleKeyDownAmount = (e, id) => {
    if (e.key === 'Enter') {
      handleSaveAmount(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // 잔액 및 총 수입/지출 계산
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense
    };
  }, [transactions]);

  // 월별 수입 및 지출 계산 (최근 6개월)
  const monthlyStats = useMemo(() => {
    const grouped = transactions.reduce((acc, t) => {
      const month = t.date.substring(0, 7); // YYYY-MM 형태로 추출
      if (!acc[month]) acc[month] = { income: 0, expense: 0, month };
      acc[month][t.type] += t.amount;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.month.localeCompare(a.month)) // 최신순으로 정렬
      .slice(0, 6); // 최대 6개월 데이터만 유지
  }, [transactions]);

  // 막대 그래프용 최대 금액 (비율 계산용)
  const maxMonthlyAmount = Math.max(
    ...monthlyStats.flatMap(m => [m.income, m.expense]),
    1
  );

  // 카테고리별 통계 계산 (도넛 차트용)
  const categoryStats = useMemo(() => {
    const stats = { income: {}, expense: {} };
    transactions.forEach(t => {
      stats[t.type][t.category] = (stats[t.type][t.category] || 0) + t.amount;
    });

    const formatData = (dataObj) => Object.entries(dataObj)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    return {
      income: formatData(stats.income),
      expense: formatData(stats.expense)
    };
  }, [transactions]);

  // 도넛 차트 색상 팔레트
  const incomeColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
  const expenseColors = ['#ef4444', '#f87171', '#fca5a5', '#fecaca'];

  // 금액 포맷팅 헬퍼 함수 (콤마 추가)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <header className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Wallet size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">내 지갑 관리</h1>
        </header>

        {/* 잔액 요약 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <p className="text-gray-500 text-sm font-medium mb-1">현재 잔액</p>
            <p className={`text-3xl font-bold ${balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">총 수입</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">총 지출</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* 통계 대시보드 영역 (막대 차트 & 도넛 차트) */}
        {(monthlyStats.length > 0 || transactions.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 월별 수입 및 지출 요약 (막대 차트) */}
            {monthlyStats.length > 0 ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-500" />
                  최근 6개월 월별 수입/지출
                </h2>
                {/* 범례 */}
                <div className="flex justify-end gap-3 text-xs mb-2">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>수입</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>지출</span>
                </div>
                <div className="flex items-end justify-between h-56 mt-2 gap-1 md:gap-2">
                  {/* 시계열(과거->최신)로 보여주기 위해 배열 순서를 뒤집습니다 */}
                  {[...monthlyStats].reverse().map(({ month, income, expense }) => {
                    const [year, m] = month.split('-');
                    const incomePercentage = (income / maxMonthlyAmount) * 100;
                    const expensePercentage = (expense / maxMonthlyAmount) * 100;
                    
                    return (
                      <div key={month} className="flex flex-col items-center flex-1 h-full justify-end group cursor-default">
                        {/* 상단 금액 표시 (축약형) - 호버 시 나타남 */}
                        <div className="flex flex-col items-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity min-h-[32px] justify-end">
                          {income > 0 && <div className="text-[10px] md:text-xs text-emerald-600 font-bold leading-tight">{new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(income)}</div>}
                          {expense > 0 && <div className="text-[10px] md:text-xs text-indigo-600 font-bold leading-tight">{new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(expense)}</div>}
                        </div>
                        {/* 세로 막대 그룹 */}
                        <div className="flex gap-0.5 md:gap-1 h-32 md:h-40 items-end w-full max-w-[4rem] justify-center">
                          {/* 수입 막대 */}
                          <div className="w-1/2 bg-gray-50 rounded-t-md flex items-end h-full relative">
                            <div
                              className="w-full bg-emerald-400 group-hover:bg-emerald-500 rounded-t-md transition-all duration-700 ease-out absolute bottom-0"
                              style={{ height: `${incomePercentage}%` }}
                            ></div>
                          </div>
                          {/* 지출 막대 */}
                          <div className="w-1/2 bg-gray-50 rounded-t-md flex items-end h-full relative">
                            <div
                              className="w-full bg-indigo-400 group-hover:bg-indigo-500 rounded-t-md transition-all duration-700 ease-out absolute bottom-0"
                              style={{ height: `${expensePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        {/* 하단 월(Month) 표시 */}
                        <div className="mt-3 text-[10px] md:text-xs font-medium text-gray-500 text-center whitespace-nowrap">
                          <span className="hidden sm:inline">{year.slice(2)}년 </span>{parseInt(m, 10)}월
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="hidden lg:block"></div>
            )}

            {/* 카테고리별 비율 요약 (도넛 차트) */}
            {transactions.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-pink-500" />
                  카테고리별 통계
                </h2>
                <div className="flex flex-wrap gap-4 justify-around mt-8">
                  {categoryStats.expense.length > 0 && (
                    <CategoryDonutChart 
                      data={categoryStats.expense} 
                      total={totalExpense} 
                      colors={expenseColors} 
                      title="지출 비율" 
                    />
                  )}
                  {categoryStats.income.length > 0 && (
                    <CategoryDonutChart 
                      data={categoryStats.income} 
                      total={totalIncome} 
                      colors={incomeColors} 
                      title="수입 비율" 
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 메인 콘텐츠 영역 (입력 폼 & 내역 리스트) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 입력 폼 */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PlusCircle size={20} className="text-blue-500"/>
              새 내역 추가
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 수입/지출 선택 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'expense' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: EXPENSE_CATEGORIES[0] }))}
                >
                  지출
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'income' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: INCOME_CATEGORIES[0] }))}
                >
                  수입
                </button>
              </div>

              {/* 날짜 입력 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">날짜</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* 카테고리 입력 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag size={16} className="text-gray-400" />
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                    required
                  >
                    {(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 내용(메모) 입력 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">내용 (선택)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="상세 내역 입력"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* 금액 입력 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">금액</label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="block w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">원</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                추가하기
              </button>
            </form>
          </div>

          {/* 내역 리스트 (테이블) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">거래 내역</h2>
            
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText size={48} className="mx-auto mb-3 opacity-20" />
                <p>기록된 내역이 없습니다.</p>
                <p className="text-sm mt-1">왼쪽 폼에서 새로운 내역을 추가해보세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                      <th className="pb-3 font-medium">날짜</th>
                      <th className="pb-3 font-medium">분류</th>
                      <th className="pb-3 font-medium">카테고리</th>
                      <th className="pb-3 font-medium">내용</th>
                      <th className="pb-3 font-medium text-right">금액</th>
                      <th className="pb-3 font-medium text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 text-sm text-gray-600 whitespace-nowrap">
                          {transaction.date}
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'income' ? '수입' : '지출'}
                          </span>
                        </td>
                        <td className="py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {transaction.category}
                        </td>
                        <td className="py-4 text-sm text-gray-500 max-w-[150px] truncate">
                          {transaction.description || '-'}
                        </td>
                        <td 
                          className={`py-4 text-sm font-bold text-right whitespace-nowrap cursor-pointer hover:bg-gray-100 ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                          onDoubleClick={() => handleDoubleClickAmount(transaction.id, transaction.amount)}
                          title="더블클릭하여 금액 수정"
                        >
                          {editingId === transaction.id ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              onBlur={() => handleSaveAmount(transaction.id)}
                              onKeyDown={(e) => handleKeyDownAmount(e, transaction.id)}
                              className="w-24 px-2 py-1 text-right text-gray-900 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              autoFocus
                            />
                          ) : (
                            <>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors inline-flex items-center justify-center p-1"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
