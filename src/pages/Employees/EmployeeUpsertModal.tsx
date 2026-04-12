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
import MaskedInput from "@/components/MaskedInput/MaskedInput";
import {
  createEmployee,
  Employee,
  updateEmployee,
} from "@/data/api/EmployeesAPI";
import { MASKS, validateCPF } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type EmployeeFormValues = {
  nome: string;
  cargo: string;
  telefone: string;
  cpf: string;
};

const DEFAULT_VALUES: EmployeeFormValues = {
  nome: "",
  cargo: "",
  telefone: "",
  cpf: "",
};

interface EmployeeUpsertModalProps {
  open: boolean;
  employee?: Employee | null;
  onOpenChange: (open: boolean) => void;
}

const digitsOnly = (value?: string | null) =>
  String(value ?? "").replace(/\D/g, "");

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const raw = error as Record<string, unknown>;
    const message = typeof raw.message === "string" ? raw.message : "";
    const details = typeof raw.details === "string" ? raw.details : "";
    const hint = typeof raw.hint === "string" ? raw.hint : "";

    return [message, details, hint].filter(Boolean).join(" - ");
  }

  return "";
};

export default function EmployeeUpsertModal({
  open,
  employee,
  onOpenChange,
}: EmployeeUpsertModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<EmployeeFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        nome: employee?.nome ?? "",
        cargo: employee?.cargo ?? "",
        telefone: digitsOnly(employee?.telefone),
        cpf: digitsOnly(employee?.cpf),
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [employee, form, open]);

  const handleSave = async (values: EmployeeFormValues) => {
    const phoneDigits = digitsOnly(values.telefone);
    const cpfDigits = digitsOnly(values.cpf);

    if (!values.nome.trim()) {
      toast.error("Nome e obrigatorio.");
      return;
    }

    if (!values.cargo.trim()) {
      toast.error("Cargo e obrigatorio.");
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Telefone invalido. Use DDD + numero.");
      return;
    }

    if (cpfDigits && (cpfDigits.length !== 11 || !validateCPF(cpfDigits))) {
      toast.error("CPF invalido.");
      return;
    }

    const payload: Employee = {
      nome: values.nome.trim(),
      cargo: values.cargo.trim(),
      telefone: phoneDigits,
      ...(cpfDigits ? { cpf: cpfDigits } : {}),
    };

    try {
      if (employee?.id) {
        await updateEmployee(employee.id, payload);
      } else {
        await createEmployee(payload);
      }

      await queryClient.invalidateQueries({ queryKey: ["get_all_employees"] });
      toast.success(employee?.id ? "Funcionario atualizado." : "Funcionario criado.");
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error) || "Nao foi possivel salvar o funcionario.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {employee?.id ? "Editar funcionario" : "Adicionar funcionario"}
          </DialogTitle>
          <DialogDescription>
            Salve os dados do funcionario direto no Supabase.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nome"
              placeholder="Digite o nome"
              {...form.register("nome", { required: true })}
            />
            <Input
              label="Cargo"
              placeholder="Digite o cargo"
              {...form.register("cargo", { required: true })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <MaskedInput
                  {...field}
                  label="Telefone"
                  mask={MASKS.CELL_PHONE}
                  maskChar=""
                  placeholder="(00) 00000-0000"
                />
              )}
            />
            <Controller
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <MaskedInput
                  {...field}
                  label="CPF"
                  mask={MASKS.CPF}
                  maskChar=""
                  placeholder="000.000.000-00"
                />
              )}
            />
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
            <Button loading={form.formState.isSubmitting} type="submit">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
