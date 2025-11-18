import { useEffect } from 'react';
import { Shield, Download, Trash2, FileText, CheckCircle } from 'lucide-react';

export default function LGPDCompliance() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleExportData = () => {
    // This will be implemented in the backend
    alert('Funcionalidade de exportação de dados será implementada em breve.');
  };

  const handleDeleteAccount = () => {
    if (confirm('Tem certeza que deseja solicitar a exclusão de sua conta? Esta ação é irreversível.')) {
      // Navigate to account deletion page
      window.location.href = '/profile?tab=delete';
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-base-100 shadow-xl rounded-lg p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Conformidade LGPD</h1>
          </div>
          <p className="text-base-content/70">
            Lei Geral de Proteção de Dados - Seus direitos e como exercê-los
          </p>
        </div>

        <div className="prose max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">O que é a LGPD?</h2>
            <p className="mb-4">
              A Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) é a legislação brasileira que regulamenta
              o tratamento de dados pessoais, garantindo maior controle aos cidadãos sobre suas informações.
            </p>
            <p className="mb-4">
              O WhatsAI está totalmente comprometido com a conformidade à LGPD e com a proteção de seus dados pessoais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Seus Direitos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Confirmação e Acesso</h3>
                    <p className="text-sm text-base-content/70">
                      Saber se processamos seus dados e ter acesso a eles
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Correção</h3>
                    <p className="text-sm text-base-content/70">
                      Atualizar dados incompletos, inexatos ou desatualizados
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Anonimização e Bloqueio</h3>
                    <p className="text-sm text-base-content/70">
                      Solicitar anonimização ou bloqueio de dados desnecessários
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Eliminação</h3>
                    <p className="text-sm text-base-content/70">
                      Deletar dados tratados com base em consentimento
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Portabilidade</h3>
                    <p className="text-sm text-base-content/70">
                      Receber seus dados em formato estruturado e interoperável
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Informação</h3>
                    <p className="text-sm text-base-content/70">
                      Saber com quem compartilhamos seus dados
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Revogação</h3>
                    <p className="text-sm text-base-content/70">
                      Retirar consentimento a qualquer momento
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-success mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Revisão</h3>
                    <p className="text-sm text-base-content/70">
                      Questionar decisões automatizadas que afetem seus interesses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Como Exercer Seus Direitos</h2>
            
            <div className="space-y-4">
              <div className="alert alert-info">
                <FileText className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Acesso aos Dados</h3>
                  <p className="text-sm">
                    Você pode acessar a maioria dos seus dados através do seu perfil e configurações.
                  </p>
                </div>
              </div>

              <div className="card bg-base-200 p-6">
                <h3 className="text-xl font-semibold mb-4">Ações Disponíveis</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="font-semibold">Exportar Meus Dados</h4>
                        <p className="text-sm text-base-content/70">
                          Baixe uma cópia completa de todos os seus dados em formato JSON
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportData}
                      className="btn btn-primary btn-sm"
                    >
                      Exportar
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-6 h-6 text-error" />
                      <div>
                        <h4 className="font-semibold">Excluir Minha Conta</h4>
                        <p className="text-sm text-base-content/70">
                          Delete permanentemente sua conta e todos os dados associados
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="btn btn-error btn-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Dados que Coletamos</h2>
            <p className="mb-4">Os seguintes tipos de dados são coletados e processados:</p>
            
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Dados Coletados</th>
                    <th>Finalidade</th>
                    <th>Base Legal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">Cadastro</td>
                    <td>Nome, e-mail, senha</td>
                    <td>Autenticação e identificação</td>
                    <td>Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Pagamento</td>
                    <td>Dados de cobrança (via Stripe)</td>
                    <td>Processar assinatura</td>
                    <td>Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Uso</td>
                    <td>Mensagens, mídias, campanhas</td>
                    <td>Fornecer o serviço</td>
                    <td>Execução de contrato</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Técnico</td>
                    <td>IP, navegador, dispositivo</td>
                    <td>Segurança e analytics</td>
                    <td>Interesse legítimo</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Marketing</td>
                    <td>Preferências de comunicação</td>
                    <td>Enviar ofertas e novidades</td>
                    <td>Consentimento</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Compartilhamento de Dados</h2>
            <p className="mb-4">Compartilhamos dados apenas com:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Stripe:</strong> Processamento de pagamentos</li>
              <li><strong>DigitalOcean:</strong> Hospedagem de servidores e arquivos</li>
              <li><strong>SendGrid/Mailgun:</strong> Envio de e-mails transacionais</li>
              <li><strong>OpenAI:</strong> Processamento de IA (apenas se habilitado)</li>
              <li><strong>Evolution API:</strong> Integração com WhatsApp</li>
            </ul>
            <p className="mb-4 font-semibold text-primary">
              Nunca vendemos seus dados para terceiros.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Segurança</h2>
            <p className="mb-4">Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Criptografia SSL/TLS em todas as comunicações</li>
              <li>Senhas criptografadas com algoritmo bcrypt</li>
              <li>Autenticação JWT com tokens seguros</li>
              <li>Backups automáticos diários</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Acesso restrito a dados pessoais</li>
              <li>Testes regulares de segurança</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contato e Reclamações</h2>
            
            <div className="alert alert-info mb-4">
              <div>
                <h3 className="font-semibold mb-2">Encarregado de Proteção de Dados (DPO)</h3>
                <p className="text-sm mb-2">
                  Para questões relacionadas à privacidade e proteção de dados:
                </p>
                <ul className="text-sm">
                  <li><strong>Email:</strong> dpo@whatsai.com.br</li>
                  <li><strong>Email Alternativo:</strong> privacidade@whatsai.com.br</li>
                </ul>
              </div>
            </div>

            <div className="alert alert-warning">
              <div>
                <h3 className="font-semibold mb-2">Autoridade Nacional de Proteção de Dados (ANPD)</h3>
                <p className="text-sm mb-2">
                  Se não ficar satisfeito com nossa resposta, você pode apresentar uma reclamação à ANPD:
                </p>
                <p className="text-sm">
                  <strong>Website:</strong> <a href="https://www.gov.br/anpd/" target="_blank" rel="noopener noreferrer" className="link link-primary">https://www.gov.br/anpd/</a>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Documentos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="/terms" className="card bg-base-200 p-4 hover:bg-base-300 transition-colors">
                <h3 className="font-semibold mb-2">📜 Termos de Uso</h3>
                <p className="text-sm text-base-content/70">
                  Leia nossos termos e condições de uso do serviço
                </p>
              </a>
              <a href="/privacy" className="card bg-base-200 p-4 hover:bg-base-300 transition-colors">
                <h3 className="font-semibold mb-2">🔒 Política de Privacidade</h3>
                <p className="text-sm text-base-content/70">
                  Veja como coletamos, usamos e protegemos seus dados
                </p>
              </a>
            </div>
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
