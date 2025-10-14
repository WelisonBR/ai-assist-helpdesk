import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Moon, Sun, Filter } from "lucide-react";
import { ChamadosList } from "@/components/ChamadosList";
import { ChamadoFilters } from "@/components/ChamadoFilters";
import { NovoChamadoDialog } from "@/components/NovoChamadoDialog";

export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [userSetor, setUserSetor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    categoria: "",
    dataInicio: "",
    dataFim: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, setor")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserName(profile.nome);
        setUserSetor(profile.setor || "TI");
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-60 bg-primary text-primary-foreground flex flex-col">
          <div className="p-6">
            <h2 className="font-semibold text-lg">{userName}</h2>
            <p className="text-sm opacity-90">{userSetor}</p>
          </div>

          <nav className="flex-1 px-3">
            <Button
              variant="secondary"
              className="w-full justify-start mb-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            >
              Chamados
            </Button>
            <div className="mt-4">
              <p className="text-sm opacity-75 mb-2 px-3">Seus chamados em andamento:</p>
              {/* Lista será preenchida dinamicamente */}
            </div>
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
                <DropdownMenuItem>
                  Trocar senha
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
            <h1 className="text-2xl font-semibold">Chamados</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <NovoChamadoDialog />
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6">
            {showFilters && (
              <ChamadoFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
            <ChamadosList filters={filters} />
          </div>
        </div>
      </div>
    </div>
  );
}
