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
import SelectOption from "@/components/ui/selectOptions";
import {
  CatalogService,
  createCatalogServiceAPI,
  updateCatalogServiceAPI,
} from "@/data/api/CatalogServicesAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";

interface ServiceTypeOption {
  value: string;
  label: string;
  color?: string;
}

type CatalogServiceFormValues = {
  descricao: string;
  tipo: string;
  valor: string;
  custo: string;
  ativo: boolean;
};

const DEFAULT_VALUES: CatalogServiceFormValues = {
  descricao: "",
  tipo: "",
  valor: "R$ 0,00",
  custo: "R$ 0,00",
  ativo: true,
};

interface CatalogServiceUpsertModalProps {
  open: boolean;
  service?: CatalogService | null;
  typeOptions: ServiceTypeOption[];
  onOpenChange: (open: boolean) => void;
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const numberValue = Number(digits || "0") / 100;
  return moneyFormatter.format(numberValue);
};

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return Number(digits || "0") / 100;
};

export default function CatalogServiceUpsertModal({
  open,
  service,
  typeOptions,
  onOpenChange,
}: CatalogServiceUpsertModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<CatalogServiceFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        descricao: service?.description ?? "",
        tipo: service?.type ?? "",
        valor: moneyFormatter.format(service?.value ?? 0),
        custo: moneyFormatter.format(service?.cost ?? 0),
        ativo: service?.isActive ?? true,
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [form, open, service]);

  const handleSave = async (values: CatalogServiceFormValues) => {
    try {
      const payload = {
        descricao: values.descricao,
        tipo: values.tipo,
        valor: parseCurrencyInput(values.valor),
        custo: parseCurrencyInput(values.custo),
        ativo: values.ativo,
      };

      if (service?.id) {
        await updateCatalogServiceAPI(service.id, payload);
      } else {
        await createCatalogServiceAPI(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["get_car_services"] });
      toast.success(service?.id ? "Servico atualizado." : "Servico criado.");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar o servico.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            Preencha os campos para cadastar serviços.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Descrição"
              placeholder="Ex: Polimento tecnico"
              {...form.register("descricao", { required: true })}
            />
            <Controller
              name="tipo"
              control={form.control}
              render={({ field }) => (
                <SelectOption
                  {...field}
                  label="Tipo"
                  placeholder="Selecione..."
                  options={typeOptions}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="valor"
              control={form.control}
              render={({ field }) => (
                <Input
                  label="Valor"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(event) => field.onChange(formatCurrencyInput(event.target.value))}
                />
              )}
            />
            <Controller
              name="custo"
              control={form.control}
              render={({ field }) => (
                <Input
                  label="Custo"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(event) => field.onChange(formatCurrencyInput(event.target.value))}
                />
              )}
            />
          </div>

          <div>
            <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" {...form.register("ativo")} />
              Serviço ativo
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="transition-colors hover:!bg-violet-100"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
