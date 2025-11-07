import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { templatesService } from '../services/templatesService';
import { Template, TEMPLATE_CATEGORIES } from '../types/templates';
import { userAuthStore } from '../../auth/store/authStore';
import { TemplateCard } from '../components/TemplateCard';
import { CreateTemplateModal } from '../components/CreateTemplateModal';
import { UpgradeModal } from '../../plans/components/UpgradeModal';
import { plansService } from '../../plans/services/plansService';
import { PlanType } from '../../plans/types/plans';

export const TemplatesPage: React.FC = () => {
  const { token } = userAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'favorites' | 'regular'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('FREE');
  const [currentUsage, setCurrentUsage] = useState(0);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    loadTemplates();
    loadPlanInfo();
  }, [token]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter, favoriteFilter]);

  const loadTemplates = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await templatesService.getTemplates(token);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanInfo = async () => {
    if (!token) return;

    try {
      const [planData, usageData] = await Promise.all([
        plansService.getCurrentPlan(token),
        plansService.getUsage(token)
      ]);
      setCurrentPlan(planData.plan);
      setCurrentUsage(usageData.usage.templates.current);
      setLimit(usageData.usage.templates.limit);
    } catch (error) {
      console.error('Error loading plan info:', error);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.content.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Favorite filter
    if (favoriteFilter !== 'all') {
      filtered = filtered.filter((t) =>
        favoriteFilter === 'favorites' ? t.isFavorite : !t.isFavorite
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateClick = async () => {
    if (!token) return;

    // Check if user can create more templates
    if (limit !== -1 && currentUsage >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setEditingTemplate(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;

    try {
      await templatesService.deleteTemplate(token, id);
      await loadTemplates();
      await loadPlanInfo();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Erro ao excluir template');
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!token) return;

    // Check limit before duplicating
    if (limit !== -1 && currentUsage >= limit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      await templatesService.duplicateTemplate(token, id);
      await loadTemplates();
      await loadPlanInfo();
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Erro ao duplicar template');
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    if (!token) return;

    try {
      await templatesService.updateTemplate(token, id, { isFavorite });
      await loadTemplates();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Erro ao marcar/desmarcar favorito');
    }
  };

  const handleModalSuccess = async () => {
    await loadTemplates();
    await loadPlanInfo();
  };

  const handleUpgrade = async (plan: PlanType) => {
    if (!token) return;
    try {
      await plansService.upgradePlan(token, plan);
      await loadPlanInfo();
      alert(`Plano alterado para ${plan} com sucesso!`);
    } catch (error: any) {
      alert(error.message || 'Erro ao fazer upgrade');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Templates de Mensagens
            </h1>
            <p className="text-base-content/70 mt-1">
              Crie e gerencie templates reutilizáveis para suas mensagens
            </p>
          </div>
          <button
            onClick={handleCreateClick}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Template
          </button>
        </div>

        {/* Usage Warning */}
        {limit !== -1 && currentUsage >= limit * 0.8 && (
          <div className={`alert ${currentUsage >= limit ? 'alert-error' : 'alert-warning'}`}>
            <AlertCircle className="w-5 h-5" />
            <div>
              <div className="font-semibold">
                {currentUsage >= limit ? 'Limite de templates atingido!' : 'Atenção: Limite próximo'}
              </div>
              <div className="text-sm">
                Você está usando {currentUsage} de {limit} templates disponíveis no plano {currentPlan}.
                {currentUsage >= limit && ' Faça upgrade para criar mais templates.'}
              </div>
            </div>
            {currentUsage >= limit && (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="btn btn-sm"
              >
                Ver Planos
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-base-100 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="form-control flex-1">
              <label className="input input-bordered flex items-center gap-2">
                <Search className="w-5 h-5 opacity-70" />
                <input
                  type="text"
                  placeholder="Buscar por nome, conteúdo ou categoria..."
                  className="grow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </label>
            </div>

            {/* Category Filter */}
            <div className="form-control w-full md:w-48">
              <select
                className="select select-bordered"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas Categorias</option>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorite Filter */}
            <div className="form-control w-full md:w-40">
              <select
                className="select select-bordered"
                value={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="favorites">Favoritos</option>
                <option value="regular">Regulares</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-base-content/60 mt-3">
            Mostrando {filteredTemplates.length} de {templates.length} template(s)
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {templates.length === 0 ? 'Nenhum template criado' : 'Nenhum template encontrado'}
            </h3>
            <p className="text-base-content/60 mb-6">
              {templates.length === 0
                ? 'Comece criando seu primeiro template de mensagem'
                : 'Tente ajustar os filtros de busca'}
            </p>
            {templates.length === 0 && (
              <button
                onClick={handleCreateClick}
                className="btn btn-primary gap-2"
              >
                <Plus className="w-5 h-5" />
                Criar Primeiro Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreateTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSuccess={handleModalSuccess}
          editTemplate={editingTemplate}
        />

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgrade={handleUpgrade}
          currentPlan={currentPlan}
          limitType="templates"
          currentUsage={currentUsage}
          limit={limit}
        />
      </div>
    </div>
  );
};
