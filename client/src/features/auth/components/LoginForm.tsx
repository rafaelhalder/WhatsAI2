import { useState } from 'react';
import { Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { userAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const login = userAuthStore((state) => state.login)
  const loading = userAuthStore((state) => state.loading)
  const error = userAuthStore((state) => state.error)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset
  } = useForm({
    defaultValues: {
      email: "",
      password: ""
    },
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    const success = await login(data);
    if (success) {
      toast.success('Login realizado com sucesso!');
      reset(); 
      
      // Redirecionar para a página anterior ou dashboard
      const fromState = (location.state as any)?.from;
      // Garantir que from é uma string
      const from = typeof fromState === 'string' ? fromState : (fromState?.pathname || '/dashboard');
      const selectedPlan = localStorage.getItem('selectedPlan');
      
      console.log('🔑 [LoginForm] Login success - Redirect logic:', {
        fromState,
        from,
        locationState: location.state,
        selectedPlan,
        willNavigateTo: from === '/pricing' && selectedPlan ? '/pricing' : from
      });
      
      // Se veio da pricing e tinha plano selecionado, voltar para pricing
      if (from === '/pricing' && selectedPlan) {
        console.log('✅ [LoginForm] Voltando para /pricing com plano:', selectedPlan);
        navigate('/pricing');
      } else {
        console.log('➡️ [LoginForm] Indo para:', from);
        navigate(from);
      }
    } else {
      setError("root", {
        message: error || "Login failed"
      });
      toast.error(error || "Login failed");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className='w-full'>
      <form className='space-y-4 md:space-y-6' onSubmit={handleSubmit(onSubmit)}>
        {/* Show general form errors */}
        {errors.root && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{errors.root.message}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className='block text-sm font-medium mb-1 text-base-content'>
            Email
          </label>
          <div className='relative'>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className='h-4 w-4 md:h-5 md:w-5 text-base-content/60' />
            </div>
            <input
              id='email'
              {...register("email")}
              type='email'
              placeholder='Digite seu e-mail'
              className='w-full pl-10 pr-3 py-2 text-sm md:text-base border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-base-100 text-base-content placeholder-base-content/60'
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs md:text-sm text-error">
              {errors.email.message}
            </p>
          )}
        </div>
        {/* Password Field */}
        <div>
          <label htmlFor="password" className='block text-sm font-medium mb-1 text-base-content'>
            Password
          </label>
          <div className='relative'>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className='h-4 w-4 md:h-5 md:w-5 text-base-content/60' />
            </div>
            <input
              id="password"
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
              className='w-full pl-10 pr-10 py-2 text-sm md:text-base border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-base-100 text-base-content placeholder-base-content/60'
            />
            <button
              type='button'
              className='absolute inset-y-0 right-0 pr-3 flex items-center'
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className='h-4 w-4 md:h-5 md:w-5 text-base-content/60 hover:text-base-content' />
              ) : (
                <Eye className='h-4 w-4 md:h-5 md:w-5 text-base-content/60 hover:text-base-content' />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs md:text-sm text-error">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className='flex items-center justify-end'>
          <a href="#" className='text-xs md:text-sm text-primary hover:text-primary-focus'>
            Forget your password?
          </a>
        </div>
        <button type='submit'
          disabled={isSubmitting || loading}
          className='w-full py-2 px-4 text-sm md:text-base text-primary-content font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-focus focus:ring-offset-2'
        >
          {isSubmitting || loading ? (
            <span className="flex items-center justify-center">
              <span className='loading loading-infinity loading-lg'>
                Logging in...
              </span>
            </span>
          ) : (
            "Login"
          )}
        </button>
      </form>

      <div className='relative my-4 md:my-6'>
        <div className="absolute inset-0 flex items-center">
          <div className='w-full border-t border-base-300'></div>
        </div>
        <div className='relative flex justify-center text-xs md:text-sm'>
          <span className='px-2 bg-base-100 text-base-content/60'>
            Don't have an account?
          </span>
        </div>
      </div>
      <button
        type='button'
        onClick={() => window.location.href = '/register'}
        className='w-full flex items-center justify-center gap-2 py-2 px-4 border border-base-300 rounded-md transition-colors text-sm md:text-base bg-base-100 hover:bg-base-200 text-base-content'
      >
        <span className='ml-1'>Cadastrar-se</span>
      </button>
    </div>
  );
}

export default LoginForm;