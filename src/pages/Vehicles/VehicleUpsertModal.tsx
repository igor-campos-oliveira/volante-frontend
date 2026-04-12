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
import { CAR_BRANDS, CAR_FUELS } from "@/data/constants/carBrands";
import { COLORS } from "@/data/constants/colors";
import {
  createVehicle,
  updateVehicle,
  Vehicle,
} from "@/data/api/VehiclesAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";

type VehicleFormValues = {
  placa: string;
  cor: string;
  marca: string;
  modelo: string;
  ano: string;
  combustivel: string;
};

const DEFAULT_VALUES: VehicleFormValues = {
  placa: "",
  cor: "",
  marca: "",
  modelo: "",
  ano: "",
  combustivel: "",
};

interface VehicleUpsertModalProps {
  open: boolean;
  vehicle?: Vehicle | null;
  onOpenChange: (open: boolean) => void;
}

type SelectItem = { value: string; label: string };

const normalizeText = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const resolveOptionValue = (
  rawValue: string | undefined,
  options: SelectItem[]
) => {
  const normalized = normalizeText(rawValue);

  if (!normalized) {
    return "";
  }

  const found = options.find(
    (option) =>
      normalizeText(option.value) === normalized ||
      normalizeText(option.label) === normalized
  );

  return found?.value ?? "";
};

const FUEL_ALIASES: Record<string, string[]> = {
  gasoline: ["gasoline", "gasolina"],
  gasolina: ["gasolina", "gasoline"],
  ethanol: ["ethanol", "etanol"],
  etanol: ["etanol", "ethanol"],
  diesel: ["diesel"],
  flex: ["flex"],
  electric: ["electric", "eletrico"],
  eletrico: ["eletrico", "electric"],
  hybrid: ["hybrid", "hibrido"],
  hibrido: ["hibrido", "hybrid"],
  natural_gas: ["natural_gas", "gnv"],
  gnv: ["gnv", "natural_gas"],
};

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

const getFuelCandidates = (fuel?: string) => {
  const normalized = normalizeText(fuel);
  if (!normalized) {
    return [undefined] as Array<string | undefined>;
  }

  const aliases = FUEL_ALIASES[normalized] ?? [fuel as string];
  return unique([fuel, ...aliases].filter(Boolean)) as string[];
};

const isEnumFuelError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  return normalizeText(message).includes("enum combustivel");
};

const isDuplicatePlateError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  return normalizeText(message).includes("carro_placa_key");
};

export default function VehicleUpsertModal({
  open,
  vehicle,
  onOpenChange,
}: VehicleUpsertModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<VehicleFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        placa: vehicle?.placa ?? "",
        cor: resolveOptionValue(vehicle?.cor, COLORS),
        marca: resolveOptionValue(vehicle?.marca, CAR_BRANDS),
        modelo: vehicle?.modelo ?? "",
        ano: vehicle?.ano ? String(vehicle.ano) : "",
        combustivel: resolveOptionValue(vehicle?.combustivel, CAR_FUELS),
      });
      return;
    }

    form.reset(DEFAULT_VALUES);
  }, [form, open, vehicle]);

  const handleSave = async (values: VehicleFormValues) => {
    const parsedYear = values.ano.trim();
    const yearNumber = parsedYear ? Number(parsedYear) : null;

    if (parsedYear && Number.isNaN(yearNumber)) {
      toast.error("Ano invalido.");
      return;
    }

    const basePayload: Partial<Vehicle> = {
      placa: values.placa.trim().toUpperCase(),
      cor: values.cor || undefined,
      marca: values.marca || undefined,
      modelo: values.modelo.trim() || undefined,
      ano: yearNumber ?? undefined,
    };

    try {
      const fuelCandidates = getFuelCandidates(values.combustivel);
      let saved = false;
      let lastError: unknown = null;

      for (const fuelCandidate of fuelCandidates) {
        const payload: Partial<Vehicle> = {
          ...basePayload,
          combustivel: fuelCandidate,
        };

        try {
          if (vehicle?.id) {
            await updateVehicle(vehicle.id, payload);
          } else {
            await createVehicle(payload);
          }

          saved = true;
          break;
        } catch (error) {
          lastError = error;
          if (!isEnumFuelError(error)) {
            break;
          }
        }
      }

      if (!saved && lastError) {
        throw lastError;
      }

      await queryClient.invalidateQueries({ queryKey: ["get_all_vehicles"] });
      toast.success(vehicle?.id ? "Veiculo atualizado." : "Veiculo criado.");
      onOpenChange(false);
    } catch (error) {
      if (isDuplicatePlateError(error)) {
        toast.error("Ja existe um veiculo com essa placa.");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o veiculo.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {vehicle?.id ? "Editar veiculo" : "Adicionar veiculo"}
          </DialogTitle>
          <DialogDescription>
            Salve os dados do veiculo direto no Supabase.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Placa"
              placeholder="ABC1D23"
              className="uppercase"
              {...form.register("placa", { required: true })}
            />
            <Controller
              name="cor"
              control={form.control}
              render={({ field }) => (
                <SelectOption
                  {...field}
                  label="Cor"
                  placeholder="Selecione..."
                  options={COLORS}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="marca"
              control={form.control}
              render={({ field }) => (
                <SelectOption
                  {...field}
                  label="Marca"
                  placeholder="Selecione..."
                  options={CAR_BRANDS}
                  onChange={field.onChange}
                />
              )}
            />
            <Input
              label="Modelo"
              placeholder="Digite o modelo"
              {...form.register("modelo", { required: true })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Ano"
              placeholder="2024"
              inputMode="numeric"
              {...form.register("ano")}
            />
            <Controller
              name="combustivel"
              control={form.control}
              render={({ field }) => (
                <SelectOption
                  {...field}
                  label="Combustivel"
                  placeholder="Selecione..."
                  options={CAR_FUELS}
                  onChange={field.onChange}
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
            <Button type="submit" loading={form.formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

