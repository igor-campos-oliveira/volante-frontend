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
import type { AccountCreatePayload, ContaDashboardItem } from "@/data/api/AccountsAPI";
import { useEffect, useMemo, useState } from "react";

type AddAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AccountCreatePayload) => Promise<void>;
  loading: boolean;
  mode: "create" | "edit";
  account?: ContaDashboardItem | null;
};

const PAYMENT_METHOD_OPTIONS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartao de credito" },
  { value: "cartao_debito", label: "Cartao de debito" },
  { value: "transferencia", label: "Transferencia" },
];

const MOVEMENT_OPTIONS = [
  { value: "ganho", label: "Ganho" },
  { value: "despesa", label: "Despesa" },
];

const CATEGORY_OPTIONS = [
  { value: "aluguel", label: "Aluguel" },
  { value: "peca", label: "Peca" },
  { value: "salario", label: "Salario" },
  { value: "servico", label: "Servico" },
  { value: "imposto", label: "Imposto" },
  { value: "material", label: "Material" },
  { value: "contas", label: "Contas" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcial" },
  { value: "pago", label: "Pago" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
];

const TYPE_OPTIONS = [
  { value: "parcelado", label: "Parcelado" },
  { value: "a_vista", label: "A vista" },
];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const defaultFormValues = {
  descricao: "",
  valorRaw: "",
  valorNumber: 0,
  tipo: "a_vista",
  movimentacao: "despesa",
  categoria: "contas",
  status: "pendente",
  forma_pagamento: "pix",
  parcelas: "1",
  parcela_atual: "",
  data_pagamento: "",
};

const formatCurrencyInput = (rawInput: string) => {
  const digits = rawInput.replace(/\D/g, "");
  if (!digits) {
    return { masked: "", numeric: 0 };
  }

  const numeric = Number(digits) / 100;
  return {
    masked: moneyFormatter.format(numeric),
    numeric,
  };
};

const formatDateInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function AddAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  mode,
  account,
}: AddAccountDialogProps) {
  const [formValues, setFormValues] = useState(defaultFormValues);

  const resetForm = () => {
    setFormValues(defaultFormValues);
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && account) {
      setFormValues({
        descricao: account.descricao || "",
        valorRaw: account.valor ? moneyFormatter.format(account.valor) : "",
        valorNumber: account.valor ?? 0,
        tipo: account.tipo || "a_vista",
        movimentacao: account.movimentacao || "despesa",
        categoria: account.categoria || "contas",
        status: account.status || "pendente",
        forma_pagamento: account.formaPagamento || "pix",
        parcelas: String(account.parcelas || 1),
        parcela_atual: account.parcelaAtual ? String(account.parcelaAtual) : "",
        data_pagamento: formatDateInput(account.dataPagamento),
      });
      return;
    }

    resetForm();
  }, [open, mode, account]);

  const installments = useMemo(() => {
    const parsedInstallments = Number(formValues.parcelas || "1");
    return Number.isFinite(parsedInstallments) && parsedInstallments > 0 ? parsedInstallments : 1;
  }, [formValues.parcelas]);

  const currentInstallment = useMemo(() => {
    const parsedCurrentInstallment = Number(formValues.parcela_atual || "0");
    return Number.isFinite(parsedCurrentInstallment) && parsedCurrentInstallment > 0
      ? parsedCurrentInstallment
      : 0;
  }, [formValues.parcela_atual]);

  const isInstallmentType = formValues.tipo === "parcelado";
  const shouldAutoMarkPaid = isInstallmentType && currentInstallment >= installments && currentInstallment > 0;

  useEffect(() => {
    if (shouldAutoMarkPaid && formValues.status !== "pago") {
      setFormValues((prev) => ({ ...prev, status: "pago" }));
    }
  }, [shouldAutoMarkPaid, formValues.status]);

  const handleSubmit = async () => {
    const payload: AccountCreatePayload = {
      descricao: formValues.descricao || null,
      valor: formValues.valorNumber > 0 ? formValues.valorNumber : null,
      tipo: formValues.tipo,
      movimentacao: formValues.movimentacao,
      categoria: formValues.categoria,
      status: shouldAutoMarkPaid ? "pago" : formValues.status,
      forma_pagamento: formValues.forma_pagamento,
      parcelas: isInstallmentType ? installments : 1,
      parcela_atual: isInstallmentType && currentInstallment > 0 ? currentInstallment : null,
      parcelado: isInstallmentType,
      data_pagamento: formValues.data_pagamento || null,
    };

    await onSubmit(payload);
    resetForm();
    onOpenChange(false);
  };

  const handleCurrencyChange = (value: string) => {
    const { masked, numeric } = formatCurrencyInput(value);
    setFormValues((prev) => ({
      ...prev,
      valorRaw: masked,
      valorNumber: numeric,
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar conta" : "Adicionar conta"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize as informacoes da conta selecionada."
              : "Cadastre uma nova conta para alimentar os indicadores financeiros."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Descricao"
            value={formValues.descricao}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, descricao: event.target.value }))
            }
            placeholder="Ex: Pagamento de aluguel"
          />
          <Input
            label="Valor"
            value={formValues.valorRaw}
            onChange={(event) => handleCurrencyChange(event.target.value)}
            placeholder="R$ 0,00"
          />

          <SelectOption
            label="Movimentacao"
            value={formValues.movimentacao}
            onChange={(value) => setFormValues((prev) => ({ ...prev, movimentacao: String(value) }))}
            options={MOVEMENT_OPTIONS}
            className="h-9"
          />
          <SelectOption
            label="Tipo"
            value={formValues.tipo}
            onChange={(value) => setFormValues((prev) => ({ ...prev, tipo: String(value) }))}
            options={TYPE_OPTIONS}
            className="h-9"
          />

          <SelectOption
            label="Categoria"
            value={formValues.categoria}
            onChange={(value) => setFormValues((prev) => ({ ...prev, categoria: String(value) }))}
            options={CATEGORY_OPTIONS}
            className="h-9"
          />
          <SelectOption
            label="Status"
            value={formValues.status}
            onChange={(value) => setFormValues((prev) => ({ ...prev, status: String(value) }))}
            options={STATUS_OPTIONS}
            className={`h-9 ${formValues.status === "pago" ? "text-emerald-700" : ""}`}
          />

          <SelectOption
            label="Forma de pagamento"
            value={formValues.forma_pagamento}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, forma_pagamento: String(value) }))
            }
            options={PAYMENT_METHOD_OPTIONS}
            className="h-9"
          />
          <Input
            label="Data de pagamento"
            type="date"
            value={formValues.data_pagamento}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, data_pagamento: event.target.value }))
            }
          />

          <Input
            label="Parcelas"
            value={formValues.parcelas}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, parcelas: event.target.value }))
            }
            placeholder="1"
            disabled={!isInstallmentType}
          />
          <Input
            label="Parcela atual"
            value={formValues.parcela_atual}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, parcela_atual: event.target.value }))
            }
            placeholder="Opcional"
            disabled={!isInstallmentType}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="theme" onClick={handleSubmit} loading={loading}>
            {mode === "edit" ? "Salvar alteracoes" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
