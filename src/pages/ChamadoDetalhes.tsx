import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Bot, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chamado, setChamado] = useState<any>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resposta, setResposta] = useState("");
  const [setorSelecionado, setSetorSelecionado] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const [respostaIA, setRespostaIA] = useState("");

  useEffect(() => {
    fetchChamado();
    fetchRespostas();

    const channel = supabase
      .channel(`chamado-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'respostas',
          filter: `chamado_id=eq.${id}`
        },
        () => {
          fetchRespostas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchChamado = async () => {
    try {
      const { data, error } = await supabase
        .from("chamados")
        .select(`
          *,
          categorias (nome)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setChamado(data);
    } catch (error) {
      console.error("Erro ao buscar chamado:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o chamado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRespostas = async () => {
    const { data } = await supabase
      .from("respostas")
      .select(`
        *,
        profiles (nome)
      `)
      .eq("chamado_id", id)
      .order("created_at", { ascending: true });

    if (data) setRespostas(data);
  };

  const consultarIA = async () => {
    if (!chamado) return;
    
    setLoadingIA(true);
    try {
      const { data, error } = await supabase.functions.invoke("faq-ia", {
        body: {
          pergunta: `${chamado.titulo}\n\n${chamado.descricao}`,
          categoriaId: chamado.categoria_id,
        },
      });

      if (error) throw error;

      setRespostaIA(data.resposta);
      toast({
        title: "Resposta da IA gerada",
        description: "A IA analisou seu chamado e sugeriu uma solução.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao consultar IA",
        variant: "destructive",
      });
    } finally {
      setLoadingIA(false);
    }
  };

  const enviarResposta = async () => {
    if (!resposta.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("respostas").insert({
        chamado_id: id,
        usuario_id: user.id,
        mensagem: resposta,
        is_ia: false,
      });

      if (error) throw error;

      setResposta("");
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi adicionada ao chamado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const encaminharSetor = async () => {
    if (!setorSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione um setor para encaminhar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("chamados")
        .update({
          setor_responsavel: setorSelecionado,
          status: "Em andamento",
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Chamado encaminhado",
        description: `Chamado encaminhado para o setor ${setorSelecionado}.`,
      });
      
      fetchChamado();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!chamado) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p>Chamado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Chamado */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Chamado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Aluno</p>
              <p className="font-medium">{chamado.nome_aluno}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">RA</p>
                <p className="font-medium">{chamado.ra}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Curso</p>
                <p className="font-medium">{chamado.curso}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{chamado.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID Chamado</p>
                <p className="font-medium">{chamado.numero_chamado}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{chamado.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prioridade</p>
              <Badge variant="destructive">{chamado.prioridade}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categoria</p>
              <p className="font-medium">{chamado.categorias?.nome || "Sem categoria"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Descrição da dúvida</p>
              <div className="bg-muted p-4 rounded-md max-h-48 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{chamado.descricao}</p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <Button
                onClick={consultarIA}
                disabled={loadingIA}
                variant="outline"
                className="w-full"
              >
                {loadingIA ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando IA...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Consultar IA
                  </>
                )}
              </Button>

              {respostaIA && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2 mb-2">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Sugestão da IA:</p>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                    {respostaIA}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações e Respostas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Encaminhar para Setor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Para qual setor deseja enviar?</Label>
                <Select
                  value={setorSelecionado}
                  onValueChange={setSetorSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolher Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TI">TI</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={encaminharSetor} className="w-full">
                Enviar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responder Chamado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {respostas.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {respostas.map((resp) => (
                    <div
                      key={resp.id}
                      className="bg-muted p-3 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {resp.is_ia && <Bot className="h-4 w-4" />}
                        <p className="text-sm font-medium">
                          {resp.profiles?.nome || "Sistema"}
                        </p>
                        <p className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(resp.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{resp.mensagem}</p>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite sua resposta..."
                rows={4}
              />
              <Button onClick={enviarResposta} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Enviar Resposta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
