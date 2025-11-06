import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE';
  phoneNumber?: string;
  createdAt: string;
}

interface InstancesListProps {
  instances: Instance[];
  loading?: boolean;
}

export const InstancesList: React.FC<InstancesListProps> = ({
  instances,
  loading = false
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'CONNECTED':
        return <Wifi className="w-5 h-5 text-success" />;
      case 'DISCONNECTED':
      case 'QRCODE':
        return <WifiOff className="w-5 h-5 text-error" />;
      case 'CONNECTING':
        return <RefreshCw className="w-5 h-5 text-warning animate-spin" />;
      default:
        return <Wifi className="w-5 h-5 text-base-content/50" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'CONNECTED':
        return <span className="badge badge-success badge-sm">Online</span>;
      case 'DISCONNECTED':
        return <span className="badge badge-error badge-sm">Offline</span>;
      case 'CONNECTING':
        return <span className="badge badge-warning badge-sm">Conectando</span>;
      case 'QRCODE':
        return <span className="badge badge-info badge-sm">Aguardando QR</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
    }
  };

  const normalizeStatus = (status: string): 'online' | 'offline' => {
    return status.toUpperCase() === 'CONNECTED' ? 'online' : 'offline';
  };

  const filteredInstances = instances.filter((instance) => {
    if (filterStatus === 'all') return true;
    return normalizeStatus(instance.status) === filterStatus;
  });

  const stats = {
    total: instances.length,
    online: instances.filter((i) => i.status.toUpperCase() === 'CONNECTED').length,
    offline: instances.filter((i) => i.status.toUpperCase() !== 'CONNECTED').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-tour="instances-list">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-semibold text-base-content hover:text-primary transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
          <span>
            {stats.total} Instância{stats.total !== 1 ? 's' : ''}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-sm text-base-content/70">{stats.online}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-error"></div>
            <span className="text-sm text-base-content/70">{stats.offline}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filter Tabs */}
          <div className="tabs tabs-boxed bg-base-200">
            <button
              className={`tab ${filterStatus === 'all' ? 'tab-active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Todas ({stats.total})
            </button>
            <button
              className={`tab ${filterStatus === 'online' ? 'tab-active' : ''}`}
              onClick={() => setFilterStatus('online')}
            >
              Online ({stats.online})
            </button>
            <button
              className={`tab ${filterStatus === 'offline' ? 'tab-active' : ''}`}
              onClick={() => setFilterStatus('offline')}
            >
              Offline ({stats.offline})
            </button>
          </div>

          {/* Instances List */}
          <div className="space-y-2">
            {filteredInstances.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <WifiOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>
                  {filterStatus === 'all'
                    ? 'Nenhuma instância encontrada'
                    : `Nenhuma instância ${filterStatus === 'online' ? 'online' : 'offline'}`}
                </p>
              </div>
            ) : (
              filteredInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(instance.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base-content truncate">
                        {instance.name}
                      </div>
                      {instance.phoneNumber && (
                        <div className="text-sm text-base-content/60">
                          {instance.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(instance.status)}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {instances.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-base-content/50">
          <WifiOff className="w-16 h-16 mb-3" />
          <p className="font-medium">Nenhuma instância encontrada</p>
          <p className="text-sm mt-1">Crie sua primeira instância para começar</p>
        </div>
      )}
    </div>
  );
};
