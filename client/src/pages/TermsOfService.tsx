import { useEffect } from 'react';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-base-100 shadow-xl rounded-lg p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Termos de Uso</h1>
          <p className="text-sm text-base-content/60">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="prose max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="mb-4">
              Ao acessar e usar a plataforma WhatsAI ("Serviço"), você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
              Se você não concordar com qualquer parte destes termos, não poderá acessar o Serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="mb-4">
              WhatsAI é uma plataforma SaaS que oferece gerenciamento multi-instância de WhatsApp Business com recursos de automação,
              campanhas em massa, templates de mensagens e integração com inteligência artificial.
            </p>
            <p className="mb-4">
              O Serviço é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Conta de Usuário</h2>
            <p className="mb-4">
              Para usar nosso Serviço, você deve criar uma conta fornecendo informações precisas e completas.
              Você é responsável por manter a confidencialidade de sua senha e conta.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Você deve ter pelo menos 18 anos para usar o Serviço</li>
              <li>Você é responsável por todas as atividades que ocorrem em sua conta</li>
              <li>Você deve notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              <li>Não é permitido compartilhar sua conta com terceiros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Uso Aceitável</h2>
            <p className="mb-4">Você concorda em não usar o Serviço para:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Enviar spam ou mensagens não solicitadas</li>
              <li>Violar leis locais, estaduais, nacionais ou internacionais</li>
              <li>Transmitir material ilegal, ameaçador, abusivo ou difamatório</li>
              <li>Interferir ou interromper o Serviço ou servidores</li>
              <li>Tentar obter acesso não autorizado ao Serviço</li>
              <li>Usar o Serviço para fins fraudulentos ou enganosos</li>
              <li>Violar os Termos de Serviço do WhatsApp</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Planos e Pagamento</h2>
            <p className="mb-4">
              O WhatsAI oferece diferentes planos de assinatura (FREE, STARTER, PRO, BUSINESS).
              Os preços e recursos de cada plano estão descritos em nossa página de preços.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>As assinaturas são cobradas mensalmente ou anualmente, conforme escolhido</li>
              <li>Os pagamentos são processados através do Stripe</li>
              <li>Você pode cancelar sua assinatura a qualquer momento</li>
              <li>Não oferecemos reembolsos proporcionais em caso de cancelamento</li>
              <li>Reservamos o direito de modificar os preços mediante aviso prévio de 30 dias</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Limites de Uso</h2>
            <p className="mb-4">
              Cada plano possui limites específicos quanto ao número de instâncias, mensagens diárias e outros recursos.
              O uso que exceder esses limites pode resultar em:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Suspensão temporária do serviço</li>
              <li>Necessidade de upgrade para plano superior</li>
              <li>Cobrança adicional por uso excedente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Propriedade Intelectual</h2>
            <p className="mb-4">
              Todo o conteúdo, recursos e funcionalidades do Serviço são propriedade exclusiva do WhatsAI e estão protegidos
              por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.
            </p>
            <p className="mb-4">
              Você mantém a propriedade de todo o conteúdo que envia através do Serviço (mensagens, mídia, etc.).
              Ao usar o Serviço, você nos concede uma licença para armazenar e processar esse conteúdo conforme necessário para fornecer o Serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Privacidade e Proteção de Dados</h2>
            <p className="mb-4">
              Sua privacidade é importante para nós. Nossa Política de Privacidade explica como coletamos, usamos e protegemos seus dados pessoais.
              Ao usar o Serviço, você concorda com nossa Política de Privacidade.
            </p>
            <p className="mb-4">
              Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Suspensão e Encerramento</h2>
            <p className="mb-4">
              Reservamos o direito de suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, se você violar estes Termos de Uso.
            </p>
            <p className="mb-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da conta ou entrando em contato conosco.
              Após o encerramento, todos os seus dados serão deletados conforme nossa política de retenção.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Limitação de Responsabilidade</h2>
            <p className="mb-4">
              Em nenhuma circunstância o WhatsAI, seus diretores, funcionários ou agentes serão responsáveis por quaisquer danos indiretos,
              incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou uso, decorrentes do uso ou incapacidade de usar o Serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Isenção de Garantias</h2>
            <p className="mb-4">
              O Serviço é fornecido "como está" sem garantias de qualquer tipo. Não garantimos que:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>O Serviço atenderá suas necessidades específicas</li>
              <li>O Serviço será ininterrupto, oportuno, seguro ou livre de erros</li>
              <li>Os resultados obtidos do uso do Serviço serão precisos ou confiáveis</li>
              <li>Quaisquer erros no Serviço serão corrigidos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Modificações dos Termos</h2>
            <p className="mb-4">
              Reservamos o direito de modificar estes Termos de Uso a qualquer momento.
              Notificaremos você sobre mudanças materiais por e-mail ou através de um aviso no Serviço.
              O uso continuado do Serviço após essas mudanças constitui sua aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Lei Aplicável</h2>
            <p className="mb-4">
              Estes Termos de Uso serão regidos e interpretados de acordo com as leis do Brasil,
              sem considerar conflitos de disposições legais. Qualquer disputa decorrente destes termos
              será resolvida nos tribunais competentes do Brasil.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Contato</h2>
            <p className="mb-4">
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
            </p>
            <ul className="list-none pl-0">
              <li className="mb-2">
                <strong>Email:</strong> suporte@whatsai.com.br
              </li>
              <li className="mb-2">
                <strong>Website:</strong> https://whatsai.com.br
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-base-300">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <button
              onClick={() => window.history.back()}
              className="btn btn-outline"
            >
              Voltar
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-primary"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
