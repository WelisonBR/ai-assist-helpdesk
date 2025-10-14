import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChamadoFiltersProps {
  filters: {
    status: string;
    categoria: string;
    dataInicio: string;
    dataFim: string;
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function ChamadoFilters({ filters, onFiltersChange, onClose }: ChamadoFiltersProps) {
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("nome");
    
    if (data) setCategorias(data);
  };

  const handleReset = () => {
    onFiltersChange({
      status: "",
      categoria: "",
      dataInicio: "",
      dataFim: "",
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Filtros</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Aguardando resposta">Aguardando resposta</SelectItem>
              <SelectItem value="Resolvido">Resolvido</SelectItem>
              <SelectItem value="Fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={filters.categoria}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, categoria: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data Início</Label>
          <Input
            type="date"
            value={filters.dataInicio}
            onChange={(e) =>
              onFiltersChange({ ...filters, dataInicio: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Input
            type="date"
            value={filters.dataFim}
            onChange={(e) =>
              onFiltersChange({ ...filters, dataFim: e.target.value })
            }
          />
        </div>

        <div className="md:col-span-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Limpar
          </Button>
          <Button onClick={onClose}>Aplicar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
