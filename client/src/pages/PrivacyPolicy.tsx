import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-base-100 shadow-xl rounded-lg p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Política de Privacidade</h1>
          <p className="text-sm text-base-content/60">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="prose max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p className="mb-4">
              O WhatsAI ("nós", "nosso" ou "nos") está comprometido em proteger sua privacidade.
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações
              quando você usa nossa plataforma de gerenciamento de WhatsApp.
            </p>
            <p className="mb-4">
              Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) do Brasil
              e outras leis de privacidade aplicáveis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
            
            <h3 className="text-xl font-semibold mb-3">2.1 Informações Fornecidas por Você</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Dados de Cadastro:</strong> Nome, e-mail, senha (criptografada)</li>
              <li><strong>Dados de Pagamento:</strong> Processados pelo Stripe (não armazenamos dados de cartão)</li>
              <li><strong>Dados de Perfil:</strong> Foto de perfil, bio, preferências</li>
              <li><strong>Conteúdo do Usuário:</strong> Mensagens, mídias, templates, campanhas</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Dados de Uso:</strong> Páginas visitadas, recursos utilizados, tempo de sessão</li>
              <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, dispositivo, sistema operacional</li>
              <li><strong>Cookies:</strong> Utilizamos cookies para melhorar sua experiência</li>
              <li><strong>Logs:</strong> Registros de atividades do sistema para segurança e debugging</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.3 Dados de WhatsApp</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Números de telefone conectados</li>
              <li>Mensagens enviadas e recebidas</li>
              <li>Mídias compartilhadas (imagens, vídeos, documentos)</li>
              <li>Contatos e conversas</li>
              <li>Status de conexão e QR codes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos Suas Informações</h2>
            <p className="mb-4">Usamos suas informações para:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Fornecer o Serviço:</strong> Processar mensagens, gerenciar instâncias, executar campanhas</li>
              <li><strong>Autenticação:</strong> Verificar sua identidade e manter sua conta segura</li>
              <li><strong>Pagamentos:</strong> Processar assinaturas e transações</li>
              <li><strong>Comunicação:</strong> Enviar notificações, atualizações e suporte</li>
              <li><strong>Melhorias:</strong> Analisar uso para melhorar recursos e experiência</li>
              <li><strong>Segurança:</strong> Detectar e prevenir fraudes, abusos e violações</li>
              <li><strong>Conformidade:</strong> Cumprir obrigações legais e regulatórias</li>
              <li><strong>Marketing:</strong> Com seu consentimento, enviar ofertas e novidades</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Base Legal para Processamento (LGPD)</h2>
            <p className="mb-4">Processamos seus dados pessoais com base em:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Consentimento:</strong> Você nos autorizou a processar seus dados</li>
              <li><strong>Execução de Contrato:</strong> Necessário para fornecer o serviço</li>
              <li><strong>Obrigação Legal:</strong> Quando exigido por lei</li>
              <li><strong>Interesses Legítimos:</strong> Para melhorar nosso serviço e segurança</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Compartilhamento de Informações</h2>
            <p className="mb-4">Podemos compartilhar suas informações com:</p>
            
            <h3 className="text-xl font-semibold mb-3">5.1 Provedores de Serviço</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Stripe:</strong> Processamento de pagamentos</li>
              <li><strong>DigitalOcean:</strong> Hospedagem e armazenamento</li>
              <li><strong>SendGrid/Mailgun:</strong> Envio de e-mails transacionais</li>
              <li><strong>OpenAI:</strong> Processamento de IA (apenas se você usar recursos de IA)</li>
              <li><strong>Evolution API:</strong> Integração com WhatsApp</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.2 Conformidade Legal</h3>
            <p className="mb-4">
              Podemos divulgar informações se exigido por lei, ordem judicial, processo legal ou autoridades governamentais.
            </p>

            <h3 className="text-xl font-semibold mb-3">5.3 Não Vendemos Seus Dados</h3>
            <p className="mb-4">
              Nunca vendemos, alugamos ou comercializamos suas informações pessoais para terceiros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Armazenamento e Segurança</h2>
            
            <h3 className="text-xl font-semibold mb-3">6.1 Localização dos Dados</h3>
            <p className="mb-4">
              Seus dados são armazenados em servidores seguros localizados no Brasil (DigitalOcean São Paulo).
              Dados podem ser processados em outras regiões apenas por provedores de serviço essenciais.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.2 Medidas de Segurança</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Criptografia SSL/TLS para transmissão de dados</li>
              <li>Senhas criptografadas com bcrypt</li>
              <li>Autenticação JWT com tokens seguros</li>
              <li>Backups automáticos diários</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Controles de acesso rigorosos</li>
              <li>Logs de auditoria</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">6.3 Retenção de Dados</h3>
            <p className="mb-4">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer o serviço.
              Após a exclusão da conta, os dados são removidos em até 30 dias, exceto quando exigido por lei.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="mb-4">De acordo com a LGPD, você tem os seguintes direitos:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Confirmação:</strong> Saber se processamos seus dados</li>
              <li><strong>Acesso:</strong> Obter cópia dos seus dados</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
              <li><strong>Anonimização, Bloqueio ou Eliminação:</strong> Solicitar remoção de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Eliminação:</strong> Deletar dados processados com base em consentimento</li>
              <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
              <li><strong>Revogação de Consentimento:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Revisão de Decisões Automatizadas:</strong> Questionar decisões baseadas em automação</li>
            </ul>

            <p className="mb-4">
              Para exercer esses direitos, entre em contato conosco através de: <strong>privacidade@whatsai.com.br</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies e Tecnologias Similares</h2>
            <p className="mb-4">Utilizamos cookies para:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Manter você conectado (cookies de sessão)</li>
              <li>Lembrar suas preferências (tema, idioma)</li>
              <li>Analisar uso do serviço (Google Analytics - opcional)</li>
              <li>Melhorar segurança e prevenir fraudes</li>
            </ul>
            <p className="mb-4">
              Você pode configurar seu navegador para recusar cookies, mas isso pode limitar funcionalidades do serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Privacidade de Menores</h2>
            <p className="mb-4">
              Nosso serviço não é destinado a menores de 18 anos.
              Não coletamos intencionalmente informações de menores.
              Se tomarmos conhecimento de que coletamos dados de um menor, excluiremos essas informações imediatamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Transferência Internacional de Dados</h2>
            <p className="mb-4">
              Alguns de nossos provedores de serviço (como Stripe e OpenAI) podem estar localizados fora do Brasil.
              Garantimos que essas transferências estejam em conformidade com a LGPD e que seus dados sejam protegidos adequadamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Alterações nesta Política</h2>
            <p className="mb-4">
              Podemos atualizar esta Política de Privacidade periodicamente.
              Notificaremos você sobre mudanças significativas por e-mail ou através de um aviso no serviço.
              A data da "Última atualização" no topo indica quando a política foi revisada pela última vez.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Encarregado de Dados (DPO)</h2>
            <p className="mb-4">
              Nosso Encarregado de Proteção de Dados pode ser contatado em:
            </p>
            <ul className="list-none pl-0">
              <li className="mb-2">
                <strong>Email:</strong> dpo@whatsai.com.br
              </li>
              <li className="mb-2">
                <strong>Responsável:</strong> Encarregado de Dados - WhatsAI
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
            <p className="mb-4">
              Você tem o direito de apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD) caso
              considere que seus direitos de privacidade não foram respeitados.
            </p>
            <ul className="list-none pl-0">
              <li className="mb-2">
                <strong>Website:</strong> https://www.gov.br/anpd/
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Contato</h2>
            <p className="mb-4">
              Para questões sobre esta Política de Privacidade ou sobre o processamento de seus dados pessoais:
            </p>
            <ul className="list-none pl-0">
              <li className="mb-2">
                <strong>Email Geral:</strong> suporte@whatsai.com.br
              </li>
              <li className="mb-2">
                <strong>Email de Privacidade:</strong> privacidade@whatsai.com.br
              </li>
              <li className="mb-2">
                <strong>Email do DPO:</strong> dpo@whatsai.com.br
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
