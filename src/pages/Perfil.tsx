import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { User, Mail, Shield, Key, Building2, Calendar, Phone } from 'lucide-react';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function Perfil() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '(11) 98765-4321', // Mock phone since it's not in user type
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    // Simula uma chamada de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Perfil atualizado com sucesso!');
    console.log('Dados atualizados:', data);
  };

  const onPasswordSubmit = async (data: ProfileFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Senha alterada com sucesso!');
    reset({ ...data, currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  if (!user) return null;

  // Iniciais para o avatar
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const roleLabels = {
    administrador: 'Administrador',
    gerencia: 'Gerência',
    operacao: 'Operação'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Minha Conta</h1>
        <p className="text-gray-500 mt-1">Gerencie suas informações pessoais e segurança</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Cartão de Resumo do Perfil */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 mb-4 relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=f97316&color=fff`} />
                <AvatarFallback className="bg-orange-100 text-orange-600 text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full" title="Online"></div>
            </div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <div className="mt-4 flex justify-center">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                {roleLabels[user.role]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>Unidade Matriz</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Membro desde Jan 2024</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Acesso: {user.role === 'administrador' ? 'Total' : user.role === 'gerencia' ? 'Gerencial' : 'Operacional'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulários de Edição */}
        <div className="md:col-span-2">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Atualize seus dados de contato e identificação.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="name" 
                          className="pl-9" 
                          {...register('name', { required: 'Nome é obrigatório' })} 
                        />
                      </div>
                      {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Corporativo</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="email" 
                          type="email" 
                          className="pl-9" 
                          {...register('email', { required: 'Email é obrigatório' })} 
                        />
                      </div>
                      {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="phone" 
                          className="pl-9" 
                          {...register('phone')} 
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguranca">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>Mantenha sua conta segura atualizando sua senha regularmente.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="currentPassword" 
                          type="password" 
                          className="pl-9"
                          {...register('currentPassword')} 
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-2" />

                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="newPassword" 
                          type="password" 
                          className="pl-9"
                          {...register('newPassword')} 
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          className="pl-9"
                          {...register('confirmPassword')} 
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" variant="outline" disabled={isLoading}>
                        {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
