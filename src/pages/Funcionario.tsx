import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, LogOut, Moon, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Funcionario() {
  const [userName, setUserName] = useState("");
  const [chamados, setChamados] = useState<any[]>([]);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<any>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [resposta, setResposta] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
    fetchChamados();
  }, [filtroStatus]);

  const checkUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, papel")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      if (profile.papel !== 'funcionario') {
        toast({
          title: "Acesso negado",
          description: "Apenas funcionários podem acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      setUserName(profile.nome);
    }
  };

  const fetchChamados = async () => {
    try {
      let query = supabase
        .from("chamados")
        .select(`
          *,
          categorias (nome)
        `)
        .order("created_at", { ascending: false });

      if (filtroStatus && filtroStatus !== 'todos') {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Erro ao buscar chamados:", error);
        toast({
          title: "Erro ao carregar chamados",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        console.log("Chamados carregados:", data.length);
        setChamados(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar chamados:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchRespostas = async (chamadoId: string) => {
    const { data } = await supabase
      .from("respostas")
      .select(`
        *,
        profiles (nome)
      `)
      .eq("chamado_id", chamadoId)
      .order("created_at", { ascending: true });

    if (data) setRespostas(data);
  };

  const selecionarChamado = async (chamado: any) => {
    setChamadoSelecionado(chamado);
    await fetchRespostas(chamado.id);

    // Realtime
    const channel = supabase
      .channel(`chamado-${chamado.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'respostas',
          filter: `chamado_id=eq.${chamado.id}`
        },
        () => {
          fetchRespostas(chamado.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const enviarResposta = async () => {
    if (!resposta.trim() || !chamadoSelecionado) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("respostas").insert({
        chamado_id: chamadoSelecionado.id,
        usuario_id: user.id,
        mensagem: resposta,
        is_ia: false,
      });

      if (error) throw error;

      // Atualizar status do chamado
      await supabase
        .from("chamados")
        .update({ status: "Em andamento" })
        .eq("id", chamadoSelecionado.id);

      setResposta("");
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada ao aluno.",
      });
      
      fetchRespostas(chamadoSelecionado.id);
      fetchChamados();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const concluirChamado = async () => {
    if (!chamadoSelecionado) return;

    try {
      const { error } = await supabase
        .from("chamados")
        .update({ status: "Resolvido" })
        .eq("id", chamadoSelecionado.id);

      if (error) throw error;

      toast({
        title: "Chamado resolvido",
        description: "O chamado foi marcado como resolvido.",
      });

      fetchChamados();
      setChamadoSelecionado({ ...chamadoSelecionado, status: "Resolvido" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    toast({
      title: "Tema alterado",
      description: "O tema foi alterado com sucesso.",
    });
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const variants: any = {
      'Urgente': 'destructive',
      'Alta': 'destructive',
      'Média': 'default',
      'Baixa': 'secondary',
    };
    return <Badge variant={variants[prioridade] || 'default'}>{prioridade}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-60 bg-primary text-primary-foreground flex flex-col">
          <div className="p-6">
            <h2 className="font-semibold text-lg">{userName}</h2>
            <p className="text-sm opacity-90">Funcionário</p>
          </div>

          <nav className="flex-1 px-3">
            <Button
              variant="secondary"
              className="w-full justify-start mb-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            >
              Chamados
            </Button>
          </nav>

          <div className="p-3 border-t border-primary-foreground/20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/20">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleTheme}>
                  <Moon className="mr-2 h-4 w-4" />
                  Mudar Tema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start mt-2 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b p-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Painel de Atendimento</h1>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Aberto">Aberto</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Aguardando resposta">Aguardando resposta</SelectItem>
                <SelectItem value="Resolvido">Resolvido</SelectItem>
                <SelectItem value="Fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </header>

          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de Chamados */}
              <Card>
                <CardHeader>
                  <CardTitle>Chamados ({chamados.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {chamados.map((chamado) => (
                    <div
                      key={chamado.id}
                      onClick={() => selecionarChamado(chamado)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                        chamadoSelecionado?.id === chamado.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{chamado.titulo}</p>
                          <p className="text-sm text-muted-foreground">
                            {chamado.nome_aluno} - {chamado.curso}
                          </p>
                        </div>
                        {getPrioridadeBadge(chamado.prioridade)}
                      </div>
                      <div className="flex gap-2 items-center text-xs text-muted-foreground">
                        <Badge variant="outline">{chamado.status}</Badge>
                        <span>#{chamado.numero_chamado}</span>
                        <span>{format(new Date(chamado.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  ))}
                  {chamados.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum chamado encontrado
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Detalhes do Chamado */}
              {chamadoSelecionado ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhes do Chamado #{chamadoSelecionado.numero_chamado}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Aluno</p>
                        <p className="font-medium">{chamadoSelecionado.nome_aluno}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">RA</p>
                          <p className="font-medium">{chamadoSelecionado.ra}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Curso</p>
                          <p className="font-medium">{chamadoSelecionado.curso}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{chamadoSelecionado.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Categoria</p>
                        <p className="font-medium">{chamadoSelecionado.categorias?.nome || "Sem categoria"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                        <div className="bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap">{chamadoSelecionado.descricao}</p>
                        </div>
                      </div>
                      
                      {chamadoSelecionado.status !== 'Resolvido' && chamadoSelecionado.status !== 'Fechado' && (
                        <Button onClick={concluirChamado} variant="outline" className="w-full">
                          Marcar como Resolvido
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Conversa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {respostas.length > 0 && (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {respostas.map((resp) => (
                            <div
                              key={resp.id}
                              className="bg-muted p-3 rounded-md"
                            >
                              <div className="flex items-center gap-2 mb-1">
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
                      
                      {chamadoSelecionado.status !== 'Resolvido' && chamadoSelecionado.status !== 'Fechado' && (
                        <>
                          <Textarea
                            value={resposta}
                            onChange={(e) => setResposta(e.target.value)}
                            placeholder="Digite sua resposta para o aluno..."
                            rows={4}
                          />
                          <Button onClick={enviarResposta} className="w-full" disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Resposta
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">
                      Selecione um chamado para visualizar os detalhes
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
