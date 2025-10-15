import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check } from "lucide-react";

export default function CriarFuncionario() {
  const [loading, setLoading] = useState(false);
  const [credenciais, setCredenciais] = useState<{email: string, senha: string} | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
    setor: "",
  });
  const { toast } = useToast();

  const gerarSenha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let senha = "";
    for (let i = 0; i < 12; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, senha });
  };

  const copiarCredenciais = () => {
    if (credenciais) {
      const texto = `Email: ${credenciais.email}\nSenha: ${credenciais.senha}`;
      navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      toast({
        title: "Credenciais copiadas!",
        description: "As credenciais foram copiadas para a área de transferência.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("criar-funcionario", {
        body: formData,
      });

      if (error) throw error;

      setCredenciais({
        email: formData.email,
        senha: formData.senha,
      });

      toast({
        title: "Funcionário criado!",
        description: "As credenciais foram geradas com sucesso.",
      });

      // Limpar formulário
      setFormData({
        email: "",
        senha: "",
        nome: "",
        setor: "",
      });
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Criar Conta de Funcionário</CardTitle>
            <CardDescription>
              Preencha os dados para criar uma nova conta de funcionário.
              O funcionário usará essas credenciais para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Funcionário *</Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setor">Setor *</Label>
                <Input
                  id="setor"
                  type="text"
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  required
                  placeholder="Ex: TI, RH, Financeiro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="funcionario@escola.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <div className="flex gap-2">
                  <Input
                    id="senha"
                    type="text"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required
                    placeholder="Senha do funcionário"
                    minLength={6}
                  />
                  <Button type="button" onClick={gerarSenha} variant="outline">
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres. Clique em "Gerar" para criar uma senha segura.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Funcionário"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {credenciais && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-green-600">Funcionário Criado!</CardTitle>
              <CardDescription>
                Anote ou copie estas credenciais. Elas não serão exibidas novamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div>
                  <p className="text-sm font-medium">Email:</p>
                  <p className="font-mono">{credenciais.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Senha:</p>
                  <p className="font-mono">{credenciais.senha}</p>
                </div>
              </div>
              <Button onClick={copiarCredenciais} variant="outline" className="w-full">
                {copiado ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Credenciais
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                O funcionário deve fazer login em /auth usando estas credenciais.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
