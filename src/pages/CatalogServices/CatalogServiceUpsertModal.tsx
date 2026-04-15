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
import SelectOption from "@/components/ui/selectOptions";
import {
  CatalogService,
  CatalogServiceRequiredItem,
  createCatalogServiceAPI,
  updateCatalogServiceAPI,
} from "@/data/api/CatalogServicesAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
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
  itens_necessarios: string;
};

const DEFAULT_VALUES: CatalogServiceFormValues = {
  descricao: "",
  tipo: "",
  valor: "R$ 0,00",
  custo: "R$ 0,00",
  ativo: true,
  itens_necessarios: "[]",
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

const getGrossProfitTextClass = (grossProfit: number) =>
  grossProfit <= 0 ? "text-red-600" : "text-green-600";
const parseRequiredItemsInput = (rawValue: string): CatalogServiceRequiredItem[] => {
  if (!rawValue.trim()) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    throw new Error("Itens necessarios deve ser um JSON valido.");
  }

  if (!Array.isArray(parsedValue)) {
    throw new Error("Itens necessarios deve ser uma lista JSON.");
  }

  return parsedValue
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = String((entry as { item?: unknown }).item ?? "").trim();
      const valor = Number((entry as { valor?: unknown }).valor ?? 0);

      if (!item) {
        return null;
      }

      return {
        item,
        valor: Number.isFinite(valor) ? valor : 0,
      };
    })
    .filter((entry): entry is CatalogServiceRequiredItem => Boolean(entry));
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
  const watchedValue = form.watch("valor");
  const watchedCost = form.watch("custo");

  const grossProfit = useMemo(() => {
    const value = parseCurrencyInput(watchedValue || "R$ 0,00");
    const cost = parseCurrencyInput(watchedCost || "R$ 0,00");
    return value - cost;
  }, [watchedCost, watchedValue]);

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        descricao: service?.description ?? "",
        tipo: service?.type ?? "",
        valor: moneyFormatter.format(service?.value ?? 0),
        custo: moneyFormatter.format(service?.cost ?? 0),
        ativo: service?.isActive ?? true,
        itens_necessarios: JSON.stringify(service?.requiredItems ?? [], null, 2),
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
        itens_necessarios: parseRequiredItemsInput(values.itens_necessarios),
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

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-xs text-zinc-500">Lucro bruto (valor - custo)</p>
            <p className={`text-base font-semibold ${getGrossProfitTextClass(grossProfit)}`}>
              {moneyFormatter.format(grossProfit)}
            </p>
          </div>

          <Textarea
            label="Itens necessarios (JSON)"
            className="min-h-[130px] font-mono text-xs"
            placeholder={'[{"item":"massa de polir","valor":20}]'}
            {...form.register("itens_necessarios")}
          />

          <Controller
            name="ativo"
            control={form.control}
            render={({ field }) => (
              <label className="mt-2 flex items-center gap-2 text-base font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`relative inline-flex h-5 w-5 items-center justify-center rounded border transition-all duration-200 ease-out ${
                    field.value
                      ? "border-[var(--theme-highlight)] bg-white"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  <span
                    className={`absolute inset-0 rounded-[3px] bg-[var(--theme-highlight)] transition-transform duration-300 ease-out ${
                      field.value ? "scale-100" : "scale-0"
                    }`}
                  />
                  <Check
                    size={13}
                    className={`relative z-10 text-white transition-all duration-200 ease-out ${
                      field.value ? "scale-100 opacity-100 delay-100" : "scale-75 opacity-0"
                    }`}
                  />
                </span>
                Serviço ativo
              </label>
            )}
          />

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
