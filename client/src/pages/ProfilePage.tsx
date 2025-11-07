import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAuthStore } from '../features/auth/store/authStore';
import { plansService } from '../features/plans/services/plansService';
import { UsageResponse } from '../features/plans/types/plans';
import ChangePasswordModal from '../components/ChangePasswordModal';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = userAuthStore((state) => state.user);
  const token = userAuthStore((state) => state.token);
  const setUser = userAuthStore((state) => state.setUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  // Get plan information
  const currentPlan = user?.plan || 'FREE';
  const planNames: Record<string, string> = {
    'FREE': 'Gratuito',
    'free': 'Gratuito',
    'STARTER': 'Starter',
    'starter': 'Starter',
    'PRO': 'Pro',
    'pro': 'Pro',
    'BUSINESS': 'Business',
    'business': 'Business',
    'ENTERPRISE': 'Enterprise',
    'enterprise': 'Enterprise'
  };

  console.log('ProfilePage render - isEditing:', isEditing, 'isLoading:', isLoading);

  // Load usage data
  useEffect(() => {
    const loadUsage = async () => {
      if (!token) return;
      try {
        const usageData = await plansService.getUsage(token);
        setUsage(usageData);
      } catch (error) {
        console.error('Error loading usage:', error);
      }
    };
    loadUsage();
  }, [token]);

  // Sync formData with user data when user changes (with immediate update)
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only process submit if we're actually in editing mode
    if (!isEditing) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('whatsai_token') || localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedUser = data.data.user;
        
        // Update the user store with new data
        setUser(updatedUser);
        
        // Update local formData immediately to reflect the changes
        setFormData({
          name: updatedUser.name,
          email: updatedUser.email,
        });
        
        toast.success('Perfil atualizado com sucesso!');
        setIsEditing(false);
      } else {
        if (data.errors) {
          // Show validation errors
          data.errors.forEach((error: any) => {
            toast.error(`${error.field}: ${error.message}`);
          });
        } else {
          toast.error(data.message || 'Erro ao atualizar perfil');
        }
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor');
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-base-content mb-2">Meu Perfil</h1>
          <p className="text-base-content/70">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Card */}
        <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-8 pb-6 border-b border-base-300">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-primary-content text-3xl font-bold">
              {(formData.name || user?.name)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-base-content">{formData.name || user?.name}</h2>
              <p className="text-base-content/70">{formData.email || user?.email}</p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-2">
                  Nome
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input input-bordered w-full"
                    required
                  />
                ) : (
                  <p className="px-4 py-3 bg-base-200 rounded-lg text-base-content">
                    {formData.name || user?.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input input-bordered w-full"
                    required
                  />
                ) : (
                  <p className="px-4 py-3 bg-base-200 rounded-lg text-base-content">
                    {formData.email || user?.email}
                  </p>
                )}
              </div>

              {/* Account Information */}
              <div className="pt-6 border-t border-base-300">
                <h3 className="text-lg font-semibold text-base-content mb-4">
                  Informações da Conta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-base-content/50 mb-1">ID do Usuário</p>
                    <p className="text-sm font-mono bg-base-200 p-2 rounded text-base-content">
                      {user?.id?.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/50 mb-1">Status da Conta</p>
                    <p className="text-sm">
                      <span className="badge badge-success gap-2">
                        <span className="w-2 h-2 bg-success-content rounded-full"></span>
                        Ativa
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/50 mb-1">Membro desde</p>
                    <p className="text-sm font-medium text-base-content">
                      {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/50 mb-1">Plano Atual</p>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${currentPlan.toUpperCase() === 'FREE' ? 'badge-ghost' : 'badge-primary'} font-medium`}>
                        {planNames[currentPlan] || currentPlan}
                      </span>
                      {currentPlan.toUpperCase() === 'FREE' && (
                        <button
                          onClick={() => navigate('/pricing')}
                          className="text-xs text-primary hover:underline"
                        >
                          Fazer upgrade
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Usage Statistics */}
              <div className="pt-6 border-t border-base-300">
                <h3 className="text-lg font-semibold text-base-content mb-4">
                  Uso do Plano
                </h3>
                <div className="space-y-4">
                  {/* Messages Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-base-content/70">Mensagens Hoje</span>
                      <span className="text-sm font-medium text-base-content">
                        {usage ? (
                          usage.limits.messages_per_day === -1 
                            ? `${usage.usage.messages_today.current} / ∞`
                            : `${usage.usage.messages_today.current} / ${usage.limits.messages_per_day}`
                        ) : '0 / 0'}
                      </span>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${(() => {
                          if (!usage || usage.limits.messages_per_day === -1) return 'bg-success';
                          const percentage = (usage.usage.messages_today.current / usage.limits.messages_per_day);
                          return percentage > 0.9 
                            ? 'bg-error' 
                            : percentage > 0.7
                            ? 'bg-warning'
                            : 'bg-success';
                        })()}`}
                        style={{ 
                          width: `${(() => {
                            if (!usage || usage.limits.messages_per_day === -1) return 0;
                            return Math.min(100, (usage.usage.messages_today.current / usage.limits.messages_per_day) * 100);
                          })()}%` 
                        }}
                      ></div>
                    </div>
                    {(() => {
                      if (!usage || usage.limits.messages_per_day === -1) return null;
                      const percentage = (usage.usage.messages_today.current / usage.limits.messages_per_day);
                      if (percentage > 0.8) {
                        return (
                          <p className="text-xs text-warning mt-1">
                            ⚠️ Você está próximo do limite diário
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Instances Limit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-base-200 rounded-lg p-3">
                      <p className="text-xs text-base-content/50 mb-1">Instâncias Permitidas</p>
                      <p className="text-lg font-bold text-base-content">
                        {usage ? (usage.limits.instances === -1 ? '∞' : usage.limits.instances) : 0}
                      </p>
                    </div>
                    <div className="bg-base-200 rounded-lg p-3">
                      <p className="text-xs text-base-content/50 mb-1">Mensagens/Dia</p>
                      <p className="text-lg font-bold text-base-content">
                        {usage ? (usage.limits.messages_per_day === -1 ? '∞' : usage.limits.messages_per_day) : 0}
                      </p>
                    </div>
                  </div>
                  
                  {currentPlan.toUpperCase() === 'FREE' && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <p className="text-sm text-base-content mb-2">
                        🚀 <strong>Precisa de mais recursos?</strong>
                      </p>
                      <p className="text-xs text-base-content/70 mb-3">
                        Faça upgrade para ter mais instâncias, mensagens ilimitadas e recursos exclusivos.
                      </p>
                      <button
                        onClick={() => navigate('/pricing')}
                        className="btn btn-primary btn-sm w-full"
                      >
                        Ver Planos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                {isEditing ? (
                  <>
                    <button
                      type="submit"
                      className="flex-1 btn btn-primary border-0"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 btn btn-ghost"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </form>
          
          {/* Edit Button - Outside form to prevent accidental submit */}
          {!isEditing && (
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => {
                  console.log('Clicou em Editar Perfil');
                  setIsEditing(true);
                  console.log('isEditing agora é:', true);
                }}
                className="flex-1 btn btn-primary border-0"
              >
                Editar Perfil
              </button>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="mt-6 card bg-base-100 shadow-xl rounded-2xl border border-base-300 p-6 md:p-8">
          <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Segurança
          </h3>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full text-left px-4 py-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
              onClick={() => setIsChangePasswordModalOpen(true)}
            >
              <p className="font-medium text-base-content">Alterar Senha</p>
              <p className="text-sm text-base-content/60">Atualize sua senha periodicamente</p>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
}
