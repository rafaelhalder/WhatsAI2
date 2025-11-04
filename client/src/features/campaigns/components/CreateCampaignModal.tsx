import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Campaign, CreateCampaignRequest } from '../types/campaigns';
import { campaignsService } from '../services/campaignsService';
import { templatesService } from '../../templates/services/templatesService';
import { Template } from '../../templates/types/templates';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
  editCampaign?: Campaign | null;
  instances: Array<{ id: string; name: string }>;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editCampaign,
  instances
}) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [recipients, setRecipients] = useState<Array<{ phoneNumber: string; variables: Record<string, string> }>>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  const isEditMode = !!editCampaign;

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editCampaign) {
      setName(editCampaign.name);
      setTemplateId(editCampaign.templateId);
      setInstanceId(editCampaign.instanceId);
      setRecipients(editCampaign.recipients.map(r => ({ 
        phoneNumber: r.phoneNumber, 
        variables: r.variables || {}
      })));
    } else {
      resetForm();
    }
  }, [editCampaign, isOpen]);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const data = await templatesService.getTemplates(token);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setMessage('');
    setTemplateId('');
    setInstanceId('');
    setScheduledFor('');
    setRecipients([]);
    setRecipientInput('');
    setError(null);
    setStep(1);
  };

  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    if (newTemplateId) {
      const selectedTemplate = templates.find(t => t.id === newTemplateId);
      if (selectedTemplate) {
        setMessage(selectedTemplate.content);
        // Extract variables from template
        const variables = templatesService.extractVariables(selectedTemplate.content);
        setTemplateVariables(variables);
      }
    } else {
      setMessage('');
      setTemplateVariables([]);
    }
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^55\d{10,11}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const addRecipient = () => {
    if (!recipientInput.trim()) return;

    const lines = recipientInput.split('\n').filter(line => line.trim());
    const newRecipients: Array<{ phoneNumber: string; variables: Record<string, string> }> = [];
    const errors: string[] = [];

    // Detecta variáveis da mensagem atual
    const messageVars = templatesService.extractVariables(message);

    lines.forEach((line, index) => {
      const parts = line.split(',').map(s => s.trim());
      const phoneNumber = parts[0];
      const cleanPhone = phoneNumber.replace(/\D/g, '');

      if (!validatePhone(cleanPhone)) {
        errors.push(`Linha ${index + 1}: número inválido`);
      } else {
        // Mapeia as partes para as variáveis
        const variables: Record<string, string> = {};
        
        // Se tiver variáveis no template, mapeia em ordem
        messageVars.forEach((varName, idx) => {
          if (parts[idx + 1]) {
            variables[varName] = parts[idx + 1];
          }
        });

        newRecipients.push({ phoneNumber: cleanPhone, variables });
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    if (newRecipients.length + recipients.length > 1000) {
      setError('Limite de 1000 destinatários');
      return;
    }

    setRecipients([...recipients, ...newRecipients]);
    setRecipientInput('');
    setError(null);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const canGoNext = () => {
    if (step === 1) return name.trim() && message.trim();
    if (step === 2) return instanceId && recipients.length > 0;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');

      const campaignData: CreateCampaignRequest = {
        name: name.trim(),
        message: message.trim(),
        templateId: templateId || undefined,
        instanceId,
        scheduledFor: scheduledFor || undefined,
        recipients: recipients.map(r => ({
          phone: r.phoneNumber,
          variables: Object.keys(r.variables).length > 0 ? r.variables : undefined
        }))
      };

      let result: Campaign;
      if (isEditMode && editCampaign) {
        result = await campaignsService.updateCampaign(token, editCampaign.id, {
          name: campaignData.name,
          description: undefined
        });
      } else {
        result = await campaignsService.createCampaign(token, campaignData);
      }

      onSuccess(result);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            {isEditMode ? 'Editar Campanha' : 'Nova Campanha'}
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost" disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {!isEditMode && (
          <div className="flex items-center justify-center mb-8 gap-2">
            <div className={'flex items-center justify-center w-8 h-8 rounded-full ' + (step >= 1 ? 'bg-primary text-primary-content' : 'bg-base-300')}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <div className={'h-1 w-12 ' + (step >= 2 ? 'bg-primary' : 'bg-base-300')}></div>
            <div className={'flex items-center justify-center w-8 h-8 rounded-full ' + (step >= 2 ? 'bg-primary text-primary-content' : 'bg-base-300')}>
              {step > 2 ? <Check size={16} /> : '2'}
            </div>
            <div className={'h-1 w-12 ' + (step >= 3 ? 'bg-primary' : 'bg-base-300')}></div>
            <div className={'flex items-center justify-center w-8 h-8 rounded-full ' + (step >= 3 ? 'bg-primary text-primary-content' : 'bg-base-300')}>
              {step > 3 ? <Check size={16} /> : '3'}
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Nome da campanha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />

            <select
              className="select select-bordered w-full"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={loading || isEditMode}
            >
              <option value="">Sem template (digitar mensagem)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <div>
              <textarea
                className="textarea textarea-bordered w-full h-32"
                placeholder="Mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                maxLength={4096}
              />
              <div className="text-xs text-base-content/60 text-right mt-1">{message.length}/4096</div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Agendamento (opcional)</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                disabled={loading}
                min={new Date().toISOString().slice(0, 16)}
              />
              <div className="text-xs text-base-content/60 mt-1">
                Deixe em branco para iniciar manualmente
              </div>
            </div>
          </div>
        )}

        {step === 2 && !isEditMode && (
          <div className="space-y-4">
            <select
              className="select select-bordered w-full"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione a instância</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name}
                </option>
              ))}
            </select>

            {/* Info sobre variáveis */}
            {templateVariables.length > 0 && (
              <div className="text-xs bg-info/10 p-2 rounded">
                <strong>Variáveis detectadas:</strong> {templateVariables.join(', ')}
                <br />
                <strong>Formato:</strong> telefone,{templateVariables.join(',')}
                <br />
                <strong>Exemplo:</strong> 5511999999999,{templateVariables.map(v => `valor_${v}`).join(',')}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                className="textarea textarea-bordered flex-1 h-24"
                placeholder={
                  templateVariables.length > 0
                    ? `5511999999999,${templateVariables.join(',')}`
                    : "5511999999999"
                }
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={addRecipient}
                className="btn btn-primary btn-square"
                disabled={loading || !recipientInput.trim()}
              >
                <Plus size={20} />
              </button>
            </div>

            {recipients.length > 0 && (
              <div className="bg-base-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold mb-2">{recipients.length} destinatários</div>
                <div className="space-y-1">
                  {recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center justify-between bg-base-100 rounded px-2 py-1 text-sm">
                      <span>
                        {recipient.phoneNumber}
                        {Object.keys(recipient.variables).length > 0 && (
                          <span className="text-xs text-base-content/60 ml-2">
                            ({Object.values(recipient.variables).join(', ')})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(index)}
                        className="btn btn-xs btn-ghost text-error"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && !isEditMode && (
          <div className="space-y-4">
            <div className="bg-base-200 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-xs text-base-content/60">Campanha</div>
                <div className="font-semibold">{name}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Instância</div>
                <div>{instances.find(i => i.id === instanceId)?.name}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Destinatários</div>
                <div>{recipients.length} contatos</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60">Mensagem</div>
                <div className="text-sm bg-base-100 p-2 rounded max-h-32 overflow-y-auto">{message}</div>
              </div>
            </div>
          </div>
        )}

        {isEditMode && (
          <div className="space-y-4">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Nome da campanha"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {step > 1 && !isEditMode && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn btn-ghost"
              disabled={loading}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          )}
          
          <div className="flex-1"></div>

          {!isEditMode && step < 3 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn btn-primary"
              disabled={loading || !canGoNext()}
            >
              Avançar
              <ArrowRight size={18} />
            </button>
          )}

          {(isEditMode || step === 3) && (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : (isEditMode ? 'Salvar' : 'Criar')}
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};
