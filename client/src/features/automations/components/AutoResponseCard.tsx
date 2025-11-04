import React from 'react';
import { Power, Edit2, Trash2, Calendar, Hash } from 'lucide-react';
import type { AutoResponse } from '../services/automationsService';

interface AutoResponseCardProps {
  autoResponse: AutoResponse;
  onEdit: (autoResponse: AutoResponse) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const AutoResponseCard: React.FC<AutoResponseCardProps> = ({
  autoResponse,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const matchTypeLabels = {
    CONTAINS: 'Contém',
    EXACT: 'Exato',
    STARTS_WITH: 'Começa com',
    ENDS_WITH: 'Termina com',
  };

  const lastTriggered = autoResponse.lastTriggeredAt
    ? new Date(autoResponse.lastTriggeredAt).toLocaleString('pt-BR')
    : 'Nunca';

  return (
    <div className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow ${!autoResponse.active ? 'opacity-60' : ''}`}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="card-title text-lg">
              {autoResponse.name}
              {autoResponse.active ? (
                <span className="badge badge-success badge-sm">Ativa</span>
              ) : (
                <span className="badge badge-ghost badge-sm">Inativa</span>
              )}
            </h3>
            <p className="text-sm text-base-content/70 mt-1">
              {autoResponse.instance.name}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onToggle(autoResponse.id)}
              className={`btn btn-sm btn-circle ${autoResponse.active ? 'btn-success' : 'btn-ghost'}`}
              title={autoResponse.active ? 'Desativar' : 'Ativar'}
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(autoResponse)}
              className="btn btn-sm btn-circle btn-ghost"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(autoResponse.id)}
              className="btn btn-sm btn-circle btn-ghost text-error hover:bg-error hover:text-error-content"
              title="Deletar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keywords */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-base-content/50" />
            <span className="text-sm font-medium text-base-content/70">
              Palavras-chave ({matchTypeLabels[autoResponse.matchType]})
              {autoResponse.caseSensitive && ' - Case Sensitive'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoResponse.keywords.map((keyword, index) => (
              <span key={index} className="badge badge-primary badge-outline">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Response Preview */}
        <div className="mt-3">
          <p className="text-sm font-medium text-base-content/70 mb-1">Resposta:</p>
          <p className="text-sm bg-base-200 rounded-lg p-3 whitespace-pre-wrap">
            {autoResponse.response.length > 150
              ? autoResponse.response.substring(0, 150) + '...'
              : autoResponse.response}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-between text-sm text-base-content/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Último acionamento: {lastTriggered}</span>
          </div>
          <div className="badge badge-ghost">
            {autoResponse.triggerCount} {autoResponse.triggerCount === 1 ? 'vez' : 'vezes'}
          </div>
        </div>

        {/* Variables indicator */}
        {autoResponse.useVariables && (
          <div className="mt-2">
            <div className="badge badge-sm badge-info badge-outline">
              Variáveis habilitadas
            </div>
          </div>
        )}

        {/* Media indicator */}
        {autoResponse.mediaUrl && (
          <div className="mt-2">
            <div className="badge badge-sm badge-secondary badge-outline">
              Com mídia ({autoResponse.mediaType})
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
