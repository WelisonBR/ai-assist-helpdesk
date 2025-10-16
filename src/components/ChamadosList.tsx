import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChamadosListProps {
  filters: {
    status: string;
    categoria: string;
    dataInicio: string;
    dataFim: string;
  };
}

export function ChamadosList({ filters }: ChamadosListProps) {
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchChamados();

    const channel = supabase
      .channel('chamados-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chamados'
        },
        () => {
          fetchChamados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  const fetchChamados = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("chamados")
        .select(`
          *,
          categorias (nome)
        `)
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.categoria) {
        query = query.eq("categoria_id", filters.categoria);
      }

      if (filters.dataInicio) {
        query = query.gte("created_at", filters.dataInicio);
      }

      if (filters.dataFim) {
        query = query.lte("created_at", filters.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error("Erro ao buscar chamados:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletarChamado = async (e: React.MouseEvent, chamadoId: string) => {
    e.stopPropagation(); // Prevenir navegação ao clicar no botão deletar

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para deletar o chamado.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("chamados")
        .delete()
        .eq("id", chamadoId)
        .eq("usuario_id", user.id);
      
      if (error) {
        console.error("Erro ao deletar chamado:", error);
        throw error;
      }
      
      toast({
        title: "Chamado deletado",
        description: "Seu chamado foi deletado com sucesso.",
      });
      
      fetchChamados();
    } catch (error: any) {
      console.error("Erro detalhado:", error);
      toast({
        title: "Erro ao deletar chamado",
        description: error.message || "Não foi possível deletar o chamado.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Aberto": "destructive",
      "Em andamento": "default",
      "Aguardando resposta": "secondary",
      "Resolvido": "outline",
      "Fechado": "outline",
    };
    return colors[status] || "default";
  };

  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      "Baixa": "secondary",
      "Média": "default",
      "Alta": "destructive",
      "Urgente": "destructive",
    };
    return colors[prioridade] || "default";
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (chamados.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum chamado encontrado</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>ID Chamado</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Última atualização</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.map((chamado) => (
            <TableRow
              key={chamado.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/chamado/${chamado.id}`)}
            >
              <TableCell className="font-medium">{chamado.titulo}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(chamado.status) as any}>
                  {chamado.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getPrioridadeColor(chamado.prioridade) as any}>
                  {chamado.prioridade}
                </Badge>
              </TableCell>
              <TableCell>{chamado.numero_chamado}</TableCell>
              <TableCell>
                {format(new Date(chamado.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {format(new Date(chamado.updated_at), "dd/MM", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => deletarChamado(e, chamado.id)}
                  disabled={chamado.status === 'Concluído'}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
