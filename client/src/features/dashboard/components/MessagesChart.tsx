import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MessageChartData } from '../types/dashboard';

interface MessagesChartProps {
  data: MessageChartData[];
  loading?: boolean;
}

export const MessagesChart: React.FC<MessagesChartProps> = ({ data, loading = false }) => {
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

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6">
        <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Mensagens nos Últimos 7 Dias
        </h3>
        <div className="flex items-center justify-center h-64 text-base-content/50">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6">
      <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Mensagens nos Últimos 7 Dias
      </h3>

      <div className="h-64 w-full min-h-[256px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fill: textColor, fontSize: 12 }}
            />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                borderRadius: '6px',
                color: textColor
              }}
              labelStyle={{ color: textColor }}
              labelFormatter={(value) => `Data: ${formatDateShort(value)}`}
              formatter={(value: number, name: string) => {
                const labels = {
                  messages: 'Total',
                  delivered: 'Entregues',
                  failed: 'Falhas'
                };
                return [value, labels[name as keyof typeof labels] || name];
              }}
            />
            <Legend wrapperStyle={{ color: textColor }} />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="delivered"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
              name="Entregues"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#ef4444", strokeWidth: 2 }}
              name="Falhas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};