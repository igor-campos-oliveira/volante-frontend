import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import SelectOption from "@/components/ui/selectOptions";
import {
  CatalogService,
  deleteCatalogServiceAPI,
  getCatalogServicesAPI,
  toggleCatalogServiceStatusAPI,
} from "@/data/api/CatalogServicesAPI";
import {
  CAR_SERVICES,
  DEBOUNCE_TIMEOUT,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { currencyFormat } from "@/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import CatalogServiceUpsertModal from "./CatalogServiceUpsertModal";

const SERVICE_TYPE_OPTIONS = CAR_SERVICES.filter((service) => service.value !== "PARTS");
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeValueKey = (value: string) => normalizeText(value).replace(/\s+/g, "_");
const getGrossProfitTextClass = (grossProfit: number) => {
  if (grossProfit <= 0) {
    return "text-red-600";
  }

  return "text-green-600";
};

export default function CatalogServicesPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [typeFilter, setTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<CatalogService | null>(null);

  const serviceTypeValues = useMemo(
    () => SERVICE_TYPE_OPTIONS.map((option) => option.value),
    [],
  );

  const {
    data: services,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_car_services", { searchValue, typeFilter }],
    queryFn: ({ pageParam = 1 }) =>
      getCatalogServicesAPI(searchValue, pageParam, typeFilter, serviceTypeValues),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const servicesData = services?.pages.flatMap((page) => page.data) || [];
  const lastUpdatedAt =
    "Ultima atualizacao: " + timestampToLocaleString(dataUpdatedAt);

  const { mutateAsync: handleToggleStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: async ({
      serviceId,
      field,
      nextValue,
    }: {
      serviceId: string;
      field: string;
      nextValue: boolean;
    }) => toggleCatalogServiceStatusAPI(serviceId, field, nextValue),
  });

  const { mutateAsync: handleDeleteService, isPending: isDeleting } = useMutation({
    mutationFn: async (serviceId: string) => deleteCatalogServiceAPI(serviceId),
  });

  const onToggleServiceStatus = async (service: CatalogService, nextValue: boolean) => {
    if (!service.activeField) {
      toast.info("Esse registro nao possui campo de ativo/inativo.");
      return;
    }

    try {
      await handleToggleStatus({
        serviceId: service.id,
        field: service.activeField,
        nextValue,
      });
      await queryClient.invalidateQueries({ queryKey: ["get_car_services"] });
      toast.success("Status atualizado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel atualizar o status.";
      toast.error(message);
    }
  };

  const onConfirmDelete = async () => {
    if (!serviceToDelete?.id) {
      toast.error("Servico invalido para exclusao.");
      return;
    }

    try {
      await handleDeleteService(serviceToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["get_car_services"] });
      toast.success("Servico removido.");
      setServiceToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel remover o servico.";
      toast.error(message);
    }
  };

  const openCreateModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: CatalogService) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  return (
    <SearchPage>
      <SearchPage.Title>Servicos</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <SearchPage.SearchBar
        placeholder="Pesquise os servicos aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
        posChildren={
          <Button variant="theme" className="h-[50px]" onClick={openCreateModal}>
            <Plus size={18} />
            Novo serviço
          </Button>
        }
      >
        <SelectOption
          className="h-[50px] w-[180px] flex-grow-0"
          containerFlex="0"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: "Todos os tipos", value: "all" },
            ...SERVICE_TYPE_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
              color: option.color,
            })),
          ]}
        />
      </SearchPage.SearchBar>

      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`catalog-services-skeleton-${index}`}
              className="h-[180px] w-full rounded-lg"
            />
          ))}

        {!isLoading && servicesData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum servico encontrado.
          </div>
        )}

        {servicesData.map((service) => {
          const normalizedServiceType = normalizeText(service.type || "");
          const normalizedServiceTypeKey = normalizeValueKey(service.type || "");
          const serviceType = CAR_SERVICES.find(
            (item) =>
              normalizeValueKey(item.value) === normalizedServiceTypeKey ||
              normalizeText(item.label) === normalizedServiceType,
          );
          const typeColorClass = serviceType?.color || "bg-zinc-400";
          const lightTypeColors = ["bg-indigo-300", "bg-blue-300", "bg-pink-400"];
          const typeTextColorClass = lightTypeColors.includes(typeColorClass)
            ? "text-zinc-900"
            : "text-white";
          return (
            <Card
              key={service.id}
              className="bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={service.isActive}
                      disabled={isTogglingStatus}
                      onChange={(e) => onToggleServiceStatus(service, e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={`relative inline-flex h-5 w-5 items-center justify-center rounded border transition-all duration-200 ease-out ${
                        service.isActive
                          ? "border-[var(--theme-highlight)] bg-white"
                          : "border-zinc-300 bg-white"
                      } ${isTogglingStatus ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <span
                        className={`absolute inset-0 rounded-[3px] bg-[var(--theme-highlight)] transition-transform duration-300 ease-out ${
                          service.isActive ? "scale-100" : "scale-0"
                        }`}
                      />
                      <Check
                        size={13}
                        className={`relative z-10 text-white transition-all duration-200 ease-out ${
                          service.isActive ? "scale-100 opacity-100 delay-100" : "scale-75 opacity-0"
                        }`}
                      />
                    </span>
                    {service.isActive ? "Ativo" : "Inativo"}
                  </label>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label="Mais opcoes"
                      >
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onSelect={() => openEditModal(service)}
                        className="cursor-pointer"
                      >
                        <Pencil size={16} className="mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isDeleting}
                        onSelect={() => setServiceToDelete(service)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-medium ${typeColorClass} ${typeTextColorClass}`}
                  >
                    {serviceType?.label || service.type}
                  </span>
                </div>

                <p className="line-clamp-2 font-medium text-zinc-900">
                  {service.description}
                </p>

                {service.requiredItems.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    Itens necessarios:{" "}
                    {service.requiredItems
                      .map((entry) => `${entry.item} (${currencyFormat(entry.valor, "currency")})`)
                      .join(", ")}
                  </p>
                )}

                <div className="mt-auto border-t pt-2 text-right">
                  <p className="text-sm text-zinc-600">
                    Custo: {currencyFormat(service.cost, "currency")}
                  </p>
                  <p className="text-base font-semibold text-zinc-900">
                    Valor: {currencyFormat(service.value, "currency")}
                  </p>
                  <p className={`text-sm font-medium ${getGrossProfitTextClass(service.grossProfit)}`}>
                    Lucro bruto: {currencyFormat(service.grossProfit, "currency")}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </Card.Container>

      <SearchPage.LoadMore
        visible={hasNextPage}
        loading={isFetchingNextPage}
        onClick={() => fetchNextPage()}
      >
        Ver mais
      </SearchPage.LoadMore>

      <Dialog
        open={Boolean(serviceToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setServiceToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Voce realmente deseja excluir o servico{" "}
              <span className="font-medium text-foreground">
                {serviceToDelete?.description || "selecionado"}
              </span>
              ? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="transition-colors hover:!bg-violet-100"
              onClick={() => setServiceToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              loading={isDeleting}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogServiceUpsertModal
        open={isModalOpen}
        service={editingService}
        typeOptions={SERVICE_TYPE_OPTIONS}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingService(null);
          }
        }}
      />
    </SearchPage>
  );
}
