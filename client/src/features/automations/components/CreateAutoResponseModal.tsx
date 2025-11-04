import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Info } from 'lucide-react';
import type { AutoResponse, CreateAutoResponseRequest } from '../services/automationsService';

interface CreateAutoResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAutoResponseRequest) => Promise<void>;
  instanceId: string;
  editingAutoResponse?: AutoResponse | null;
}

export const CreateAutoResponseModal: React.FC<CreateAutoResponseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  instanceId,
  editingAutoResponse,
}) => {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [matchType, setMatchType] = useState<'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH'>('CONTAINS');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [response, setResponse] = useState('');
  const [useVariables, setUseVariables] = useState(true);
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingAutoResponse) {
      setName(editingAutoResponse.name);
      setKeywords(editingAutoResponse.keywords.length > 0 ? editingAutoResponse.keywords : ['']);
      setMatchType(editingAutoResponse.matchType);
      setCaseSensitive(editingAutoResponse.caseSensitive);
      setResponse(editingAutoResponse.response);
      setUseVariables(editingAutoResponse.useVariables);
      setActive(editingAutoResponse.active);
    } else {
      resetForm();
    }
  }, [editingAutoResponse, isOpen]);

  const resetForm = () => {
    setName('');
    setKeywords(['']);
    setMatchType('CONTAINS');
    setCaseSensitive(false);
    setResponse('');
    setUseVariables(true);
    setActive(true);
  };

  const handleAddKeyword = () => {
    setKeywords([...keywords, '']);
  };

  const handleRemoveKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filtrar keywords vazias
    const validKeywords = keywords.filter(k => k.trim() !== '');

    if (validKeywords.length === 0) {
      alert('Adicione pelo menos uma palavra-chave');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        instanceId,
        name,
        keywords: validKeywords,
        matchType,
        caseSensitive,
        response,
        useVariables,
        active,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to submit auto-response:', error);
      alert('Erro ao salvar auto-resposta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertVariable = (variable: string) => {
    setResponse(response + `{${variable}}`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {editingAutoResponse ? 'Editar Auto-Resposta' : 'Nova Auto-Resposta'}
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">Nome da Regra</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Ex: Saudação inicial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Palavras-chave */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">Palavras-chave</span>
              <button
                type="button"
                onClick={handleAddKeyword}
                className="btn btn-xs btn-primary"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </button>
            </label>
            <div className="space-y-2">
              {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="Ex: olá, oi, bom dia"
                    value={keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                  />
                  {keywords.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      className="btn btn-square btn-ghost btn-sm text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de Correspondência */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Tipo de Correspondência</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as any)}
              >
                <option value="CONTAINS">Contém</option>
                <option value="EXACT">Exato</option>
                <option value="STARTS_WITH">Começa com</option>
                <option value="ENDS_WITH">Termina com</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Opções</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                <span className="label-text">Case Sensitive</span>
              </label>
            </div>
          </div>

          {/* Resposta */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">Mensagem de Resposta</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32 w-full"
              placeholder="Digite a mensagem que será enviada..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              required
            />
          </div>

          {/* Variáveis */}
          <div className="form-control mb-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={useVariables}
                onChange={(e) => setUseVariables(e.target.checked)}
              />
              <span className="label-text">Habilitar variáveis</span>
            </label>

            {useVariables && (
              <div className="mt-3 p-4 bg-info/10 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-4 h-4 text-info mt-0.5" />
                  <span className="text-sm text-base-content/70">
                    Clique para inserir variáveis na mensagem:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertVariable('nome')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{nome}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('hora')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{hora}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('data')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{data}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('dia_semana')}
                    className="btn btn-xs btn-outline"
                  >
                    {'{dia_semana}'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="form-control mb-6">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span className="label-text font-medium">
                {active ? 'Ativa' : 'Inativa'}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Salvando...
                </>
              ) : (
                editingAutoResponse ? 'Atualizar' : 'Criar'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};
