/**
 * Cancel Page
 * Página quando usuário cancela o checkout
 */

import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function Cancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full card bg-base-100 shadow-2xl">
        <div className="card-body p-8 md:p-12">
          {/* Cancel Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-error/10 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-error" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-base-content mb-3">
              Pagamento Cancelado
            </h1>
            <p className="text-lg text-base-content/70">
              Você cancelou o processo de assinatura
            </p>
          </div>

          {/* Message */}
          <div className="alert mb-8">
            <p className="text-center">
              Não se preocupe! Nenhuma cobrança foi realizada e você pode tentar novamente quando quiser.
            </p>
          </div>

          {/* Why Subscribe */}
          <div className="mb-8">
            <h3 className="font-bold text-base-content mb-4 text-center">
              Por que assinar o WhatsAI?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-base-content/70">
                  Gerencie múltiplas instâncias WhatsApp simultaneamente
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-base-content/70">
                  Automação inteligente de mensagens e campanhas
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-base-content/70">
                  Suporte dedicado e atualizações constantes
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-primary rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-base-content/70">
                  14 dias de teste grátis - sem compromisso
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="alert alert-success mb-8">
            <div className="flex items-start">
              <CreditCard className="w-6 h-6 flex-shrink-0 mt-1 mr-3" />
              <div>
                <h4 className="font-bold mb-2">
                  Pagamento 100% Seguro
                </h4>
                <p className="text-sm">
                  Processamento via Stripe, a plataforma mais segura do mundo. 
                  Seus dados de pagamento são criptografados e nunca armazenados em nossos servidores.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/pricing')}
              className="flex-1 btn btn-primary"
            >
              Ver Planos Novamente
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 btn btn-outline"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar ao Dashboard
            </button>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-base-content/60 mb-2">
              Teve algum problema durante o checkout?
            </p>
            <a
              href="/support"
              className="link link-primary font-medium"
            >
              Entre em contato com o suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
