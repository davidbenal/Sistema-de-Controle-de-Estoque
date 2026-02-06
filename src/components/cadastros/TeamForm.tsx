import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogFooter } from '../ui/dialog';
import { toast } from 'sonner@2.0.3';

interface TeamFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export function TeamForm({ initialData, onSave, onCancel, isAdmin = false }: TeamFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    sector: '',
    position: '',
    shift: '',
    status: 'ativo'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || '',
        sector: initialData.sector || '',
        position: initialData.position || '',
        shift: initialData.shift || '',
        status: initialData.status || 'ativo'
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.role || !formData.sector || !formData.position || !formData.shift) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const data = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      sector: formData.sector,
      position: formData.position,
      shift: formData.shift,
    };

    onSave(data);
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="empName">Nome Completo *</Label>
        <Input 
          id="empName" 
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ex: Carlos Silva" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="empEmail">E-mail Profissional *</Label>
        <Input 
          id="empEmail" 
          type="email" 
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="carlos@restaurante.com" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="empRole">Nível de Acesso *</Label>
          <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
            <SelectTrigger id="empRole">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operacao">Operação</SelectItem>
              <SelectItem value="gerencia">Gerência</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="empSector">Setor de Atuação *</Label>
          <Select value={formData.sector} onValueChange={(v) => handleChange('sector', v)}>
            <SelectTrigger id="empSector">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozinha">Cozinha Quente</SelectItem>
              <SelectItem value="cozinha-fria">Cozinha Fria</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="salao">Salão / Atendimento</SelectItem>
              <SelectItem value="admin">Administração</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="empPosition">Cargo *</Label>
          <Input 
            id="empPosition" 
            value={formData.position}
            onChange={(e) => handleChange('position', e.target.value)}
            placeholder="Ex: Chef de Partie" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="empShift">Turno *</Label>
          <Select value={formData.shift} onValueChange={(v) => handleChange('shift', v)}>
            <SelectTrigger id="empShift">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manha">Manhã</SelectItem>
              <SelectItem value="noite">Noite</SelectItem>
              <SelectItem value="integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {initialData && isAdmin && (
        <div className="space-y-2 pt-2 border-t mt-2">
          <Label htmlFor="status">Status do Usuário</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit}>
          {initialData ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
        </Button>
      </DialogFooter>
    </div>
  );
}