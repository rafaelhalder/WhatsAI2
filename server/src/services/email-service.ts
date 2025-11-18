import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger-service';

/**
 * Email Service for WhatsAI
 * 
 * Handles all transactional emails:
 * - Welcome emails
 * - Password reset
 * - Payment confirmations
 * - Subscription updates
 * 
 * Dependencies (to install):
 * npm install nodemailer @types/nodemailer
 * 
 * Configuration in .env:
 * SMTP_HOST=smtp.gmail.com (or smtp.sendgrid.net, smtp.mailgun.org)
 * SMTP_PORT=587
 * SMTP_USER=your-email@gmail.com
 * SMTP_PASS=your-app-password
 * SMTP_FROM=WhatsAI <noreply@whatsai.com.br>
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private readonly fromEmail: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM || 'WhatsAI <noreply@whatsai.com.br>';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('Email service not configured. Emails will not be sent.');
      logger.warn('Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn(`Email not sent (service not configured): ${options.subject} to ${options.to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      });

      logger.info(`Email sent successfully: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email: ${options.subject} to ${options.to}`, error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao WhatsAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎉 Bem-vindo ao WhatsAI!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Olá <strong>${userName}</strong>,</p>
        
        <p>É um prazer tê-lo conosco! Você acabou de dar o primeiro passo para revolucionar seu atendimento no WhatsApp.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #667eea; margin-top: 0;">🚀 Primeiros Passos</h2>
            <ol style="padding-left: 20px;">
                <li style="margin-bottom: 10px;">
                    <strong>Conecte seu WhatsApp:</strong> Escaneie o QR Code para conectar seu número
                </li>
                <li style="margin-bottom: 10px;">
                    <strong>Envie sua primeira mensagem:</strong> Teste o envio através da nossa interface
                </li>
                <li style="margin-bottom: 10px;">
                    <strong>Crie templates:</strong> Configure modelos de mensagens reutilizáveis
                </li>
                <li style="margin-bottom: 10px;">
                    <strong>Configure automações:</strong> Automatize até 90% do seu atendimento
                </li>
            </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://app.whatsai.com.br'}/dashboard" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Acessar Dashboard
            </a>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
                <strong>💡 Dica:</strong> Assista nosso tour interativo de 2 minutos para conhecer todos os recursos!
            </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Alguma dúvida? Entre em contato conosco:<br>
            📧 Email: <a href="mailto:suporte@whatsai.com.br" style="color: #667eea;">suporte@whatsai.com.br</a><br>
            💬 Chat: Disponível no dashboard
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} WhatsAI. Todos os direitos reservados.<br>
            <a href="${process.env.FRONTEND_URL || 'https://app.whatsai.com.br'}/privacy" style="color: #667eea;">Política de Privacidade</a> | 
            <a href="${process.env.FRONTEND_URL || 'https://app.whatsai.com.br'}/terms" style="color: #667eea;">Termos de Uso</a>
        </p>
    </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '🎉 Bem-vindo ao WhatsAI - Vamos começar!',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://app.whatsai.com.br'}/reset-password?token=${resetToken}`;
    
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - WhatsAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🔒 Recuperação de Senha</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Olá,</p>
        
        <p>Recebemos uma solicitação para redefinir a senha de sua conta WhatsAI.</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">
                <strong>⚠️ Importante:</strong> Se você não solicitou esta recuperação, ignore este email. 
                Sua senha permanecerá inalterada.
            </p>
        </div>
        
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Redefinir Senha
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Ou copie e cole este link no seu navegador:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="font-size: 14px; color: #999;">
            Este link expira em 1 hora por motivos de segurança.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} WhatsAI. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '🔒 Recuperação de Senha - WhatsAI',
      html,
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(
    userEmail: string,
    userName: string,
    plan: string,
    amount: number,
    invoiceUrl?: string
  ): Promise<boolean> {
    const formattedAmount = (amount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagamento Confirmado - WhatsAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4caf50; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">✅ Pagamento Confirmado!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Olá <strong>${userName}</strong>,</p>
        
        <p>Seu pagamento foi processado com sucesso! 🎉</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #4caf50; margin-top: 0;">Detalhes da Assinatura</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Plano:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${plan}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Valor:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0;"><strong>Data:</strong></td>
                    <td style="padding: 10px 0; text-align: right;">${new Date().toLocaleDateString('pt-BR')}</td>
                </tr>
            </table>
        </div>
        
        <p>Agora você tem acesso a todos os recursos do plano <strong>${plan}</strong>!</p>
        
        ${invoiceUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Baixar Nota Fiscal
            </a>
        </div>
        ` : ''}
        
        <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
                <strong>🎯 Próximos Passos:</strong><br>
                Aproveite ao máximo sua assinatura configurando automações e campanhas no dashboard!
            </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Precisa de ajuda? Estamos aqui:<br>
            📧 Email: <a href="mailto:suporte@whatsai.com.br" style="color: #667eea;">suporte@whatsai.com.br</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} WhatsAI. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `✅ Pagamento Confirmado - Plano ${plan}`,
      html,
    });
  }

  /**
   * Send subscription cancellation email
   */
  async sendSubscriptionCancelledEmail(
    userEmail: string,
    userName: string,
    plan: string,
    endDate: Date
  ): Promise<boolean> {
    const formattedEndDate = endDate.toLocaleDateString('pt-BR');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Assinatura Cancelada - WhatsAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ff9800; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Assinatura Cancelada</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Olá <strong>${userName}</strong>,</p>
        
        <p>Confirmamos o cancelamento da sua assinatura do plano <strong>${plan}</strong>.</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">
                <strong>📅 Importante:</strong> Você continuará tendo acesso aos recursos premium até 
                <strong>${formattedEndDate}</strong>.
            </p>
        </div>
        
        <p>Sentiremos sua falta! Se você decidiu cancelar por algum problema ou limitação, adoraríamos ouvir seu feedback.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Mudou de ideia?</h3>
            <p>Você pode reativar sua assinatura a qualquer momento através do dashboard.</p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://app.whatsai.com.br'}/subscription" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reativar Assinatura
                </a>
            </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Tem alguma sugestão ou feedback?<br>
            📧 Email: <a href="mailto:feedback@whatsai.com.br" style="color: #667eea;">feedback@whatsai.com.br</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            © ${new Date().getFullYear()} WhatsAI. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: 'Assinatura Cancelada - WhatsAI',
      html,
    });
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
