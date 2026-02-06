import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChefHat } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError('Usuário ou senha inválidos');
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
            <CardTitle className="text-2xl">Sistema de Controle de Estoque</CardTitle>
            <CardDescription>Gestão de operações do restaurante</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@restaurante.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-2 text-sm text-gray-600">
            <p className="font-semibold">Usuários de demonstração:</p>
            <div className="space-y-1 text-xs">
              <p>• <span className="font-medium">Administrador:</span> admin@restaurante.com</p>
              <p>• <span className="font-medium">Gerência:</span> gerente@restaurante.com</p>
              <p>• <span className="font-medium">Operação:</span> cozinha@restaurante.com</p>
              <p className="text-gray-500 mt-2 italic">Qualquer senha é aceita</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
