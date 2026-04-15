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
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SERVICE_TYPE_OPTIONS = CAR_SERVICES.filter((service) => service.value !== "PARTS");

export default function CatalogServicesPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [typeFilter, setTypeFilter] = useState("all");
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

  return (
    <SearchPage>
      <SearchPage.Title>Servicos</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <SearchPage.SearchBar
        placeholder="Pesquise os servicos aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
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

      <div className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`catalog-services-skeleton-${index}`}
              className="h-[78px] w-full rounded-lg"
            />
          ))}

        {!isLoading && servicesData.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum servico encontrado.
          </div>
        )}

        {servicesData.map((service) => {
          const serviceType = SERVICE_TYPE_OPTIONS.find((item) => item.value === service.type);
          return (
            <article
              key={service.id}
              className="rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={service.isActive}
                    disabled={isTogglingStatus}
                    onChange={(e) => onToggleServiceStatus(service, e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[--theme-highlight]"
                  />
                  {service.isActive ? "Ativo" : "Inativo"}
                </label>

                <div className="min-w-[150px]">
                  <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-zinc-700">
                    {serviceType?.label || service.type}
                  </span>
                </div>

                <p className="min-w-[220px] flex-1 truncate font-medium text-zinc-900">
                  {service.description}
                </p>

                <p className="w-full text-right text-sm font-semibold md:w-[160px]">
                  {currencyFormat(service.value, "currency")}
                </p>

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
                      onSelect={() => toast.info("Edicao em breve.")}
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
            </article>
          );
        })}
      </div>

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
    </SearchPage>
  );
}
