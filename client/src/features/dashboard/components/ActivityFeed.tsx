import React from 'react';
import { ActivityLog } from '../types/dashboard';

interface ActivityFeedProps {
  activities: ActivityLog[];
  loading: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Atividades Recentes</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-base-100 p-6 rounded-xl border border-base-300">
        <h3 className="text-lg font-semibold mb-4 text-base-content">Atividades Recentes</h3>
        <div className="h-64 flex items-center justify-center text-base-content/50">
          <p>Nenhuma atividade recente</p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      case 'instance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'campaign':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-base-content';
    
    switch (status.toUpperCase()) {
      case 'DELIVERED':
      case 'READ':
        return 'text-success';
      case 'PENDING':
      case 'SENT':
        return 'text-warning';
      case 'FAILED':
      case 'ERROR':
        return 'text-error';
      default:
        return 'text-base-content';
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-xl border border-base-300">
      <h3 className="text-lg font-semibold mb-4 text-base-content">Atividades Recentes</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-base-content">
                {activity.description}
              </p>
              
              {activity.metadata?.content && (
                <p className="text-xs text-base-content/60 truncate mt-1">
                  {activity.metadata.content}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-base-content/50">
                  {formatTimestamp(activity.timestamp)}
                </span>
                
                {activity.metadata?.status && (
                  <span className={`text-xs font-medium ${getStatusColor(activity.metadata.status)}`}>
                    {activity.metadata.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
