import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Mail, Briefcase, Clock, ShieldCheck, CalendarCheck, Send } from 'lucide-react';

interface TeamDetailsProps {
  data: any;
  onEdit: () => void;
  onResendInvite?: (email: string, name: string) => void;
}

export function TeamDetails({ data, onEdit, onResendInvite }: TeamDetailsProps) {
  if (!data) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Ativo</Badge>;
      case 'inativo': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Inativo</Badge>;
      case 'ferias': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Férias</Badge>;
      default: return null;
    }
  };

  const getSectorLabel = (sector: string) => {
    switch (sector) {
      case 'cozinha': return 'Cozinha';
      case 'bar': return 'Bar';
      case 'salao': return 'Salão';
      case 'admin': return 'Administração';
      default: return sector;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${data.name}&background=f97316&color=fff`} />
            <AvatarFallback className="bg-orange-100 text-orange-600 text-xl font-bold">
              {data.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500">{data.position}</span>
              {getStatusBadge(data.status)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onResendInvite && data.email && (
            <Button variant="outline" onClick={() => onResendInvite(data.email, data.name)}>
              <Send className="w-4 h-4 mr-2" />
              Re-enviar Convite
            </Button>
          )}
          <Button onClick={onEdit}>Editar Perfil</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Informações de Contato</h3>
            
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-full">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">E-mail Profissional</p>
                <p className="font-medium">{data.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-full">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nível de Acesso</p>
                <p className="font-medium capitalize">{data.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Dados Operacionais</h3>
            
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-full">
                <Briefcase className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Setor</p>
                <p className="font-medium">{getSectorLabel(data.sector)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-full">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Turno</p>
                <p className="font-medium capitalize">{data.shift}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-gray-500" />
          Atividade Recente (Simulado)
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900">Realizou checklist de abertura</p>
                <p className="text-xs text-gray-500">Hoje, às 08:3{i} AM</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}