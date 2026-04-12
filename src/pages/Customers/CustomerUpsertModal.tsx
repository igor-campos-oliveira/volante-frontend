import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import MaskedInput from "@/components/MaskedInput/MaskedInput";
import { MASKS } from "@/lib/utils";
import { supabase } from "@/utils/supabase";
import { Costumer } from "@/data/api/CustomersAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useEffect } from "react";

type CustomerFormValues = Costumer;

const DEFAULT_VALUES: CustomerFormValues = {
  nome: "",
  telefone: "",
  email: "",
  endereco: "",
  numero_documento: "",
  tipo_documento: "cpf",
};

interface CustomerUpsertModalProps {
  open: boolean;
  customer?: Costumer | null;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerUpsertModal({
  open,
  customer,
  onOpenChange,
}: CustomerUpsertModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<CustomerFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        ...customer,
        tipo_documento: customer?.tipo_documento ?? "cpf",
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [customer, form, open]);

  const handleSave = async (values: CustomerFormValues) => {
    const payload = {
      nome: values.nome.trim(),
      telefone: values.telefone.trim(),
      email: values.email?.trim() || "",
      endereco: values.endereco?.trim() || "",
      numero_documento: values.numero_documento?.trim() || "",
      tipo_documento: values.tipo_documento ?? null,
    };

    const request = customer?.id
      ? supabase.from("clientes").update(payload).eq("id", customer.id)
      : supabase.from("clientes").insert([payload]);

    const { error } = await request;

    if (error) {
      toast.error(error.message || "Nao foi possivel salvar o cliente.");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["get_customers"] });
    toast.success(customer?.id ? "Cliente atualizado." : "Cliente criado.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {customer?.id ? "Editar cliente" : "Adicionar cliente"}
          </DialogTitle>
          <DialogDescription>
            Salve os dados do cliente direto no Supabase.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(handleSave)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome"
              placeholder="Digite o nome do cliente"
              {...form.register("nome", { required: true })}
            />
            <Controller
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <MaskedInput
                  {...field}
                  disabled={false}
                  label="Telefone"
                  mask={MASKS.CELL_PHONE}
                  maskChar=""
                  placeholder="(00) 00000-0000"
                />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Email"
              placeholder="cliente@email.com"
              type="email"
              {...form.register("email")}
            />
          <Controller
            control={form.control}
            name="tipo_documento"
            render={({ field }) => (
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">Documento</span>
                <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <Select
                    value={field.value ?? "cpf"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-9 w-[92px] rounded-none border-0 bg-muted/40 px-2 shadow-none focus:ring-0">
                      <pre className="font-mono text-xs font-semibold uppercase">
                        {String(field.value ?? "cpf").toUpperCase()}
                      </pre>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="rg">RG</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Controller
                    control={form.control}
                    name="numero_documento"
                    render={({ field: documentField }) => (
                      <input
                        {...documentField}
                        className="h-9 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Digite o documento"
                      />
                    )}
                  />
                </div>
              </span>
            )}
          />
          </div>

          <Textarea
            label="Endereço"
            placeholder="Digite o endereço"
            className="min-h-24"
            {...form.register("endereco")}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button loading={form.formState.isSubmitting} type="submit">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
