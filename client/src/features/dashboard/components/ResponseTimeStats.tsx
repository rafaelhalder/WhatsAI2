import React from 'react';

interface ResponseTimeStatsProps {
  stats: {
    average: number;
    median: number;
    min: number;
    max: number;
  } | null;
  loading: boolean;
}

export const ResponseTimeStats: React.FC<ResponseTimeStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Tempo de Resposta</h3>
        <div className="h-40 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!stats || stats.average === 0) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Tempo de Resposta</h3>
        <div className="h-40 flex items-center justify-center text-base-content/50">
          <p>Dados insuficientes para análise</p>
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getScoreColor = (minutes: number) => {
    if (minutes <= 5) return 'badge-success';
    if (minutes <= 15) return 'badge-warning';
    return 'badge-error';
  };

  const getScoreText = (minutes: number) => {
    if (minutes <= 5) return 'Excelente';
    if (minutes <= 15) return 'Bom';
    if (minutes <= 60) return 'Regular';
    return 'Precisa melhorar';
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl border border-base-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-base-content">Tempo de Resposta</h3>
        <span className={`badge ${getScoreColor(stats.average)}`}>
          {getScoreText(stats.average)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-base-200 rounded-lg">
          <p className="text-xs text-base-content/60 mb-1">Média</p>
          <p className="text-2xl font-bold text-primary">
            {formatTime(stats.average)}
          </p>
        </div>
        
        <div className="text-center p-4 bg-base-200 rounded-lg">
          <p className="text-xs text-base-content/60 mb-1">Mediana</p>
          <p className="text-2xl font-bold text-secondary">
            {formatTime(stats.median)}
          </p>
        </div>
        
        <div className="text-center p-4 bg-base-200 rounded-lg">
          <p className="text-xs text-base-content/60 mb-1">Mínimo</p>
          <p className="text-lg font-semibold text-success">
            {formatTime(stats.min)}
          </p>
        </div>
        
        <div className="text-center p-4 bg-base-200 rounded-lg">
          <p className="text-xs text-base-content/60 mb-1">Máximo</p>
          <p className="text-lg font-semibold text-error">
            {formatTime(stats.max)}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-info/10 rounded-lg">
        <p className="text-xs text-info">
          <strong>💡 Dica:</strong> {stats.average <= 5 
            ? 'Seu tempo de resposta está excelente! Continue assim.' 
            : stats.average <= 15
            ? 'Bom tempo de resposta. Tente manter abaixo de 5 minutos para melhorar a experiência.'
            : 'Considere usar auto-respostas para reduzir o tempo de espera dos clientes.'}
        </p>
      </div>
    </div>
  );
};
