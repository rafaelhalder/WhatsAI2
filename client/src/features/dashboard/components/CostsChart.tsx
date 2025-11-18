import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CostData } from '../types/dashboard';

interface CostsChartProps {
  data: CostData[];
  loading: boolean;
}

export const CostsChart: React.FC<CostsChartProps> = ({ data, loading }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Detectar se está em dark mode
    const checkDarkMode = () => {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme')?.includes('dark') || 
                    html.classList.contains('dark') ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkDarkMode();
    
    // Observer para mudanças de tema
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme', 'class'] 
    });

    return () => observer.disconnect();
  }, []);

  // Cores baseadas no tema
  const textColor = isDarkMode ? '#d1d5db' : '#374151';
  const gridColor = isDarkMode ? '#4b5563' : '#e5e7eb';

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Custos Mensais</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Custos Mensais</h3>
        <div className="h-64 flex items-center justify-center text-base-content/50">
          <p>Nenhum dado de custo disponível</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    monthLabel: formatMonth(item.month)
  }));

  return (
    <div className="bg-base-100 p-6 rounded-xl border border-base-300">
      <h3 className="text-lg font-semibold mb-4 text-base-content">Custos Mensais</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor}
            />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fill: textColor, fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: textColor, fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                borderRadius: '6px',
                color: textColor
              }}
              labelStyle={{ color: textColor }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ color: textColor }} />
            <Line 
              type="monotone" 
              dataKey="evolutionApi" 
              name="Evolution API"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="storage" 
              name="Armazenamento"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Total"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: "#f59e0b", r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-base-content/60">Último Mês</p>
          <p className="text-lg font-semibold text-base-content">
            {formatCurrency(data[data.length - 1]?.total || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-base-content/60">Média</p>
          <p className="text-lg font-semibold text-base-content">
            {formatCurrency(data.reduce((sum, d) => sum + d.total, 0) / data.length)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-base-content/60">Total (6 meses)</p>
          <p className="text-lg font-semibold text-base-content">
            {formatCurrency(data.reduce((sum, d) => sum + d.total, 0))}
          </p>
        </div>
      </div>
    </div>
  );
};
