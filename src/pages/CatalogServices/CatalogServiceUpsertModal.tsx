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
  CatalogServiceRequiredItem,
  createCatalogServiceAPI,
  updateCatalogServiceAPI,
} from "@/data/api/CatalogServicesAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
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
  ativo: boolean;
  itens_necessarios: {
    item: string;
    valor: string;
  }[];
};

const DEFAULT_VALUES: CatalogServiceFormValues = {
  descricao: "",
  tipo: "",
  valor: "R$ 0,00",
  ativo: true,
  itens_necessarios: [],
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
const mapRequiredItemsToForm = (items?: CatalogServiceRequiredItem[]) => {
  if (!items?.length) {
    return [];
  }

  return items.map((entry) => ({
    item: entry.item,
    valor: moneyFormatter.format(entry.valor || 0),
  }));
};

const normalizeRequiredItems = (
  items: CatalogServiceFormValues["itens_necessarios"],
): CatalogServiceRequiredItem[] =>
  items
    .map((entry) => ({
      item: entry.item.trim(),
      valor: parseCurrencyInput(entry.valor || "R$ 0,00"),
    }))
    .filter((entry) => Boolean(entry.item));

export default function CatalogServiceUpsertModal({
  open,
  service,
  typeOptions,
  onOpenChange,
}: CatalogServiceUpsertModalProps) {
  const queryClient = useQueryClient();
  const [draftItemName, setDraftItemName] = useState("");
  const [draftItemValue, setDraftItemValue] = useState("R$ 0,00");
  const form = useForm<CatalogServiceFormValues>({
    defaultValues: DEFAULT_VALUES,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens_necessarios",
  });
  const watchedValue = form.watch("valor");
  const watchedRequiredItems = form.watch("itens_necessarios");
  const requiredItemsCost = useMemo(
    () =>
      (watchedRequiredItems || []).reduce(
        (sum, entry) => sum + parseCurrencyInput(entry?.valor || "R$ 0,00"),
        0,
      ),
    [watchedRequiredItems],
  );

  const grossProfit = useMemo(() => {
    const value = parseCurrencyInput(watchedValue || "R$ 0,00");
    const cost = requiredItemsCost;
    return value - cost;
  }, [requiredItemsCost, watchedValue]);

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        descricao: service?.description ?? "",
        tipo: service?.type ?? "",
        valor: moneyFormatter.format(service?.value ?? 0),
        ativo: service?.isActive ?? true,
        itens_necessarios: mapRequiredItemsToForm(service?.requiredItems),
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [form, open, service]);

  const handleSave = async (values: CatalogServiceFormValues) => {
    try {
      const requiredItems = normalizeRequiredItems(values.itens_necessarios);
      const calculatedCost = requiredItems.reduce((sum, entry) => sum + entry.valor, 0);

      const payload = {
        descricao: values.descricao,
        tipo: values.tipo,
        valor: parseCurrencyInput(values.valor),
        custo: calculatedCost,
        ativo: values.ativo,
        itens_necessarios: requiredItems,
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

  const handleAddRequiredItem = () => {
    const normalizedItemName = draftItemName.trim();
    if (!normalizedItemName) {
      toast.error("Informe o nome do item necessario.");
      return;
    }

    append({
      item: normalizedItemName,
      valor: draftItemValue || "R$ 0,00",
    });
    setDraftItemName("");
    setDraftItemValue("R$ 0,00");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
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
            <div className="grid gap-2">
              <p className="text-sm font-medium text-zinc-700">Custo (soma dos itens)</p>
              <div className="h-10 rounded-md border bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                {moneyFormatter.format(requiredItemsCost)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-xs text-zinc-500">Lucro bruto (valor - custo)</p>
            <p className={`text-base font-semibold ${getGrossProfitTextClass(grossProfit)}`}>
              {moneyFormatter.format(grossProfit)}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="rounded-md border p-2">
              <div className="grid grid-cols-[1fr_170px_44px] items-end gap-2 border-b pb-2">
                <Input
                  label="Item necessario"
                  placeholder="Ex: massa de polir"
                  value={draftItemName}
                  onChange={(event) => setDraftItemName(event.target.value)}
                />
                <Input
                  label="Valor"
                  type="text"
                  inputMode="numeric"
                  value={draftItemValue}
                  onChange={(event) => setDraftItemValue(formatCurrencyInput(event.target.value))}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-0 transition-colors hover:bg-black hover:text-white"
                  onClick={handleAddRequiredItem}
                  aria-label="Adicionar item necessario"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_170px_44px] items-center gap-2 px-1 pb-2 pt-2 text-xs font-semibold text-zinc-500">
                <span>Item necessario</span>
                <span className="text-right">Valor</span>
                <span className="text-center" />
              </div>
              <div className="h-[98px] space-y-2 overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_170px_44px] items-center gap-2">
                    <p className="rounded-md border bg-zinc-50 px-3 py-2 text-sm">
                      {form.getValues(`itens_necessarios.${index}.item` as const)}
                    </p>
                    <p className="rounded-md border bg-zinc-50 px-3 py-2 text-right text-sm">
                      {form.getValues(`itens_necessarios.${index}.valor` as const)}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-10 p-0 hover:bg-zinc-100"
                      onClick={() => remove(index)}
                      aria-label="Remover item necessario"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                ))}
                {fields.length === 0 && (
                  <p className="px-1 py-2 text-sm text-zinc-500">Nenhum item adicionado.</p>
                )}
              </div>
            </div>
          </div>

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
