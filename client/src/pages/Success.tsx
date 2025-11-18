/**
 * Success Page
 * Página de confirmação após checkout bem-sucedido
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { userAuthStore } from '../features/auth/store/authStore';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');
  const checkAuth = userAuthStore((state) => state.checkAuth);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;

    const updateUserData = async () => {
      try {
        console.log(`🔄 [Success] Tentativa ${attempts + 1}/${maxAttempts} - Atualizando dados do usuário...`);
        await checkAuth();
        
        const currentUser = userAuthStore.getState().user;
        console.log('✅ [Success] Dados do usuário atualizados:', {
          name: currentUser?.name,
          plan: currentUser?.plan
        });
        
        attempts++;
        
        // Se ainda não atualizou e não atingiu max tentativas, tentar novamente
        if ((!currentUser?.plan || currentUser.plan === 'free') && attempts < maxAttempts) {
          console.log('⏳ [Success] Plano ainda não atualizado, tentando novamente em 2s...');
          setTimeout(updateUserData, 2000);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ [Success] Erro ao atualizar dados:', error);
        attempts++;
        
        if (attempts < maxAttempts) {
          setTimeout(updateUserData, 2000);
        } else {
          setLoading(false);
        }
      }
    };

    // Aguardar 3 segundos antes da primeira tentativa (tempo para webhook processar)
    const timer = setTimeout(updateUserData, 3000);

    return () => clearTimeout(timer);
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-success animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Processando seu pagamento...
          </h1>
          <p className="text-base-content/70">
            Aguarde enquanto confirmamos sua assinatura
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full card bg-base-100 shadow-2xl">
        <div className="card-body p-8 md:p-12">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-base-content mb-3">
              Pagamento Confirmado!
            </h1>
            <p className="text-lg text-base-content/70">
              Sua assinatura foi ativada com sucesso
            </p>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="bg-base-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-base-content/60">
                ID da Transação: <span className="font-mono">{sessionId.slice(0, 20)}...</span>
              </p>
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-success mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-base-content mb-1">
                  14 dias de teste grátis
                </h3>
                <p className="text-base-content/70 text-sm">
                  Você não será cobrado até o final do período de teste
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-success mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-base-content mb-1">
                  Acesso imediato
                </h3>
                <p className="text-base-content/70 text-sm">
                  Todos os recursos do seu plano já estão disponíveis
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-success mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-base-content mb-1">
                  Cancele quando quiser
                </h3>
                <p className="text-base-content/70 text-sm">
                  Sem multas ou taxas de cancelamento
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="alert alert-info mb-8">
            <div>
              <h3 className="font-bold mb-3">
                Próximos Passos
              </h3>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <span>Configure suas instâncias WhatsApp</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <span>Crie seus templates de mensagem</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <span>Inicie suas primeiras campanhas</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 btn btn-primary"
            >
              Ir para Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => navigate('/subscription')}
              className="flex-1 btn btn-outline"
            >
              Ver Assinatura
            </button>
          </div>

          {/* Support */}
          <p className="text-center text-sm text-base-content/60 mt-8">
            Dúvidas? Entre em contato com nosso{' '}
            <a href="/support" className="link link-primary">
              suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
