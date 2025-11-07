import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Zap, 
  Users, 
  BarChart3, 
  Shield, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  Rocket,
  Crown,
  Play
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'Multi-Instância WhatsApp',
      description: 'Gerencie múltiplos números WhatsApp em uma única plataforma'
    },
    {
      icon: Zap,
      title: 'Envio em Massa',
      description: 'Crie campanhas e alcance milhares de clientes em minutos'
    },
    {
      icon: Users,
      title: 'Auto-Respostas Inteligentes',
      description: 'Automatize 90% do atendimento com respostas inteligentes'
    },
    {
      icon: BarChart3,
      title: 'Analytics Completo',
      description: 'Dashboard com métricas detalhadas e insights valiosos'
    },
    {
      icon: Shield,
      title: '100% Seguro',
      description: 'Criptografia end-to-end e proteção de dados LGPD'
    },
    {
      icon: Clock,
      title: 'Setup em 5 Minutos',
      description: 'Conecte seu WhatsApp e comece a usar imediatamente'
    }
  ];

  const plans = [
    {
      name: 'FREE',
      displayName: 'Gratuito',
      price: 0,
      icon: Star,
      features: [
        '1 instância WhatsApp',
        '100 mensagens/dia',
        '3 templates',
        'Dashboard básico',
        'Suporte por email'
      ],
      cta: 'Começar Grátis',
      highlighted: false
    },
    {
      name: 'STARTER',
      displayName: 'Starter',
      price: 47,
      icon: Rocket,
      features: [
        '2 instâncias WhatsApp',
        '1.000 mensagens/dia',
        '20 templates',
        '5 campanhas/mês',
        'Auto-respostas básicas',
        'Suporte 48h'
      ],
      cta: 'Começar Agora',
      highlighted: false,
      badge: 'Recomendado para PMEs'
    },
    {
      name: 'PRO',
      displayName: 'Profissional',
      price: 97,
      icon: Zap,
      features: [
        '5 instâncias WhatsApp',
        '5.000 mensagens/dia',
        '50 templates',
        '10 campanhas/mês',
        'Auto-respostas avançadas',
        'API de integração',
        'Suporte prioritário 12h'
      ],
      cta: 'Começar Agora',
      highlighted: true,
      badge: 'Mais Popular'
    },
    {
      name: 'BUSINESS',
      displayName: 'Business',
      price: 297,
      icon: Crown,
      features: [
        '✨ Instâncias ilimitadas',
        '✨ Mensagens ilimitadas',
        '✨ Templates ilimitados',
        '✨ Campanhas ilimitadas',
        'Chatbot com IA',
        'API completa + Webhooks',
        'White label',
        'Suporte 24/7 dedicado'
      ],
      cta: 'Falar com Vendas',
      highlighted: false,
      badge: 'Para Empresas'
    }
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      role: 'CEO, TechStore',
      avatar: '👨‍💼',
      text: 'Aumentamos as vendas em 45% no primeiro mês usando WhatsAI. O ROI foi imediato!',
      rating: 5
    },
    {
      name: 'Marina Santos',
      role: 'Gestora de Marketing, BeautyPlus',
      avatar: '👩‍💼',
      text: 'Automatizamos 80% do atendimento e economizamos R$ 3.000/mês em equipe.',
      rating: 5
    },
    {
      name: 'Roberto Lima',
      role: 'Dono, Auto Peças Lima',
      avatar: '👨',
      text: 'Simples de usar e resultados incríveis. Melhor investimento que fiz este ano!',
      rating: 5
    }
  ];

  const faqs = [
    {
      question: 'Preciso de cartão de crédito para o plano gratuito?',
      answer: 'Não! O plano FREE é 100% gratuito e não requer cartão de crédito.'
    },
    {
      question: 'Posso mudar de plano depois?',
      answer: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento.'
    },
    {
      question: 'Como funciona a garantia?',
      answer: '30 dias de garantia total. Não gostou? Devolvemos 100% do seu dinheiro.'
    },
    {
      question: 'Meus dados estão seguros?',
      answer: 'Sim! Usamos criptografia end-to-end e somos 100% compatíveis com LGPD.'
    },
    {
      question: 'Posso cancelar quando quiser?',
      answer: 'Sim, sem burocracia. Cancele quando quiser, sem taxas ou multas.'
    }
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <Star className="w-4 h-4" />
                <span className="text-sm font-semibold">Mais de 1.200 empresas confiam</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Automatize seu <span className="text-primary">WhatsApp</span> em 5 minutos
              </h1>
              
              <p className="text-xl text-base-content/70 mb-8">
                Envie mensagens em massa, crie chatbots inteligentes e gerencie múltiplos números. 
                Tudo em uma única plataforma poderosa.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <a href="/register" className="btn btn-primary btn-lg gap-2">
                  Começar Grátis
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a href="#demo" className="btn btn-outline btn-lg gap-2">
                  <Play className="w-5 h-5" />
                  Ver Demo
                </a>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>Setup em 5 minutos</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Image/Video */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-base-200 rounded-2xl p-8 shadow-2xl">
                <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
                  <Play className="w-20 h-20 text-primary opacity-50" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">98%</div>
                    <div className="text-sm text-base-content/60">Satisfação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">24/7</div>
                    <div className="text-sm text-base-content/60">Suporte</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">5min</div>
                    <div className="text-sm text-base-content/60">Setup</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Recursos Poderosos</h2>
            <p className="text-xl text-base-content/70">
              Tudo que você precisa para dominar o WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-base-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-base-content/70">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-base-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos para Todos os Tamanhos</h2>
            <p className="text-xl text-base-content/70">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    relative bg-base-100 rounded-2xl p-6 border-2 transition-all
                    ${plan.highlighted ? 'border-primary shadow-2xl scale-105' : 'border-base-300'}
                  `}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className={`badge ${plan.highlighted ? 'badge-primary' : 'badge-secondary'}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <Icon className={`w-12 h-12 mx-auto mb-3 ${plan.highlighted ? 'text-primary' : 'text-base-content'}`} />
                    <h3 className="text-2xl font-bold mb-2">{plan.displayName}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        R$ {plan.price}
                      </span>
                      {plan.price > 0 && <span className="text-base-content/60">/mês</span>}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/register"
                    className={`btn w-full ${plan.highlighted ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {plan.cta}
                  </a>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <p className="text-base-content/70 mb-4">
              🎁 <strong>50% OFF</strong> nos primeiros 3 meses para novos clientes
            </p>
            <p className="text-sm text-base-content/60">
              30 dias de garantia • Cancele quando quiser • Sem contratos longos
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">O que nossos clientes dizem</h2>
            <p className="text-xl text-base-content/70">
              Mais de 1.200 empresas já transformaram seu atendimento
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-base-100 rounded-xl p-6 shadow-lg"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-base-content/80 mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-base-content/60">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-base-100">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-xl text-base-content/70">
              Tudo que você precisa saber
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="collapse collapse-plus bg-base-200"
              >
                <input type="radio" name="faq-accordion" defaultChecked={index === 0} />
                <div className="collapse-title text-lg font-medium">
                  {faq.question}
                </div>
                <div className="collapse-content">
                  <p className="text-base-content/70">{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary text-primary-content">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Pronto para revolucionar seu WhatsApp?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Junte-se a mais de 1.200 empresas que já estão crescendo com WhatsAI
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/register" className="btn btn-neutral btn-lg gap-2">
                Começar Grátis Agora
                <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#pricing" className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-primary">
                Ver Planos
              </a>
            </div>
            <p className="mt-6 text-sm opacity-75">
              ✓ Sem cartão de crédito • ✓ Setup em 5min • ✓ Suporte em português
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-base-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">WhatsAI</h3>
              <p className="text-sm text-base-content/70">
                Automatize seu WhatsApp e escale seu negócio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="link link-hover">Recursos</a></li>
                <li><a href="#pricing" className="link link-hover">Preços</a></li>
                <li><a href="#" className="link link-hover">Documentação</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="link link-hover">Sobre</a></li>
                <li><a href="#" className="link link-hover">Blog</a></li>
                <li><a href="#" className="link link-hover">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="link link-hover">Central de Ajuda</a></li>
                <li><a href="#" className="link link-hover">Contato</a></li>
                <li><a href="#" className="link link-hover">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="divider"></div>
          <div className="text-center text-sm text-base-content/60">
            <p>© 2025 WhatsAI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
