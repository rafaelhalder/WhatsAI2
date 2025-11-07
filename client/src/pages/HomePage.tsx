import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, Zap, Shield, Users, Star, Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="homepage-wrapper min-h-screen bg-base-100">
      {/* Hero Section */}
      <motion.section
        className="relative grid min-h-screen place-content-center overflow-hidden px-4 py-24 bg-base-100"
      >
        <div className='relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto'>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h1 className='text-5xl md:text-7xl font-bold tracking-tight mb-4'>
              Whats<span className='text-primary'>AI</span>
            </h1>
            <p className={`text-xl md:text-2xl font-light mb-2 text-base-content/80`}>
              Gerencie múltiplas instâncias do WhatsApp com IA
            </p>
            <p className={`text-lg text-base-content/60`}>
              Automatize conversas, integre APIs e escale seu atendimento ao cliente
            </p>
          </motion.div>

          {/* Botões de Ação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 items-center mb-16"
          >
            <motion.button
              onClick={() => navigate('/register')}
              className={`group relative flex w-fit items-center
                gap-1.5 rounded-full bg-primary px-8 py-4 text-primary-content
                font-semibold transition-all hover:bg-primary-focus hover:shadow-lg`}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.98,
              }}
            >
              Começar Agora
              <motion.span
                initial={{ x: 0 }}
                className="inline-block"
                whileHover={{ x: 3, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.6 } }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.span>
            </motion.button>

            <motion.button
              onClick={() => navigate('/login')}
              className={`group relative flex w-fit items-center
                gap-1.5 rounded-full border-2 px-8 py-4
                font-semibold transition-all hover:border-primary border-base-300 text-base-content hover:text-primary`}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.98,
              }}
            >
              Entrar
            </motion.button>
          </motion.div>

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl"
          >
            <div className={`backdrop-blur-sm rounded-xl p-6 shadow-lg border bg-base-100/90 border-base-300`}>
              <MessageSquare className={`h-8 w-8 mb-3 text-primary`} />
              <h3 className={`font-semibold mb-2 text-base-content`}>Múltiplas Instâncias</h3>
              <p className={`text-sm text-base-content/70`}>Gerencie várias contas do WhatsApp simultaneamente</p>
            </div>

            <div className={`backdrop-blur-sm rounded-xl p-6 shadow-lg border bg-base-100/90 border-base-300`}>
              <Zap className={`h-8 w-8 mb-3 text-primary`} />
              <h3 className={`font-semibold mb-2 text-base-content`}>Integração com IA</h3>
              <p className={`text-sm text-base-content/70`}>Respostas automáticas inteligentes e personalizadas</p>
            </div>

            <div className={`backdrop-blur-sm rounded-xl p-6 shadow-lg border bg-base-100/90 border-base-300`}>
              <Shield className={`h-8 w-8 mb-3 text-primary`} />
              <h3 className={`font-semibold mb-2 text-base-content`}>API Evolution</h3>
              <p className={`text-sm text-base-content/70`}>Integração completa com Evolution API</p>
            </div>
          </motion.div>
        </div>

        {/* Elementos decorativos removidos para design mais minimalista */}
        {/* <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div> */}
      </motion.section>

      {/* Features Section */}
      <section id="features" className={`py-20 bg-base-200`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-base-content mb-4`}>
              Por que escolher o WhatsAI?
            </h2>
            <p className={`text-xl text-base-content/70 max-w-2xl mx-auto`}>
              Uma solução completa para automatizar e escalar seu atendimento no WhatsApp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-primary/20`}>
                <Users className={`h-8 w-8 text-primary`} />
              </div>
              <h3 className={`font-semibold mb-2 text-base-content`}>Multi-usuário</h3>
              <p className={`text-base-content/70`}>Suporte para múltiplos usuários e instâncias simultâneas</p>
            </div>

            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-primary/20`}>
                <Zap className={`h-8 w-8 text-primary`} />
              </div>
              <h3 className={`font-semibold mb-2 text-base-content`}>Alta Performance</h3>
              <p className={`text-base-content/70`}>Processamento rápido e eficiente de mensagens</p>
            </div>

            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-primary/20`}>
                <Shield className={`h-8 w-8 text-primary`} />
              </div>
              <h3 className={`font-semibold mb-2 text-base-content`}>Segurança</h3>
              <p className={`text-base-content/70`}>Criptografia end-to-end e proteção de dados</p>
            </div>

            <div className="text-center">
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-primary/20`}>
                <MessageSquare className={`h-8 w-8 text-primary`} />
              </div>
              <h3 className={`font-semibold mb-2 text-base-content`}>Integração Total</h3>
              <p className={`text-base-content/70`}>Compatível com Evolution API e webhooks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`py-20 bg-base-100`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-base-content mb-4`}>
              Planos para todos os tamanhos de negócio
            </h2>
            <p className={`text-xl text-base-content/70 max-w-2xl mx-auto`}>
              Comece grátis e evolua conforme sua empresa cresce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Plano FREE */}
            <motion.div
              className="bg-base-200 rounded-2xl p-6 border-2 border-base-300 hover:border-primary/50 transition-all"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Gratuito</h3>
                  <p className="text-sm text-base-content/70">Para começar</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 0</span>
                  <span className="text-base-content/70">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">1 instância WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">100 mensagens por dia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">5 templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Dashboard básico</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Suporte por email</span>
                </li>
              </ul>

              <button
                onClick={() => navigate('/register')}
                className="btn btn-outline btn-primary w-full"
              >
                Começar Grátis
              </button>
            </motion.div>

            {/* Plano STARTER */}
            <motion.div
              className="bg-base-200 rounded-2xl p-6 border-2 border-accent hover:border-accent/70 transition-all"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Starter</h3>
                  <p className="text-sm text-base-content/70">PMEs</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 47</span>
                  <span className="text-base-content/70">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">2 instâncias WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">1.000 mensagens por dia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">20 templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">5 campanhas/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Auto-resposta básica</span>
                </li>
              </ul>

              <button
                onClick={() => navigate('/register')}
                className="btn btn-accent w-full"
              >
                Escolher Starter
              </button>
            </motion.div>

            {/* Plano PRO */}
            <motion.div
              className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border-2 border-primary shadow-xl relative"
              whileHover={{ y: -5 }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge badge-warning badge-lg">Mais Popular</span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pro</h3>
                  <p className="text-sm text-base-content/70">Empresas</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 97</span>
                  <span className="text-base-content/70">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">5 instâncias WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">5.000 mensagens por dia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">50 templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Campanhas ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Chatbot + API completa</span>
                </li>
              </ul>

              <button
                onClick={() => navigate('/register')}
                className="btn btn-primary w-full"
              >
                Escolher Pro
              </button>
            </motion.div>

            {/* Plano BUSINESS */}
            <motion.div
              className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl p-6 border-2 border-secondary hover:border-secondary/70 transition-all"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Business</h3>
                  <p className="text-sm text-base-content/70">Enterprise</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ 297</span>
                  <span className="text-base-content/70">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Instâncias ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Mensagens ilimitadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Tudo ilimitado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">Suporte 24/7</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-sm">White label</span>
                </li>
              </ul>

              <button
                onClick={() => navigate('/register')}
                className="btn btn-secondary w-full"
              >
                Falar com Vendas
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className={`py-20 bg-base-200`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-base-content mb-4`}>
              O que nossos clientes dizem
            </h2>
            <p className={`text-xl text-base-content/70 max-w-2xl mx-auto`}>
              Empresas que já transformaram seu atendimento com WhatsAI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              className="bg-base-100 rounded-xl p-6 shadow-lg"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-base-content mb-4">
                "Economizamos mais de R$ 3.400/mês trocando para o WhatsAI. A automação é incrível!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">João Silva</p>
                  <p className="text-sm text-base-content/70">Loja de Roupas</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-base-100 rounded-xl p-6 shadow-lg"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-base-content mb-4">
                "Automatizei 90% do atendimento em apenas 2 dias. Resultado surpreendente!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Maria Santos</p>
                  <p className="text-sm text-base-content/70">E-commerce</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-base-100 rounded-xl p-6 shadow-lg"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-base-content mb-4">
                "Interface intuitiva e suporte excelente. Recomendo para qualquer empresa!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Carlos Oliveira</p>
                  <p className="text-sm text-base-content/70">Agência de Marketing</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className={`py-20 bg-base-100`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-base-content mb-4`}>
              WhatsAI vs Concorrentes
            </h2>
            <p className={`text-xl text-base-content/70 max-w-2xl mx-auto`}>
              Veja por que somos a melhor escolha do mercado
            </p>
          </div>

          <div className="overflow-x-auto max-w-5xl mx-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="bg-base-200">Recursos</th>
                  <th className="bg-primary text-primary-content">WhatsAI</th>
                  <th className="bg-base-200">Z-API</th>
                  <th className="bg-base-200">Typebot</th>
                  <th className="bg-base-200">Evolution</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold">Plano Gratuito</td>
                  <td className="text-center"><Check className="w-5 h-5 text-success mx-auto" /></td>
                  <td className="text-center text-error">✗</td>
                  <td className="text-center"><Check className="w-5 h-5 text-success mx-auto" /></td>
                  <td className="text-center text-error">✗</td>
                </tr>
                <tr>
                  <td className="font-semibold">Multi-instância</td>
                  <td className="text-center font-bold text-primary">5</td>
                  <td className="text-center">1</td>
                  <td className="text-center">1</td>
                  <td className="text-center">3</td>
                </tr>
                <tr>
                  <td className="font-semibold">Campanhas</td>
                  <td className="text-center"><Check className="w-5 h-5 text-success mx-auto" /></td>
                  <td className="text-center text-error">✗</td>
                  <td className="text-center text-error">✗</td>
                  <td className="text-center text-error">✗</td>
                </tr>
                <tr>
                  <td className="font-semibold">Chatbot IA</td>
                  <td className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-primary">GPT-4o</span>
                      <span className="text-xs text-base-content/60">(configurável)</span>
                    </div>
                  </td>
                  <td className="text-center text-error">✗</td>
                  <td className="text-center"><Check className="w-5 h-5 text-success mx-auto" /></td>
                  <td className="text-center text-error">✗</td>
                </tr>
                <tr>
                  <td className="font-semibold">Preço/mês</td>
                  <td className="text-center font-bold text-success">R$ 97</td>
                  <td className="text-center">R$ 199</td>
                  <td className="text-center">R$ 149</td>
                  <td className="text-center">R$ 299</td>
                </tr>
                <tr>
                  <td className="font-semibold">Setup</td>
                  <td className="text-center font-bold text-success">5 min</td>
                  <td className="text-center">2h</td>
                  <td className="text-center">1h</td>
                  <td className="text-center">4h</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <p className="text-lg font-semibold text-primary">
              💡 WhatsAI = Melhor custo-benefício do mercado
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={`py-20 bg-base-200`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-base-content mb-4`}>
              Perguntas Frequentes
            </h2>
            <p className={`text-xl text-base-content/70 max-w-2xl mx-auto`}>
              Tire suas dúvidas sobre o WhatsAI
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" defaultChecked />
              <div className="collapse-title text-xl font-medium">
                Como funciona o plano gratuito?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  O plano gratuito oferece 1 instância WhatsApp, 100 mensagens por dia e 5 templates. 
                  É perfeito para testar a plataforma sem compromisso.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Posso cancelar a qualquer momento?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Sim! Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento 
                  diretamente no painel de configurações.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                É seguro conectar meu WhatsApp?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Absolutamente! Usamos a Evolution API oficial e criptografia end-to-end. 
                  Seus dados estão 100% protegidos e seguros.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Preciso de conhecimento técnico?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Não! Nossa interface é intuitiva e fácil de usar. Você conecta seu WhatsApp 
                  em menos de 5 minutos sem precisar de conhecimento técnico.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Como funciona o suporte?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Planos gratuitos têm suporte por email. Planos pagos têm suporte prioritário 
                  com SLA de 12h (PRO) ou suporte dedicado 24/7 (BUSINESS).
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Existe garantia de reembolso?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Sim! Oferecemos garantia de 30 dias. Se não ficar satisfeito, 
                  devolvemos 100% do seu dinheiro, sem perguntas.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Posso mudar de plano depois?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Claro! Você pode fazer upgrade ou downgrade a qualquer momento. 
                  Upgrades são aplicados imediatamente, downgrades no final do período atual.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Quantas mensagens posso enviar?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Depende do plano: FREE (100/dia), STARTER (1.000/dia), PRO (5.000/dia), BUSINESS (ilimitado). 
                  As campanhas respeitam rate limiting para evitar bloqueios do WhatsApp.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                O WhatsAI funciona em qual região?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  WhatsAI funciona globalmente! Suportamos números de WhatsApp de qualquer país. 
                  Nossa infraestrutura está otimizada para o Brasil, mas aceita conexões mundiais.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-100">
              <input type="radio" name="faq-accordion" />
              <div className="collapse-title text-xl font-medium">
                Vocês têm API para integração?
              </div>
              <div className="collapse-content">
                <p className="text-base-content/70">
                  Sim! Planos PRO e BUSINESS incluem acesso completo à nossa API REST 
                  para integrar com seus sistemas e automações.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 text-primary-content bg-primary`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para revolucionar seu atendimento?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de empresas que já automatizaram seu WhatsApp
          </p>
          <motion.button
            onClick={() => navigate('/register')}
            className={`px-8 py-4 rounded-full font-semibold transition-colors inline-flex items-center gap-2 btn btn-outline`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Começar Gratuitamente
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;