/**
 * Cancel Page
 * Página quando usuário cancela o checkout
 */

import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function Cancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12">
          {/* Cancel Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Pagamento Cancelado
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Você cancelou o processo de assinatura
            </p>
          </div>

          {/* Message */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <p className="text-gray-700 dark:text-gray-300 text-center">
              Não se preocupe! Nenhuma cobrança foi realizada e você pode tentar novamente quando quiser.
            </p>
          </div>

          {/* Why Subscribe */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-center">
              Por que assinar o WhatsAI?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-gray-600 dark:text-gray-300">
                  Gerencie múltiplas instâncias WhatsApp simultaneamente
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-gray-600 dark:text-gray-300">
                  Automação inteligente de mensagens e campanhas
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-gray-600 dark:text-gray-300">
                  Suporte dedicado e atualizações constantes
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                <p className="text-gray-600 dark:text-gray-300">
                  14 dias de teste grátis - sem compromisso
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                  Pagamento 100% Seguro
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Ver Planos Novamente
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar ao Dashboard
            </button>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Teve algum problema durante o checkout?
            </p>
            <a
              href="/support"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Entre em contato com o suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
