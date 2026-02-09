import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChefHat, Loader2 } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const { login, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Email ou senha incorretos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Digite seu email para recuperar a senha');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperacao');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Montuvia</CardTitle>
            <CardDescription>Sistema de Controle de Estoque</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setResetSent(false); }}
                required
              />
            </div>
            {!showReset && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {resetSent && (
              <p className="text-sm text-green-600">
                Email de recuperacao enviado. Verifique sua caixa de entrada.
              </p>
            )}

            {!showReset ? (
              <>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                  ) : (
                    'Entrar'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setError(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                  Esqueceu a senha?
                </button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleResetPassword}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    'Enviar email de recuperacao'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); setResetSent(false); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                  Voltar ao login
                </button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
