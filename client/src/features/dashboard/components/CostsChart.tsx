import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CostData } from '../types/dashboard';

interface CostsChartProps {
  data: CostData[];
  loading: boolean;
}

export const CostsChart: React.FC<CostsChartProps> = ({ data, loading }) => {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--b1))',
                border: '1px solid hsl(var(--b3))',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="evolutionApi" 
              name="Evolution API"
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="storage" 
              name="Armazenamento"
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Total"
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ r: 5 }}
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
