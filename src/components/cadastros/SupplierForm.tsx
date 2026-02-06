import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';

interface SupplierFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function SupplierForm({ initialData, onSave, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    deliveryTime: '',
    paymentTerms: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        contact: initialData.contact || '',
        deliveryTime: initialData.deliveryTime?.toString() || '',
        paymentTerms: initialData.paymentTerms || ''
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.contact || !formData.deliveryTime || !formData.paymentTerms) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Convert deliveryTime to number
    const data = {
      name: formData.name,
      contact: formData.contact,
      deliveryTime: parseInt(formData.deliveryTime, 10),
      paymentTerms: formData.paymentTerms,
    };

    onSave(data);
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="supplierName">Nome do Fornecedor *</Label>
        <Input 
          id="supplierName" 
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ex: Hortifruti São José" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact">Contato *</Label>
        <Input 
          id="contact" 
          value={formData.contact}
          onChange={(e) => handleChange('contact', e.target.value)}
          placeholder="(11) 98765-4321" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliveryTime">Tempo de Entrega (dias) *</Label>
        <Input 
          id="deliveryTime" 
          type="number" 
          value={formData.deliveryTime}
          onChange={(e) => handleChange('deliveryTime', e.target.value)}
          placeholder="1" 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentTerms">Condições de Pagamento *</Label>
        <Input 
          id="paymentTerms" 
          value={formData.paymentTerms}
          onChange={(e) => handleChange('paymentTerms', e.target.value)}
          placeholder="Ex: À vista, 7 dias, 14 dias" 
        />
      </div>
      
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit}>
          {initialData ? 'Salvar Alterações' : 'Salvar Fornecedor'}
        </Button>
      </DialogFooter>
    </div>
  );
}