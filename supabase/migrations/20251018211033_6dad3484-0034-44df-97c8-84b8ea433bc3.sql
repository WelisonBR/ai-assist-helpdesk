-- Atualizar função handle_new_user para usar curso ao invés de setor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, curso)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'curso', 'Não informado')
  );
  RETURN new;
END;
$$;