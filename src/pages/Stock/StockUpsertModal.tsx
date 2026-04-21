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
import {
  StockItem,
  createStockItemAPI,
  updateStockItemAPI,
} from "@/data/api/StockAPI";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type StockFormValues = {
  nome: string;
  codigo_barras: string;
  descricao: string;
  categoria: string;
  marca: string;
  unidade_medida: string;
  preco_custo: string;
  preco_venda: string;
  quantidade_estoque: string;
  estoque_minimo: string;
  ativo: boolean;
};

const DEFAULT_VALUES: StockFormValues = {
  nome: "",
  codigo_barras: "",
  descricao: "",
  categoria: "",
  marca: "",
  unidade_medida: "un",
  preco_custo: "",
  preco_venda: "",
  quantidade_estoque: "0",
  estoque_minimo: "0",
  ativo: true,
};

interface StockUpsertModalProps {
  open: boolean;
  item?: StockItem | null;
  onOpenChange: (open: boolean) => void;
}

const toOptionalNumber = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toInteger = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function StockUpsertModal({
  open,
  item,
  onOpenChange,
}: StockUpsertModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<StockFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        nome: item?.name ?? "",
        codigo_barras: item?.barcode ?? "",
        descricao: item?.description ?? "",
        categoria: item?.category ?? "",
        marca: item?.brand ?? "",
        unidade_medida: item?.unitMeasure ?? "un",
        preco_custo: item?.costPrice != null ? String(item.costPrice) : "",
        preco_venda: item?.salePrice != null ? String(item.salePrice) : "",
        quantidade_estoque: String(item?.stockQuantity ?? 0),
        estoque_minimo: String(item?.minimumStock ?? 0),
        ativo: item?.isActive ?? true,
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [form, item, open]);

  const handleSave = async (values: StockFormValues) => {
    try {
      const normalizedName = values.nome.trim();
      if (!normalizedName) {
        toast.error("Informe o nome da peca.");
        return;
      }

      const payload = {
        nome: normalizedName,
        codigo_barras: values.codigo_barras.trim() || null,
        descricao: values.descricao.trim() || null,
        categoria: values.categoria.trim() || null,
        marca: values.marca.trim() || null,
        unidade_medida: values.unidade_medida.trim() || "un",
        preco_custo: toOptionalNumber(values.preco_custo),
        preco_venda: toOptionalNumber(values.preco_venda),
        quantidade_estoque: toInteger(values.quantidade_estoque),
        estoque_minimo: toInteger(values.estoque_minimo),
        ativo: values.ativo,
      };

      if (item?.id) {
        await updateStockItemAPI(item.id, payload);
      } else {
        await createStockItemAPI(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["get_stock_items"] });
      toast.success(item?.id ? "Produto atualizado." : "Produto criado.");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possivel salvar o produto.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Cadastre e atualize os produtos do estoque.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome"
              placeholder="Ex: Parachoque dianteiro"
              {...form.register("nome", { required: true })}
            />
            <Input
              label="Codigo de barras"
              placeholder="Ex: 7890000000000"
              {...form.register("codigo_barras")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Categoria" placeholder="Ex: Lataria" {...form.register("categoria")} />
            <Input label="Marca" placeholder="Ex: Fiat" {...form.register("marca")} />
            <Input label="Unidade" placeholder="un" {...form.register("unidade_medida")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Preço de custo"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register("preco_custo")}
            />
            <Input
              label="Preço de venda"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register("preco_venda")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Quantidade em estoque"
              type="number"
              min="0"
              placeholder="0"
              {...form.register("quantidade_estoque")}
            />
            <Input
              label="Estoque minimo"
              type="number"
              min="0"
              placeholder="0"
              {...form.register("estoque_minimo")}
            />
          </div>

          <Textarea
            label="Descrição"
            placeholder="Detalhes do produto"
            className="min-h-24"
            {...form.register("descricao")}
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.watch("ativo")}
              onChange={(event) => form.setValue("ativo", event.target.checked)}
              className="peer sr-only"
            />
            <span
              className={`relative inline-flex h-5 w-10 shrink-0 rounded-full transition-colors duration-200 ease-out ${
                form.watch("ativo") ? "bg-[var(--theme-highlight)]" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                  form.watch("ativo") ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
            Produto ativo
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
