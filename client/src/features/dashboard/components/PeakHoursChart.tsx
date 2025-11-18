import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PeakHoursChartProps {
  data: { hour: number; count: number }[];
  loading: boolean;
}

export const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data, loading }) => {
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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };
  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Horários de Pico</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Horários de Pico</h3>
        <div className="h-64 flex items-center justify-center text-base-content/50">
          <p>Nenhum dado disponível nos últimos 7 dias</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    hourLabel: formatHour(item.hour)
  }));

  return (
    <div className="bg-base-100 p-6 rounded-xl border border-base-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-base-content">Horários de Pico</h3>
        <span className="badge badge-primary">Últimos 7 dias</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={gridColor} 
            />
            <XAxis 
              dataKey="hourLabel" 
              tick={{ fontSize: 12, fill: textColor }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: textColor }}
              label={{ 
                value: 'Mensagens', 
                angle: -90, 
                position: 'insideLeft', 
                style: {  
                  textAnchor: 'middle', 
                  fill: textColor 
                } 
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                border: `1px solid ${gridColor}`,
                borderRadius: '0.5rem',
                color: textColor,
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.25)',
              }}
              labelStyle={{
                color: textColor,
                fontWeight: 'bold',
              }}
              formatter={(value: number) => [`${value} mensagens`, 'Total']}
            />
            <Bar 
              dataKey="count" 
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Hours Summary */}
      <div className="mt-4">
        <p className="text-xs text-base-content/60 mb-2">Top 5 Horários:</p>
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 5).map((item, index) => (
            <div key={item.hour} className="badge badge-outline gap-2">
              <span className="font-semibold">#{index + 1}</span>
              <span>{formatHour(item.hour)}</span>
              <span className="text-base-content font-medium">({item.count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
